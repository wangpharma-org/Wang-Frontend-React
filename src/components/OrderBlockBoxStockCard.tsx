import { useEffect, useMemo, useState } from "react";
import { formatTime, type BoxStockStatus } from "./orderBlockUtils";

export interface BoxFloorPayload {
  floor: number;
  min_boxes: number | null;
}

interface OrderBlockBoxStockCardProps {
  boxStock: BoxStockStatus;
  saving: boolean;
  onSave: (floors: BoxFloorPayload[]) => Promise<void>;
}

const FLOORS = [1, 2, 3, 4, 5];

// ช่องเก็บเป็น string เพื่อให้แอดมินเคลียร์เป็นว่าง (= ไม่เช็คชั้นนั้น) ได้
const toDrafts = (boxStock: BoxStockStatus): Record<number, string> =>
  Object.fromEntries(
    FLOORS.map((floor) => {
      const min = boxStock.floors.find((f) => f.floor === floor)?.min_boxes;
      return [floor, min == null ? "" : String(min)];
    }),
  );

const validate = (value: string): string | null => {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return "ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป หรือเว้นว่าง";
  }
  return Number(text) > 100000 ? "ไม่เกิน 100,000 ลัง" : null;
};

const OrderBlockBoxStockCard = ({
  boxStock,
  saving,
  onSave,
}: OrderBlockBoxStockCardProps) => {
  const savedDrafts = useMemo(() => toDrafts(boxStock), [boxStock]);
  const [drafts, setDrafts] = useState(savedDrafts);

  const dirty = FLOORS.some(
    (floor) => (drafts[floor] ?? "").trim() !== (savedDrafts[floor] ?? ""),
  );
  const errors = Object.fromEntries(
    FLOORS.map((floor) => [floor, validate(drafts[floor] ?? "")]),
  );
  const hasError = FLOORS.some((floor) => errors[floor] !== null);

  // refresh สถานะทุกนาทีต้องไม่ทับค่าที่แอดมินกำลังแก้ค้างอยู่
  useEffect(() => {
    if (!dirty) setDrafts(savedDrafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDrafts]);

  // บันทึกสำเร็จแล้วค่าที่ได้กลับมาตรงกับ drafts → dirty = false แล้ว effect ด้านบนซิงก์ให้เอง
  const save = () =>
    onSave(
      FLOORS.map((floor) => {
        const text = (drafts[floor] ?? "").trim();
        return { floor, min_boxes: text ? Number(text) : null };
      }),
    );

  const blockedCount = boxStock.floors.filter((f) => f.blocked).length;
  const notice = !boxStock.enabled
    ? {
        className: "bg-gray-50 border-gray-300 text-gray-700",
        text: "ยังไม่เปิดใช้งาน (feature flag order-block-box-stock ปิดอยู่) — ตั้งค่าไว้ก่อนได้ แต่ยังไม่ระงับ",
      }
    : !boxStock.configured || boxStock.error
      ? {
          className: "bg-amber-50 border-amber-300 text-amber-800",
          text: `อ่านยอดจากแอปบันทึกลังไม่ได้ — ระบบจะไม่ระงับจนกว่าจะอ่านได้ (${boxStock.error ?? "ยังไม่ได้ตั้งค่า"})`,
        }
      : blockedCount > 0
        ? {
            className: "bg-red-50 border-red-300 text-red-800",
            text: `กำลังระงับ ${blockedCount} ชั้น — ร้านที่มีสินค้ารอจัดบนชั้นนั้นจะเริ่มจัดไม่ได้จนกว่าจะเติมลังครบ`,
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
          const error = errors[floor];
          return (
            <div
              key={floor}
              className={`p-4 rounded-lg border ${
                status?.blocked
                  ? "border-red-400 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">ชั้น {floor}</span>
                {status?.blocked && (
                  <span className="px-2 py-0.5 text-xs rounded bg-red-600 text-white">
                    ระงับ
                  </span>
                )}
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
                  value={drafts[floor] ?? ""}
                  disabled={saving}
                  placeholder="ไม่เช็ค"
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [floor]: event.target.value,
                    }))
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
            {saving ? "กำลังบันทึก..." : "บันทึกขั้นต่ำลัง"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderBlockBoxStockCard;
