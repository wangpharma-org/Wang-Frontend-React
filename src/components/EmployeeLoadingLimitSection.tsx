import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type LimitMode = "TOTAL" | "ROUTE" | "NONE";

interface EmployeeRoute {
  route_code: string;
  route_name: string;
  max_stores_per_round: number | null;
}

interface EmployeeLoadingLimit {
  emp_code: string;
  emp_name: string;
  limit_mode: LimitMode;
  max_stores_per_round: number;
  routes: EmployeeRoute[];
}

interface DraftLimit {
  mode: LimitMode;
  total: string;
  routes: Record<string, string>;
}

const MODE_OPTIONS: { value: LimitMode; label: string }[] = [
  { value: "TOTAL", label: "รวมทุกเส้นทาง" },
  { value: "ROUTE", label: "แยกตามเส้นทาง" },
  { value: "NONE", label: "ไม่จำกัด" },
];

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

const toDraft = (employee: EmployeeLoadingLimit): DraftLimit => ({
  mode: employee.limit_mode ?? "TOTAL",
  total: String(employee.max_stores_per_round ?? ""),
  routes: Object.fromEntries(
    (employee.routes ?? []).map((route) => [
      route.route_code,
      route.max_stores_per_round == null
        ? ""
        : String(route.max_stores_per_round),
    ]),
  ),
});

const isStoreCount = (value: number) => Number.isInteger(value) && value >= 1;

const savedSummary = (employee: EmployeeLoadingLimit) => {
  if (employee.limit_mode === "NONE") return "ไม่จำกัดจำนวนร้าน";
  if (employee.limit_mode === "ROUTE") {
    return (employee.routes ?? [])
      .map(
        (route) =>
          `${route.route_code}: ${route.max_stores_per_round ?? "ไม่จำกัด"}`,
      )
      .join(", ");
  }
  return `${employee.max_stores_per_round} ร้านต่อรอบ`;
};

const EmployeeLoadingLimitSection = () => {
  const [employees, setEmployees] = useState<EmployeeLoadingLimit[]>([]);
  const [draftLimits, setDraftLimits] = useState<Record<string, DraftLimit>>(
    {},
  );
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
          data.map((employee) => [employee.emp_code, toDraft(employee)]),
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

  const updateDraft = useCallback(
    (empCode: string, change: (draft: DraftLimit) => DraftLimit) => {
      setDraftLimits((current) => {
        const draft = current[empCode];
        if (!draft) return current;
        return { ...current, [empCode]: change(draft) };
      });
    },
    [],
  );

  const saveLimit = async (employee: EmployeeLoadingLimit) => {
    const empCode = employee.emp_code;
    const draft = draftLimits[empCode];
    if (!draft || !logisticApiUrl) return;

    const payload: {
      limit_mode: LimitMode;
      max_stores_per_round?: number;
      route_limits?: { route_code: string; max_stores_per_round: number | null }[];
    } = { limit_mode: draft.mode };

    if (draft.mode === "TOTAL") {
      const value = Number(draft.total);
      if (!isStoreCount(value)) {
        await Swal.fire({
          icon: "warning",
          title: "จำนวนร้านไม่ถูกต้อง",
          text: "กรุณาระบุจำนวนเต็มตั้งแต่ 1 ขึ้นไป",
        });
        return;
      }
      payload.max_stores_per_round = value;
    }

    if (draft.mode === "ROUTE") {
      const routeLimits = (employee.routes ?? []).map((route) => {
        const raw = (draft.routes[route.route_code] ?? "").trim();
        return {
          route_code: route.route_code,
          max_stores_per_round: raw === "" ? null : Number(raw),
        };
      });
      const invalidRoute = routeLimits.find(
        (route) =>
          route.max_stores_per_round !== null &&
          !isStoreCount(route.max_stores_per_round),
      );
      if (invalidRoute) {
        await Swal.fire({
          icon: "warning",
          title: "จำนวนร้านไม่ถูกต้อง",
          text: `เส้นทาง ${invalidRoute.route_code}: กรุณาระบุจำนวนเต็มตั้งแต่ 1 ขึ้นไป หรือเว้นว่างถ้าไม่จำกัด`,
        });
        return;
      }
      payload.route_limits = routeLimits;
    }

    setSavingEmpCode(empCode);
    try {
      const response = await axios.patch<EmployeeLoadingLimit>(
        `${logisticApiUrl}/api/logistic/employee/${encodeURIComponent(empCode)}/loading-limit`,
        payload,
        authHeaders(),
      );
      setEmployees((current) =>
        current.map((item) =>
          item.emp_code === empCode ? response.data : item,
        ),
      );
      setDraftLimits((current) => ({
        ...current,
        [empCode]: toDraft(response.data),
      }));
      await Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: `${response.data.emp_code} - ${response.data.emp_name}: ${savedSummary(response.data)}`,
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
            เลือกได้รายคนว่าจะจำกัดรวมทุกเส้นทาง (ค่าเริ่มต้น 10 ร้าน)
            จำกัดแยกตามเส้นทาง หรือไม่จำกัด
            เส้นทางที่เว้นว่างไว้จะไม่จำกัดจำนวนร้าน
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
            {filteredEmployees.map((employee) => {
              const draft = draftLimits[employee.emp_code];
              const mode = draft?.mode ?? "TOTAL";
              const saving = savingEmpCode === employee.emp_code;
              return (
                <div key={employee.emp_code} className="p-5">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {employee.emp_code} - {employee.emp_name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {MODE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateDraft(employee.emp_code, (current) => ({
                                ...current,
                                mode: option.value,
                              }))
                            }
                            disabled={saving}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              mode === option.value
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {mode !== "ROUTE" && (
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
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      {mode === "TOTAL" && (
                        <label className="text-sm text-gray-600">
                          ร้านต่อรอบ
                          <input
                            type="number"
                            min={1}
                            value={draft?.total ?? ""}
                            onChange={(event) =>
                              updateDraft(employee.emp_code, (current) => ({
                                ...current,
                                total: event.target.value,
                              }))
                            }
                            disabled={saving}
                            className="block w-28 mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </label>
                      )}
                      {mode === "NONE" && (
                        <p className="text-sm text-gray-500 py-2">
                          ไม่จำกัดจำนวนร้าน
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => void saveLimit(employee)}
                        disabled={savingEmpCode !== null}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                      </button>
                    </div>
                  </div>
                  {mode === "ROUTE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                      {employee.routes.map((route) => (
                        <label
                          key={route.route_code}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700"
                        >
                          <span className="min-w-0 truncate">
                            {route.route_code} - {route.route_name}
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={draft?.routes[route.route_code] ?? ""}
                            onChange={(event) =>
                              updateDraft(employee.emp_code, (current) => ({
                                ...current,
                                routes: {
                                  ...current.routes,
                                  [route.route_code]: event.target.value,
                                },
                              }))
                            }
                            disabled={saving}
                            placeholder="ไม่จำกัด"
                            className="w-24 shrink-0 px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default EmployeeLoadingLimitSection;
