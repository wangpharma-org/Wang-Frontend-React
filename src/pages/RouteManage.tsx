import axios from "axios";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import RouteBatchSortableCard, { type EditorGroup } from "../components/RouteBatchSortableCard";

export interface Route {
    route_code: string;
    route_name: string;
    is_active: boolean;
}

type RouteBatchMode = "normal" | "batch";

interface RouteBatchGroupRoute {
    route_code: string;
    route_name: string;
    is_active: boolean;
    remaining: number;
}

interface RouteBatchGroupStatus {
    id: number;
    position: number;
    name: string | null;
    min_remaining: number;
    departure_time: string | null;
    opened: boolean;
    opened_at: string | null;
    routes: RouteBatchGroupRoute[];
}

interface RouteBatchSetting {
    mode: RouteBatchMode;
    switch_max_threshold: number | null;
}

const authHeaders = () => ({
    headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
});

const makeEditorGroup = (): EditorGroup => ({
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    min_remaining: "",
    departure_time: "",
    route_codes: [],
});

interface UrgentCustomer {
    mem_code: string;
    mem_name: string;
}

interface RouteActivationUpdate {
    route_codes: string[];
    is_active: boolean;
}

type PickingRuleMode = "normal" | "floor" | "person";

interface PickingRuleOccupant {
    mem_code: string;
    mem_name: string;
    emp_code: string | null;
    emp_nickname: string | null;
}

interface PickingRuleTransition {
    retiring: {
        mode: PickingRuleMode;
        target_floor: string | null;
        target_emp_code: string | null;
        occupancy: number;
        stores: PickingRuleOccupant[];
    };
    queued: {
        mode: PickingRuleMode;
        target_floor: string | null;
        target_emp_code: string | null;
        pick_limit: number | null;
    } | null;
}

interface PickingRuleStatus {
    id: string | null;
    mode: PickingRuleMode;
    target_floor: string | null;
    target_emp_code: string | null;
    target_emp_nickname: string | null;
    pick_limit: number | null;
    occupancy: number;
    transition: PickingRuleTransition | null;
}

interface PickerEmployee {
    emp_code: string;
    emp_nickname: string;
    emp_floor: string | null;
}

interface PickerOptions {
    employees: PickerEmployee[];
    floors: string[];
}

const PICKABLE_FLOORS = ["2", "3", "4", "5"];
const PICKING_RULE_REFRESH_SECONDS = 60;

const describePickingTarget = (target: {
    mode: PickingRuleMode;
    target_floor: string | null;
    target_emp_code: string | null;
}): string => {
    if (target.mode === "floor") return `ชั้น ${target.target_floor ?? "-"}`;
    if (target.mode === "person") return `พนักงาน ${target.target_emp_code ?? "-"}`;
    return "โหมดปกติ";
};

