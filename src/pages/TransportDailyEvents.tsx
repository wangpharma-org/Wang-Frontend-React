import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { AlertTriangle, ChevronLeft, ChevronRight, MapPin, RefreshCw, User, X } from "lucide-react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "../context/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);

const API = import.meta.env.VITE_API_URL_LOGISTIC?.replace(/\/$/, "");
const labels: Record<string, string> = {
  TRAFFIC: "รถติด",
  ACCIDENT: "อุบัติเหตุ",
  WEATHER: "ฝนตก / สภาพอากาศ",
  VEHICLE_ISSUE: "รถเสีย / ยางแตก",
  OTHER: "อื่น ๆ",
};

interface EmployeeCard {
  emp_code: string;
  emp_name: string | null;
  event_count: number;
}

interface EmployeesSummary {
  date: string;
  employees: EmployeeCard[];
}

interface RouteSnapshot {
  route_code: string;
  route_name: string;
}

interface DailyEvent {
  id: number;
  event_type: string;
  note: string | null;
  image_url: string | null;
  occurred_at: string;
  emp_code: string;
  emp_name: string | null;
  routes: RouteSnapshot[];
}

interface EventPage {
  items: DailyEvent[];
  total: number;
  page: number;
  limit: number;
}

const messageFor = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    if (error.response?.status === 403) return "ไม่มีสิทธิ์ดูเหตุการณ์ระหว่างวัน";
    const message: unknown = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      return message.join(", ");
    }
  }
  return "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";
};

