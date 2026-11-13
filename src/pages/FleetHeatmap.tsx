import { useEffect, useState } from "react";
import { Map, Marker, useApiIsLoaded, useMap } from "@vis.gl/react-google-maps";
import {
  errorMessage,
  fetchHeatmap,
  fetchVehicles,
  FleetVehicle,
  Heatmap,
  HEATMAP_TYPES,
  HeatmapType,
} from "../components/fleet-map/api";
import FleetLayout, { Card } from "../components/fleet-map/FleetLayout";
import DateRange from "../components/fleet-map/DateRange";
import MapShell from "../components/fleet-map/MapShell";
import { todayBkk } from "../components/fleet-map/format";

/**
 * แผนที่ความหนาแน่น (MA-373) — บริเวณที่เกิดพฤติกรรมที่เลือกบ่อย
 * รวมจุดเป็นช่องราว 500 ม. ฝั่ง server แล้ววาดเป็นจุดไล่สีขนาดคงที่บนจอ (Heatmap Layer ของ Google เลิกให้บริการแล้ว
 * และวงกลมขนาดเป็นเมตรจะมองไม่เห็นเมื่อซูมออกระดับภาค)
 */
const COLORS = ["#fde68a", "#fbbf24", "#f97316", "#ef4444", "#b91c1c"];
const colorOf = (ratio: number) => COLORS[Math.min(COLORS.length - 1, Math.floor(ratio * COLORS.length))];

function FitCells({ data }: { data: Heatmap | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !data?.cells.length) return;
    const b = new google.maps.LatLngBounds();
    data.cells.forEach((c) => b.extend({ lat: c.lat, lng: c.lng }));
    map.fitBounds(b, 60);
  }, [map, data]);
  return null;
}

function HeatCells({ data }: { data: Heatmap | null }) {
  // google.maps.SymbolPath ใช้ได้หลัง script ของ Google โหลดเสร็จ
  const ready = useApiIsLoaded();
  if (!ready || !data) return null;
  const max = data.maxCount || 1;
  // ช่องหนาแน่นน้อยวาดก่อน ช่องหนาแน่นมากอยู่ด้านบน
  return (
    <>
      {[...data.cells].reverse().map((c, i) => {
        const ratio = c.count / max;
        return (
          <Marker
            key={`${c.lat}-${c.lng}-${i}`}
            position={{ lat: c.lat, lng: c.lng }}
            clickable
            title={`${c.count.toLocaleString("th-TH")} ครั้ง`}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5 + ratio * 11,
              fillColor: colorOf(ratio),
              fillOpacity: 0.55 + ratio * 0.35,
              strokeColor: "#ffffff",
              strokeWeight: 1,
            }}
          />
        );
      })}
    </>
  );
}

export default function FleetHeatmap() {
  const today = todayBkk();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [type, setType] = useState<HeatmapType>("harsh");
  const [registration, setRegistration] = useState("");
  const [range, setRange] = useState({ from: today, to: today });
  const [data, setData] = useState<Heatmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles().then((s) => setVehicles(s.vehicles)).catch(() => setVehicles([]));
  }, []);

  // ทั้งกองรถ Cartrack ให้ข้อมูลครั้งละ 1 วัน · รถคันเดียวเลือกได้ถึง 7 วัน
  const allVehicles = !registration;
  const onVehicleChange = (reg: string) => {
    setRegistration(reg);
    if (!reg) setRange((r) => ({ from: r.to, to: r.to }));
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchHeatmap(type, range.from, range.to, registration || undefined));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FleetLayout title="แผนที่ความหนาแน่น" fullHeight>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 max-w-full text-sm">
              <span className="mb-1 block text-gray-600">พฤติกรรม</span>
              <select value={type} onChange={(e) => setType(e.target.value as HeatmapType)} className="max-w-full rounded-lg border border-gray-300 px-2 py-1">
                {HEATMAP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="min-w-0 max-w-full text-sm">
              <span className="mb-1 block text-gray-600">รถ</span>
              <select value={registration} onChange={(e) => onVehicleChange(e.target.value)} className="max-w-full rounded-lg border border-gray-300 px-2 py-1">
                <option value="">ทุกคัน</option>
                {vehicles.map((v) => <option key={v.registration} value={v.registration}>{v.name}</option>)}
              </select>
            </label>
            <div className="text-sm">
              <span className="mb-1 block text-gray-600">{allVehicles ? "วันที่ (รถทุกคันแสดงได้ครั้งละ 1 วัน)" : "ช่วงวันที่ (ไม่เกิน 7 วัน)"}</span>
              <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} maxDays={allVehicles ? 1 : 7} single={allVehicles} />
            </div>
            <button onClick={run} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "กำลังประมวลผล" : "แสดงผล"}
            </button>
          </div>
          {loading && allVehicles && (
            <p className="mt-2 text-sm text-gray-500">กำลังรวบรวมข้อมูลของรถทุกคันจากระบบ Cartrack อาจใช้เวลาประมาณ 10 ถึง 20 วินาที</p>
          )}
          {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          {data && !loading && (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-700">
              <span>
                {data.typeLabel}: พบ {data.totalEvents.toLocaleString("th-TH")} ครั้ง ใน {data.cells.length.toLocaleString("th-TH")} บริเวณ
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                น้อย
                {COLORS.map((c) => <span key={c} className="h-3 w-5" style={{ backgroundColor: c }} />)}
                มาก (สูงสุด {data.maxCount} ครั้งต่อบริเวณ)
              </span>
            </div>
          )}
        </Card>
        <MapShell className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-gray-200">
          <Map defaultCenter={{ lat: 8.2, lng: 99.9 }} defaultZoom={7} gestureHandling="greedy" streetViewControl={false} style={{ width: "100%", height: "100%" }}>
            <FitCells data={data} />
            <HeatCells data={data} />
          </Map>
        </MapShell>
        {data && data.cells.length === 0 && !loading && (
          <p className="text-center text-sm text-gray-500">ไม่พบ{data.typeLabel}ในช่วงวันที่และรถที่เลือก</p>
        )}
      </div>
    </FleetLayout>
  );
}
