import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { API, authHeaders, errorMessage } from "./pickingControlApi";
import HelpPanel from "./HelpPanel";

type PickingRuleMode = "normal" | "floor" | "person";

interface PickingRuleTarget {
  mode: PickingRuleMode;
  target_floor: string | null;
  target_emp_code: string | null;
}

interface PickingRuleStatus extends PickingRuleTarget {
  id: string | null;
  target_emp_nickname: string | null;
  pick_limit: number | null;
  occupancy: number;
  transition: {
    retiring: PickingRuleTarget & {
      occupancy: number;
      stores: { mem_code: string; mem_name: string; emp_code: string | null; emp_nickname: string | null }[];
    };
    queued: (PickingRuleTarget & { pick_limit: number | null }) | null;
  } | null;
}

interface PickerEmployee {
  emp_code: string;
  emp_nickname: string;
  emp_floor: string | null;
}

interface UrgentCustomer {
  mem_code: string;
  mem_name: string;
}

const PICKABLE_FLOORS = ["2", "3", "4", "5"];
const REFRESH_MS = 60_000;

const MODES: { value: PickingRuleMode; label: string }[] = [
  { value: "normal", label: "ปกติ (ไม่จำกัด)" },
  { value: "floor", label: "ตามชั้น" },
  { value: "person", label: "ตามพนักงาน" },
];

const describeTarget = (target: PickingRuleTarget): string => {
  if (target.mode === "floor") return `ชั้น ${target.target_floor ?? "-"}`;
  if (target.mode === "person") return `พนักงาน ${target.target_emp_code ?? "-"}`;
  return "ปกติ (ไม่จำกัด)";
};

