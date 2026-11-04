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
  driver_code: string | null;
  driver_tel: string | null;
  car_number: string | null;
  route_code: string | null;
  route_name: string | null;
  /** มีเฉพาะตอนกำลังส่ง (ออกรถแล้ว ยังไม่ส่งสำเร็จ) — พิกัดจากมือถือคนขับตอนออกรถ / ตอนปิดงานร้านล่าสุด */
  live_location: LiveLocation | null;
  events: TimelineEvent[];
}

interface LiveLocation {
  type: "STORE_DELIVERED" | "DEPARTURE";
  store_name: string | null;
  at: string | null;
  maps_url: string | null;
  stores_delivered: number;
  stores_total: number;
}

const fmtDateTime = (iso: string | null) => (iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : "");

/**
 * ข้อความส่งลูกค้า — ไม่ใส่ชื่อร้านอื่นที่รถเพิ่งไปส่ง (เหมือนหน้า tracking ของลูกค้า ที่ไม่ส่งรหัสร้านอื่นออกไป)
 * บอกแค่เวลา + จำนวนร้านที่ส่งแล้ว + ลิงก์แผนที่
 */
function buildShareText(so: string, picking: PickingTimeline | null, delivery: DeliveryTimeline | null, latest: TimelineEvent | null) {
  const lines = [`สถานะออเดอร์ ${so}`];
  const store = picking?.mem_name ?? delivery?.mem_name;
  if (store) lines.push(`ร้าน: ${store}`);
  if (picking?.bill_number) lines.push(`ใบกำกับ: ${picking.bill_number}`);
  const status = delivery?.status ?? (picking ? "อยู่ในคลัง" : "");
  if (status) lines.push(`สถานะ: ${status}${latest?.at ? ` (${latest.label} ${fmtDateTime(latest.at)})` : ""}`);
  if (delivery?.driver) {
    const route = [delivery.route_code, delivery.route_name].filter(Boolean).join(" ");
    lines.push(`คนขับ: ${delivery.driver}${route ? ` · เส้นทาง ${route}` : ""}`);
  }
  if (delivery?.driver_tel) lines.push(`เบอร์คนขับ: ${delivery.driver_tel}`);
  if (delivery?.car_number) lines.push(`ทะเบียนรถ: ${delivery.car_number}`);
  const live = delivery?.live_location;
  if (live) {
    lines.push(live.type === "STORE_DELIVERED"
      ? `ตำแหน่งรถล่าสุด: ส่งแล้ว ${live.stores_delivered}/${live.stores_total} ร้าน (อัปเดต ${fmtTime(live.at)})`
      : `ตำแหน่งรถล่าสุด: ออกรถแล้ว ยังไม่ถึงร้านแรก (ออก ${fmtTime(live.at)})`);
    if (live.maps_url) lines.push(`แผนที่: ${live.maps_url}`);
  }
  return lines.join("\n");
}

/** clipboard API ใช้ได้เฉพาะ https/localhost — หน้าที่เปิดผ่าน http ใช้ textarea + execCommand แทน */
async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* ใช้วิธีสำรองด้านล่าง */ }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

function ShareButtons({ text }: { text: string }) {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 2000); };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={async () => flash((await copyText(text)) ? "คัดลอกแล้ว" : "คัดลอกไม่สำเร็จ")}
        className="text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-200 rounded-lg px-3 py-1.5" title={text}>
        คัดลอกส่งลูกค้า
      </button>
      {canShare && (
        <button type="button" onClick={() => navigator.share({ text }).catch(() => {})}
          className="text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200 rounded-lg px-3 py-1.5">
          แชร์
        </button>
      )}
      {msg && <span role="status" className="text-xs font-semibold text-slate-500">{msg}</span>}
    </div>
  );
}

