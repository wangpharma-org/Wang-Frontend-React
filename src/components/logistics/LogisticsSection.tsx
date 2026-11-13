import { ChevronRight, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { accessibleLogisticsLinks } from "./logisticsMenu";

/**
 * หมวด "ขนส่ง" ในหน้าหลัก — รวมเมนูขนส่งที่เคยกระจายอยู่ในเมนูหลัก/เมนูผู้ดูแลไว้ที่เดียว
 * hidden = id ที่ /api/hide-button ปิดไว้ (เคารพการซ่อนเมนูเดิม)
 */
export default function LogisticsSection({ hidden }: { hidden: (menuId: number) => boolean }) {
  const navigate = useNavigate();
  const links = accessibleLogisticsLinks().filter((l) => !hidden(l.menuId));
  if (links.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Truck size={20} />
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">ขนส่ง</h2>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <button
              key={l.href}
              id={l.label}
              onClick={() => navigate(l.href)}
              className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderTop: `3px solid ${l.color}` }}
            >
              <span
                className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
                style={{ backgroundColor: `${l.color}14`, color: l.color }}
              >
                <Icon size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-1.5">
                  <span className="min-w-0 font-semibold leading-snug text-gray-900">{l.label}</span>
                  {l.adminOnly && (
                    <span className="mt-0.5 flex-none whitespace-nowrap rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">ผู้ดูแล</span>
                  )}
                </span>
                <span className="mt-1 block text-sm leading-snug text-gray-500">{l.desc}</span>
              </span>
              <ChevronRight size={18} className="flex-none text-gray-300 transition group-hover:text-gray-500" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
