import axios from "axios";
import { useEffect, useState } from "react";
import Marquee from 'react-fast-marquee';

interface DashboardRouteProps { route_code: string, route_name: string, Success: number, NotSuccess: number, order_count: number }

interface RouteStatusData {
    Active: string[];
    Inactive: string[];
}

interface UrgentOrder {
    mem_code: string;
    mem_name: string;
    count_bill: string;
}


const DashboardRoute = () => {
    const [data, setData] = useState<DashboardRouteProps[] | []>([]);
    const [selectedRoute, setSelectedRoute] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [lastFetchTime, setLastFetchTime] = useState<string>('');
    const [routeStatusData, setRouteStatusData] = useState<RouteStatusData | null>(null);
    const [showRouteStatus, setShowRouteStatus] = useState<boolean>(true);
    const [urgentOrders, setUrgentOrders] = useState<UrgentOrder[]>([]);
    const [isMounted, setIsMounted] = useState<boolean>(true);

    useEffect(() => {
        // โหลดข้อมูลครั้งแรก
        handleData();
        urgentOrderData();
        
        // ตั้ง interval แยกกันเพื่อป้องกัน race condition
        const intervalData = setInterval(() => {
            if (isMounted) {
                handleData();
            }
        }, 180000); // 3 นาที

        const intervalUrgent = setInterval(() => {
            if (isMounted) {
                urgentOrderData();
            }
        }, 90000); // เปลี่ยนเป็น 1.5 นาทีเพื่อลดความขัดแย้ง

        return () => {
            setIsMounted(false);
            clearInterval(intervalData);
            clearInterval(intervalUrgent);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (startDate && endDate) {
            handleData(startDate, endDate);
        }
        else if (startDate) {
            handleData(startDate);
        }
        else {
            handleData(undefined, endDate);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const handleData = async (start?: string, end?: string) => {
        if (!isMounted) return;
        
        try {
            setLoading(true);
            let params: { date?: string; startDate?: string; endDate?: string } = {};

            if (start && end) {
                params = { startDate: start, endDate: end };
            } else if (start || end) {
                params = { date: start || end };
            }

            const res = await axios.get(`${import.meta.env.VITE_API_URL_ORDER}/api/picking/filter-count-order`, {
                params
            })
            if (isMounted) {
                setData(res.data.detailRoute || []);
                setRouteStatusData(res.data.orderRouteName);
            }
            // อัปเดตเวลา fetch ล่าสุดเป็นเวลาไทย
            const thaiTime = new Date().toLocaleString('th-TH', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            if (isMounted) {
                setLastFetchTime(thaiTime);
            }
            console.log('API Response for params:', params, res.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    const urgentOrderData = async () => {
        if (!isMounted) return; // ป้องกันการเรียก API หลัง unmount
        
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL_ORDER}/api/member/urgent-count`);
            
            if (isMounted) { // ตรวจสอบอีกครั้งก่อน update state
                setUrgentOrders(res.data || []);
            }
        } catch (error) {
            console.error('Error fetching urgent orders:', error);
            if (isMounted) {
                // อาจแสดง error state หรือใช้ข้อมูลเก่า
                setUrgentOrders([]);
            }
        }
    };

    const handleRouteSelect = (routeCode: string) => {
        setSelectedRoute(routeCode);
    };

    const filteredData = data.filter(route => route.route_code !== null);

    const sortedData = filteredData.sort((a, b) => {
        const aCode = a.route_code.toUpperCase();
        const bCode = b.route_code.toUpperCase();

        const aStartsWithL = aCode.startsWith('L');
        const bStartsWithL = bCode.startsWith('L');

        if (aStartsWithL && !bStartsWithL) {
            return -1;
        }
        if (!aStartsWithL && bStartsWithL) {
            return 1;
        }

        if (!aStartsWithL && !bStartsWithL) {
            return aCode.localeCompare(bCode);
        }

        const parseCode = (code: string) => {
            const withoutL = code.substring(1);

            const parts = withoutL.split('-');

            const mainNum = parseInt(parts[0], 10) || 0;

            const subNum = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;

            return { mainNum, subNum };
        };

        const aParts = parseCode(aCode);
        const bParts = parseCode(bCode);

        if (aParts.mainNum !== bParts.mainNum) {
            return aParts.mainNum - bParts.mainNum;
        }

        return aParts.subNum - bParts.subNum;
    });



    return (
        <div className="p-4 bg-white min-h-screen">
            <div className="max-w-8xl mx-auto">
                <p className="text-4xl font-bold text-center pb-2">Dashboard เส้นทางการจัดส่ง</p>

                {lastFetchTime && (
                    <p className="text-lg text-gray-600 text-center pb-4">
                        ข้อมูลล่าสุด: {lastFetchTime}
                    </p>
                )}

                {/* ปุ่มสำหรับซ่อน/แสดงสถานะเส้นทาง */}
                {routeStatusData && (
                    <div className="text-center mb-4">
                        <button
                            onClick={() => setShowRouteStatus(!showRouteStatus)}
                            className="px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {showRouteStatus ? 'ซ่อน' : 'แสดง'}
                        </button>
                    </div>
                )}

                <div className="flex gap-4 w-full">
                    {/* แสดงรายชื่อเส้นทางทั้งหมด */}
                    {routeStatusData && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 w-full">
                            <h3 className="text-xl font-semibold text-blue-800 mb-3 text-center">
                                สถานะเส้นทางการจัดส่ง
                                (เปิดใช้งาน: {routeStatusData.Active?.length || 0} | ปิดใช้งาน: {routeStatusData.Inactive?.length || 0})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-12 gap-2">
                                {/* แสดงเส้นทางที่ Active ก่อน */}
                                {routeStatusData.Active?.map((route, index) => (
                                    <span
                                        key={`active-${index}`}
                                        className="bg-white border border-green-400 rounded px-2 py-2 text-base text-green-700 font-bold text-center shadow-sm"
                                    >
                                        {route}
                                    </span>
                                ))}
                                {/* แสดงเส้นทางที่ Inactive */}
                                {routeStatusData.Inactive?.map((route, index) => (
                                    <span
                                        key={`inactive-${index}`}
                                        className="bg-white border border-red-400 rounded px-2 py-2 text-base text-red-700 font-bold text-center shadow-sm opacity-60"
                                    >
                                        {route}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {urgentOrders.length > 0 && (
                        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 mb-6 ${urgentOrders.length === 0 ? "hidden" : "block  w-1/3"}`}>
                            <h3 className="text-4xl font-semibold text-red-800 mb-3 text-center">
                                🚨 ออเดอร์ด่วน
                                <p className="text-5xl">({urgentOrders.length} ร้าน)</p>
                            </h3>
                            <Marquee speed={25} gradient={false}>
                                {urgentOrders.map((order, index) => (
                                    <div
                                        key={`duplicate-end-${index}`}
                                        className="relative bg-white border w-xs border-red-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200 min-h-32 mx-1"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-red-600">
                                                รหัส:
                                                <p className="text-xl font-bold">
                                                    {order.mem_code}
                                                </p>
                                            </span>
                                            <span className="absolute top-1 right-0 bg-red-100/90 text-red-700 p-3 rounded-full text-base font-bold">
                                                {parseInt(order.count_bill)} บิล
                                            </span>
                                        </div>
                                        <p className="text-gray-800 font-medium text-sm truncate">
                                            {order.mem_name}
                                        </p>
                                    </div>
                                ))}
                            </Marquee>
                        </div>
                    )}
                </div>

                {showRouteStatus && (
                    <div className="mb-6 text-center space-y-4 flex items-center gap-6 justify-center flex-wrap">
                        <div>
                            <label className="block text-lg font-medium text-gray-700 mb-2">
                                วันที่เริ่มต้น
                            </label>
                            <input
                                type="date"
                                className="px-4 py-2 border border-gray-300 rounded-lg text-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={startDate}
                                onChange={(e) => {
                                    const newStartDate = e.target.value;
                                    setStartDate(newStartDate);
                                    if (endDate && newStartDate && endDate < newStartDate) {
                                        setEndDate('');
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-lg font-medium text-gray-700 mb-2">
                                วันที่สิ้นสุด
                            </label>
                            <input
                                type="date"
                                className="px-4 py-2 border border-gray-300 rounded-lg text-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => {
                                    const newEndDate = e.target.value;
                                    if (startDate && newEndDate && newEndDate < startDate) {
                                        return;
                                    }
                                    setEndDate(newEndDate);
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-lg font-medium text-gray-700 mb-2">
                                เลือกเส้นทาง
                            </label>
                            <select
                                className="px-4 py-2 border border-gray-300 rounded-lg text-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedRoute}
                                onChange={(e) => handleRouteSelect(e.target.value)}
                            >
                                <option value="">เลือกเส้นทาง (ทั้งหมด)</option>
                                {sortedData.map((route, index) => (
                                    <option key={index} value={route.route_code}>
                                        {route.route_code} - {route.route_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-4 space-x-4">
                            <button
                                onClick={() => {
                                    if (startDate && endDate) {
                                        handleData(startDate, endDate);
                                    } else if (startDate) {
                                        handleData(startDate);
                                    } else {
                                        handleData();
                                    }
                                }}
                                disabled={loading}
                                className={`px-6 py-3 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        กำลังโหลด...
                                    </div>
                                ) : (
                                    'โหลดข้อมูล'
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    handleData();
                                    setStartDate('');
                                    setEndDate('');
                                    setSelectedRoute('');
                                }}
                                disabled={loading}
                                className={`px-6 py-3 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                    }`}
                            >
                                เคลียร์ข้อมูล
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-7 gap-2">
                    {sortedData.length > 0 ? (
                        sortedData.map((route, index) => (
                            <div
                                key={index}
                                className={`border border-gray-300 rounded-lg shadow-md mb-6 overflow-hidden cursor-pointer transition-all duration-200 ${selectedRoute === route.route_code
                                    ? 'ring-4 ring-blue-500 bg-blue-50 transform scale-105'
                                    : 'hover:shadow-lg hover:scale-102'
                                    }`}
                                onClick={() => handleRouteSelect(route.route_code)}
                            >
                                <div className={`p-4 text-center ${selectedRoute === route.route_code
                                    ? 'bg-blue-200'
                                    : 'bg-gray-200'
                                    }`}>
                                    <h2 className={`text-3xl font-extrabold tracking-wider ${selectedRoute === route.route_code
                                        ? 'text-blue-800'
                                        : 'text-gray-800'
                                        }`}>
                                        {route.route_code} {route.route_name}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-3 divide-x divide-gray-300 text-center">

                                    <div className="p-4 bg-gray-50">
                                        <p className="text-sm text-gray-600 mb-1">ยังไม่เสร็จ</p>
                                        <p className="text-3xl font-bold text-red-600">
                                            {route.NotSuccess || 0}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-gray-50">
                                        <p className="text-sm text-gray-600 mb-1">เสร็จแล้ว</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {route.Success || 0}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-gray-50">
                                        <p className="text-sm text-gray-600 mb-1">ทั้งหมด</p>
                                        <p className="text-3xl font-bold text-blue-600">
                                            {route.order_count || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-5 flex justify-center items-center min-h-64">
                            <p className="text-4xl font-bold text-gray-500">ไม่มีข้อมูล</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default DashboardRoute;