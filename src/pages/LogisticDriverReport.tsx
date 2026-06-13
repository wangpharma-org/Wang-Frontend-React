/// <reference types="vite/client" />
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverReport {
  emp_code: string;
  emp_name: string;
  car_number: string | null;
  shipping_out_time: string | null;
  in_progress: { store_count: number; bill_count: number; box_count: number };
  done: {
    store_count: number;
    bill_count: number;
    box_count: number;
    first_finish_time: string | null;
    last_finish_time: string | null;
    latest_lat: string | null;
    latest_lng: string | null;
  };
  back: { store_count: number; bill_count: number; box_count: number };
  routes: { route_code: string; route_name: string; store_count: number; box_count: number }[];
  deliveries: Delivery[];
  backs: Back[];
  shift_end: { shift_end_time: string } | null;
  distance: Distance | null;
}

interface Delivery {
  mem_code: string;
  mem_name: string;
  shipping_finish_time: string | null;
  store_image_url: string | null;
  product_image_url: string | null;
  sign_image_url: string | null;
  report_image_url: string | null;
  lat: string | null;
  lng: string | null;
  receiver_type: string | null;
  forwarding_fee: number | null;
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

interface Distance {
  total_km: number;
  total_km_text: string;
  total_time_text: string;
  segments: { to: string; km: number; diff_minutes: number | null }[];
  departure_lat: string | null;
  departure_lng: string | null;
  departure_time: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function mapsUrl(lat: string, lng: string) {
  return `https://maps.google.com/maps?q=${lat},${lng}`;
}

// ─── Photo thumbnail ──────────────────────────────────────────────────────────

function Photo({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
        style={{ width: 76, height: 76 }}
      >
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-semibold text-center py-1 tracking-wide">
          {label}
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <span className="text-white text-sm font-semibold tracking-wide">{label}</span>
            <button className="text-white/70 hover:text-white text-xl leading-none transition-colors">✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt={label} className="max-w-full max-h-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, stores, bills, boxes,
  bg, borderColor, labelColor, valueColor,
  dot,
}: {
  label: string; stores: number; bills: number; boxes: number;
  bg: string; borderColor: string; labelColor: string; valueColor: string;
  dot: string;
}) {
  return (
    <div className={`flex-1 rounded-xl p-3 border ${bg} ${borderColor}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className={`text-xs font-bold tracking-wide ${labelColor}`}>{label}</span>
      </div>
      <div className={`text-2xl font-black leading-none ${valueColor}`}>{stores}</div>
      <div className={`text-xs mt-0.5 ${labelColor} opacity-70`}>ร้าน</div>
      <div className={`text-[11px] mt-1.5 ${labelColor} opacity-60`}>{bills} บิล · {boxes} ลัง</div>
    </div>
  );
}

// ─── Time cell ────────────────────────────────────────────────────────────────

function TimeCell({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
      <div className={`flex items-center justify-center mb-1 ${color} opacity-70`}>{icon}</div>
      <div className="text-[11px] text-gray-400 mb-1 font-medium">{label}</div>
      <div className={`text-base font-black ${color}`}>{value}</div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count, color, icon }: { title: string; count?: number; color: string; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 mb-4 pb-3 border-b border-gray-100`}>
      <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
      <span className="text-sm font-bold text-gray-800">{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-xs font-semibold text-gray-400">{count} ร้าน</span>
      )}
    </div>
  );
}

// ─── Delivery card ────────────────────────────────────────────────────────────

function DeliveryCard({ d, index }: { d: Delivery; index: number }) {
  const photos: { url: string; label: string }[] = [];
  if (d.store_image_url) photos.push({ url: d.store_image_url, label: "หน้าร้าน" });
  if (d.product_image_url) photos.push({ url: d.product_image_url, label: "สินค้า" });
  if (d.sign_image_url) photos.push({ url: d.sign_image_url, label: "ลายเซ็น" });
  if (d.report_image_url) photos.push({ url: d.report_image_url, label: "Report" });

  return (
    <div className="flex gap-3">
      {/* timeline */}
      <div className="flex flex-col items-center pt-1">
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm">
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-gray-150 mt-1.5 bg-gray-200" />
      </div>

      {/* card */}
      <div className="flex-1 pb-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-900 leading-snug truncate">{d.mem_name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{d.mem_code}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-emerald-600 font-black text-base tabular-nums">{fmtTime(d.shipping_finish_time)}</div>
                <div className="text-[11px] text-gray-400">{d.bill_count} บิล · {d.box_amount} ลัง</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {d.receiver_type && (
                <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-100">
                  {d.receiver_type}
                </span>
              )}
              {d.forwarding_fee != null && (
                <span className="inline-flex items-center bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-amber-100">
                  ฝากส่ง {d.forwarding_fee.toFixed(0)} บาท
                </span>
              )}
              {d.lat && d.lng && (
                <a
                  href={mapsUrl(d.lat, d.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  แผนที่
                </a>
              )}
            </div>
          </div>

          {photos.length > 0 && (
            <div className="px-3 pb-3 flex gap-2 flex-wrap border-t border-gray-50 pt-2.5 mt-0.5">
              {photos.map((p) => (
                <Photo key={p.label} url={p.url} label={p.label} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Back card ────────────────────────────────────────────────────────────────

function BackCard({ b, index }: { b: Back; index: number }) {
  const photos: { url: string; label: string }[] = [];
  if (b.photo_url) photos.push({ url: b.photo_url, label: "รูปหน้าจุด" });
  if (b.report_image_url) photos.push({ url: b.report_image_url, label: "Report" });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm">
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-gray-200 mt-1.5" />
      </div>

      <div className="flex-1 pb-3">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-900 leading-snug truncate">{b.mem_name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{b.mem_code}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-red-500 font-black text-base tabular-nums">{fmtTime(b.shipping_finish_time)}</div>
                <div className="text-[11px] text-gray-400">{b.bill_count} บิล · {b.box_amount} ลัง</div>
              </div>
            </div>

            {b.reason && (
              <div className="mt-2 text-[11px] text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 border border-red-100">
                {b.reason}
              </div>
            )}
          </div>

          {photos.length > 0 && (
            <div className="px-3 pb-3 flex gap-2 flex-wrap border-t border-gray-50 pt-2.5 mt-0.5">
              {photos.map((p) => (
                <Photo key={p.label} url={p.url} label={p.label} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LogisticDriverReport() {
  const [params] = useSearchParams();
  const empCode = params.get("emp_code") ?? "";

  const [data, setData] = useState<DriverReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empCode) {
      setError("ไม่พบรหัสพนักงาน");
      setLoading(false);
      return;
    }
    axios
      .get<DriverReport>(`${API}/api/logistic/delivery-report/driver/${encodeURIComponent(empCode)}`)
      .then((r) => setData(r.data))
      .catch(() => setError("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [empCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-400 text-sm">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-gray-500 text-sm">{error ?? "ไม่พบข้อมูล"}</div>
        </div>
      </div>
    );
  }

  const now = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const totalStores = data.in_progress.store_count + data.done.store_count;
  const totalBoxes = data.in_progress.box_count + data.done.box_count;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-5 pt-10 pb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400 font-medium tracking-widest uppercase mb-1">รายงานการจัดส่ง</div>
            <div className="text-xl font-black leading-tight text-white">{data.emp_name}</div>
            <div className="text-slate-400 text-sm mt-1">
              {data.car_number ? `ทะเบียน ${data.car_number}` : "ไม่มีข้อมูลรถ"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">อัปเดต</div>
            <div className="text-slate-300 text-sm font-semibold tabular-nums">{now}</div>
          </div>
        </div>

        {/* Summary pill */}
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 w-fit">
          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-sm text-slate-200 font-semibold">{totalStores} ร้าน · {totalBoxes} ลัง</span>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-3 pb-12">

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex gap-2.5">
            {data.in_progress.store_count > 0 && (
              <StatCard
                label="กำลังส่ง"
                stores={data.in_progress.store_count}
                bills={data.in_progress.bill_count}
                boxes={data.in_progress.box_count}
                bg="bg-blue-50/60"
                borderColor="border-blue-100"
                labelColor="text-blue-700"
                valueColor="text-blue-800"
                dot="bg-blue-500"
              />
            )}
            <StatCard
              label="ส่งแล้ว"
              stores={data.done.store_count}
              bills={data.done.bill_count}
              boxes={data.done.box_count}
              bg="bg-emerald-50/60"
              borderColor="border-emerald-100"
              labelColor="text-emerald-700"
              valueColor="text-emerald-800"
              dot="bg-emerald-500"
            />
            {data.back.store_count > 0 && (
              <StatCard
                label="ส่งไม่ได้"
                stores={data.back.store_count}
                bills={data.back.bill_count}
                boxes={data.back.box_count}
                bg="bg-red-50/60"
                borderColor="border-red-100"
                labelColor="text-red-600"
                valueColor="text-red-700"
                dot="bg-red-400"
              />
            )}
          </div>
        </div>

        {/* Times */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <SectionHeader
            title="ไทม์ไลน์"
            color="bg-orange-50"
            icon={
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <div className="grid grid-cols-2 gap-2.5">
            <TimeCell
              label="ออกรถ"
              value={fmtTime(data.shipping_out_time)}
              color="text-orange-600"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              }
            />
            <TimeCell
              label="ร้านแรก"
              value={fmtTime(data.done.first_finish_time)}
              color="text-emerald-600"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <TimeCell
              label="ร้านล่าสุด"
              value={fmtTime(data.done.last_finish_time)}
              color="text-blue-600"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            />
            <TimeCell
              label="จบงาน"
              value={data.shift_end ? fmtTime(data.shift_end.shift_end_time) : "-"}
              color="text-purple-600"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Routes */}
        {data.routes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <SectionHeader
              title="เส้นทาง"
              color="bg-indigo-50"
              icon={
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              }
            />
            <div className="space-y-2">
              {data.routes.map((r) => (
                <div key={r.route_code} className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">{r.route_code}</span>
                    <span className="text-xs text-gray-600">{r.route_name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{r.store_count} ร้าน · {r.box_count} ลัง</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distance */}
        {data.distance && data.distance.total_km > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <SectionHeader
              title="ระยะทาง"
              color="bg-purple-50"
              icon={
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <div className="flex gap-2.5">
              <div className="flex-1 bg-purple-50/60 border border-purple-100 rounded-xl p-3 text-center">
                <div className="text-[11px] text-purple-500 font-medium mb-1">รวมระยะทาง</div>
                <div className="text-xl font-black text-purple-800">{data.distance.total_km_text}</div>
              </div>
              <div className="flex-1 bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-center">
                <div className="text-[11px] text-indigo-500 font-medium mb-1">รวมเวลา</div>
                <div className="text-xl font-black text-indigo-800">{data.distance.total_time_text}</div>
              </div>
            </div>

            {data.done.latest_lat && data.done.latest_lng && (
              <a
                href={mapsUrl(data.done.latest_lat, data.done.latest_lng)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                ดูตำแหน่งล่าสุด
              </a>
            )}
          </div>
        )}

        {/* Deliveries */}
        {data.deliveries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <SectionHeader
              title="รายการส่งแล้ว"
              count={data.deliveries.length}
              color="bg-emerald-50"
              icon={
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <div>
              {data.deliveries.map((d, i) => (
                <DeliveryCard key={`${d.mem_code}-${i}`} d={d} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Backs */}
        {data.backs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <SectionHeader
              title="ส่งไม่ได้"
              count={data.backs.length}
              color="bg-red-50"
              icon={
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <div>
              {data.backs.map((b, i) => (
                <BackCard key={`${b.mem_code}-${i}`} b={b} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.deliveries.length === 0 && data.backs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div className="text-gray-400 text-sm">ยังไม่มีรายการส่งวันนี้</div>
          </div>
        )}

      </div>
    </div>
  );
}
