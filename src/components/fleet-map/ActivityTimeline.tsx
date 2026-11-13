import { useEffect, useMemo, useRef, useState } from "react";
import { PATH_STATE_META, PathState, pointAt, VehiclePath } from "./api";

/**
 * แถบช่วงเวลาของวัน (MA-374) — แบบเดียวกับเว็บ Cartrack
 * ช่วงตั้งแต่จุดสัญญาณแรกถึงจุดล่าสุด แบ่งสีตามสถานะ · ลากหรือแตะเพื่อดูตำแหน่งรถบนแผนที่ ณ เวลานั้น
 * ปุ่มเล่นย้อนหลังเลื่อนเวลาไปทีละช่วงที่เลือก
 */
const STEPS = [
  { s: 10, label: "10 วินาที" },
  { s: 30, label: "30 วินาที" },
  { s: 60, label: "1 นาที" },
  { s: 300, label: "5 นาที" },
];
const TICK_MS = 100;
const STATE_ORDER: PathState[] = [2, 1, 3, 0];

const hms = (t: number) => new Date(t * 1000).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const hm = (t: number) => new Date(t * 1000).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

export default function ActivityTimeline({
  path,
  cursor,
  onCursor,
}: {
  path: VehiclePath;
  /** เวลาที่เลือก (วินาที epoch) — null = ไม่ได้เลือก */
  cursor: number | null;
  onCursor: (t: number | null) => void;
}) {
  const segments = path.segments ?? [];
  const from = path.points[0]?.[2] ?? 0;
  const to = path.points[path.points.length - 1]?.[2] ?? from;
  const span = Math.max(1, to - from);
  const bar = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(10);
  const dragging = useRef(false);

  // ค่าล่าสุดของเวลาที่เลือก ให้ตัวจับเวลาอ่านได้โดยไม่ต้องเริ่มใหม่ทุกครั้งที่เวลาเปลี่ยน
  const cursorRef = useRef<number | null>(cursor);
  cursorRef.current = cursor;

  // เล่นย้อนหลัง: เลื่อนทีละ step วินาที ทุก 0.1 วินาที จนสุดช่วง
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      cursorRef.current = Math.min(to, (cursorRef.current ?? from) + step);
      onCursor(cursorRef.current);
      if (cursorRef.current >= to) setPlaying(false);
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step, from, to]);

  const at = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r) return null;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.round(from + f * span);
  };
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => from + f * span), [from, span]);
  const cur = cursor != null ? pointAt(path.points, cursor) : null;
  const curState = (cur?.p[4] ?? null) as PathState | null;
  const seconds = path.stateSeconds;

  if (!path.points.length) return <p className="text-sm text-gray-500">ไม่พบข้อมูลสัญญาณ GPS ในวันที่เลือก</p>;

  return (
    <div className="select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (!playing && (cursor == null || cursor >= to)) onCursor(from);
            setPlaying((x) => !x);
          }}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
          aria-label={playing ? "หยุดการแสดงย้อนหลัง" : "แสดงการเดินทางย้อนหลัง"}
          title={playing ? "หยุดการแสดงย้อนหลัง" : "แสดงการเดินทางย้อนหลัง"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="relative min-w-0 flex-1 pt-6">
          {cursor != null && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-1.5 py-0.5 text-[11px] text-white"
              style={{ left: `${((cursor - from) / span) * 100}%` }}
            >
              {hms(cursor)}
              {cur ? ` ${Math.round(cur.p[3])} กม./ชม.` : ""}
            </div>
          )}
          <div
            ref={bar}
            className="relative h-4 cursor-pointer touch-none overflow-hidden rounded-full"
            style={{ backgroundColor: PATH_STATE_META[0].color }}
            onPointerDown={(e) => {
              dragging.current = true;
              setPlaying(false);
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              onCursor(at(e.clientX));
            }}
            onPointerMove={(e) => dragging.current && onCursor(at(e.clientX))}
            onPointerUp={() => (dragging.current = false)}
            role="slider"
            aria-label="เวลาในวัน"
            aria-valuemin={from}
            aria-valuemax={to}
            aria-valuenow={cursor ?? from}
            aria-valuetext={cursor != null ? hms(cursor) : "ไม่ได้เลือก"}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") onCursor(Math.min(to, (cursor ?? from) + step));
              if (e.key === "ArrowLeft") onCursor(Math.max(from, (cursor ?? from) - step));
              if (e.key === "Escape") onCursor(null);
            }}
          >
            {segments
              .filter((x) => x.state !== 0)
              .map((x, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0"
                  style={{
                    left: `${((x.start - from) / span) * 100}%`,
                    width: `${((x.end - x.start) / span) * 100}%`,
                    minWidth: 1,
                    backgroundColor: PATH_STATE_META[x.state].color,
                  }}
                />
              ))}
          </div>
          {cursor != null && (
            <div
              className="pointer-events-none absolute bottom-[-4px] h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-gray-800 shadow"
              style={{ left: `${((cursor - from) / span) * 100}%` }}
            />
          )}
          <div className="relative mt-2 h-4 text-[11px] text-gray-500">
            {ticks.map((t, i) => (
              <span
                key={i}
                className={`absolute ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                style={{ left: `${((t - from) / span) * 100}%` }}
              >
                {hm(t)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
        {STATE_ORDER.map((st) => (
          <span key={st} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PATH_STATE_META[st].color }} />
            {PATH_STATE_META[st].label}
          </span>
        ))}
        <label className="ml-auto flex items-center gap-1">
          เลื่อนครั้งละ
          <select value={step} onChange={(e) => setStep(Number(e.target.value))} className="rounded border border-gray-300 px-1 py-0.5" aria-label="ช่วงเวลาที่เลื่อนต่อครั้ง">
            {STEPS.map((x) => (
              <option key={x.s} value={x.s}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {cursor != null && (
        <p className="mt-1 text-xs text-gray-700">
          {hms(cursor)} น. {curState != null ? PATH_STATE_META[curState].label : ""}
          <button onClick={() => { setPlaying(false); onCursor(null); }} className="ml-2 text-blue-700 hover:underline">
            ยกเลิกเวลาที่เลือก
          </button>
        </p>
      )}
      {seconds && seconds.speeding > 0 && (
        <p className="mt-1 text-[11px] text-gray-500">ระยะเวลาที่ขับขี่เกินความเร็วที่กำหนดรวม {Math.round(seconds.speeding / 60)} นาที</p>
      )}
    </div>
  );
}
