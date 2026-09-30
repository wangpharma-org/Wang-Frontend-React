import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

interface OrderPauseSchedule {
  id: number;
  start_time: string;
  end_time: string;
  msg: string | null;
  is_enabled: boolean;
}

const orderApiUrl = `${import.meta.env.VITE_API_URL_ORDER}/api/order-pause-schedule`;

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

const OrderPauseScheduleSection = () => {
  const [schedules, setSchedules] = useState<OrderPauseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [msg, setMsg] = useState("");

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<OrderPauseSchedule[]>(
        orderApiUrl,
        authHeaders(),
      );
      setSchedules(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      setError(responseMessage(fetchError, "โหลดช่วงเวลาระงับไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  const addSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startTime || !endTime) {
      await Swal.fire({
        icon: "warning",
        title: "กรุณาระบุเวลาปิดและเวลาเปิด",
      });
      return;
    }
    if (startTime === endTime) {
      await Swal.fire({
        icon: "warning",
        title: "เวลาปิดและเวลาเปิดต้องไม่เท่ากัน",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post<OrderPauseSchedule>(
        orderApiUrl,
        { start_time: startTime, end_time: endTime, msg: msg.trim() || null },
        authHeaders(),
      );
      setSchedules((current) =>
        [...current, response.data].sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        ),
      );
      setStartTime("");
      setEndTime("");
      setMsg("");
    } catch (saveError) {
      await Swal.fire({
        icon: "error",
        title: "เพิ่มช่วงเวลาไม่สำเร็จ",
        text: responseMessage(saveError, "กรุณาลองใหม่อีกครั้ง"),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (schedule: OrderPauseSchedule) => {
    setSaving(true);
    try {
      const response = await axios.put<OrderPauseSchedule>(
        `${orderApiUrl}/${schedule.id}`,
        { is_enabled: !schedule.is_enabled },
        authHeaders(),
      );
      setSchedules((current) =>
        current.map((item) => (item.id === schedule.id ? response.data : item)),
      );
    } catch (saveError) {
      await Swal.fire({
        icon: "error",
        title: "ปรับสถานะไม่สำเร็จ",
        text: responseMessage(saveError, "กรุณาลองใหม่อีกครั้ง"),
      });
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = async (schedule: OrderPauseSchedule) => {
    const result = await Swal.fire({
      icon: "question",
      title: "ลบช่วงเวลาระงับ",
      text: `${schedule.start_time} - ${schedule.end_time}`,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setSaving(true);
    try {
      await axios.delete(`${orderApiUrl}/${schedule.id}`, authHeaders());
      setSchedules((current) =>
        current.filter((item) => item.id !== schedule.id),
      );
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
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        ตั้งเวลาระงับการจัดออเดอร์
      </h2>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <form
          onSubmit={(event) => void addSchedule(event)}
          className="p-6 border-b border-gray-200 flex flex-wrap gap-4 items-end"
        >
          <label className="text-sm text-gray-600">
            เวลาปิด (เริ่มระงับ)
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={saving}
              className="block mt-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="text-sm text-gray-600">
            เวลาเปิด (กลับมาจัดได้)
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={saving}
              className="block mt-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="text-sm text-gray-600 flex-1 min-w-[200px]">
            หมายเหตุที่แสดงบนจอพนักงาน (ไม่บังคับ)
            <input
              type="text"
              value={msg}
              maxLength={255}
              onChange={(event) => setMsg(event.target.value)}
              disabled={saving}
              placeholder="เช่น พักเที่ยง"
              className="block w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            เพิ่มช่วงเวลา
          </button>
          <p className="w-full text-sm text-gray-500">
            ระบบจะปิดการจัดออเดอร์เมื่อถึงเวลาปิด และเปิดคืนเมื่อถึงเวลาเปิดทุกวัน
            ถ้าเวลาเปิดน้อยกว่าเวลาปิดจะนับเป็นช่วงข้ามเที่ยงคืน
          </p>
        </form>

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
              onClick={() => void fetchSchedules()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ลองใหม่
            </button>
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            ยังไม่มีช่วงเวลาระงับ
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`p-5 flex flex-wrap justify-between items-center gap-4 ${
                  schedule.is_enabled ? "" : "opacity-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    ปิด {schedule.start_time} → เปิด {schedule.end_time}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {schedule.msg ?? "ใช้ข้อความ default"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleEnabled(schedule)}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                      schedule.is_enabled
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-500 hover:bg-gray-600"
                    }`}
                  >
                    {schedule.is_enabled ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSchedule(schedule)}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default OrderPauseScheduleSection;
