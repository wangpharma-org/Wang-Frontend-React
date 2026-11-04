import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API, authHeader, fmtDate, fmtTime } from "./shared";

// OPHMBC-331 — timeline ของออเดอร์หนึ่งใบ แนวนอน: ฝั่งคลัง (order-picking) ต่อด้วยฝั่งขนส่ง (logistics)
// แสดงในหน้า (กางใต้แถวในตาราง / แผงจากช่องค้นหา) ไม่ใช่ popup

const ORDER_API = import.meta.env.VITE_API_URL_ORDER ?? "";

interface TimelineEvent {
  step: string;
  label: string;
  at: string | null;
  detail: string | null;
}

interface PickingTimeline {
  sh_running: string;
  mem_code: string;
  mem_name: string | null;
  route_code: string | null;
  bill_number: string | null;
  events: TimelineEvent[];
}

interface DeliveryTimeline {
  sh_running: string;
  status: string;
  mem_name: string;
  box_amount: number;
  driver: string | null;
  events: TimelineEvent[];
}

type Side = "picking" | "delivery";
interface Node extends TimelineEvent { side: Side }

// เหตุการณ์ที่เกิดได้หลายครั้ง แทรกตามเวลาระหว่างขั้นหลัก
const EXTRA_STEPS = new Set(["rt", "back", "transferred"]);

const TONE: Record<string, { dot: string; text: string }> = {
  picking: { dot: "bg-blue-600 ring-blue-200", text: "text-blue-700" },
  delivery: { dot: "bg-emerald-600 ring-emerald-200", text: "text-emerald-700" },
  back: { dot: "bg-rose-500 ring-rose-200", text: "text-rose-700" },
  rt: { dot: "bg-amber-500 ring-amber-200", text: "text-amber-700" },
  transferred: { dot: "bg-violet-500 ring-violet-200", text: "text-violet-700" },
};

