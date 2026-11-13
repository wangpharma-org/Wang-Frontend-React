import { useMemo, useState } from "react";
import { AllowedDriver, AllowedZone, ZONE_COLOR, ZONE_KIND_LABEL } from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";
import { useAllowedZones } from "../components/fleet-map/useAllowedZones";

/**
 * จุดที่คนขับแต่ละคนลงเวลาเข้าและออกงานได้ (MA-374) — อ่านจากระบบ HRSoft
 * จุดลงเวลาออกงานใช้ตรวจว่ารถจอดค้างคืนในจุดที่อนุญาตไหม · แก้ไขจุดหรือกติกาได้ที่ระบบ HRSoft เท่านั้น
 */
export default function FleetZones() {
  return (
    <FleetLayout title="จุดที่อนุญาตของคนขับ">
      <ZonesTable />
    </FleetLayout>
  );
}

function ZonesTable() {
  const [reload, setReload] = useState(0);
  const state = useAllowedZones(true, reload);
  const [query, setQuery] = useState("");
  const [onlyHome, setOnlyHome] = useState(false);

  const data = state.data?.ok ? state.data : null;
  const zoneById = useMemo(() => new Map((data?.zones ?? []).map((z) => [z.id, z])), [data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.drivers ?? [])
      .filter((d) => d.found)
      .filter((d) => !onlyHome || d.homeZoneIds.length > 0)
      .filter((d) => !q || d.employeeCode.toLowerCase().includes(q) || (d.empName ?? "").toLowerCase().includes(q));
  }, [data, query, onlyHome]);

  if (state.loading || state.error)
    return <LoadState loading={state.loading} error={state.error} onRetry={() => setReload((n) => n + 1)} />;
  if (state.data && !state.data.ok)
    return (
      <Card>
        <p className="text-sm text-amber-800">{state.data.message}</p>
      </Card>
    );
  if (!data) return null;

  const notFound = data.drivers.filter((d) => !d.found).length;
  const homes = data.drivers.filter((d) => d.homeZoneIds.length > 0).length;

  return (
    <>
      <Card>
        <p className="text-sm text-gray-600">
          รายการนี้แสดงจุดที่คนขับแต่ละคนลงเวลาเข้างานและออกงานได้ ตามข้อมูลในระบบ HRSoft จุดลงเวลาออกงานใช้ตรวจสอบว่ารถจอดค้างคืนในจุดที่อนุญาตหรือไม่
          บ้านพักของคนขับรถร่วมเป็นข้อมูลส่วนบุคคล ใช้เพื่อการตรวจสอบการจอดรถเท่านั้น หากต้องการแก้ไขจุดหรือกติกา กรุณาแก้ไขที่ระบบ HRSoft
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-gray-100 px-3 py-1">คนขับ {data.drivers.length - notFound} คน</span>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-800">มีบ้านพักที่ลงเวลาได้ {homes} คน</span>
          {notFound > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">ไม่พบในระบบ HRSoft {notFound} คน</span>
          )}
          <span className="text-xs text-gray-500">ข้อมูล ณ เวลา {new Date(data.fetchedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหารหัสหรือชื่อคนขับ"
            className="ml-auto rounded-lg border border-gray-300 px-3 py-1"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyHome} onChange={(e) => setOnlyHome(e.target.checked)} />
            แสดงเฉพาะคนขับที่มีบ้านพัก
          </label>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">คนขับ</th>
                <th className="py-2 pr-3 font-medium">ลงเวลาเข้างานได้ที่</th>
                <th className="py-2 pr-3 font-medium">ลงเวลาออกงานและจอดรถค้างคืนได้ที่</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.employeeCode} className="border-b align-top last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-gray-900">{d.empName ?? d.employeeCode}</div>
                    <div className="text-xs text-gray-500">
                      รหัส {d.employeeCode}
                      {d.policyEnabled ? " กำหนดกติกาแยกขาเข้าและขาออก" : ""}
                    </div>
                  </td>
                  <td className="py-2 pr-3"><ZoneList driver={d} ids={d.checkinZoneIds} zoneById={zoneById} /></td>
                  <td className="py-2 pr-3"><ZoneList driver={d} ids={d.checkoutZoneIds} zoneById={zoneById} /></td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-500">ไม่พบคนขับตามเงื่อนไขที่เลือก</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ZoneList({ driver, ids, zoneById }: { driver: AllowedDriver; ids: string[]; zoneById: Map<string, AllowedZone> }) {
  const zones = ids.map((id) => zoneById.get(id)).filter((z): z is AllowedZone => !!z);
  if (!zones.length) return <span className="text-gray-400">{driver.allowAll ? "ทุกจุดของบริษัท" : "ยังไม่ได้กำหนด"}</span>;
  return (
    <ul className="space-y-0.5">
      {zones.map((z) => (
        <li key={z.id} className="flex items-start gap-1.5">
          <span className="mt-1.5 inline-block h-2 w-2 flex-none rounded-full" style={{ background: ZONE_COLOR[z.kind] }} />
          <span>
            {z.name}
            {z.kind === "personal" && <span className="ml-1 text-xs text-purple-700">({ZONE_KIND_LABEL.personal})</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
