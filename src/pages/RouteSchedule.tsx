/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs, { Dayjs } from "dayjs";
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";

interface RouteRef {
    route_code: string;
    route_name: string;
}

interface OverviewRow {
    emp_code: string;
    emp_name: string;
    routes: RouteRef[];
}

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const CHIP_COLORS = [
    "bg-blue-50 text-blue-700 ring-blue-600/20",
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    "bg-amber-50 text-amber-700 ring-amber-600/20",
    "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20",
    "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    "bg-rose-50 text-rose-700 ring-rose-600/20",
];

const chipColor = (route_code: string) => {
    let hash = 0;
    for (let i = 0; i < route_code.length; i++) hash = (hash * 31 + route_code.charCodeAt(i)) >>> 0;
    return CHIP_COLORS[hash % CHIP_COLORS.length];
};

const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
});

const RouteSchedule = () => {
    const userAuth = sessionStorage.getItem("user_info");
    const role = userAuth ? JSON.parse(userAuth).user_role : null;
    const isManager = role?.toUpperCase() === "MANAGER" || role?.toUpperCase() === "ADMIN";

    const today = useMemo(() => dayjs().startOf("day"), []);
    const [visibleMonth, setVisibleMonth] = useState<Dayjs>(today.startOf("month"));
    const [selectedDate, setSelectedDate] = useState<Dayjs>(today);
    const [routes, setRoutes] = useState<RouteRef[]>([]);
    const [overview, setOverview] = useState<OverviewRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [assignedFilter, setAssignedFilter] = useState<"all" | "assigned" | "unassigned">("all");
    const [editingRow, setEditingRow] = useState<OverviewRow | null>(null);

    const selectedDateStr = selectedDate.format("YYYY-MM-DD");

    useEffect(() => {
        if (!isManager) return;
        fetchRoutes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isManager) return;
        fetchOverview(selectedDateStr);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDateStr]);

    const fetchRoutes = async () => {
        try {
            const res = await axios.get(`${API}/api/logistic/route/all`, {
                headers: authHeaders(),
            });
            setRoutes(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching routes:", error);
            setRoutes([]);
        }
    };

    const fetchOverview = async (date: string) => {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/api/logistic/route-schedule/overview`, {
                params: { date },
                headers: authHeaders(),
            });
            setOverview(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching route schedule overview:", error);
            setOverview([]);
        } finally {
            setLoading(false);
        }
    };

    const assignedCount = overview.filter((row) => row.routes.length > 0).length;
    const unassignedCount = overview.length - assignedCount;

    const filteredOverview = overview
        .filter(
            (row) =>
                row.emp_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.emp_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter((row) => {
            if (assignedFilter === "assigned") return row.routes.length > 0;
            if (assignedFilter === "unassigned") return row.routes.length === 0;
            return true;
        });

    const handleSaveRoutes = async (emp_code: string, route_codes: string[]) => {
        try {
            await axios.post(
                `${API}/api/logistic/route-schedule/assign`,
                { emp_code, route_codes, effective_date: selectedDateStr },
                { headers: authHeaders() }
            );
            setEditingRow(null);
            await fetchOverview(selectedDateStr);
            Swal.fire({
                icon: "success",
                title: "บันทึกเส้นทางสำเร็จ",
                timer: 1100,
                showConfirmButton: false,
            });
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message
                : undefined;
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: message || "ไม่สามารถบันทึกเส้นทางได้ กรุณาลองใหม่อีกครั้ง",
            });
        }
    };

    if (!isManager) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <div className="text-2xl font-semibold">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>
                </div>
            </div>
        );
    }

    const startWeekday = visibleMonth.day();
    const daysInMonth = visibleMonth.daysInMonth();
    const calendarCells: (Dayjs | null)[] = [
        ...Array(startWeekday).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => visibleMonth.add(i, "day")),
    ];

    const isPastDay = (day: Dayjs) => day.isBefore(today, "day");
    const isSelectedDay = (day: Dayjs) => day.isSame(selectedDate, "day");
    const isToday = (day: Dayjs) => day.isSame(today, "day");

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 md:p-10 mx-auto max-w-6xl w-full">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">จัดตารางเส้นทางขนส่งล่วงหน้า</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        เลือกวัน แล้วกำหนดเส้นทาง (เลือกได้หลายเส้นทางต่อพนักงาน) — วันนี้มีผลทันที ส่วนวันในอนาคตจะมีผลเมื่อถึงวันนั้น
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Calendar */}
                    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                aria-label="เดือนก่อนหน้า"
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                disabled={visibleMonth.isSame(today, "month")}
                                onClick={() => setVisibleMonth((m) => m.subtract(1, "month"))}
                            >
                                ‹
                            </button>
                            <div className="text-center">
                                <div className="font-semibold text-gray-900">{visibleMonth.format("MMMM YYYY")}</div>
                                {!visibleMonth.isSame(today, "month") && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVisibleMonth(today.startOf("month"));
                                            setSelectedDate(today);
                                        }}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        กลับไปวันนี้
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                aria-label="เดือนถัดไป"
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                                onClick={() => setVisibleMonth((m) => m.add(1, "month"))}
                            >
                                ›
                            </button>
                        </div>

                        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400 mb-2">
                            {WEEKDAY_LABELS.map((label) => (
                                <div key={label}>{label}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-y-1">
                            {calendarCells.map((day, idx) => {
                                if (!day) return <div key={`empty-${idx}`} />;
                                const past = isPastDay(day);
                                const selected = isSelectedDay(day);
                                const isTodayCell = isToday(day);
                                return (
                                    <div key={day.format("YYYY-MM-DD")} className="flex justify-center">
                                        <button
                                            type="button"
                                            disabled={past}
                                            onClick={() => setSelectedDate(day)}
                                            className={`relative w-9 h-9 rounded-full text-sm font-medium transition-colors
                                                ${past ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-blue-50 cursor-pointer"}
                                                ${selected ? "bg-blue-600 text-white hover:bg-blue-600" : ""}`}
                                        >
                                            {day.date()}
                                            {isTodayCell && !selected && (
                                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div
                            className={`mt-5 flex items-start gap-2 text-sm rounded-xl p-3 ${
                                selectedDate.isSame(today, "day")
                                    ? "bg-green-50 text-green-700"
                                    : "bg-amber-50 text-amber-700"
                            }`}
                        >
                            <span className="text-base leading-none">{selectedDate.isSame(today, "day") ? "⚡" : "🕛"}</span>
                            <span>
                                {selectedDate.isSame(today, "day")
                                    ? "การเปลี่ยนแปลงของวันนี้จะมีผลทันที"
                                    : `จะมีผลเมื่อถึงวันที่ ${selectedDate.format("D MMMM YYYY")} เวลา 00:00 น.`}
                            </span>
                        </div>
                    </div>

                    {/* Employee list */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="ค้นหาพนักงาน..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                    />
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {filteredOverview.length} คน · {selectedDate.format("D MMM")}
                                </span>
                            </div>

                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setAssignedFilter("all")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        assignedFilter === "all"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    ทั้งหมด ({overview.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAssignedFilter("assigned")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        assignedFilter === "assigned"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    กำหนดแล้ว ({assignedCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAssignedFilter("unassigned")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        assignedFilter === "unassigned"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    ยังไม่กำหนด ({unassignedCount})
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                                        <div className="w-9 h-9 rounded-full bg-gray-200" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-32 bg-gray-200 rounded" />
                                            <div className="h-3 w-20 bg-gray-100 rounded" />
                                        </div>
                                        <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                                    </div>
                                ))
                            ) : filteredOverview.length === 0 ? (
                                <div className="text-center py-14 text-gray-400">
                                    <div className="text-4xl mb-2">🗂️</div>
                                    ไม่พบข้อมูลพนักงาน
                                </div>
                            ) : (
                                filteredOverview.map((row) => (
                                    <div key={row.emp_code} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="w-9 h-9 shrink-0 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-sm">
                                            {initials(row.emp_name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{row.emp_name}</div>
                                            <div className="text-xs text-gray-400 mb-1">{row.emp_code}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {row.routes.length === 0 ? (
                                                    <span className="text-xs text-gray-400">ยังไม่ได้กำหนด</span>
                                                ) : (
                                                    row.routes.map((r) => (
                                                        <span
                                                            key={r.route_code}
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${chipColor(r.route_code)}`}
                                                        >
                                                            {r.route_code}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEditingRow(row)}
                                            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                        >
                                            จัดการเส้นทาง
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {editingRow && (
                <RouteAssignModal
                    row={editingRow}
                    routes={routes}
                    dateLabel={selectedDate.format("D MMMM YYYY")}
                    onCancel={() => setEditingRow(null)}
                    onSave={(codes) => handleSaveRoutes(editingRow.emp_code, codes)}
                />
            )}
        </div>
    );
};

