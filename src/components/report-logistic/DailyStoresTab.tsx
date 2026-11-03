import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { API, authHeader, ExcelIcon, exportXlsx, fmtDateTime, fmtTime } from "./shared";

// MA-363 — ร้านที่พนักงานแต่ละคนขึ้นของ / ส่งแล้ว / ไม่ได้ส่ง ของวันที่เลือก

type Status = "done" | "back" | "pending";

interface StoreVisit {
  status: Status;
  mem_code: string;
  mem_name: string;
  route_code: string | null;
  box_amount: number;
  bill_count: number;
  shipping_count: number;
  loaded_at: string | null;
  time: string | null;
  note: string | null;
}

interface DriverStores {
  emp_code: string;
  emp_name: string;
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

function DriverStoresCard({ d, isToday }: { d: DriverStores; isToday: boolean }) {
  const [open, setOpen] = useState(d.back_count + d.pending_count > 0);
  return (
    <div className="rounded-2xl bg-white ring-1 ring-blue-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left bg-gradient-to-br from-blue-800 via-blue-600 to-sky-500 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-white font-extrabold text-base truncate">{d.emp_name}</div>
            <div className="text-blue-50/80 text-xs font-mono">{d.emp_code}</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <Count label="ตีกลับ" n={d.back_count} tone="bg-rose-500 text-white" />
            <Count label={isToday ? "กำลังส่ง" : "ค้าง"} n={d.pending_count} tone="bg-amber-400 text-amber-950" />
            <Count label="ส่งแล้ว" n={d.done_count} tone="bg-emerald-500 text-white" />
            <Count label="ขึ้นของ" n={d.loaded_count} tone="bg-white text-blue-700" />
          </div>
          <span className="text-white/80 text-sm font-semibold w-10 text-right">{open ? "ย่อ" : "ขยาย"}</span>
        </div>
      </button>
      {open && (
        <div className="divide-y divide-blue-50">
          {d.stores.map((s, i) => (
            <div key={`${s.status}-${s.mem_code}-${i}`} className={`px-5 py-3 flex flex-wrap items-start gap-x-4 gap-y-1 text-[13px] ${s.status === "done" ? "" : "bg-rose-50/30"}`}>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 w-20 text-center ${STATUS_STYLE[s.status]}`}>
                {statusLabel(s.status, isToday)}
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <div className="font-bold text-slate-800 break-words">{s.mem_name}</div>
                <div className="text-xs text-slate-400">
                  <span className="font-mono">{s.mem_code}</span>{s.route_code ? ` · ${s.route_code}` : ""} · {s.box_amount} ลัง · {s.bill_count} บิล
                </div>
              </div>
              <div className="text-xs text-slate-500 tabular-nums w-28">
                <div>ขึ้นของ {s.loaded_at ? fmtDateTime(s.loaded_at) : "-"}</div>
                <div>{s.status === "pending" ? "ยังไม่ส่ง" : `${s.status === "done" ? "ส่ง" : "ตีกลับ"} ${fmtTime(s.time)}`}</div>
              </div>
              <div className={`text-xs basis-40 flex-1 break-words ${s.status === "back" ? "text-rose-600 font-medium" : "text-slate-500"}`}>{s.note ?? ""}</div>
            </div>
          ))}
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

  const exportExcel = () =>
    exportXlsx(`ร้านขึ้นของ-ส่ง-ไม่ได้ส่ง_${date}.xlsx`, [{
      name: date,
      rows: filtered.flatMap((d) => d.stores.map((s) => ({
        "รหัสพนักงาน": d.emp_code,
        "พนักงาน": d.emp_name,
        "สถานะ": statusLabel(s.status, isToday),
        "รหัสร้าน": s.mem_code,
        "ร้าน": s.mem_name,
        "เส้นทาง": s.route_code ?? "",
        "เวลาขึ้นของ": fmtDateTime(s.loaded_at),
        "เวลาส่ง/ตีกลับ": s.time ? fmtDateTime(s.time) : "",
        "ลัง": s.box_amount,
        "บิล": s.bill_count,
        "หมายเหตุ": s.note ?? "",
      }))),
    }]);

  if (loading) return <div className="flex justify-center py-24"><div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return (
    <div className="text-center py-24">
      <div className="text-slate-500 mb-4">{error}</div>
      <button onClick={load} className="bg-blue-600 text-white font-semibold rounded-xl px-5 py-2.5">ลองใหม่</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm text-slate-600">
          ขึ้นของ <b className="tabular-nums">{totals.loaded}</b> ร้าน · ส่งแล้ว <b className="text-emerald-700 tabular-nums">{totals.done}</b> ·
          ตีกลับ <b className="text-rose-600 tabular-nums">{totals.back}</b> · {isToday ? "กำลังส่ง" : "ค้างไม่ส่ง"} <b className="text-amber-700 tabular-nums">{totals.pending}</b>
        </div>
        <button onClick={exportExcel} disabled={!filtered.length}
          className="ml-auto inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2 transition">
          {ExcelIcon} Export Excel
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-blue-100 p-12 text-center text-slate-400">ไม่มีข้อมูลในวันที่เลือก</div>
      ) : (
        filtered.map((d) => <DriverStoresCard key={d.emp_code} d={d} isToday={isToday} />)
      )}
    </div>
  );
}
