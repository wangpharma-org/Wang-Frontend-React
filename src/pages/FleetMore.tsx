import { useNavigate } from "react-router-dom";
import FleetLayout from "../components/fleet-map/FleetLayout";
import { FLEET_MORE_PAGES } from "../components/fleet-map/fleetPages";

/** ข้อมูลและตั้งค่าของระบบติดตามรถ — รวมหน้าที่ใช้ไม่บ่อยไว้ที่เดียว (MA-373) */
export default function FleetMore() {
  const navigate = useNavigate();
  return (
    <FleetLayout title="ข้อมูลและตั้งค่า">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FLEET_MORE_PAGES.map((p) => (
          <button
            key={p.href}
            onClick={() => navigate(p.href)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm"
          >
            <div className="font-semibold text-gray-900">{p.label}</div>
            <p className="mt-1 text-sm text-gray-600">{p.desc}</p>
          </button>
        ))}
      </div>
    </FleetLayout>
  );
}
