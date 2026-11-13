import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import type { ColumnKind, ReportColumn } from "./api";
import { duration } from "./format";

type Row = Record<string, unknown>;

const dt = (iso: unknown) =>
  typeof iso === "string" && iso
    ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "-";

/** แสดงค่าตามชนิดคอลัมน์ */
const formatCell = (kind: ColumnKind, v: unknown): string => {
  if (v === null || v === undefined || v === "") return "-";
  switch (kind) {
    case "datetime":
      return dt(v);
    case "duration":
      return duration(Number(v));
    case "km":
      return `${Number(v).toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กม.`;
    case "speed":
      return `${Math.round(Number(v))} กม./ชม.`;
    case "number":
      return Number(v).toLocaleString("th-TH");
    default:
      return String(v);
  }
};

/** ค่าที่เขียนลง Excel — ตัวเลขคงเป็นตัวเลขให้คำนวณต่อได้ */
const excelValue = (kind: ColumnKind, v: unknown) => {
  if (v === null || v === undefined) return "";
  if (kind === "datetime") return dt(v);
  if (kind === "duration") return Math.round((Number(v) / 3600) * 100) / 100; // ชั่วโมง
  return v as string | number;
};
const excelLabel = (c: ReportColumn) =>
  c.kind === "duration" ? `${c.label} (ชั่วโมง)` : c.kind === "km" ? `${c.label} (กม.)` : c.kind === "speed" ? `${c.label} (กม./ชม.)` : c.label;

interface Props {
  columns: ReportColumn[];
  /** แถวข้อมูล — อ่านค่าตาม key ของคอลัมน์ */
  rows: object[];
  /** ชื่อไฟล์ Excel (ไม่ต้องมีนามสกุล) — ไม่ใส่ = ไม่มีปุ่มส่งออก */
  exportName?: string;
  emptyText?: string;
  onRowClick?: (row: Row) => void;
  maxHeight?: string;
}

/** ตาราง: กดหัวคอลัมน์เพื่อเรียง · ส่งออก Excel ได้ */
export default function DataTable({ columns, rows: input, exportName, emptyText = "ไม่มีข้อมูล", onRowClick, maxHeight = "70vh" }: Props) {
  const rows = input as Row[];
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "th")) * sort.dir;
    });
  }, [rows, sort]);

  const exportExcel = () => {
    const data = sorted.map((r) => Object.fromEntries(columns.map((c) => [excelLabel(c), excelValue(c.kind, r[c.key])])));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ข้อมูล");
    XLSX.writeFile(wb, `${exportName}.xlsx`);
  };

  return (
    <div>
      {exportName && (
        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>ทั้งหมด {rows.length.toLocaleString("th-TH")} รายการ</span>
          <button onClick={exportExcel} disabled={!rows.length} className="rounded-lg border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40">
            ส่งออก Excel
          </button>
        </div>
      )}
      <div className="overflow-auto rounded-lg border border-gray-200" style={{ maxHeight }}>
        <table className="w-full min-w-max text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium hover:text-gray-900 ${c.kind === "text" ? "" : "text-right"}`}
                >
                  {c.label}
                  {sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500">{emptyText}</td>
              </tr>
            ) : (
              sorted.map((r, i) => (
                <tr key={i} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? "cursor-pointer hover:bg-blue-50" : ""}>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.kind === "text" ? "max-w-[420px]" : "whitespace-nowrap text-right tabular-nums"}`}>
                      {formatCell(c.kind, r[c.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
