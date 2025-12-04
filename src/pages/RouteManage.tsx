import axios from "axios";
import { useState, useEffect } from "react";

export interface Route {
    route_code: string;
    route_name: string;
    is_active: boolean;
}

const RouteManage = () => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
    const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        handleGetRoutes();
    }, []);

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

    const handleGetRoutes = async() => {
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

    const updateRoute = async(routeCode: string) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL_ORDER}/api/route/toggle-activate/${routeCode}`);
        } catch (error) {
            console.error('Error updating route:', error);
        }
    };

    return (
        <div className="flex flex-col justify-center items-left p-10 mx-auto max-w-7xl w-full">
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
    );
};

export default RouteManage;