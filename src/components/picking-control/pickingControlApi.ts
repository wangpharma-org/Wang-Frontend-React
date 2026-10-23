import axios from "axios";

// OPHMBC-322 — แผงควบคุมสายการไหล: ใช้ API ที่มีอยู่แล้วทั้งหมด ไม่มี endpoint ใหม่
export const API = `${import.meta.env.VITE_API_URL_ORDER}/api`;

// flag ของหน้านี้เอง — ยังไม่มีแถว = ปิด (เมนูซ่อน) เปิดด้วย POST /api/feature-flag/send
export const PICKING_CONTROL_FLAG = "picking-control-page";

export const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
  },
});

export const errorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" ? message : fallback;
};

// ไม่มีแถวในตาราง (backend คืนว่าง) = ถือว่าปิด
export const fetchFlag = async (module: string): Promise<boolean> => {
  const res = await axios.get<{ status?: boolean } | "">(
    `${API}/feature-flag/check/${module}`,
  );
  return typeof res.data === "object" && res.data?.status === true;
};

export const sendFlag = (module: string, status: boolean, msg: string | null) =>
  axios.post(`${API}/feature-flag/send`, { module, status, msg }, authHeaders());

export interface Route {
  route_code: string;
  route_name: string;
  is_active: boolean;
}

export type RouteBatchMode = "normal" | "batch";

export interface RouteBatchGroupStatus {
  id: number;
  position: number;
  name: string | null;
  min_remaining: number;
  departure_time: string | null;
  block_before_minutes: number | null;
  block_time: string | null;
  block_until: string | null;
  departure_block_enabled: boolean;
  is_departure_blocked: boolean;
  opened: boolean;
  opened_at: string | null;
  routes: { route_code: string; route_name: string; is_active: boolean; remaining: number }[];
}

export interface RouteBatchSetting {
  mode: RouteBatchMode;
  switch_max_threshold: number | null;
}

// ใช้ set-activate (JWT + manage_product/manage_route) แทน toggle-activate ที่ไม่มีการตรวจสิทธิ์
// หมายเหตุ: backend ปิดโหมดเปิดทีละชุดให้เองเมื่อสั่งเปิด/ปิดเส้นทางด้วยมือ
export const setRoutesActive = (route_codes: string[], is_active: boolean) =>
  axios.put(`${API}/route/set-activate`, { route_codes, is_active }, authHeaders());
