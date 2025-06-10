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
  const [expandedDates, setExpandedDates] = useState<
    Record<string, Set<string>>
  >({});
  const { userInfo } = useAuth();

  useEffect(() => {
    fetchAllEmployeeStatistics();
  }, []);

  // สร้างรายการวันจากข้อมูล API
  const extractDatesFromResponse = (employees: EmployeeGroup[]) => {
    const dateMap = new Map<string, DateGroup>();

    employees.forEach((employee) => {
      if (employee.statistics?.date) {
        // ใช้ date ที่ backend ส่งมาโดยตรง
        const dateStr = employee.statistics.date;

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

    // แปลง Map เป็น Array และเรียงลำดับวันที่ล่าสุดอยู่ด้านล่าง
    const dates = Array.from(dateMap.values());
    dates.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setDateList(dates);

    // ถ้ามีข้อมูล ให้เปิดวันล่าสุดอัตโนมัติ
    if (dates.length > 0) {
      setExpandedDates(new Set([dates[3].formattedDate]));
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

      // console.log("API Response:", response.data);

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
    employees: EmployeeGroup[],
    date?: string
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
      date: date || "", // ผูก date ไว้กับ group
    };

    // รวมข้อมูลจากทุกพนักงาน
    if (employees.length === 0) return combinedData;

    // Map เก็บข้อมูลแต่ละชั้น
    const floorsMap: Record<string, FloorData> = {};

    // ค่า startTime เริ่มต้น (จะหาค่าที่เร็วที่สุด)
    let earliestStartTime: Date | null = null;
    // ค่า endTime สุดท้าย (จะหาค่าที่ช้าที่สุด)
    let latestEndTime: Date | null = null;

    // รวม durationMin/ durationHr จาก header
    let totalDurationMin = 0;
    let totalDurationHr = 0;
    let countWithDuration = 0;

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

      // รวม durationMin/Hr (ใช้ค่าที่ backend ส่งมา)
      if (
        typeof stats.header.durationMin === "number" &&
        !isNaN(stats.header.durationMin)
      ) {
        totalDurationMin += stats.header.durationMin;
        countWithDuration++;
      }
      if (
        typeof stats.header.durationHr === "number" &&
        !isNaN(stats.header.durationHr)
      ) {
        totalDurationHr += stats.header.durationHr;
      }

      // รวมข้อมูลแต่ละชั้น พร้อม normalize floor เป็น "?" ถ้าไม่ถูกต้อง
      stats.floors.forEach((floor) => {
        const floorKey = floor.floor && /^[1-5]$/.test(floor.floor) ? floor.floor : "?";

        if (!floorsMap[floorKey]) {
          floorsMap[floorKey] = {
            floor: floorKey,
            totalOrders: 0,
            totalAmount: 0,
            remaining: 0,
            inProgress: 0,
            completed: 0,
          };
        }

        floorsMap[floorKey].totalOrders += floor.totalOrders;
        floorsMap[floorKey].totalAmount += floor.totalAmount;
        floorsMap[floorKey].remaining += floor.remaining;
        floorsMap[floorKey].inProgress += floor.inProgress;
        floorsMap[floorKey].completed += floor.completed;
      });
    });

    // ใช้ durationMin/Hr รวม (หรือเฉลี่ย)
    combinedData.header.durationMin = totalDurationMin;
    combinedData.header.durationHr = totalDurationHr;

    // แปลง floorsMap เป็น array
    combinedData.floors = Object.values(floorsMap);

    // เติมชั้นที่ไม่มีข้อมูล เพื่อให้แสดงครบทุกชั้น
    const allFloors = ['?', '1', '2', '3', '4', '5'];
    allFloors.forEach((floorId) => {
      if (!floorsMap[floorId]) {
        combinedData.floors.push({
          floor: floorId,
          totalOrders: 0,
          totalAmount: 0,
          remaining: 0,
          inProgress: 0,
          completed: 0,
        });
      }
    });

    // เรียงลำดับใหม่อีกครั้งหลังเติมครบ
    combinedData.floors.sort((a, b) => {
      if (a.floor === '?') return -1;
      if (b.floor === '?') return 1;
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
            const employeeData = combineEmployeeDataByDate(dateGroup.employees, dateGroup.date);

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
                    {/* <span className="ml-2 text-gray-500 text-sm">
                      ({dateGroup.employees.length} คน)
                    </span> */}
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
                        {/* ส่วนแสดงช่วงเวลา */}
                        <div className="flex flex-row flex-wrap justify-center text-center gap-2 p-4 text-xs sm:text-sm">
                          <div>
                            <div className="text-xs sm:text-sm">ตั้งแต่</div>
                            <div className="font-medium whitespace-nowrap">
                              00:00:00
                            </div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm">จนถึง</div>
                            <div className="font-medium whitespace-nowrap">
                              23:59:59
                            </div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm">เวลา</div>
                            <div className="font-medium whitespace-nowrap">
                              &nbsp;
                            </div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm">ชิ้นแรก</div>
                            <div className="font-medium whitespace-nowrap">
                              {employeeData.header.startTime
                                ? new Date(
                                    employeeData.header.startTime
                                  ).toLocaleTimeString("th-TH")
                                : "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm">ชิ้นล่าสุด</div>
                            <div className="font-medium whitespace-nowrap">
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
                        <div className="p-2 mb-4 text-center text-xs sm:text-sm">
                          <span>ชิ้นล่าสุด - ชิ้นแรก = เวลาทำงาน</span>
                          <span className="font-bold ml-2">
                            {employeeData.header.startTime && employeeData.header.endTime
                              ? Math.round(
                                  (new Date(employeeData.header.endTime).getTime() -
                                    new Date(employeeData.header.startTime).getTime()) /
                                    (1000 * 60)
                                )
                              : "-"} นาที
                          </span>
                          <span className="ml-2 text-xs sm:text-sm">หรือ</span>
                          <span className="font-bold ml-2">
                            {employeeData.header.startTime && employeeData.header.endTime
                              ? Math.round(
                                  (new Date(employeeData.header.endTime).getTime() -
                                    new Date(employeeData.header.startTime).getTime()) /
                                    (1000 * 60 * 60)
                                )
                              : "-"} ชั่วโมง
                          </span>
                        </div>

                        {/* Employee Statistics Table */}
                        <div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-center py-2 border border-gray-300">
                                  ชั้น
                                </th>
                                <th className="text-center py-2 border border-gray-300">
                                  ทั้งหมด
                                </th>
                                <th className="text-center py-2 border border-gray-300">
                                  เหลือจัด
                                </th>
                                <th className="text-center py-2 border border-gray-300">
                                  กำลังจัด
                                </th>
                                <th className="text-center py-2 border border-gray-300">
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
                                  bgColorClass = "bg-white";

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
                                    <td className="text-center px-4 py-2 border border-gray-300">
                                      {floor.remaining}
                                    </td>
                                    <td className="text-center px-4 py-2 border border-gray-300">
                                      {floor.inProgress}
                                    </td>
                                    <td className="text-center px-4 py-2 border border-gray-300">
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
                                    <tr className="bg-white font-bold">
                                      <td className="text-center px-4 py-2 border border-gray-300">
                                        รวม <span className="text-yellow-400">{employeeData.floors.length}</span> ชั้น
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
                          <div className="flex items-center justify-center text-center pr-8">
                            <div className="text-sm">ความเร็ว</div>
                          </div>
                          <div className="text-center">
                            {(() => {
                              const totalCompleted = employeeData.floors.reduce((acc, floor) => acc + floor.completed, 0);
                              // const totalCompleted = 0;
                              const start = new Date(employeeData.header.startTime).getTime();
                              const end = new Date(employeeData.header.endTime).getTime();

                              const speedPerMinute = totalCompleted > 0
                                ? ((end - start) / (1000 * 60)) / totalCompleted
                                : 0;

                              const speedPerHour = totalCompleted > 0
                                ? ((end - start) / (1000 * 60 * 60)) / totalCompleted
                                : 0;

                              return (
                                <>
                                  <div className="font-medium">
                                    {speedPerMinute.toFixed(2)} ชิ้น/นาที
                                  </div>
                                  <div className="font-medium">
                                    {speedPerHour.toFixed(2)} ชิ้น/ชั่วโมง
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Remaining + In Progress */}
                        <div className="grid grid-cols-2 p-4 border-t border-gray-200">
                          <div className="text-center pr-8">
                            <div className="text-sm">เหลือ + กำลังจัด</div>
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
                            <div className="text-sm">ประมาณการแล้วเสร็จ</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-500">
                              {(() => {
                                // คำนวณเวลาแล้วเสร็จจากสูตรใหม่: startTime + (totalAmount ÷ speedPerMinute)
                                // ตรวจสอบว่า startTime มีค่าและ speedPerMinute > 0
                                const totals = calculateTotals(employeeData);
                                // const totalAmount = totals ? totals.totalAmount : 0;
                                if (
                                  !employeeData.header.endTime ||
                                  employeeData.floors.reduce((acc, floor) => acc + floor.completed, 0) <= 0
                                ) {
                                  return "-";
                                }
                                // ความเร็วเฉลี่ยต่อนาที
                                const totalCompleted = employeeData.floors.reduce((acc, floor) => acc + floor.completed, 0);
                                const start = new Date(employeeData.header.startTime).getTime();
                                const end = new Date(employeeData.header.endTime).getTime();
  
                                const speedPerMinute = totalCompleted > 0
                                  ? ((end - start) / (1000 * 60)) / totalCompleted
                                  : 0;

                                if (speedPerMinute <= 0) {
                                  return "-";
                                }

                                const remaining = (totals?.remaining || 0) + (totals?.inProgress || 0);
                                const estimatedFinishTimestamp =
                                  new Date(employeeData.header.endTime).getTime() +
                                  (remaining / speedPerMinute) * 60 * 1000;
                                const estimatedFinish = new Date(estimatedFinishTimestamp);
                                const finishHours = estimatedFinish.getHours().toString().padStart(2, '0');
                                const finishMinutes = estimatedFinish.getMinutes().toString().padStart(2, '0');
                                const finishSeconds = estimatedFinish.getSeconds().toString().padStart(2, '0');
                                return `${finishHours}:${finishMinutes}:${finishSeconds}`;
                                
                              })()}
                              {/* {(() => {
                                // 🔧 กำหนดค่าแบบ hardcoded เพื่อทดสอบการคำนวณ
                                const startTime = new Date("2025-05-28T08:00:00"); // Local time
                                const endTime = new Date("2025-05-28T08:30:00");   // Local time
                                const totalAmount = 10; // จำนวนทั้งหมดที่ต้องจัด
                                const completed = 5; // จำนวนที่จัดไปแล้ว

                                // ตรวจสอบค่าพื้นฐาน
                                if (!startTime || completed <= 0) {
                                  return "-";
                                }

                                // คำนวณความเร็วเฉลี่ยต่อนาที
                                const speedPerMinute =
                                  (endTime.getTime() - startTime.getTime()) / (1000 * 60) / completed;

                                if (speedPerMinute <= 0) {
                                  return "-";
                                }

                                // คำนวณเวลาที่จะเสร็จโดยประมาณ
                                const estimatedFinishTimestamp =
                                  startTime.getTime() + (totalAmount / speedPerMinute) * 60 * 1000;

                                const estimatedFinish = new Date(estimatedFinishTimestamp);
                                const finishHours = estimatedFinish.getHours().toString().padStart(2, "0");
                                const finishMinutes = estimatedFinish.getMinutes().toString().padStart(2, "0");
                                const finishSeconds = estimatedFinish.getSeconds().toString().padStart(2, "0");

                                return `${finishHours}:${finishMinutes}:${finishSeconds}`;
                              })()} */}
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
