import { useState } from "react";
import { refreshFleetStatus, useFleetStatus } from "./useFleetStatus";

const hm = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : null;
const ago = (iso: string | null) => {
  if (!iso) return null;
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "ไม่ถึง 1 นาทีที่แล้ว" : m < 60 ? `${m} นาทีที่แล้ว` : `${Math.floor(m / 60)} ชั่วโมงที่แล้ว`;
};

/**
 * แถบสถานะการเชื่อมต่อของระบบติดตามรถ (MA-374)
 * เชื่อม Cartrack ไม่ได้ = แถบแดงพร้อมสาเหตุ · ระบบคำนวณเส้นทางใช้ไม่ได้ = แถบเหลือง
 * เชื่อมต่อปกติ = ไม่แสดงแถบ (ดูสถานะได้ที่ <ConnectionDot />)
 */
export default function ConnectionBanner() {
  const { status, error } = useFleetStatus();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    await refreshFleetStatus();
    setBusy(false);
  };
  const retryBtn = (
    <button onClick={retry} disabled={busy} className="ml-auto flex-none rounded border border-current px-2 py-0.5 text-xs disabled:opacity-50">
      {busy ? "กำลังตรวจสอบ" : "ตรวจสอบอีกครั้ง"}
    </button>
  );
  if (error && !status)
    return (
      <div className="flex flex-wrap items-center gap-2 bg-red-600 px-4 py-1.5 text-sm text-white" role="alert">
        <span className="font-semibold">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ระบบขนส่งได้</span>
        <span>{error}</span>
        {retryBtn}
      </div>
    );
  if (!status) return null;
  const c = status.cartrack;
  return (
    <>
      {(!c.ok || error) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-red-600 px-4 py-1.5 text-sm text-white" role="alert">
          <span className="font-semibold">ไม่สามารถเชื่อมต่อระบบ Cartrack ได้</span>
          <span>{error ? `ไม่สามารถตรวจสอบสถานะได้: ${error}` : (c.lastFailure?.label ?? c.message ?? "ไม่ทราบสาเหตุ")}</span>
          <span className="text-red-100">
            {c.lastSuccessAt ? `เชื่อมต่อสำเร็จครั้งล่าสุดเวลา ${hm(c.lastSuccessAt)} น. (${ago(c.lastSuccessAt)})` : "ยังไม่สามารถเชื่อมต่อได้ตั้งแต่เริ่มระบบ"}
            {" "}ตำแหน่งรถ เส้นทาง และสถานะที่แสดงอาจไม่เป็นปัจจุบัน
          </span>
          {retryBtn}
        </div>
      )}
      {status.osrm.enabled && !status.osrm.ok && (
        <div className="flex flex-wrap items-center gap-2 bg-amber-100 px-4 py-1 text-xs text-amber-900" role="status">
          <span className="font-semibold">ระบบคำนวณเส้นทางถนนไม่สามารถใช้งานได้</span>
          <span>เส้นทาง ร้านค้าลำดับถัดไป และเวลาโดยประมาณจะคำนวณจากระยะทางเส้นตรงแทน</span>
        </div>
      )}
    </>
  );
}

/** จุดสถานะเล็ก ๆ สำหรับหัวหน้า: เขียว = เชื่อมต่อ Cartrack ปกติ · แดง = เชื่อมไม่ได้ */
export function ConnectionDot() {
  const { status, error } = useFleetStatus();
  if (!status && !error) return null;
  const ok = !!status?.cartrack.ok && !error;
  return (
    <span className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-500" title={ok ? "เชื่อมต่อระบบ Cartrack ได้ตามปกติ" : "ไม่สามารถเชื่อมต่อระบบ Cartrack ได้"}>
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      {ok ? `เชื่อมต่อ Cartrack ปกติ${status?.cartrack.lastSuccessAt ? ` เวลา ${hm(status.cartrack.lastSuccessAt)} น.` : ""}` : "ไม่สามารถเชื่อมต่อ Cartrack ได้"}
    </span>
  );
}
