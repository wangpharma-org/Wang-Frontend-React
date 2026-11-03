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

interface StatusSummary { store_count: number; bill_count: number; box_count: number; total_price: number | null }

interface DriverReport {
  emp_code: string;
  emp_name: string;
  car_number: string | null;
  shipping_out_time: string | null;
  first_load_time: string | null;
  in_progress: StatusSummary;
  done: StatusSummary;
  back: StatusSummary;
  routes: { route_code: string; route_name: string; store_count: number; box_count: number }[];
  deliveries: Delivery[];
  backs: Back[];
  shift_end: { shift_end_time: string } | null;
  distance: { total_km: number; total_minutes: number | null } | null;
}

interface Media { url: string; label: string; caption?: string }

interface Row {
  status: "done" | "back";
  time: string | null;
  mem_code: string;
  mem_name: string;
  lat: string | null;
  lng: string | null;
  box_amount: number;
  shipping_count: number;
  bill_count: number;
  bills: BillPrice[];
  total_price: number | null;
  note: string | null;
  photos: Media[];
  signs: Media[];
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

const minutesBetween = (from: string | null, to: string | null) =>
  from && to ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000) : null;

const mapsUrl = (lat: string, lng: string) => `https://maps.google.com/maps?q=${lat},${lng}`;

const fmtBaht = (n: number | null) =>
  n == null ? "-" : n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// แบบไม่มีทศนิยม — ใช้ในการ์ด/KPI ที่พื้นที่แคบ กันตัวเลขล้นกรอบ
const fmtBahtInt = (n: number | null) =>
  n == null ? "-" : n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

// รวมมูลค่าที่อาจเป็น null — ถ้าทุกตัวเป็น null (backend ไม่ส่งราคามา) ให้คืน null แทน 0
const sumPrice = (...xs: (number | null | undefined)[]) =>
  xs.every((x) => x == null) ? null : Math.round(xs.reduce<number>((s, x) => s + (x ?? 0), 0) * 100) / 100;

// ─── Share / copy รูปผ่าน app ─────────────────────────────────────────────────

const isAbort = (e: unknown) => (e as DOMException)?.name === "AbortError";

async function fetchBlob(url: string) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

// clipboard รับรูปได้แค่ image/png — แปลงผ่าน canvas
async function toPng(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}

type ShareResult = "shared" | "copied-image" | "copied-link" | "cancel" | "failed";

async function copyImage(url: string): Promise<ShareResult> {
  try {
    // ส่ง Promise เข้า ClipboardItem ตรงๆ — Safari ต้องเรียก write() ภายใน user gesture
    await navigator.clipboard.write([new ClipboardItem({ "image/png": fetchBlob(url).then(toPng) })]);
    return "copied-image";
  } catch {
    try {
      await navigator.clipboard.writeText(url);
      return "copied-link";
    } catch {
      return "failed";
    }
  }
}

