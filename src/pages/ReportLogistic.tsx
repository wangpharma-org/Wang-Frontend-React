/// <reference types="vite/client" />
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillPrice {
  sh_running: string;
  price: number | null;
}

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
  bills: BillPrice[];
  total_price: number | null;
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
  bills: BillPrice[];
  total_price: number | null;
}

interface DriverReport {
  emp_code: string;
  emp_name: string;
  car_number: string | null;
  shipping_out_time: string | null;
  first_load_time: string | null;
  in_progress: { store_count: number; bill_count: number; box_count: number; total_price: number | null };
  done: { store_count: number; bill_count: number; box_count: number; total_price: number | null };
  back: { store_count: number; bill_count: number; box_count: number; total_price: number | null };
  routes: { route_code: string; route_name: string; store_count: number; box_count: number }[];
  deliveries: Delivery[];
  backs: Back[];
  shift_end: { shift_end_time: string } | null;
  distance: { total_km: number; total_minutes: number | null } | null;
}

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
  bills: BillPrice[];
  total_price: number | null;
  note: string | null;
  photos: { url: string; label: string }[];
  signs: { url: string; label: string }[];
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
  return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
};

const mapsUrl = (lat: string, lng: string) => `https://maps.google.com/maps?q=${lat},${lng}`;

const fmtBaht = (n: number | null) =>
  n == null ? "-" : n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// แบบไม่มีทศนิยม — ใช้ในการ์ด/KPI ที่พื้นที่แคบ กันตัวเลขล้นกรอบ
const fmtBahtInt = (n: number | null) =>
  n == null ? "-" : n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

// ─── Photo + lightbox ─────────────────────────────────────────────────────────

function Photo({ url, label, size = 54 }: { url: string; label: string; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={label}
        className="relative flex-shrink-0 rounded-xl overflow-hidden ring-1 ring-blue-200 hover:ring-blue-500 hover:scale-105 transition"
        style={{ width: size, height: size }}
      >
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-white text-[9px] font-semibold text-center leading-none py-[3px]">{label}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="text-white text-sm font-semibold mb-3">{label}</div>
          <img
            src={url}
            alt={label}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl"
          />
          <button
            onClick={() => setOpen(false)}
            className="mt-4 text-white/85 hover:text-white text-sm font-medium bg-white/10 hover:bg-white/20 rounded-full px-5 py-1.5 transition"
          >
            ปิด
          </button>
        </div>
      )}
    </>
  );
}

// ─── KPI tile (บน header สีฟ้า) ───────────────────────────────────────────────

function Kpi({ label, value, sub, icon, accent = false }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl px-3.5 py-3 min-w-0 ${accent ? "bg-emerald-400/25 ring-1 ring-emerald-300/50" : "bg-white/15"}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-emerald-50" : "text-blue-50/80"}`}>
        <span className={accent ? "text-emerald-200" : "text-blue-100"}>{icon}</span>
        {label}
      </div>
      <div className={`text-xl font-extrabold leading-none tabular-nums mt-1.5 truncate ${accent ? "text-emerald-100" : "text-white"}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${accent ? "text-emerald-50/80" : "text-blue-50/70"}`}>{sub}</div>}
    </div>
  );
}

const MapPin = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const TruckIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3v11m10 0h2m4 0h1V9a1 1 0 00-.293-.707l-2-2A1 1 0 0016 6h-3v10" /></svg>
);

// ─── Count unit (ลัง / ชุด / บิล) ─────────────────────────────────────────────

function CountUnit({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-extrabold text-slate-800 leading-none tabular-nums">{n}</div>
      <div className="text-[11px] text-slate-400 mt-1">{label}</div>
    </div>
  );
}

// ─── Overview summary card ────────────────────────────────────────────────────

