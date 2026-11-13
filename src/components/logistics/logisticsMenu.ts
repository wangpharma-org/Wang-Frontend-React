import { AlertTriangle, CalendarClock, FileBarChart, LayoutDashboard, MapPinned, type LucideIcon } from "lucide-react";
import { canSeeFleetMap } from "../fleet-map/api";

/**
 * เมนูหมวด "ขนส่ง" — ที่เดียวที่กำหนดว่าหน้าขนส่งมีอะไรบ้าง
 * ใช้ทั้งหมวดขนส่งในหน้าหลัก (Home) และแถบลิงก์บนหัวหน้าขนส่ง (LogisticsNav)
 * `menuId` = id เดิมใน listMenu ของ Home (ใช้กับ /api/hide-button/{id}) — ห้ามเปลี่ยน
 */
export interface LogisticsLink {
  menuId: number;
  href: string;
  label: string;
  /** คำอธิบายใต้ชื่อเมนูในหน้าหลัก — ภาษาทางการ ไม่ปนภาษาอังกฤษ */
  desc: string;
  icon: LucideIcon;
  color: string;
  /** เห็นเฉพาะ admin (manage_product = Yes) แบบเมนูผู้ดูแลเดิม */
  adminOnly?: boolean;
  /** path อื่นที่นับว่าอยู่ในเมนูนี้ (เช่น หน้าย่อยของระบบติดตามรถ) */
  activePrefix?: string;
  /** เงื่อนไขพิเศษนอกเหนือจาก admin */
  canSee?: () => boolean;
}

export const LOGISTICS_LINKS: LogisticsLink[] = [
  {
    menuId: 21,
    href: "/report-logistic",
    label: "Report ขนส่ง",
    desc: "รายงานผลการจัดส่งของพนักงานขับรถประจำวัน และผลการประเมินประจำเดือน",
    icon: FileBarChart,
    color: "#2563eb",
  },
  {
    menuId: 29,
    href: "/fleet-map",
    label: "ระบบติดตามรถ (GPS)",
    desc: "ตำแหน่งปัจจุบันของรถ ร้านปลายทางและความคืบหน้าการส่งสินค้าของแต่ละรอบ ประวัติการเดินรถ และรายงานจากระบบ GPS",
    icon: MapPinned,
    color: "#16a34a",
    activePrefix: "/fleet-",
    canSee: canSeeFleetMap,
  },
  {
    menuId: 16,
    href: "/dashboard-route",
    label: "Dashboard เส้นทาง",
    desc: "แสดงสถานะออเดอร์ของแต่ละเส้นทางการจัดส่ง ทั้งที่ดำเนินการแล้วเสร็จและยังไม่แล้วเสร็จ",
    icon: LayoutDashboard,
    color: "#0891b2",
  },
  {
    menuId: 24,
    href: "/transport-daily-events",
    label: "เหตุการณ์ระหว่างวัน",
    desc: "รายการเหตุการณ์ที่พนักงานแจ้งระหว่างการจัดส่ง เช่น รถติด รถเสีย",
    icon: AlertTriangle,
    color: "#ea580c",
    adminOnly: true,
  },
  {
    menuId: 22,
    href: "/route-schedule",
    label: "จัดตารางเส้นทางขนส่ง",
    desc: "กำหนดเส้นทางการจัดส่งให้พนักงานล่วงหน้าเป็นรายวัน",
    icon: CalendarClock,
    color: "#7c3aed",
    adminOnly: true,
  },
];

export const LOGISTICS_MENU_IDS = new Set(LOGISTICS_LINKS.map((l) => l.menuId));

const isAdmin = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user_info") ?? "null")?.manage_product === "Yes";
  } catch {
    return false;
  }
};

/** ลิงก์ที่ผู้ใช้คนนี้เข้าได้ (ไม่รวม hide-button — หน้าหลักเช็คเพิ่มเอง) */
export const accessibleLogisticsLinks = () => {
  const admin = isAdmin();
  return LOGISTICS_LINKS.filter((l) => (!l.adminOnly || admin) && (!l.canSee || l.canSee()));
};