/** รถอยู่ที่ไหน — แสดงระหว่างออกรถ → ส่งสำเร็จ */
function LiveLocationBar({ live }: { live: LiveLocation }) {
  return (
    <div className="mx-4 md:mx-6 mt-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1" role="group" aria-label="ตำแหน่งรถล่าสุด">
      <span className="text-sm font-extrabold text-amber-800">ตำแหน่งรถล่าสุด</span>
      <span className="text-sm text-slate-700">
        {live.type === "STORE_DELIVERED"
          ? <>ส่งร้านล่าสุด <b>{live.store_name}</b> เมื่อ <b className="tabular-nums">{fmtTime(live.at)}</b></>
          : <>ออกรถแล้ว ยังไม่ถึงร้านแรก · ออกรถ <b className="tabular-nums">{fmtTime(live.at)}</b></>}
        <span className="text-slate-500"> · ส่งแล้ว {live.stores_delivered}/{live.stores_total} ร้าน</span>
      </span>
      {live.maps_url
        ? <a href={live.maps_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">เปิดแผนที่ ↗</a>
        : <span className="text-xs text-slate-400">ไม่มีพิกัด</span>}
      <span className="text-xs text-slate-400 w-full">พิกัดจากมือถือคนขับตอนออกรถ / ตอนปิดงานแต่ละร้าน (ไม่ใช่ GPS สด)</span>
    </div>
  );
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

interface Cell { n: Node; prevAt: string | null; skipped: boolean; first: boolean }

const COL_W = { width: "calc(7.5rem * var(--fs, 1))", minWidth: "calc(7.5rem * var(--fs, 1))" };
const ROW_HEAD = "sticky left-0 z-10 bg-slate-50 text-left text-xs font-bold text-slate-500 px-3 py-1.5 whitespace-nowrap border-r border-slate-200";
// เส้นแบ่งระหว่างฝั่งคลังกับขนส่ง
const sideStart = (c: Cell) => (c.first ? "border-l-2 border-dashed border-slate-300" : "");

/** หัวแถวด้านซ้าย + หนึ่งคอลัมน์ต่อขั้น — ทุกขั้นเรียงตรงกันทุกแถว (ขั้นตอน / เวลา / วันที่ / พนักงาน / ห่างจากขั้นก่อน) */
function TimelineTable({ cells, groups }: { cells: Cell[]; groups: { label: string; span: number; tone: string }[] }) {
  return (
    <table className="border-separate border-spacing-0 text-center">
      <thead>
        <tr>
          <th scope="col" className={`${ROW_HEAD} border-b`}>ฝ่าย</th>
          {groups.map((g, i) => (
            <th key={g.label} scope="colgroup" colSpan={g.span}
              className={`text-xs font-extrabold px-2 py-1.5 border-b border-slate-200 ${g.tone} ${i > 0 ? "border-l-2 border-dashed border-l-slate-300" : ""}`}>
              {g.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" className={ROW_HEAD}>ขั้นตอน</th>
          {cells.map((c, i) => {
            const tone = TONE[EXTRA_STEPS.has(c.n.step) ? c.n.step : c.n.side];
            const done = !!c.n.at;
            return (
              <td key={i} style={COL_W} className={`relative px-2 pt-8 pb-1 align-top ${sideStart(c)}`}>
                {/* เส้นเชื่อม + จุด */}
                <div className={`absolute left-0 right-0 top-[14px] h-0.5 ${done ? "bg-slate-300" : "border-t border-dashed border-slate-300"}`} />
                <span className={`absolute left-1/2 -translate-x-1/2 top-1.5 w-4 h-4 rounded-full ring-4 ${done ? tone.dot : "bg-white ring-slate-200 border-2 border-slate-300"}`} />
                <div className={`text-sm font-extrabold leading-tight ${done ? tone.text : "text-slate-400"}`}>{c.n.label}</div>
              </td>
            );
          })}
        </tr>
        <tr>
          <th scope="row" className={ROW_HEAD}>เวลา</th>
          {cells.map((c, i) => (
            <td key={i} className={`px-2 py-1 tabular-nums ${sideStart(c)} ${c.n.at ? "text-base font-extrabold text-slate-800" : c.skipped ? "text-xs font-semibold text-slate-400" : "text-base font-extrabold text-slate-300"}`}>
              {c.n.at ? fmtTime(c.n.at) : c.skipped ? "ไม่มีบันทึก" : "รอ"}
            </td>
          ))}
        </tr>
        <tr>
          <th scope="row" className={ROW_HEAD}>วันที่</th>
          {cells.map((c, i) => (
            <td key={i} className={`px-2 py-1 text-xs font-semibold text-slate-500 tabular-nums ${sideStart(c)}`}>{c.n.at ? fmtDate(c.n.at) : "-"}</td>
          ))}
        </tr>
        <tr>
          <th scope="row" className={ROW_HEAD}>พนักงาน / รายละเอียด</th>
          {cells.map((c, i) => (
            <td key={i} className={`px-2 py-1 text-xs text-slate-600 break-words align-top ${sideStart(c)}`} title={c.n.detail ?? ""}>{c.n.detail ?? "-"}</td>
          ))}
        </tr>
        <tr>
          <th scope="row" className={ROW_HEAD}>ห่างจากขั้นก่อน</th>
          {cells.map((c, i) => (
            <td key={i} className={`px-2 py-1 text-xs font-semibold text-slate-500 tabular-nums ${sideStart(c)}`}>{c.n.at ? fmtGap(minutesBetween(c.prevAt, c.n.at)) || "-" : "-"}</td>
          ))}
        </tr>
      </tbody>
    </table>
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

  // ระยะห่างคิดจากขั้นก่อนหน้าที่มีเวลา
  let lastAt: string | null = null;
  const lastTimed = nodes.reduce((acc, n, i) => (n.at ? i : acc), -1);
  const cells: Cell[] = nodes.map((n, i) => {
    const cell = { n, prevAt: lastAt, skipped: !n.at && i < lastTimed, first: i === pickingCount && pickingCount > 0 };
    if (n.at) lastAt = n.at;
    return cell;
  });
  const deliveryCount = nodes.length - pickingCount;
  const groups = [
    ...(pickingCount ? [{ label: "คลังสินค้า", span: pickingCount, tone: "text-blue-700 bg-blue-50" }] : []),
    ...(deliveryCount ? [{ label: "ขนส่ง", span: deliveryCount, tone: "text-emerald-700 bg-emerald-50" }] : []),
  ];

  const latestEvent = timed[timed.length - 1] ?? null;
  const shareText = buildShareText(shRunning, picking, delivery, latestEvent);
  const route = [delivery?.route_code ?? picking?.route_code, delivery?.route_name].filter(Boolean).join(" ");
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
              {picking?.bill_number ? ` · ใบกำกับ ${picking.bill_number}` : ""}
            </div>
            {(delivery?.driver || route) && (
              <div className="text-sm text-slate-600 mt-0.5 flex flex-wrap gap-x-3" aria-label="ข้อมูลขนส่ง">
                {delivery?.driver && <span>คนขับ <b className="text-slate-800">{delivery.driver}</b>{delivery.driver_code && delivery.driver_code !== delivery.driver ? <span className="text-slate-500"> ({delivery.driver_code})</span> : null}</span>}
                {route && <span>เส้นทาง <b className="text-slate-800">{route}</b></span>}
                {delivery?.driver && <span>โทร {delivery.driver_tel
                  ? <a href={`tel:${delivery.driver_tel}`} className="font-bold text-blue-700 hover:underline">{delivery.driver_tel}</a>
                  : <span className="text-slate-400">ไม่มีเบอร์ในระบบ</span>}</span>}
                {delivery?.driver && <span>ทะเบียน {delivery.car_number ? <b className="text-slate-800">{delivery.car_number}</b> : <span className="text-slate-400">ไม่ได้ผูกรถ</span>}</span>}
              </div>
            )}
          </div>
          {first && (
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500">{finish ? "เข้าระบบ → ส่งสำเร็จ" : "ตั้งแต่เข้าระบบ"}</div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">{fmtGap(minutesBetween(first, finish ?? new Date().toISOString()))}</div>
            </div>
          )}
          {!loading && nodes.length > 0 && <ShareButtons text={shareText} />}
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800 text-sm font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5">ปิด</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : nodes.length === 0 ? (
          <div className="py-8 text-center text-slate-500">ไม่พบบิล {shRunning} ทั้งในระบบคลังและระบบขนส่ง</div>
        ) : (
          <>
          {delivery?.live_location && <LiveLocationBar live={delivery.live_location} />}
          <div className="px-4 md:px-6 py-4">
            {/* หัวกลุ่มอยู่ในตารางแล้ว — ตรงนี้แจ้งเฉพาะฝั่งที่โหลดไม่ได้ */}
            {(errors.picking || errors.delivery) && (
              <div className="flex gap-4 text-xs font-bold mb-1">
                {errors.picking && <span className="text-blue-700">● คลังสินค้า ({errors.picking})</span>}
                {errors.delivery && <span className="text-emerald-700">● ขนส่ง ({errors.delivery})</span>}
              </div>
            )}
            <div className="overflow-x-auto pb-2 rounded-xl ring-1 ring-slate-200">
              <TimelineTable cells={cells} groups={groups} />
            </div>
            <div className="text-[length:calc(11px*var(--fs,1))] text-slate-400 mt-2">
              เวลาระหว่างขั้นคิดจากขั้นก่อนหน้าที่มีเวลา · "รอ" = ยังไม่ถึงขั้นนั้น · "ไม่มีบันทึก" = ผ่านขั้นนั้นไปแล้วแต่ระบบไม่ได้เก็บเวลา · เริ่มจัดใช้เวลาที่เร็วกว่าระหว่างเวลาเริ่มจัดของร้านกับรายการแรกที่หยิบ
            </div>
          </div>
          </>
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
