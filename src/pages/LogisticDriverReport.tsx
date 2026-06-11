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
        className="relative flex-shrink-0 rounded-lg overflow-hidden border border-gray-100"
        style={{ width: 72, height: 72 }}
      >
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] font-semibold text-center py-0.5">
          {label}
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white text-sm font-semibold">{label}</span>
            <button className="text-white text-2xl leading-none">✕</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt={label} className="max-w-full max-h-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({
  label, stores, bills, boxes,
  bg, text, icon,
}: {
  label: string; stores: number; bills: number; boxes: number;
  bg: string; text: string; icon: string;
}) {
  return (
    <div className={`flex-1 rounded-xl p-3 ${bg}`}>
      <div className={`text-xs font-bold ${text} flex items-center gap-1 mb-1`}>
        <span>{icon}</span> {label}
      </div>
      <div className={`text-2xl font-black ${text}`}>{stores} ร้าน</div>
      <div className={`text-xs ${text} opacity-75`}>{bills} บิล · {boxes} ลัง</div>
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
      {/* timeline dot */}
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
      </div>

      {/* card */}
      <div className="flex-1 pb-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="font-bold text-sm text-gray-900 leading-tight">{d.mem_name}</div>
              <div className="text-xs text-gray-400">{d.mem_code}</div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-green-600 font-black text-base">{fmtTime(d.shipping_finish_time)}</div>
              <div className="text-xs text-gray-400">{d.bill_count} บิล · {d.box_amount} ลัง</div>
            </div>
          </div>

          {d.receiver_type && (
            <span className="inline-block bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">
              {d.receiver_type}
            </span>
          )}

          {d.forwarding_fee != null && (
            <div className="text-xs text-orange-600 font-semibold mb-2">
              💸 ฝากส่ง {d.forwarding_fee.toFixed(0)} บาท
            </div>
          )}

          {d.lat && d.lng && (
            <a
              href={mapsUrl(d.lat, d.lng)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-500 mb-2"
            >
              📍 {d.lat}, {d.lng}
            </a>
          )}

          {photos.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
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
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
      </div>

      <div className="flex-1 pb-4">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="font-bold text-sm text-gray-900 leading-tight">{b.mem_name}</div>
              <div className="text-xs text-gray-400">{b.mem_code}</div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-red-500 font-black text-base">{fmtTime(b.shipping_finish_time)}</div>
              <div className="text-xs text-gray-400">{b.bill_count} บิล · {b.box_amount} ลัง</div>
            </div>
          </div>

          {b.reason && (
            <div className="text-xs text-red-600 italic mb-2">{b.reason}</div>
          )}

          {photos.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
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
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 text-sm">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-4xl mb-3">😕</div>
          <div className="text-gray-600">{error ?? "ไม่พบข้อมูล"}</div>
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
      <div className="bg-blue-700 text-white px-4 pt-10 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-black leading-tight">🚗 {data.emp_name}</div>
            <div className="text-blue-200 text-sm mt-1">
              {data.car_number ? `ทะเบียน ${data.car_number}` : "ไม่มีข้อมูลรถ"}
            </div>
            <div className="text-blue-300 text-xs mt-1">
              {totalStores} ร้าน · {totalBoxes} ลัง
            </div>
          </div>
          <div className="text-blue-200 text-sm text-right">🕐 {now}</div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4 pb-10">

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex gap-3">
            {data.in_progress.store_count > 0 && (
              <StatChip
                label="กำลังส่ง"
                stores={data.in_progress.store_count}
                bills={data.in_progress.bill_count}
                boxes={data.in_progress.box_count}
                bg="bg-blue-50"
                text="text-blue-700"
                icon="🚚"
              />
            )}
            <StatChip
              label="ส่งแล้ว"
              stores={data.done.store_count}
              bills={data.done.bill_count}
              boxes={data.done.box_count}
              bg="bg-green-50"
              text="text-green-700"
              icon="✅"
            />
            {data.back.store_count > 0 && (
              <StatChip
                label="ส่งไม่ได้"
                stores={data.back.store_count}
                bills={data.back.bill_count}
                boxes={data.back.box_count}
                bg="bg-red-50"
                text="text-red-700"
                icon="❌"
              />
            )}
          </div>
        </div>

        {/* Times */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-xs font-bold text-orange-600 mb-3 flex items-center gap-1">
            ⏱️ เวลา
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🚀", label: "ออกรถ", value: fmtTime(data.shipping_out_time), color: "text-orange-600" },
              { icon: "🏪", label: "ร้านแรก", value: fmtTime(data.done.first_finish_time), color: "text-green-600" },
              { icon: "🔄", label: "ล่าสุด", value: fmtTime(data.done.last_finish_time), color: "text-blue-600" },
              { icon: "🏁", label: "จบงาน", value: data.shift_end ? fmtTime(data.shift_end.shift_end_time) : "-", color: "text-purple-600" },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-lg">{icon}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                <div className={`text-base font-black ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Routes */}
        {data.routes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-xs font-bold text-indigo-600 mb-3">🛣️ เส้นทาง</div>
            <div className="space-y-2">
              {data.routes.map((r) => (
                <div key={r.route_code} className="flex items-center justify-between bg-indigo-50 rounded-xl px-3 py-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-800">{r.route_code}</span>
                    <span className="text-xs text-indigo-600 ml-2">{r.route_name}</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700">{r.store_count} ร้าน · {r.box_count} ลัง</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distance summary */}
        {data.distance && data.distance.total_km > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-xs font-bold text-purple-600 mb-3">📍 ระยะทาง</div>
            <div className="flex gap-3">
              <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-xs text-purple-500">รวมระยะทาง</div>
                <div className="text-xl font-black text-purple-700">{data.distance.total_km_text}</div>
              </div>
              <div className="flex-1 bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-xs text-indigo-500">รวมเวลา</div>
                <div className="text-xl font-black text-indigo-700">{data.distance.total_time_text}</div>
              </div>
            </div>

            {data.done.latest_lat && data.done.latest_lng && (
              <a
                href={mapsUrl(data.done.latest_lat, data.done.latest_lng)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 rounded-xl py-2.5 text-sm font-semibold"
              >
                🗺️ ดูตำแหน่งล่าสุด
              </a>
            )}
          </div>
        )}

        {/* Deliveries */}
        {data.deliveries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-xs font-bold text-green-700 mb-4">
              ✅ รายการส่งแล้ว ({data.deliveries.length} ร้าน)
            </div>
            <div>
              {data.deliveries.map((d, i) => (
                <DeliveryCard key={`${d.mem_code}-${i}`} d={d} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Backs */}
        {data.backs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-xs font-bold text-red-600 mb-4">
              ❌ ส่งไม่ได้ ({data.backs.length} ร้าน)
            </div>
            <div>
              {data.backs.map((b, i) => (
                <BackCard key={`${b.mem_code}-${i}`} b={b} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* No data */}
        {data.deliveries.length === 0 && data.backs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-gray-500 text-sm">ยังไม่มีรายการส่งวันนี้</div>
          </div>
        )}

      </div>
    </div>
  );
}
