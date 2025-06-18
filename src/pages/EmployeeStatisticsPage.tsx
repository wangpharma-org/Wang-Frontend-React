// pages/EmployeeStatistics.tsx - Updated to fetch all employees
import { useEffect, useState } from "react";
import axios from "axios";
// import { useAuth } from "../context/AuthContext";
import { Bounce, ToastContainer, toast } from "react-toastify";
import Header from "../components/Header";
import LoadingSpinner from "../components/LoadingSpinner";
import { ChevronDown, ChevronUp } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

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

interface EmployeeStatistics {
  empCode: string;
  header: StatisticsHeader;
  floors: FloorData[];
  totalPicked: number;
  date: string; //เพิ่มฟิลด์นี้
}

interface APIResponse {
  status: string;
  data: EmployeeStatistics[] | null;
}

interface EmployeeGroup {
  empCode: string;
  name?: string; // สำหรับชื่อพนักงานในอนาคต
  statistics: EmployeeStatistics;
  isExpanded: boolean;
}

const EmployeeStatisticsPage = () => {
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(
    new Set()
  );
  const [, setExpandedDates] = useState<
    Record<string, Set<string>>
  >({});
  // const { userInfo } = useAuth();

  useEffect(() => {
    fetchAllEmployeeStatistics();
  }, []);

  const fetchAllEmployeeStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching statistics for all employees");

      const response = await axios.get<APIResponse>(
        `${import.meta.env.VITE_API_URL_ORDER}/api/api/employee-statistics`,
        {
          timeout: 10000,
        }
      );

      console.log("API Response:", response.data);

      if (
        response.data &&
        response.data.status === "success" &&
        Array.isArray(response.data.data)
      ) {
        // Process employee data
        const groups = response.data.data.map((empStats) => ({
          empCode: empStats.empCode,
          statistics: empStats,
          isExpanded: false,
        }));

        // Sort by employee code
        groups.sort((a, b) => a.empCode.localeCompare(b.empCode));

        setEmployeeGroups(groups);

        // Initialize expandedDates for each employee
        const datesMap: Record<string, Set<string>> = {};
        groups.forEach((group) => {
          datesMap[group.empCode] = new Set();
        });
        setExpandedDates(datesMap);
      } else {
        setEmployeeGroups([]);
        throw new Error("Invalid data format received");
      }
    } catch (error: any) {
      console.error("Error fetching employee statistics:", error);

      if (error.code === "ECONNABORTED") {
        setError("Request timeout. Please check your connection.");
      } else if (error.response) {
        setError(`Server error: ${error.response.status}`);
      } else if (error.request) {
        setError(
          "No response from server. Please check if the API is running."
        );
      } else {
        setError(`Error: ${error.message}`);
      }

      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  // Toggle expanded state for an employee
  const toggleEmployee = (empCode: string) => {
    setExpandedEmployees((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(empCode)) {
        newSet.delete(empCode);
      } else {
        newSet.add(empCode);
      }
      return newSet;
    });
  };

  // Format employee display name
  const formatEmployeeName = (empCode: string) => {
    // ในอนาคตอาจจะดึงชื่อพนักงานจริงจากข้อมูล
    return `พนักงาน ${empCode}`;
  };

  // Helper function to format date for display
  // const formatDateForKey = (dateString: string) => {
  //   const date = new Date(dateString);
  //   const buddhistYear = date.getFullYear() + 543;
  //   const day = date.getDate().toString().padStart(2, "0");
  //   const month = (date.getMonth() + 1).toString().padStart(2, "0");
  //   const yearShort = (buddhistYear % 100).toString().padStart(2, "0");

  //   const thaiDays = [
  //     "อาทิตย์",
  //     "จันทร์",
  //     "อังคาร",
  //     "พุธ",
  //     "พฤหัสบดี",
  //     "ศุกร์",
  //     "เสาร์",
  //   ];
  //   const dayName = thaiDays[date.getDay()];

  //   return `${day}/${month}/${yearShort} ${dayName}`;
  // };

  // Calculate totals for a specific employee
  const calculateTotals = (data: EmployeeStatistics) => {
    if (!data || !data.floors || data.floors.length === 0) return null;

    return data.floors.reduce(
      (sum, floor) => ({
        totalOrders: sum.totalOrders + floor.totalOrders,
        totalAmount: sum.totalAmount + floor.totalAmount,
        remaining: sum.remaining + floor.remaining,
        inProgress: sum.inProgress + floor.inProgress,
        completed: sum.completed + floor.completed,
      }),
      {
        totalOrders: 0,
        totalAmount: 0,
        remaining: 0,
        inProgress: 0,
        completed: 0,
      }
    );
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
            onClick={() => fetchAllEmployeeStatistics()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (employeeGroups.length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100">
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center bg-white p-8 rounded-lg shadow-md">
              <svg
                className="w-20 h-20 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                ไม่พบข้อมูลสถิติ
              </h2>
              <p className="text-gray-500 mb-6">
                ยังไม่มีข้อมูลสถิติพนักงานในระบบ
              </p>
              <button
                onClick={() => fetchAllEmployeeStatistics()}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                <svg
                  className="w-5 h-5 inline mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
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
          {/* Employee List */}
          {employeeGroups.map((employee) => {
            const isExpanded = expandedEmployees.has(employee.empCode);
            const employeeData = employee.statistics;

            return (
              <div key={employee.empCode} className="bg-white rounded shadow">
                {/* Employee Header */}
                <div
                  onClick={() => toggleEmployee(employee.empCode)}
                  className="px-6 py-3 bg-blue-50 border-b border-gray-200 hover:bg-blue-100 cursor-pointer flex items-center justify-between"
                >
                  <div className="font-medium">
                    <span className="text-blue-700">
                      {formatEmployeeName(employee.empCode)}
                    </span>
                    <span className="ml-2 text-gray-500 text-sm">
                      ({employee.empCode})
                    </span>
                  </div>
                  <span className="text-lg">
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </span>
                </div>

                {/* Employee Content */}
                {isExpanded && (
                  <div className="px-4 py-3">
                    {employeeData.floors.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        ไม่พบข้อมูลสถิติสำหรับพนักงานนี้
                      </div>
                    ) : (
                      <>
                        {/* Employee Statistics Summary */}
                        <div className="bg-gray-50 p-4 mb-4 rounded">
                          <h3 className="font-medium mb-2">สรุปผลงาน</h3>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <div className="text-sm text-gray-500">
                                จำนวนที่จัดทั้งหมด
                              </div>
                              <div className="text-xl font-bold text-green-600">
                                {employeeData.totalPicked} ชิ้น
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded border border-gray-200">
                              <div className="text-sm text-gray-500">
                                เวลาแล้วเสร็จ
                              </div>
                              <div className="text-xl font-bold text-blue-600">
                                {(() => {
                                  // คำนวณเวลาแล้วเสร็จจากความเร็วและงานทั้งหมด
                                  if (
                                    employeeData.header.durationMin <= 0 ||
                                    employeeData.totalPicked <= 0
                                  ) {
                                    return "-";
                                  }

                                  // คำนวณความเร็วเฉลี่ยต่อนาที
                                  const speedPerMinute =
                                    employeeData.totalPicked /
                                    employeeData.header.durationMin;

                                  // นำผลรวมของคอลัมน์ "ทั้งหมด" มาคำนวณ
                                  const totals = calculateTotals(employeeData);
                                  const totalAmount = totals
                                    ? totals.totalAmount
                                    : 0;

                                  // คำนวณเวลาที่ต้องใช้ทั้งหมด (นาที)
                                  const totalMinutes =
                                    speedPerMinute > 0
                                      ? Math.ceil(totalAmount / speedPerMinute)
                                      : 0;

                                  // คำนวณเวลาแล้วเสร็จ
                                  const totalHours = Math.floor(
                                    totalMinutes / 60
                                  );
                                  const finalMinutes = totalMinutes % 60;

                                  // แสดงผลเป็น ชั่วโมง:นาที
                                  return totalMinutes > 0
                                    ? `${
                                        totalHours > 0
                                          ? `${totalHours} ชั่วโมง `
                                          : ""
                                      }${finalMinutes} นาที`
                                    : "เสร็จสิ้นแล้ว";
                                })()}
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded border border-gray-200">
                              <div className="text-sm text-gray-500">
                                ความเร็วเฉลี่ย
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xl font-bold text-purple-600">
                                <div>
                                  {employeeData.header.durationMin > 0
                                    ? (
                                        employeeData.totalPicked /
                                        employeeData.header.durationMin
                                      ).toFixed(2)
                                    : "0.00"}{" "}
                                  ชิ้น/นาที
                                </div>
                                <div>
                                  {employeeData.header.durationHr > 0
                                    ? (
                                        employeeData.totalPicked /
                                        employeeData.header.durationHr
                                      ).toFixed(2)
                                    : "0.00"}{" "}
                                  ชิ้น/ชั่วโมง
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Employee Statistics Table */}
                        <div>
                          <h3 className="font-medium mb-2">ข้อมูลตามชั้น</h3>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-center px-4 py-2 border border-gray-300">
                                  ชั้น
                                </th>
                                <th className="text-center px-4 py-2 border border-gray-300">
                                  ทั้งหมด
                                </th>
                                <th className="text-center px-4 py-2 border border-gray-300">
                                  เหลือจัด
                                </th>
                                <th className="text-center px-4 py-2 border border-gray-300">
                                  กำลังจัด
                                </th>
                                <th className="text-center px-4 py-2 border border-gray-300">
                                  จัดแล้ว
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Floor Data */}
                              {employeeData.floors.map((floor, index) => (
                                <tr
                                  key={floor.floor}
                                  className={
                                    index % 2 === 0 ? "" : "bg-gray-50"
                                  }
                                >
                                  <td className="text-center px-4 py-2 border border-gray-300">
                                    {floor.floor}
                                  </td>
                                  <td className="text-center px-4 py-2 border border-gray-300">
                                    {floor.totalAmount}
                                  </td>
                                  <td className="text-center px-4 py-2 border border-gray-300 text-red-600">
                                    {floor.remaining}
                                  </td>
                                  <td className="text-center px-4 py-2 border border-gray-300 text-yellow-600">
                                    {floor.inProgress}
                                  </td>
                                  <td className="text-center px-4 py-2 border border-gray-300 text-green-600">
                                    {floor.completed}
                                  </td>
                                </tr>
                              ))}

                              {/* Sum Row */}
                              {(() => {
                                const totals = calculateTotals(employeeData);
                                return (
                                  totals && (
                                    <tr className="bg-yellow-100 font-bold">
                                      <td className="text-center px-4 py-2 border border-gray-300">
                                        รวม {employeeData.floors.length} ชั้น
                                      </td>
                                      <td className="text-center px-4 py-2 border border-gray-300 text-purple-600">
                                        {totals.totalAmount}
                                      </td>
                                      <td className="text-center px-4 py-2 border border-gray-300 text-red-600">
                                        {totals.remaining}
                                      </td>
                                      <td className="text-center px-4 py-2 border border-gray-300 text-yellow-600">
                                        {totals.inProgress}
                                      </td>
                                      <td className="text-center px-4 py-2 border border-gray-300 text-green-600">
                                        {totals.completed}
                                      </td>
                                    </tr>
                                  )
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Employee Activity Times */}
                        <div className="mt-4 pt-4 border-t">
                          <h3 className="font-medium mb-2">รายละเอียดเวลา</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <div className="text-sm text-gray-500">
                                ตั้งแต่ - จนถึง
                              </div>
                              <div className="font-medium">
                                <span>00:00:00 ถึง 23:59:59</span>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded border border-gray-200">
                              <div className="text-sm text-gray-500">
                                เวลาเริ่มงาน
                              </div>
                              <div className="font-medium">
                                {employeeData.header.startTime
                                  ? new Date(
                                      employeeData.header.startTime
                                    ).toLocaleTimeString("th-TH")
                                  : "-"}
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded border border-gray-200">
                              <div className="text-sm text-gray-500">
                                เวลาเลิกงาน
                              </div>
                              <div className="font-medium text-red-500">
                                {employeeData.header.endTime
                                  ? new Date(
                                      employeeData.header.endTime
                                    ).toLocaleTimeString("th-TH")
                                  : "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
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
