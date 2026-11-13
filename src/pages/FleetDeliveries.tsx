import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  DeliveriesReview,
  errorMessage,
  fetchDeliveriesReview,
  fetchPath,
  fetchVehicles,
  FleetVehicle,
  replayAt,
  ReviewSession,
  routesText,
  STATUS_META,
  VehiclePath,
} from "../components/fleet-map/api";
import FleetLayout from "../components/fleet-map/FleetLayout";
import FleetGoogleMap, { FitRequest } from "../components/fleet-map/FleetGoogleMap";
import MapShell from "../components/fleet-map/MapShell";
import DateRange from "../components/fleet-map/DateRange";
import { StopSessionCard } from "../components/fleet-map/StopList";
import ActivityTimeline from "../components/fleet-map/ActivityTimeline";
import RoundEtaCard from "../components/fleet-map/RoundEtaCard";
import { useAllowedZones } from "../components/fleet-map/useAllowedZones";
import { EndParking, ZONE_KIND_LABEL } from "../components/fleet-map/api";
import { ago, hm, todayBkk } from "../components/fleet-map/format";

/**
 * การส่งสินค้า (MA-374) — หน้าหลักของงานขนส่งประจำวัน
 * รอบออกรถของวันที่เลือก + ร้านปลายทางของแต่ละรอบบนแผนที่ + ตำแหน่งรถปัจจุบัน
 * เทียบการกดส่งในแอปขนส่งกับ GPS ของรถ เพื่อให้เห็นร้านที่ต้องตรวจในหน้าเดียว
 */
const REFRESH_MS = 60_000;

