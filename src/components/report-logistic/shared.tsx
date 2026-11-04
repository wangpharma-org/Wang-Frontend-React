/// <reference types="vite/client" />
import * as XLSX from "xlsx";

export const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";
export const authHeader = () => ({ Authorization: `Bearer ${sessionStorage.getItem("access_token")}` });

export const fmtTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

export const fmtDateTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${fmtTime(iso)}`;
};

/** นาทีระหว่างสองเวลา — ไม่ครบ หรือเวลาจบมาก่อนเวลาเริ่ม = null */
export const minutesBetween = (from: string | null | undefined, to: string | null | undefined) => {
  if (!from || !to) return null;
  const m = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  return m >= 0 ? m : null;
};

export const fmtDuration = (m: number | null) =>
  m == null ? "-" : m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} น.` : `${m} น.`;

// เดือนไทยแบบย่อ — '2026-11' → 'พ.ย. 69'
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// วันที่อย่างเดียว (แยกจากเวลา) — '3 พ.ย. 69'
export const fmtDate = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${String(d.getFullYear() + 543).slice(-2)}`;
};
export const fmtMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return `${TH_MONTHS[mo - 1]} ${String(y + 543).slice(-2)}`;
};

/** บันทึกหลายชีตเป็นไฟล์ .xlsx — แต่ละชีตคือ array ของ object (key = หัวคอลัมน์) */
export function exportXlsx(fileName: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    // กว้างคอลัมน์ตามข้อความยาวสุด กันตัดในชีต
    const keys = Object.keys(s.rows[0] ?? {});
    ws["!cols"] = keys.map((k) => ({
      wch: Math.min(40, Math.max(k.length, ...s.rows.map((r) => String(r[k] ?? "").length)) + 2),
    }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName);
}

export const ExcelIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
