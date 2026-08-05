import axios from "axios";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";

export interface Route {
    route_code: string;
    route_name: string;
    is_active: boolean;
}

interface UrgentCustomer {
    mem_code: string;
    mem_name: string;
}

type PickingRuleMode = "normal" | "floor" | "person";

interface PickingRuleTransition {
    retiring: {
        mode: PickingRuleMode;
        target_floor: string | null;
        target_emp_code: string | null;
        occupancy: number;
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
    const userAuth = sessionStorage.getItem("user_info")
    const admin = userAuth ? JSON.parse(userAuth).manage_product == "Yes" : false;

    const [pickingRule, setPickingRule] = useState<PickingRuleStatus | null>(null);
    const [pickerOptions, setPickerOptions] = useState<PickerOptions | null>(null);
    const [formMode, setFormMode] = useState<PickingRuleMode>("normal");
    const [formFloor, setFormFloor] = useState<string>("");
    const [formEmpCode, setFormEmpCode] = useState<string>("");
    const [formLimit, setFormLimit] = useState<string>("");
    const [savingRule, setSavingRule] = useState<boolean>(false);

    useEffect(() => {
        handleGetRoutes();
        fetchUrgentCustomers();
        fetchPickingRule();
        fetchPickerOptions();
    }, []);

    const fetchPickingRule = async () => {
        try {
            const res = await axios.get<PickingRuleStatus>(
                `${import.meta.env.VITE_API_URL_ORDER}/api/picking-rule/active`
            );
            setPickingRule(res.data);
            setFormMode(res.data.mode);
            setFormFloor(res.data.target_floor ?? "");
            setFormEmpCode(res.data.target_emp_code ?? "");
            setFormLimit(res.data.pick_limit ? String(res.data.pick_limit) : "");
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
            await fetchPickingRule();
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
        } else {
            setUrgentCustomers([...urgentCustomers, res.data]);
            setInputMemCode("");
        }
        setUrgentLoading(false);
    };
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

                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                            <h3 className="text-lg font-semibold text-red-800">
                                🚨 รายการลูกค้าด่วน ({urgentCustomers.length} รายการ)
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
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">กำหนดประเภทการกดเริ่มจัด</h2>

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
                                <p className="font-semibold">⏳ กำลังรอเปลี่ยนรูปแบบ</p>
                                <p className="text-sm mt-1">
                                    {describePickingTarget(pickingRule.transition.retiring)} เหลืออีก{" "}
                                    {pickingRule.transition.retiring.occupancy} ร้านที่ยังจัดไม่เสร็จ —
                                    ต้องจัดให้หมดก่อน{" "}
                                    {pickingRule.transition.queued
                                        ? describePickingTarget(pickingRule.transition.queued)
                                        : "รูปแบบใหม่"}{" "}
                                    ถึงจะเริ่มจัดได้
                                </p>
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