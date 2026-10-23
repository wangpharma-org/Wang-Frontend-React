import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import type { FloorPickerOverview } from "./orderBlockUtils";

export interface FloorPickerPayload {
  floor: number;
  emp_code: string | null;
}

interface PickerEmployee {
  emp_code: string;
  emp_nickname: string;
  emp_floor: string | null;
}

interface OrderBlockFloorPickerCardProps {
  floorPickers: FloorPickerOverview;
  saving: boolean;
  onSave: (floors: FloorPickerPayload[]) => Promise<void>;
}

const FLOORS = [1, 2, 3, 4, 5];

const toDrafts = (overview: FloorPickerOverview): Record<number, string> =>
  Object.fromEntries(
    FLOORS.map((floor) => [
      floor,
      overview.floors.find((f) => f.floor === floor)?.emp_code ?? "",
    ]),
  );

const OrderBlockFloorPickerCard = ({
  floorPickers,
  saving,
  onSave,
}: OrderBlockFloorPickerCardProps) => {
  const savedDrafts = useMemo(() => toDrafts(floorPickers), [floorPickers]);
  const [drafts, setDrafts] = useState(savedDrafts);
  const [employees, setEmployees] = useState<PickerEmployee[]>([]);

  const dirty = FLOORS.some(
    (floor) => (drafts[floor] ?? "") !== (savedDrafts[floor] ?? ""),
  );

  // refresh สถานะทุกนาทีต้องไม่ทับค่าที่แอดมินกำลังแก้ค้างอยู่
  useEffect(() => {
    if (!dirty) setDrafts(savedDrafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDrafts]);

  // รายชื่อพนักงานที่ใช้งานอยู่ — ตัวเดียวกับหน้ากำหนดสิทธิ์การจัด (picking-rule)
  useEffect(() => {
    axios
      .get<{ employees: PickerEmployee[] }>(
        `${import.meta.env.VITE_API_URL_ORDER}/api/picking-rule/options`,
      )
      .then((response) => setEmployees(response.data.employees ?? []))
      .catch((error) => console.error("Error fetching picker options:", error));
  }, []);

  // คนบนชั้นนั้นขึ้นก่อน ที่เหลือเรียงตามรหัส
  const optionsFor = (floor: number) =>
    [...employees].sort(
      (a, b) =>
        Number(b.emp_floor === String(floor)) -
          Number(a.emp_floor === String(floor)) ||
        a.emp_code.localeCompare(b.emp_code),
    );

  const nicknameOf = (empCode: string) =>
    employees.find((employee) => employee.emp_code === empCode)?.emp_nickname ??
    floorPickers.floors.find((f) => f.emp_code === empCode)?.emp_nickname ??
    "";

  const save = () =>
    onSave(
      FLOORS.map((floor) => ({ floor, emp_code: drafts[floor] || null })),
    );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">
          คนจัดได้ระหว่างระงับ (ชั้นละ 1 คน)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          ช่วงที่ร้านถูกระงับการจัด ไม่ว่าจะเพราะเวลา/ยอดค้าง รถออก หรือลังขาด
          คนที่เลือกไว้ยังเริ่มจัดได้ <b>เฉพาะร้านที่มีสินค้ารอจัดบนชั้นที่ตั้งไว้</b>{" "}
          · เว้นว่าง = ชั้นนั้นไม่มีใครจัดได้ระหว่างระงับ
        </p>
        {!floorPickers.enabled && (
          <div className="mt-4 p-3 border rounded-lg text-sm bg-gray-50 border-gray-300 text-gray-700">
            ยังไม่เปิดใช้งาน (feature flag order-block-floor-picker ปิดอยู่) —
            ตั้งค่าไว้ก่อนได้ แต่ยังไม่มีผล
          </div>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {FLOORS.map((floor) => {
          const value = drafts[floor] ?? "";
          const options = optionsFor(floor);
          const missing =
            value && !options.some((employee) => employee.emp_code === value);
          return (
            <label
              key={floor}
              className={`block p-4 rounded-lg border text-sm text-gray-700 ${
                value ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <span className="font-semibold text-gray-900">ชั้น {floor}</span>
              <select
                aria-label={`คนจัดระหว่างระงับชั้น ${floor}`}
                value={value}
                disabled={saving}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [floor]: event.target.value,
                  }))
                }
                className="block w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-50"
              >
                <option value="">— ไม่มี —</option>
                {missing && (
                  <option value={value}>
                    {value} {nicknameOf(value)}
                  </option>
                )}
                {options.map((employee) => (
                  <option key={employee.emp_code} value={employee.emp_code}>
                    {employee.emp_code} {employee.emp_nickname}
                    {employee.emp_floor ? ` (ชั้น ${employee.emp_floor})` : ""}
                  </option>
                ))}
              </select>
            </label>
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
            disabled={!dirty || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกคนจัดรายชั้น"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderBlockFloorPickerCard;
