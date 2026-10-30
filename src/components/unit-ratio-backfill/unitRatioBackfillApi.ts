import axios from "axios";

// CRS-16 — เติม so_unit_ratio ให้บิลย้อนหลัง จากไฟล์ product_unit ของ ecommerce
const baseUrl = `${import.meta.env.VITE_API_URL_ORDER}/api/unit-ratio-backfill`;

export const LIVE_TARGET = "live";

export interface DryRunMonthSummary {
  key: string;
  lines: number;
  alreadyFilled: number;
  willFill: number;
}

export interface UnmatchedCombo {
  pro_code: string;
  so_unit: string | null;
  lines: number;
  reason: "renamed_unit" | "product_missing";
  ecom_units: string;
}

export interface SuspiciousRatio {
  pro_code: string;
  unit_name: string;
  ratio: number;
  lines: number;
}

export interface DryRunResult {
  file: { units: number; products: number; invalidRows: number };
  totals: {
    lines: number;
    alreadyFilled: number;
    exactMatch: number;
    singleUnit: number;
    renamedUnit: number;
    productMissing: number;
    willFill: number;
  };
  months: DryRunMonthSummary[];
  liveTable: { lines: number; willFill: number };
  unmatched: UnmatchedCombo[];
  suspicious: SuspiciousRatio[];
}

export interface RunResult {
  target: string;
  exactUpdated: number;
  singleUnitUpdated: number;
  durationMs: number;
}

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
});

const toForm = (file: File, target?: string) => {
  const form = new FormData();
  form.append("file", file);
  if (target) form.append("target", target);
  return form;
};

export const dryRunBackfill = async (file: File): Promise<DryRunResult> => {
  const res = await axios.post<DryRunResult>(`${baseUrl}/dry-run`, toForm(file), {
    headers: authHeaders(),
  });
  return res.data;
};

export const runBackfill = async (file: File, target: string): Promise<RunResult> => {
  const res = await axios.post<RunResult>(`${baseUrl}/run`, toForm(file, target), {
    headers: authHeaders(),
  });
  return res.data;
};

export const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    return error.message;
  }
  return error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
};
