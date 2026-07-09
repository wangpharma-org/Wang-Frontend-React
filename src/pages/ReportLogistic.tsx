/// <reference types="vite/client" />
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Delivery {
  mem_code: string;
  mem_name: string;
  shipping_finish_time: string | null;
  store_image_url: string | null;
  product_image_url: string | null;
  sign_image_url: string | null;
  employee_sign_url: string | null;
  slip_image_url: string | null;
  report_image_url: string | null;
  note: string | null;
  lat: string | null;
  lng: string | null;
  receiver_type: string | null;
  box_amount: number;
  bill_count: number;
  shipping_count: number;
}

interface Back {
  mem_code: string;
  mem_name: string;
  shipping_finish_time: string | null;
  reason: string | null;
  photo_url: string | null;
  report_image_url: string | null;
  box_amount: number;
  bill_count: number;
  shipping_count: number;
}

interface DriverReport {
  emp_code: string;
  emp_name: string;
  car_number: string | null;
  shipping_out_time: string | null;
  first_load_time: string | null;
  in_progress: { store_count: number; bill_count: number; box_count: number };
  done: { store_count: number; bill_count: number; box_count: number };
  back: { store_count: number; bill_count: number; box_count: number };
  routes: { route_code: string; route_name: string; store_count: number; box_count: number }[];
  deliveries: Delivery[];
  backs: Back[];
  shift_end: { shift_end_time: string } | null;
  distance: { total_km: number; total_minutes: number | null } | null;
}

