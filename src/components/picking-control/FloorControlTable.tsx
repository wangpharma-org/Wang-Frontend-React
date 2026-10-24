import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { formatTime, type BoxStockStatus, type FloorPickerOverview } from "../orderBlockUtils";
import type { BoxStockPayload } from "../OrderBlockBoxStockCard";
import type { FloorPickerPayload } from "../OrderBlockFloorPickerCard";
import Toggle from "./Toggle";
import { API, authHeaders } from "./pickingControlApi";
import HelpPanel from "./HelpPanel";
import Hint from "./Hint";

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

// HS-1000 — สถานะลงเวลาจาก HR ผ่าน backend (GET /order-block/floor-pickers/attendance) ใช้เตือนเท่านั้น ไม่ห้ามเลือก
type OnDutyState = "on_duty" | "checked_out" | "not_checked_in";
interface OnDutyStatus {
  state: OnDutyState;
  check_in_at: string | null;
  check_out_at: string | null;
}
interface Attendance {
  available: boolean;
  as_of: string | null;
  people: Record<string, OnDutyStatus>;
}

const ATTENDANCE_REFRESH_MS = 60_000;

const attendanceText = (status: OnDutyStatus | undefined): string => {
  if (!status || status.state === "not_checked_in") return "ยังไม่ลงเวลา";
  if (status.state === "checked_out") return `ออกงานแล้ว ${formatTime(status.check_out_at)}`;
  return `เข้างาน ${formatTime(status.check_in_at)}`;
};

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
  // null = ยังไม่ได้คำตอบ · available: false = ถาม HR ไม่ได้ (หน้าทำงานต่อ ไม่แสดงสถานะ)
  const [attendance, setAttendance] = useState<Attendance | null>(null);
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

  useEffect(() => {
    const load = () =>
      axios
        .get<Attendance>(`${API}/order-block/floor-pickers/attendance`, authHeaders())
        .then((res) => setAttendance(res.data))
        .catch(() => setAttendance({ available: false, as_of: null, people: {} }));
    void load();
    const timer = window.setInterval(load, ATTENDANCE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);
  const known = attendance?.available === true;
  const statusOf = (code: string) => (known ? attendance?.people[code] : undefined);
  const onDuty = (code: string) => statusOf(code)?.state === "on_duty";
  // ชั้นที่ตั้งคนไว้ (ตามค่าที่บันทึกแล้ว) แต่คนนั้นไม่ได้อยู่ในงาน — ระหว่างระงับชั้นนั้นจะไม่มีใครจัดได้
  const absentFloors = known
    ? FLOORS.filter((f) => saved.picker[f] && !onDuty(saved.picker[f]))
    : [];

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
            <HelpPanel topic="ตารางรายชั้น">
              <ul>
                <li>
                  <b>เติมแล้ววันนี้</b> — ยอดลังจากแอปบันทึกลังของวันนี้ ไม่นับรอบที่ถูกปฏิเสธ · ขึ้นวันใหม่เริ่มจาก 0 · อ่านใหม่ทุก 1 นาที
                </li>
                <li>
                  <b>ขั้นต่ำ</b> — ยอดยังไม่ถึง → ร้านที่มีสินค้ารอจัดบนชั้นนี้เริ่มจัดไม่ได้จนกว่าจะเติมลังครบ · เว้นว่าง = ไม่เช็คชั้นนี้
                </li>
                <li>
                  <b>คนจัดระหว่างระงับ</b> — 1 คนต่อชั้น ยังเริ่มจัดได้แม้ถูกระงับทุกแบบ เฉพาะร้านที่มีสินค้าชั้นนี้
                </li>
                <li>
                  <b>ปลดระงับ min/max</b> — เหลือจัดทั้งระบบถึง max → ปลดการระงับเพราะลังชั่วคราว, ลดถึง min → กลับมาระงับ
                </li>
                <li>สวิตช์มุมขวา = เปิด/ปิดแต่ละฟีเจอร์ทั้งระบบ</li>
              </ul>
              <p>ถ้าอ่านยอดจากแอปบันทึกลังไม่ได้ ระบบจะ<b>ไม่ระงับเพราะลัง</b>ชั่วคราว (กันคลังหยุดงาน)</p>
            </HelpPanel>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <label className="flex flex-wrap items-center justify-end gap-2 text-gray-700">
              <Hint k="boxFlag" label="ระงับเพราะลังขาด" />
              ระงับเพราะลังขาด
              <Toggle
                size="sm"
                label="เปิดใช้ระงับเพราะลังขาด"
                checked={boxStock.enabled}
                onChange={(next) => onToggleFlag("order-block-box-stock", next)}
              />
            </label>
            <label className="flex flex-wrap items-center justify-end gap-2 text-gray-700">
              <Hint k="pickerFlag" label="คนจัดระหว่างระงับ" />
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
        {absentFloors.length > 0 && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="floor-picker-absent">
            คนจัดระหว่างระงับไม่ได้อยู่ในงาน:{" "}
            {absentFloors
              .map((f) => `ชั้น ${f} ${saved.picker[f]} ${nickname(saved.picker[f])} (${attendanceText(statusOf(saved.picker[f]))})`)
              .join(" · ")}{" "}
            — ระหว่างระงับชั้นนี้จะไม่มีใครจัดได้ ควรเปลี่ยนเป็นคนที่เข้างานอยู่
          </p>
        )}
        {attendance && !attendance.available && (
          <p className="mt-3 text-xs text-gray-500" data-testid="floor-picker-attendance-unavailable">
            ดูสถานะลงเวลาจาก HR ไม่ได้ตอนนี้ — เลือกคนจัดได้ตามปกติ แต่ระบบเตือนไม่ได้ว่าใครไม่ได้เข้างาน
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
              <th className="px-4 py-2 text-right font-medium">เติมแล้ววันนี้<Hint k="floorRefilled" label="เติมแล้ววันนี้" /></th>
              <th className="px-4 py-2 text-left font-medium">ขั้นต่ำ (ลัง)<Hint k="floorMin" label="ขั้นต่ำ (ลัง)" /></th>
              <th className="px-4 py-2 text-left font-medium">สถานะ<Hint k="floorStatus" label="สถานะ" /></th>
              <th className="px-4 py-2 text-left font-medium">คนจัดระหว่างระงับ<Hint k="floorPicker" label="คนจัดระหว่างระงับ" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {FLOORS.map((floor) => {
              const status = boxStock.floors.find((f) => f.floor === floor);
              const error = minError(draft.min[floor] ?? "");
              const pickerCode = draft.picker[floor] ?? "";
              const listed = employees.some((e) => e.emp_code === pickerCode);
              // คนบนชั้นนี้ก่อน แล้วคนที่เข้างานอยู่ก่อน แล้วตามรหัส
              const options = [...employees].sort(
                (a, b) =>
                  Number(b.emp_floor === String(floor)) - Number(a.emp_floor === String(floor)) ||
                  Number(onDuty(b.emp_code)) - Number(onDuty(a.emp_code)) ||
                  a.emp_code.localeCompare(b.emp_code),
              );
              const pickerStatus = pickerCode && known ? statusOf(pickerCode) : undefined;
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
                      className="w-72 max-w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5"
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
                          {known ? ` · ${attendanceText(statusOf(e.emp_code))}` : ""}
                        </option>
                      ))}
                    </select>
                    {pickerCode && known && (
                      <p
                        className={`mt-0.5 text-[11px] ${pickerStatus?.state === "on_duty" ? "text-green-700" : "text-amber-700"}`}
                        data-testid={`floor-picker-status-${floor}`}
                      >
                        {pickerStatus?.state === "on_duty" ? "🟢" : "🟠"} {attendanceText(pickerStatus)}
                      </p>
                    )}
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
          <Hint k="releaseMin" label="min กลับมาระงับ" />
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
          <Hint k="releaseMax" label="max ปลดระงับ" />
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
            <Hint k="floorSave" label="บันทึกรายชั้น" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorControlTable;