// แชร์เป็นไฟล์รูปถ้าเครื่องรองรับ (LINE / แชท บนมือถือ) — ไม่ได้ค่อยแชร์ลิงก์ หรือคัดลอกลิงก์
async function shareImages(items: Media[], title: string): Promise<ShareResult> {
  try {
    const files = await Promise.all(items.map(async (p) => {
      const b = await fetchBlob(p.url);
      const ext = (b.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      return new File([b], `${title}-${p.label}.${ext}`.replace(/[\\/:*?"<>|]/g, "_"), { type: b.type });
    }));
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, title });
      return "shared";
    }
  } catch (e) {
    if (isAbort(e)) return "cancel";
  }
  const text = `${title}\n${items.map((p) => `${p.label}: ${p.url}`).join("\n")}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancel";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied-link";
  } catch {
    return "failed";
  }
}

const RESULT_TEXT: Record<ShareResult, string> = {
  shared: "แชร์แล้ว",
  "copied-image": "คัดลอกรูปแล้ว",
  "copied-link": "คัดลอกลิงก์แล้ว",
  cancel: "",
  failed: "ทำไม่สำเร็จ",
};

function useFlash() {
  const [msg, setMsg] = useState("");
  const flash = (r: ShareResult) => {
    setMsg(RESULT_TEXT[r]);
    if (RESULT_TEXT[r]) setTimeout(() => setMsg(""), 2000);
  };
  return [msg, flash] as const;
}

const ShareIcon = (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
);
const CopyIcon = (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);

// ปุ่มแชร์รูปทั้งหมดของจุดส่ง (หน้าร้าน / สินค้า / ลายเซ็น / Report)
function ShareAllButton({ items, title }: { items: Media[]; title: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, flash] = useFlash();
  return (
    <button
      disabled={busy}
      onClick={async () => { setBusy(true); flash(await shareImages(items, title)); setBusy(false); }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-200 rounded-lg px-2.5 py-1 transition disabled:opacity-60"
    >
      {ShareIcon}
      {busy ? "กำลังเตรียม…" : msg || `แชร์รูปทั้งหมด (${items.length})`}
    </button>
  );
}

// ─── Photo + lightbox ─────────────────────────────────────────────────────────

function Photo({ url, label, caption, shareTitle, w = 54, h = 54, contain = false }: Media & {
  shareTitle: string; w?: number; h?: number; contain?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [msg, flash] = useFlash();
  return (
    <div className="flex-shrink-0" style={{ width: w }}>
      <button
        onClick={() => setOpen(true)}
        title={label}
        className={`relative block rounded-xl overflow-hidden ring-1 ring-blue-200 hover:ring-blue-500 hover:scale-105 transition ${contain ? "bg-white" : ""}`}
        style={{ width: w, height: h }}
      >
        <img src={url} alt={label} className={`w-full h-full ${contain ? "object-contain" : "object-cover"}`} />
        <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 text-white text-[9px] font-semibold text-center leading-none py-[3px]">{label}</span>
      </button>
      {caption && <div className="text-[10px] leading-tight text-slate-500 mt-1 text-center break-words">{caption}</div>}
      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="text-white text-sm font-semibold mb-1">{label}</div>
          {caption && <div className="text-white/70 text-xs mb-3">{caption}</div>}
          <img
            src={url}
            alt={label}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-[92vw] max-h-[72vh] object-contain rounded-2xl shadow-2xl ${contain ? "bg-white" : ""}`}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={async () => flash(await shareImages([{ url, label }], shareTitle))}
              className="inline-flex items-center gap-1.5 text-white text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-full px-4 py-1.5 transition"
            >
              {ShareIcon} แชร์
            </button>
            <button
              onClick={async () => flash(await copyImage(url))}
              className="inline-flex items-center gap-1.5 text-white text-sm font-medium bg-white/15 hover:bg-white/25 rounded-full px-4 py-1.5 transition"
            >
              {CopyIcon} คัดลอกรูป
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-white/85 hover:text-white text-sm font-medium bg-white/10 hover:bg-white/20 rounded-full px-5 py-1.5 transition"
            >
              ปิด
            </button>
          </div>
          <div className="h-5 mt-2 text-emerald-300 text-sm font-medium">{msg}</div>
        </div>
      )}
    </div>
  );
}

// ─── Status tile — สีตามความสำคัญ: ตีกลับ (แดง) > กำลังส่ง (ส้ม) > ส่งแล้ว (เขียว) ──

type Tone = "danger" | "warn" | "success";

const TONE: Record<Tone, { box: string; sub: string }> = {
  danger: { box: "bg-rose-500 ring-rose-300 text-white", sub: "text-rose-50" },
  warn: { box: "bg-amber-400 ring-amber-200 text-amber-950", sub: "text-amber-900/80" },
  success: { box: "bg-emerald-500 ring-emerald-300 text-white", sub: "text-emerald-50" },
};

