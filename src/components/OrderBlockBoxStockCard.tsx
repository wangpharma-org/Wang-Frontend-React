import { useEffect, useMemo, useState } from "react";
import { boxWindowText, formatTime, type BoxStockStatus } from "./orderBlockUtils";

export interface BoxStockPayload {
  // ไม่ส่ง = ใช้กับทุกวัน
  day_of_week?: number;
  floors: { floor: number; min_boxes: number | null }[];
  pending_release_min: number | null;
  pending_release_max: number | null;
}

interface OrderBlockBoxStockCardProps {
  boxStock: BoxStockStatus;
  // ยอด "เหลือจัด" ทั้งระบบตอนนี้ — ตัวเดียวกับที่ใช้เทียบ min/max ปลดระงับ
  pendingCount: number;
  saving: boolean;
  onSave: (payload: BoxStockPayload) => Promise<void>;
}

const FLOORS = [1, 2, 3, 4, 5];
const RELEASE_MIN = "release_min";
const RELEASE_MAX = "release_max";

const toText = (value: number | null | undefined) =>
  value == null ? "" : String(value);

// ช่องเก็บเป็น string เพื่อให้แอดมินเคลียร์เป็นว่าง (= ไม่เช็ค / ไม่ใช้) ได้
const toDrafts = (boxStock: BoxStockStatus): Record<string, string> => ({
  ...Object.fromEntries(
    FLOORS.map((floor) => [
      String(floor),
      toText(boxStock.floors.find((f) => f.floor === floor)?.min_boxes),
    ]),
  ),
  [RELEASE_MIN]: toText(boxStock.pending_release_min),
  [RELEASE_MAX]: toText(boxStock.pending_release_max),
});

const validateFloor = (value: string): string | null => {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return "ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป หรือเว้นว่าง";
  }
  return Number(text) > 100000 ? "ไม่เกิน 100,000 ลัง" : null;
};

const validateRelease = (minText: string, maxText: string): string | null => {
  const min = minText.trim();
  const max = maxText.trim();
  if (!min && !max) return null;
  if (!min || !max) return "min และ max ต้องกรอกทั้งคู่ หรือเว้นว่างทั้งคู่";
  if (!/^\d+$/.test(min) || !/^\d+$/.test(max)) {
    return "min และ max ต้องเป็นจำนวนเต็มไม่ติดลบ";
  }
  return Number(min) >= Number(max) ? "min ต้องน้อยกว่า max" : null;
};

const toNumber = (text: string) => (text.trim() ? Number(text.trim()) : null);

