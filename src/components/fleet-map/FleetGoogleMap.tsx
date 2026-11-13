import { useEffect, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import FollowLayer, { FollowState } from "./FollowLayer";
import { truckIcon } from "./truckIcon";
import { InfoWindow, Map as GMap, Marker, Polyline, useApiIsLoaded, useMap } from "@vis.gl/react-google-maps";
import { FleetVehicle, MAP_EVENT_TYPES, STATUS_META, VehiclePath, Stop, STOP_COLOR, PATH_STATE_META, PathPoint, PathState } from "./api";
import { ago } from "./format";

// กลางภาคใต้ — รถส่วนใหญ่อยู่สุราษฎร์ฯ–สงขลา
const DEFAULT_CENTER = { lat: 8.2, lng: 99.9 };

export type FitRequest = { id: number; points: google.maps.LatLngLiteral[] };

interface Props {
  /** รวมหมุดที่อยู่ใกล้กันเป็นกลุ่ม (รถที่เลือกอยู่แสดงแยกเสมอ) */
  cluster?: boolean;
  vehicles: FleetVehicle[];
  selected: FleetVehicle | null;
  path: VehiclePath | null;
  /** ร้านที่ต้องส่งของวันที่เลือก — แสดงเป็นหมุดลำดับที่ */
  stops?: { sessions: { shippingOutId: number; empName: string; stops: Stop[] }[] } | null;
  /** โหมดติดตามรถแบบเรียลไทม์ — รถคันนี้วาดโดย FollowLayer แทนหมุดปกติ */
  follow?: FollowState | null;
  /** เวลาของตำแหน่งที่โหมดติดตามแสดงอยู่ (วินาที epoch) — รายงานทุก 1 วินาที */
  onFollowTime?: (t: number) => void;
  /** ตำแหน่งรถย้อนหลัง ณ เวลาที่เลือกบนแถบช่วงเวลา */
  replay?: { p: PathPoint; bearing: number } | null;
  fit: FitRequest | null;
  onSelect: (v: FleetVehicle) => void;
  onUserMove: () => void;
}

/** หมุดรถกระบะแคปสีตามสถานะ หมุนตามทิศที่รถวิ่ง (ทิศล่าสุดเมื่อจอด) */
function vehicleIcon(v: FleetVehicle, dim: boolean, size = 38): google.maps.Icon {
  return truckIcon(STATUS_META[v.status].color, v.bearing, { dim, size });
}

const dot = (color: string, scale = 5): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  scale,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
});

/** ระดับซูมเมื่อขอให้ดูจุดเดียว (รถหรือร้าน) */
const POINT_ZOOM = 16;

/** ทำ fitBounds ตามคำขอ (id เปลี่ยน = ขอใหม่) */
function FitBounds({ fit }: { fit: FitRequest | null }) {
  const map = useMap();
  const done = useRef<number | null>(null);
  useEffect(() => {
    if (!map || !fit || done.current === fit.id || fit.points.length === 0) return;
    done.current = fit.id;
    if (fit.points.length === 1) {
      // จุดเดียว (เช่น กดที่รถ): ซูมเข้าระดับถนน ถ้าซูมใกล้กว่านี้อยู่แล้วไม่ถอยออก
      map.panTo(fit.points[0]);
      map.setZoom(Math.max(map.getZoom() ?? 0, POINT_ZOOM));
      return;
    }
    const b = new google.maps.LatLngBounds();
    fit.points.forEach((p) => b.extend(p));
    map.fitBounds(b, 60);
  }, [map, fit]);
  return null;
}

/**
 * หมุดรถแบบรวมกลุ่ม — @vis.gl ไม่มีตัวรวมหมุด จึงสร้าง google.maps.Marker เองแล้วส่งให้ MarkerClusterer
 * อัปเดตตำแหน่ง/สีของหมุดเดิมแทนการสร้างใหม่ทุกครั้งที่รีเฟรช (ทุก 30 วินาที)
 */
function ClusteredVehicles({ vehicles, selectedReg, onSelect }: { vehicles: FleetVehicle[]; selectedReg: string | null; onSelect: (v: FleetVehicle) => void }) {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const markers = useRef(new Map<string, google.maps.Marker>());
  const byReg = useRef(new Map<string, FleetVehicle>());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!map) return;
    const store = markers.current;
    clusterer.current = new MarkerClusterer({ map });
    return () => {
      clusterer.current?.clearMarkers();
      clusterer.current?.setMap(null);
      clusterer.current = null;
      store.forEach((m) => m.setMap(null));
      store.clear();
    };
  }, [map]);

  useEffect(() => {
    const c = clusterer.current;
    if (!c) return;
    const keep = new Set<string>();
    for (const v of vehicles) {
      byReg.current.set(v.registration, v);
      if (v.lat == null || v.lng == null || v.registration === selectedReg) continue;
      keep.add(v.registration);
      const opts = {
        position: { lat: v.lat, lng: v.lng },
        icon: vehicleIcon(v, false),
        title: `${v.name} (${STATUS_META[v.status].label})`,
      };
      const m = markers.current.get(v.registration);
      if (m) {
        m.setPosition(opts.position);
        m.setIcon(opts.icon);
        m.setTitle(opts.title);
      } else {
        const created = new google.maps.Marker(opts);
        const reg = v.registration;
        created.addListener("click", () => {
          const cur = byReg.current.get(reg);
          if (cur) onSelectRef.current(cur);
        });
        markers.current.set(reg, created);
      }
    }
    for (const [reg, m] of markers.current) {
      if (!keep.has(reg)) {
        m.setMap(null);
        markers.current.delete(reg);
      }
    }
    c.clearMarkers();
    c.addMarkers([...markers.current.values()]);
  }, [vehicles, selectedReg, map]);

  return null;
}

