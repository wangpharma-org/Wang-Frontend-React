// pages/EmployeeStatistics.tsx - Updated to fetch all employees
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
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

// เพิ่ม interface สำหรับข้อมูลตามวัน
interface DateGroup {
  date: string; // รูปแบบ "YYYY-MM-DD"
  formattedDate: string; // รูปแบบไทย "dd/mm/yy วัน"
  employees: EmployeeGroup[]; // เก็บพนักงานในวันนั้นๆ
}

const EmployeeStatisticsPage = () => {
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dateList, setDateList] = useState<DateGroup[]>([]);

  const { userInfo } = useAuth();

  useEffect(() => {
    fetchAllEmployeeStatistics();
  }, []);

  // สร้างรายการวันจากข้อมูล API
  const extractDatesFromResponse = (employees: EmployeeGroup[]) => {
    const dateMap = new Map<string, DateGroup>();

    employees.forEach((employee) => {
      if (employee.statistics?.header?.startTime) {
        // ดึงเฉพาะวันที่จาก startTime: "2025-05-08T08:08:57.000Z"
        const dateStr = employee.statistics.header.startTime.split("T")[0]; // ได้ "2025-05-08"

        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: dateStr,
            formattedDate: formatDateForKey(dateStr),
            employees: [],
          });
        }

        // เพิ่มพนักงานในวันนั้น
        dateMap.get(dateStr)?.employees.push(employee);
      }
    });

    // แปลง Map เป็น Array และเรียงลำดับวันที่ล่าสุดขึ้นก่อน
    const dates = Array.from(dateMap.values());
    dates.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setDateList(dates);

    // ถ้ามีข้อมูล ให้เปิดวันล่าสุดอัตโนมัติ
    if (dates.length > 0) {
      setExpandedDates(new Set([dates[0].formattedDate]));
    }
  };

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
        extractDatesFromResponse(groups);
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

  // Toggle expanded state for a date
  const toggleDate = (dateStr: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
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
  const formatDateForKey = (dateString: string) => {
    const date = new Date(dateString);
    const buddhistYear = date.getFullYear() + 543;
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const yearShort = (buddhistYear % 100).toString().padStart(2, "0");

    const thaiDays = [
      "อาทิตย์",
      "จันทร์",
      "อังคาร",
      "พุธ",
      "พฤหัสบดี",
      "ศุกร์",
      "เสาร์",
    ];
    const dayName = thaiDays[date.getDay()];

    return `${day}/${month}/${yearShort} ${dayName}`;
  };

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

  // เพิ่มฟังก์ชันนี้ในคอมโพเนนต์
  const combineEmployeeDataByDate = (
    employees: EmployeeGroup[]
  ): EmployeeStatistics => {
    // สร้างข้อมูลพื้นฐาน
    const combinedData: EmployeeStatistics = {
      empCode: "ALL", // รวมทุกคน
      header: {
        startTime: "",
        endTime: "",
        durationMin: 0,
        durationHr: 0,
      },
      floors: [],
      totalPicked: 0,
    };

    // รวมข้อมูลจากทุกพนักงาน
    if (employees.length === 0) return combinedData;

    // Map เก็บข้อมูลแต่ละชั้น
    const floorsMap: Record<string, FloorData> = {};

    // ค่า startTime เริ่มต้น (จะหาค่าที่เร็วที่สุด)
    let earliestStartTime: Date | null = null;
    // ค่า endTime สุดท้าย (จะหาค่าที่ช้าที่สุด)
    let latestEndTime: Date | null = null;

    // วนลูปผ่านทุกพนักงาน
    employees.forEach((employee) => {
      const stats = employee.statistics;

      // รวม totalPicked
      combinedData.totalPicked += stats.totalPicked;

      // ตรวจสอบและปรับปรุง startTime และ endTime
      if (stats.header.startTime) {
        const startTime = new Date(stats.header.startTime);
        if (!earliestStartTime || startTime < earliestStartTime) {
          earliestStartTime = startTime;
          combinedData.header.startTime = stats.header.startTime;
        }
      }

      if (stats.header.endTime) {
        const endTime = new Date(stats.header.endTime);
        if (!latestEndTime || endTime > latestEndTime) {
          latestEndTime = endTime;
          combinedData.header.endTime = stats.header.endTime;
        }
      }

      // รวมข้อมูลแต่ละชั้น
      stats.floors.forEach((floor) => {
        if (!floorsMap[floor.floor]) {
          // สร้างข้อมูลใหม่ถ้ายังไม่มี
          floorsMap[floor.floor] = {
            floor: floor.floor,
            totalOrders: 0,
            totalAmount: 0,
            remaining: 0,
            inProgress: 0,
            completed: 0,
          };
        }

        // รวมข้อมูลชั้น
        floorsMap[floor.floor].totalOrders += floor.totalOrders;
        floorsMap[floor.floor].totalAmount += floor.totalAmount;
        floorsMap[floor.floor].remaining += floor.remaining;
        floorsMap[floor.floor].inProgress += floor.inProgress;
        floorsMap[floor.floor].completed += floor.completed;
      });
    });

    // คำนวณระยะเวลาทำงาน
    if (earliestStartTime && latestEndTime) {
      const durationMs =
        (latestEndTime as Date).getTime() -
        (earliestStartTime as Date).getTime();
      combinedData.header.durationMin = Math.round(durationMs / (1000 * 60));
      combinedData.header.durationHr = parseFloat(
        (durationMs / (1000 * 60 * 60)).toFixed(2)
      );
    }
    // แปลง floorsMap เป็น array
    combinedData.floors = Object.values(floorsMap);

    // เรียงลำดับตามเลขชั้น
    combinedData.floors.sort((a, b) => {
      return parseInt(a.floor) - parseInt(b.floor);
    });

    return combinedData;
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
          {/* Date List - แทนที่ Employee List */}
          {dateList.map((dateGroup, index) => {
            const isExpanded = expandedDates.has(dateGroup.formattedDate);
            // ในอนาคตเราจะกรองข้อมูลตามวันที่ที่เลือก
            // ใช้ข้อมูลพนักงานจากวันที่เลือก
            const employeeData = combineEmployeeDataByDate(dateGroup.employees);

            return (
              <div
                key={dateGroup.formattedDate}
                className="bg-white rounded shadow"
              >
                {/* Date Header - แทนที่ Employee Header */}
                <div
                  onClick={() => toggleDate(dateGroup.formattedDate)}
                  className="px-6 py-3 bg-blue-50 border-b border-gray-200 hover:bg-blue-100 cursor-pointer flex items-center justify-between"
                >
                  <div className="font-medium">
                    <span className="text-blue-700">
                      {dateGroup.formattedDate}
                    </span>
                    <span className="ml-2 text-gray-500 text-sm">
                      ({dateGroup.employees.length} คน)
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

                {/* Content - ยังคงใช้เนื้อหาเดิมเมื่อ expand */}
                {isExpanded && employeeData && (
                  <div className="px-4 py-3">
                    {employeeData.floors.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        ไม่พบข้อมูลสถิติสำหรับวันนี้
                      </div>
                    ) : (
                      <>
                        {/* ส่วนแสดงช่วงเวลา */}
                        <div className="flex flex-row flex-wrap justify-center text-center gap-2 p-4">
                          <div>
                            <div className="text-sm">ตั้งแต่</div>
                            <div className="font-medium">00:00:00</div>
                          </div>
                          <div>
                            <div className="text-sm">จนถึง</div>
                            <div className="font-medium">23:59:59</div>
                          </div>
                          <div>
                            <div className="text-sm">เวลา</div>
                            <div className="font-medium">&nbsp;</div>
                          </div>
                          <div>
                            <div className="text-sm">ชิ้นแรก</div>
                            <div className="font-medium">
                              {employeeData.header.startTime
                                ? new Date(
                                    employeeData.header.startTime
                                  ).toLocaleTimeString("th-TH")
                                : "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm">ชิ้นล่าสุด</div>
                            <div className="font-medium">
                              {employeeData.header.endTime
                                ? new Date(
                                    employeeData.header.endTime
                                  ).toLocaleTimeString("th-TH")
                                : "-"}
                            </div>
                          </div>
                          <div>&nbsp;</div>
                        </div>

                        {/* ส่วนแสดงเวลาทำงาน */}
                        <div className="p-2 mb-4 text-center">
                          <span>ชิ้นล่าสุด - ชิ้นแรก = เวลาทำงาน</span>
                          <span className="font-bold ml-2">
                            {employeeData.header.startTime &&
                            employeeData.header.endTime
                              ? Math.abs(
                                  Math.round(
                                    (new Date(
                                      employeeData.header.endTime
                                    ).getTime() -
                                      new Date(
                                        employeeData.header.startTime
                                      ).getTime()) /
                                      (1000 * 60)
                                  )
                                )
                              : "-"}{" "}
                            นาที
                          </span>
                          <span className="ml-2 text-sm">หรือ</span>
                          <span className="font-bold ml-2">
                            {employeeData.header.startTime &&
                            employeeData.header.endTime
                              ? Math.abs(
                                  Math.round(
                                    (new Date(
                                      employeeData.header.endTime
                                    ).getTime() -
                                      new Date(
                                        employeeData.header.startTime
                                      ).getTime()) /
                                      (1000 * 60 * 60)
                                  )
                                )
                              : "-"}{" "}
                            ชั่วโมง
                          </span>
                        </div>

                        {/* Employee Statistics Table */}
                        <div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-center py-2 border">
                                  ชั้น
                                </th>
                                <th className="text-center py-2 border">
                                  ทั้งหมด
                                </th>
                                <th className="text-center py-2 border">
                                  เหลือจัด
                                </th>
                                <th className="text-center py-2 border">
                                  กำลังจัด
                                </th>
                                <th className="text-center py-2 border">
                                  จัดแล้ว
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Floor Data */}
                              {employeeData.floors.map((floor, index) => {
                                let bgColorClass = "";
                                if (floor.floor === "2")
                                  bgColorClass = "bg-yellow-50";
                                else if (floor.floor === "3")
                                  bgColorClass = "bg-blue-50";
                                else if (floor.floor === "4")
                                  bgColorClass = "bg-red-50";
                                else if (floor.floor === "5")
                                  bgColorClass = "bg-green-50";

                                return (
                                  <tr
                                    key={floor.floor}
                                    className={
                                      bgColorClass ||
                                      (index % 2 === 0 ? "" : "bg-gray-50")
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
                                );
                              })}

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

                        {/* Employee Speed */}
                        <div className="grid grid-cols-2 p-4">
                          <div className="text-center pr-8">
                            <div className="text-lg">ความเร็ว</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">
                              {employeeData.header.durationMin > 0
                                ? (
                                    employeeData.totalPicked /
                                    employeeData.header.durationMin
                                  ).toFixed(2)
                                : "0.00"}{" "}
                              ชิ้น/นาที
                            </div>
                            <div className="font-medium">
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

                        {/* Remaining + In Progress */}
                        <div className="grid grid-cols-2 p-4 border-t border-gray-200">
                          <div className="text-center pr-8">
                            <div className="text-lg">เหลือ + กำลังจัด</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">
                              {(() => {
                                const totals = calculateTotals(employeeData);
                                return totals
                                  ? totals.remaining + totals.inProgress
                                  : 0;
                              })()}{" "}
                              รายการ
                            </div>
                          </div>
                        </div>

                        {/* Completion Time */}
                        <div className="grid grid-cols-2 p-4 border-t border-gray-200">
                          <div className="text-center pr-8">
                            <div className="text-lg">เวลาแล้วเสร็จ</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-500">
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
