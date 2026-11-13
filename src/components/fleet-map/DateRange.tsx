import { todayBkk } from "./format";

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** จำนวนวันสูงสุดที่ backend รับ */
  maxDays?: number;
  /** เลือกได้วันเดียว */
  single?: boolean;
}

/** เลือกช่วงวันที่ + ปุ่มลัด · ป้องกันเลือกเกินวันนี้และเกินจำนวนวันที่กำหนด */
export default function DateRange({ from, to, onChange, maxDays = 31, single }: Props) {
  const today = todayBkk();
  const presets: [string, number][] = single
    ? [["วันนี้", 1]]
    : ([["วันนี้", 1], ["7 วัน", 7], ["30 วัน", 30]] as [string, number][]).filter(([, n]) => n <= maxDays);
  const set = (f: string, t: string) => {
    if (t > today) t = today;
    if (f > t) f = t;
    const span = Math.round((Date.parse(t) - Date.parse(f)) / 86_400_000) + 1;
    if (span > maxDays) f = shift(t, -(maxDays - 1));
    onChange(f, t);
  };
  const input = "rounded-lg border border-gray-300 px-2 py-1 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {single ? (
        <input type="date" className={input} value={from} max={today} onChange={(e) => e.target.value && set(e.target.value, e.target.value)} />
      ) : (
        <>
          <input type="date" className={input} value={from} max={to} onChange={(e) => e.target.value && set(e.target.value, to)} />
          <span className="text-gray-400">ถึง</span>
          <input type="date" className={input} value={to} max={today} onChange={(e) => e.target.value && set(from, e.target.value)} />
        </>
      )}
      {single && (
        <button onClick={() => set(shift(from, -1), shift(from, -1))} className="rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50">
          วันก่อนหน้า
        </button>
      )}
      {presets.map(([label, n]) => (
        <button
          key={label}
          onClick={() => set(shift(today, -(n - 1)), today)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
