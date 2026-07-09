/// <reference types="vite/client" />
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";

// ─── Types (ตรงกับ ReportService.getDeliveryReport) ───────────────────────────

interface Delivery {
  mem_code: string;
  mem_name: string;
  shipping_finish_time: string | null;
  store_image_url: string | null;
  product_image_url: string | null;
  sign_image_url: string | null; // ลายเซ็นลูกค้า
  employee_sign_url: string | null; // ลายเซ็นพนักงาน
  slip_image_url: string | null;
  report_image_url: string | null;
  note: string | null;
  lat: string | null;
  lng: string | null;
  receiver_type: string | null;
  box_amount: number;
  bill_count: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function fmtDuration(min: number | null): string {
  if (min == null || min <= 0) return "-";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} ชม. ${m} น.` : `${m} น.`;
}

function mapsUrl(lat: string, lng: string) {
  return `https://maps.google.com/maps?q=${lat},${lng}`;
}

// ─── Photo thumbnail + lightbox ───────────────────────────────────────────────

function Photo({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
        style={{ width: 72, height: 72 }}
      >
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-semibold text-center py-0.5">
          {label}
        </div>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setOpen(false)}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <span className="text-white text-sm font-semibold">{label}</span>
            <button className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt={label} className="max-w-full max-h-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Small stat pill ──────────────────────────────────────────────────────────

function Pill({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 border ${color}`}>
      <div className="text-[10px] font-semibold opacity-70">{label}</div>
      <div className="text-lg font-black leading-tight">{value}</div>
      {sub && <div className="text-[10px] opacity-60">{sub}</div>}
    </div>
  );
}

// ─── Timeline item (done หรือ back) ───────────────────────────────────────────

type TimelineItem =
  | { type: "done"; time: string | null; d: Delivery }
  | { type: "back"; time: string | null; b: Back };

function DeliveryRow({ d, index }: { d: Delivery; index: number }) {
  const photos: { url: string; label: string }[] = [];
  if (d.store_image_url) photos.push({ url: d.store_image_url, label: "หน้าร้าน" });
  if (d.product_image_url) photos.push({ url: d.product_image_url, label: "สินค้า" });
  if (d.sign_image_url) photos.push({ url: d.sign_image_url, label: "เซ็นลูกค้า" });
  if (d.employee_sign_url) photos.push({ url: d.employee_sign_url, label: "เซ็นพนักงาน" });
  if (d.slip_image_url) photos.push({ url: d.slip_image_url, label: "สลิป" });
  if (d.report_image_url) photos.push({ url: d.report_image_url, label: "Report" });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm">
          {index}
        </div>
        <div className="w-px flex-1 bg-gray-200 mt-1.5" />
      </div>
      <div className="flex-1 pb-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-900 leading-snug">{d.mem_name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{d.mem_code}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-emerald-600 font-black text-base tabular-nums">{fmtTime(d.shipping_finish_time)}</div>
                <div className="text-[11px] text-gray-400">{d.bill_count} บิล · {d.box_amount} ลัง</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {d.receiver_type && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-100">
                  {d.receiver_type}
                </span>
              )}
              {d.lat && d.lng && (
                <a href={mapsUrl(d.lat, d.lng)} target="_blank" rel="noreferrer"
                  className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-blue-100 hover:bg-blue-100">
                  แผนที่
                </a>
              )}
            </div>
            {d.note && (
              <div className="mt-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                {d.note}
              </div>
            )}
          </div>
          {photos.length > 0 && (
            <div className="px-3 pb-3 flex gap-2 flex-wrap border-t border-gray-50 pt-2.5">
              {photos.map((p) => <Photo key={p.label} url={p.url} label={p.label} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BackRow({ b, index }: { b: Back; index: number }) {
  const photos: { url: string; label: string }[] = [];
  if (b.photo_url) photos.push({ url: b.photo_url, label: "รูปหน้าจุด" });
  if (b.report_image_url) photos.push({ url: b.report_image_url, label: "Report" });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm">
          {index}
        </div>
        <div className="w-px flex-1 bg-gray-200 mt-1.5" />
      </div>
      <div className="flex-1 pb-3">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-900 leading-snug">{b.mem_name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{b.mem_code}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-red-500 font-black text-base tabular-nums">{fmtTime(b.shipping_finish_time)}</div>
                <div className="text-[11px] text-gray-400">{b.bill_count} บิล · {b.box_amount} ลัง · ตีกลับ</div>
              </div>
            </div>
            {b.reason && (
              <div className="mt-2 text-[11px] text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 border border-red-100">
                {b.reason}
              </div>
            )}
          </div>
          {photos.length > 0 && (
            <div className="px-3 pb-3 flex gap-2 flex-wrap border-t border-gray-50 pt-2.5">
              {photos.map((p) => <Photo key={p.label} url={p.url} label={p.label} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Driver card ──────────────────────────────────────────────────────────────

function DriverCard({ r }: { r: DriverReport }) {
  const [open, setOpen] = useState(true);

  const totalStores = r.in_progress.store_count + r.done.store_count + r.back.store_count;
  const totalBoxes = r.in_progress.box_count + r.done.box_count + r.back.box_count;

  // รวม done + back เป็น timeline เดียว เรียงตามเวลา
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...r.deliveries.map((d) => ({ type: "done" as const, time: d.shipping_finish_time, d })),
      ...r.backs.map((b) => ({ type: "back" as const, time: b.shipping_finish_time, b })),
    ];
    return items.sort((a, b) => new Date(a.time ?? 0).getTime() - new Date(b.time ?? 0).getTime());
  }, [r]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black leading-tight">{r.emp_name}</div>
            <div className="text-slate-400 text-xs mt-0.5">
              <span className="font-mono">{r.emp_code}</span>
              {r.car_number ? ` · ทะเบียน ${r.car_number}` : ""}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.routes.map((rt) => (
                <span key={rt.route_code} className="bg-white/10 text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  {rt.route_code} {rt.route_name}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setOpen((v) => !v)}
            className="flex-shrink-0 text-slate-300 hover:text-white text-xs bg-white/10 rounded-lg px-2.5 py-1">
            {open ? "ย่อ" : "ขยาย"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Pill label="ระยะทาง" value={r.distance ? `${r.distance.total_km}` : "-"} sub="กม." color="bg-purple-50 border-purple-100 text-purple-700" />
        <Pill label="ทั้งหมด" value={`${totalStores}`} sub={`ร้าน · ${totalBoxes} ลัง`} color="bg-slate-50 border-slate-200 text-slate-700" />
        <Pill label="ส่งแล้ว" value={`${r.done.store_count}`} sub={`ร้าน · ${r.done.box_count} ลัง`} color="bg-emerald-50 border-emerald-100 text-emerald-700" />
        <Pill label="ตีกลับ" value={`${r.back.store_count}`} sub={`ร้าน · ${r.back.box_count} ลัง`} color="bg-red-50 border-red-100 text-red-600" />
        <Pill label="ออกรถ" value={fmtTime(r.shipping_out_time)} color="bg-orange-50 border-orange-100 text-orange-600" />
        <Pill label="จบงาน" value={r.shift_end ? fmtTime(r.shift_end.shift_end_time) : "-"} color="bg-indigo-50 border-indigo-100 text-indigo-600" />
      </div>

      {open && (
        <div className="px-4 pb-4">
          {/* start strip */}
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            <span className="bg-cyan-50 text-cyan-700 border border-cyan-100 rounded-lg px-2.5 py-1.5 font-semibold">
              🔼 ขึ้นของชิ้นแรก {fmtTime(r.first_load_time)}
            </span>
            <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-lg px-2.5 py-1.5 font-semibold">
              🚀 ออกรถ {fmtTime(r.shipping_out_time)}
            </span>
            {r.distance?.total_minutes != null && (
              <span className="bg-slate-50 text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold">
                ⏱️ รวมเวลา {fmtDuration(r.distance.total_minutes)}
              </span>
            )}
          </div>

          {/* timeline */}
          {timeline.length > 0 ? (
            <div>
              {timeline.map((it, i) =>
                it.type === "done" ? (
                  <DeliveryRow key={`d-${it.d.mem_code}-${i}`} d={it.d} index={i + 1} />
                ) : (
                  <BackRow key={`b-${it.b.mem_code}-${i}`} b={it.b} index={i + 1} />
                )
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-6">ยังไม่มีรายการส่งในวันนี้</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div>
            <div className="text-lg font-black text-gray-900">Report ขนส่ง</div>
            <div className="text-xs text-gray-400">รายงานการจัดส่งรายพนักงาน</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              value={date}
              max={dayjs().format("YYYY-MM-DD")}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button onClick={load} className="bg-blue-600 text-white text-sm font-semibold rounded-lg px-3 py-1.5 hover:bg-blue-700">
              รีเฟรช
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-gray-500 text-sm mb-3">{error}</div>
            <button onClick={load} className="bg-blue-600 text-white text-sm font-semibold rounded-lg px-4 py-2">ลองใหม่</button>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
            ไม่มีข้อมูลการจัดส่งในวันที่เลือก
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-400">พนักงานที่ออกส่ง {data.length} คน</div>
            {data.map((r) => (
              <DriverCard key={r.emp_code} r={r} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