const PickingRuleZone = () => {
  const [rule, setRule] = useState<PickingRuleStatus | null>(null);
  const [employees, setEmployees] = useState<PickerEmployee[]>([]);
  const [mode, setMode] = useState<PickingRuleMode>("normal");
  const [floor, setFloor] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [limit, setLimit] = useState("");
  const [savingRule, setSavingRule] = useState(false);

  const [urgent, setUrgent] = useState<UrgentCustomer[]>([]);
  const [urgentLimit, setUrgentLimit] = useState<number | null>(null);
  const [urgentLimitInput, setUrgentLimitInput] = useState("");
  const [memCodeInput, setMemCodeInput] = useState("");
  const [urgentBusy, setUrgentBusy] = useState(false);

  // syncForm = false ตอน refresh อัตโนมัติ ไม่ทับค่าที่แอดมินกำลังกรอก
  const fetchRule = useCallback(async (syncForm: boolean) => {
    try {
      const res = await axios.get<PickingRuleStatus>(`${API}/picking-rule/active`);
      setRule(res.data);
      if (syncForm) {
        setMode(res.data.mode);
        setFloor(res.data.target_floor ?? "");
        setEmpCode(res.data.target_emp_code ?? "");
        setLimit(res.data.pick_limit ? String(res.data.pick_limit) : "");
      }
    } catch (error) {
      console.error("Error fetching picking rule:", error);
    }
  }, []);

  const fetchUrgent = useCallback(async () => {
    try {
      const [list, setting] = await Promise.all([
        axios.get<UrgentCustomer[]>(`${API}/member/urgent`),
        axios.get<{ max_urgent_count: number }>(`${API}/urgent-setting`),
      ]);
      setUrgent(Array.isArray(list.data) ? list.data : []);
      setUrgentLimit(setting.data.max_urgent_count);
      setUrgentLimitInput(String(setting.data.max_urgent_count));
    } catch (error) {
      console.error("Error fetching urgent customers:", error);
    }
  }, []);

  useEffect(() => {
    void fetchRule(true);
    void fetchUrgent();
    axios
      .get<{ employees: PickerEmployee[] }>(`${API}/picking-rule/options`)
      .then((res) => setEmployees(res.data.employees ?? []))
      .catch((error) => console.error("Error fetching picker options:", error));
    const interval = setInterval(() => void fetchRule(false), REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchRule, fetchUrgent]);

  const saveRule = async () => {
    setSavingRule(true);
    try {
      const payload: Record<string, unknown> = { mode };
      if (mode === "floor") payload.target_floor = floor;
      if (mode === "person") payload.target_emp_code = empCode;
      if (mode !== "normal") payload.pick_limit = Number(limit);
      await axios.post(`${API}/picking-rule`, payload, authHeaders());
      await fetchRule(true);
      void Swal.fire({ icon: "success", title: "บันทึกกติกาเริ่มจัดสำเร็จ", timer: 1500, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: errorMessage(error, "กรุณาลองใหม่") });
    } finally {
      setSavingRule(false);
    }
  };

  const addUrgent = async () => {
    const code = memCodeInput.trim();
    if (!code) return;
    setUrgentBusy(true);
    try {
      const res = await axios.put(`${API}/member/urgent/${encodeURIComponent(code)}`);
      if (res.data === "Member not found") {
        void Swal.fire({ icon: "error", title: "ไม่พบรหัสลูกค้าในระบบ", text: `รหัสลูกค้า ${code} ไม่ถูกต้อง` });
      } else if (res.data === "Update OK!!") {
        void Swal.fire({ icon: "warning", title: "ลูกค้ารายนี้อยู่ในรายการด่วนแล้ว" });
      } else if (res.data?.error) {
        void Swal.fire({ icon: "error", title: "เพิ่มร้านด่วนไม่ได้", text: res.data.message ?? "เกิดข้อผิดพลาด" });
        return;
      } else {
        setUrgent((current) => [...current, res.data as UrgentCustomer]);
      }
      setMemCodeInput("");
    } catch (error) {
      void Swal.fire({ icon: "error", title: "เพิ่มร้านด่วนไม่ได้", text: errorMessage(error, "กรุณาลองใหม่") });
    } finally {
      setUrgentBusy(false);
    }
  };

  const cancelUrgent = async (memCode: string) => {
    setUrgentBusy(true);
    try {
      await axios.delete(`${API}/member/urgent/${encodeURIComponent(memCode)}`);
      setUrgent((current) => current.filter((c) => c.mem_code !== memCode));
    } catch {
      void Swal.fire({ icon: "error", title: "ยกเลิกด่วนไม่สำเร็จ" });
    } finally {
      setUrgentBusy(false);
    }
  };

  const saveUrgentLimit = async () => {
    setUrgentBusy(true);
    try {
      const res = await axios.put<{ max_urgent_count: number }>(
        `${API}/urgent-setting`,
        { max_urgent_count: Number(urgentLimitInput) },
        authHeaders(),
      );
      setUrgentLimit(res.data.max_urgent_count);
      void Swal.fire({ icon: "success", title: "บันทึก limit สำเร็จ", timer: 1500, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: errorMessage(error, "กรุณาลองใหม่") });
    } finally {
      setUrgentBusy(false);
    }
  };

  const ruleInvalid =
    (mode === "floor" && !floor) ||
    (mode === "person" && !empCode) ||
    (mode !== "normal" && !(Number(limit) >= 1));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">โซนจัดออเดอร์ · กติกาเริ่มจัด</h3>
        <div className="mb-3">
          <HelpPanel topic="กติกาเริ่มจัด">
            <ul>
              <li><b>ปกติ</b> — ทุกคนกดเริ่มจัดได้</li>
              <li><b>ตามชั้น</b> — เฉพาะพนักงานของชั้นที่เลือก และจัดพร้อมกันได้ไม่เกิน N ร้าน</li>
              <li><b>ตามพนักงาน</b> — เฉพาะพนักงานคนที่เลือก และจัดพร้อมกันได้ไม่เกิน N ร้าน</li>
            </ul>
            <p>
              เปลี่ยนกติกาตอนยังมีร้านค้างจากกติกาเดิม → ระบบรอให้ร้านค้างจัดเสร็จก่อนแล้วเปลี่ยนให้เอง (กล่องสีส้ม)
            </p>
          </HelpPanel>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="กติกาเริ่มจัด">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              onClick={() => setMode(option.value)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                mode === option.value
                  ? "border-blue-400 bg-blue-50 text-blue-800"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span
                className={`h-3.5 w-3.5 rounded-full border-2 ${
                  mode === option.value ? "border-blue-600 bg-blue-600 ring-2 ring-inset ring-white" : "border-gray-400"
                }`}
              />
              {option.label}
            </button>
          ))}
        </div>

        {mode !== "normal" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {mode === "floor" ? (
              <select
                aria-label="ชั้นที่เริ่มจัดได้"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">เลือกชั้น</option>
                {PICKABLE_FLOORS.map((f) => (
                  <option key={f} value={f}>
                    ชั้น {f}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  aria-label="พนักงานที่เริ่มจัดได้"
                  list="picking-control-employees"
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  placeholder="รหัสหรือชื่อพนักงาน"
                  className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <datalist id="picking-control-employees">
                  {employees.map((e) => (
                    <option key={e.emp_code} value={e.emp_code}>
                      {e.emp_code} - {e.emp_nickname}
                    </option>
                  ))}
                </datalist>
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              จัดพร้อมกันได้
              <input
                aria-label="จำนวนร้านที่จัดพร้อมกันได้"
                type="number"
                min={1}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2"
              />
              ร้าน
            </label>
          </div>
        )}

        {rule && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            รูปแบบปัจจุบัน: <b>{describeTarget(rule)}</b>
            {rule.mode === "person" && rule.target_emp_nickname ? ` (${rule.target_emp_nickname})` : ""}
            {rule.mode !== "normal" && ` — กำลังจัดอยู่ ${rule.occupancy}/${rule.pick_limit ?? "-"} ร้าน`}
          </div>
        )}
        {rule?.transition && (
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            ⏳ รูปแบบถัดไป ({rule.transition.queued ? describeTarget(rule.transition.queued) : "ยังไม่ได้กำหนด"})
            จะเริ่มเมื่อร้านค้าง {rule.transition.retiring.occupancy} ร้านของรูปแบบเดิมจัดเสร็จ
            (รีเฟรชอัตโนมัติทุก 60 วิ)
          </div>
        )}

        <button
          type="button"
          onClick={() => void saveRule()}
          disabled={savingRule || ruleInvalid}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {savingRule ? "กำลังบันทึก..." : "บันทึกกติกาเริ่มจัด"}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-red-700 w-full sm:w-auto">
            🚨 ลูกค้าด่วน ({urgent.length}
            {urgentLimit !== null ? `/${urgentLimit}` : ""})
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            limit
            <input
              aria-label="จำนวนร้านด่วนสูงสุด"
              type="number"
              min={1}
              value={urgentLimitInput}
              onChange={(e) => setUrgentLimitInput(e.target.value)}
              className="w-20 rounded-lg border border-gray-300 px-2 py-1"
            />
            <button
              type="button"
              onClick={() => void saveUrgentLimit()}
              disabled={urgentBusy || !(Number(urgentLimitInput) >= 1)}
              className="rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-50"
            >
              บันทึก
            </button>
          </div>
        </div>
        <div className="-mt-1 mb-3">
          <HelpPanel topic="ลูกค้าด่วน">
            <p>
              ร้านในรายการนี้ <b>ไม่ถูกระงับไม่ว่ากรณีใด</b> และมีป้าย "ด่วน" บนหน้าจัดออเดอร์
            </p>
            <ul>
              <li>เพิ่ม: พิมพ์รหัสลูกค้าแล้วกด Enter · ยกเลิก: กด "ยกเลิกด่วน"</li>
              <li><b>limit</b> = จำนวนร้านด่วนสูงสุดพร้อมกัน — เต็มแล้วเพิ่มไม่ได้</li>
            </ul>
          </HelpPanel>
        </div>
        <input
          aria-label="เพิ่มลูกค้าด่วน"
          value={memCodeInput}
          onChange={(e) => setMemCodeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addUrgent();
            }
          }}
          disabled={urgentBusy}
          placeholder="ใส่รหัสลูกค้าแล้วกด Enter เช่น 22007"
          className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <ul className="mt-2 space-y-2">
          {urgent.map((customer) => (
            <li
              key={customer.mem_code}
              className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                <b className="mr-2">{customer.mem_code}</b>
                {customer.mem_name}
              </span>
              <button
                type="button"
                onClick={() => void cancelUrgent(customer.mem_code)}
                disabled={urgentBusy}
                className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                ยกเลิกด่วน
              </button>
            </li>
          ))}
          {urgent.length === 0 && (
            <li className="text-sm text-gray-400">ยังไม่มีลูกค้าด่วน</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PickingRuleZone;
