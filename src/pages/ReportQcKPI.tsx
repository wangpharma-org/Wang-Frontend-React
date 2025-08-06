import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Socket, io } from "socket.io-client";
import dayjs from "dayjs";

export interface DashboardData {
  QCdata: QCdatum[];
  floorData: FloorData[];
  QCStation: QCStation[];
  AllQC: number;
  SummaryPicking: SummaryPicking[];
}

export interface QCdatum {
  date: Date;
  allOrders: number;
  hatyai: number;
  country: number;
  local: number;
}

export interface SummaryPicking {
  product_floor: string;
  pending_count: string;
  firstPickingTime: Date;
  lastPickingTime: Date;
}

export interface FloorData {
  product_floor: string;
  color: Color;
  firstPickingTime: Date;
  lastPickingTime: Date;
  remainingItem: number;
  completedItem: number;
}

export interface Color {
  primary: string;
  secondary: string;
  border: string;
}

export interface QCStation {
  stationId: number;
  emp_qc_by: null | string;
  qc_nickname: null | string;
  prepare_nickname: null | string;
  packed_nickname: null | string;
  firstQcTime: Date;
  lastQcTime: Date;
  qc_count: number;
  box_amount: string;
}

export interface QuartarlyData {
  quarter: string;
  speed: number;
}

