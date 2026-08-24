import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type Assignment = { id: string; floor_code: string; emp_code: string; is_active: boolean };
type Employee = { emp_code: string; emp_nickname?: string | null };
const FLOORS = ["2", "3", "4", "5"];

export default function FloorLightOperatorManage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingFloor, setSavingFloor] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const endpoint = `${import.meta.env.VITE_API_URL_ORDER}/api/floor-light-operators`;
  const headers = useMemo(() => ({ Authorization: `Bearer ${sessionStorage.getItem("access_token")}` }), []);

  const load = async () => {
    setLoading(true);
    try {
      const [assignmentRes, employeeRes] = await Promise.all([
        axios.get<Assignment[]>(endpoint, { headers }),
        axios.get<Employee[]>(`${endpoint}/employees`, { headers }),
      ]);
      setAssignments(assignmentRes.data);
      setEmployees(employeeRes.data);
      setSelected(Object.fromEntries(assignmentRes.data.map((item) => [item.floor_code, item.emp_code])));
    } catch {
      setMessage("ไม่สามารถโหลดข้อมูลผู้ดูแลระบบไฟได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async (floor: string) => {
    const empCode = selected[floor];
    if (!empCode) { setMessage("กรุณาเลือกพนักงานก่อนบันทึก"); return; }
    setSavingFloor(floor);
    try {
      await axios.put(`${endpoint}/${floor}`, { emp_code: empCode }, { headers });
      setMessage(`บันทึกผู้ดูแลชั้น ${floor} สำเร็จ`);
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? "บันทึกข้อมูลไม่สำเร็จ");
    } finally { setSavingFloor(null); }
  };

  const remove = async (floor: string) => {
    setSavingFloor(floor);
    try {
      await axios.delete(`${endpoint}/${floor}`, { headers });
      setSelected((current) => ({ ...current, [floor]: "" }));
      setMessage(`ยกเลิกผู้ดูแลชั้น ${floor} แล้ว`);
      await load();
    } catch { setMessage("ยกเลิกข้อมูลไม่สำเร็จ"); }
    finally { setSavingFloor(null); }
  };

  const current = (floor: string) => assignments.find((item) => item.floor_code === floor);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าพนักงานประจำระบบไฟ</h1>
          <p className="mt-2 text-sm text-slate-500">กำหนดพนักงานได้ 1 คนต่อ 1 ชั้น เมื่อพนักงานเข้าร้าน ระบบจะเปิดไฟเฉพาะสินค้าบนชั้นที่รับผิดชอบ</p>
        </div>
        {message && <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}
        <div className="grid gap-5 md:grid-cols-2">
          {FLOORS.map((floor) => {
            const assignment = current(floor);
            const busy = savingFloor === floor;
            return <section key={floor} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">ชั้น {floor}</h2>
                <span className={assignment ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500"}>{assignment ? "กำหนดแล้ว" : "ยังไม่กำหนด"}</span>
              </div>
              <label className="mb-2 block text-sm font-medium text-slate-700">พนักงานผู้ดูแล</label>
              <select value={selected[floor] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [floor]: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" disabled={loading || busy}>
                <option value="">เลือกพนักงาน</option>
                {employees.map((employee) => <option key={employee.emp_code} value={employee.emp_code}>{employee.emp_code} {employee.emp_nickname ? `- ${employee.emp_nickname}` : ""}</option>)}
              </select>
              <div className="mt-4 flex gap-3">
                <button onClick={() => void save(floor)} disabled={loading || busy} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? "กำลังบันทึก..." : "บันทึก"}</button>
                {assignment && <button onClick={() => void remove(floor)} disabled={busy} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed">ยกเลิก</button>}
              </div>
            </section>;
          })}
        </div>
      </div>
    </main>
  );
}