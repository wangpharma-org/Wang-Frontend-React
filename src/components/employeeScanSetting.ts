import axios from "axios";

// OPHMBC-316 — บังคับจัดออเดอร์แบบสแกนรายพนักงานตามช่วงเวลา + แก้ชั้นพนักงาน
// ข้อมูลตั้งค่าเก็บที่ auth service แล้ว sync ไป order-picking ผ่าน Kafka
const authApiUrl = `${import.meta.env.VITE_API_URL_AUTH}/api/auth/employee-settings`;
const policyApiUrl = `${import.meta.env.VITE_API_URL_ORDER}/api/employee-scan-policy/me`;

export const MAX_SCAN_WINDOWS = 10;
export const FLOOR_OPTIONS = [1, 2, 3, 4, 5];

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
  },
});

export interface ScanWindow {
  start: string; // HH:mm
  end: string; // HH:mm — end < start = ข้ามเที่ยงคืน
}

export interface ScanPolicy {
  enabled: boolean;
  emp_code: string;
  emp_floor: string | null;
  scan_required: boolean;
  scan_windows: ScanWindow[];
  scan_required_now: boolean;
  can_manage_employee_settings: boolean;
  server_time: string;
}

export interface EmployeeSettingRow {
  emp_code: string;
  emp_name: string;
  emp_nickname: string | null;
  emp_floor: number | null;
  scan_required: boolean;
  scan_windows: ScanWindow[];
  allowUsed: boolean;
}

export interface EmployeeSettingsPatch {
  emp_floor?: number | null;
  scan_required?: boolean;
  scan_windows?: ScanWindow[];
}

export const fetchMyScanPolicy = async (): Promise<ScanPolicy> => {
  const res = await axios.get<ScanPolicy>(policyApiUrl, authHeaders());
  return res.data;
};

export const fetchEmployeeSettings = async (): Promise<EmployeeSettingRow[]> => {
  const res = await axios.get<EmployeeSettingRow[]>(authApiUrl, authHeaders());
  return res.data;
};

export const updateEmployeeSettings = async (
  empCode: string,
  patch: EmployeeSettingsPatch
): Promise<EmployeeSettingRow> => {
  const res = await axios.patch<EmployeeSettingRow>(
    `${authApiUrl}/${encodeURIComponent(empCode)}`,
    patch,
    authHeaders()
  );
  return res.data;
};

export const errorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return fallback;
};
