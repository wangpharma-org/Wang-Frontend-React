import { useCallback, useEffect, useState } from "react";
import {
  CarLink,
  CarLinks,
  errorMessage,
  fetchCarLinks,
  LinkMethod,
  resetCarLink,
  saveCarLink,
} from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";

/**
 * จับคู่รถในระบบขนส่งกับรถในระบบ GPS (MA-374)
 * รถไม่ได้ผูกกับเส้นทางหรือคนขับคนเดิมเสมอ ระบบจึงอ้างอิงการลงทะเบียนรถในแอปขนส่งตอนออกรถ
 * แล้วนำมาจับคู่กับรถในระบบ Cartrack ด้วยหมายเลขทะเบียน — รอบการใช้รถของคนขับดูได้ที่หน้าการส่งสินค้า
 */
export default function FleetDrivers() {
  return (
    <FleetLayout title="จับคู่รถกับระบบ GPS">
      <Links />
    </FleetLayout>
  );
}

const METHOD_LABEL: Record<LinkMethod, string> = {
  auto: "จับคู่อัตโนมัติจากทะเบียน",
  manual: "กำหนดเอง",
  manual_none: "กำหนดว่าไม่มีอุปกรณ์ GPS",
  none: "ยังไม่ได้จับคู่",
};
const METHOD_STYLE: Record<LinkMethod, string> = {
  auto: "bg-green-50 text-green-700",
  manual: "bg-blue-50 text-blue-700",
  manual_none: "bg-gray-100 text-gray-600",
  none: "bg-amber-50 text-amber-800",
};
const NO_GPS = "__none__";

function Links() {
  const [data, setData] = useState<CarLinks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchCarLinks());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const apply = async (link: CarLink, value: string) => {
    setSaving(link.carId);
    setNotice(null);
    try {
      const next =
        value === "" ? await resetCarLink(link.carId) : await saveCarLink(link.carId, value === NO_GPS ? null : value);
      setData(next);
      setNotice({ ok: true, text: `บันทึกการจับคู่รถ ${link.carNumber} เรียบร้อยแล้ว` });
    } catch (e) {
      setNotice({ ok: false, text: errorMessage(e) });
    } finally {
      setSaving(null);
    }
  };

  if (!data) return <LoadState loading={!error} error={error} onRetry={load} />;
  const problems = data.links.filter((l) => l.method === "none").length;
  const links = onlyProblems ? data.links.filter((l) => l.method === "none") : data.links;
  // รถ GPS ที่ถูกรถคันอื่นจับคู่ไว้แล้ว — แสดงในตัวเลือกเพื่อเตือน ไม่ห้าม (เปลี่ยนรถได้)
  const usedBy = new Map(data.links.filter((l) => l.registration).map((l) => [l.registration as string, l.carNumber]));

  return (
    <>
      <Card>
        <p className="text-sm text-gray-600">
          ระบบจับคู่รถในระบบขนส่งกับรถในระบบ GPS จากหมายเลขทะเบียนโดยอัตโนมัติ หากหมายเลขทะเบียนไม่ตรงกัน
          หรือมีรถหลายคันที่ทะเบียนใกล้เคียงกัน กรุณาเลือกรถในระบบ GPS ให้ถูกต้อง การจับคู่มีผลกับการแสดงชื่อคนขับ
          ในแผนที่ การเดินทาง และรายงานสรุปรายคนขับ
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-gray-100 px-3 py-1">รถในระบบขนส่ง {data.links.length} คัน</span>
          <span className={`rounded-full px-3 py-1 ${problems ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>
            ยังไม่ได้จับคู่ {problems} คัน
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            รถในระบบ GPS ที่ไม่มีรถในระบบขนส่ง {data.unlinkedVehicles.length} คัน
          </span>
          <label className="ml-auto flex items-center gap-2">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
            แสดงเฉพาะรถที่ยังไม่ได้จับคู่
          </label>
        </div>
        {notice && (
          <p className={`mt-3 rounded-lg p-2 text-sm ${notice.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
            {notice.text}
          </p>
        )}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">รถในระบบขนส่ง</th>
                <th className="py-2 pr-3 font-medium">รถในระบบ GPS</th>
                <th className="py-2 pr-3 font-medium">สถานะ</th>
                <th className="py-2 font-medium">ผู้แก้ไขล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const manual = l.method === "manual" || l.method === "manual_none";
                const value = !manual ? "" : l.method === "manual_none" ? NO_GPS : (l.registration ?? "");
                return (
                  <tr key={l.carId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{l.carNumber}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={value}
                        disabled={saving === l.carId}
                        onChange={(e) => apply(l, e.target.value)}
                        className="w-full max-w-xs rounded-lg border border-gray-300 px-2 py-1"
                        aria-label={`รถในระบบ GPS ของ ${l.carNumber}`}
                      >
                        <option value="">
                          {l.method === "auto" || (!manual && l.registration)
                            ? `อัตโนมัติ: ${l.vehicleName ?? l.registration}`
                            : "อัตโนมัติ (ไม่พบรถที่ทะเบียนตรงกัน)"}
                        </option>
                        <option value={NO_GPS}>รถคันนี้ไม่มีอุปกรณ์ GPS</option>
                        {l.candidates.length > 0 && (
                          <optgroup label="ทะเบียนใกล้เคียง">
                            {l.candidates.map((r) => (
                              <option key={`c-${r}`} value={r}>
                                {data.vehicles.find((v) => v.registration === r)?.name ?? r}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="รถทั้งหมดในระบบ GPS">
                          {data.vehicles.map((v) => {
                            const by = usedBy.get(v.registration);
                            return (
                              <option key={v.registration} value={v.registration}>
                                {v.name}
                                {by && by !== l.carNumber ? ` (จับคู่กับรถ ${by} แล้ว)` : ""}
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${METHOD_STYLE[l.method]}`}>
                        {saving === l.carId ? "กำลังบันทึก" : METHOD_LABEL[l.method]}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{manual ? (l.updatedBy ?? "-") : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {data.unlinkedVehicles.length > 0 && (
        <Card title="รถในระบบ GPS ที่ยังไม่มีรถในระบบขนส่งจับคู่">
          <p className="mb-2 text-sm text-gray-500">
            การเดินทางของรถเหล่านี้จะไม่แสดงชื่อคนขับ จนกว่าจะจับคู่กับรถในระบบขนส่งในตารางด้านบน
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {data.unlinkedVehicles.map((v) => (
              <span key={v.registration} className="rounded-full border border-gray-300 px-3 py-1">
                {v.name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
