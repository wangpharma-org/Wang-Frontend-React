import { useLocation, useNavigate } from "react-router-dom";
import { accessibleLogisticsLinks } from "./logisticsMenu";

/** แถบลิงก์ระหว่างหน้าขนส่ง — แสดงเฉพาะหน้าที่ผู้ใช้เข้าได้ หน้าปัจจุบันเป็นสีเข้ม */
export default function LogisticsNav({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const links = accessibleLogisticsLinks();
  if (links.length < 2) return null;
  return (
    <nav className={`flex gap-1 overflow-x-auto ${className}`} aria-label="เมนูขนส่ง">
      {links.map((l) => {
        const active = pathname === l.href || (!!l.activePrefix && pathname.startsWith(l.activePrefix));
        const Icon = l.icon;
        return (
          <button
            key={l.href}
            onClick={() => pathname !== l.href && navigate(l.href)}
            aria-current={active ? "page" : undefined}
            className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
              active ? "bg-gray-900 font-semibold text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon size={16} style={active ? undefined : { color: l.color }} />
            {l.label}
          </button>
        );
      })}
    </nav>
  );
}
