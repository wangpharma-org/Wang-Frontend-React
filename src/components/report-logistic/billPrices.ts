import { useEffect, useState } from "react";
import axios from "axios";
import { authHeader } from "./shared";

// OPHMBC-331 — มูลค่าต่อบิล (order-picking: SUM(shopping_order.so_price_total) ของบิลนั้น)
// logistics ไม่มีราคา — ส่งแค่เลขบิลมา หน้าเว็บดึงราคาแล้วรวมเป็นมูลค่าต่อร้าน / ต่อคนขับ / ทั้งหมดเอง
// จำไว้ทั้งหน้า (null = ไม่พบบิล / ไม่มีราคา เช่น ใบวางบิล)

const ORDER_API = import.meta.env.VITE_API_URL_ORDER ?? "";
const MAX_PER_REQUEST = 500; // ตรงกับ MAX_BILL_LOOKUP ฝั่ง order-picking
const cache = new Map<string, number | null>();

async function fetchBillPrices(sos: string[]): Promise<void> {
  const need = [...new Set(sos)].filter((so) => !cache.has(so));
  for (let i = 0; i < need.length; i += MAX_PER_REQUEST) {
    const chunk = need.slice(i, i + MAX_PER_REQUEST);
    const res = await axios.post<Record<string, number>>(
      `${ORDER_API}/api/order-timeline/bill-prices`,
      { sh_runnings: chunk },
      { headers: authHeader() },
    );
    for (const so of chunk) cache.set(so, res.data[so] ?? null);
  }
}

export const billPriceOf = (so: string) => cache.get(so) ?? null;

/** รวมมูลค่าของหลายบิล — ไม่มีบิลไหนมีราคาเลย = null (แสดง "-" ไม่ใช่ 0) */
export function sumBillPrices(sos: string[] | undefined): number | null {
  const prices = (sos ?? []).map(billPriceOf).filter((p): p is number => p != null);
  return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) * 100) / 100 : null;
}

/** ดึงราคาของเลขบิลที่ส่งมา คืนเลขรอบ (เปลี่ยนเมื่อได้ราคาใหม่ — ใช้เป็น dependency ของ useMemo) */
export function useBillPrices(sos: string[]) {
  const [version, setVersion] = useState(0);
  const key = [...new Set(sos)].sort().join(",");
  useEffect(() => {
    if (!key) return;
    const need = key.split(",").filter((so) => !cache.has(so));
    if (!need.length) return;
    let alive = true;
    // ดึงไม่ได้ (order-picking ล่ม) ก็แค่ไม่มีมูลค่า หน้าที่เหลือยังใช้ได้
    fetchBillPrices(need).then(() => alive && setVersion((v) => v + 1)).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  return version;
}
