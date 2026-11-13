/**
 * กราฟแท่งแบบเบา ๆ (ไม่เพิ่ม library) — ใช้ในหน้าแดชบอร์ด
 * ทุกแท่งมี title ให้ชี้ดูค่าได้
 */
interface BarDatum {
  label: string;
  value: number;
  title?: string;
}

export function Bars({ data, color = "#2563eb", height = 160, format = (n: number) => n.toLocaleString("th-TH"), labelEvery = 1 }: {
  data: BarDatum[];
  color?: string;
  height?: number;
  format?: (n: number) => string;
  labelEvery?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group flex h-full flex-1 flex-col justify-end" title={d.title ?? `${d.label}: ${format(d.value)}`}>
            <div className="mb-0.5 text-center text-[10px] text-gray-500 opacity-0 group-hover:opacity-100">{format(d.value)}</div>
            <div className="w-full rounded-t" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0, backgroundColor: color }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[10px] text-gray-500">{i % labelEvery === 0 ? d.label : ""}</div>
        ))}
      </div>
    </div>
  );
}

export interface Segment {
  key: string;
  label: string;
  color: string;
}

export function StackedBars({ data, segments, height = 180, labelEvery = 1 }: {
  data: ({ label: string } & Record<string, number | string>)[];
  segments: Segment[];
  height?: number;
  labelEvery?: number;
}) {
  const totals = data.map((d) => segments.reduce((s, g) => s + Number(d[g.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-gray-600">
        {segments.map((g) => (
          <span key={g.key} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: g.color }} />
            {g.label}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="flex h-full flex-1 flex-col justify-end"
            title={`${d.label}\n${segments.map((g) => `${g.label}: ${d[g.key] ?? 0}`).join("\n")}`}
          >
            <div className="flex w-full flex-col-reverse overflow-hidden rounded-t" style={{ height: `${(totals[i] / max) * 100}%` }}>
              {segments.map((g) => (
                <div key={g.key} style={{ flexGrow: Number(d[g.key] ?? 0), backgroundColor: g.color }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[10px] text-gray-500">{i % labelEvery === 0 ? d.label : ""}</div>
        ))}
      </div>
    </div>
  );
}

/** แท่งแนวนอน — จัดอันดับรถ */
export function HBars({ rows, format, color = "#2563eb", secondary }: {
  rows: { label: string; value: number; secondaryValue?: number }[];
  format: (n: number) => string;
  color?: string;
  /** แท่งที่สอง (เช่น เวลาจอดติดเครื่องยนต์เทียบกับเวลาขับ) */
  secondary?: { color: string; label: string; primaryLabel: string };
}) {
  const max = Math.max(1, ...rows.map((r) => r.value + (r.secondaryValue ?? 0)));
  return (
    <div className="space-y-1.5">
      {secondary && (
        <div className="mb-2 flex gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />{secondary.primaryLabel}</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondary.color }} />{secondary.label}</span>
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-32 flex-none truncate text-gray-700" title={r.label}>{r.label}</span>
          <div className="flex h-4 flex-1 overflow-hidden rounded bg-gray-100">
            <div style={{ width: `${(r.value / max) * 100}%`, backgroundColor: color }} title={format(r.value)} />
            {secondary && r.secondaryValue !== undefined && (
              <div style={{ width: `${(r.secondaryValue / max) * 100}%`, backgroundColor: secondary.color }} title={format(r.secondaryValue)} />
            )}
          </div>
          <span className="w-28 flex-none text-right tabular-nums text-gray-600">
            {format(r.value)}
            {secondary && r.secondaryValue !== undefined ? ` / ${format(r.secondaryValue)}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