const OrderBlockBoxStockCard = ({
  boxStock,
  pendingCount,
  saving,
  onSave,
}: OrderBlockBoxStockCardProps) => {
  const savedDrafts = useMemo(() => toDrafts(boxStock), [boxStock]);
  const [drafts, setDrafts] = useState(savedDrafts);

  const dirty = Object.keys(savedDrafts).some(
    (key) => (drafts[key] ?? "").trim() !== savedDrafts[key],
  );
  const floorErrors = Object.fromEntries(
    FLOORS.map((floor) => [floor, validateFloor(drafts[String(floor)] ?? "")]),
  );
  const releaseError = validateRelease(
    drafts[RELEASE_MIN] ?? "",
    drafts[RELEASE_MAX] ?? "",
  );
  const hasError =
    releaseError !== null || FLOORS.some((floor) => floorErrors[floor] !== null);

  // refresh สถานะทุกนาทีต้องไม่ทับค่าที่แอดมินกำลังแก้ค้างอยู่
  useEffect(() => {
    if (!dirty) setDrafts(savedDrafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDrafts]);

  const setDraft = (key: string, value: string) =>
    setDrafts((current) => ({ ...current, [key]: value }));

  // บันทึกสำเร็จแล้วค่าที่ได้กลับมาตรงกับ drafts → dirty = false แล้ว effect ด้านบนซิงก์ให้เอง
  const save = () =>
    onSave({
      floors: FLOORS.map((floor) => ({
        floor,
        min_boxes: toNumber(drafts[String(floor)] ?? ""),
      })),
      pending_release_min: toNumber(drafts[RELEASE_MIN] ?? ""),
      pending_release_max: toNumber(drafts[RELEASE_MAX] ?? ""),
      // แก้ได้เฉพาะวันนี้ — ตั้งรายวันที่หน้าแผงควบคุม
      day_of_week: boxStock.day_of_week,
    });

  const blockedCount = boxStock.floors.filter((f) => f.blocked).length;
  const shortCount = boxStock.floors.filter((f) => f.short).length;
  // ยอดลังอ่านตลอดแม้ flag ปิด (OPHMBC-324) — เช็คการเชื่อมต่อก่อน แล้วค่อยบอกสถานะ flag
  const notice = !boxStock.configured || boxStock.error
    ? {
        className: "bg-amber-50 border-amber-300 text-amber-800",
        text: `อ่านยอดจากแอปบันทึกลังไม่ได้ — ระบบจะไม่ระงับจนกว่าจะอ่านได้ (${boxStock.error ?? "ยังไม่ได้ตั้งค่า"})`,
      }
    : !boxStock.enabled
      ? {
          className: "bg-gray-50 border-gray-300 text-gray-700",
          text: `ยังไม่เปิดใช้งาน (feature flag order-block-box-stock ปิดอยู่) — อ่านยอดลังให้ดูได้แล้ว${shortCount > 0 ? ` (ลังขาด ${shortCount} ชั้น)` : ""} แต่ยังไม่ระงับ`,
        }
      : boxStock.released
        ? {
            className: "bg-blue-50 border-blue-300 text-blue-800",
            text: `ปลดการระงับเพราะลังชั่วคราว — ยอดเหลือจัดถึง ${boxStock.pending_release_max} รายการ จะกลับมาระงับเมื่อลดถึง ${boxStock.pending_release_min} รายการ (ถ้าลังยังไม่ครบ)`,
          }
        : blockedCount > 0
          ? {
              className: "bg-red-50 border-red-300 text-red-800",
              text: `กำลังระงับ ${blockedCount} ชั้น — ร้านที่มีสินค้ารอจัดบนชั้นนั้นจะเริ่มจัดไม่ได้จนกว่าจะเติมลังครบ`,
            }
          : shortCount > 0
            ? {
                className: "bg-orange-50 border-orange-300 text-orange-800",
                text: `ลังขาด ${shortCount} ชั้น แต่ยังไม่ระงับ — ${boxWindowText(boxStock)}`,
              }
          : {
              className: "bg-green-50 border-green-300 text-green-800",
              text: "ลังทุกชั้นที่ตั้งไว้ถึงขั้นต่ำแล้ว — จัดได้ตามปกติ",
            };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">
          ระงับเมื่อลังยังเติมไม่ถึงขั้นต่ำ (รายชั้น)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          นับยอดลังที่บันทึกในแอปบันทึกลังของ<b>วันนี้</b> (ไม่นับรอบที่ถูกปฏิเสธ)
          ถ้าชั้นไหนยังไม่ถึงขั้นต่ำ ร้านที่มีสินค้ารอจัดบนชั้นนั้นจะเริ่มจัดไม่ได้
          จนกว่าจะเติมลังครบ · เว้นว่าง = ไม่เช็คชั้นนั้น · ใช้ค่าเดียวกันทุกวัน
        </p>
        <p className="text-sm text-gray-500 mt-1">
          ร้านด่วน ร้านที่กำลังจัดค้างอยู่ และเส้นทาง bypass ไม่ถูกระงับ ·
          ขึ้นวันใหม่ยอดเริ่มนับใหม่จาก 0
        </p>
        <div className={`mt-4 p-3 border rounded-lg text-sm ${notice.className}`}>
          {notice.text}
          {boxStock.enabled && (
            <span className="block text-xs opacity-80 mt-1">{boxWindowText(boxStock)}</span>
          )}
          {boxStock.synced_at && (
            <span className="block text-xs opacity-70 mt-1">
              อ่านยอดล่าสุด {formatTime(boxStock.synced_at)} น. · วันที่{" "}
              {boxStock.date}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {FLOORS.map((floor) => {
          const status = boxStock.floors.find((f) => f.floor === floor);
          const error = floorErrors[floor];
          return (
            <div
              key={floor}
              className={`p-4 rounded-lg border ${
                status?.blocked
                  ? "border-red-400 bg-red-50"
                  : status?.short
                    ? "border-orange-300 bg-orange-50"
                    : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">ชั้น {floor}</span>
                {status?.blocked ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-red-600 text-white">
                    ระงับ
                  </span>
                ) : status?.short ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-orange-500 text-white">
                    ลังขาด
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                เติมแล้ววันนี้{" "}
                <b className="text-gray-900">
                  {status?.refilled == null ? "-" : status.refilled}
                </b>{" "}
                ลัง
              </p>
              <label className="block text-sm text-gray-700 mt-2">
                ขั้นต่ำ (ลัง)
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`ขั้นต่ำลังชั้น ${floor}`}
                  value={drafts[String(floor)] ?? ""}
                  disabled={saving}
                  placeholder="ไม่เช็ค"
                  onChange={(event) =>
                    setDraft(String(floor), event.target.value)
                  }
                  className={`block w-full mt-1 px-3 py-2 border rounded-lg disabled:bg-gray-50 ${
                    error ? "border-red-400" : "border-gray-300"
                  }`}
                />
              </label>
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
          );
        })}
      </div>

      <div className="px-6 pb-6">
        <div
          className={`p-4 rounded-lg border ${
            boxStock.released
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">
                ปลดระงับเมื่อยอดเหลือจัดค้างเยอะ
              </p>
              <p className="text-sm text-gray-600 mt-1">
                ยอดเหลือจัดทั้งระบบสะสมถึง max → ปลดการระงับเพราะลังทุกชั้น ·
                ลดลงถึง min → กลับมาระงับ (ถ้าลังยังไม่ครบ) · เว้นว่างทั้งคู่ = ไม่ใช้
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">เหลือจัดทั้งระบบตอนนี้</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-xs text-gray-500">รายการ</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 max-w-md">
            <label className="block text-sm text-gray-700">
              min (กลับมาระงับ)
              <input
                type="text"
                inputMode="numeric"
                aria-label="ยอดเหลือจัด min ที่กลับมาระงับ"
                value={drafts[RELEASE_MIN] ?? ""}
                disabled={saving}
                placeholder="ไม่ใช้"
                onChange={(event) => setDraft(RELEASE_MIN, event.target.value)}
                className={`block w-full mt-1 px-3 py-2 border rounded-lg disabled:bg-gray-50 ${
                  releaseError ? "border-red-400" : "border-gray-300"
                }`}
              />
            </label>
            <label className="block text-sm text-gray-700">
              max (ปลดระงับ)
              <input
                type="text"
                inputMode="numeric"
                aria-label="ยอดเหลือจัด max ที่ปลดระงับ"
                value={drafts[RELEASE_MAX] ?? ""}
                disabled={saving}
                placeholder="ไม่ใช้"
                onChange={(event) => setDraft(RELEASE_MAX, event.target.value)}
                className={`block w-full mt-1 px-3 py-2 border rounded-lg disabled:bg-gray-50 ${
                  releaseError ? "border-red-400" : "border-gray-300"
                }`}
              />
            </label>
          </div>
          {releaseError && (
            <p className="text-xs text-red-600 mt-1">{releaseError}</p>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
        <p
          className={`text-sm ${dirty ? "text-amber-700 font-medium" : "text-gray-500"}`}
        >
          {dirty ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : "ค่าที่แสดงคือค่าที่ใช้งานอยู่"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDrafts(savedDrafts)}
            disabled={!dirty || saving}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            ยกเลิกการแก้ไข
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving || hasError}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าลัง"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderBlockBoxStockCard;
