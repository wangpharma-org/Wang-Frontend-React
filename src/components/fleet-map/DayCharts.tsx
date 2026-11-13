import { useMemo, useState } from "react";
import type { IdlingPeriod, Trip, VehiclePath } from "./api";

/** วันที่ (เวลาไทย) → ช่วงเวลา 00:00–24:00 เป็น ms */
const dayBounds = (date: string) => {
  const start = Date.parse(`${date}T00:00:00+07:00`);
  return { start, end: start + 86_400_000 };
};
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/**
 * Timeline ของวัน — ขับ (เขียว) จอดติดเครื่องยนต์ (ส้ม) จอดดับเครื่อง (เทา)
 * ใช้เวลาเริ่ม/จบของ trip และช่วงจอดติดเครื่องยนต์จาก Cartrack
 */
export function DayTimeline({ date, trips, idling, ongoingFrom, now = Date.now() }: {
  date: string;
  trips: Trip[];
  idling: IdlingPeriod[];
  /** เที่ยวที่ยังไม่จบ (Cartrack ยังไม่ส่งใน trips) — เริ่มวิ่งเมื่อ ms นี้และยังวิ่งอยู่ */
  ongoingFrom?: number | null;
  now?: number;
}) {
  const { start, end } = dayBounds(date);
  const until = Math.min(end, now);
  const pct = (ms: number) => `${((Math.min(Math.max(ms, start), end) - start) / 86_400_000) * 100}%`;
  const width = (a: number, b: number) => `${((Math.min(b, end) - Math.max(a, start)) / 86_400_000) * 100}%`;
  const drives = trips
    .map((t) => ({ s: t.start ? Date.parse(t.start) : NaN, e: t.end ? Date.parse(t.end) : NaN }))
    .filter((x) => Number.isFinite(x.s) && Number.isFinite(x.e) && x.e > x.s);
  if (ongoingFrom && ongoingFrom < until) drives.push({ s: ongoingFrom, e: until });
  const idles = idling.map((i) => ({ s: Date.parse(i.start), e: Date.parse(i.end), place: i.place })).filter((x) => x.e > x.s);
  return (
    <div>
      <div className="relative h-6 overflow-hidden rounded bg-gray-200">
        {/* ช่วงเวลาที่ยังไม่ถึง (วันนี้) */}
        {until < end && <div className="absolute inset-y-0 bg-white" style={{ left: pct(until), right: 0 }} />}
        {drives.map((d, i) => (
          <div
            key={`d${i}`}
            className="absolute inset-y-0 bg-green-600"
            style={{ left: pct(d.s), width: width(d.s, d.e), minWidth: 2 }}
            title={`ขับขี่ ${hhmm(d.s)}–${hhmm(d.e)} น.`}
          />
        ))}
        {idles.map((d, i) => (
          <div
            key={`i${i}`}
            className="absolute inset-y-0 bg-amber-400"
            style={{ left: pct(d.s), width: width(d.s, d.e), minWidth: 2 }}
            title={`จอดติดเครื่องยนต์ ${hhmm(d.s)}–${hhmm(d.e)} น.${d.place ? ` ${d.place}` : ""}`}
          />
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[10px] text-gray-500">
        {TICKS.map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${(h / 24) * 100}%` }}>
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-gray-600">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-600" />ขับขี่</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />จอดติดเครื่องยนต์</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gray-200" />จอดดับเครื่องยนต์</span>
      </div>
    </div>
  );
}

/** กราฟความเร็วตลอดวัน จากจุด GPS ของเส้นทาง */
export function SpeedChart({ date, path }: { date: string; path: VehiclePath }) {
  const { start } = dayBounds(date);
  const W = 600;
  const H = 120;
  // จุดสัญญาณบางจุดรายงานความเร็ว 0 ระหว่างวิ่ง — ใช้ค่าสูงสุดรายนาทีให้กราฟอ่านง่าย
  const data = useMemo(() => {
    const byMinute = new Map<number, number>();
    for (const [, , ts, speed] of path.points) {
      const m = Math.floor(ts / 60);
      byMinute.set(m, Math.max(byMinute.get(m) ?? 0, speed));
    }
    return [...byMinute.entries()].sort((a, b) => a[0] - b[0]).map(([m, y]) => ({ x: m * 60_000, y }));
  }, [path]);
  const maxY = Math.max(60, ...data.map((d) => d.y));
  const top = Math.ceil(maxY / 20) * 20;
  const px = (ms: number) => ((ms - start) / 86_400_000) * W;
  const py = (v: number) => H - (v / top) * H;
  const line = data.map((d, i) => `${i ? "L" : "M"}${px(d.x).toFixed(1)},${py(d.y).toFixed(1)}`).join(" ");
  const peak = data.reduce((m, d) => (d.y > m.y ? d : m), { x: 0, y: 0 });
  if (data.length < 2) return <p className="text-sm text-gray-500">ไม่พบข้อมูลความเร็วในวันที่เลือก</p>;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="h-36 w-full" preserveAspectRatio="none" role="img" aria-label="กราฟความเร็ว">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={0} x2={W} y1={py(top * f)} y2={py(top * f)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={2} y={py(top * f) - 2} fontSize={9} fill="#6b7280">{Math.round(top * f)}</text>
          </g>
        ))}
        <path d={line} fill="none" stroke="#2563eb" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {TICKS.map((h) => (
          <text key={h} x={(h / 24) * W} y={H + 12} fontSize={9} fill="#6b7280" textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}>
            {String(h).padStart(2, "0")}
          </text>
        ))}
      </svg>
      <p className="text-[11px] text-gray-500">
        แสดงความเร็วสูงสุดในแต่ละนาที (กม./ชม.) ความเร็วสูงสุดของวันคือ {Math.round(peak.y)} กม./ชม. เมื่อเวลา {hhmm(peak.x)} น.
      </p>
    </div>
  );
}

type Series = "speed" | "altitude" | "battery";
const SERIES: { key: Series; label: string; unit: string; color: string; idx: number }[] = [
  { key: "speed", label: "ความเร็ว", unit: "กม./ชม.", color: "#2563eb", idx: 3 },
  { key: "altitude", label: "ความสูง", unit: "เมตร", color: "#111827", idx: 5 },
  { key: "battery", label: "แบตเตอรี่", unit: "โวลต์", color: "#ea580c", idx: 6 },
];

/**
 * กราฟของวันแบบเว็บ Cartrack — แกนเวลาหรือระยะทาง เลือกเส้นความเร็ว ความสูง แบตเตอรี่ได้
 * แต่ละเส้นปรับสเกลของตัวเอง (ช่วงค่าดูได้ที่คำอธิบายใต้กราฟ) · เส้นแนวตั้งคือเวลาที่เลือกบนแถบช่วงเวลา
 */
export function TrackChart({ path, cursor }: { path: VehiclePath; cursor: number | null }) {
  const [axis, setAxis] = useState<"time" | "distance">("time");
  const [shown, setShown] = useState<Set<Series>>(new Set(["speed"]));
  const W = 600;
  const H = 130;
  const pts = path.points;
  const hasOdo = pts.some((p) => p[7] != null);
  const odo0 = pts.find((p) => p[7] != null)?.[7] ?? 0;
  const xOf = (p: (typeof pts)[number]) => (axis === "time" ? p[2] : (p[7] ?? odo0) - odo0);
  const xs = pts.map(xOf);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const px = (x: number) => ((x - xMin) / Math.max(1e-9, xMax - xMin)) * W;

  const lines = SERIES.filter((s) => shown.has(s.key)).map((s) => {
    const vals = pts.map((p) => p[s.idx] as number | null | undefined).filter((v): v is number => v != null);
    const lo = s.key === "speed" ? 0 : Math.min(...vals);
    const hi = Math.max(lo + 1, ...vals);
    const py = (v: number) => H - ((v - lo) / (hi - lo)) * (H - 4) - 2;
    let d = "";
    pts.forEach((p, i) => {
      const v = p[s.idx] as number | null | undefined;
      if (v == null) return;
      d += `${d ? "L" : "M"}${px(xs[i]).toFixed(1)},${py(v).toFixed(1)}`;
    });
    return { ...s, d, lo, hi, has: vals.length > 1 };
  });

  // ตำแหน่งเวลาที่เลือกบนแกนที่แสดง
  let cursorX: number | null = null;
  if (cursor != null && pts.length) {
    const near = pts.reduce((b, p) => (Math.abs(p[2] - cursor) < Math.abs(b[2] - cursor) ? p : b), pts[0]);
    cursorX = px(axis === "time" ? cursor : xOf(near));
  }
  const xLabel = (x: number) =>
    axis === "time" ? new Date(x * 1000).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : `${x.toLocaleString("th-TH", { maximumFractionDigits: 0 })} กม.`;
  const toggle = (k: Series) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  if (pts.length < 2) return <p className="text-sm text-gray-500">ไม่พบข้อมูลสำหรับแสดงกราฟในวันที่เลือก</p>;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex overflow-hidden rounded-lg border border-orange-300">
          {(["time", "distance"] as const).map((a) => (
            <button
              key={a}
              disabled={a === "distance" && !hasOdo}
              onClick={() => setAxis(a)}
              className={`px-2.5 py-1 ${axis === a ? "bg-orange-50 font-semibold text-orange-700" : "text-gray-600"} disabled:opacity-40`}
            >
              {a === "time" ? "เวลา" : "ระยะทาง"}
            </button>
          ))}
        </div>
        {SERIES.map((s) => (
          <label key={s.key} className="flex items-center gap-1">
            <input type="checkbox" checked={shown.has(s.key)} onChange={() => toggle(s.key)} />
            <span className="inline-block h-0.5 w-3" style={{ backgroundColor: s.color }} />
            {s.label}
          </label>
        ))}
        <label className="flex items-center gap-1 text-gray-400" title="รถยังไม่ได้ติดตั้งเซนเซอร์วัดระดับน้ำมัน">
          <input type="checkbox" disabled />
          ระดับน้ำมัน (ไม่มีเซนเซอร์)
        </label>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="h-36 w-full" preserveAspectRatio="none" role="img" aria-label="กราฟของวัน">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={2 + f * (H - 4)} y2={2 + f * (H - 4)} stroke="#e5e7eb" strokeWidth={1} />
        ))}
        {lines.map((l) => l.has && <path key={l.key} d={l.d} fill="none" stroke={l.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />)}
        {cursorX != null && <line x1={cursorX} x2={cursorX} y1={0} y2={H} stroke="#111827" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={f * W} y={H + 12} fontSize={9} fill="#6b7280" textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}>
            {xLabel(xMin + f * (xMax - xMin))}
          </text>
        ))}
      </svg>
      <p className="text-[11px] text-gray-500">
        {lines.length
          ? lines
              .map((l) =>
                l.has ? `${l.label} ${Math.round(l.lo * 10) / 10}–${Math.round(l.hi * 10) / 10} ${l.unit}` : `${l.label}: ไม่มีข้อมูล`,
              )
              .join(" / ")
          : "กรุณาเลือกข้อมูลที่ต้องการแสดง"}
      </p>
    </div>
  );
}
