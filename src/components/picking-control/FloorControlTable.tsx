import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { formatTime, type BoxStockStatus, type FloorPickerOverview } from "../orderBlockUtils";
import type { BoxStockPayload } from "../OrderBlockBoxStockCard";
import type { FloorPickerPayload } from "../OrderBlockFloorPickerCard";
import Toggle from "./Toggle";
import { API } from "./pickingControlApi";

// OPHMBC-322 — รวมการ์ดลังรายชั้น + คนจัดระหว่างระงับ (OPHMBC-320) เป็นตารางเดียว 1 แถว/ชั้น
export interface FloorTablePayload {
  box: BoxStockPayload;
  pickers: FloorPickerPayload[];
}

interface FloorControlTableProps {
  boxStock: BoxStockStatus;
  floorPickers: FloorPickerOverview;
  pendingCount: number;
  saving: boolean;
  onSave: (payload: FloorTablePayload) => Promise<void>;
  // สวิตช์ flag ของสองฟีเจอร์นี้ — แอดมินไม่ต้องยิง API เอง
  onToggleFlag: (module: "order-block-box-stock" | "order-block-floor-picker", next: boolean) => void;
}

interface PickerEmployee {
  emp_code: string;
  emp_nickname: string;
  emp_floor: string | null;
}

const FLOORS = [1, 2, 3, 4, 5];
const text = (value: number | string | null | undefined) => (value == null ? "" : String(value));

interface Draft {
  min: Record<number, string>;
  picker: Record<number, string>;
  releaseMin: string;
  releaseMax: string;
}

const toDraft = (box: BoxStockStatus, pickers: FloorPickerOverview): Draft => ({
  min: Object.fromEntries(FLOORS.map((f) => [f, text(box.floors.find((x) => x.floor === f)?.min_boxes)])),
  picker: Object.fromEntries(FLOORS.map((f) => [f, pickers.floors.find((x) => x.floor === f)?.emp_code ?? ""])),
  releaseMin: text(box.pending_release_min),
  releaseMax: text(box.pending_release_max),
});

const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

const minError = (value: string) => {
  const v = value.trim();
  if (!v) return null;
  return /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100000 ? null : "1-100,000 หรือเว้นว่าง";
};

const releaseError = (min: string, max: string) => {
  const a = min.trim();
  const b = max.trim();
  if (!a && !b) return null;
  if (!a || !b) return "กรอก min และ max ทั้งคู่ หรือเว้นว่างทั้งคู่";
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return "ต้องเป็นจำนวนเต็มไม่ติดลบ";
  return Number(a) < Number(b) ? null : "min ต้องน้อยกว่า max";
};

const toNumber = (value: string) => (value.trim() ? Number(value.trim()) : null);

