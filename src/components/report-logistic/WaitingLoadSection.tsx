import { Fragment, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { API, authHeader, fmtDate, fmtTime } from "./shared";
import { SoButton, TimelineRow } from "./OrderTimeline";

// OPHMBC-331 — งานรอขึ้นของ: พร้อมส่งแล้ว (พิมพ์สติกเกอร์) แต่ยังไม่มีใครสแกนขึ้นรถ จัดกลุ่มตามเส้นทาง

interface WaitingStore {
  mem_code: string;
  mem_name: string;
  box_amount: number;
  shipping_count: number;
  sh_runnings: string[];
  ready_at: string | null;
  carried_over: boolean;
}

interface WaitingRoute {
  route_code: string | null;
  route_name: string | null;
  store_count: number;
  box_count: number;
  carried_over_count: number;
  oldest_ready_at: string | null;
  stores: WaitingStore[];
}

interface WaitingLoad {
  date: string;
  lookback_days: number;
  store_count: number;
  box_count: number;
  carried_over_count: number;
  older: { stores: number; shippings: number };
  routes: WaitingRoute[];
}

const waited = (iso: string | null) => {
  if (!iso) return "-";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} น.`;
  if (m < 1440) return `${Math.floor(m / 60)} ชม. ${m % 60} น.`;
  return `${Math.floor(m / 1440)} วัน ${Math.floor((m % 1440) / 60)} ชม.`;
};

// รอนานแค่ไหนถึงเตือน — ค้างข้ามวันหรือรอเกิน 1 วัน = แดง
const urgent = (r: WaitingRoute) =>
  r.carried_over_count > 0 || (!!r.oldest_ready_at && Date.now() - new Date(r.oldest_ready_at).getTime() > 24 * 3600 * 1000);

/** กล่องรายเส้นทาง — กดเพื่อกาง/พับรายละเอียดใต้แถว */
function RouteCard({ r, active, onToggle }: { r: WaitingRoute; active: boolean; onToggle: () => void }) {
  const hot = urgent(r);
  return (
    <button type="button" onClick={onToggle} aria-expanded={active}
      className={`text-left rounded-2xl px-4 py-3 ring-1 transition min-w-0 ${active ? "ring-2 ring-blue-500 bg-blue-50" : hot ? "ring-rose-200 bg-rose-50/60 hover:bg-rose-50" : "ring-amber-200 bg-white hover:bg-amber-50"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-extrabold text-slate-900 truncate">{r.route_code ?? "ไม่ระบุเส้นทาง"}</span>
        <span className="text-xs font-semibold text-slate-500" aria-hidden="true">{active ? "▴" : "▾"}</span>
      </div>
      <div className="text-xs text-slate-500 truncate" title={r.route_name ?? ""}>{r.route_name ?? "-"}</div>
      <div className="mt-2 flex items-baseline gap-3 tabular-nums">
        <span><b className="text-xl text-slate-900">{r.store_count}</b> <span className="text-xs text-slate-600">ร้าน</span></span>
        <span><b className="text-xl text-slate-900">{r.box_count}</b> <span className="text-xs text-slate-600">ลัง</span></span>
      </div>
      <div className={`mt-1 text-xs font-semibold ${hot ? "text-rose-700" : "text-slate-500"}`}>
        รอนานสุด {waited(r.oldest_ready_at)}
      </div>
      {r.carried_over_count > 0 && (
        <span className="mt-1.5 inline-block text-[11px] font-bold text-rose-700 bg-rose-100 rounded-full px-2 py-0.5">ค้างข้ามวัน {r.carried_over_count} ร้าน</span>
      )}
    </button>
  );
}

