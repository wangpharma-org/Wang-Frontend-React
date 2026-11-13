import dayjs from "dayjs";

const WEEKDAY = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** วันนี้ตามเวลาไทย "YYYY-MM-DD" */
export const todayBkk = () => dayjs(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** "วันนี้" · "เมื่อวาน" · "พุธ 11 พ.ย." */
export const dayLabel = (date: string, today = todayBkk()) => {
  const diff = dayjs(today).diff(dayjs(date), "day");
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "เมื่อวาน";
  const d = dayjs(date);
  return `${WEEKDAY[d.day()]} ${d.date()} ${MONTH[d.month()]}`;
};

/** 3725 → "1:02 ชม." · ต่ำกว่าชั่วโมง → "12 นาที" */
export const duration = (sec: number) => {
  if (!sec || sec <= 0) return "0 นาที";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h === 0 ? `${m} นาที` : `${h}:${String(m).padStart(2, "0")} ชม.`;
};

export const hm = (iso: string | null) => (iso ? dayjs(iso).format("HH:mm") : "--:--");

export const ago = (iso: string | null) => {
  if (!iso) return "ไม่ทราบ";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  if (min < 1440) return `${Math.floor(min / 60)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(min / 1440)} วันที่แล้ว`;
};

export const km = (n: number) => `${n.toLocaleString("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กม.`;
