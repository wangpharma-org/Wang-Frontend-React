import { useEffect, useRef, useState } from "react";
import { Marker, Polyline, useMap } from "@vis.gl/react-google-maps";
import { FleetVehicle, STATUS_META, TrackPoint, trackAt } from "./api";
import { truckIcon } from "./truckIcon";

export interface FollowState {
  vehicle: FleetVehicle;
  /** เส้นทางล่าสุด [lat, lng, epochSeconds] เรียงตามเวลา — จับเข้ากับถนนแล้วถ้า backend เปิด OSRM */
  track: TrackPoint[];
  /** เส้นทางจับเข้ากับถนนแล้วหรือยัง (ใช้บอกผู้ใช้) */
  onRoad: boolean;
  /** ร้านถัดไป + เส้นทางขับรถจากตำแหน่งล่าสุดของรถ (null = เส้นตรง) */
  target?: { lat: number; lng: number; name: string; route?: [number, number][] | null } | null;
}

/** ระดับซูมของโหมดติดตาม (ระดับถนน) */
export const FOLLOW_ZOOM = 17;
/**
 * แสดงย้อนหลังจากตำแหน่งล่าสุดที่ได้รับเท่านี้ (วินาที) เพื่อให้มีเส้นทางให้ลูกศรวิ่งต่อเนื่องระหว่างรอข้อมูลใหม่
 * กล่อง GPS ส่งตำแหน่งทุก 15–30 วินาที
 */
const LAG_S = 20;
/** ตามหลังเกินนี้ (เช่น เพิ่งได้ข้อมูลก้อนใหญ่) ให้กระโดดมาใกล้ล่าสุด */
const MAX_BEHIND_S = 120;
const CAMERA_MS = 150;

/**
 * โหมดติดตามรถแบบเรียลไทม์ (MA-374)
 * ลูกศรวิ่งไปตามเส้นทางที่รถผ่านมาจริงด้วยความเร็วจริง (เวลาที่แสดงเดินหน้าเท่ากับเวลาจริง)
 * ไม่คาดเดาตำแหน่งล่วงหน้า — ถ้ายังไม่มีข้อมูลใหม่ ลูกศรหยุดรอที่ตำแหน่งล่าสุด
 */
/**
 * ให้รถอยู่ค่อนไปทางด้านล่างของแผนที่ (การ์ดข้อมูลติดตามรถอยู่ด้านบน จึงไม่บังตัวรถ)
 * เลื่อนจุดกึ่งกลางแผนที่ขึ้นทางเหนือของรถตามสัดส่วนความสูงของแผนที่
 */
const CAMERA_OFFSET_RATIO = 0.22;
function cameraCenter(map: google.maps.Map, at: google.maps.LatLngLiteral): google.maps.LatLngLiteral {
  const proj = map.getProjection();
  const zoom = map.getZoom();
  if (!proj || zoom == null) return at;
  const p = proj.fromLatLngToPoint(at);
  if (!p) return at;
  const shift = (map.getDiv().clientHeight * CAMERA_OFFSET_RATIO) / 2 ** zoom;
  const c = proj.fromPointToLatLng(new google.maps.Point(p.x, p.y - shift));
  return c ? c.toJSON() : at;
}

export default function FollowLayer({ follow, onDisplayTime }: { follow: FollowState; onDisplayTime?: (t: number) => void }) {
  const map = useMap();
  const v = follow.vehicle;
  const track = follow.track;
  const latest = track[track.length - 1]?.[2] ?? null;
  const [frame, setFrame] = useState<{ lat: number; lng: number; bearing: number; t: number } | null>(null);
  const display = useRef<number | null>(null);
  const trackRef = useRef(track);
  trackRef.current = track;
  const zoomed = useRef<string | null>(null);
  const lastCam = useRef(0);
  const lastReport = useRef(0);

  useEffect(() => {
    display.current = null;
  }, [v.registration]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const tr = trackRef.current;
      const last = tr[tr.length - 1]?.[2];
      if (last != null) {
        const dt = (now - prev) / 1000;
        if (display.current == null || last - display.current > MAX_BEHIND_S) display.current = Math.max(tr[0][2], last - LAG_S);
        else display.current = Math.min(last, display.current + dt);
        const at = trackAt(tr, display.current);
        if (at) {
          setFrame({ ...at, t: display.current });
          if (map) {
            if (zoomed.current !== v.registration) {
              zoomed.current = v.registration;
              map.setZoom(FOLLOW_ZOOM);
              map.setCenter(cameraCenter(map, at));
            } else if (now - lastCam.current > CAMERA_MS) {
              lastCam.current = now;
              map.setCenter(cameraCenter(map, at));
            }
          }
          if (onDisplayTime && now - lastReport.current > 1000) {
            lastReport.current = now;
            onDisplayTime(display.current);
          }
        }
      }
      prev = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loop อ่านเส้นทางล่าสุดผ่าน ref
  }, [map, v.registration]);

  if (!frame || latest == null) return null;
  const color = STATUS_META[v.status].color;
  // เส้นทางที่ผ่านมาจนถึงตำแหน่งที่แสดง
  const passed = track.filter((p) => p[2] <= frame.t).map((p) => ({ lat: p[0], lng: p[1] }));
  // ลูกศรแสดงย้อนหลัง — เส้นทางไปร้านเริ่มจากตำแหน่งล่าสุด จึงต่อด้วยช่วงที่รถผ่านแล้วแต่ลูกศรยังไปไม่ถึง (เส้นจาง)
  const ahead = track.filter((p) => p[2] > frame.t).map((p) => ({ lat: p[0], lng: p[1] }));
  return (
    <>
      {passed.length > 0 && (
        <Polyline path={[...passed, { lat: frame.lat, lng: frame.lng }]} strokeColor="#1d4ed8" strokeOpacity={0.75} strokeWeight={6} zIndex={20} />
      )}
      {ahead.length > 0 && (
        <Polyline path={[{ lat: frame.lat, lng: frame.lng }, ...ahead]} strokeColor="#1d4ed8" strokeOpacity={0.25} strokeWeight={6} zIndex={19} />
      )}
      {follow.target && (
        <Marker
          position={{ lat: follow.target.lat, lng: follow.target.lng }}
          zIndex={45}
          title={`ร้านค้าลำดับถัดไป: ${follow.target.name}`}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#16a34a", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 }}
        />
      )}
      {follow.target && (
        <Polyline
          path={
            follow.target.route?.length
              ? follow.target.route.map(([lat, lng]) => ({ lat, lng }))
              : [{ lat: frame.lat, lng: frame.lng }, { lat: follow.target.lat, lng: follow.target.lng }]
          }
          strokeOpacity={0}
          icons={[{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: "#16a34a", scale: 3 }, offset: "0", repeat: "14px" }]}
          zIndex={19}
        />
      )}
      <Marker
        position={{ lat: frame.lat, lng: frame.lng }}
        zIndex={50}
        title={`${v.name} ${v.statusLabel}`}
        icon={truckIcon(color, frame.bearing, { size: 56 })}
      />
    </>
  );
}
