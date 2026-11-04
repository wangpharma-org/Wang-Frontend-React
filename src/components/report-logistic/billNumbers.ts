import { useEffect, useState } from "react";
import axios from "axios";
import { authHeader } from "./shared";

// OPHMBC-331 — เลขที่ใบกำกับภาษี (order-picking shopping_head.bill_number) ของเลข SO
// ดึงเฉพาะเลขที่ยังไม่เคยดึง และเฉพาะส่วนที่เปิดดูอยู่ · จำไว้ทั้งหน้า (null = ไม่มีเลข / ไม่พบบิล)

const ORDER_API = import.meta.env.VITE_API_URL_ORDER ?? "";
const MAX_PER_REQUEST = 500; // ตรงกับ MAX_BILL_LOOKUP ฝั่ง order-picking
const cache = new Map<string, string | null>();

export async function fetchBillNumbers(sos: string[]): Promise<void> {
  const need = [...new Set(sos)].filter((so) => !cache.has(so));
  for (let i = 0; i < need.length; i += MAX_PER_REQUEST) {
    const chunk = need.slice(i, i + MAX_PER_REQUEST);
    const res = await axios.post<Record<string, string | null>>(
      `${ORDER_API}/api/order-timeline/bill-numbers`,
      { sh_runnings: chunk },
      { headers: authHeader() },
    );
    for (const so of chunk) cache.set(so, res.data[so] ?? null);
  }
}

export const billNumberOf = (so: string) => cache.get(so) ?? null;

/** ใช้ในตาราง: ส่งรายการเลข SO ที่แสดงอยู่ (ส่ง [] ตอนยังไม่เปิด = ไม่ดึง) */
export function useBillNumbers(sos: string[]) {
  const [, rerender] = useState(0);
  const key = sos.join(",");
  useEffect(() => {
    if (!key) return;
    const need = key.split(",").filter((so) => !cache.has(so));
    if (!need.length) return;
    let alive = true;
    // ดึงไม่ได้ (เช่น order-picking ล่ม) ก็แค่ไม่แสดงเลขใบกำกับ ตารางยังใช้ได้
    fetchBillNumbers(need).then(() => alive && rerender((n) => n + 1)).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  return billNumberOf;
}
