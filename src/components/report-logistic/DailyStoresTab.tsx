import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { API, authHeader, ExcelIcon, exportXlsx, fmtDate, fmtDuration, fmtTime, minutesBetween } from "./shared";
import WaitingLoadSection from "./WaitingLoadSection";
import { SoButton, TimelineRow } from "./OrderTimeline";
import { billNumberOf, fetchBillNumbers, useBillNumbers } from "./billNumbers";

// MA-363 — ร้านที่พนักงานแต่ละคนขึ้นของ / ส่งแล้ว / ไม่ได้ส่ง ของวันที่เลือก

type Status = "done" | "back" | "pending";

interface StoreVisit {
  status: Status;
  mem_code: string;
  mem_name: string;
  route_code: string | null;
  route_name: string | null;
  box_amount: number;
  bill_count: number;
  sh_runnings: string[];
  bill_notes: string[];
  shipping_count: number;
  loaded_at: string | null;
  time: string | null;
  note: string | null;
}

interface DriverStores {
  emp_code: string;
  emp_name: string;
  emp_tel: string | null;
  routes: { route_code: string; route_name: string | null }[];
  departures: string[];
  start_time: string | null;
  end_time: string | null;
  /** เวลาเข้างานจาก HRSoft — backend ยังไม่ส่ง (รอ API ย้อนหลังของ HRSoft) */
  clock_in_at?: string | null;
  first_store: StoreVisit | null;
  last_store: StoreVisit | null;
  loaded_count: number;
  done_count: number;
  back_count: number;
  pending_count: number;
  stores: StoreVisit[];
}

// ค้าง "กำลังส่ง" ของวันนี้ยังส่งได้อยู่ — ถ้าเป็นวันก่อนหน้าแปลว่าขึ้นของแล้วไม่ได้ส่ง
const statusLabel = (s: Status, isToday: boolean) =>
  s === "done" ? "ส่งแล้ว" : s === "back" ? "ตีกลับ" : isToday ? "กำลังส่ง" : "ค้างไม่ส่ง";

const STATUS_STYLE: Record<Status, string> = {
  back: "bg-rose-100 text-rose-700 ring-rose-200",
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function Count({ label, n, tone }: { label: string; n: number; tone: string }) {
  return (
    <div className={`rounded-lg px-3 py-1.5 text-center ${n > 0 ? tone : "bg-white/10 text-blue-50/60"}`}>
      <div className="text-lg font-extrabold leading-none tabular-nums">{n}</div>
      <div className="text-[length:calc(11px*var(--fs,1))] font-semibold mt-0.5">{label}</div>
    </div>
  );
}

// ช่วงเวลาในแถบฟ้า — เวลาเริ่ม → เวลาจบ อยู่ช่องเดียวกัน พร้อมระยะเวลา
function SpanBox({ label, from, to, fromLabel, toLabel, fromSub, toSub, missing }: {
  label: string; from: string | null; to: string | null;
  fromLabel: string; toLabel: string; fromSub?: string; toSub?: string; missing?: string;
}) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-3 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-blue-50">{label}</span>
        <span className="text-white font-extrabold text-lg tabular-nums">{fmtDuration(minutesBetween(from, to))}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mt-1.5">
        <div className="min-w-0">
          <div className="text-[length:calc(11px*var(--fs,1))] text-blue-50/80">{fromLabel}</div>
          <div className="text-white font-bold tabular-nums">{fmtTime(from)}</div>
          {fromSub && <div className="text-[length:calc(11px*var(--fs,1))] text-blue-50/80 truncate" title={fromSub}>{fromSub}</div>}
        </div>
        <span className="text-blue-50/70 pt-4">→</span>
        <div className="min-w-0 text-right">
          <div className="text-[length:calc(11px*var(--fs,1))] text-blue-50/80">{toLabel}</div>
          <div className="text-white font-bold tabular-nums">{fmtTime(to)}</div>
          {toSub && <div className="text-[length:calc(11px*var(--fs,1))] text-blue-50/80 truncate" title={toSub}>{toSub}</div>}
        </div>
      </div>
      {missing && <div className="text-[length:calc(11px*var(--fs,1))] text-amber-100 mt-1">{missing}</div>}
    </div>
  );
}

