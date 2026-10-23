// สถานีในสายการไหล — แยกจาก component ให้ fast refresh ทำงาน
export type StageKey = "picking" | "qc" | "loading" | "shipping";

export interface Stage {
  key: StageKey;
  label: string;
  icon: string;
  // flag ที่คุมสถานีนี้ — null = ยังไม่มีระบบรองรับ (แสดงเป็น "เร็วๆ นี้")
  flag: string | null;
  // ผลเมื่อปิด — ใช้ทั้งข้อความยืนยันและแถบเตือนบนสุด
  offEffect: string;
}

export const STAGES: Stage[] = [
  {
    key: "picking",
    label: "จัดออเดอร์",
    icon: "📦",
    flag: "order",
    offEffect: "หน้าจัดออเดอร์ทุกเครื่องขึ้นหน้าพักระบบ เริ่มจัดร้านใหม่ไม่ได้",
  },
  {
    key: "qc",
    label: "QC",
    icon: "✅",
    flag: "qc",
    offEffect: "หน้า QC ทุกเครื่องหยุดรับงาน บิลที่จัดเสร็จจะค้างรอ QC",
  },
  {
    key: "loading",
    label: "ขึ้นของ",
    icon: "📥",
    flag: null,
    offEffect: "ลังที่ปิดบิลแล้วจะค้างสะสมรอขึ้นรถ",
  },
  {
    key: "shipping",
    label: "จัดส่ง",
    icon: "🚚",
    flag: null,
    offEffect: "รถจะยังไม่ออกจัดส่ง",
  },
];

// null = ยังโหลดไม่เสร็จ หรือสถานีที่ยังไม่มีระบบรองรับ
export type StageState = Record<StageKey, boolean | null>;
