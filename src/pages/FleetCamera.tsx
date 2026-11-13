import { useEffect, useMemo, useState } from "react";
import {
  CameraEvents,
  CARTRACK_VISION_URL,
  errorMessage,
  fetchCameraEvents,
  fetchVehicles,
  FleetVehicle,
} from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";
import DateRange from "../components/fleet-map/DateRange";
import DataTable from "../components/fleet-map/DataTable";
import { todayBkk } from "../components/fleet-map/format";

/**
 * เหตุการณ์จากกล้องติดรถ (MA-373) — เทียบหน้า Vision › Events ของเว็บ Cartrack
 * บัญชียังไม่ได้เปิดใช้ Vision API (Cartrack ตอบ 403) จึงไม่มีคลิปวิดีโอ ดูคลิปได้ในระบบ Cartrack
 */
export default function FleetCamera() {
  const today = todayBkk();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [registration, setRegistration] = useState("");
  const [scope, setScope] = useState<"important" | "all">("important");
  const [range, setRange] = useState({ from: today, to: today });
  const [data, setData] = useState<CameraEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchVehicles().then((s) => setVehicles(s.vehicles)).catch(() => setVehicles([]));
  }, []);

  const allVehicles = !registration;
  const run = async () => {
    setLoading(true);
    setError(null);
    setTypeFilter("all");
    try {
      setData(await fetchCameraEvents(range.from, range.to, scope, registration || undefined));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(
    () =>
      (data?.events ?? [])
        .filter((e) => typeFilter === "all" || e.type === typeFilter)
        .map((e) => ({ ...e, map: e.lat != null && e.lng != null ? `${e.lat},${e.lng}` : null })),
    [data, typeFilter],
  );

  return (
    <FleetLayout
      title="เหตุการณ์จากกล้อง"
      actions={
        <a
          href={CARTRACK_VISION_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          เปิดคลิปวิดีโอในระบบ Cartrack
        </a>
      }
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        หน้านี้แสดงเหตุการณ์ที่กล้องติดรถตรวจพบ ส่วนคลิปวิดีโอ ภาพจากกล้องแบบเรียลไทม์ และสถานะกล้อง
        ยังไม่สามารถแสดงในระบบนี้ได้ เนื่องจากบัญชีของบริษัทยังไม่ได้เปิดใช้บริการ Cartrack Vision API
        หากต้องการดูคลิปวิดีโอ กรุณาใช้ปุ่ม "เปิดคลิปวิดีโอในระบบ Cartrack"
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 max-w-full text-sm">
            <span className="mb-1 block text-gray-600">รถ</span>
            <select
              value={registration}
              onChange={(e) => {
                setRegistration(e.target.value);
                if (!e.target.value) setRange((r) => ({ from: r.to, to: r.to }));
              }}
              className="rounded-lg border border-gray-300 px-2 py-1"
            >
              <option value="">ทุกคัน</option>
              {vehicles.map((v) => <option key={v.registration} value={v.registration}>{v.name}</option>)}
            </select>
          </label>
          <label className="min-w-0 max-w-full text-sm">
            <span className="mb-1 block text-gray-600">ประเภทเหตุการณ์</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as "important" | "all")} className="max-w-full rounded-lg border border-gray-300 px-2 py-1">
              <option value="important">เหตุการณ์สำคัญ</option>
              <option value="all">ทั้งหมด (รวมรถออกนอกช่องทางเดินรถ ระยะห่างจากรถคันหน้าน้อยเกินไป และกล้องตรวจไม่พบคนขับ)</option>
            </select>
          </label>
          <div className="text-sm">
            <span className="mb-1 block text-gray-600">{allVehicles ? "วันที่ (รถทุกคันแสดงได้ครั้งละ 1 วัน)" : "ช่วงวันที่ (ไม่เกิน 7 วัน)"}</span>
            <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} maxDays={allVehicles ? 1 : 7} single={allVehicles} />
          </div>
          <button onClick={run} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? "กำลังค้นหา" : "แสดงผล"}
          </button>
        </div>
      </Card>

      {loading && (
        <LoadState
          loading
          error={null}
          onRetry={run}
          message={allVehicles ? "กำลังรวบรวมเหตุการณ์ของรถทุกคันจากระบบ Cartrack อาจใช้เวลาประมาณ 10 ถึง 20 วินาที" : undefined}
        />
      )}
      {error && <LoadState loading={false} error={error} onRetry={run} />}

      {data && !loading && (
        <Card title={`พบเหตุการณ์ ${data.total.toLocaleString("th-TH")} ครั้ง`}>
          {data.byType.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-full border px-3 py-1 text-sm ${typeFilter === "all" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"}`}
              >
                ทั้งหมด {data.total.toLocaleString("th-TH")}
              </button>
              {data.byType.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setTypeFilter(t.type)}
                  className={`rounded-full border px-3 py-1 text-sm ${typeFilter === t.type ? "border-orange-500 bg-orange-50 font-semibold text-orange-700" : "border-gray-300 bg-white"}`}
                >
                  {t.label} {t.count.toLocaleString("th-TH")}
                </button>
              ))}
            </div>
          )}
          {data.byVehicle.length > 1 && (
            <p className="mb-3 text-sm text-gray-600">
              รถที่พบเหตุการณ์มากที่สุด: {data.byVehicle.slice(0, 5).map((v) => `${v.vehicleName} (${v.count} ครั้ง)`).join(", ")}
            </p>
          )}
          <DataTable
            exportName={`เหตุการณ์จากกล้อง-${data.from}-ถึง-${data.to}`}
            emptyText="ไม่พบเหตุการณ์จากกล้องในช่วงวันที่และรถที่เลือก"
            columns={[
              { key: "at", label: "เวลา", kind: "datetime" },
              { key: "vehicleName", label: "รถ", kind: "text" },
              { key: "driverName", label: "คนขับ", kind: "text" },
              { key: "label", label: "เหตุการณ์", kind: "text" },
              { key: "speed", label: "ความเร็ว", kind: "speed" },
              { key: "place", label: "สถานที่", kind: "text" },
            ]}
            rows={rows}
            onRowClick={(r) => {
              const m = (r as { map?: string | null }).map;
              if (m) window.open(`https://www.google.com/maps?q=${m}`, "_blank", "noopener");
            }}
          />
          <p className="mt-2 text-xs text-gray-500">คลิกที่แถวเพื่อเปิดตำแหน่งที่เกิดเหตุการณ์ใน Google Maps</p>
        </Card>
      )}
    </FleetLayout>
  );
}