export default function FleetDeliveries() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayBkk());
  const [data, setData] = useState<DeliveriesReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [path, setPath] = useState<VehiclePath | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  // ชั้น "จุดที่อนุญาต" (จาก HRSoft) — โหลดเมื่อเปิดเท่านั้น
  const [showZones, setShowZones] = useState(false);
  const zonesState = useAllowedZones(showZones);
  const allowedZones = showZones && zonesState.data?.ok ? zonesState.data.zones : null;
  const zoneOwnerName = (code: string) =>
    (zonesState.data?.ok ? zonesState.data.drivers.find((d) => d.employeeCode === code)?.empName : null) ?? null;
  const [fit, setFit] = useState<FitRequest | null>(null);
  const fitId = useRef(0);
  const loadToken = useRef(0);
  const isToday = date === todayBkk();

  const requestFit = (points: google.maps.LatLngLiteral[]) => {
    if (points.length) setFit({ id: ++fitId.current, points });
  };

  const load = useCallback(
    async (silent = false) => {
      const token = ++loadToken.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const [review, snap] = await Promise.all([fetchDeliveriesReview(date), fetchVehicles()]);
        if (token !== loadToken.current) return;
        setData(review);
        setVehicles(snap.vehicles);
        setError(null);
      } catch (e) {
        if (token === loadToken.current) setError(errorMessage(e));
      } finally {
        if (token === loadToken.current && !silent) setLoading(false);
      }
    },
    [date],
  );

  useEffect(() => {
    setSelectedId(null);
    setPath(null);
    setData(null);
    load();
  }, [load]);

  // วันนี้: ปรับข้อมูลทุก 1 นาที (สถานะการส่ง + ตำแหน่งรถ)
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [isToday, load]);

  const sessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.sessions ?? [])
      .filter((s) => !onlyFlagged || s.summary.flagged > 0)
      .filter(
        (s) =>
          !q ||
          [s.empName, s.empCode, s.vehicleName, s.carNumber, routesText(s.routes), ...s.stops.map((x) => x.name)].some((f) =>
            (f ?? "").toLowerCase().includes(q),
          ),
      )
      .sort((a, b) => Number(b.endReason === "open") - Number(a.endReason === "open") || a.start.localeCompare(b.start));
  }, [data, query, onlyFlagged]);

  const selected = useMemo(() => data?.sessions.find((s) => s.shippingOutId === selectedId) ?? null, [data, selectedId]);
  const vehicleOf = useCallback((s: ReviewSession | null) => (s?.registration ? vehicles.find((v) => v.registration === s.registration) ?? null : null), [vehicles]);
  const selectedVehicle = vehicleOf(selected);

  const mapVehicles = useMemo(() => {
    const regs = new Set((selected ? [selected] : sessions).map((s) => s.registration).filter(Boolean));
    return vehicles.filter((v) => regs.has(v.registration));
  }, [vehicles, sessions, selected]);

  const stopPoints = (list: ReviewSession[]) =>
    list.flatMap((s) => s.stops.filter((x) => x.location).map((x) => ({ lat: x.location!.lat, lng: x.location!.lng })));

  // โหลดเสร็จครั้งแรกของวันที่ → ซูมให้เห็นร้านทั้งหมด
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!data || fittedFor.current === data.date) return;
    fittedFor.current = data.date;
    requestFit(stopPoints(data.sessions));
  }, [data]);

  // focusVehicle: กดที่รถบนแผนที่ → ซูมที่รถ · เลือกจากรายการ → ให้เห็นร้านทั้งรอบ
  const select = async (s: ReviewSession, focusVehicle = false) => {
    setSelectedId(s.shippingOutId);
    setPath(null);
    setCursor(null);
    const v = vehicleOf(s);
    if (focusVehicle && v?.lat != null) requestFit([{ lat: v.lat, lng: v.lng! }]);
    else requestFit([...stopPoints([s]), ...(v?.lat != null ? [{ lat: v.lat, lng: v.lng! }] : [])]);
    if (s.registration) {
      try {
        const p = await fetchPath(s.registration, date);
        setPath(p);
      } catch {
        /* เส้นทางเป็นของเสริม */
      }
    }
  };
  const back = () => {
    setSelectedId(null);
    setPath(null);
    setCursor(null);
    requestFit(stopPoints(sessions));
  };

  const exportExcel = () => {
    if (!data) return;
    const rows = data.sessions.flatMap((s) =>
      s.stops.map((x) => ({
        คนขับ: s.empName,
        รหัสพนักงาน: s.empCode,
        รถ: s.vehicleName ?? s.carNumber ?? "",
        ลำดับ: x.seq,
        ร้าน: x.name,
        สาขา: x.branch ?? "",
        เส้นทาง: x.route?.name ?? "",
        จำนวนบิล: x.bills,
        สถานะ: x.statusLabel,
        เวลาที่ยืนยันการส่ง: x.delivery?.at ? new Date(x.delivery.at).toLocaleString("th-TH") : "",
        "รถจอดใกล้ร้าน (GPS)": x.visit ? `${hm(x.visit.arrivedAt)}${x.visit.leftAt ? `-${hm(x.visit.leftAt)}` : ""}` : "",
        ข้อสังเกต: x.flags.join(" / "),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "การส่งสินค้า");
    XLSX.writeFile(wb, `การส่งสินค้า-${data.date}.xlsx`);
  };

  const t = data?.totals;
  return (
    <FleetLayout
      title="การส่งสินค้า"
      fullHeight
      actions={
        <>
          <button onClick={exportExcel} disabled={!data} className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50">
            ส่งออก Excel
          </button>
          <button onClick={() => load()} disabled={loading} className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50">
            {loading ? "กำลังโหลดข้อมูล" : "โหลดข้อมูลใหม่"}
          </button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <aside className="flex min-h-0 flex-1 flex-col border-gray-200 bg-gray-50 md:w-[420px] md:flex-none md:border-r">
          {selected ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <button onClick={back} className="text-sm text-blue-700 hover:underline">กลับไปที่รอบออกรถทั้งหมด</button>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-lg font-bold text-gray-900">{selected.empName}</div>
                <div className="text-sm text-gray-600">
                  {selected.vehicleName ?? `${selected.carNumber ?? "-"} (ยังไม่ได้จับคู่กับระบบ GPS)`}
                  {selected.routes.length ? ` เส้นทาง ${routesText(selected.routes)}` : ""}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  ออกรถเวลา {hm(selected.start)} น.{selected.endReason === "open" ? " ยังไม่สิ้นสุดกะ" : ` สิ้นสุดเวลา ${hm(selected.end)} น.`}
                </div>
                {selectedVehicle && isToday && (
                  <div className="mt-1 text-sm">
                    <span style={{ color: STATUS_META[selectedVehicle.status].color }}>● </span>
                    {selectedVehicle.statusLabel}
                    {selectedVehicle.status === "driving" && selectedVehicle.speed != null ? ` ${Math.round(selectedVehicle.speed)} กม./ชม.` : ""}
                    <span className="text-gray-500"> ข้อมูลล่าสุด {ago(selectedVehicle.lastEventAt)}</span>
                  </div>
                )}
                {!selected.gpsAvailable && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    รถคันนี้ยังไม่ได้จับคู่กับระบบ GPS จึงไม่สามารถตรวจสอบตำแหน่งรถได้ กรุณาจับคู่รถที่เมนูข้อมูลและตั้งค่า หัวข้อจับคู่รถกับระบบ GPS
                  </p>
                )}
                {selected.endParking && <EndParkingNote p={selected.endParking} />}
                {selected.gpsAvailable && selected.gpsNoSignal && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    ระบบ GPS ไม่มีข้อมูลของรถคันนี้{" "}
                    {selected.gpsLastSignalAt
                      ? `ตั้งแต่วันที่ ${new Date(selected.gpsLastSignalAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} น.`
                      : ""}{" "}
                    อาจเป็นเพราะอุปกรณ์ GPS ไม่ส่งข้อมูล หรือคนขับใช้รถคันอื่น จึงไม่สามารถตรวจสอบได้ว่ารถไปถึงร้านค้าหรือไม่
                  </p>
                )}
                {selected.registration && (
                  <button
                    onClick={() => navigate(`/fleet-map?reg=${encodeURIComponent(selected.registration!)}&date=${date}&tab=stops`)}
                    className="mt-2 rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    แสดงการเดินทางและเหตุการณ์ของรถคันนี้
                  </button>
                )}
              </div>
              {path?.segments && (
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-gray-700">ช่วงเวลาของรถคันนี้ในวันที่เลือก</div>
                  <ActivityTimeline path={path} cursor={cursor} onCursor={setCursor} />
                </div>
              )}
              <RoundEtaCard shippingOutId={selected.shippingOutId} date={date} onFocus={(lat, lng) => requestFit([{ lat, lng }])} />
              <StopSessionCard ses={selected} hideHeader onFocus={(lat, lng) => requestFit([{ lat, lng }])} />
              <p className="text-xs text-gray-500">
                พิกัดร้านใช้ตำแหน่งที่คนขับยืนยันการส่งสำเร็จในครั้งก่อน หากยังไม่มีข้อมูลจะใช้พิกัดที่บันทึกในข้อมูลร้าน ระบบถือว่ารถแวะร้านเมื่อ GPS
                ตรวจพบว่ารถจอดห่างจากร้านไม่เกิน 200 เมตร
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 border-b border-gray-200 bg-white p-3">
                <DateRange from={date} to={date} onChange={(d) => setDate(d)} maxDays={1} single />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาคนขับ รถ เส้นทาง หรือชื่อร้าน"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
                  แสดงเฉพาะรอบที่มีร้านที่ควรตรวจสอบ
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700" title="จุดของบริษัทและบ้านพักของคนขับรถร่วม ที่ลงเวลาเข้าหรือออกงานได้ ตามข้อมูลในระบบ HRSoft">
                  <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
                  แสดงจุดที่อนุญาตบนแผนที่
                </label>
                {showZones && (zonesState.loading || zonesState.error || (zonesState.data && !zonesState.data.ok)) && (
                  <p className={`text-xs ${zonesState.loading ? "text-gray-500" : "text-amber-800"}`}>
                    {zonesState.loading
                      ? "กำลังโหลดจุดที่อนุญาต"
                      : zonesState.error ?? (zonesState.data && !zonesState.data.ok ? zonesState.data.message : "")}
                  </p>
                )}
                {t && (
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {([
                      ["รอบออกรถ", t.sessions, "text-gray-900"],
                      ["ร้านทั้งหมด", t.total, "text-gray-900"],
                      ["ส่งแล้ว", t.delivered, "text-green-700"],
                      ["ควรตรวจสอบ", t.flagged, t.flagged ? "text-amber-700" : "text-gray-900"],
                    ] as [string, number, string][]).map(([label, n, cls]) => (
                      <div key={label} className="rounded-lg bg-gray-50 py-1.5">
                        <div className={`text-lg font-bold ${cls}`}>{n.toLocaleString("th-TH")}</div>
                        <div className="text-[11px] text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {loading && !data && <p className="p-4 text-center text-sm text-gray-500">กำลังรวบรวมข้อมูลรอบออกรถ ร้านที่ต้องส่ง และตำแหน่งรถ</p>}
                {error && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                    <button onClick={() => load()} className="ml-2 underline">ลองอีกครั้ง</button>
                  </div>
                )}
                {data && sessions.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">
                    {data.sessions.length ? "ไม่พบรอบออกรถที่ตรงกับเงื่อนไข" : "ไม่พบการลงทะเบียนออกรถในวันที่เลือก"}
                  </p>
                )}
                {sessions.map((s) => (
                  <RoundCard key={s.shippingOutId} s={s} vehicle={vehicleOf(s)} live={isToday} onClick={() => select(s)} />
                ))}
              </div>
            </>
          )}
        </aside>

        <main className="relative h-[45vh] flex-none md:h-auto md:flex-1">
          <MapShell className="h-full">
            <FleetGoogleMap
              vehicles={mapVehicles}
              selected={selectedVehicle}
              path={path}
              replay={cursor != null && path ? replayAt(path, cursor) : null}
              stops={{ sessions: selected ? [selected] : sessions }}
              zones={allowedZones}
              zoneOwnerName={zoneOwnerName}
              fit={fit}
              onSelect={(v) => {
                const round =
                  sessions.find((s) => s.registration === v.registration && s.endReason === "open") ??
                  sessions.find((s) => s.registration === v.registration);
                if (round) select(round, true);
              }}
              onUserMove={() => {}}
            />
          </MapShell>
        </main>
      </div>
    </FleetLayout>
  );
}

function RoundCard({ s, vehicle, live, onClick }: { s: ReviewSession; vehicle: FleetVehicle | null; live: boolean; onClick: () => void }) {
  const sum = s.summary;
  const done = sum.delivered + sum.returned + sum.cancelled;
  const pct = sum.total ? Math.round((done / sum.total) * 100) : 0;
  return (
    <button onClick={onClick} className="block w-full rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-blue-300">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-gray-900">{s.empName}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${s.endReason === "open" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
          {s.endReason === "open" ? "กำลังจัดส่ง" : `สิ้นสุดรอบเวลา ${hm(s.end)} น.`}
        </span>
      </div>
      <div className="mt-0.5 truncate text-xs text-gray-600">
        {s.vehicleName ?? `${s.carNumber ?? "-"} (ยังไม่ได้จับคู่กับระบบ GPS)`} ออกรถเวลา {hm(s.start)} น.
        {s.routes.length ? ` เส้นทาง ${routesText(s.routes)}` : ""}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-600">
        <span>
          ส่งแล้ว {sum.delivered} จาก {sum.total} ร้าน
        </span>
        {sum.pending > 0 && <span>ยังไม่ได้ส่ง {sum.pending}</span>}
        {sum.returned + sum.cancelled > 0 && <span className="text-red-600">ตีกลับหรือยกเลิก {sum.returned + sum.cancelled}</span>}
        {sum.flagged > 0 && <span className="font-semibold text-amber-700">ควรตรวจสอบ {sum.flagged}</span>}
        {live && vehicle && s.endReason === "open" && (
          <span>
            <span style={{ color: STATUS_META[vehicle.status].color }}>●</span> {vehicle.statusLabel}
          </span>
        )}
      </div>
    </button>
  );
}

const distanceText = (m: number) =>
  m >= 1000 ? `${(m / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} กิโลเมตร` : `${m.toLocaleString("th-TH")} เมตร`;

/** จุดจอดล่าสุดของวัน เทียบกับจุดที่คนขับลงเวลาออกงานได้ (HRSoft) */
function EndParkingNote({ p }: { p: EndParking }) {
  const since = `ตั้งแต่เวลา ${hm(p.since)} น.`;
  if (p.allowed === true && p.zone)
    return (
      <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">
        จุดจอดล่าสุดของวัน: {p.zone.name} ({ZONE_KIND_LABEL[p.zone.kind]}) {since} อยู่ในจุดที่คนขับลงเวลาออกงานได้
      </p>
    );
  if (p.allowed === false)
    return (
      <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-900">
        จุดจอดล่าสุดของวันอยู่นอกจุดที่คนขับลงเวลาออกงานได้ {since}
        {p.nearest ? ` ห่างจาก${p.nearest.name} ${distanceText(p.nearest.distanceM)}` : ""}
      </p>
    );
  return (
    <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
      จุดจอดล่าสุดของวัน {since} ระบบ HRSoft ยังไม่มีข้อมูลจุดลงเวลาออกงานของคนขับคนนี้ จึงไม่สามารถตรวจสอบได้
    </p>
  );
}
