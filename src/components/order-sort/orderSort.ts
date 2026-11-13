// เรียงร้านที่ยังไม่จัดบนหน้าจัดออเดอร์ — ดู backend docs/ORDER_LIST_DEPARTURE_SORT.md

export type OrderSortMode = "departure" | "normal";

export interface OrderSortSnapshot {
  // flag order-list-departure-sort — false = เรียงแบบเดิมเท่านั้น ไม่แสดงปุ่ม
  enabled: boolean;
  // null = พนักงานเลือกเอง · มีค่า = แอดมินบังคับทุกจอ
  forced_mode: OrderSortMode | null;
  // route_code → "HH:mm"
  route_departure_times: Record<string, string>;
}

const STORAGE_KEY = "orderSortMode";

export const readUserSortMode = (): OrderSortMode => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "departure" ? "departure" : "normal";
  } catch {
    return "normal";
  }
};

export const saveUserSortMode = (mode: OrderSortMode): void => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // private mode / storage ถูกบล็อก — ใช้ได้เฉพาะรอบนี้
  }
};

/** โหมดที่ใช้จริง: flag ปิด = ปกติ · แอดมินบังคับ = ตามที่บังคับ · ไม่งั้นตามที่พนักงานเลือก */
export const resolveSortMode = (
  snapshot: OrderSortSnapshot | null,
  userMode: OrderSortMode
): OrderSortMode => {
  if (!snapshot?.enabled) return "normal";
  return snapshot.forced_mode ?? userMode;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** นาทีของวันจาก "HH:mm" — ไม่มีเวลารถออกคืน Infinity เพื่อไปอยู่ท้าย */
export const departureMinute = (
  routeCode: string | null | undefined,
  snapshot: OrderSortSnapshot | null
): number => {
  if (!routeCode || !snapshot) return Number.POSITIVE_INFINITY;
  const time = Object.prototype.hasOwnProperty.call(snapshot.route_departure_times, routeCode)
    ? snapshot.route_departure_times[routeCode]
    : undefined;
  const match = time ? TIME_PATTERN.exec(time) : null;
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const departureTimeOf = (
  routeCode: string | null | undefined,
  snapshot: OrderSortSnapshot | null
): string | null => {
  const minute = departureMinute(routeCode, snapshot);
  return Number.isFinite(minute) ? snapshot!.route_departure_times[routeCode!] : null;
};

/**
 * เปรียบเทียบร้านที่ยังไม่จัด 2 ร้าน
 * departure: เวลารถออกเร็วสุดก่อน (ไม่มีเวลาไว้ท้าย) → บิลล่าสุดของร้านเก่าสุดก่อน
 * normal: บิลล่าสุดของร้านเก่าสุดก่อน (แบบเดิม)
 */
export const comparePendingOrders = (
  a: { routeCode: string | null | undefined; latestBillTime: number },
  b: { routeCode: string | null | undefined; latestBillTime: number },
  mode: OrderSortMode,
  snapshot: OrderSortSnapshot | null
): number => {
  if (mode === "departure") {
    const depA = departureMinute(a.routeCode, snapshot);
    const depB = departureMinute(b.routeCode, snapshot);
    if (depA !== depB) return depA < depB ? -1 : 1;
  }
  return a.latestBillTime - b.latestBillTime;
};