// ─── Multi-select route assignment modal ───────────────────────────────────

interface RouteAssignModalProps {
    row: OverviewRow;
    routes: RouteRef[];
    dateLabel: string;
    onCancel: () => void;
    onSave: (route_codes: string[]) => Promise<void>;
}

const RouteAssignModal = ({ row, routes, dateLabel, onCancel, onSave }: RouteAssignModalProps) => {
    const [selected, setSelected] = useState<Set<string>>(new Set(row.routes.map((r) => r.route_code)));
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    const filteredRoutes = routes.filter(
        (r) =>
            r.route_code.toLowerCase().includes(search.toLowerCase()) ||
            r.route_name.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (route_code: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(route_code)) next.delete(route_code);
            else next.add(route_code);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave([...selected]);
        setSaving(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">จัดการเส้นทาง</h2>
                        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                            ×
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        {row.emp_name} <span className="text-gray-300">·</span> {dateLabel}
                    </p>
                    <div className="relative mt-3">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                        <input
                            autoFocus
                            type="text"
                            placeholder="ค้นหาเส้นทาง..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {filteredRoutes.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">ไม่พบเส้นทาง</div>
                    ) : (
                        filteredRoutes.map((r) => {
                            const checked = selected.has(r.route_code);
                            return (
                                <label
                                    key={r.route_code}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                        checked ? "bg-blue-50" : "hover:bg-gray-50"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(r.route_code)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium text-gray-900">{r.route_code}</span>
                                        <span className="text-gray-500"> - {r.route_name}</span>
                                    </span>
                                </label>
                            );
                        })
                    )}
                </div>

                <div className="p-5 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-3">
                        {selected.size === 0
                            ? "ไม่ได้เลือกเส้นทางใดเลย — ถ้าบันทึก ระบบจะถือว่าวันนี้ยังไม่ได้กำหนดใหม่ และใช้เส้นทางล่าสุดที่เคยตั้งไว้ก่อนหน้าแทน"
                            : `เลือกแล้ว ${selected.size} เส้นทาง`}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteSchedule;
