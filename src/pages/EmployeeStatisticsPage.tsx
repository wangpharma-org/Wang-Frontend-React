// pages/EmployeeStatistics.tsx - Updated to match API structure
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Bounce, ToastContainer, toast } from "react-toastify";
import Header from "../components/Header";
import LoadingSpinner from "../components/LoadingSpinner";
import { ChevronDown, ChevronUp } from "lucide-react";
import 'react-toastify/dist/ReactToastify.css';

// Define interfaces based on API response
interface FloorData {
  floor: string;
  totalOrders: number;
  totalAmount: number;
  remaining: number;
  inProgress: number;
  completed: number;
}

interface StatisticsHeader {
  startTime: string;
  endTime: string;
  durationMin: number;
  durationHr: number;
}

interface DailyStatistics {
  empCode: string;
  header: StatisticsHeader;
  floors: FloorData[];
  totalPicked: number;
}

interface APIResponse {
  status: string;
  data: DailyStatistics | DailyStatistics[] | null;
}

const EmployeeStatisticsPage = () => {
  const [dailyData, setDailyData] = useState<Record<string, DailyStatistics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const { userInfo } = useAuth();

  const emp_code = userInfo?.emp_code;

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching statistics for employee:", emp_code);

        if (!emp_code) {
          setError("Employee code not found. Please login again.");
          setLoading(false);
          return;
        }

        const response = await axios.get<APIResponse>(
          `${import.meta.env.VITE_API_URL_ORDER}/api/api/employee-statistics/${emp_code}`,
          {
            timeout: 10000,
          }
        );
        
        console.log("API Response:", response.data);

        if (response.data && response.data.status === 'success') {
          if (response.data.data) {
            // Check if data is array or single object
            if (Array.isArray(response.data.data)) {
              // Handle array of daily statistics
              const dataMap = response.data.data.reduce((acc, stat) => {
                const date = formatDateForKey(stat.header.startTime);
                acc[date] = stat;
                return acc;
              }, {} as Record<string, DailyStatistics>);
              setDailyData(dataMap);
            } else {
              // Handle single statistics object
              const date = formatDateForKey(response.data.data.header.startTime);
              setDailyData({ [date]: response.data.data });
            }
          } else {
            setDailyData({});
          }
        } else {
          throw new Error("Failed to fetch statistics");
        }

      } catch (error: any) {
        console.error("Error fetching statistics:", error);
        
        if (error.code === 'ECONNABORTED') {
          setError("Request timeout. Please check your connection.");
        } else if (error.response) {
          setError(`Server error: ${error.response.status}`);
        } else if (error.request) {
          setError("No response from server. Please check if the API is running.");
        } else {
          setError(`Error: ${error.message}`);
        }
        
        toast.error("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    if (emp_code) {
      fetchStatistics();
    }
  }, [emp_code]);

  // Toggle expanded state for a date
  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Helper function to format date for display and key
  const formatDateForKey = (dateString: string) => {
    const date = new Date(dateString);
    const buddhistYear = date.getFullYear() + 543;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const yearShort = (buddhistYear % 100).toString().padStart(2, '0');
    
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const dayName = thaiDays[date.getDay()];
    
    return `${day}/${month}/${yearShort} ${dayName}`;
  };

  // Calculate totals for a specific date
  const calculateTotals = (data: DailyStatistics) => {
    if (!data) return null;
    
    return data.floors.reduce((sum, floor) => ({
      totalOrders: sum.totalOrders + floor.totalOrders,
      totalAmount: sum.totalAmount + floor.totalAmount,
      remaining: sum.remaining + floor.remaining,
      inProgress: sum.inProgress + floor.inProgress,
      completed: sum.completed + floor.completed,
    }), { totalOrders: 0, totalAmount: 0, remaining: 0, inProgress: 0, completed: 0 });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (Object.keys(dailyData).length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100">
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center bg-white p-8 rounded-lg shadow-md">
              <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">ไม่พบข้อมูลสถิติ</h2>
              <p className="text-gray-500 mb-6">ยังไม่มีข้อมูลสถิติสำหรับพนักงานรหัส {emp_code}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                รีเฟรช
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />

      <div className="min-h-screen bg-gray-100">
        <div className="p-4 space-y-4">
          {/* Date Accordion List */}
          {Object.entries(dailyData).map(([date, data]) => {
            const isExpanded = expandedDates.has(date);
            const totals = calculateTotals(data);

            return (
              <div key={date} className="bg-white rounded shadow">
                {/* Date Header */}
                <div
                  onClick={() => toggleDate(date)}
                  className="px-6 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-medium">{date}</span>
                  <span className="text-lg">{isExpanded ? '−' : '−'}</span>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4">
                    {/* Optional time header */}
                    {data.header && (
                      <div className="bg-gray-100 px-4 py-2 mb-4 flex items-center justify-between text-sm">
                        <span>เวลา: {new Date(data.header.startTime).toLocaleTimeString('th-TH')}</span>
                        <span>ถึง: {new Date(data.header.endTime).toLocaleTimeString('th-TH')}</span>
                        <span>รวม: {data.header.durationHr} ชั่วโมง {data.header.durationMin} นาที</span>
                      </div>
                    )}

                    {/* Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-center px-4 py-2 border border-gray-300">ชั้น</th>
                          <th className="text-center px-4 py-2 border border-gray-300">ทั้งหมด</th>
                          <th className="text-center px-4 py-2 border border-gray-300">เหลือจัด</th>
                          <th className="text-center px-4 py-2 border border-gray-300">กำลังจัด</th>
                          <th className="text-center px-4 py-2 border border-gray-300">จัดแล้ว</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Floor Data from API */}
                        {data.floors.map((floor, index) => (
                          <tr key={floor.floor} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                            <td className="text-center px-4 py-2 border border-gray-300">{floor.floor}</td>
                            <td className="text-center px-4 py-2 border border-gray-300">{floor.totalAmount}</td>
                            <td className="text-center px-4 py-2 border border-gray-300">{floor.remaining}</td>
                            <td className="text-center px-4 py-2 border border-gray-300">{floor.inProgress}</td>
                            <td className="text-center px-4 py-2 border border-gray-300">{floor.completed}</td>
                          </tr>
                        ))}
                        
                        {/* Sum Row */}
                        {totals && (
                          <tr className="bg-yellow-100 font-bold ">
                            <td className="text-center px-4 py-2 border border-gray-300">รวม {data.floors.length} ชั้น</td>
                            <td className="text-center px-4 py-2 border border-gray-300 text-purple-600">{totals.totalAmount}</td>
                            <td className="text-center px-4 py-2 border border-gray-300 text-red-600">{totals.remaining}</td>
                            <td className="text-center px-4 py-2 border border-gray-300 text-yellow-600">{totals.inProgress}</td>
                            <td className="text-center px-4 py-2 border border-gray-300 text-green-600">{totals.completed}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Summary Section */}
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between items-center border-b space-y-2 border-gray-200">
                        <span>ระยะเวลาทำงาน</span>
                        <span className="font-medium">
                          {data.header.durationHr} ชั่วโมง {data.header.durationMin} นาที
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b space-y-2 border-gray-200">
                        <span>เหลือ + กำลังจัด</span>
                        <span className="font-medium">
                          {(totals?.remaining ?? 0) + (totals?.inProgress ?? 0)} ชิ้น
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b space-y-2 border-gray-200">
                        <span>ความเร็วเฉลี่ย</span>
                        <div className="font-medium text-red-500 text-right">
                          <div>{data.header.durationMin > 0 
                            ? (data.totalPicked / data.header.durationMin).toFixed(2) 
                            : '0.00'} ชิ้น/นาที</div>
                          <div>{data.header.durationHr > 0 
                            ? (data.totalPicked / data.header.durationHr).toFixed(2) 
                            : '0.00'} ชิ้น/ชั่วโมง</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-b space-y- border-gray-200">
                        <span>เวลาเริ่มงาน</span>
                        <span className="font-medium">
                          {new Date(data.header.startTime).toLocaleTimeString('th-TH')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>เวลาเลิกงาน</span>
                        <span className="font-medium text-red-500">
                          {new Date(data.header.endTime).toLocaleTimeString('th-TH')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default EmployeeStatisticsPage;