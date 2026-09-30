import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

interface EmployeeRoute {
  route_code: string;
  route_name: string;
}

interface EmployeeLoadingLimit {
  emp_code: string;
  emp_name: string;
  max_stores_per_round: number;
  routes: EmployeeRoute[];
}

const logisticApiUrl = import.meta.env.VITE_API_URL_LOGISTIC?.replace(
  /\/$/,
  "",
);

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
  },
});

const responseMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  return typeof message === "string" ? message : fallback;
};

const EmployeeLoadingLimitSection = () => {
  const [employees, setEmployees] = useState<EmployeeLoadingLimit[]>([]);
  const [draftLimits, setDraftLimits] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingEmpCode, setSavingEmpCode] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!logisticApiUrl) {
      setError("ยังไม่ได้ตั้งค่า VITE_API_URL_LOGISTIC");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<EmployeeLoadingLimit[]>(
        `${logisticApiUrl}/api/logistic/employee/loading-limits`,
        authHeaders(),
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setEmployees(data);
      setDraftLimits(
        Object.fromEntries(
          data.map((employee) => [
            employee.emp_code,
            String(employee.max_stores_per_round),
          ]),
        ),
      );
    } catch (fetchError) {
      setError(responseMessage(fetchError, "โหลดข้อมูลพนักงานขนส่งไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLimits();
  }, [fetchLimits]);

  const filteredEmployees = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter(
      (employee) =>
        employee.emp_code.toLowerCase().includes(keyword) ||
        employee.emp_name.toLowerCase().includes(keyword) ||
        employee.routes.some(
          (route) =>
            route.route_code.toLowerCase().includes(keyword) ||
            route.route_name.toLowerCase().includes(keyword),
        ),
    );
  }, [employees, searchTerm]);

  const saveLimit = async (empCode: string) => {
    const value = Number(draftLimits[empCode]);
    if (!Number.isInteger(value) || value < 1) {
      await Swal.fire({
        icon: "warning",
        title: "จำนวนร้านไม่ถูกต้อง",
        text: "กรุณาระบุจำนวนเต็มตั้งแต่ 1 ขึ้นไป",
      });
      return;
    }
    if (!logisticApiUrl) return;

    setSavingEmpCode(empCode);
    try {
      const response = await axios.patch<EmployeeLoadingLimit>(
        `${logisticApiUrl}/api/logistic/employee/${encodeURIComponent(empCode)}/loading-limit`,
        { max_stores_per_round: value },
        authHeaders(),
      );
      setEmployees((current) =>
        current.map((employee) =>
          employee.emp_code === empCode ? response.data : employee,
        ),
      );
      setDraftLimits((current) => ({
        ...current,
        [empCode]: String(response.data.max_stores_per_round),
      }));
      await Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: `${response.data.emp_code} - ${response.data.emp_name}: ${response.data.max_stores_per_round} ร้านต่อรอบ`,
      });
    } catch (saveError) {
      await Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: responseMessage(saveError, "กรุณาลองใหม่อีกครั้ง"),
      });
    } finally {
      setSavingEmpCode(null);
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        จำกัดร้านต่อรอบรายพนักงานขนส่ง
      </h2>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            ค่าเริ่มต้น 10 ร้าน โดยนับรวมทุกเส้นทางของพนักงานในรอบเดียวกัน
          </p>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหารหัส ชื่อพนักงาน หรือเส้นทาง..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3" />
            กำลังโหลดข้อมูล...
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => void fetchLimits()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ลองใหม่
            </button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            ไม่พบพนักงานขนส่ง
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <div key={employee.emp_code} className="p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {employee.emp_code} - {employee.emp_name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {employee.routes.map((route) => (
                        <span
                          key={route.route_code}
                          className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {route.route_code} - {route.route_name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="text-sm text-gray-600">
                      ร้านต่อรอบ
                      <input
                        type="number"
                        min={1}
                        value={draftLimits[employee.emp_code] ?? ""}
                        onChange={(event) =>
                          setDraftLimits((current) => ({
                            ...current,
                            [employee.emp_code]: event.target.value,
                          }))
                        }
                        disabled={savingEmpCode === employee.emp_code}
                        className="block w-28 mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveLimit(employee.emp_code)}
                      disabled={savingEmpCode !== null}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingEmpCode === employee.emp_code
                        ? "กำลังบันทึก..."
                        : "บันทึก"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default EmployeeLoadingLimitSection;