function StatusTile({ label, s, tone, icon }: { label: string; s: StatusSummary; tone: Tone; icon: React.ReactNode }) {
  // ไม่มีรายการ = จางลง ไม่แย่งสายตา
  const t = s.store_count > 0 ? TONE[tone] : { box: "bg-white/10 ring-white/10 text-blue-50/70", sub: "text-blue-50/60" };
  return (
    <div className={`rounded-xl px-3.5 py-3 min-w-0 ring-1 ${t.box}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold">{icon}{label}</div>
      <div className="text-2xl font-extrabold leading-none tabular-nums mt-1.5">
        {s.store_count} <span className="text-sm font-semibold">ร้าน</span>
      </div>
      <div className={`text-xs mt-1 tabular-nums ${t.sub}`}>
        {s.box_count} ลัง{s.total_price != null ? ` · ${fmtBahtInt(s.total_price)} บาท` : ""}
      </div>
    </div>
  );
}

// ─── Time tile (แถวไทม์ไลน์ บน header สีฟ้า) ─────────────────────────────────

function Kpi({ label, value, sub, icon, accent = false }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl px-3 py-2.5 min-w-0 ${accent ? "bg-sky-300/30 ring-1 ring-sky-200/60" : "bg-white/10"}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-50/80">
        <span className="text-blue-100">{icon}</span>
        {label}
      </div>
      <div className="text-lg font-extrabold leading-none tabular-nums mt-1 truncate text-white">{value}</div>
      {sub && <div className="text-[11px] mt-1 text-blue-50/70 truncate">{sub}</div>}
    </div>
  );
}

const MapPin = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const TruckIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3v11m10 0h2m4 0h1V9a1 1 0 00-.293-.707l-2-2A1 1 0 0016 6h-3v10" /></svg>
);
const BackIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
);
const ClockIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const CheckIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
);
const CoinIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

// ─── Count unit (ลัง / บิล) ───────────────────────────────────────────────────

function CountUnit({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-extrabold text-slate-800 leading-none tabular-nums">{n}</div>
      <div className="text-[11px] text-slate-400 mt-1">{label}</div>
    </div>
  );
}

// ─── Overview summary card ────────────────────────────────────────────────────

function SummaryCard({ label, value, unit, sub, icon, tint, ring = "ring-blue-100", accent = false }: {
  label: string; value: string | number; unit?: string; sub?: string; icon: React.ReactNode; tint: string; ring?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl shadow-sm p-4 min-w-0 ring-1 ${accent ? "bg-emerald-600 ring-emerald-500" : `bg-white ${ring}`}`}>
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

function DriverCard({ r, date }: { r: DriverReport; date: string }) {
  const [open, setOpen] = useState(true);
  const totalStores = r.in_progress.store_count + r.done.store_count + r.back.store_count;
  const totalBoxes = r.in_progress.box_count + r.done.box_count + r.back.box_count;
  const totalPrice = sumPrice(r.in_progress.total_price, r.done.total_price, r.back.total_price);

  // ร้านแรกที่ส่งสำเร็จ — deliveries เรียงตามเวลาจาก backend แต่หา min กันไว้
  const firstStoreTime = useMemo(() => {
    const times = r.deliveries.map((d) => d.shipping_finish_time).filter((t): t is string => !!t);
    return times.length ? times.reduce((a, b) => (new Date(a) < new Date(b) ? a : b)) : null;
  }, [r.deliveries]);
  // backend ส่งเวลาออกรถที่เก่าสุดของ shipping ที่ยังค้าง "กำลังส่ง" มาด้วย (อาจข้ามวัน/ข้ามเดือน)
  // คิดระยะเวลาเฉพาะเมื่อออกรถในวันที่เลือก ไม่งั้นได้ตัวเลขหลายวันที่ไม่มีความหมาย
  const outIsToday = !!r.shipping_out_time && dayjs(r.shipping_out_time).format("YYYY-MM-DD") === date;
  const outToFirstMin = outIsToday ? minutesBetween(r.shipping_out_time, firstStoreTime) : null;
  const staleOut = r.shipping_out_time && !outIsToday ? `ค้างจาก ${dayjs(r.shipping_out_time).format("DD/MM")}` : undefined;

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [
      ...r.deliveries.map((d): Row => {
        const photos: Media[] = [];
        if (d.store_image_url) photos.push({ url: d.store_image_url, label: "หน้าร้าน" });
        if (d.product_image_url) photos.push({ url: d.product_image_url, label: "สินค้า" });
        if (d.slip_image_url) photos.push({ url: d.slip_image_url, label: "สลิป" });
        if (d.report_image_url) photos.push({ url: d.report_image_url, label: "Report" });
        const signs: Media[] = [];
        if (d.sign_image_url) signs.push({ url: d.sign_image_url, label: "ลูกค้า", caption: d.receiver_type ?? undefined });
        if (d.employee_sign_url) signs.push({ url: d.employee_sign_url, label: "พนักงาน", caption: `เซ็นโดย ${r.emp_name}` });
        return {
          status: "done", time: d.shipping_finish_time, mem_code: d.mem_code, mem_name: d.mem_name,
          lat: d.lat, lng: d.lng, box_amount: d.box_amount,
          shipping_count: d.shipping_count, bill_count: d.bill_count,
          bills: d.bills ?? [], total_price: d.total_price ?? null, note: d.note, photos, signs,
        };
      }),
      ...r.backs.map((b): Row => {
        const photos: Media[] = [];
        if (b.photo_url) photos.push({ url: b.photo_url, label: "รูปหน้าจุด" });
        if (b.report_image_url) photos.push({ url: b.report_image_url, label: "Report" });
        return {
          status: "back", time: b.shipping_finish_time, mem_code: b.mem_code, mem_name: b.mem_name,
          lat: null, lng: null, box_amount: b.box_amount,
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
                  <span className="ml-2 inline-block bg-white/15 rounded-md px-2 py-0.5 text-xs font-semibold text-white">ทั้งหมด {totalStores} ร้าน · {totalBoxes} ลัง</span>
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

        {/* สถานะ — เรียงตามความสำคัญ + มูลค่าออเดอร์ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5">
          <StatusTile label="ตีกลับ" s={r.back} tone="danger" icon={BackIcon} />
          <StatusTile label="กำลังส่ง" s={r.in_progress} tone="warn" icon={ClockIcon} />
          <StatusTile label="ส่งแล้ว" s={r.done} tone="success" icon={CheckIcon} />
          <div className="rounded-xl px-3.5 py-3 min-w-0 bg-white ring-1 ring-emerald-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">{CoinIcon}มูลค่าออเดอร์ที่ออกส่ง</div>
            <div className="text-2xl font-extrabold leading-none tabular-nums mt-1.5 text-emerald-700 truncate">
              {fmtBahtInt(totalPrice)} <span className="text-sm font-semibold">บาท</span>
            </div>
            <div className="text-xs mt-1 text-slate-500 tabular-nums truncate">ส่งสำเร็จแล้ว {fmtBahtInt(r.done.total_price)} บาท</div>
          </div>
        </div>

        {/* ไทม์ไลน์ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2.5">
          <Kpi label="ขึ้นของแรก" value={fmtTime(r.first_load_time)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>} />
          <Kpi label="ออกรถ" value={fmtTime(r.shipping_out_time)} sub={staleOut} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>} />
          <Kpi label="ถึงร้านแรก" value={fmtTime(firstStoreTime)} icon={MapPin} />
          <Kpi label="ออกรถ → ร้านแรก" value={fmtDur(outToFirstMin)} sub={staleOut && firstStoreTime ? "ไม่มีเวลาออกรถของวันนี้" : undefined} accent icon={ClockIcon} />
          <Kpi label="จบงาน" value={r.shift_end ? fmtTime(r.shift_end.shift_end_time) : "-"} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <Kpi label="ระยะทาง" value={r.distance ? `${r.distance.total_km} กม.` : "-"} sub={fmtDur(r.distance?.total_minutes ?? null)} icon={MapPin} />
        </div>
      </div>

      {/* Table */}
      {open && (
        rows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-base">ยังไม่มีรายการส่งในวันนี้</div>
        ) : (
          <>
          {/* มือถือ — การ์ดทีละจุดส่ง ไม่ต้องเลื่อนตารางข้าง */}
          <div className="md:hidden divide-y divide-blue-50">
            {rows.map((row, i) => {
              const done = row.status === "done";
              const media = [...row.photos, ...row.signs.map((s) => ({ ...s, label: `ลายเซ็น${s.label}` }))];
              const shareTitle = `${row.mem_name} ${fmtTime(row.time)}`;
              return (
                <div key={`${row.mem_code}-${i}`} className={`p-4 space-y-3 ${done ? "" : "bg-rose-50/40"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-extrabold tabular-nums ${done ? "text-emerald-600" : "text-rose-500"}`}>{fmtTime(row.time)}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${done ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-100 text-rose-600 ring-1 ring-rose-200"}`}>
                          {done ? "ส่งสำเร็จ" : "ตีกลับ"}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 leading-snug mt-1 break-words">{row.mem_name}</div>
                      <div className="text-xs text-slate-400">
                        <span className="font-mono">{row.mem_code}</span> · {row.box_amount} ลัง · {row.bill_count} บิล
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{fmtBaht(row.total_price)}</div>
                      <div className="text-[11px] text-slate-400">บาท</div>
                    </div>
                  </div>
                  {row.note && <div className={`text-[13px] ${done ? "text-slate-600" : "text-rose-600 font-medium"}`}>{row.note}</div>}
                  {row.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {row.photos.map((p) => <Photo key={p.label} {...p} shareTitle={shareTitle} w={62} h={62} />)}
                    </div>
                  )}
                  {row.signs.length > 0 && (
                    <div className="flex flex-nowrap gap-2">
                      {row.signs.map((s) => <Photo key={s.label} {...s} label={`ลายเซ็น${s.label}`} shareTitle={shareTitle} w={96} h={62} contain />)}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {media.length > 0 && <ShareAllButton items={media} title={shareTitle} />}
                    {row.lat && row.lng && (
                      <a href={mapsUrl(row.lat, row.lng)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 text-xs font-semibold">
                        {MapPin} เปิดแผนที่
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[1100px] text-[13px]">
              <colgroup>
                <col className="w-[112px]" />
                <col className="w-[18%]" />
                <col className="w-[96px]" />
                <col className="w-[23%]" />
                <col className="w-[206px]" />
                <col className="w-[12%]" />
                <col className="w-[170px]" />
              </colgroup>
              <thead>
                <tr className="bg-blue-50 text-blue-700 text-xs">
                  <th className="text-left font-bold px-4 py-3">เวลา · สถานะ</th>
                  <th className="text-left font-bold px-4 py-3">ร้าน</th>
                  <th className="text-center font-bold px-4 py-3">ลัง · บิล</th>
                  <th className="text-left font-bold px-4 py-3">รูปหลักฐาน</th>
                  <th className="text-left font-bold px-4 py-3">ลายเซ็น</th>
                  <th className="text-left font-bold px-4 py-3">หมายเหตุ</th>
                  <th className="text-right font-bold px-4 py-3 text-emerald-700">มูลค่า (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const done = row.status === "done";
                  const media = [...row.photos, ...row.signs.map((s) => ({ ...s, label: `ลายเซ็น${s.label}` }))];
                  const shareTitle = `${row.mem_name} ${fmtTime(row.time)}`;
                  return (
                    <tr key={`${row.mem_code}-${i}`} className={`border-t border-blue-50 hover:bg-blue-50/40 transition align-top ${done ? "" : "bg-rose-50/40"}`}>
                      {/* เวลา + สถานะ */}
                      <td className="px-4 py-4">
                        <div className={`font-extrabold text-[15px] tabular-nums ${done ? "text-emerald-600" : "text-rose-500"}`}>{fmtTime(row.time)}</div>
                        <span className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${done ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-100 text-rose-600 ring-1 ring-rose-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {done ? "ส่งสำเร็จ" : "ตีกลับ"}
                        </span>
                      </td>
                      {/* ร้าน + แผนที่ */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800 leading-snug break-words">{row.mem_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{row.mem_code}</div>
                        {row.lat && row.lng && (
                          <a href={mapsUrl(row.lat, row.lng)} target="_blank" rel="noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold">
                            {MapPin} เปิดแผนที่
                          </a>
                        )}
                      </td>
                      {/* ลัง · บิล */}
                      <td className="px-4 py-4">
                        <div className="flex items-start justify-center gap-3">
                          <CountUnit n={row.box_amount} label="ลัง" />
                          <span className="text-slate-200 text-lg leading-none">|</span>
                          <CountUnit n={row.bill_count} label="บิล" />
                        </div>
                      </td>
                      {/* รูปหลักฐาน + แชร์ทั้งหมด */}
                      <td className="px-4 py-4">
                        {row.photos.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {row.photos.map((p) => <Photo key={p.label} {...p} shareTitle={shareTitle} />)}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                        {media.length > 0 && <div className="mt-2"><ShareAllButton items={media} title={shareTitle} /></div>}
                      </td>
                      {/* ลายเซ็น ลูกค้า + พนักงาน บรรทัดเดียวกัน */}
                      <td className="px-4 py-4">
                        {row.signs.length > 0 ? (
                          <div className="flex flex-nowrap gap-2">
                            {row.signs.map((s) => <Photo key={s.label} {...s} label={`ลายเซ็น${s.label}`} shareTitle={shareTitle} w={88} h={56} contain />)}
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
                                    <span className="font-mono text-emerald-600/70 whitespace-nowrap">{b.sh_running}</span>
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
          </>
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
    const inProgBoxes = sum((d) => d.in_progress.box_count);
    const totalKm = Math.round(sum((d) => d.distance?.total_km ?? 0) * 10) / 10;
    const donePrice = sumPrice(...filtered.map((d) => d.done.total_price));
    const totalPrice = sumPrice(...filtered.flatMap((d) => [d.done.total_price, d.in_progress.total_price, d.back.total_price]));
    const attempted = doneStores + backStores;
    const successRate = attempted > 0 ? Math.round((doneStores / attempted) * 100) : 0;
    return { drivers: filtered.length, doneStores, doneBoxes, backStores, backBoxes, inProgStores, inProgBoxes, totalKm, donePrice, totalPrice, attempted, successRate };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#eaf1fe]">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur border-b border-blue-100 sticky top-0 z-20">
        <div className="max-w-[1300px] mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
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

      <div className="max-w-[1300px] mx-auto px-4 py-5 space-y-5">
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
            {/* เรียงตามความสำคัญ: ตีกลับ > กำลังส่ง > ส่งสำเร็จ */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <SummaryCard label="ตีกลับ" value={agg.backStores} unit="ร้าน" sub={`${agg.backBoxes} ลัง`}
                tint={agg.backStores > 0 ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-400"} ring={agg.backStores > 0 ? "ring-rose-300 ring-2" : undefined}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>} />
              <SummaryCard label="กำลังส่ง" value={agg.inProgStores} unit="ร้าน" sub={`${agg.inProgBoxes} ลัง`}
                tint={agg.inProgStores > 0 ? "bg-amber-400 text-amber-950" : "bg-amber-50 text-amber-500"} ring={agg.inProgStores > 0 ? "ring-amber-300 ring-2" : undefined}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <SummaryCard label="ส่งสำเร็จ" value={agg.doneStores} unit="ร้าน" sub={`${agg.doneBoxes} ลัง`} tint="bg-emerald-50 text-emerald-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <SummaryCard label="อัตราส่งสำเร็จ" value={agg.successRate} unit="%" sub={`จาก ${agg.attempted} ร้าน`} tint="bg-indigo-50 text-indigo-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
              <SummaryCard label="พนักงานออกส่ง" value={agg.drivers} unit="คน" tint="bg-blue-50 text-blue-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3v11m10 0h2m4 0h1V9a1 1 0 00-.293-.707l-2-2A1 1 0 0016 6h-3v10" /></svg>} />
              <SummaryCard label="ระยะทางรวม" value={agg.totalKm} unit="กม." tint="bg-violet-50 text-violet-600"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
              <SummaryCard label="มูลค่าออเดอร์ที่ออกส่ง" value={fmtBahtInt(agg.totalPrice)} unit="บาท" sub={`ส่งสำเร็จ ${fmtBahtInt(agg.donePrice)} บาท`} accent tint="bg-white/20 text-white"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-white ring-1 ring-blue-100 p-12 text-center text-slate-400 text-base">
                ไม่พบพนักงานตามตัวกรอง
              </div>
            ) : (
              filtered.map((r) => <DriverCard key={r.emp_code} r={r} date={date} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