const FloorControlTable = ({
  boxStock,
  floorPickers,
  pendingCount,
  saving,
  onSave,
  onToggleFlag,
}: FloorControlTableProps) => {
  const saved = useMemo(() => toDraft(boxStock, floorPickers), [boxStock, floorPickers]);
  const [draft, setDraft] = useState(saved);
  const [employees, setEmployees] = useState<PickerEmployee[]>([]);
  const dirty = !sameDraft(draft, saved);

  // refresh ทุกนาทีจาก section แม่ต้องไม่ทับค่าที่แอดมินกำลังแก้
  useEffect(() => {
    if (!dirty) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  useEffect(() => {
    axios
      .get<{ employees: PickerEmployee[] }>(`${API}/picking-rule/options`)
      .then((res) => setEmployees(res.data.employees ?? []))
      .catch((error) => console.error("Error fetching picker options:", error));
  }, []);

  const relError = releaseError(draft.releaseMin, draft.releaseMax);
  const hasError = relError !== null || FLOORS.some((f) => minError(draft.min[f] ?? "") !== null);
  const blockedCount = boxStock.floors.filter((f) => f.blocked).length;
  const boxUnavailable = boxStock.enabled && (!boxStock.configured || !!boxStock.error);

  const save = () =>
    onSave({
      box: {
        floors: FLOORS.map((floor) => ({ floor, min_boxes: toNumber(draft.min[floor] ?? "") })),
        pending_release_min: toNumber(draft.releaseMin),
        pending_release_max: toNumber(draft.releaseMax),
      },
      pickers: FLOORS.map((floor) => ({ floor, emp_code: draft.picker[floor] || null })),
    });

  const nickname = (code: string) =>
    employees.find((e) => e.emp_code === code)?.emp_nickname ??
    floorPickers.floors.find((f) => f.emp_code === code)?.emp_nickname ??
    "";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6" data-testid="floor-control-table">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-800">รายชั้น · ลังขั้นต่ำ + คนจัดระหว่างระงับ</h3>
            <p className="mt-1 text-xs text-gray-500">
              ยอดลังนับจากแอปบันทึกลังของ<b>วันนี้</b> (ไม่นับรอบที่ถูกปฏิเสธ) · ชั้นไหนไม่ถึงขั้นต่ำ ร้านที่มีสินค้ารอจัดบนชั้นนั้นเริ่มจัดไม่ได้ ·
              คนจัดระหว่างระงับเริ่มจัดได้เฉพาะร้านที่มีสินค้าชั้นของตัวเอง
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <label className="flex items-center justify-end gap-2 text-gray-700">
              ระงับเพราะลังขาด
              <Toggle
                size="sm"
                label="เปิดใช้ระงับเพราะลังขาด"
                checked={boxStock.enabled}
                onChange={(next) => onToggleFlag("order-block-box-stock", next)}
              />
            </label>
            <label className="flex items-center justify-end gap-2 text-gray-700">
              คนจัดระหว่างระงับ
              <Toggle
                size="sm"
                label="เปิดใช้คนจัดระหว่างระงับ"
                checked={floorPickers.enabled}
                onChange={(next) => onToggleFlag("order-block-floor-picker", next)}
              />
            </label>
          </div>
        </div>
        {boxUnavailable && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            อ่านยอดจากแอปบันทึกลังไม่ได้ — ระบบจะไม่ระงับจนกว่าจะอ่านได้ ({boxStock.error ?? "ยังไม่ได้ตั้งค่า"})
          </p>
        )}
        {boxStock.enabled && boxStock.released && (
          <p className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            ปลดการระงับเพราะลังชั่วคราว — ยอดเหลือจัดถึง {boxStock.pending_release_max} จะกลับมาระงับเมื่อลดถึง{" "}
            {boxStock.pending_release_min}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">ชั้น</th>
              <th className="px-4 py-2 text-right font-medium">เติมแล้ววันนี้</th>
              <th className="px-4 py-2 text-left font-medium">ขั้นต่ำ (ลัง)</th>
              <th className="px-4 py-2 text-left font-medium">สถานะ</th>
              <th className="px-4 py-2 text-left font-medium">คนจัดระหว่างระงับ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {FLOORS.map((floor) => {
              const status = boxStock.floors.find((f) => f.floor === floor);
              const error = minError(draft.min[floor] ?? "");
              const pickerCode = draft.picker[floor] ?? "";
              const listed = employees.some((e) => e.emp_code === pickerCode);
              const options = [...employees].sort(
                (a, b) =>
                  Number(b.emp_floor === String(floor)) - Number(a.emp_floor === String(floor)) ||
                  a.emp_code.localeCompare(b.emp_code),
              );
              return (
                <tr key={floor} className={status?.blocked ? "bg-red-50/60" : ""}>
                  <td className="px-4 py-2 font-semibold text-gray-900 whitespace-nowrap">ชั้น {floor}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <b>{status?.refilled == null ? "-" : status.refilled}</b> ลัง
                  </td>
                  <td className="px-4 py-2">
                    <input
                      aria-label={`ขั้นต่ำลังชั้น ${floor}`}
                      inputMode="numeric"
                      value={draft.min[floor] ?? ""}
                      disabled={saving}
                      placeholder="ไม่เช็ค"
                      onChange={(e) => setDraft((d) => ({ ...d, min: { ...d.min, [floor]: e.target.value } }))}
                      className={`w-24 rounded-lg border px-2 py-1.5 ${error ? "border-red-400" : "border-gray-300"}`}
                    />
                    {error && <p className="mt-0.5 text-[11px] text-red-600">{error}</p>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {status?.blocked ? (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">🔴 ระงับ</span>
                    ) : status?.min_boxes ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">🟢 ผ่าน</span>
                    ) : (
                      <span className="text-xs text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      aria-label={`คนจัดระหว่างระงับชั้น ${floor}`}
                      value={pickerCode}
                      disabled={saving}
                      onChange={(e) => setDraft((d) => ({ ...d, picker: { ...d.picker, [floor]: e.target.value } }))}
                      className="w-44 rounded-lg border border-gray-300 bg-white px-2 py-1.5"
                    >
                      <option value="">— ไม่มี —</option>
                      {pickerCode && !listed && (
                        <option value={pickerCode}>
                          {pickerCode} {nickname(pickerCode)}
                        </option>
                      )}
                      {options.map((e) => (
                        <option key={e.emp_code} value={e.emp_code}>
                          {e.emp_code} {e.emp_nickname}
                          {e.emp_floor ? ` (ชั้น ${e.emp_floor})` : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
          <span>ปลดระงับเพราะลังเมื่อเหลือจัดทั้งระบบถึง max · กลับมาระงับที่ min</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs border border-gray-200">
            เหลือจัดตอนนี้ <b>{pendingCount}</b>
          </span>
          <label className="flex items-center gap-1">
            min
            <input
              aria-label="ยอดเหลือจัด min ที่กลับมาระงับ"
              inputMode="numeric"
              value={draft.releaseMin}
              placeholder="ไม่ใช้"
              disabled={saving}
              onChange={(e) => setDraft((d) => ({ ...d, releaseMin: e.target.value }))}
              className={`w-24 rounded-lg border px-2 py-1 ${relError ? "border-red-400" : "border-gray-300"}`}
            />
          </label>
          <label className="flex items-center gap-1">
            max
            <input
              aria-label="ยอดเหลือจัด max ที่ปลดระงับ"
              inputMode="numeric"
              value={draft.releaseMax}
              placeholder="ไม่ใช้"
              disabled={saving}
              onChange={(e) => setDraft((d) => ({ ...d, releaseMax: e.target.value }))}
              className={`w-24 rounded-lg border px-2 py-1 ${relError ? "border-red-400" : "border-gray-300"}`}
            />
          </label>
        </div>
        {relError && <p className="text-xs text-red-600">{relError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-xs ${dirty ? "text-amber-700 font-medium" : "text-gray-500"}`}>
            {dirty
              ? "มีการแก้ไขที่ยังไม่ได้บันทึก"
              : `${blockedCount > 0 ? `กำลังระงับ ${blockedCount} ชั้น · ` : ""}${
                  boxStock.synced_at ? `อ่านยอดล่าสุด ${formatTime(boxStock.synced_at)} น.` : "ยังไม่ได้อ่านยอดลัง"
                }`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(saved)}
              disabled={!dirty || saving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              ยกเลิกการแก้ไข
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || saving || hasError}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกรายชั้น"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorControlTable;