const Dashboard: React.FC = () => {
  const [, setSocket] = useState<Socket | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [, setLoading] = useState<boolean>(false);
  const [totalsOfQc, setTotalOfQC] = useState<number | null>(0);
  const [floorData, setFloorData] = useState<FloorData[] | null>(null);
  const [qcStationsData, setQcStationsData] = useState<QCStation[] | null>(
    null
  );
  const [dataOnTop, setDataOnTop] = useState<QCdatum[] | null>(null);
  const [quartarlyData, setQuartarlyData] = useState<QuartarlyData[]>([])

  useEffect(() => {
    console.log(`${import.meta.env.VITE_API_URL_ORDER}/socket/kpi/dashboard`);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/kpi/dashboard`,
      {
        path: "/socket/kpi",
      }
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("dashboard:get");
    });

    newSocket.on("dashboard:get", (data) => {
      setData(data);
      setLoading(false);
    });

    newSocket.on("connect_error", (error) => {
      console.log(error);
      console.error("❌ Failed to connect to server:", error.message);
      setData(null);
      setLoading(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (data) {
      setTotalOfQC(data.AllQC);
      setFloorData(data.floorData);
      setQcStationsData(data.QCStation);
      const sortedData = data.QCdata.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setDataOnTop(sortedData);
      console.log(data);
    }
  }, [data]);

  useEffect(() => {
    if (qcStationsData) {
      console.log("qcStationsData:", qcStationsData);
  
      const newData: QuartarlyData[] = qcStationsData.map((station) => {
        const workingHours = calculateWorkingHours(
          station.firstQcTime,
          station.lastQcTime
        );
        const speed = calculateSpeed(station.qc_count, workingHours);
        console.log(`Station ${station.stationId} Speed:`, speed);
  
        return {
          quarter: `Q${station.stationId}`,
          speed: speed,
        };
      });
  
      setQuartarlyData(newData);
    }
  }, [qcStationsData]);


  // ฟังก์ชันคำนวณเวลาทำงาน (ชั่วโมง)
  const calculateWorkingHours = (
    firstTime: Date | null,
    lastTime: Date | null
  ): number => {
    if (!firstTime || !lastTime) return 0;

    const firstDate = new Date(firstTime);
    const lastDate = new Date(lastTime);

    const [firstHour, firstMin] = firstDate
      .toLocaleTimeString("en-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .split(":")
      .map(Number);
    const [lastHour, lastMin] = lastDate
      .toLocaleTimeString("en-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .split(":")
      .map(Number);

    const firstTimeInMinutes = firstHour * 60 + firstMin;
    const lastTimeInMinutes = lastHour * 60 + lastMin;

    let timeDifferenceInMinutes = lastTimeInMinutes - firstTimeInMinutes;

    // จัดการกรณีข้ามวัน
    if (timeDifferenceInMinutes < 0) {
      timeDifferenceInMinutes += 24 * 60;
    }

    return timeDifferenceInMinutes / 60; // แปลงเป็นชั่วโมง
  };

  // ฟังก์ชันคำนวณความเร็ว (รายการ/ชั่วโมง)
  const calculateSpeed = (qc_count: number, workingHours: number): number => {
    console.log("=== calculateSpeed ===")
    console.log("qc_count:", qc_count);
    console.log("workingHours:", workingHours);
    const trimmedHours = Math.floor(workingHours * 100) / 100;
    if (workingHours === 0) return 0;
    const speed = qc_count / trimmedHours;
    console.log('speed :', speed)
    return Math.floor(speed);
  };

  // ฟังก์ชันคำนวณรายการต่อลัง
  const calculateItemsPerBox = (
    qc_count: number,
    box_amount: string
  ): number => {
    if (Number(box_amount) === 0) return 0;
    return Math.round(qc_count / Number(box_amount));
  };

  const getStationSpeed = (station: QCStation): number => {
    const workingHours = calculateWorkingHours(
      station.firstQcTime,
      station.lastQcTime
    );
    console.log('workingHours : ',workingHours);
    console.log("station.firstQcTime:", station.firstQcTime);
    console.log("station.lastQcTime:", station.lastQcTime);
    return calculateSpeed(station.qc_count, workingHours);
  };

  // ฟังก์ชันคำนวณความเร็วเฉลี่ย
  const calculateAverageSpeed = (floor: FloorData): number => {
    console.log('floor data :', floorData)
    console.log('floor : ', floor)
    // ถ้ายังไม่เริ่มจัดออเดอร์วันนี้
    if (
      !floor.firstPickingTime ||
      !floor.lastPickingTime ||
      floor.completedItem === 0
    ) {
      return 0;
    }

    // แปลงเวลาเป็นนาที
    const firstDate = new Date(floor.firstPickingTime);
    const lastDate = new Date(floor.lastPickingTime);
    const [firstHour, firstMin] = firstDate
      .toLocaleTimeString("en-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .split(":")
      .map(Number);
    const [lastHour, lastMin] = lastDate
      .toLocaleTimeString("en-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .split(":")
      .map(Number);
    const firstTimeInMinutes = firstHour * 60 + firstMin;
    const lastTimeInMinutes = lastHour * 60 + lastMin;

    // คำนวณระยะเวลาที่ใช้ (นาที)
    let timeDifferenceInMinutes = lastTimeInMinutes - firstTimeInMinutes;

    // จัดการกรณีข้ามวัน (เช่น เริ่ม 23:00 เสร็จ 01:00)
    if (timeDifferenceInMinutes < 0) {
      timeDifferenceInMinutes += 24 * 60; // เพิ่ม 24 ชั่วโมง
    }

    // ป้องกันการหารด้วย 0
    if (timeDifferenceInMinutes === 0) {
      return 0;
    }

    // ความเร็วเฉลี่ย = จำนวนสินค้าที่จัดไปแล้ว / เวลาที่ใช้
    const averageSpeed = floor.completedItem / timeDifferenceInMinutes;

    console.log("averageSpeed : ", averageSpeed);
    return averageSpeed;
  };

  // ฟังก์ชันแสดงเวลา (ถ้า null แสดง **:**)
  const displayTime = (time: Date) => {
    return time
      ? `${dayjs(time).format("DD / MM / YYYY HH:mm")} น.`
      : "__:__ น.";
  };


 
  const calculateActualCompletionTime = () => {
    const speedValues = quartarlyData.map((q) => q.speed);
    const sumSpeed = speedValues.reduce((sum, speed) => sum + speed, 0);

    const minutesNeeded = Math.ceil(((totalsOfQc ?? 0) * 60) / sumSpeed);

    const formulasAfterAddQc = ((totalsOfQc ?? 0) * sumSpeed) / ((totalsOfQc ?? 0) + 1);
    const formulasAfterReduceQc = ((totalsOfQc ?? 0) * sumSpeed) / ((totalsOfQc ?? 0) - 1);
    const timeAdd = minutesNeeded - formulasAfterAddQc;
    const timeReduced = minutesNeeded - formulasAfterReduceQc;

    const currentTime = new Date();
    const completionTime = new Date(
      currentTime.getTime() + minutesNeeded * 60 * 1000
    );

    // จัด format DD/MM/YY ไทย
    const thaiYear = (completionTime.getFullYear() + 543).toString().slice(-2);
    const thaiDate = `${completionTime
      .getDate()
      .toString()
      .padStart(2, "0")}/${(completionTime.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${thaiYear}`;
    const thaiTime = `${completionTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${completionTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    console.log("=== การคำนวณเวลาเสร็จ ===");
    console.log("ผลรวมความเร็ว:", sumSpeed, "ต่อชั่วโมง");
    console.log("เวลาที่ต้องใช้:", minutesNeeded, "นาที");
    console.log("เวลาปัจจุบัน:", currentTime.toLocaleString("th-TH"));
    console.log("เสร็จใน:", thaiDate, thaiTime, "น.");
    return {
      thaiDate,
      thaiTime,
      minutesNeeded,
      sumSpeed,
      currentTime: currentTime.toLocaleString("th-TH"),
      completionTime: completionTime.toLocaleString("th-TH"),
      timeReduced: Math.ceil(timeReduced),
      timeAdd: Math.ceil(timeAdd),
    };
  };
  const {
    thaiDate,
    thaiTime,
    timeReduced,
    timeAdd,
  } = calculateActualCompletionTime();

  const colorConfig: Record<string, Color> = {
    "4": {
      primary: "bg-red-700",
      secondary: "bg-red-700",
      border: "border-white",
    },
    "3": {
      primary: "bg-blue-500",
      secondary: "bg-blue-500",
      border: "border-white",
    },
    "5": {
      primary: "bg-green-500",
      secondary: "bg-green-500",
      border: "border-white",
    },
    "1": {
      primary: "bg-gray-500",
      secondary: "bg-gray-500",
      border: "border-white",
    },
    "2": {
      primary: "bg-yellow-500",
      secondary: "bg-yellow-500",
      border: "border-white",
    },
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 p-4 font-sans">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="font-semibold text-gray-700"></div>

            <div className="text-center text-2xl">
              {dataOnTop && (
                <div className=" text-red-500 px-3 py-1 rounded font-bold">
                  {dayjs(dataOnTop[0]?.date).format("DD / MM / YY")}
                </div>
              )}
            </div>
            <div className="text-center text-2xl">
              {dataOnTop && (
                <div className=" text-yellow-500 px-3 py-1 rounded font-bold">
                  {dayjs(dataOnTop[1]?.date).format("DD / MM / YY")}
                </div>
              )}
            </div>
            <div className="text-center text-2xl">
              {dataOnTop && (
                <div className=" text-green-500 px-3 py-1 rounded font-bold">
                  {dayjs(dataOnTop[2]?.date).format("DD / MM / YY")}
                </div>
              )}
            </div>

            {/* SO_IN Row */}
            <div className="font-semibold text-gray-700 text-3xl text-center">
              SO <span className="text-sm">IN</span>
            </div>
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[0]?.allOrders}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[1]?.allOrders}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[2]?.allOrders}
              </div>
            )}

            {/* ทั่วดิน Row */}
            <div className="font-semibold text-red-600 text-4xl text-center">
              ทั่วถิ่น
            </div>
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[0]?.local}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[1]?.local}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[2]?.local}
              </div>
            )}

            {/* หาดใหญ่ Row */}
            <div className="font-semibold text-blue-500 text-4xl text-center">
              หาดใหญ่
            </div>
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[0]?.hatyai}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[1]?.hatyai}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[2]?.hatyai}
              </div>
            )}

            {/* ทั่วไทย Row */}
            <div className="font-semibold text-orange-500 text-4xl text-center">
              ทั่วไทย
            </div>
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[0]?.country}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[1]?.country}
              </div>
            )}
            {dataOnTop && (
              <div className="text-center text-2xl font-bold">
                {dataOnTop[2]?.country}
              </div>
            )}
            {/* รวม Row */}
            <div className="font-semibold text-green-600 text-4xl text-center">
              รวม
            </div>
            <div className="text-center text-2xl font-bold">
              {(dataOnTop?.[0]?.local ?? 0) +
                (dataOnTop?.[0]?.hatyai ?? 0) +
                (dataOnTop?.[0]?.country ?? 0)}
            </div>
            <div className="text-center text-2xl font-bold">
              {(dataOnTop?.[1]?.local ?? 0) +
                (dataOnTop?.[1]?.hatyai ?? 0) +
                (dataOnTop?.[1]?.country ?? 0)}
            </div>
            <div className="text-center text-2xl font-bold">
              {(dataOnTop?.[2]?.local ?? 0) +
                (dataOnTop?.[2]?.hatyai ?? 0) +
                (dataOnTop?.[2]?.country ?? 0)}
            </div>
          </div>
        </div>

        {/* Middle Section with Large Number */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-center gap-20 items-center text-center">
              <div className="text-2xl text-gray-600 font-bold">
                เหลือ QC ทั้งหมด
              </div>
              <div id = {`OrderList`} className="text-8xl font-bold text-blue-600 mb-2">
                {data?.AllQC}
              </div>
              <div className="text-2xl text-gray-600 font-bold">รายการ</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-center gap-1">
              <p className="text-lg text-green-700 font-bold">
                ทุกการเพิ่ม Qc 1 Stations จะช่วยลดเวลาได้ {timeAdd} น.
              </p>
              <p className="text-lg">-</p>
              <p className="text-lg text-red-700 font-bold">
                ทุกการ หายไปของ Qc 1 Stations จะเพิ่มเวลาการทำงาน{" "}
                {timeReduced} น.
              </p>
            </div>
            <div className="flex justify-center items-center mt-3">
              <div className="text-2xl font-semibold">
                เสร็จใน{" "}
                <span className="text-blue-600 text-5xl font-bold">{thaiDate}</span>{" "}
                <span className="text-blue-600 text-5xl font-bold">{thaiTime}</span> น.
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Analysis Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="grid grid-cols-6 gap-0 mb-4">
            {/* Labels Column */}
            <div className="text-left bg-gray-100 border-r">
              <div className="h-16 p-3 border-b text-black font-semibold text-lg flex items-center">
                ชิ้นแรก วันนี้
              </div>
              <div className="h-20 p-3 border-b text-black font-semibold text-lg flex items-center">
                เหลือ ทั้งหมด
              </div>
              <div className="h-12 p-3 border-b text-black font-semibold text-lg flex items-center">
                ล่าสุด วันนี้
              </div>
              <div className="h-16 p-3 text-black font-semibold text-lg flex items-center">
                ความเร็วเฉลี่ย
              </div>
            </div>
            {floorData
              ?.slice()
              .sort((a, b) => a.product_floor.localeCompare(b.product_floor))
              .map((floor) => {
                const color = colorConfig[floor.product_floor];
                return (
                  <div key={floor.product_floor} className="text-center">
                    <div
                      className={`${color.primary} text-white h-16 border-b ${color.border} flex flex-col justify-center`}
                    >
                      <div className="text-lg font-bold">
                        F{floor.product_floor}
                      </div>
                      <div className="text-sm font-bold">
                        {displayTime(floor.firstPickingTime)}
                      </div>
                    </div>
                    <div
                      className={`${color.primary} text-white h-20 border-b ${color.border} flex items-center justify-center`}
                    >
                      <div className="text-5xl font-bold">
                        {floor.remainingItem}
                      </div>
                    </div>
                    <div
                      className={`${
                        color.secondary
                      } text-white h-12 border-b ${color.border
                        .replace("border-", "border-")
                        .replace(
                          "500",
                          "400"
                        )} flex items-center justify-center`}
                    >
                      <div className="text-sm font-bold">
                        {displayTime(floor.lastPickingTime)}
                      </div>
                    </div>
                    <div
                      className={`${color.secondary} text-white h-16 flex flex-col justify-center`}
                    >
                      <div className="text-lg font-bold">
                        {calculateAverageSpeed(floor).toFixed(2)}
                      </div>
                      <div className="text-xs">รก./นาที</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-5 gap-0">
            {qcStationsData?.map((station) => {
              const workingHours = calculateWorkingHours(
                station.firstQcTime,
                station.lastQcTime
              );
              const itemsPerBox = calculateItemsPerBox(
                station.qc_count,
                station.box_amount
              );
              const speed = getStationSpeed(station);

              return (
                <div key={station.stationId} className="border border-gray-300">
                  <div className="bg-orange-600 text-white p-3 text-center font-bold text-lg">
                    Q{station.stationId}
                  </div>
                  <div className="bg-gray-100 p-2 flex justify-center items-center text-xs">
                    <span className="font-semibold text-base">
                      {station.prepare_nickname} หัวโต๊ะ + {station.qc_nickname}{" "}
                      คิว + {station.packed_nickname} แพ็ค
                    </span>
                  </div>
                  <div className="bg-white flex">
                    <div className="flex-1 p-4 text-center border-r border-gray-300">
                      <div className="text-3xl font-bold">
                        {station.qc_count}
                      </div>
                      <div className="text-xs text-gray-600">รก.</div>
                    </div>
                    <div className="flex-1 p-4 text-center border-r border-gray-500">
                      <div className="text-3xl font-bold">{itemsPerBox}</div>
                      <div className="text-xs text-gray-600">รก / ลัง</div>
                    </div>
                    <div className="flex-1 p-4 text-center">
                      <div className="text-3xl font-bold">
                        {station.box_amount ?? 0}
                      </div>
                      <div className="text-xs text-gray-600">ลัง</div>
                    </div>
                  </div>
                  <div className="bg-white p-2 text-center text-base text-gray-500 border-t border-gray-300">
                    {station.firstQcTime
                      ? `${dayjs(station.firstQcTime).format("HH:mm")} น.`
                      : "__:__"}{" "}
                    ชิ้นแรก &lt;== | {workingHours.toFixed(2)} | ==&gt; ล่าสุด{" "}
                    {station.lastQcTime
                      ? `${dayjs(station.lastQcTime).format("HH:mm")} น.`
                      : "__:__"}
                  </div>
                  <div className="bg-orange-600 text-white p-3 text-center font-bold text-xs">
                    speed <span className="text-xl">{speed}</span> รก./ชม.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
