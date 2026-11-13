import { useCallback, useEffect, useState } from "react";
import { errorMessage, fetchRoundEta, RoundEta, STOP_COLOR } from "./api";
import { hm } from "./format";

const REFRESH_MS = 60_000;

const delayText = (m: number | null) => {
  if (m === null) return "-";
  if (Math.abs(m) <= 2) return "ตรงตามแผน";
  return m > 0 ? `ล่าช้า ${m} นาที` : `เร็วกว่า ${-m} นาที`;
};
const delayClass = (m: number | null) =>
  m === null || Math.abs(m) <= 2 ? "text-gray-600" : m > 15 ? "font-semibold text-red-600" : m > 0 ? "text-amber-700" : "text-green-700";

/**
 * ประมาณเวลาส่งแบบต่อเนื่องของรอบออกรถ (MA-374)
 * ออกจากหาดใหญ่ → ร้านที่ 1 → ร้านที่ 2 → … → กลับถึงหาดใหญ่ · เทียบแผนกับเวลาจริง/ที่ประมาณใหม่
 */
export default function RoundEtaCard({ shippingOutId, date, onFocus }: { shippingOutId: number; date: string; onFocus?: (lat: number, lng: number) => void }) {
  const [eta, setEta] = useState<RoundEta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEta(await fetchRoundEta(shippingOutId, date));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [shippingOutId, date]);
  useEffect(() => {
    setEta(null);
    load();
  }, [load]);
  useEffect(() => {
    if (!eta?.summary.open) return;
    const id = setInterval(() => !document.hidden && load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [eta?.summary.open, load]);

  if (error) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">ไม่สามารถประมาณเวลาส่งได้: {error}</p>;
  if (!eta) return <p className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500">กำลังประมาณเวลาส่ง</p>;

  const ret = eta.returnDepot;
  const retShown = ret.actual ?? ret.estimated;
  const retDelay = retShown ? Math.round((Date.parse(retShown) - Date.parse(ret.planned)) / 60000) : null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
      <div className="mb-1 font-semibold text-gray-900">ประมาณการเวลาจัดส่ง</div>
      <p className="text-gray-700">
        ออกจาก{eta.start.atDepot ? eta.depot.name : ` ${eta.start.name}`} เวลา {hm(eta.departure.actual)} น.
        {eta.departure.scheduled && (
          <span className={delayClass(eta.departure.lateMin)}>
            {" "}
            (ตามตารางเวลา {hm(eta.departure.scheduled)} น. {delayText(eta.departure.lateMin)})
          </span>
        )}
      </p>
      {eta.summary.open ? (
        <p className="mt-1 rounded-lg bg-blue-50 px-2 py-1 text-blue-900">
          {eta.summary.delayMin !== null && (
            <span className={delayClass(eta.summary.delayMin)}>
              {Math.abs(eta.summary.delayMin) <= 2
                ? "ร้านค้าลำดับถัดไปตรงตามแผน"
                : eta.summary.delayMin > 0
                  ? `ร้านค้าลำดับถัดไปล่าช้ากว่าแผน ${eta.summary.delayMin} นาที`
                  : `ร้านค้าลำดับถัดไปเร็วกว่าแผน ${-eta.summary.delayMin} นาที`}
              {" "}
            </span>
          )}
          {eta.summary.lastStopAt && `คาดว่าจะถึงร้านสุดท้ายเวลาประมาณ ${hm(eta.summary.lastStopAt)} น. `}
          {ret.estimated && `คาดว่าจะกลับถึง${eta.depot.name}เวลาประมาณ ${hm(ret.estimated)} น.`}
        </p>
      ) : (
        <p className="mt-1 text-gray-700">
          {ret.actual ? `กลับถึงคลังเวลา ${hm(ret.actual)} น. (ตามแผน ${hm(ret.planned)} น.)` : `รอบนี้สิ้นสุดแล้ว ตามแผนกลับถึงคลังเวลา ${hm(ret.planned)} น.`}
        </p>
      )}
      <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
        <li>ลำดับร้านค้า: {eta.orderSourceLabel}</li>
        <li>
          เวลาที่ใช้ต่อร้านค้า {eta.serviceMinutes.live} นาที
          {eta.serviceMinutes.observed ? " (คำนวณจากการส่งสินค้าจริงของรอบนี้)" : " (ค่าเริ่มต้น)"}
        </li>
        <li>{eta.method === "straight" ? "เวลาเดินทางประมาณจากระยะทางเส้นตรง เนื่องจากยังไม่ได้คำนวณตามเส้นทางถนน" : "เวลาเดินทางคำนวณตามเส้นทางถนน"}</li>
      </ul>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-1 pr-2 font-medium">#</th>
              <th className="py-1 pr-2 font-medium">ร้าน</th>
              <th className="py-1 pr-2 font-medium">ตามแผน</th>
              <th className="py-1 pr-2 font-medium">เวลาจริงหรือประมาณการใหม่</th>
              <th className="py-1 font-medium">เทียบแผน</th>
            </tr>
          </thead>
          <tbody>
            {eta.stops.map((r) => (
              <tr key={`${r.memCode}-${r.addressId ?? ""}`} className="border-b border-gray-100 align-top">
                <td className="py-1 pr-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: STOP_COLOR[r.status] }}>
                    {r.seq}
                  </span>
                </td>
                <td className="py-1 pr-2">
                  <button onClick={() => onFocus?.(r.lat, r.lng)} className="text-left font-medium text-gray-900 hover:underline">
                    {r.name}
                  </button>
                  {r.branch && <span className="text-gray-500"> {r.branch}</span>}
                  {r.waitMin > 0 && <div className="text-amber-700">รอร้านเปิดทำการ {r.waitMin} นาที</div>}
                  {r.afterClose && <div className="text-red-600">คาดว่าจะถึงหลังเวลาปิดร้าน</div>}
                </td>
                <td className="py-1 pr-2 tabular-nums">{hm(r.plannedArrive)}</td>
                <td className="py-1 pr-2 tabular-nums">
                  {r.actualArrive ? (
                    <span>{hm(r.actualArrive)} <span className="text-gray-500">({r.statusLabel})</span></span>
                  ) : r.estimatedArrive ? (
                    <span>ประมาณ {hm(r.estimatedArrive)}</span>
                  ) : (
                    <span className="text-gray-400">{r.status === "pending" ? "-" : r.statusLabel}</span>
                  )}
                </td>
                <td className={`py-1 ${delayClass(r.delayMin)}`}>{delayText(r.delayMin)}</td>
              </tr>
            ))}
            <tr className="align-top font-medium">
              <td className="py-1 pr-2" />
              <td className="py-1 pr-2 text-gray-900">กลับถึง{eta.depot.name}</td>
              <td className="py-1 pr-2 tabular-nums">{hm(ret.planned)}</td>
              <td className="py-1 pr-2 tabular-nums">{ret.actual ? `${hm(ret.actual)} (เวลาจริง)` : ret.estimated ? `ประมาณ ${hm(ret.estimated)}` : "-"}</td>
              <td className={`py-1 ${delayClass(retDelay)}`}>{delayText(retDelay)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {eta.noLocation.length > 0 && (
        <p className="mt-2 text-xs text-amber-800">
          ร้านที่ไม่มีพิกัดและไม่สามารถประมาณเวลาได้ {eta.noLocation.length} ร้าน: {eta.noLocation.map((x) => x.name).join(", ")}
        </p>
      )}
    </div>
  );
}
