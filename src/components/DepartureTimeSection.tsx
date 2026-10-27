import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type TargetType = "employee" | "route";

interface DayTime {
  day_of_week: number;
  depart_time: string;
}

interface DepartureTimeConfig {
  target_type: TargetType;
  target_code: string;
  target_name: string | null;
  days: DayTime[];
}

interface LogisticEmployee {
  emp_code: string;
  emp_name: string;
}

interface LogisticRoute {
  route_code: string;
  route_name: string;
}

interface TargetOption {
  code: string;
  name: string;
}

// ลำดับแสดง จ.→อา. แต่ค่า day_of_week ยึด 0=อาทิตย์ ตาม backend
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "จ." },
  { value: 2, label: "อ." },
  { value: 3, label: "พ." },
  { value: 4, label: "พฤ." },
  { value: 5, label: "ศ." },
  { value: 6, label: "ส." },
  { value: 0, label: "อา." },
];

const TARGET_OPTIONS: { value: TargetType; label: string }[] = [
  { value: "employee", label: "รายพนักงาน" },
  { value: "route", label: "รายเส้นทาง" },
];

const emptyDraft = (): Record<number, string> =>
  Object.fromEntries(DAYS.map((day) => [day.value, ""]));

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
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" ? message : fallback;
};

const DepartureTimeSection = () => {
  const [configs, setConfigs] = useState<DepartureTimeConfig[]>([]);
  const [employees, setEmployees] = useState<LogisticEmployee[]>([]);
  const [routes, setRoutes] = useState<LogisticRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [targetType, setTargetType] = useState<TargetType>("employee");
  const [targetCode, setTargetCode] = useState("");
  const [draft, setDraft] = useState<Record<number, string>>(emptyDraft);

  const fetchAll = useCallback(async () => {
    if (!logisticApiUrl) {
      setError("ยังไม่ได้ตั้งค่า VITE_API_URL_LOGISTIC");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [configRes, employeeRes, routeRes] = await Promise.all([
        axios.get<DepartureTimeConfig[]>(
          `${logisticApiUrl}/api/logistic/departure-time`,
          authHeaders(),
        ),
        axios.get<LogisticEmployee[]>(
          `${logisticApiUrl}/api/logistic/employee/all`,
          authHeaders(),
        ),
        axios.get<LogisticRoute[]>(
          `${logisticApiUrl}/api/logistic/route/all`,
          authHeaders(),
        ),
      ]);
      setConfigs(Array.isArray(configRes.data) ? configRes.data : []);
      setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data : []);
      setRoutes(Array.isArray(routeRes.data) ? routeRes.data : []);
    } catch (fetchError) {
      setError(responseMessage(fetchError, "โหลดข้อมูลเวลาออกรถไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const targetOptions = useMemo<TargetOption[]>(
    () =>
      targetType === "employee"
        ? employees.map((e) => ({ code: e.emp_code, name: e.emp_name }))
        : routes.map((r) => ({ code: r.route_code, name: r.route_name })),
    [targetType, employees, routes],
  );

  const resetForm = useCallback(() => {
    setTargetCode("");
    setDraft(emptyDraft());
  }, []);

  const changeTargetType = (value: TargetType) => {
    setTargetType(value);
    resetForm();
  };

  const editConfig = (config: DepartureTimeConfig) => {
    setTargetType(config.target_type);
    setTargetCode(config.target_code);
    const next = emptyDraft();
    for (const day of config.days ?? []) {
      next[day.day_of_week] = day.depart_time;
    }
    setDraft(next);
    window.scrollTo({
      top: document.getElementById("departure-time-form")?.offsetTop ?? 0,
      behavior: "smooth",
    });
  };

  const saveConfig = async () => {
    if (!logisticApiUrl) return;
    if (!targetCode) {
      await Swal.fire({
        icon: "warning",
        title:
          targetType === "employee" ? "กรุณาเลือกพนักงาน" : "กรุณาเลือกเส้นทาง",
      });
      return;
    }

    const days = DAYS.filter((day) => draft[day.value]).map((day) => ({
      day_of_week: day.value,
      depart_time: draft[day.value],
    }));
    if (days.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "กรุณากำหนดเวลาอย่างน้อย 1 วัน",
        text: "ถ้าต้องการยกเลิกการกำหนดเวลา ให้กดลบจากรายการด้านล่าง",
      });
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${logisticApiUrl}/api/logistic/departure-time`,
        { target_type: targetType, target_code: targetCode, days },
        authHeaders(),
      );
      await fetchAll();
      resetForm();
      await Swal.fire({ icon: "success", title: "บันทึกสำเร็จ" });
    } catch (saveError) {
      await Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: responseMessage(saveError, "กรุณาลองใหม่อีกครั้ง"),
      });
    } finally {
      setSaving(false);
    }
  };

  const removeConfig = async (config: DepartureTimeConfig) => {
    if (!logisticApiUrl) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "ลบการกำหนดเวลาออกรถ?",
      text: `${config.target_code}${config.target_name ? ` - ${config.target_name}` : ""} จะกลับไปใช้การขออนุมัติออกรถตามปกติ`,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      await axios.delete(
        `${logisticApiUrl}/api/logistic/departure-time/${config.target_type}/${encodeURIComponent(config.target_code)}`,
        authHeaders(),
      );
      await fetchAll();
    } catch (deleteError) {
      await Swal.fire({
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: responseMessage(deleteError, "กรุณาลองใหม่อีกครั้ง"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">กำหนดเวลาออกรถ</h2>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div id="departure-time-form" className="p-6 border-b border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            พนักงานหรือเส้นทางที่กำหนดเวลาไว้ จะไม่ต้องกดขอออกรถจาก Admin
            — เมื่อถึงเวลาแอปจะแจ้งเตือนให้ออกรถได้ทันที
            (ก่อนถึงเวลาจะออกรถไม่ได้) วันที่เว้นว่างจะใช้การขออนุมัติตามปกติ
            · ถ้ากำหนดทั้งรายพนักงานและรายเส้นทาง จะใช้เวลารายพนักงานก่อน
            ถ้าพนักงานมีหลายเส้นทาง จะใช้เวลาที่เร็วที่สุด
          </p>

          <div className="flex flex-wrap gap-1 mb-4">
            {TARGET_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changeTargetType(option.value)}
                disabled={saving}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  targetType === option.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={targetCode}
            onChange={(event) => setTargetCode(event.target.value)}
            disabled={saving || loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">
              {targetType === "employee"
                ? "-- เลือกพนักงานขนส่ง --"
                : "-- เลือกเส้นทาง --"}
            </option>
            {targetOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} - {option.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700"
              >
                <span className="font-semibold">{day.label}</span>
                <input
                  type="time"
                  value={draft[day.value] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [day.value]: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ล้างค่า
            </button>
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
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
              onClick={() => void fetchAll()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ลองใหม่
            </button>
          </div>
        ) : configs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            ยังไม่มีการกำหนดเวลาออกรถ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">ประเภท</th>
                  <th className="px-4 py-3 text-left">พนักงาน / เส้นทาง</th>
                  {DAYS.map((day) => (
                    <th key={day.value} className="px-2 py-3 text-center">
                      {day.label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {configs.map((config) => (
                  <DepartureTimeRow
                    key={`${config.target_type}:${config.target_code}`}
                    config={config}
                    disabled={saving}
                    onEdit={editConfig}
                    onRemove={(item) => void removeConfig(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

interface DepartureTimeRowProps {
  config: DepartureTimeConfig;
  disabled: boolean;
  onEdit: (config: DepartureTimeConfig) => void;
  onRemove: (config: DepartureTimeConfig) => void;
}

const DepartureTimeRow = ({
  config,
  disabled,
  onEdit,
  onRemove,
}: DepartureTimeRowProps) => {
  const timeByDay = useMemo(
    () =>
      new Map(
        (config.days ?? []).map((day) => [day.day_of_week, day.depart_time]),
      ),
    [config.days],
  );

  return (
    <tr>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 text-xs rounded border ${
            config.target_type === "employee"
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          {config.target_type === "employee" ? "พนักงาน" : "เส้นทาง"}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-gray-900">
        {config.target_code}
        {config.target_name ? ` - ${config.target_name}` : ""}
      </td>
      {DAYS.map((day) => (
        <td key={day.value} className="px-2 py-3 text-center text-gray-700">
          {timeByDay.get(day.value) ?? (
            <span className="text-gray-300">—</span>
          )}
        </td>
      ))}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <button
          type="button"
          onClick={() => onEdit(config)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={() => onRemove(config)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
        >
          ลบ
        </button>
      </td>
    </tr>
  );
};

export default DepartureTimeSection;