function stopIcon(s: Stop): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 11,
    fillColor: STOP_COLOR[s.status],
    fillOpacity: 1,
    // มีข้อสังเกต = ขอบสีส้ม
    strokeColor: s.delivery && s.flags.length ? "#f59e0b" : "#ffffff",
    strokeWeight: s.delivery && s.flags.length ? 4 : 2,
  };
}

export default function FleetGoogleMap({ cluster = false, vehicles, selected, path, stops, follow, onFollowTime, replay, fit, onSelect, onUserMove }: Props) {
  // หมุดใช้ google.maps.SymbolPath — ต้องรอ script ของ Google โหลดเสร็จก่อน ไม่งั้น undefined
  const ready = useApiIsLoaded();
  const located = vehicles.filter((v) => v.lat != null && v.lng != null && v.registration !== follow?.vehicle.registration);
  const events = (path?.events ?? []).filter((e) => MAP_EVENT_TYPES.has(e.type));

  return (
    <GMap
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={7}
      gestureHandling="greedy"
      clickableIcons={false}
      streetViewControl={false}
      mapTypeControl
      fullscreenControl={false}
      onDragstart={onUserMove}
      style={{ width: "100%", height: "100%" }}
    >
      <FitBounds fit={fit} />
      {ready && (
        <>

      {/* ระหว่างติดตาม ซ่อนเส้นทางทั้งวัน — ลูกศรแสดงย้อนหลัง เส้นทั้งวันจะล้ำหน้าลูกศรจนสับสน */}
      {!follow && path && path.points.length > 1 && (
        <Polyline
          path={(path.road?.length ? path.road : path.points).map(([lat, lng]) => ({ lat, lng }))}
          strokeColor="#2563eb"
          strokeOpacity={0.9}
          strokeWeight={4}
        />
      )}
      {path && path.points.length > 0 && (
        <Marker
          position={{ lat: path.points[0][0], lng: path.points[0][1] }}
          icon={dot("#16a34a", 6)}
          title="จุดเริ่มต้นของวัน"
          zIndex={5}
        />
      )}
      {(stops?.sessions ?? []).flatMap((ses) =>
        ses.stops
          .filter((s) => s.location)
          .map((s) => (
            <Marker
              key={`stop-${ses.shippingOutId}-${s.memCode}-${s.addressId ?? ""}`}
              position={{ lat: s.location!.lat, lng: s.location!.lng }}
              icon={stopIcon(s)}
              label={{ text: String(s.seq), color: "#ffffff", fontSize: "11px", fontWeight: "700" }}
              title={`${s.seq}. ${s.name}${s.branch ? ` (${s.branch})` : ""} ${s.statusLabel}${s.delivery?.at ? ` เวลา ${new Date(s.delivery.at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.` : ""} คนขับ ${ses.empName}`}
              zIndex={8}
            />
          )),
      )}
      {replay && (
        <Marker
          position={{ lat: replay.p[0], lng: replay.p[1] }}
          icon={truckIcon(PATH_STATE_META[(replay.p[4] ?? 2) as PathState].color, replay.bearing, { size: 44 })}
          title={`ตำแหน่งรถเวลา ${new Date(replay.p[2] * 1000).toLocaleTimeString("th-TH")} น. ความเร็ว ${Math.round(replay.p[3])} กม./ชม.`}
          zIndex={30}
        />
      )}
      {events.map((e, i) => (
        <Marker
          key={`ev-${i}`}
          position={{ lat: e.lat, lng: e.lng }}
          icon={dot("#ea580c", 5)}
          title={`${e.label} เวลา ${new Date(e.at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.${e.speed != null ? ` ความเร็ว ${Math.round(e.speed)} กม./ชม.` : ""}`}
          zIndex={6}
        />
      ))}

      {cluster && <ClusteredVehicles vehicles={located} selectedReg={selected?.registration ?? null} onSelect={onSelect} />}
      {located.filter((v) => !cluster || v.registration === selected?.registration).map((v) => {
        const isSel = selected?.registration === v.registration;
        return (
          <Marker
            key={v.registration}
            position={{ lat: v.lat!, lng: v.lng! }}
            icon={vehicleIcon(v, !!selected && !isSel, isSel ? 46 : 38)}
            title={`${v.name} (${STATUS_META[v.status].label})`}
            zIndex={isSel ? 20 : 10}
            onClick={() => onSelect(v)}
          />
        );
      })}

      {follow && <FollowLayer follow={follow} onDisplayTime={onFollowTime} />}
      {!follow && selected && selected.lat != null && selected.lng != null && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          pixelOffset={[0, -12]}
          headerDisabled
          disableAutoPan
        >
          <div className="text-xs leading-tight">
            <div className="font-bold">{selected.name}</div>
            <div className="text-gray-600">
              {STATUS_META[selected.status].label}
              {selected.status === "driving" && selected.speed != null ? ` ความเร็ว ${Math.round(selected.speed)} กม./ชม.` : ` ข้อมูลล่าสุด ${ago(selected.lastEventAt)}`}
            </div>
          </div>
        </InfoWindow>
      )}
        </>
      )}
    </GMap>
  );
}