const RouteManage = () => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
    const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [inputMemCode, setInputMemCode] = useState<string>("");
    const [urgentCustomers, setUrgentCustomers] = useState<UrgentCustomer[]>([]);

    const [urgentLoading, setUrgentLoading] = useState<boolean>(false);
    const [bulkLoading, setBulkLoading] = useState<boolean>(false);
    const [urgentLimit, setUrgentLimit] = useState<number | null>(null);
    const [urgentLimitInput, setUrgentLimitInput] = useState<string>("");
    const [savingUrgentLimit, setSavingUrgentLimit] = useState<boolean>(false);
    const userAuth = sessionStorage.getItem("user_info")
    const parsedUserAuth = userAuth ? JSON.parse(userAuth) : null;
    const admin = parsedUserAuth
      ? parsedUserAuth.manage_product == "Yes" || parsedUserAuth.manage_route == "Yes"
      : false;
    // จำกัด limit ร้านด่วนได้เฉพาะ admin เต็มรูปแบบเท่านั้น (ไม่รวม manage_route)
    const isFullAdmin = parsedUserAuth ? parsedUserAuth.manage_product == "Yes" : false;

    const [pickingRule, setPickingRule] = useState<PickingRuleStatus | null>(null);
    const [pickerOptions, setPickerOptions] = useState<PickerOptions | null>(null);
    const [formMode, setFormMode] = useState<PickingRuleMode>("normal");
    const [formFloor, setFormFloor] = useState<string>("");
    const [formEmpCode, setFormEmpCode] = useState<string>("");
    const [formLimit, setFormLimit] = useState<string>("");
    const [savingRule, setSavingRule] = useState<boolean>(false);
    const [pickingRuleRefreshCountdown, setPickingRuleRefreshCountdown] = useState<number>(
        PICKING_RULE_REFRESH_SECONDS
    );

    // เปิดทีละชุด (Batch Mode)
    const [routeBatchSetting, setRouteBatchSetting] = useState<RouteBatchSetting | null>(null);
    const [routeBatchGroups, setRouteBatchGroups] = useState<RouteBatchGroupStatus[]>([]);
    const [editorGroups, setEditorGroups] = useState<EditorGroup[]>([]);
    const [thresholdInput, setThresholdInput] = useState<string>("");
    const [loadingGroups, setLoadingGroups] = useState<boolean>(true);
    const [savingBatchMode, setSavingBatchMode] = useState<boolean>(false);
    const [savingGroups, setSavingGroups] = useState<boolean>(false);
    const [savingThreshold, setSavingThreshold] = useState<boolean>(false);
    const dndSensors = useSensors(useSensor(PointerSensor));

    useEffect(() => {
        handleGetRoutes();
        fetchUrgentCustomers();
        fetchUrgentLimit();
        fetchPickingRule(true);
        fetchPickerOptions();
        fetchRouteBatchMode();
        fetchRouteBatchGroups();
    }, []);

    // Auto-refresh สถานะรูปแบบการจัดทุก 1 นาที พร้อมนับถอยหลังให้เห็น
    // ไม่ sync ฟอร์มระหว่าง auto-refresh กันทับค่าที่ admin กำลังกรอกอยู่
    useEffect(() => {
        const interval = setInterval(() => {
            setPickingRuleRefreshCountdown((prev) => {
                if (prev <= 1) {
                    fetchPickingRule(false);
                    return PICKING_RULE_REFRESH_SECONDS;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPickingRule = async (syncForm: boolean) => {
        try {
            const res = await axios.get<PickingRuleStatus>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/picking-rule/active`
            );
            setPickingRule(res.data);
            if (syncForm) {
                setFormMode(res.data.mode);
                setFormFloor(res.data.target_floor ?? "");
                setFormEmpCode(res.data.target_emp_code ?? "");
                setFormLimit(res.data.pick_limit ? String(res.data.pick_limit) : "");
            }
        } catch (error) {
            console.error('Error fetching picking rule:', error);
        }
    };

    const fetchPickerOptions = async () => {
        try {
            const res = await axios.get<PickerOptions>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/picking-rule/options`
            );
            setPickerOptions(res.data);
        } catch (error) {
            console.error('Error fetching picker options:', error);
        }
    };

    const handleSavePickingRule = async () => {
        setSavingRule(true);
        try {
            const payload: {
                mode: PickingRuleMode;
                target_floor?: string;
                target_emp_code?: string;
                pick_limit?: number;
            } = { mode: formMode };
            if (formMode === "floor") {
                payload.target_floor = formFloor;
                payload.pick_limit = Number(formLimit);
            } else if (formMode === "person") {
                payload.target_emp_code = formEmpCode;
                payload.pick_limit = Number(formLimit);
            }
            await axios.post(
                `${import.meta.env.VITE_API_URL_ORDER}/api/picking-rule`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
                    },
                }
            );
            await fetchPickingRule(true);
            setPickingRuleRefreshCountdown(PICKING_RULE_REFRESH_SECONDS);
            Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ' });
        } catch (error) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? (error.response.data.message as string)
                    : 'บันทึกไม่สำเร็จ';
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: message });
        } finally {
            setSavingRule(false);
        }
    };

    // Filter routes based on search term and active status
    useEffect(() => {
        if (!Array.isArray(routes)) {
            setFilteredRoutes([]);
            return;
        }

        let filtered = routes;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(
                (route) =>
                    route.route_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    route.route_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by active status
        if (showActiveOnly) {
            filtered = filtered.filter((route) => route.is_active);
        }

        setFilteredRoutes(filtered);
    }, [routes, searchTerm, showActiveOnly]);

    // Handle checkbox change
    const handleActiveToggle = (routeCode: string) => {
        updateRoute(routeCode);
        setRoutes((prevRoutes) =>
            prevRoutes.map((route) =>
                route.route_code === routeCode
                    ? { ...route, is_active: !route.is_active }
                    : route
            )
        );
    };

    const handleGetRoutes = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL_ORDER}/api/route/get-route`);
            setRoutes(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching routes:', error);
            setRoutes([]);
        } finally {
            setLoading(false);
        }
    }

    const updateRoute = async (routeCode: string) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL_ORDER}/api/route/toggle-activate/${routeCode}`);
        } catch (error) {
            console.error('Error updating route:', error);
        }
    };

    const updateRouteActivation = async (data: RouteActivationUpdate) => {
        await axios.put(
            `${import.meta.env.VITE_API_URL_ORDER}/api/route/set-activate`,
            data,
            authHeaders()
        );
    };

    const handleToggleAll = async (activate: boolean) => {
        const routesForBulkAction =
            routeBatchSetting?.mode === "batch" ? routes : filteredRoutes;
        const targets = routesForBulkAction.filter((route) => route.is_active !== activate);

        if (targets.length === 0) {
            Swal.fire({
                icon: "info",
                title: activate
                    ? "เส้นทางเปิดใช้งานอยู่แล้วทั้งหมด"
                    : "เส้นทางปิดใช้งานอยู่แล้วทั้งหมด",
            });
            return;
        }

        const batchModeIsActive = routeBatchSetting?.mode === "batch";
        const confirm = await Swal.fire({
            icon: batchModeIsActive ? "warning" : "question",
            title: batchModeIsActive
                ? "ปิด Batch Mode และดำเนินการต่อ?"
                : activate
                    ? "เปิดใช้งานเส้นทางทั้งหมด?"
                    : "ปิดใช้งานเส้นทางทั้งหมด?",
            text: batchModeIsActive
                ? `การยืนยันจะปิดการใช้งาน Batch Mode แล้ว${activate ? "เปิด" : "ปิด"}เส้นทาง ${targets.length} รายการ`
                : `จะ${activate ? "เปิด" : "ปิด"}ใช้งานเส้นทางจำนวน ${targets.length} เส้นทาง`,
            showCancelButton: true,
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก",
        });

        if (!confirm.isConfirmed) return;

        try {
            setBulkLoading(true);
            await updateRouteActivation({
                route_codes: targets.map((route) => route.route_code),
                is_active: activate,
            });
            await Promise.all([
                handleGetRoutes(),
                fetchRouteBatchMode(),
                fetchRouteBatchGroups(),
            ]);
        } catch (error) {
            console.error("Error updating all route activation:", error);
            Swal.fire({ icon: "error", title: "อัปเดตเส้นทางไม่สำเร็จ" });
        } finally {
            setBulkLoading(false);
        }
    };

    // ---------- เปิดทีละชุด (Batch Mode) ----------

    const fetchRouteBatchMode = async () => {
        try {
            const res = await axios.get<RouteBatchSetting>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/route-batch/mode`
            );
            setRouteBatchSetting(res.data);
            setThresholdInput(res.data.switch_max_threshold ? String(res.data.switch_max_threshold) : "");
        } catch (error) {
            console.error("Error fetching route batch mode:", error);
        }
    };

    const fetchRouteBatchGroups = async () => {
        try {
            setLoadingGroups(true);
            const res = await axios.get<RouteBatchGroupStatus[]>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/route-batch/groups`
            );
            const sorted = Array.isArray(res.data)
                ? [...res.data].sort((a, b) => a.position - b.position)
                : [];
            setRouteBatchGroups(sorted);
            setEditorGroups(
                sorted.map((g) => ({
                    key: String(g.id),
                    name: g.name ?? "",
                    min_remaining: String(g.min_remaining),
                    departure_time: g.departure_time ?? "",
                    route_codes: g.routes.map((r) => r.route_code),
                }))
            );
        } catch (error) {
            console.error("Error fetching route batch groups:", error);
            setRouteBatchGroups([]);
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleSetRouteBatchMode = async (mode: RouteBatchMode) => {
        if (mode === "batch") {
            const confirm = await Swal.fire({
                icon: "warning",
                title: "เปิดโหมดเปิดทีละชุด?",
                text: "ระบบจะรีเซ็ตทุกชุดเป็นยังไม่เปิด แล้วเปิดเฉพาะชุดแรกเท่านั้น ชุดถัดไปจะเปิดอัตโนมัติเมื่อของในชุดปัจจุบันจัดจนเหลือถึง min",
                showCancelButton: true,
                confirmButtonText: "เปิดโหมดนี้",
                cancelButtonText: "ยกเลิก",
            });
            if (!confirm.isConfirmed) return;
        }
        setSavingBatchMode(true);
        try {
            const res = await axios.put<RouteBatchSetting>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/route-batch/mode`,
                { mode },
                authHeaders()
            );
            setRouteBatchSetting(res.data);
            await fetchRouteBatchGroups();
            Swal.fire({ icon: "success", title: "บันทึกสำเร็จ" });
        } catch (error) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? (error.response.data.message as string)
                    : "บันทึกไม่สำเร็จ";
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: message });
        } finally {
            setSavingBatchMode(false);
        }
    };

    const handleSaveThreshold = async () => {
        setSavingThreshold(true);
        try {
            const res = await axios.put<RouteBatchSetting>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/route-batch/switch-threshold`,
                { threshold: Number(thresholdInput) },
                authHeaders()
            );
            setRouteBatchSetting(res.data);
            Swal.fire({ icon: "success", title: "บันทึก max สำเร็จ" });
        } catch (error) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? (error.response.data.message as string)
                    : "บันทึกไม่สำเร็จ";
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: message });
        } finally {
            setSavingThreshold(false);
        }
    };

    const handleAddGroup = () => {
        setEditorGroups((prev) => [...prev, makeEditorGroup()]);
    };

    const handleRemoveGroup = (index: number) => {
        setEditorGroups((prev) => prev.filter((_, i) => i !== index));
    };

    const handleGroupFieldChange = (
        index: number,
        field: "name" | "min_remaining" | "departure_time",
        value: string
    ) => {
        setEditorGroups((prev) =>
            prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
        );
    };

    const handleToggleRouteInGroup = (index: number, route_code: string) => {
        setEditorGroups((prev) =>
            prev.map((g, i) => {
                if (i === index) {
                    const has = g.route_codes.includes(route_code);
                    return {
                        ...g,
                        route_codes: has
                            ? g.route_codes.filter((c) => c !== route_code)
                            : [...g.route_codes, route_code],
                    };
                }
                // เอาออกจากกลุ่มอื่นเสมอ — 1 เส้นทางอยู่ได้แค่ 1 ชุด
                return { ...g, route_codes: g.route_codes.filter((c) => c !== route_code) };
            })
        );
    };

    const handleGroupDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setEditorGroups((prev) => {
            const oldIndex = prev.findIndex((g) => g.key === active.id);
            const newIndex = prev.findIndex((g) => g.key === over.id);
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleSaveGroups = async () => {
        for (const group of editorGroups) {
            if (group.route_codes.length === 0) {
                Swal.fire({
                    icon: "error",
                    title: "บันทึกไม่สำเร็จ",
                    text: `ชุด "${group.name || "(ไม่มีชื่อ)"}" ต้องมีอย่างน้อย 1 เส้นทาง`,
                });
                return;
            }
            if (group.min_remaining === "" || Number(group.min_remaining) < 0) {
                Swal.fire({
                    icon: "error",
                    title: "บันทึกไม่สำเร็จ",
                    text: `กรุณาระบุ min ของชุด "${group.name || "(ไม่มีชื่อ)"}"`,
                });
                return;
            }
        }

        setSavingGroups(true);
        try {
            await axios.put(
                `${import.meta.env.VITE_API_URL_ORDER}/api/route-batch/groups`,
                {
                    groups: editorGroups.map((g) => ({
                        name: g.name || undefined,
                        min_remaining: Number(g.min_remaining),
                        departure_time: g.departure_time || undefined,
                        route_codes: g.route_codes,
                    })),
                },
                authHeaders()
            );
            await fetchRouteBatchGroups();
            Swal.fire({ icon: "success", title: "บันทึกการจัดกลุ่มสำเร็จ" });
        } catch (error) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? (error.response.data.message as string)
                    : "บันทึกไม่สำเร็จ";
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: message });
        } finally {
            setSavingGroups(false);
        }
    };

    const handleUrgentKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleUrgentSubmit();
        }
    };

    const fetchUrgentCustomers = async () => {
        try {
            setUrgentLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL_ORDER}/api/member/urgent`);
            setUrgentCustomers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching urgent customers:', error);
            setUrgentCustomers([]);
        } finally {
            setUrgentLoading(false);
        }
    };

    const handleUrgentSubmit = async () => {

        setUrgentLoading(true);
        const res = await axios.put(`${import.meta.env.VITE_API_URL_ORDER}/api/member/urgent/${inputMemCode.trim()}`);
        if (res.data === 'Member not found') {
            Swal.fire({
                icon: 'error',
                title: 'ไม่พบรหัสลูกค้าในระบบ',
                text: `รหัสลูกค้า ${inputMemCode.trim()} ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง`,
            });
            setInputMemCode("");
        } else if (res.data === 'Update OK!!') {
            Swal.fire({
                icon: 'warning',
                title: 'ลูกค้ารายนี้อยู่ในรายการด่วนแล้ว',
                text: `รหัสลูกค้า ${inputMemCode.trim()} มีอยู่ในรายการลูกค้าด่วนแล้ว`,
            });
            setInputMemCode("");
        } else if (res.data && res.data.error) {
            Swal.fire({
                icon: 'error',
                title: 'เพิ่มร้านด่วนไม่ได้',
                text: res.data.message ?? 'เกิดข้อผิดพลาด',
            });
        } else {
            setUrgentCustomers([...urgentCustomers, res.data]);
            setInputMemCode("");
        }
        setUrgentLoading(false);
    };

    const handleCancelUrgent = async (mem_code: string) => {
        setUrgentLoading(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL_ORDER}/api/member/urgent/${mem_code}`);
            setUrgentCustomers(urgentCustomers.filter((c) => c.mem_code !== mem_code));
        } catch (error) {
            console.error('Error cancelling urgent customer:', error);
            Swal.fire({ icon: 'error', title: 'ยกเลิกด่วนไม่สำเร็จ' });
        } finally {
            setUrgentLoading(false);
        }
    };

    const fetchUrgentLimit = async () => {
        try {
            const res = await axios.get<{ max_urgent_count: number }>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/urgent-setting`
            );
            setUrgentLimit(res.data.max_urgent_count);
            setUrgentLimitInput(String(res.data.max_urgent_count));
        } catch (error) {
            console.error('Error fetching urgent limit:', error);
        }
    };

    const handleSaveUrgentLimit = async () => {
        setSavingUrgentLimit(true);
        try {
            const res = await axios.put<{ max_urgent_count: number }>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/urgent-setting`,
                { max_urgent_count: Number(urgentLimitInput) },
                {
                    headers: {
                        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
                    },
                }
            );
            setUrgentLimit(res.data.max_urgent_count);
            Swal.fire({ icon: 'success', title: 'บันทึก limit สำเร็จ' });
        } catch (error) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? (error.response.data.message as string)
                    : 'บันทึกไม่สำเร็จ';
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: message });
        } finally {
            setSavingUrgentLimit(false);
        }
    };

    const routesForBulkAction =
        routeBatchSetting?.mode === "batch" ? routes : filteredRoutes;
    const allActive =
        routesForBulkAction.length > 0 &&
        routesForBulkAction.every((route) => route.is_active);

    if (!admin) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <div className="text-2xl font-semibold">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 justify-center items-left p-10 mx-auto gap-6 min-w-7xl w-full">
            <div>
                <h1 className="text-3xl font-bold mb-6">จัดการเส้นทาง</h1>

                {/* โหมดการเปิดเส้นทาง — ตัวควบคุมหลักของทั้งหน้า */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">โหมดการเปิดเส้นทาง</label>
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="routeBatchMode"
                                checked={routeBatchSetting?.mode !== "batch"}
                                disabled={savingBatchMode || !routeBatchSetting}
                                onChange={() => handleSetRouteBatchMode("normal")}
                            />
                            โหมดปกติ (เปิด/ปิดทีละเส้นทางเอง)
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="routeBatchMode"
                                checked={routeBatchSetting?.mode === "batch"}
                                disabled={savingBatchMode || !routeBatchSetting || routeBatchGroups.length === 0}
                                onChange={() => handleSetRouteBatchMode("batch")}
                            />
                            เปิดทีละชุด
                        </label>
                    </div>
                    {routeBatchGroups.length === 0 && (
                        <p className="text-xs text-amber-600">ต้องตั้งค่าชุดเส้นทางอย่างน้อย 1 ชุดก่อนถึงจะเปิดโหมดนี้ได้ (เลื่อนลงไปตั้งค่าด้านล่าง)</p>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            max รวมระบบ (auto switch เข้าโหมดชุดอัตโนมัติเมื่อออเดอร์ค้างทั้งระบบถึงค่านี้)
                        </label>
                        <div className="flex gap-3 items-center">
                            <input
                                type="number"
                                min={1}
                                value={thresholdInput}
                                onChange={(e) => setThresholdInput(e.target.value)}
                                disabled={savingThreshold || routeBatchGroups.length === 0}
                                placeholder={routeBatchGroups.length === 0 ? "ตั้งค่าชุดก่อน" : "ไม่บังคับ"}
                                className="w-40 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                            />
                            <button
                                onClick={handleSaveThreshold}
                                disabled={savingThreshold || routeBatchGroups.length === 0 || thresholdInput === ""}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                                {savingThreshold ? "กำลังบันทึก..." : "บันทึก max"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ตั้งค่าชุดเส้นทางสำหรับโหมดเปิดทีละชุด — แก้ไขได้เฉพาะตอนอยู่โหมดปกติ */}
                {routeBatchSetting?.mode !== "batch" && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">ตั้งค่าชุดเส้นทาง (สำหรับโหมดเปิดทีละชุด)</h2>
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            {loadingGroups ? (
                                <div className="flex items-center text-gray-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                                    กำลังโหลดข้อมูล...
                                </div>
                            ) : (
                                <>
                                    <DndContext
                                        sensors={dndSensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleGroupDragEnd}
                                    >
                                        <SortableContext
                                            items={editorGroups.map((g) => g.key)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {editorGroups.map((group, index) => (
                                                <RouteBatchSortableCard
                                                    key={group.key}
                                                    group={group}
                                                    index={index}
                                                    allRoutes={routes}
                                                    assignedElsewhere={
                                                        new Set(
                                                            editorGroups
                                                                .filter((_, i) => i !== index)
                                                                .flatMap((g) => g.route_codes)
                                                        )
                                                    }
                                                    onChange={handleGroupFieldChange}
                                                    onToggleRoute={handleToggleRouteInGroup}
                                                    onRemove={handleRemoveGroup}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    {(() => {
                                        const assignedRouteCodes = new Set(editorGroups.flatMap((g) => g.route_codes));
                                        const unassignedRoutes = routes.filter((r) => !assignedRouteCodes.has(r.route_code));
                                        return unassignedRoutes.length > 0 ? (
                                            <p className="text-xs text-amber-600 mb-3">
                                                ยังไม่ได้จัดกลุ่ม {unassignedRoutes.length} เส้นทาง:{" "}
                                                {unassignedRoutes.map((r) => r.route_code).join(", ")}
                                            </p>
                                        ) : null;
                                    })()}

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleAddGroup}
                                            className="px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600"
                                        >
                                            + เพิ่มชุด
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveGroups}
                                            disabled={savingGroups}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                                        >
                                            {savingGroups ? "กำลังบันทึก..." : "บันทึกการจัดกลุ่ม"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {routeBatchSetting?.mode === "batch" ? (
                    /* โหมดเปิดทีละชุด — ไม่แสดงตารางเปิด/ปิดรายเส้นทางแบบเดิมเลย */
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-amber-200">
                            <div>
                                <p className="text-sm font-semibold text-amber-800">
                                    คำสั่งเปิด/ปิดทั้งหมด ({routes.length} รายการ)
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                    การยืนยันจะปิดการใช้งาน Batch Mode
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggleAll(!allActive)}
                                disabled={loading || bulkLoading || routes.length === 0}
                                className={`px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md active:scale-95 focus:outline-none focus:ring-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${allActive
                                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-300 disabled:hover:bg-red-600"
                                    : "bg-green-600 hover:bg-green-700 focus:ring-green-300 disabled:hover:bg-green-600"
                                    }`}
                            >
                                {allActive ? "ปิดใช้งานทั้งหมด" : "เปิดใช้งานทั้งหมด"}
                            </button>
                        </div>
                        {bulkLoading && (
                            <div className="flex items-center mb-4 text-sm text-amber-700">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                                กำลังอัปเดตเส้นทาง...
                            </div>
                        )}
                        <p className="text-sm text-gray-500 mb-4">
                            กำลังใช้งานโหมดเปิดทีละชุด — ต้องเปลี่ยนกลับเป็นโหมดปกติก่อนถึงจะแก้ไขชุดเส้นทางได้
                        </p>
                        {routeBatchGroups.map((group) => (
                            <div
                                key={group.id}
                                className={`border-2 rounded-lg p-4 mb-3 ${group.opened ? "border-green-400 bg-green-50" : "border-gray-200"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">
                                        #{group.position} {group.name || "(ไม่มีชื่อ)"}
                                        {group.departure_time ? ` — ออกรถ ${group.departure_time}` : ""}
                                    </span>
                                    <span
                                        className={`text-xs font-semibold px-2 py-1 rounded ${group.opened ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"
                                            }`}
                                    >
                                        {group.opened ? "เปิดแล้ว" : "รอเปิด"}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">min = {group.min_remaining}</p>
                                <div className="flex flex-wrap gap-2">
                                    {group.routes.map((route) => (
                                        <span
                                            key={route.route_code}
                                            className="text-sm px-2 py-1 rounded border border-gray-300 bg-white"
                                        >
                                            {route.route_code} - {route.route_name}: เหลือ {route.remaining}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="ค้นหารหัสเส้นทางหรือชื่อเส้นทาง..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showActiveOnly"
                                    checked={showActiveOnly}
                                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="showActiveOnly" className="text-lg font-medium">
                                    แสดงเฉพาะเส้นทางที่เปิดใช้งาน
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-100 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-blue-800">{routes.length}</p>
                                <p className="text-blue-600">เส้นทางทั้งหมด</p>
                            </div>
                            <div className="bg-green-100 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-green-800">
                                    {routes.filter((route) => route.is_active === true).length}
                                </p>
                                <p className="text-green-600">เส้นทางที่เปิดใช้งาน</p>
                            </div>
                            <div className="bg-red-100 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-red-800">
                                    {routes.filter((route) => route.is_active === false).length}
                                </p>
                                <p className="text-red-600">เส้นทางที่ปิดใช้งาน</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700 border-b">
                                                รหัสเส้นทาง
                                            </th>
                                            <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700 border-b">
                                                ชื่อเส้นทาง
                                            </th>
                                            <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 border-b">
                                                สถานะการใช้งาน
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-amber-50 border-y-2 border-amber-300">
                                            <td colSpan={3} className="px-6 py-3">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <span className="text-sm font-semibold text-amber-800">
                                                        ดำเนินการกับเส้นทางทั้งหมด ({filteredRoutes.length} รายการ)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAll(!allActive)}
                                                        disabled={loading || bulkLoading || filteredRoutes.length === 0}
                                                        className={`px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md active:scale-95 focus:outline-none focus:ring-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${allActive
                                                            ? "bg-red-600 hover:bg-red-700 focus:ring-red-300 disabled:hover:bg-red-600"
                                                            : "bg-green-600 hover:bg-green-700 focus:ring-green-300 disabled:hover:bg-green-600"
                                                            }`}
                                                    >
                                                        {allActive ? "ปิดใช้งานทั้งหมด" : "เปิดใช้งานทั้งหมด"}
                                                    </button>
                                                </div>
                                                {bulkLoading && (
                                                    <div className="flex items-center mt-2 text-sm text-amber-700">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                                                        กำลังอัปเดตเส้นทาง...
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center">
                                                    <div className="flex justify-center items-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                        <span className="ml-2">กำลังโหลดข้อมูล...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            Array.isArray(filteredRoutes) && filteredRoutes.map((route, index) => (
                                                <tr
                                                    key={route.route_code}
                                                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                                        } hover:bg-blue-50 transition-colors`}
                                                >
                                                    <td className="px-6 py-4 text-lg font-medium text-gray-900 border-b">
                                                        {route.route_code}
                                                    </td>
                                                    <td className="px-6 py-4 text-lg text-gray-700 border-b">
                                                        {route.route_name}
                                                    </td>
                                                    <td className="px-6 py-4 text-center border-b">
                                                        <div className="flex items-center justify-center">
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={route.is_active}
                                                                    onChange={() => handleActiveToggle(route.route_code)}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                                <span className="ml-3 text-sm font-medium text-gray-900">
                                                                    {route.is_active ? (
                                                                        <span className="text-green-600 font-semibold">เปิดใช้งาน</span>
                                                                    ) : (
                                                                        <span className="text-red-600 font-semibold">ปิดใช้งาน</span>
                                                                    )}
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {!loading && Array.isArray(filteredRoutes) && filteredRoutes.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-xl text-gray-500">ไม่พบข้อมูลเส้นทางที่ตรงกับการค้นหา</p>
                                </div>
                            )}
                        </div>

                        {(searchTerm || showActiveOnly) && Array.isArray(filteredRoutes) && Array.isArray(routes) ? (
                            <div className="mt-4 text-gray-600 text-lg">
                                แสดงผลลัพธ์ {filteredRoutes.length} รายการ จากทั้งหมด {routes.length} รายการ
                            </div>
                        ) : null}
                    </>
                )}
            </div>
            <div>
                {/* Urgent Customers Management Section */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">จัดการลูกค้าด่วน</h2>

                    {/* Input Form */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <form onSubmit={handleUrgentSubmit} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-red-700 mb-2">
                                    รหัสลูกค้า
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-red-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="ใส่รหัสลูกค้า เช่น 22007"
                                    value={inputMemCode}
                                    onChange={(e) => setInputMemCode(e.target.value)}
                                    onKeyPress={handleUrgentKeyPress}
                                    disabled={urgentLoading}
                                />
                            </div>
                        </form>
                        <p className="text-sm text-red-600 mt-2">
                            💡 กด Enter เพื่อเพิ่มข้อมูล
                        </p>
                    </div>

                    {isFullAdmin && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                จำนวนร้านด่วนสูงสุด (limit)
                            </label>
                            <div className="flex gap-4 items-end">
                                <input
                                    type="number"
                                    min={1}
                                    className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    value={urgentLimitInput}
                                    onChange={(e) => setUrgentLimitInput(e.target.value)}
                                    disabled={savingUrgentLimit}
                                />
                                <button
                                    onClick={handleSaveUrgentLimit}
                                    disabled={savingUrgentLimit}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    {savingUrgentLimit ? "กำลังบันทึก..." : "บันทึก limit"}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                            <h3 className="text-lg font-semibold text-red-800">
                                🚨 รายการลูกค้าด่วน ({urgentCustomers.length}{urgentLimit !== null ? ` / ${urgentLimit}` : ""} รายการ)
                            </h3>
                        </div>

                        {urgentLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="flex items-center text-gray-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500 mr-3"></div>
                                    กำลังโหลดข้อมูล...
                                </div>
                            </div>
                        ) : urgentCustomers.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                #
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                รหัสลูกค้า
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                ชื่อร้าน
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                จัดการ
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {urgentCustomers.map((customer, index) => (
                                            <tr key={customer.mem_code} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {customer.mem_code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-900">
                                                        {customer.mem_name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleCancelUrgent(customer.mem_code)}
                                                        disabled={urgentLoading}
                                                        className="px-3 py-1 text-sm bg-gray-100 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
                                                    >
                                                        ยกเลิกด่วน
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-red-400 text-6xl mb-4">📋</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีข้อมูลลูกค้าด่วน</h3>
                                <p className="text-gray-500">เพิ่มรหัสลูกค้าด่วนด้านบนเพื่อเริ่มต้นใช้งาน</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Picking Rule Management Section */}
                <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">กำหนดประเภทการกดเริ่มจัด</h2>
                        <span className="text-xs text-gray-400">
                            รีเฟรชอัตโนมัติในอีก {pickingRuleRefreshCountdown} วินาที
                        </span>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                        {pickingRule && (
                            <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                                <p className="font-semibold">
                                    รูปแบบปัจจุบัน: {describePickingTarget(pickingRule)}
                                    {pickingRule.mode === "person" && pickingRule.target_emp_nickname
                                        ? ` (${pickingRule.target_emp_nickname})`
                                        : ""}
                                </p>
                                {pickingRule.mode !== "normal" && (
                                    <p className="text-sm mt-1">
                                        กำลังจัดอยู่ {pickingRule.occupancy}/{pickingRule.pick_limit ?? "-"} ร้าน
                                    </p>
                                )}
                            </div>
                        )}

                        {pickingRule?.transition && (
                            <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-800">
                                <p className="font-semibold">
                                    ⏳ รูปแบบถัดไป:{" "}
                                    {pickingRule.transition.queued
                                        ? describePickingTarget(pickingRule.transition.queued)
                                        : "ยังไม่ได้กำหนด"}
                                </p>
                                <p className="text-sm mt-1">
                                    รอ{describePickingTarget(pickingRule.transition.retiring)}จัดร้านที่เหลืออีก{" "}
                                    {pickingRule.transition.retiring.occupancy} ร้านให้เสร็จก่อน
                                    ถึงจะเริ่มใช้รูปแบบถัดไปได้
                                </p>
                                {pickingRule.transition.retiring.stores.length > 0 && (
                                    <ul className="text-sm mt-2 list-disc list-inside space-y-0.5">
                                        {pickingRule.transition.retiring.stores.map((store) => (
                                            <li key={store.mem_code}>
                                                {store.mem_code} - {store.mem_name} — จัดโดย{" "}
                                                {store.emp_code ?? "-"}
                                                {store.emp_nickname ? ` (${store.emp_nickname})` : ""}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-medium text-gray-700">ประเภทการกดเริ่มจัด</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="pickingRuleMode"
                                        checked={formMode === "normal"}
                                        onChange={() => setFormMode("normal")}
                                    />
                                    ปกติ (ไม่จำกัด)
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="pickingRuleMode"
                                        checked={formMode === "floor"}
                                        onChange={() => setFormMode("floor")}
                                    />
                                    ตามชั้น
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="pickingRuleMode"
                                        checked={formMode === "person"}
                                        onChange={() => setFormMode("person")}
                                    />
                                    ตามพนักงาน
                                </label>
                            </div>

                            {formMode === "floor" && (
                                <select
                                    value={formFloor}
                                    onChange={(e) => setFormFloor(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="">เลือกชั้น</option>
                                    {PICKABLE_FLOORS.map((floor) => (
                                        <option key={floor} value={floor}>
                                            ชั้น {floor}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {formMode === "person" && (
                                <div>
                                    <input
                                        type="text"
                                        list="picking-rule-employee-options"
                                        value={formEmpCode}
                                        onChange={(e) => setFormEmpCode(e.target.value)}
                                        placeholder="ค้นหารหัสหรือชื่อพนักงาน..."
                                        className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                                    />
                                    <datalist id="picking-rule-employee-options">
                                        {pickerOptions?.employees.map((employee) => (
                                            <option key={employee.emp_code} value={employee.emp_code}>
                                                {employee.emp_code} - {employee.emp_nickname}
                                            </option>
                                        ))}
                                    </datalist>
                                    {formEmpCode && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {pickerOptions?.employees.find((e) => e.emp_code === formEmpCode)
                                                ? `เลือก: ${formEmpCode} - ${pickerOptions?.employees.find((e) => e.emp_code === formEmpCode)?.emp_nickname}`
                                                : "ยังไม่พบพนักงานตามรหัสนี้"}
                                        </p>
                                    )}
                                </div>
                            )}

                            {formMode !== "normal" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        จำนวนร้านที่จัดพร้อมกันได้ (limit)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formLimit}
                                        onChange={(e) => setFormLimit(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 w-40"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleSavePickingRule}
                                disabled={savingRule}
                                className="mt-2 bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50 w-fit"
                            >
                                {savingRule ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteManage;