const minutesBetween = (from: string | null, to: string | null) => {
  if (!from || !to) return null;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
};
const fmtGap = (m: number | null) => {
  if (m == null) return "";
  if (m < 0) return "พร้อมกัน";
  if (m < 60) return `${m} น.`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} ชม. ${m % 60} น.`;
  return `${Math.floor(m / 1440)} วัน ${Math.floor((m % 1440) / 60)} ชม.`;
};

/** ขั้นหลักคงลำดับงาน — เหตุการณ์แทรก (RT / ตีกลับ / โอนงาน) วางตามเวลาก่อนขั้นหลักถัดไปที่มีเวลาหลังกว่า */
function arrange(events: TimelineEvent[], side: Side): Node[] {
  const main = events.filter((e) => !EXTRA_STEPS.has(e.step));
  const extras = events
    .filter((e) => EXTRA_STEPS.has(e.step) && e.at)
    .sort((a, b) => new Date(a.at!).getTime() - new Date(b.at!).getTime());
  const out: Node[] = [];
  for (const m of main) {
    while (m.at && extras.length && new Date(extras[0].at!) < new Date(m.at)) out.push({ ...extras.shift()!, side });
    out.push({ ...m, side });
  }
  return [...out, ...extras.map((e) => ({ ...e, side }))];
}

/**
 * ฝั่งขนส่งเรียงตามเวลาจริง — ตีกลับแล้วขึ้นรถใหม่ได้ และตอนตีกลับประวัติสแกนรอบแรกถูกลบ
 * ขั้นที่ยังไม่มีเวลาต่อท้ายตามลำดับเดิม · ขึ้นรถ/ออกรถหลังตีกลับติดป้าย "รอบใหม่"
 */
function chronological(events: TimelineEvent[], side: Side): Node[] {
  const timed = events.filter((e) => e.at).sort((a, b) => new Date(a.at!).getTime() - new Date(b.at!).getTime());
  let backed = false;
  const out: Node[] = timed.map((e) => {
    const relabel = backed && (e.step === "loaded" || e.step === "departed") ? `${e.label} (รอบใหม่)` : e.label;
    if (e.step === "back") backed = true;
    return { ...e, label: relabel, side };
  });
  return [...out, ...events.filter((e) => !e.at).map((e) => ({ ...e, side }))];
}

/** skipped = ไม่มีเวลาแต่ขั้นหลังจากนี้มีแล้ว → ไม่มีบันทึกของขั้นนี้ (ไม่ใช่ยังรอ) */
function TimelineNode({ n, prevAt, showDate, skipped }: { n: Node; prevAt: string | null; showDate: boolean; skipped: boolean }) {
  const tone = TONE[EXTRA_STEPS.has(n.step) ? n.step : n.side];
  const done = !!n.at;
  const gap = done ? fmtGap(minutesBetween(prevAt, n.at)) : "";
  return (
    <div className="relative flex-none w-28 pt-9">
      {/* เส้นเชื่อม + ระยะเวลาจากขั้นก่อนหน้า */}
      <div className={`absolute left-0 right-0 top-[18px] h-0.5 ${done ? "bg-slate-300" : "bg-slate-200 border-t border-dashed border-slate-300"}`} />
      {gap && <div className="absolute -left-10 top-0 w-20 text-center text-[11px] font-semibold text-slate-500 tabular-nums">{gap}</div>}
      <span className={`absolute left-1/2 -translate-x-1/2 top-2.5 w-4 h-4 rounded-full ring-4 ${done ? tone.dot : "bg-white ring-slate-200 border-2 border-slate-300"}`} />
      <div className="px-2 text-center">
        <div className={`text-sm font-extrabold leading-tight ${done ? tone.text : "text-slate-400"}`}>{n.label}</div>
        <div className={`tabular-nums mt-0.5 ${done ? "text-base font-extrabold text-slate-800" : skipped ? "text-xs font-semibold text-slate-400" : "text-base font-extrabold text-slate-300"}`}>{done ? fmtTime(n.at) : skipped ? "ไม่มีบันทึก" : "รอ"}</div>
        {done && showDate && <div className="text-[11px] font-semibold text-slate-500">{fmtDate(n.at)}</div>}
        {n.detail && <div className="text-[11px] text-slate-500 mt-0.5 break-words" title={n.detail}>{n.detail}</div>}
      </div>
    </div>
  );
}

export default function OrderTimeline({ shRunning, onClose }: { shRunning: string; onClose: () => void }) {
  const [picking, setPicking] = useState<PickingTimeline | null>(null);
  const [delivery, setDelivery] = useState<DeliveryTimeline | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Side, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const fail = (e: unknown) =>
      axios.isAxiosError(e) && e.response?.status === 404 ? "ไม่พบบิลนี้" : "โหลดไม่สำเร็จ";
    Promise.allSettled([
      axios.get<PickingTimeline>(`${ORDER_API}/api/order-timeline/${encodeURIComponent(shRunning)}`, { headers: authHeader() }),
      axios.get<DeliveryTimeline>(`${API}/api/logistic/driver-performance/order-timeline/${encodeURIComponent(shRunning)}`, { headers: authHeader() }),
    ]).then(([p, d]) => {
      if (!alive) return;
      setPicking(p.status === "fulfilled" ? p.value.data : null);
      setDelivery(d.status === "fulfilled" ? d.value.data : null);
      setErrors({
        ...(p.status === "rejected" ? { picking: fail(p.reason) } : {}),
        ...(d.status === "rejected" ? { delivery: fail(d.reason) } : {}),
      });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [shRunning]);

  const nodes = useMemo(
    () => [...arrange(picking?.events ?? [], "picking"), ...chronological(delivery?.events ?? [], "delivery")],
    [picking, delivery],
  );
  const timed = nodes.filter((n) => n.at);
  const first = timed[0]?.at ?? null;
  const finish = nodes.find((n) => n.step === "delivered" && n.at)?.at ?? null;
  const pickingCount = nodes.filter((n) => n.side === "picking").length;

  // วันที่แสดงเมื่อเปลี่ยนวันจากขั้นก่อนหน้า (ขั้นแรกแสดงเสมอ)
  let lastAt: string | null = null;
  let lastDay = "";
  const lastTimed = nodes.reduce((acc, n, i) => (n.at ? i : acc), -1);
  const rendered = nodes.map((n, i) => {
    const day = n.at ? fmtDate(n.at) : "";
    const node = { n, prevAt: lastAt, showDate: !!n.at && day !== lastDay, skipped: !n.at && i < lastTimed };
    if (n.at) { lastAt = n.at; lastDay = day; }
    return node;
  });

  const status = delivery?.status ?? (picking ? "อยู่ในคลัง" : "");
  const statusTone = status === "ส่งแล้ว" ? "bg-emerald-100 text-emerald-700" : status === "ตีกลับ" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800";

  return (
    <section className="rounded-2xl bg-white ring-1 ring-blue-200 shadow-sm text-left" aria-label={`Timeline ออเดอร์ ${shRunning}`}>
        <div className="px-4 md:px-6 py-3 border-b border-slate-100 flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-extrabold text-slate-900">Timeline ออเดอร์</span>
              <span className="font-mono font-bold text-blue-700">{shRunning}</span>
              {status && <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 ${statusTone}`}>{status}</span>}
            </div>
            <div className="text-sm text-slate-600 mt-0.5">
              {picking?.mem_name ?? delivery?.mem_name ?? ""}
              {picking?.mem_code ? <span className="font-mono text-slate-400"> · {picking.mem_code}</span> : null}
              {picking?.route_code ? ` · ${picking.route_code}` : ""}
              {picking?.bill_number ? ` · ใบกำกับ ${picking.bill_number}` : ""}
              {delivery?.driver ? ` · คนขับ ${delivery.driver}` : ""}
            </div>
          </div>
          {first && (
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500">{finish ? "เข้าระบบ → ส่งสำเร็จ" : "ตั้งแต่เข้าระบบ"}</div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">{fmtGap(minutesBetween(first, finish ?? new Date().toISOString()))}</div>
            </div>
          )}
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800 text-sm font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5">ปิด</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : nodes.length === 0 ? (
          <div className="py-8 text-center text-slate-500">ไม่พบบิล {shRunning} ทั้งในระบบคลังและระบบขนส่ง</div>
        ) : (
          <div className="px-4 md:px-6 py-4">
            {/* ป้ายกลุ่ม */}
            <div className="flex gap-4 text-xs font-bold mb-1">
              <span className="text-blue-700">● คลังสินค้า {errors.picking ? `(${errors.picking})` : ""}</span>
              <span className="text-emerald-700">● ขนส่ง {errors.delivery ? `(${errors.delivery})` : ""}</span>
            </div>
            <div className="overflow-x-auto pb-2">
              <ol className="flex min-w-max pl-6 pr-6">
                {rendered.map(({ n, prevAt, showDate, skipped }, i) => (
                  <li key={`${n.side}-${n.step}-${i}`} className={`flex ${i === pickingCount && pickingCount > 0 ? "ml-6 pl-6 border-l-2 border-dashed border-slate-200" : ""}`}>
                    <TimelineNode n={n} prevAt={prevAt} showDate={showDate} skipped={skipped} />
                  </li>
                ))}
              </ol>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              เวลาระหว่างขั้นคิดจากขั้นก่อนหน้าที่มีเวลา · "รอ" = ยังไม่ถึงขั้นนั้น · "ไม่มีบันทึก" = ผ่านขั้นนั้นไปแล้วแต่ระบบไม่ได้เก็บเวลา · เริ่มจัดใช้เวลาที่เร็วกว่าระหว่างเวลาเริ่มจัดของร้านกับรายการแรกที่หยิบ
            </div>
          </div>
        )}
    </section>
  );
}

/** เลข SO ในตาราง — กดเพื่อกาง/พับ timeline ใต้แถว */
export function SoButton({ so, active, onToggle }: { so: string; active: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={active} title={active ? "พับ timeline" : "ดู timeline ออเดอร์"}
      className={`block font-semibold hover:underline ${active ? "text-blue-900" : "text-blue-700 hover:text-blue-900"}`}>
      {so} <span aria-hidden="true">{active ? "▴" : "▾"}</span>
    </button>
  );
}

/** แถวที่กางใต้แถวร้าน — กินทุกคอลัมน์ */
export function TimelineRow({ so, colSpan, onClose }: { so: string; colSpan: number; onClose: () => void }) {
  return (
    <tr className="bg-blue-50/40">
      <td colSpan={colSpan} className="px-3 py-3">
        <OrderTimeline shRunning={so} onClose={onClose} />
      </td>
    </tr>
  );
}