// unified timeline row
interface Row {
  status: "done" | "back";
  time: string | null;
  mem_code: string;
  mem_name: string;
  receiver_type: string | null;
  lat: string | null;
  lng: string | null;
  box_amount: number;
  shipping_count: number;
  bill_count: number;
  note: string | null;
  photos: { url: string; label: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

const fmtDur = (min: number | null) => {
  if (min == null || min <= 0) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}ชม ${m}น` : `${m}น`;
};

const mapsUrl = (lat: string, lng: string) => `https://maps.google.com/maps?q=${lat},${lng}`;

// ─── Photo + lightbox ─────────────────────────────────────────────────────────

function Photo({ url, label, size = 44 }: { url: string; label: string; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={label}
        className="relative flex-shrink-0 rounded-lg overflow-hidden ring-1 ring-slate-200 hover:ring-slate-400 transition"
        style={{ width: size, height: size }}
      >
        <img src={url} alt={label} className="w-full h-full object-cover" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col" onClick={() => setOpen(false)}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-white text-sm font-medium">{label}</span>
            <button className="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt={label} className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, tone, icon }: { label: string; value: string; sub?: string; tone: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-2.5 min-w-[92px]">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
        <span className={tone}>{icon}</span>
        {label}
      </div>
      <div className="text-lg font-bold text-white leading-tight tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-white/50">{sub}</div>}
    </div>
  );
}

const MapPin = (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

// ─── Driver card ──────────────────────────────────────────────────────────────

function DriverCard({ r }: { r: DriverReport }) {
  const [open, setOpen] = useState(true);
  const totalStores = r.in_progress.store_count + r.done.store_count + r.back.store_count;
  const totalBoxes = r.in_progress.box_count + r.done.box_count + r.back.box_count;

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [
      ...r.deliveries.map((d): Row => {
        const photos: { url: string; label: string }[] = [];
        if (d.store_image_url) photos.push({ url: d.store_image_url, label: "หน้าร้าน" });
        if (d.product_image_url) photos.push({ url: d.product_image_url, label: "สินค้า" });
        if (d.slip_image_url) photos.push({ url: d.slip_image_url, label: "สลิป" });
        if (d.report_image_url) photos.push({ url: d.report_image_url, label: "Report" });
        return {
          status: "done", time: d.shipping_finish_time, mem_code: d.mem_code, mem_name: d.mem_name,
          receiver_type: d.receiver_type, lat: d.lat, lng: d.lng, box_amount: d.box_amount,
          shipping_count: d.shipping_count, bill_count: d.bill_count, note: d.note,
          photos,
          // เก็บลายเซ็นไว้แสดงในคอลัมน์ผู้เซ็น
          ...(d.sign_image_url || d.employee_sign_url
            ? { signs: [
                ...(d.sign_image_url ? [{ url: d.sign_image_url, label: "ลายเซ็นลูกค้า" }] : []),
                ...(d.employee_sign_url ? [{ url: d.employee_sign_url, label: "ลายเซ็นพนักงาน" }] : []),
              ] }
            : {}),
        } as Row & { signs?: { url: string; label: string }[] };
      }),
      ...r.backs.map((b): Row => {
        const photos: { url: string; label: string }[] = [];
        if (b.photo_url) photos.push({ url: b.photo_url, label: "รูปหน้าจุด" });
        if (b.report_image_url) photos.push({ url: b.report_image_url, label: "Report" });
        return {
          status: "back", time: b.shipping_finish_time, mem_code: b.mem_code, mem_name: b.mem_name,
          receiver_type: null, lat: null, lng: null, box_amount: b.box_amount,
          shipping_count: b.shipping_count, bill_count: b.bill_count, note: b.reason, photos,
        };
      }),
    ];
    return list.sort((a, b) => new Date(a.time ?? 0).getTime() - new Date(b.time ?? 0).getTime());
  }, [r]);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-800 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3v11m10 0h2m4 0h1V9a1 1 0 00-.293-.707l-2-2A1 1 0 0016 6h-3v10" /></svg>
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-base leading-tight truncate">{r.emp_name}</div>
                <div className="text-white/50 text-xs">
                  <span className="font-mono">{r.emp_code}</span>{r.car_number ? ` · ${r.car_number}` : ""}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {r.routes.map((rt) => (
                <span key={rt.route_code} className="inline-flex items-center gap-1 bg-white/10 text-white/80 text-[10px] font-medium px-2 py-0.5 rounded-md">
                  <span className="font-semibold text-white">{rt.route_code}</span>{rt.route_name}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setOpen((v) => !v)}
            className="flex-shrink-0 text-white/70 hover:text-white text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition">
            {open ? "ย่อ" : "ขยาย"}
          </button>
        </div>

        {/* KPI strip */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
          <Stat label="ระยะทาง" value={r.distance ? `${r.distance.total_km}` : "-"} sub={`กม · ${fmtDur(r.distance?.total_minutes ?? null)}`} tone="text-violet-300" icon={MapPin} />
          <Stat label="ทั้งหมด" value={`${totalStores}`} sub={`ร้าน · ${totalBoxes} ลัง`} tone="text-slate-300" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
          <Stat label="ส่งแล้ว" value={`${r.done.store_count}`} sub={`ร้าน · ${r.done.box_count} ลัง`} tone="text-emerald-300" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
          <Stat label="ตีกลับ" value={`${r.back.store_count}`} sub={`ร้าน · ${r.back.box_count} ลัง`} tone="text-rose-300" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h11M9 21V3m0 0l6 6m-6-6L3 9" /></svg>} />
          <Stat label="ขึ้นของ" value={fmtTime(r.first_load_time)} tone="text-cyan-300" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>} />
          <Stat label="ออกรถ" value={fmtTime(r.shipping_out_time)} tone="text-orange-300" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>} />
          <Stat label="จบงาน" value={r.shift_end ? fmtTime(r.shift_end.shift_end_time) : "-"} tone="text-indigo-300" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        </div>
      </div>

      {/* Table */}
      {open && (
        rows.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">ยังไม่มีรายการส่งในวันนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5 w-16">เวลา</th>
                  <th className="text-left font-semibold px-3 py-2.5">ร้าน</th>
                  <th className="text-left font-semibold px-3 py-2.5 w-24">สถานะ</th>
                  <th className="text-left font-semibold px-3 py-2.5">ผู้เซ็น</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-28">ลัง·ชุด·บิล</th>
                  <th className="text-center font-semibold px-3 py-2.5 w-20">แผนที่</th>
                  <th className="text-left font-semibold px-3 py-2.5">หลักฐาน</th>
                  <th className="text-left font-semibold px-3 py-2.5">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const done = row.status === "done";
                  const signs = (row as Row & { signs?: { url: string; label: string }[] }).signs ?? [];
                  return (
                    <tr key={`${row.mem_code}-${i}`} className="border-t border-slate-100 hover:bg-slate-50/60 transition align-top">
                      {/* เวลา + timeline dot */}
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${done ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className={`font-bold tabular-nums ${done ? "text-emerald-600" : "text-rose-500"}`}>{fmtTime(row.time)}</span>
                        </div>
                      </td>
                      {/* ร้าน */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800 leading-snug">{row.mem_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{row.mem_code}</div>
                      </td>
                      {/* สถานะ */}
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${done ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-600 ring-1 ring-rose-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {done ? "ส่งสำเร็จ" : "ตีกลับ"}
                        </span>
                      </td>
                      {/* ผู้เซ็น */}
                      <td className="px-3 py-3">
                        {row.receiver_type ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">{row.receiver_type}</span>
                            {signs.map((s) => <Photo key={s.label} url={s.url} label={s.label} size={36} />)}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* ลัง·ชุด·บิล */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5 tabular-nums">
                          <span className="font-bold text-slate-700">{row.box_amount}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500">{row.shipping_count}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500">{row.bill_count}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 text-center mt-0.5">ลัง · ชุด · บิล</div>
                      </td>
                      {/* แผนที่ */}
                      <td className="px-3 py-3 text-center">
                        {row.lat && row.lng ? (
                          <a href={mapsUrl(row.lat, row.lng)} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg ring-1 ring-blue-200 transition">
                            {MapPin} เปิด
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* หลักฐาน */}
                      <td className="px-3 py-3">
                        {row.photos.length > 0 ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {row.photos.map((p) => <Photo key={p.label} url={p.url} label={p.label} />)}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* หมายเหตุ */}
                      <td className="px-3 py-3 max-w-[220px]">
                        {row.note ? (
                          <span className={`text-[12px] ${done ? "text-slate-600" : "text-rose-600"}`}>{row.note}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportLogistic() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [data, setData] = useState<DriverReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<DriverReport[]>(`${API}/api/logistic/delivery-report/daily`, {
        params: { date },
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const totalDrivers = data.length;
  const totalDone = data.reduce((s, d) => s + d.done.store_count, 0);
  const totalBack = data.reduce((s, d) => s + d.back.store_count, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3v11m10 0h2m4 0h1V9a1 1 0 00-.293-.707l-2-2A1 1 0 0016 6h-3v10" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 leading-tight">Report ขนส่ง</div>
              <div className="text-xs text-slate-400">รายงานการจัดส่งรายพนักงาน</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              value={date}
              max={dayjs().format("YYYY-MM-DD")}
              onChange={(e) => setDate(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button onClick={load}
              className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl px-4 py-2 transition">
              รีเฟรช
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-9 h-9 border-[3px] border-slate-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <div className="text-slate-500 text-sm mb-4">{error}</div>
            <button onClick={load} className="bg-slate-800 text-white text-sm font-medium rounded-xl px-5 py-2.5">ลองใหม่</button>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <div className="text-slate-400 text-sm">ไม่มีข้อมูลการจัดส่งในวันที่เลือก</div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-white ring-1 ring-slate-200 rounded-full px-3 py-1 text-slate-600 font-medium">พนักงาน {totalDrivers} คน</span>
              <span className="bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-3 py-1 text-emerald-700 font-medium">ส่งแล้ว {totalDone} ร้าน</span>
              {totalBack > 0 && <span className="bg-rose-50 ring-1 ring-rose-200 rounded-full px-3 py-1 text-rose-600 font-medium">ตีกลับ {totalBack} ร้าน</span>}
            </div>
            {data.map((r) => <DriverCard key={r.emp_code} r={r} />)}
          </>
        )}
      </div>
    </div>
  );
}
