import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogisticsNav from "../logistics/LogisticsNav";
import { canSeeFleetMap } from "./api";
import { FLEET_MORE_PAGES } from "./fleetPages";
import ConnectionBanner, { ConnectionDot } from "./ConnectionBanner";

/** เมนูหลักของระบบติดตามรถ */
const FLEET_PAGES = [
  { href: "/fleet-map", label: "แผนที่รถ", match: [] as string[] },
  { href: "/fleet-deliveries", label: "การส่งสินค้า", match: [] as string[] },
  { href: "/fleet-dashboard", label: "แดชบอร์ด", match: [] as string[] },
  { href: "/fleet-reports", label: "รายงาน", match: [] as string[] },
  { href: "/fleet-more", label: "ข้อมูลและตั้งค่า", match: FLEET_MORE_PAGES.map((p) => p.href) },
];

export function FleetNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-3" aria-label="เมนูระบบติดตามรถ">
      {FLEET_PAGES.map((p) => {
        const here = pathname === p.href;
        const active = here || p.match.includes(pathname);
        return (
          <button
            key={p.href}
            onClick={() => !here && navigate(p.href)}
            aria-current={active ? "page" : undefined}
            className={`flex-none border-b-2 px-3 py-2 text-sm ${
              active ? "border-blue-600 font-semibold text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </nav>
  );
}

export function NoPermission() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">ระบบติดตามรถ (GPS) สำหรับผู้จัดการและผู้ดูแลระบบ</p>
      <p className="text-sm text-gray-600">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลตำแหน่งรถ หากต้องการใช้งานกรุณาติดต่อผู้ดูแลระบบ</p>
      <button onClick={() => navigate("/")} className="rounded-lg bg-blue-600 px-4 py-2 text-white">กลับหน้าหลัก</button>
    </div>
  );
}

interface Props {
  title: string;
  /** ปุ่ม/ตัวกรองด้านขวาของหัวหน้า */
  actions?: ReactNode;
  children: ReactNode;
  /** หน้าที่มีแผนที่เต็มจอ — เนื้อหาไม่เลื่อนทั้งหน้า */
  fullHeight?: boolean;
}

/** โครงหน้าระบบติดตามรถ: หัวหน้า + เมนูขนส่ง + เมนูย่อย · ตรวจสิทธิ์ MANAGER/ADMIN */
export default function FleetLayout({ title, actions, children, fullHeight }: Props) {
  const navigate = useNavigate();
  if (!canSeeFleetMap()) return <NoPermission />;
  return (
    <div className={`flex flex-col bg-gray-50 ${fullHeight ? "h-screen" : "min-h-screen"}`}>
      <header className="border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2">
          <button onClick={() => navigate("/")} className="whitespace-nowrap rounded px-2 py-1 text-gray-600 hover:bg-gray-100">
            กลับหน้าหลัก
          </button>
          <h1 className="whitespace-nowrap text-lg font-bold">{title}</h1>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ConnectionDot />
            {actions}
          </div>
        </div>
        <LogisticsNav className="px-3 pb-2" />
        <FleetNav />
        <ConnectionBanner />
      </header>
      {fullHeight ? children : <main className="mx-auto w-full max-w-[1500px] flex-1 space-y-4 p-4">{children}</main>}
    </div>
  );
}

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      {(title || right) && (
        <div className="mb-3 flex items-center gap-2">
          {title && <h2 className="font-semibold text-gray-900">{title}</h2>}
          <div className="ml-auto">{right}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export function LoadState({ loading, error, onRetry, message }: { loading: boolean; error: string | null; onRetry: () => void; message?: string }) {
  if (error)
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <span className="flex-1">{error}</span>
        <button onClick={onRetry} className="rounded bg-red-600 px-3 py-1 text-white">ลองอีกครั้ง</button>
      </div>
    );
  if (loading)
    return (
      <div className="flex flex-col items-center gap-3 p-10">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        {message && <p className="text-sm text-gray-500">{message}</p>}
      </div>
    );
  return null;
}
