import * as XLSX from "xlsx";
import { useState, type ReactNode } from "react";
import { DayTrips, DaySummary, driverOf, FleetVehicle, MAP_EVENT_TYPES, routesText, SESSION_END_LABEL, STATUS_META, Trip, VehiclePath, VehicleStops } from "./api";
import { StopSessionCard } from "./StopList";
import ActivityTimeline from "./ActivityTimeline";
import { ago, dayLabel, duration, hm, km } from "./format";
import DateRange from "./DateRange";
import { DayTimeline, TrackChart } from "./DayCharts";

export function StatusBadge({ status }: { status: FleetVehicle["status"] }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: m.color, backgroundColor: `${m.color}1f` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{children}</span>;
}

function Tag({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] ${warn ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}>
      {children}
    </span>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="rounded px-2 py-1 font-semibold hover:bg-red-100">ลองอีกครั้ง</button>
    </div>
  );
}

const Spinner = () => (
  <div className="flex justify-center p-6">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
  </div>
);

interface Props {
  vehicle: FleetVehicle;
  days: DaySummary[] | null;
  daysLoading: boolean;
  daysError: string | null;
  selectedDay: string;
  dayTrips: DayTrips | null;
  tripsLoading: boolean;
  tripsError: string | null;
  path: VehiclePath | null;
  pathLoading: boolean;
  /** ร้านที่ต้องส่งของวันที่เลือก (ระบบขนส่ง) */
  stops?: VehicleStops | null;
  stopsError?: string | null;
  /** เวลาที่เลือกบนแถบช่วงเวลา (วินาที epoch) — แผนที่แสดงตำแหน่งรถ ณ เวลานั้น */
  cursor?: number | null;
  onCursor?: (t: number | null) => void;
  /** แท็บที่เปิดเมื่อแสดงวันที่ใหม่ */
  defaultTab?: "trips" | "stops" | "events";
  following: boolean;
  onClose: () => void;
  onRetry: () => void;
  onToggleFollow: () => void;
  onSelectDay: (date: string) => void;
  onTripClick: (t: Trip) => void;
  /** ถอยแผนที่ออกให้เห็นเส้นทางทั้งวัน */
  onFitPath?: () => void;
  /** ช่วงวันที่ของรายการกิจกรรมรายวัน */
  daysRange: { from: string; to: string };
  onDaysRangeChange: (from: string, to: string) => void;
  /** ซูมแผนที่ไปยังจุด (เช่น จุดที่เกิดเหตุการณ์) */
  onFocusPoint: (lat: number, lng: number) => void;
}