function EventDetails({ employee, date, token, onClose }: {
  employee: EmployeeCard;
  date: string;
  token: string | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EventPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    axios.get<EventPage>(`${API}/api/logistic/shipping/daily-events`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        date,
        page,
        limit: 20,
        emp_code: employee.emp_code,
      },
      signal: controller.signal,
    }).then((response) => {
      if (!controller.signal.aborted) setData(response.data);
    }).catch((fetchError: unknown) => {
      if (!controller.signal.aborted) setError(messageFor(fetchError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [employee.emp_code, date, page, token, refresh]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <Dialog open onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">{date} · เหตุการณ์ระหว่างวัน</p>
                  <DialogTitle className="mt-1 break-words text-xl font-semibold text-gray-900">
                    <span>{employee.emp_code} · </span>{employee.emp_name ?? "ไม่พบชื่อพนักงาน"}
                  </DialogTitle>
                </div>
                <button type="button" onClick={onClose} aria-label="ปิดรายละเอียด" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                  <X size={22} />
                </button>
              </div>
              <div className="space-y-4 p-5" aria-live="polite">
                {loading && <p role="status" className="py-8 text-center text-gray-500">กำลังโหลดเหตุการณ์...</p>}
                {error && (
                  <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
                    <p>{error}</p>
                    <button type="button" onClick={() => setRefresh((value) => value + 1)} className="mt-3 font-medium underline">ลองใหม่</button>
                  </div>
                )}
                {!loading && !error && data?.items.length === 0 && (
                  <p className="py-8 text-center text-gray-500">ไม่มีเหตุการณ์ในวันที่เลือก</p>
                )}
                {!loading && !error && data?.items.map((event) => (
                  <article key={event.id} className="rounded-xl border border-orange-100 bg-orange-50/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 font-semibold text-orange-800">
                        <AlertTriangle size={18} aria-hidden="true" />{labels[event.event_type] ?? event.event_type}
                      </h3>
                      <time dateTime={event.occurred_at} className="text-sm text-gray-500">
                        {dayjs(event.occurred_at).tz("Asia/Bangkok").format("DD/MM/YYYY HH:mm:ss")}
                      </time>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="text-xs font-medium text-gray-500">เส้นทาง ณ ขณะเกิดเหตุ:</span>
                      {event.routes && event.routes.length > 0 ? (
                        event.routes.map((r) => (
                          <span
                            key={r.route_code}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
                          >
                            <MapPin size={12} aria-hidden="true" className="text-blue-600" />
                            <span className="font-semibold">{r.route_code}</span> · {r.route_name}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          ไม่ระบุเส้นทาง
                        </span>
                      )}
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-gray-800">{event.note || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
                    {event.image_url && (
                      brokenImages[event.id]
                        ? <p className="mt-3 text-sm text-gray-500">ไม่สามารถโหลดภาพได้</p>
                        : <button type="button" onClick={() => setImage(event.image_url)} aria-label={`เปิดภาพเหตุการณ์ ${event.id}`} className="mt-4 block max-w-full overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-orange-500">
                            <img src={event.image_url} alt="ภาพประกอบเหตุการณ์" loading="lazy" className="max-h-56 max-w-full object-contain" onError={() => setBrokenImages((current) => ({ ...current, [event.id]: true }))} />
                          </button>
                    )}
                  </article>
                ))}
              </div>
              {data && !loading && !error && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm">
                  <p className="text-gray-500">{data.total} เหตุการณ์ · หน้า {page}/{totalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" aria-label="หน้าก่อนหน้า" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><ChevronLeft size={18} /></button>
                    <button type="button" aria-label="หน้าถัดไป" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><ChevronRight size={18} /></button>
                  </div>
                </div>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
      <Dialog open={image !== null} onClose={() => setImage(null)} className="relative z-[60]">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="relative max-h-full max-w-5xl rounded-xl bg-white p-3">
            <DialogTitle className="sr-only">ภาพประกอบเหตุการณ์</DialogTitle>
            <button type="button" onClick={() => setImage(null)} aria-label="ปิดภาพ" className="absolute right-4 top-4 rounded-full bg-white p-2 shadow"><X size={20} /></button>
            {image && <img src={image} alt="ภาพประกอบเหตุการณ์ขนาดใหญ่" className="max-h-[85vh] max-w-full object-contain" />}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

export default function TransportDailyEvents() {
  const { userInfo, accessToken } = useAuth();
  const isAdmin = userInfo?.manage_product === "Yes";
  const [date, setDate] = useState(() => dayjs().tz("Asia/Bangkok").format("YYYY-MM-DD"));
  const [summary, setSummary] = useState<EmployeesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<EmployeeCard | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    if (!API) {
      setError("ยังไม่ได้ตั้งค่า VITE_API_URL_LOGISTIC");
      setLoading(false);
      return () => controller.abort();
    }
    axios.get<EmployeesSummary>(`${API}/api/logistic/shipping/daily-events/employees`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { date },
      signal: controller.signal,
    }).then((response) => {
      if (!controller.signal.aborted) setSummary(response.data);
    }).catch((fetchError: unknown) => {
      if (!controller.signal.aborted) setError(messageFor(fetchError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [isAdmin, accessToken, date, refresh]);

  if (!isAdmin) {
    return <main className="mx-auto max-w-7xl p-6"><p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">ไม่มีสิทธิ์ดูเหตุการณ์ระหว่างวัน</p></main>;
  }

  const employees = summary?.employees ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-orange-600">สำหรับผู้ดูแล · ขนส่ง</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">เหตุการณ์ระหว่างวัน</h1>
          <p className="mt-2 text-sm text-gray-500">เลือกพนักงานเพื่อดูเหตุการณ์และเส้นทางที่รับผิดชอบ</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-gray-700">
            วันที่ (เวลาไทย)
            <input type="date" value={date} required onChange={(event) => {
              if (event.target.value) { setDate(event.target.value); setSelected(null); }
            }} className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2" />
          </label>
          <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />โหลดใหม่
          </button>
        </div>
      </div>
      <div className="mt-7" aria-live="polite">
        {loading && <p role="status" className="py-12 text-center text-gray-500">กำลังโหลดข้อมูลพนักงาน...</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{error}</p>}
        {!loading && !error && employees.length === 0 && (
          <p className="rounded-xl border border-gray-200 p-8 text-center text-gray-500">ไม่มีเหตุการณ์ในวันที่เลือก</p>
        )}
        {!loading && !error && employees.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employees.map((employee) => (
              <button
                type="button"
                key={employee.emp_code}
                onClick={() => setSelected(employee)}
                className="flex min-w-0 flex-col rounded-xl border border-orange-200 bg-orange-50/40 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-orange-500"
              >
                <div className="mb-4 flex w-full items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <User size={20} aria-hidden="true" />
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                    <AlertTriangle size={13} aria-hidden="true" />
                    {employee.event_count} เหตุการณ์
                  </span>
                </div>
                <p className="break-all text-sm font-medium text-gray-500">{employee.emp_code}</p>
                <h2 className="mt-1 break-words text-lg font-semibold text-gray-900">
                  {employee.emp_name ?? "ไม่พบชื่อพนักงาน"}
                </h2>
                <p className="mt-3 text-sm font-medium text-orange-700">
                  มีเหตุการณ์ · กดดูรายละเอียด
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <EventDetails
          key={`${date}:${selected.emp_code}`}
          employee={selected}
          date={date}
          token={accessToken}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
