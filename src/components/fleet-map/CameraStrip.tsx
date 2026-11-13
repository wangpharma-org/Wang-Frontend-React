import { useEffect, useState } from "react";
import { CameraEvent, CARTRACK_VISION_URL, errorMessage, fetchCameraEvents } from "./api";
import { useFleetStatus } from "./useFleetStatus";
import { hm, todayBkk } from "./format";

const REFRESH_MS = 60_000;

/**
 * กล้องหน้ารถในโหมดติดตาม (MA-374)
 * การแสดงภาพจากกล้องแบบเรียลไทม์ต้องใช้ Cartrack Vision API (POST /vision/livestream/{registration}) ซึ่งบัญชีของบริษัทยังไม่ได้เปิดใช้ (403)
 * ระหว่างนี้แสดงเหตุการณ์ที่กล้องตรวจพบล่าสุดของวันนี้ และปุ่มเปิดระบบกล้องของ Cartrack
 */
export default function CameraStrip({ registration }: { registration: string }) {
  const [events, setEvents] = useState<CameraEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vision = useFleetStatus().status?.vision ?? null;
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetchCameraEvents(todayBkk(), todayBkk(), "important", registration);
        if (alive) {
          setEvents(r.events);
          setError(null);
        }
      } catch (e) {
        // ดึงไม่ได้ต้องบอกว่าดึงไม่ได้ — ไม่ใช่แสดงว่า "ไม่มีเหตุการณ์"
        if (alive) setError(errorMessage(e));
      }
    };
    setEvents(null);
    load();
    const id = setInterval(() => !document.hidden && load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [registration]);

  const latest = [...(events ?? [])].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "")).slice(0, 3);
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1 bg-gray-900 px-2 py-1.5 text-[11px] leading-snug text-gray-200">
        <span className="font-semibold text-white">กล้องติดรถ</span>
        <span className={`min-w-0 flex-1 basis-48 ${vision?.enabled === false ? "text-amber-300" : vision?.enabled === null ? "text-red-300" : ""}`} title={vision?.message}>
          {vision === null
            ? "กำลังตรวจสอบบริการกล้อง"
            : vision.enabled
              ? "บัญชีเปิดใช้บริการ Cartrack Vision API แล้ว การแสดงภาพจากกล้องแบบเรียลไทม์จะเพิ่มในระยะถัดไป"
              : `ไม่สามารถแสดงภาพจากกล้องแบบเรียลไทม์ได้ เนื่องจาก${vision.message}`}
        </span>
        <a href={CARTRACK_VISION_URL} target="_blank" rel="noreferrer" className="ml-auto flex-none rounded bg-white/15 px-2 py-0.5 text-white hover:bg-white/25">
          เปิดระบบกล้องของ Cartrack
        </a>
      </div>
      <div className="px-2 py-1 text-[11px] text-gray-700">
        {error ? (
          <span className="text-red-700">ไม่สามารถดึงข้อมูลเหตุการณ์จากกล้องได้ ({error})</span>
        ) : events === null ? (
          "กำลังโหลดเหตุการณ์จากกล้อง"
        ) : latest.length ? (
          <>
            เหตุการณ์จากกล้องในวันนี้:{" "}
            {latest.map((e, i) => (
              <span key={i} className="mr-2 whitespace-nowrap">
                <span className="tabular-nums text-gray-500">{hm(e.at)}</span> <span className="font-medium text-orange-700">{e.label}</span>
              </span>
            ))}
            {events.length > 3 && <span className="text-gray-500">และอีก {events.length - 3} เหตุการณ์</span>}
          </>
        ) : (
          "วันนี้ยังไม่พบเหตุการณ์สำคัญจากกล้อง"
        )}
      </div>
    </div>
  );
}
