import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { API, authHeader, ExcelIcon, exportXlsx, fmtDate, fmtTime } from "./shared";
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
      <div className="text-[11px] font-semibold mt-0.5">{label}</div>
    </div>
  );
}

// ช่องเวลาในแถบฟ้า
function TimeBox({ label, time, sub }: { label: string; time: string | null; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/15 px-3 py-2 min-w-0">
      <div className="text-[11px] font-semibold text-blue-50/85">{label}</div>
      <div className="text-white font-extrabold text-base leading-tight tabular-nums">{fmtTime(time)}</div>
      {sub && <div className="text-[11px] text-blue-50/85 truncate" title={sub}>{sub}</div>}
    </div>
  );
}

// เวลาบรรทัดบน วันที่บรรทัดล่าง
function DateTime({ iso, empty }: { iso: string | null; empty: string }) {
  if (!iso) return <span className="text-slate-400">{empty}</span>;
  return (
    <>
      <div className="font-bold text-slate-700 tabular-nums">{fmtTime(iso)}</div>
      <div className="text-[11px] text-slate-400">{fmtDate(iso)}</div>
    </>
  );
}

function DriverStoresCard({ d, isToday, date }: { d: DriverStores; isToday: boolean; date: string }) {
  // OPHMBC-331 — เลข SO ที่กาง timeline อยู่ ("แถว|SO") กดซ้ำเพื่อพับ
  const [openSo, setOpenSo] = useState<string | null>(null);
  const toggle = (row: number | string, so: string) => setOpenSo((cur) => (cur === `${row}|${so}` ? null : `${row}|${so}`));
  const openAt = (row: number | string) => (openSo?.startsWith(`${row}|`) ? openSo.slice(String(row).length + 1) : null);
  const [open, setOpen] = useState(d.back_count + d.pending_count > 0);
  // เลขที่ใบกำกับดึงเฉพาะตอนการ์ดเปิดอยู่
  const invoice = useBillNumbers(open ? d.stores.flatMap((s) => s.sh_runnings) : []);
  const deps = d.departures.map((t) => fmtTime(t));
  return (
    <div className="rounded-3xl bg-white ring-1 ring-blue-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-blue-800 via-blue-600 to-sky-500 px-5 md:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <TimeBox label="เวลาเริ่ม (ขึ้นของแรก)" time={d.start_time} />
          <TimeBox label="ออกรถ" time={d.departures[0] ?? null} sub={deps.length > 1 ? `ออก ${deps.length} รอบ: ${deps.join(", ")}` : undefined} />
          <TimeBox label="ร้านแรกที่เริ่มส่ง" time={d.first_store?.time ?? null} sub={d.first_store?.mem_name} />
          <TimeBox label="ร้านสุดท้าย" time={d.last_store?.time ?? null} sub={d.last_store?.mem_name} />
          <TimeBox label="เวลาจบ (จบกะ)" time={d.end_time} />
        </div>
      </div>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[1000px]">
            <thead>
              <tr className="bg-blue-50 text-blue-700 text-xs">
                <th className="text-left font-bold px-4 py-2">สถานะ</th>
                <th className="text-left font-bold px-3 py-2">ร้าน</th>
                <th className="text-left font-bold px-3 py-2">เลข SO / ใบกำกับ</th>
                <th className="text-left font-bold px-3 py-2">เลขที่บิล</th>
                <th className="text-center font-bold px-3 py-2">ลัง · บิล</th>
                <th className="text-left font-bold px-3 py-2">ขึ้นของ</th>
                <th className="text-left font-bold px-3 py-2">ส่ง / ตีกลับ</th>
                <th className="text-left font-bold px-3 py-2">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {d.stores.map((s, i) => (
                <Fragment key={`${s.status}-${s.mem_code}-${i}`}>
                <tr className={`border-t border-blue-50 align-top ${s.status === "done" ? "" : "bg-rose-50/30"}`}>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 w-20 text-center ${STATUS_STYLE[s.status]}`}>
                      {statusLabel(s.status, isToday)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-slate-800 break-words">{s.mem_name}</div>
                    <div className="text-xs text-slate-400"><span className="font-mono">{s.mem_code}</span></div>
                    {s.route_code && <div className="text-xs text-slate-500">เส้นทาง <b className="text-slate-700">{s.route_code}</b>{s.route_name ? ` ${s.route_name}` : ""}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{s.sh_runnings.length ? s.sh_runnings.map((no) => <div key={no}><SoButton so={no} active={openSo === `${i}|${no}`} onToggle={() => toggle(i, no)} />{invoice(no) && <div className="text-[11px] font-sans text-slate-500">ใบกำกับ <span className="font-mono text-slate-700">{invoice(no)}</span></div>}</div>) : <span className="text-slate-300">-</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{s.bill_notes.length ? s.bill_notes.map((no) => <div key={no}>{no}</div>) : <span className="text-slate-300">-</span>}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">{s.box_amount} · {s.bill_count}</td>
                  <td className="px-3 py-2.5"><DateTime iso={s.loaded_at} empty="-" /></td>
                  <td className="px-3 py-2.5"><DateTime iso={s.time} empty="ยังไม่ส่ง" /></td>
                  <td className={`px-3 py-2.5 text-xs break-words max-w-[220px] ${s.status === "back" ? "text-rose-600 font-medium" : "text-slate-500"}`}>{s.note ?? ""}</td>
                </tr>
                {openAt(i) && <TimelineRow so={openAt(i)!} colSpan={8} onClose={() => setOpenSo(null)} />}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DailyStoresTab({ date, empQuery }: { date: string; empQuery: string }) {
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

  const filtered = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    return data
      .filter((d) => !q || d.emp_code.toLowerCase().includes(q) || d.emp_name.toLowerCase().includes(q))
      // คนที่มีปัญหาขึ้นก่อน
      .sort((a, b) => b.back_count + b.pending_count - (a.back_count + a.pending_count));
  }, [data, empQuery]);

  const totals = useMemo(() => ({
    loaded: filtered.reduce((s, d) => s + d.loaded_count, 0),
    done: filtered.reduce((s, d) => s + d.done_count, 0),
    back: filtered.reduce((s, d) => s + d.back_count, 0),
    pending: filtered.reduce((s, d) => s + d.pending_count, 0),
  }), [filtered]);

  const [exporting, setExporting] = useState(false);
  // เลขที่ใบกำกับของทุกบิลในไฟล์ ดึงตอนกด Export ครั้งเดียว (ดึงไม่ได้ก็ยัง export ได้ แค่คอลัมน์นี้ว่าง)
  const exportExcel = async () => {
    setExporting(true);
    await fetchBillNumbers(filtered.flatMap((d) => d.stores.flatMap((s) => s.sh_runnings))).catch(() => {});
    setExporting(false);
    exportXlsx(`ร้านขึ้นของ-ส่ง-ไม่ได้ส่ง_${date}.xlsx`, [{
      name: date,
      rows: filtered.flatMap((d) => d.stores.map((s) => ({
        "วันที่": date,
        "รหัสพนักงาน": d.emp_code,
        "พนักงาน": d.emp_name,
        "เบอร์โทร": d.emp_tel ?? "",
        "เวลาเริ่ม": d.start_time ? fmtTime(d.start_time) : "",
        "ออกรถ": d.departures.map((t) => fmtTime(t)).join(", "),
        "เวลาจบ": d.end_time ? fmtTime(d.end_time) : "",
        "สถานะ": statusLabel(s.status, isToday),
        "รหัสร้าน": s.mem_code,
        "ร้าน": s.mem_name,
        "เส้นทาง": [s.route_code, s.route_name].filter(Boolean).join(" "),
        "เลข SO": s.sh_runnings.join(", "),
        "เลขที่ใบกำกับภาษี": s.sh_runnings.map((so) => billNumberOf(so)).filter(Boolean).join(", "),
        "เลขที่บิล": s.bill_notes.join(", "),
        "วันที่ขึ้นของ": s.loaded_at ? fmtDate(s.loaded_at) : "",
        "เวลาขึ้นของ": s.loaded_at ? fmtTime(s.loaded_at) : "",
        "วันที่ส่ง/ตีกลับ": s.time ? fmtDate(s.time) : "",
        "เวลาส่ง/ตีกลับ": s.time ? fmtTime(s.time) : "",
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
        filtered.map((d) => <DriverStoresCard key={d.emp_code} d={d} isToday={isToday} date={date} />)
      )}
    </div>
  );
}