function SummaryCard({ label, value, unit, sub, icon, tint, accent = false }: {
  label: string; value: string | number; unit?: string; sub?: string; icon: React.ReactNode; tint: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl shadow-sm p-4 min-w-0 ${accent ? "bg-emerald-600 ring-1 ring-emerald-500" : "bg-white ring-1 ring-blue-100"}`}>
      <span className={`w-10 h-10 rounded-xl grid place-items-center ${tint}`}>{icon}</span>
      <div className="mt-3 flex items-baseline gap-1 min-w-0">
        <span className={`text-2xl font-extrabold tabular-nums leading-none truncate ${accent ? "text-white" : "text-slate-800"}`}>{value}</span>
        {unit && <span className={`text-sm font-medium flex-shrink-0 ${accent ? "text-emerald-100" : "text-slate-400"}`}>{unit}</span>}
      </div>
      <div className={`text-sm mt-1 font-medium ${accent ? "text-emerald-50" : "text-slate-500"}`}>{label}</div>
      {sub && <div className={`text-xs mt-0.5 ${accent ? "text-emerald-100/80" : "text-slate-400"}`}>{sub}</div>}
    </div>
  );
}

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
        if (d.sign_image_url) photos.push({ url: d.sign_image_url, label: "ลายเซ็นลูกค้า" });
        if (d.employee_sign_url) photos.push({ url: d.employee_sign_url, label: "ลายเซ็นพนักงาน" });
        if (d.report_image_url) photos.push({ url: d.report_image_url, label: "Report" });
        return {
          status: "done", time: d.shipping_finish_time, mem_code: d.mem_code, mem_name: d.mem_name,
          receiver_type: d.receiver_type, lat: d.lat, lng: d.lng, box_amount: d.box_amount,
          shipping_count: d.shipping_count, bill_count: d.bill_count,
          bills: d.bills ?? [], total_price: d.total_price ?? null, note: d.note, photos, signs: [],
        };
      }),
      ...r.backs.map((b): Row => {
        const photos: { url: string; label: string }[] = [];
        if (b.photo_url) photos.push({ url: b.photo_url, label: "รูปหน้าจุด" });
        if (b.report_image_url) photos.push({ url: b.report_image_url, label: "Report" });
        return {
          status: "back", time: b.shipping_finish_time, mem_code: b.mem_code, mem_name: b.mem_name,
          receiver_type: null, lat: null, lng: null, box_amount: b.box_amount,
          shipping_count: b.shipping_count, bill_count: b.bill_count,
          bills: b.bills ?? [], total_price: b.total_price ?? null, note: b.reason, photos, signs: [],
        };
      }),
    ];
    return list.sort((a, b) => new Date(a.time ?? 0).getTime() - new Date(b.time ?? 0).getTime());
  }, [r]);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-blue-100 shadow-sm overflow-hidden">
      {/* Header สีฟ้า */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-600 to-sky-500 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
                {TruckIcon}
              </div>
              <div className="min-w-0">
                <div className="text-white font-extrabold text-lg leading-tight truncate">{r.emp_name}</div>
                <div className="text-blue-50/85 text-sm mt-0.5">
                  <span className="font-mono font-semibold tabular-nums">{r.emp_code}</span>{r.car_number ? ` · ทะเบียน ${r.car_number}` : ""}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {r.routes.map((rt) => (
                <span key={rt.route_code} className="inline-flex items-center gap-1.5 bg-white/15 text-white text-[13px] px-2.5 py-1 rounded-lg">
                  <span className="font-extrabold">{rt.route_code}</span>
                  <span className="text-blue-50/85">{rt.route_name}</span>
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setOpen((v) => !v)}
            className="flex-shrink-0 text-white text-sm font-semibold bg-white/15 hover:bg-white/25 rounded-lg px-4 py-2 transition">
            {open ? "ย่อ" : "ขยาย"}
          </button>
        </div>

        {/* KPI grid — เต็มความกว้าง กระจายเท่ากัน */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-5">
          <Kpi label="ระยะทาง" value={r.distance ? `${r.distance.total_km} กม.` : "-"} sub={fmtDur(r.distance?.total_minutes ?? null)} icon={MapPin} />
          <Kpi label="ทั้งหมด" value={`${totalStores} ร้าน`} sub={`${totalBoxes} ลัง`} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
          <Kpi label="ส่งแล้ว" value={`${r.done.store_count} ร้าน`} sub={`${r.done.box_count} ลัง`} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
          <Kpi label="ตีกลับ" value={`${r.back.store_count} ร้าน`} sub={`${r.back.box_count} ลัง`} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>} />
          <Kpi label="มูลค่าส่งแล้ว" value={fmtBahtInt(r.done.total_price)} sub="บาท" accent icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <Kpi label="ขึ้นของแรก" value={fmtTime(r.first_load_time)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>} />
          <Kpi label="ออกรถ" value={fmtTime(r.shipping_out_time)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>} />
          <Kpi label="จบงาน" value={r.shift_end ? fmtTime(r.shift_end.shift_end_time) : "-"} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        </div>
      </div>

      {/* Table */}
      {open && (
        rows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-base">ยังไม่มีรายการส่งในวันนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[1100px] text-[13px]">
              <colgroup>
                <col className="w-[88px]" />
                <col className="w-[17%]" />
                <col className="w-[108px]" />
                <col className="w-[13%]" />
                <col className="w-[104px]" />
                <col className="w-[88px]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[150px]" />
              </colgroup>
              <thead>
                <tr className="bg-blue-50 text-blue-700 text-xs">
                  <th className="text-left font-bold px-4 py-3">เวลา</th>
                  <th className="text-left font-bold px-4 py-3">ร้าน</th>
                  <th className="text-left font-bold px-4 py-3">สถานะ</th>
                  <th className="text-left font-bold px-4 py-3">ผู้เซ็น</th>
                  <th className="text-center font-bold px-4 py-3">ลัง · บิล</th>
                  <th className="text-center font-bold px-4 py-3">แผนที่</th>
                  <th className="text-left font-bold px-4 py-3">หลักฐานการส่ง</th>
                  <th className="text-left font-bold px-4 py-3">หมายเหตุ</th>
                  <th className="text-right font-bold px-4 py-3 text-emerald-700">มูลค่า (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const done = row.status === "done";
                  return (
                    <tr key={`${row.mem_code}-${i}`} className="border-t border-blue-50 hover:bg-blue-50/40 transition align-top">
                      {/* เวลา + timeline dot */}
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ring-4 ring-white ${done ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className={`font-extrabold text-[15px] tabular-nums ${done ? "text-emerald-600" : "text-rose-500"}`}>{fmtTime(row.time)}</span>
                        </div>
                      </td>
                      {/* ร้าน */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800 leading-snug break-words">{row.mem_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{row.mem_code}</div>
                      </td>
                      {/* สถานะ */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${done ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-600 ring-1 ring-rose-200"}`}>
                          <span className={`w-2 h-2 rounded-full ${done ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {done ? "ส่งสำเร็จ" : "ตีกลับ"}
                        </span>
                      </td>
                      {/* ผู้เซ็น */}
                      <td className="px-4 py-4">
                        {row.receiver_type ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 ring-1 ring-blue-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {row.receiver_type}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* ลัง · ชุด · บิล */}
                      <td className="px-4 py-4">
                        <div className="flex items-start justify-center gap-4">
                          <CountUnit n={row.box_amount} label="ลัง" />
                          <span className="text-slate-200 text-lg leading-none">|</span>
                          <CountUnit n={row.bill_count} label="บิล" />
                        </div>
                      </td>
                      {/* แผนที่ */}
                      <td className="px-4 py-4 text-center">
                        {row.lat && row.lng ? (
                          <a href={mapsUrl(row.lat, row.lng)} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition">
                            {MapPin} เปิด
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* หลักฐาน */}
                      <td className="px-4 py-4">
                        {row.photos.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {row.photos.map((p) => <Photo key={p.label} url={p.url} label={p.label} />)}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* หมายเหตุ */}
                      <td className="px-4 py-4">
                        {row.note ? (
                          <span className={`text-[13px] break-words ${done ? "text-slate-600" : "text-rose-600 font-medium"}`}>{row.note}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* มูลค่า + แยกรายบิล */}
                      <td className="px-3 py-4">
                        {row.total_price != null ? (
                          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-2.5 py-2">
                            <div className="text-right font-extrabold text-emerald-700 tabular-nums text-[15px]">{fmtBaht(row.total_price)}</div>
                            {row.bills.length > 0 && (
                              <div className="mt-1.5 space-y-0.5 border-t border-emerald-200/60 pt-1.5">
                                {row.bills.map((b) => (
                                  <div key={b.sh_running} className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
                                    <span className="font-mono text-emerald-600/70">{b.sh_running}</span>
                                    <span className="text-emerald-700/80 font-semibold">{fmtBaht(b.price)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-right text-slate-300 px-2.5">-</div>
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
  const [empQuery, setEmpQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState(""); // "" = ทุกเส้นทาง

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

  // เส้นทางที่วิ่งจริงในวันนั้น (ดึงจาก data ของรายงานวันที่เลือก)
  const routeOptions = useMemo(() => {
    const m = new Map<string, string>();
    data.forEach((d) => d.routes.forEach((r) => m.set(r.route_code, r.route_name)));
    return Array.from(m, ([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code));
  }, [data]);

  // filter ฝั่ง client: รหัส/ชื่อพนักงาน + เส้นทางที่วิ่งวันนั้น
  const filtered = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    return data.filter((d) => {
      const empOk = !q || d.emp_code.toLowerCase().includes(q) || d.emp_name.toLowerCase().includes(q);
      const routeOk = !routeFilter || d.routes.some((r) => r.route_code === routeFilter);
      return empOk && routeOk;
    });
  }, [data, empQuery, routeFilter]);

  const agg = useMemo(() => {
    const sum = (f: (d: DriverReport) => number) => filtered.reduce((s, d) => s + f(d), 0);
    const doneStores = sum((d) => d.done.store_count);
    const doneBoxes = sum((d) => d.done.box_count);
    const backStores = sum((d) => d.back.store_count);
    const backBoxes = sum((d) => d.back.box_count);
    const inProgStores = sum((d) => d.in_progress.store_count);
    const totalKm = Math.round(sum((d) => d.distance?.total_km ?? 0) * 10) / 10;
    const donePrice = Math.round(sum((d) => d.done.total_price ?? 0) * 100) / 100;
    const attempted = doneStores + backStores;
    const successRate = attempted > 0 ? Math.round((doneStores / attempted) * 100) : 0;
    return { drivers: filtered.length, doneStores, doneBoxes, backStores, backBoxes, inProgStores, totalKm, donePrice, attempted, successRate };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#eaf1fe]">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur border-b border-blue-100 sticky top-0 z-20">
        <div className="max-w-[1160px] mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
              {TruckIcon}
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">Report ขนส่ง</div>
              <div className="text-sm text-slate-400">รายงานการจัดส่งรายพนักงาน</div>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={empQuery}
              onChange={(e) => setEmpQuery(e.target.value)}
              placeholder="ค้นหารหัส / ชื่อพนักงาน"
              className="border border-blue-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 w-52 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="border border-blue-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">ทุกเส้นทาง</option>
              {routeOptions.map((r) => (
                <option key={r.code} value={r.code}>{r.code} {r.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              max={dayjs().format("YYYY-MM-DD")}
              onChange={(e) => setDate(e.target.value)}
              className="border border-blue-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={load}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-5 py-2 shadow-sm shadow-blue-600/25 transition">
              รีเฟรช
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1160px] mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <div className="text-slate-500 text-base mb-4">{error}</div>
            <button onClick={load} className="bg-blue-600 text-white text-base font-semibold rounded-xl px-5 py-2.5">ลองใหม่</button>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-blue-100 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4 text-blue-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <div className="text-slate-400 text-base">ไม่มีข้อมูลการจัดส่งในวันที่เลือก</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <SummaryCard label="พนักงานออกส่ง" value={agg.drivers} unit="คน" tint="bg-blue-50 text-blue-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3v11m10 0h2m4 0h1V9a1 1 0 00-.293-.707l-2-2A1 1 0 0016 6h-3v10" /></svg>} />
              <SummaryCard label="ส่งสำเร็จ" value={agg.doneStores} unit="ร้าน" sub={`${agg.doneBoxes} ลัง`} tint="bg-emerald-50 text-emerald-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <SummaryCard label="ตีกลับ" value={agg.backStores} unit="ร้าน" sub={`${agg.backBoxes} ลัง`} tint="bg-rose-50 text-rose-500"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>} />
              <SummaryCard label="กำลังส่ง" value={agg.inProgStores} unit="ร้าน" tint="bg-sky-50 text-sky-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <SummaryCard label="ระยะทางรวม" value={agg.totalKm} unit="กม." tint="bg-violet-50 text-violet-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
              <SummaryCard label="อัตราส่งสำเร็จ" value={agg.successRate} unit="%" sub={`จาก ${agg.attempted} ร้าน`} tint="bg-indigo-50 text-indigo-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
              <SummaryCard label="มูลค่าส่งสำเร็จ" value={fmtBahtInt(agg.donePrice)} unit="บาท" accent tint="bg-white/20 text-white"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-white ring-1 ring-blue-100 p-12 text-center text-slate-400 text-base">
                ไม่พบพนักงานตามตัวกรอง
              </div>
            ) : (
              filtered.map((r) => <DriverCard key={r.emp_code} r={r} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
