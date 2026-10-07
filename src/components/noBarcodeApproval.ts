import axios from "axios";

// OPHMBC-306 — อนุมัติการสแกนสินค้าที่ไม่มีบาร์โค้ด
export const approvalApiUrl = `${import.meta.env.VITE_API_URL_ORDER}/api/no-barcode-approval`;
export const APPROVAL_CODE_MAX_LENGTH = 20;

// ใช้ key เดียวกับหน้า QC เครื่องเดียวกันจึงได้ device id เดียวกัน — backend เก็บลงประวัติการใช้งาน
const DEVICE_ID_KEY = "qc_machine_uuid";

export const getDeviceId = (): string => {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return "unknown";
  }
};

export const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    "X-Device-Id": getDeviceId(),
  },
});

export interface ApprovalInfo {
  emp_code: string;
  name: string;
  approved_at: string;
}

export interface ApproverRow {
  emp_code: string;
  emp_name: string;
  emp_nickname: string;
  allow_used: boolean;
  is_enabled: boolean;
  has_code: boolean;
}

export interface ApprovalSettings {
  enabled: boolean;
  barcode_edit_enabled: boolean;
  approver_count: number;
  employees: ApproverRow[];
}

export type ApprovalResult = "approved" | "rejected";
export type ApprovalAction =
  | "show_qr"
  | "barcode_update"
  | "barcode_delete"
  | "barcode_move_out";

export interface ApprovalLog {
  id: number;
  created_at: string;
  result: ApprovalResult;
  action: ApprovalAction;
  approver_emp_code: string | null;
  approver_name: string | null;
  product_code: string;
  product_name: string | null;
  sh_running: string;
  so_running: string | null;
  packer_emp_code: string;
  packer_name: string | null;
  station: string;
  ip: string | null;
  barcode_slot: number | null;
  old_barcode: string | null;
  new_barcode: string | null;
  related_product_code: string | null;
}

export type VerifyResponse =
  | {
      approved: true;
      approver: { emp_code: string; name: string };
      approved_at: string;
    }
  | {
      approved: false;
      message: string;
      locked: boolean;
      retry_after: number;
    };

export const fetchApprovalFlag = async (): Promise<boolean> => {
  const res = await axios.get<{ enabled: boolean }>(
    `${approvalApiUrl}/flag`,
    authHeaders()
  );
  return res.data.enabled;
};

export const fetchBarcodeEditFlag = async (): Promise<boolean> => {
  const res = await axios.get<{ enabled: boolean }>(
    `${approvalApiUrl}/barcode/flag`,
    authHeaders()
  );
  return res.data.enabled;
};

// แก้/ลบบาร์โค้ดจากหน้า QC — ใช้บัตรผู้อนุมัติชุดเดียวกับ OPHMBC-306
export type BarcodeSlot = 1 | 2 | 3;
export const BARCODE_SLOTS: BarcodeSlot[] = [1, 2, 3];
export const BARCODE_FIELD = {
  1: "product_barcode",
  2: "product_barcode2",
  3: "product_barcode3",
} as const;

export interface ProductBarcodes {
  product_code: string;
  product_barcode: string | null;
  product_barcode2: string | null;
  product_barcode3: string | null;
}

// สินค้าอื่นที่มีบาร์โค้ดเดียวกันอยู่ (ใส่ผิด) — ยืนยันแล้วจะถูกลบออกและย้ายมาที่สินค้านี้
export interface BarcodeSource {
  product_code: string;
  product_name: string;
  slots: BarcodeSlot[];
}

export type ChangeBarcodeResponse =
  | (Extract<VerifyResponse, { approved: true }> & {
      product: ProductBarcodes;
      moved_from: ProductBarcodes[];
    })
  | Extract<VerifyResponse, { approved: false }>;

// ฉลาก QR ที่จะพิมพ์ (BarcodeLabelPrint)
export interface BarcodeLabel {
  barcode: string;
  product_code: string;
  name: string;
  copies: number;
}