/** แผงรายละเอียดของเส้นทาง — กว้างเต็มแถว อยู่ใต้แถวของกล่องที่กด */
function RouteDetail({ r, onClose }: { r: WaitingRoute; onClose: () => void }) {
  // OPHMBC-331 — เลข SO ที่กาง timeline อยู่ ("แถว|SO") กดซ้ำเพื่อพับ
  const [openSo, setOpenSo] = useState<string | null>(null);
  const toggle = (row: number | string, so: string) => setOpenSo((cur) => (cur === `${row}|${so}` ? null : `${row}|${so}`));
  const openAt = (row: number | string) => (openSo?.startsWith(`${row}|`) ? openSo.slice(String(row).length + 1) : null);
  return (
    <section className="col-span-full rounded-2xl ring-2 ring-blue-500 bg-white overflow-hidden" aria-label={`รายละเอียดรอขึ้นของ ${r.route_code ?? "ไม่ระบุเส้นทาง"}`}>
      <div className="px-4 py-2.5 bg-blue-50 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-extrabold text-slate-900">{r.route_code ?? "ไม่ระบุเส้นทาง"} <span className="font-semibold text-slate-500">{r.route_name ?? ""}</span></span>
        <span className="text-sm text-slate-700 tabular-nums"><b>{r.store_count}</b> ร้าน · <b>{r.box_count}</b> ลัง</span>
        <button type="button" onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-800 text-sm font-semibold bg-white hover:bg-slate-100 rounded-lg px-3 py-1">ปิด</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-amber-50 text-amber-900 text-xs">
              <th className="text-left font-bold px-4 py-2">ร้าน</th>
              <th className="text-left font-bold px-3 py-2">เลข SO</th>
              <th className="text-center font-bold px-3 py-2">ลัง</th>
              <th className="text-left font-bold px-3 py-2">พร้อมส่งเมื่อ</th>
              <th className="text-left font-bold px-3 py-2">รอมาแล้ว</th>
            </tr>
          </thead>
          <tbody>
            {r.stores.map((s, i) => (
              <Fragment key={`${s.mem_code}-${s.ready_at}`}>
              <tr className={`border-t border-amber-50 align-top ${s.carried_over ? "bg-rose-50/40" : ""}`}>
                <td className="px-4 py-2">
                  <div className="font-bold text-slate-800">{s.mem_name}</div>
                  <div className="text-xs text-slate-400 font-mono">{s.mem_code}{s.shipping_count > 1 ? ` · ${s.shipping_count} ใบ` : ""}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {s.sh_runnings.length ? s.sh_runnings.map((so) => (
                    <SoButton key={so} so={so} active={openSo === `${i}|${so}`} onToggle={() => toggle(i, so)} />
                  )) : "-"}
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-semibold">{s.box_amount}</td>
                <td className="px-3 py-2 tabular-nums">
                  <div className="font-bold text-slate-700">{fmtTime(s.ready_at)}</div>
                  <div className="text-[11px] text-slate-400">{fmtDate(s.ready_at)}</div>
                </td>
                <td className={`px-3 py-2 tabular-nums font-semibold ${s.carried_over ? "text-rose-700" : "text-slate-700"}`}>{waited(s.ready_at)}</td>
              </tr>
              {openAt(i) && <TimelineRow so={openAt(i)!} colSpan={5} onClose={() => setOpenSo(null)} />}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function WaitingLoadSection({ date, query }: { date: string; query: string }) {
  const [data, setData] = useState<WaitingLoad | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(null); // route_code ที่กางรายละเอียด ("" = ไม่ระบุเส้นทาง)

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    axios.get<WaitingLoad>(`${API}/api/logistic/driver-performance/waiting-load`, { params: { date }, headers: authHeader() })
      .then((res) => { if (alive) setData(res.data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [date]);

  // ช่องค้นหาเดียวกับหน้า: กรองตามรหัส/ชื่อเส้นทาง หรือชื่อ/รหัสร้าน
  const routes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || !q) return data?.routes ?? [];
    return data.routes
      .map((r) => {
        if ((r.route_code ?? "").toLowerCase().includes(q) || (r.route_name ?? "").toLowerCase().includes(q)) return r;
        const stores = r.stores.filter((s) => s.mem_name.toLowerCase().includes(q) || s.mem_code.toLowerCase().includes(q));
        return stores.length ? { ...r, stores, store_count: stores.length, box_count: stores.reduce((n, s) => n + s.box_amount, 0), carried_over_count: stores.filter((s) => s.carried_over).length } : null;
      })
      .filter((r): r is WaitingRoute => !!r);
  }, [data, query]);

  const isToday = date === dayjs().format("YYYY-MM-DD");
  const stores = routes.reduce((n, r) => n + r.store_count, 0);
  const boxes = routes.reduce((n, r) => n + r.box_count, 0);
  const carried = routes.reduce((n, r) => n + r.carried_over_count, 0);

  return (
    <div className="rounded-3xl bg-white ring-1 ring-amber-200 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left bg-amber-50 px-5 md:px-8 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-base font-extrabold text-amber-900">รอขึ้นของ</span>
        {data ? (
          <>
            <span className="text-sm text-slate-700 tabular-nums"><b className="text-lg">{stores}</b> ร้าน · <b className="text-lg">{boxes}</b> ลัง · {routes.length} เส้นทาง</span>
            {carried > 0 && <span className="text-xs font-bold text-rose-700 bg-rose-100 rounded-full px-2.5 py-0.5">ค้างข้ามวัน {carried} ร้าน</span>}
            {data.older.shippings > 0 && (
              <span className="text-xs font-semibold text-slate-600 bg-white rounded-full px-2.5 py-0.5 ring-1 ring-slate-200" title="สถานะยังเป็นพร้อมส่ง แต่เก่ากว่าช่วงที่แสดง — เคลียร์ได้ที่หน้ารายการค้างรอขึ้นของของระบบขนส่ง">
                ค้างเกิน {data.lookback_days} วัน {data.older.shippings} ใบ
              </span>
            )}
          </>
        ) : error ? (
          <span className="text-sm text-slate-500">โหลดไม่สำเร็จ</span>
        ) : (
          <span className="text-sm text-slate-400">กำลังโหลด...</span>
        )}
        <span className="ml-auto text-xs font-semibold text-amber-800">{open ? "ย่อ" : "ขยาย"}</span>
      </button>
      {open && data && (
        routes.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">ไม่มีงานรอขึ้นของ{query ? " ตามที่ค้นหา" : ""}</div>
        ) : (
          <>
            {/* grid-flow-dense: แผงรายละเอียด (กว้างเต็มแถว) ต่อจากกล่องที่เลือก กล่องถัดไปเติมช่องว่างในแถวเดิม แผงจึงอยู่ใต้แถวของกล่องที่กดพอดี */}
            <div className="grid grid-flow-dense grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 px-4 md:px-6 py-4">
              {routes.map((r) => {
                const key = r.route_code ?? "";
                const active = selected === key;
                return (
                  <Fragment key={key || "-"}>
                    <RouteCard r={r} active={active} onToggle={() => setSelected(active ? null : key)} />
                    {active && <RouteDetail r={r} onClose={() => setSelected(null)} />}
                  </Fragment>
                );
              })}
            </div>
            <div className="px-5 py-2 text-[11px] text-slate-400 border-t border-amber-100">
              สถานะ ณ ตอนนี้: งานที่พร้อมส่ง (พิมพ์สติกเกอร์แล้ว) แต่ยังไม่สแกนขึ้นรถ ตั้งแต่ {data.lookback_days} วันก่อนถึง{isToday ? "วันนี้" : "วันที่เลือก"} · งานที่เคยรอแล้วขึ้นรถไปแล้วไม่อยู่ในรายการ
            </div>
          </>
        )
      )}
    </div>
  );
}
