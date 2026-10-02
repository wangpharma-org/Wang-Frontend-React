import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import OrderBlockDayRow from "./OrderBlockDayRow";
import {
  DAY_NAMES,
  describeDay,
  describeStatus,
  formatTime,
  isSameDraft,
  toDrafts,
  toPayload,
  validateDay,
  type DayDraft,
  type OrderBlockOverview,
} from "./orderBlockUtils";

const orderBlockApiUrl = `${import.meta.env.VITE_API_URL_ORDER}/api/order-block`;
const STATUS_REFRESH_MS = 60_000;

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

const TONE_CLASS = {
  red: "bg-red-50 border-red-300 text-red-800",
  green: "bg-green-50 border-green-300 text-green-800",
  blue: "bg-blue-50 border-blue-300 text-blue-800",
  gray: "bg-gray-50 border-gray-300 text-gray-700",
};

const OrderBlockSection = () => {
  const [overview, setOverview] = useState<OrderBlockOverview | null>(null);
  const [drafts, setDrafts] = useState<DayDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingRoute, setTogglingRoute] = useState<string | null>(null);
  const [routeSearch, setRouteSearch] = useState("");

  const savedDrafts = useMemo(
    () => toDrafts(overview?.days ?? []),
    [overview?.days],
  );

  const dirty = useMemo(
    () =>
      drafts.some((draft, index) => {
        const saved = savedDrafts[index];
        return !saved || !isSameDraft(draft, saved);
      }),
    [drafts, savedDrafts],
  );

  // refresh สถานะเป็นระยะต้องไม่ทับค่าที่แอดมินกำลังแก้ค้างอยู่
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const applyOverview = useCallback(
    (data: OrderBlockOverview, resetDrafts: boolean) => {
      setOverview(data);
      if (resetDrafts) setDrafts(toDrafts(data?.days ?? []));
    },
    [],
  );

  const fetchOverview = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const response = await axios.get<OrderBlockOverview>(
          orderBlockApiUrl,
          authHeaders(),
        );
        applyOverview(response.data, !silent || !dirtyRef.current);
      } catch (fetchError) {
        if (!silent) {
          setError(responseMessage(fetchError, "โหลดการตั้งค่าไม่สำเร็จ"));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [applyOverview],
  );

  useEffect(() => {
    void fetchOverview(false);
    const interval = setInterval(
      () => void fetchOverview(true),
      STATUS_REFRESH_MS,
    );
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const rowInfo = useMemo(
    () =>
      drafts.map((draft) => ({
        error: validateDay(draft),
        summary: describeDay(draft),
      })),
    [drafts],
  );

  const hasError = useMemo(
    () => rowInfo.some((info) => info.error !== null),
    [rowInfo],
  );

  const todayDayOfWeek = overview?.status?.day_of_week;

  const statusSummary = useMemo(() => {
    if (!overview?.status) return null;
    return describeStatus(
      overview.status,
      (overview.days ?? []).find(
        (day) => day.day_of_week === overview.status.day_of_week,
      ),
    );
  }, [overview]);

  const departedRoutes = useMemo(
    () =>
      (overview?.routes ?? []).filter(
        (route) => route.departed_at && route.is_blocked,
      ),
    [overview?.routes],
  );

  const visibleRoutes = useMemo(() => {
    const keyword = routeSearch.trim().toLowerCase();
    return (overview?.routes ?? [])
      .filter(
        (route) =>
          !keyword ||
          route.route_code.toLowerCase().includes(keyword) ||
          (route.route_name ?? "").toLowerCase().includes(keyword),
      )
      .sort(
        (a, b) =>
          Number(b.block_bypass) - Number(a.block_bypass) ||
          a.route_code.localeCompare(b.route_code),
      );
  }, [overview?.routes, routeSearch]);

  const bypassCount = useMemo(
    () => (overview?.routes ?? []).filter((route) => route.block_bypass).length,
    [overview?.routes],
  );

  const changeDay = useCallback(
    (dayOfWeek: number, patch: Partial<DayDraft>) => {
      setDrafts((current) =>
        current.map((draft) =>
          draft.day_of_week === dayOfWeek ? { ...draft, ...patch } : draft,
        ),
      );
    },
    [],
  );

  const copyToAll = useCallback((dayOfWeek: number) => {
    setDrafts((current) => {
      const source = current.find((draft) => draft.day_of_week === dayOfWeek);
      if (!source) return current;
      return current.map((draft) => ({
        ...source,
        day_of_week: draft.day_of_week,
      }));
    });
  }, []);

  const resetDrafts = () => setDrafts(savedDrafts);

  const saveDays = async () => {
    if (hasError) {
      await Swal.fire({
        icon: "warning",
        title: "ยังบันทึกไม่ได้",
        text: "กรุณาแก้ไขวันที่มีข้อความสีแดงก่อน",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put<OrderBlockOverview>(
        `${orderBlockApiUrl}/days`,
        {
          days: drafts.map((draft) =>
            toPayload(
              draft,
              (overview?.days ?? []).find(
                (day) => day.day_of_week === draft.day_of_week,
              ),
            ),
          ),
        },
        authHeaders(),
      );
      applyOverview(response.data, true);
      await Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "มีผลกับหน้าจัดออเดอร์ทันที",
        timer: 1800,
        showConfirmButton: false,
      });
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

  const toggleBypass = async (routeCode: string, bypass: boolean) => {
    setTogglingRoute(routeCode);
    try {
      const response = await axios.put<OrderBlockOverview>(
        `${orderBlockApiUrl}/bypass/${encodeURIComponent(routeCode)}`,
        { bypass },
        authHeaders(),
      );
      applyOverview(response.data, !dirtyRef.current);
    } catch (toggleError) {
      await Swal.fire({
        icon: "error",
        title: "ปรับ bypass ไม่สำเร็จ",
        text: responseMessage(toggleError, "กรุณาลองใหม่อีกครั้ง"),
      });
    } finally {
      setTogglingRoute(null);
    }
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        ระงับการจัดออเดอร์อัตโนมัติ
      </h2>

      {loading ? (
        <div className="bg-white rounded-lg shadow-lg flex items-center justify-center py-12 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3" />
          กำลังโหลดข้อมูล...
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-red-600 mb-3">{error}</p>
          <button
            type="button"
            onClick={() => void fetchOverview(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            {statusSummary && (
              <div
                className={`m-6 mb-0 p-4 border rounded-lg ${TONE_CLASS[statusSummary.tone]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                      สถานะตอนนี้ · วัน
                      {DAY_NAMES[todayDayOfWeek ?? -1] ?? "-"}
                    </p>
                    <p className="text-lg font-bold mt-1">
                      {statusSummary.title}
                    </p>
                    <p className="text-sm mt-1">{statusSummary.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-70">เหลือจัดทั้งระบบ</p>
                    <p className="text-2xl font-bold">
                      {overview?.status?.pending_count ?? 0}
                    </p>
                    <p className="text-xs opacity-70">รายการ</p>
                  </div>
                </div>
                {departedRoutes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-sm font-medium mb-2">
                      ระงับเพราะรถออกแล้ว ({departedRoutes.length} เส้นทาง)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {departedRoutes.map((route) => (
                        <span
                          key={route.route_code}
                          className="px-2 py-1 text-xs rounded bg-white border border-current/30"
                        >
                          {route.route_code} - {route.route_name} · ออก{" "}
                          {formatTime(route.departed_at)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-6 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                ระบบจะระงับการจัดเมื่อไหร่
              </p>
              <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-1">
                <li>
                  <b>ตามตารางด้านล่าง</b> — ระงับทุกเส้นทางที่ไม่ได้ bypass
                  ถ้าเว้น min/max ว่างจะระงับทันทีเมื่อถึงเวลาเริ่ม
                  ถ้ากรอกไว้จะระงับเมื่อ "เหลือจัด" ลดลงถึง min
                  และเปิดเมื่อสะสมถึง max
                </li>
                <li>
                  <b>เมื่อรถออก</b> — เส้นทางที่รถคันสุดท้ายกดออกรถแล้ว
                  จะถูกระงับทันทีแม้ยังไม่ถึงเวลาเริ่ม
                </li>
                <li>
                  <b>ถึงเวลาสิ้นสุด</b> — เปิดจัดทุกเส้นทางเสมอ
                  ไม่ว่าจะถูกระงับด้วยเหตุผลใด
                </li>
              </ol>
              <p className="text-sm text-gray-500 mt-2">
                ร้านที่กำลังจัดค้างอยู่จัดต่อจนจบได้ ·
                ร้านที่ติดป้าย "ด่วน" ไม่ถูกระงับ
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {drafts.map((draft, index) => (
                <OrderBlockDayRow
                  key={draft.day_of_week}
                  draft={draft}
                  isToday={draft.day_of_week === todayDayOfWeek}
                  error={rowInfo[index]?.error ?? null}
                  summary={rowInfo[index]?.summary ?? ""}
                  disabled={saving}
                  onChange={changeDay}
                  onCopyToAll={copyToAll}
                />
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
              <p
                className={`text-sm ${dirty ? "text-amber-700 font-medium" : "text-gray-500"}`}
              >
                {dirty
                  ? "มีการแก้ไขที่ยังไม่ได้บันทึก"
                  : "ค่าที่แสดงคือค่าที่ใช้งานอยู่"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetDrafts}
                  disabled={!dirty || saving}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                >
                  ยกเลิกการแก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => void saveDays()}
                  disabled={!dirty || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกตาราง"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                เส้นทาง Bypass ({bypassCount})
              </h3>
              <p className="text-sm text-gray-600 mt-1 mb-4">
                เส้นทางที่เลือกจะไม่ถูกระงับอัตโนมัติไม่ว่ากรณีใด
                กดที่เส้นทางเพื่อเลือกหรือยกเลิก มีผลทันที
              </p>
              <input
                type="text"
                value={routeSearch}
                onChange={(event) => setRouteSearch(event.target.value)}
                placeholder="ค้นหารหัสหรือชื่อเส้นทาง..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {visibleRoutes.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                ไม่พบเส้นทาง
              </div>
            ) : (
              <div className="p-6 flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                {visibleRoutes.map((route) => (
                  <button
                    key={route.route_code}
                    type="button"
                    aria-pressed={route.block_bypass}
                    disabled={togglingRoute !== null}
                    onClick={() =>
                      void toggleBypass(route.route_code, !route.block_bypass)
                    }
                    className={`px-3 py-2 text-sm rounded-lg border disabled:opacity-50 ${
                      route.block_bypass
                        ? "bg-green-600 border-green-600 text-white hover:bg-green-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {route.block_bypass ? "✓ " : ""}
                    {route.route_code} - {route.route_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default OrderBlockSection;