/**
 * เวลารถออกของร้านนี้ = รอบออกรถล่าสุดของคนขับ (วันที่เลือก) ที่ออกก่อนเวลาส่ง/ตีกลับ
 * ยังไม่ส่ง = รอบล่าสุดของวัน · ไม่ใช้ Shipping.shipping_out_id เพราะตอนตีกลับถูกล้าง
 */
const departedAt = (s: StoreVisit, departures: string[]) => {
  const t = s.time ? new Date(s.time).getTime() : Infinity;
  let best: string | null = null;
  for (const d of departures) if (new Date(d).getTime() <= t) best = d;
  return best;
};
// เวลารถออก → ส่ง/ตีกลับ (นาที) — ยังไม่ส่ง หรือไม่มีรอบออกรถ = null
const departToDoneMin = (s: StoreVisit, departures: string[]) => {
  const dep = departedAt(s, departures);
  if (!dep || !s.time) return null;
  const m = Math.round((new Date(s.time).getTime() - new Date(dep).getTime()) / 60000);
  return m >= 0 ? m : null;
};
const fmtMin = (m: number | null) => (m == null ? "-" : m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} น.` : `${m} น.`);

// เวลาบรรทัดบน วันที่บรรทัดล่าง
function DateTime({ iso, empty }: { iso: string | null; empty: string }) {
  if (!iso) return <span className="text-slate-400">{empty}</span>;
  return (
    <>
      <div className="font-bold text-slate-700 tabular-nums">{fmtTime(iso)}</div>
      <div className="text-[length:calc(11px*var(--fs,1))] text-slate-400">{fmtDate(iso)}</div>
    </>
  );
}

function DriverStoresCard({ d, isToday, date, routeFilter }: { d: DriverStores; isToday: boolean; date: string; routeFilter: string }) {
  // OPHMBC-331 — เลข SO ที่กาง timeline อยู่ ("แถว|SO") กดซ้ำเพื่อพับ
  const [openSo, setOpenSo] = useState<string | null>(null);
  const toggle = (row: number | string, so: string) => setOpenSo((cur) => (cur === `${row}|${so}` ? null : `${row}|${so}`));
  const openAt = (row: number | string) => (openSo?.startsWith(`${row}|`) ? openSo.slice(String(row).length + 1) : null);
  const [open, setOpen] = useState(d.back_count + d.pending_count > 0);
  // เลขที่ใบกำกับดึงเฉพาะตอนการ์ดเปิดอยู่
  const invoice = useBillNumbers(open ? d.stores.flatMap((s) => s.sh_runnings) : []);
  const deps = d.departures.map((t) => fmtTime(t));
  // เลือกเส้นทาง → ตารางเหลือเฉพาะร้านในเส้นทางนั้น (แถบฟ้ายังเป็นของทั้งวัน)
  const stores = routeFilter ? d.stores.filter((s) => s.route_code === routeFilter) : d.stores;
  return (
    <div className="rounded-3xl bg-white ring-1 ring-blue-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-blue-800 via-blue-600 to-sky-500 px-5 md:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* มือถือ: ชื่อ + เส้นทางเต็มแถว ตัวเลขสถานะลงบรรทัดถัดไป */}
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-white font-extrabold text-base">{d.emp_name}</span>
              <span className="text-blue-50 text-sm font-semibold tabular-nums">โทร {d.emp_tel || "-"}</span>
              <span className="bg-white text-blue-700 rounded-md px-2 py-0.5 text-xs font-bold">{fmtDate(`${date}T00:00:00`)}</span>
            </div>
            <div className="text-blue-50/80 text-xs font-mono">{d.emp_code}</div>
            {d.routes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {d.routes.map((rt) => (
                  <span key={rt.route_code} className="bg-white/15 text-white text-xs rounded-md px-2 py-0.5">
                    <b>{rt.route_code}</b>{rt.route_name ? ` ${rt.route_name}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <Count label="ตีกลับ" n={d.back_count} tone="bg-rose-500 text-white" />
            <Count label={isToday ? "กำลังส่ง" : "ค้าง"} n={d.pending_count} tone="bg-amber-400 text-amber-950" />
            <Count label="ส่งแล้ว" n={d.done_count} tone="bg-emerald-500 text-white" />
            <Count label="ขึ้นของ" n={d.loaded_count} tone="bg-white text-blue-700" />
          </div>
          <button onClick={() => setOpen((v) => !v)} className="text-white text-sm font-semibold bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5">
            {open ? "ย่อ" : "ขยาย"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <SpanBox label="เวลาขึ้นของ" fromLabel="เวลาเริ่ม (ขึ้นของแรก)" toLabel="ออกรถ"
            from={d.start_time} to={d.departures[0] ?? null}
            toSub={deps.length > 1 ? `ออก ${deps.length} รอบ: ${deps.join(", ")}` : undefined} />
          {/* นับทั้งร้านที่ส่งแล้วและตีกลับ (เวลาที่ไปถึงร้าน) */}
          <SpanBox label="เวลาส่งจริง" fromLabel="ร้านแรกที่เริ่มส่ง" toLabel="ร้านสุดท้าย"
            from={d.first_store?.time ?? null} to={d.last_store?.time ?? null}
            fromSub={d.first_store?.mem_name} toSub={d.last_store?.mem_name} />
          <SpanBox label="เวลาทำงานทั้งกะ" fromLabel="เวลาเข้างาน" toLabel="เวลาจบกะ"
            from={d.clock_in_at ?? null} to={d.end_time}
            missing={d.clock_in_at ? undefined : "ยังไม่มีเวลาเข้างานจาก HRSoft"} />
        </div>
      </div>
      {open && (
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full border-separate border-spacing-0 text-[length:calc(13px*var(--fs,1))] min-w-[1200px]">
            <thead className="sticky top-0 z-[5] shadow-[0_1px_0_0_rgb(219,234,254)]">
              <tr className="bg-blue-50 text-blue-700 text-xs">
                <th className="text-left font-bold px-4 py-2">สถานะ</th>
                <th className="text-left font-bold px-3 py-2">ร้าน</th>
                <th className="text-left font-bold px-3 py-2">เลข SO / ใบกำกับ</th>
                <th className="text-left font-bold px-3 py-2">เลขที่บิล</th>
                <th className="text-center font-bold px-3 py-2">ลัง · บิล</th>
                <th className="text-left font-bold px-3 py-2">ขึ้นของ</th>
                <th className="text-left font-bold px-3 py-2">รถออก</th>
                <th className="text-left font-bold px-3 py-2">ส่ง / ตีกลับ</th>
                <th className="text-right font-bold px-3 py-2 whitespace-nowrap">รถออก → ส่ง/ตีกลับ</th>
                <th className="text-left font-bold px-3 py-2">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s, i) => (
                <Fragment key={`${s.status}-${s.mem_code}-${i}`}>
                <tr className={`align-top [&>td]:border-t [&>td]:border-blue-50 ${s.status === "done" ? "" : "bg-rose-50/30"}`}>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-[length:calc(11px*var(--fs,1))] font-bold px-2 py-0.5 rounded-full ring-1 w-20 text-center ${STATUS_STYLE[s.status]}`}>
                      {statusLabel(s.status, isToday)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-slate-800 break-words">{s.mem_name}</div>
                    <div className="text-xs text-slate-400"><span className="font-mono">{s.mem_code}</span></div>
                    {s.route_code && <div className="text-xs text-slate-500">เส้นทาง <b className="text-slate-700">{s.route_code}</b>{s.route_name ? ` ${s.route_name}` : ""}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{s.sh_runnings.length ? s.sh_runnings.map((no) => <div key={no}><SoButton so={no} active={openSo === `${i}|${no}`} onToggle={() => toggle(i, no)} />{invoice(no) && <div className="text-[length:calc(11px*var(--fs,1))] font-sans text-slate-500">ใบกำกับ <span className="font-mono text-slate-700">{invoice(no)}</span></div>}</div>) : <span className="text-slate-300">-</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{s.bill_notes.length ? s.bill_notes.map((no) => <div key={no}>{no}</div>) : <span className="text-slate-300">-</span>}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{s.box_amount} · {s.bill_count}</td>
                  <td className="px-3 py-2.5"><DateTime iso={s.loaded_at} empty="-" /></td>
                  <td className="px-3 py-2.5"><DateTime iso={departedAt(s, d.departures)} empty="-" /></td>
                  <td className="px-3 py-2.5"><DateTime iso={s.time} empty="ยังไม่ส่ง" /></td>
                  <td className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${departToDoneMin(s, d.departures) == null ? "text-slate-300" : s.status === "back" ? "font-bold text-rose-600" : "font-bold text-slate-800"}`}>{fmtMin(departToDoneMin(s, d.departures))}</td>
                  <td className={`px-3 py-2.5 text-xs break-words max-w-[220px] ${s.status === "back" ? "text-rose-600 font-medium" : "text-slate-500"}`}>{s.note ?? ""}</td>
                </tr>
                {openAt(i) && <TimelineRow so={openAt(i)!} colSpan={10} onClose={() => setOpenSo(null)} />}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DailyStoresTab({ date, empQuery, routeFilter = "" }: { date: string; empQuery: string; routeFilter?: string }) {
  const [data, setData] = useState<DriverStores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isToday = date === dayjs().format("YYYY-MM-DD");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<{ drivers: DriverStores[] }>(`${API}/api/logistic/driver-performance/daily-stores`, {
        params: { date },
        headers: authHeader(),
      });
      setData(res.data.drivers ?? []);
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // ช่องค้นหา: รหัส/ชื่อพนักงาน หรือรหัส/ชื่อเส้นทาง · dropdown: คนที่วิ่งเส้นทางนั้น
  const filtered = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    return data
      .filter((d) => !q || d.emp_code.toLowerCase().includes(q) || d.emp_name.toLowerCase().includes(q)
        || d.routes.some((r) => r.route_code.toLowerCase().includes(q) || (r.route_name ?? "").toLowerCase().includes(q)))
      .filter((d) => !routeFilter || d.routes.some((r) => r.route_code === routeFilter))
      // คนที่มีปัญหาขึ้นก่อน
      .sort((a, b) => b.back_count + b.pending_count - (a.back_count + a.pending_count));
  }, [data, empQuery, routeFilter]);

  // ร้านที่แสดง — เลือกเส้นทางแล้วนับเฉพาะร้านในเส้นทางนั้น
  const visibleStores = useCallback(
    (d: DriverStores) => (routeFilter ? d.stores.filter((s) => s.route_code === routeFilter) : d.stores),
    [routeFilter],
  );

  const totals = useMemo(() => {
    const all = filtered.flatMap(visibleStores);
    const count = (st: Status) => all.filter((s) => s.status === st).length;
    return { loaded: all.length, done: count("done"), back: count("back"), pending: count("pending") };
  }, [filtered, visibleStores]);

  const [exporting, setExporting] = useState(false);
  // เลขที่ใบกำกับของทุกบิลในไฟล์ ดึงตอนกด Export ครั้งเดียว (ดึงไม่ได้ก็ยัง export ได้ แค่คอลัมน์นี้ว่าง)
  const exportExcel = async () => {
    setExporting(true);
    await fetchBillNumbers(filtered.flatMap((d) => visibleStores(d).flatMap((s) => s.sh_runnings))).catch(() => {});
    setExporting(false);
    exportXlsx(`ร้านขึ้นของ-ส่ง-ไม่ได้ส่ง_${date}${routeFilter ? `_${routeFilter}` : ""}.xlsx`, [{
      name: date,
      rows: filtered.flatMap((d) => visibleStores(d).map((s) => ({
        "วันที่": date,
        "รหัสพนักงาน": d.emp_code,
        "พนักงาน": d.emp_name,
        "เบอร์โทร": d.emp_tel ?? "",
        "เวลาเริ่ม": d.start_time ? fmtTime(d.start_time) : "",
        "ออกรถ": d.departures.map((t) => fmtTime(t)).join(", "),
        "เวลาขึ้นของ (นาที)": minutesBetween(d.start_time, d.departures[0]) ?? "",
        "ร้านแรก": d.first_store ? `${fmtTime(d.first_store.time)} ${d.first_store.mem_name}` : "",
        "ร้านสุดท้าย": d.last_store ? `${fmtTime(d.last_store.time)} ${d.last_store.mem_name}` : "",
        "เวลาส่งจริง (นาที)": minutesBetween(d.first_store?.time, d.last_store?.time) ?? "",
        "เวลาเข้างาน": d.clock_in_at ? fmtTime(d.clock_in_at) : "",
        "เวลาจบ": d.end_time ? fmtTime(d.end_time) : "",
        "เวลาทำงานทั้งกะ (นาที)": minutesBetween(d.clock_in_at, d.end_time) ?? "",
        "สถานะ": statusLabel(s.status, isToday),
        "รหัสร้าน": s.mem_code,
        "ร้าน": s.mem_name,
        "เส้นทาง": [s.route_code, s.route_name].filter(Boolean).join(" "),
        "เลข SO": s.sh_runnings.join(", "),
        "เลขที่ใบกำกับภาษี": s.sh_runnings.map((so) => billNumberOf(so)).filter(Boolean).join(", "),
        "เลขที่บิล": s.bill_notes.join(", "),
        "วันที่ขึ้นของ": s.loaded_at ? fmtDate(s.loaded_at) : "",
        "เวลาขึ้นของ": s.loaded_at ? fmtTime(s.loaded_at) : "",
        "วันที่รถออก": departedAt(s, d.departures) ? fmtDate(departedAt(s, d.departures)) : "",
        "เวลารถออก": departedAt(s, d.departures) ? fmtTime(departedAt(s, d.departures)) : "",
        "วันที่ส่ง/ตีกลับ": s.time ? fmtDate(s.time) : "",
        "เวลาส่ง/ตีกลับ": s.time ? fmtTime(s.time) : "",
        "รถออก→ส่ง/ตีกลับ (นาที)": departToDoneMin(s, d.departures) ?? "",
        "ลัง": s.box_amount,
        "บิล": s.bill_count,
        "หมายเหตุ": s.note ?? "",
      }))),
    }]);
  };

  if (loading) return <div className="flex justify-center py-24"><div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return (
    <div className="text-center py-24">
      <div className="text-slate-500 mb-4">{error}</div>
      <button onClick={load} className="bg-blue-600 text-white font-semibold rounded-xl px-5 py-2.5">ลองใหม่</button>
    </div>
  );

  return (
    <div className="space-y-8">
      <WaitingLoadSection date={date} query={empQuery} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm text-slate-600">
          ขึ้นของ <b className="tabular-nums">{totals.loaded}</b> ร้าน · ส่งแล้ว <b className="text-emerald-700 tabular-nums">{totals.done}</b> ·
          ตีกลับ <b className="text-rose-600 tabular-nums">{totals.back}</b> · {isToday ? "กำลังส่ง" : "ค้างไม่ส่ง"} <b className="text-amber-700 tabular-nums">{totals.pending}</b>
        </div>
        <button onClick={exportExcel} disabled={!filtered.length || exporting}
          className="ml-auto inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2 transition">
          {ExcelIcon} Export Excel
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-blue-100 p-12 text-center text-slate-400">ไม่มีข้อมูลในวันที่เลือก</div>
      ) : (
        filtered.map((d) => <DriverStoresCard key={d.emp_code} d={d} isToday={isToday} date={date} routeFilter={routeFilter} />)
      )}
    </div>
  );
}
