import axios from "axios";

// OPHMBC-339 — ยืนยันตัวตน 2 ชั้นของ auth (TOTP จากแอป Authenticator / รหัสจาก LINE ตอนลงเวลา)
// เอกสาร BE: Wang-AuthService-NestJS/docs/OPHMBC-339_TWO_FACTOR.md
const base = `${import.meta.env.VITE_API_URL_AUTH}/api/auth/2fa`;

export type TwoFactorMethod = "totp" | "hrsoft_otp";

export const METHOD_LABEL: Record<TwoFactorMethod, string> = {
  totp: "แอป Authenticator",
  hrsoft_otp: "รหัสจาก LINE ตอนลงเวลา (ระบบ HR)",
};

export interface TwoFactorStatus {
  feature_enabled: boolean;
  available_methods: TwoFactorMethod[];
  method: TwoFactorMethod | null;
  enabled_at: string | null;
  required: boolean;
  backup_codes_left: number;
}

export interface TotpSetup {
  secret: string;
  otpauth_uri: string;
  issuer: string;
  account: string;
}

export interface EnableResult {
  method: TwoFactorMethod;
  backup_codes: string[];
  /** มีเมื่อสมัครด้วยตั๋วจากหน้า login */
  access_token?: string;
  refresh_token?: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface AdminUserRow {
  user_id: number;
  emp_code: string;
  username: string;
  name: string;
  nickname: string | null;
  user_role: string | null;
  allowUsed: boolean;
  method: TwoFactorMethod | null;
  enabled_at: string | null;
  /** แอดมินเลือกรายคน */
  selected: boolean;
  /** ต้องใช้ (เลือก หรือ role ถูกบังคับ) */
  required: boolean;
  locked: boolean;
}

export interface AdminList {
  feature_enabled: boolean;
  required_roles: string[];
  available_methods: TwoFactorMethod[];
  users: AdminUserRow[];
}

/** token = access token ปกติ หรือ enroll_ticket จาก 403 TWO_FACTOR_ENROLL_REQUIRED */
const auth = (token?: string | null) => ({
  headers: {
    Authorization: `Bearer ${token ?? sessionStorage.getItem("access_token") ?? ""}`,
  },
});

export const verifyChallenge = async (
  challengeTicket: string,
  code: string
): Promise<Tokens> =>
  (await axios.post<Tokens>(`${base}/verify`, { challenge_ticket: challengeTicket, code })).data;

export const fetchTwoFactorStatus = async (token?: string): Promise<TwoFactorStatus> =>
  (await axios.get<TwoFactorStatus>(`${base}/status`, auth(token))).data;

export const setupTotp = async (token?: string): Promise<TotpSetup> =>
  (await axios.post<TotpSetup>(`${base}/totp/setup`, {}, auth(token))).data;

export const enableTotp = async (
  code: string,
  currentCode?: string,
  token?: string
): Promise<EnableResult> =>
  (
    await axios.post<EnableResult>(
      `${base}/totp/enable`,
      { code, ...(currentCode ? { current_code: currentCode } : {}) },
      auth(token)
    )
  ).data;

export const enableHrsoftOtp = async (
  code: string,
  currentCode?: string,
  token?: string
): Promise<EnableResult> =>
  (
    await axios.post<EnableResult>(
      `${base}/hrsoft-otp/enable`,
      { code, ...(currentCode ? { current_code: currentCode } : {}) },
      auth(token)
    )
  ).data;

export const disableTwoFactor = async (code: string) =>
  (await axios.post(`${base}/disable`, { code }, auth())).data;

export const regenerateBackupCodes = async (code: string): Promise<{ backup_codes: string[] }> =>
  (await axios.post<{ backup_codes: string[] }>(`${base}/backup-codes`, { code }, auth())).data;

export const fetchAdminList = async (): Promise<AdminList> =>
  (await axios.get<AdminList>(`${base}/admin/users`, auth())).data;

export const adminSetRequired = async (empCode: string, required: boolean) =>
  (
    await axios.put(
      `${base}/admin/users/${encodeURIComponent(empCode)}`,
      { required },
      auth()
    )
  ).data;

export const adminReset = async (empCode: string) =>
  (await axios.post(`${base}/admin/users/${encodeURIComponent(empCode)}/reset`, {}, auth())).data;

/** ข้อความ / code จาก error ของ auth ({ code, message }) */
export const apiError = (e: unknown): { status?: number; code?: string; message: string } => {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { code?: unknown; message?: unknown } | undefined;
    const msg = Array.isArray(d?.message) ? d?.message.join(", ") : d?.message;
    return {
      status: e.response?.status,
      code: typeof d?.code === "string" ? d.code : undefined,
      message:
        typeof msg === "string" && msg
          ? msg
          : e.response
          ? `เกิดข้อผิดพลาด (HTTP ${e.response.status})`
          : "เชื่อมต่อระบบยืนยันตัวตนไม่ได้",
    };
  }
  return { message: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
};

/** ตัวเลข 6 หลัก หรือรหัสสำรอง XXXX-XXXX */
export const looksLikeCode = (v: string) =>
  /^\d{6}$/.test(v.replace(/\s/g, "")) || /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(v.trim());