/** คัดลอกข้อความ — navigator.clipboard ใช้ได้เฉพาะ https/localhost จึงมีทางสำรอง */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** รายละเอียดรถ: ข้อมูลรถ → กิจกรรมรายวัน → สรุปวันที่เลือก (Timeline กราฟความเร็ว รายการเดินทาง เหตุการณ์) */
export default function VehicleDetail(p: Props) {
  const v = p.vehicle;
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (v.lat == null || v.lng == null) return;
    const when = v.lastEventAt ? new Date(v.lastEventAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-";
    const text = `ตำแหน่งรถ ${v.name} (ทะเบียน ${v.registration})\nข้อมูลเมื่อ ${when} น.\n${v.positionDescription ?? ""}\nhttps://www.google.com/maps?q=${v.lat},${v.lng}`;
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };
  const modelText = [v.make, v.model, v.year, v.colour].filter(Boolean).join(" ");
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900">{v.name}</h2>
            <p className="text-sm text-gray-500">{`ทะเบียน ${v.registration}${modelText ? ` ${modelText}` : ""}`}</p>
          </div>
          <button onClick={p.onClose} title="ปิด" aria-label="ปิด" className="rounded p-1 text-gray-500 hover:bg-gray-100">✕</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <StatusBadge status={v.status} />
          {v.status === "driving" && v.speed != null && <Pill>{Math.round(v.speed)} กม./ชม.</Pill>}
          <Pill>ข้อมูลล่าสุด {ago(v.lastEventAt)}</Pill>
          {v.odometerKm != null && <Pill>เลขไมล์ {Math.round(v.odometerKm).toLocaleString("th-TH")} กม.</Pill>}
          <Pill>{driverOf(v) ? `คนขับ ${driverOf(v)}` : "ไม่พบคนขับที่ลงทะเบียน"}</Pill>
        </div>
        {v.currentDriver && (
          <p className="mt-2 text-sm text-gray-700">
            {`ออกรถเวลา ${hm(v.currentDriver.since)} น. ด้วยรถทะเบียน ${v.currentDriver.carNumber ?? "-"}`}
            {v.currentDriver.routes.length ? ` เส้นทาง ${routesText(v.currentDriver.routes)}` : ""}
          </p>
        )}
        {v.positionDescription && <p className="mt-2 text-sm text-gray-700">ตำแหน่ง: {v.positionDescription}</p>}
        {v.lat != null && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={p.onToggleFollow}
              className={`rounded-full border px-3 py-1 text-sm ${p.following ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
            >
              {p.following ? "กำลังติดตามรถ" : "ติดตามรถ"}
            </button>
            <button onClick={share} className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
              {copied ? "คัดลอกตำแหน่งแล้ว" : "คัดลอกตำแหน่งรถ"}
            </button>
          </div>
        )}
      </section>

      <section>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">กิจกรรมรายวัน</h3>
        </div>
        <div className="mb-2">
          <DateRange from={p.daysRange.from} to={p.daysRange.to} onChange={p.onDaysRangeChange} maxDays={31} />
        </div>
        {p.daysLoading && !p.days ? (
          <Spinner />
        ) : p.daysError ? (
          <ErrorBox message={p.daysError} onRetry={p.onRetry} />
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {(p.days ?? []).map((d) => {
              const on = d.date === p.selectedDay;
              const warn = d.harshEvents + d.speedingEvents;
              return (
                <button
                  key={d.date}
                  onClick={() => p.onSelectDay(d.date)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-orange-50 ${on ? "bg-orange-50 font-semibold" : ""}`}
                >
                  <span className="flex-1">{dayLabel(d.date)}</span>
                  {d.trips === 0 ? (
                    <span className="text-gray-400">ไม่มีการเดินทาง</span>
                  ) : (
                    <>
                      <span className="text-gray-600">{d.trips} เที่ยว</span>
                      <span className="w-20 text-right font-semibold">{km(d.distanceKm)}</span>
                      <span className="w-14 text-right text-xs text-amber-600" title={warn > 0 ? "จำนวนเหตุการณ์การขับขี่ที่ควรตรวจสอบ" : undefined}>{warn > 0 ? `${warn} ครั้ง` : ""}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1.5 text-sm font-bold text-gray-800">
          {dayLabel(p.selectedDay)} ({p.selectedDay.split("-").reverse().join("/")})
        </h3>
        {p.tripsLoading && !p.dayTrips ? (
          <Spinner />
        ) : p.tripsError ? (
          <ErrorBox message={p.tripsError} onRetry={p.onRetry} />
        ) : p.dayTrips ? (
          <DaySection {...p} dayTrips={p.dayTrips} />
        ) : null}
      </section>
    </div>
  );
}

function DaySection(p: Props & { dayTrips: DayTrips }) {
  const [tab, setTab] = useState<"trips" | "stops" | "events">(p.defaultTab ?? "trips");
  const stopCount = (p.stops?.sessions ?? []).reduce((n, x) => n + x.stops.length, 0);
  const [allEvents, setAllEvents] = useState(false);
  const s = p.dayTrips.summary;
  // เที่ยวที่ยังวิ่งอยู่: จุด GPS แรกหลังเที่ยวล่าสุดที่รถเคลื่อนที่
  const lastEnd = p.dayTrips.trips.reduce((m, t) => (t.end && Date.parse(t.end) > m ? Date.parse(t.end) : m), 0);
  const ongoingFrom = p.dayTrips.ongoing
    ? (p.path?.points.find(([, , ts, speed]) => ts * 1000 > lastEnd && speed > 0)?.[2] ?? 0) * 1000 || null
    : null;
  const mapEvents = (p.path?.events ?? []).filter((e) => MAP_EVENT_TYPES.has(e.type)).length;
  const lastTrip = [...p.dayTrips.trips].filter((t) => t.end).sort((a, b) => (a.end ?? "").localeCompare(b.end ?? "")).pop();
  // จากจุดสัญญาณ (รวมเที่ยวที่กำลังวิ่ง) แบบเว็บ Cartrack — backend เก่าที่ไม่มีข้อมูลนี้ใช้สรุปจาก trip
  const ss = p.path?.stateSeconds;
  const odo = (p.path?.points ?? []).map((x) => x[7]).filter((x): x is number => x != null);
  const live = ss
    ? {
        driving: ss.driving,
        idle: ss.idling,
        ignition: ss.driving + ss.idling,
        distance: odo.length > 1 ? Math.max(s.distanceKm, odo[odo.length - 1] - odo[0]) : s.distanceKm,
      }
    : null;
  const stats: [string, string][] = [
    ["จอด", duration(live ? Math.max(0, s.stopSeconds + s.ignitionSeconds - live.ignition) : s.stopSeconds)],
    ["ระยะทาง", km(live ? live.distance : s.distanceKm)],
    ["ขับขี่", duration(live ? live.driving : s.drivingSeconds)],
    ["จอดติดเครื่องยนต์", duration(live ? live.idle : s.idleSeconds)],
    ["ติดเครื่อง", duration(live ? live.ignition : s.ignitionSeconds)],
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 rounded-xl border border-gray-200 bg-white py-3 text-center">
        {stats.map(([label, value]) => (
          <div key={label}>
            <div className="text-sm font-bold text-gray-900">{value}</div>
            <div className="text-[11px] text-gray-500">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {p.pathLoading
          ? "กำลังโหลดข้อมูลเส้นทาง"
          : p.path
            ? p.path.points.length
              ? `แสดงเส้นทาง ${p.path.totalPoints.toLocaleString("th-TH")} จุด${mapEvents ? ` และเหตุการณ์สำคัญ ${mapEvents} ครั้ง` : ""}`
              : "ไม่พบข้อมูลสัญญาณ GPS ในวันที่เลือก"
            : ""}
        {p.path && p.path.points.length > 1 && p.onFitPath && (
          <button onClick={p.onFitPath} className="ml-2 text-blue-700 hover:underline">
            แสดงเส้นทางทั้งวัน
          </button>
        )}
      </p>
      <DayDrivers dayTrips={p.dayTrips} />
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 text-xs font-semibold text-gray-700">ช่วงเวลาในวัน</div>
        {p.path?.segments ? (
          <ActivityTimeline path={p.path} cursor={p.cursor ?? null} onCursor={(t) => p.onCursor?.(t)} />
        ) : (
          <DayTimeline date={p.selectedDay} trips={p.dayTrips.trips} idling={p.dayTrips.idling ?? []} ongoingFrom={ongoingFrom} />
        )}
        {p.path && p.path.points.length > 1 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <TrackChart path={p.path} cursor={p.cursor ?? null} />
          </div>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {([
          ["trips", `รายการเดินทาง (${p.dayTrips.trips.length})`],
          ["stops", `ร้านที่ต้องส่ง (${p.stops ? stopCount : "-"})`],
          ["events", `เหตุการณ์ (${allEvents ? (p.path?.events ?? []).length : mapEvents})`],
        ] as ["trips" | "stops" | "events", string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-none border-b-2 px-3 py-1.5 text-sm ${tab === k ? "border-blue-600 font-semibold text-blue-700" : "border-transparent text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "stops" && (
        <StopsList stops={p.stops ?? null} error={p.stopsError ?? null} onFocus={p.onFocusPoint} />
      )}
      {tab === "events" && (
        <EventsList path={p.path} loading={p.pathLoading} all={allEvents} onToggleAll={() => setAllEvents((x) => !x)} onFocus={p.onFocusPoint} />
      )}
      {tab === "trips" && p.dayTrips.ongoing && (
        <div className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-700">
          {p.vehicle.status === "driving"
            ? "รถกำลังเดินทาง เที่ยวนี้จะแสดงในรายการเมื่อดับเครื่องยนต์"
            : "รถติดเครื่องยนต์อยู่ เที่ยวที่ยังไม่สิ้นสุดจะแสดงในรายการเมื่อดับเครื่องยนต์"}
        </div>
      )}
      {tab === "trips" && p.dayTrips.ongoing && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3 text-sm">
          <div className="flex gap-2">
            <span className="w-24 flex-none font-semibold text-gray-700">เริ่มเที่ยวปัจจุบัน</span>
            <span className="w-12 flex-none tabular-nums">{ongoingFrom ? hm(new Date(ongoingFrom).toISOString()) : "-"}</span>
            <span className="min-w-0 flex-1 text-gray-700">{lastTrip?.endGeofence ?? lastTrip?.endLocation ?? "-"}</span>
          </div>
          <div className="mt-1 flex gap-2">
            <span className="w-24 flex-none font-semibold text-orange-700">ตำแหน่งล่าสุด</span>
            <span className="w-12 flex-none tabular-nums">{hm(p.vehicle.lastEventAt)}</span>
            <span className="min-w-0 flex-1 text-gray-700">{p.vehicle.positionDescription ?? "-"}</span>
          </div>
        </div>
      )}
      {tab === "trips" && p.dayTrips.trips.length === 0 && !p.dayTrips.ongoing && (
        <p className="p-4 text-center text-sm text-gray-500">ไม่พบการเดินทางในวันที่เลือก</p>
      )}
      {tab === "trips" && [...p.dayTrips.trips].reverse().map((t, i) => (
        <button
          key={`${t.start}-${i}`}
          onClick={() => p.onTripClick(t)}
          className="block w-full rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-blue-300"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-bold">{hm(t.start)} – {hm(t.end)}</span>
            <span className="ml-auto text-sm text-gray-600">{km(t.distanceKm)} ระยะเวลา {duration(t.durationSeconds)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-gray-800"><span className="text-green-600">●</span> {t.startGeofence ?? t.startLocation ?? "-"}</p>
          <p className="line-clamp-2 text-[13px] text-gray-800"><span className="text-red-600">●</span> {t.endGeofence ?? t.endLocation ?? "-"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {t.maxSpeed != null && <Tag>ความเร็วสูงสุด {Math.round(t.maxSpeed)} กม./ชม.</Tag>}
            {t.idleSeconds > 0 && <Tag>จอดติดเครื่องยนต์ {duration(t.idleSeconds)}</Tag>}
            {t.harshBraking > 0 && <Tag warn>เบรกรุนแรง {t.harshBraking} ครั้ง</Tag>}
            {t.harshAcceleration > 0 && <Tag warn>เร่งความเร็วรุนแรง {t.harshAcceleration} ครั้ง</Tag>}
            {t.harshCornering > 0 && <Tag warn>เลี้ยวรุนแรง {t.harshCornering} ครั้ง</Tag>}
            {t.speedingEvents > 0 && <Tag warn>ขับขี่เกินความเร็วที่กำหนด {t.speedingEvents} ครั้ง</Tag>}
            {t.assigned ? (
              <Tag>
                คนขับ {t.assigned.empName}
                {t.assigned.routes.length ? ` เส้นทาง ${routesText(t.assigned.routes)}` : ""}
              </Tag>
            ) : (
              t.driverName && <Tag>{t.driverName}</Tag>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/** คนขับที่ลงทะเบียนใช้รถคันนี้ในวันนั้น (ระบบขนส่ง) — รถคันเดียวอาจมีหลายคนขับในวันเดียว */
function DayDrivers({ dayTrips }: { dayTrips: DayTrips }) {
  const drivers = dayTrips.drivers ?? [];
  if (!drivers.length)
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-xs text-gray-500">
        ไม่พบการลงทะเบียนออกรถคันนี้ในระบบขนส่งของวันนี้
      </p>
    );
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-gray-700">คนขับที่ลงทะเบียนใช้รถ</div>
      <ul className="space-y-1.5 text-sm">
        {drivers.map((d) => (
          <li key={`${d.empCode}-${d.start}`} className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-gray-900">{d.empName}</span>
            <span className="text-gray-600">
              {hm(d.start)} – {d.endReason === "open" ? "ปัจจุบัน" : hm(d.end)} น.
            </span>
            <span className="text-xs text-gray-500">({SESSION_END_LABEL[d.endReason]})</span>
            {d.routes.length > 0 && <span className="w-full text-xs text-gray-600">เส้นทาง {routesText(d.routes)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** ร้านที่รถต้องไปส่งในวันนั้น แยกตามรอบออกรถ — เทียบการกดส่งในแอปขนส่งกับ GPS ของรถ */
function StopsList({ stops, error, onFocus }: { stops: VehicleStops | null; error: string | null; onFocus: (lat: number, lng: number) => void }) {
  if (error) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!stops) return <Spinner />;
  if (!stops.sessions.length)
    return <p className="p-4 text-center text-sm text-gray-500">ไม่พบการลงทะเบียนออกรถคันนี้ในระบบขนส่งของวันนี้ จึงไม่มีรายการร้านที่ต้องส่ง</p>;
  return (
    <div className="space-y-3">
      {stops.sessions.map((ses) => (
        <StopSessionCard key={ses.shippingOutId} ses={ses} onFocus={onFocus} />
      ))}
      <p className="text-xs text-gray-500">
        พิกัดร้านใช้ตำแหน่งที่คนขับยืนยันการส่งสำเร็จในครั้งก่อน หากยังไม่มีข้อมูลจะใช้พิกัดที่บันทึกในข้อมูลร้าน
        ระบบถือว่ารถแวะร้านเมื่อ GPS ตรวจพบว่ารถจอดห่างจากร้านไม่เกิน 200 เมตร
      </p>
    </div>
  );
}

/** ตารางเหตุการณ์ของวัน — ค่าเริ่มต้นแสดงเฉพาะเหตุการณ์สำคัญ (ตัดติด/ดับเครื่อง ออกนอกเลน ระยะห่างคันหน้า) */
function EventsList({ path, loading, all, onToggleAll, onFocus }: {
  path: VehiclePath | null;
  loading: boolean;
  all: boolean;
  onToggleAll: () => void;
  onFocus: (lat: number, lng: number) => void;
}) {
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  if (loading && !path) return <Spinner />;
  const source = path?.events ?? [];
  const labels = [...new Map(source.map((e) => [e.type, e.label])).entries()].sort((x, y) => x[1].localeCompare(y[1], "th"));
  const query = q.trim().toLowerCase();
  const events = source
    .filter((e) => (type ? e.type === type : all || MAP_EVENT_TYPES.has(e.type)))
    .filter((e) => !query || e.label.toLowerCase().includes(query) || (e.place ?? "").toLowerCase().includes(query));
  const exportExcel = () => {
    const rows = events.map((e) => ({
      เวลา: new Date(e.at).toLocaleString("th-TH"),
      เหตุการณ์: e.label,
      "ความเร็ว (กม./ชม.)": e.speed != null ? Math.round(e.speed) : "",
      สถานที่: e.place ?? "",
      พิกัด: `${e.lat},${e.lng}`,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "เหตุการณ์");
    XLSX.writeFile(wb, `เหตุการณ์-${path?.date ?? ""}.xlsx`);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          value={type || (all ? "__all" : "")}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__all" || v === "") {
              setType("");
              if ((v === "__all") !== all) onToggleAll();
            } else setType(v);
          }}
          className="max-w-full rounded-lg border border-gray-300 px-2 py-1"
          aria-label="ประเภทเหตุการณ์"
        >
          <option value="">เหตุการณ์สำคัญ</option>
          <option value="__all">ทั้งหมด</option>
          {labels.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเหตุการณ์หรือสถานที่" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1" />
        <button onClick={exportExcel} disabled={!events.length} className="rounded-lg border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:opacity-50">
          ส่งออก Excel
        </button>
      </div>
      <p className="text-xs text-gray-500">{events.length.toLocaleString("th-TH")} รายการ</p>
      {events.length === 0 ? (
        <p className="p-4 text-center text-sm text-gray-500">ไม่พบเหตุการณ์ที่ตรงกับเงื่อนไข</p>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {[...events].reverse().map((e, i) => (
            <button key={i} onClick={() => onFocus(e.lat, e.lng)} className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50">
              <span className="w-12 flex-none tabular-nums text-gray-500">{hm(e.at)}</span>
              <span className="min-w-0 flex-1">
                <span className={`font-semibold ${MAP_EVENT_TYPES.has(e.type) ? "text-orange-700" : "text-gray-800"}`}>{e.label}</span>
                {e.place && <span className="block truncate text-xs text-gray-500">{e.place}</span>}
              </span>
              {e.speed != null && <span className="flex-none text-xs text-gray-500">{Math.round(e.speed)} กม./ชม.</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
