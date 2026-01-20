import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Socket, io } from "socket.io-client";
import dayjs from "dayjs";
import 'dayjs/locale/th';
dayjs.locale('th');

export interface DashboardData {
  QCdata: QCdata[];
  floorData: FloorData[];
  QCStation: QCStation[];
  AllQC: number;
  SummaryPicking: SummaryPicking[];
  averageSpeedQC: AverageSpeedAllQCResponse;
  SummaryPickingAndEmployee: SummaryPickingAndEmployee[];
}

export interface QCdata {
  date: Date;
  allOrders: number;
  hatyai: number;
  country: number;
  local: number;
  allOrdersNotQC: number;
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

export interface AverageSpeedAllQCResponse {
  averageSpeed: number;
  totalQC: number;
}

interface SummaryPickingAndEmployee {
  emp_nickname: string;
  counted: number;
  speed: number;
  floor: string;
  lastPickingTime: Date;
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
  const [dataOnTop, setDataOnTop] = useState<QCdata[] | null>(null);
  const [quartarlyData, setQuartarlyData] = useState<QuartarlyData[]>([]);


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
      console.log("Received dashboard data:", data);
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
      // console.log(data);
    }
  }, [data]);

  useEffect(() => {
    if (qcStationsData) {
      // console.log("qcStationsData:", qcStationsData);

      const newData: QuartarlyData[] = qcStationsData.map((station) => {
        const workingHours = calculateWorkingHours(
          station.firstQcTime,
          station.lastQcTime
        );
        const speed = calculateSpeed(station.qc_count, workingHours);
        // console.log(`Station ${station.stationId} Speed:`, speed);

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
    // console.log("=== calculateSpeed ===");
    // console.log("qc_count:", qc_count);
    // console.log("workingHours:", workingHours);
    const trimmedHours = Math.floor(workingHours * 100) / 100;
    if (workingHours === 0) return 0;
    const speed = qc_count / trimmedHours;
    // console.log("speed :", speed);
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
    // console.log("workingHours : ", workingHours);
    // console.log("station.firstQcTime:", station.firstQcTime);
    // console.log("station.lastQcTime:", station.lastQcTime);
    return calculateSpeed(station.qc_count, workingHours);
  };

  // // ฟังก์ชันคำนวณความเร็วเฉลี่ย
  // const calculateAverageSpeed = (floor: FloorData): number => {
  //   // console.log("floor data :", floorData);
  //   // console.log("floor : ", floor);
  //   // ถ้ายังไม่เริ่มจัดออเดอร์วันนี้
  //   if (
  //     !floor.firstPickingTime ||
  //     !floor.lastPickingTime ||
  //     floor.completedItem === 0
  //   ) {
  //     return 0;
  //   }

  //   // แปลงเวลาเป็นนาที
  //   const firstDate = new Date(floor.firstPickingTime);
  //   const lastDate = new Date(floor.lastPickingTime);
  //   const [firstHour, firstMin] = firstDate
  //     .toLocaleTimeString("en-TH", {
  //       hour: "2-digit",
  //       minute: "2-digit",
  //       hour12: false,
  //     })
  //     .split(":")
  //     .map(Number);
  //   const [lastHour, lastMin] = lastDate
  //     .toLocaleTimeString("en-TH", {
  //       hour: "2-digit",
  //       minute: "2-digit",
  //       hour12: false,
  //     })
  //     .split(":")
  //     .map(Number);
  //   const firstTimeInMinutes = firstHour * 60 + firstMin;
  //   const lastTimeInMinutes = lastHour * 60 + lastMin;

  //   // คำนวณระยะเวลาที่ใช้ (นาที)
  //   let timeDifferenceInMinutes = lastTimeInMinutes - firstTimeInMinutes;

  //   // จัดการกรณีข้ามวัน (เช่น เริ่ม 23:00 เสร็จ 01:00)
  //   if (timeDifferenceInMinutes < 0) {
  //     timeDifferenceInMinutes += 24 * 60; // เพิ่ม 24 ชั่วโมง
  //   }

  //   // ป้องกันการหารด้วย 0
  //   if (timeDifferenceInMinutes === 0) {
  //     return 0;
  //   }

  //   // ความเร็วเฉลี่ย = จำนวนสินค้าที่จัดไปแล้ว / เวลาที่ใช้
  //   const averageSpeed = floor.completedItem / timeDifferenceInMinutes;

  //   // console.log("averageSpeed : ", averageSpeed);
  //   return averageSpeed;
  // };

  // ฟังก์ชันแสดงเวลา (ถ้า null แสดง **:**)
  const displayTime = (time: Date) => {
    return time
      ? `${dayjs(time).format("DD / MM / YYYY HH:mm")} น.`
      : "__:__ น.";
  };

  // // ฟังก์ชันคำนวณสีตามความเร็ว
  // const getSpeedColorClass = (speedPerHour: number): string => {
  //   if (speedPerHour >= 350) return "bg-blue-500";
  //   if (speedPerHour >= 251 && speedPerHour <= 349) return "bg-green-500";
  //   if (speedPerHour >= 151 && speedPerHour <= 249) return "bg-yellow-500";
  //   return "bg-red-500";
  // };
  const getSpeedColorClass2 = (speedPerHour: number): string => {
    if (speedPerHour >= 200) return "bg-blue-500";
    if (speedPerHour >= 150 && speedPerHour <= 199) return "bg-green-500";
    if (speedPerHour >= 100 && speedPerHour <= 149) return "bg-yellow-500";
    return "bg-red-500";
  };

  const calculateActualCompletionTime = () => {
    const speedValues = quartarlyData.map((q) => q.speed);
    const sumSpeed = speedValues.reduce((sum, speed) => sum + speed, 0);

    const minutesNeeded = Math.ceil(((totalsOfQc ?? 0) * 60) / sumSpeed);

    const formulasAfterAddQc =
      ((totalsOfQc ?? 0) * sumSpeed) / ((totalsOfQc ?? 0) + 1);
    const formulasAfterReduceQc =
      ((totalsOfQc ?? 0) * sumSpeed) / ((totalsOfQc ?? 0) - 1);
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
    // console.log("=== การคำนวณเวลาเสร็จ ===");
    // console.log("ผลรวมความเร็ว:", sumSpeed, "ต่อชั่วโมง");
    // console.log("เวลาที่ต้องใช้:", minutesNeeded, "นาที");
    // console.log("เวลาปัจจุบัน:", currentTime.toLocaleString("th-TH"));
    // console.log("เสร็จใน:", thaiDate, thaiTime, "น.");
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
  const { thaiDate, thaiTime, timeReduced, timeAdd } =
    calculateActualCompletionTime();

  const colCount = (dataOnTop?.length ?? 0) + 1;
  const gridStyle = {
    gridTemplateColumns: `repeat(${colCount - 1}, minmax(0, 1fr))`,
  };

  const groupedQCData = (qcStationsData: QCStation[] | null): QCStation[] => {
    if (!qcStationsData || qcStationsData.length === 0) return [];

    const grouped = qcStationsData.reduce((acc, item) => {
      const key = item.qc_nickname || 'unknown';

      const currentTime = item.lastQcTime ? new Date(item.lastQcTime).getTime() : 0;

      if (!acc[key]) {
        acc[key] = item;
      } else {
        const existingTime = acc[key].lastQcTime ? new Date(acc[key].lastQcTime).getTime() : 0;
        console.log(`Comparing times for key ${key}: currentTime=${currentTime}, existingTime=${existingTime}`);
        // console.log(`Item:`, item);
        console.log(`Existing:`, acc[key]);
        if (currentTime > existingTime) {
          acc[key] = item;
        }
      }

      return acc;
    }, {} as Record<string, QCStation>);

    return Object.values(grouped);
  };

  const [timeInput, setTimeInput] = useState<string>("");
  const timeNow = new Date();
  const calculateSpeedAtTime = (timeInput: string): number => {
    if (!data?.AllQC) return 0;
    const caltimeforhour = ((((Number(timeInput.split(":")[0]) * 60 + Number(timeInput.split(":")[1])) - (timeNow.getHours() * 60 + timeNow.getMinutes()))) / 60).toFixed(2)
    if (Number(caltimeforhour) < 1) return 0;
    console.log("caltimeforhour :", caltimeforhour);
    const result = ((data?.AllQC) / Number(caltimeforhour));
    return result.toFixed(2) ? Number(result.toFixed(2)) : 0;
  }

  return (
    <>
      <Navbar />
      <div className="bg-gray-100 p-4 font-sans">
        <div className="flex bg-white rounded-lg shadow-lg p-6 mb-4">
          {/* วันที่ Row */}
          <div className="flex flex-col ">
            <div className="font-semibold text-2xl text-gray-700 mb-2">
              วันที่
            </div>
            <div className="font-semibold text-gray-700 text-3xl mb-2">
              SO <span className="text-sm">IN</span>
            </div>
            <div className="font-semibold text-red-600 text-4xl mb-2">
              ทั่วถิ่น
            </div>
            <div className="font-semibold text-blue-500 text-4xl mb-2">
              หาดใหญ่
            </div>
            <div className="font-semibold text-orange-500 text-4xl mb-2">
              ทั่วไทย
            </div>
            <div className="font-semibold text-green-600 text-4xl mb-2">
              รวม
            </div>
          </div>
          {dataOnTop === null ? (
            <div className="flex-1 flex justify-center items-center text-2xl md:text-3xl lg:text-5xl font-bold text-center text-gray-600">Loading...</div>
          ) :
            <div className="flex gap-4 w-50 overflow-x-auto md:overflow-hidden lg:grid md:w-full" style={gridStyle}>
              {dataOnTop?.map((item, index) => (
                <div key={index} className="flex flex-col items-center w-full">
                  <div className="text-red-500 px-3 py-1 rounded font-bold text-2xl mb-2">
                    {dayjs(item.date).format('dddd DD/MM/YY')}
                  </div>
                  <div className="text-center text-2xl font-bold py-1 mb-2">
                    {item.allOrders}
                  </div>
                  <div className="text-center text-2xl font-bold py-1 mb-2">
                    {item.local}
                  </div>
                  <div className="text-center text-2xl font-bold py-1 mb-2">
                    {item.hatyai}
                  </div>
                  <div className="text-center text-2xl font-bold py-1 mb-2">
                    {item.country}
                  </div>
                  <div className="text-center text-2xl font-bold py-1 mb-2">
                    {item.allOrdersNotQC}
                  </div>
                </div>
              ))}
            </div>}
        </div>
      </div>

      {/* Middle Section with Large Number */}
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 mb-4 ">
        <div className="flex bg-white rounded-lg shadow-lg p-6 flex-col md:flex-row justify-between items-center md:items-stretch">
          <div className="flex flex-col justify-center items-center text-center w-full">
            <div className="text-lg md:text-2xl text-gray-600 font-bold">
              เหลือ QC ทั้งหมด
            </div>
            <div
              id="OrderList"
              className="text-5xl md:text-8xl font-bold text-blue-600 mb-2"
            >
              {data?.AllQC}
            </div>
            <div className="text-lg md:text-2xl text-gray-600 font-bold">รายการ</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 w-full">
            <div className="text-sm md:text-xl text-gray-600 font-bold mb-2">
              อัตราความเร็วของ QC
              <input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="ml-2 px-2 py-1 border rounded"
              />
            </div>
            <div className="flex justify-between">
              <div className="flex flex-col  items-center text-center w-full">
                <span className="text-2xl md:text-5xl font-bold text-purple-600">
                 {(calculateSpeedAtTime(timeInput)) ?? 0}
                </span>
                <span className="text-gray-500 font-semibold text-xs">
                  รายการ / ชั่วโมง
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg md:text-xl text-gray-600 font-bold mb-2">
                ความเร็วเฉลี่ย QC ทั้งหมด
              </div>
              <div className="text-2xl md:text-5xl font-bold text-green-600">
                {data?.averageSpeedQC?.averageSpeed.toFixed(2)}
              </div>
              <div className="text-gray-500 font-semibold">
                รายการ / ชั่วโมง
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg md:text-xl text-gray-600 font-bold mb-2">
                จำนวน QC ทั้งหมด
              </div>
              <div className="text-2xl md:text-5xl font-bold text-purple-600">
                {data?.averageSpeedQC?.totalQC ?? 0}
              </div>
              <div className="text-gray-500 font-semibold">
                รายการ
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex md:flex-row flex-col  justify-center gap-1">
            <p className="text-md md:text-lg text-green-700 font-bold">
              ทุกการเพิ่ม Qc 1 Stations จะช่วยลดเวลาได้ {timeAdd} น.
            </p>
            <p className="text-lg hidden md:block">-</p>
            <p className="text-md md:text-lg text-red-700 font-bold">
              ทุกการ หายไปของ Qc 1 Stations จะเพิ่มเวลาการทำงาน {timeReduced}{" "}
              น.
            </p>
          </div>
          <div className="flex justify-center items-center mt-3">
            <div className="text-2xl font-semibold">
              เสร็จใน{" "}
              <span className="text-blue-600 text-3xl md:text-5xl font-bold">
                {thaiDate}
              </span>{" "}
              <span className="text-blue-600 text-3xl md:text-5xl font-bold">
                {thaiTime}
              </span>{" "}
              น.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <p className="text-lg font-bold mb-2 text-center block md:hidden">อัตราความเร็วพนักงานคลังแต่ละชั้น</p>
        <div className="flex w-full gap-0 mb-4">
          {/* Labels Column */}
          <div className=" bg-gray-100 border-r md:w-1/6 w-1/3">
            <div className="h-16 p-3 border-b text-black font-semibold text-lg flex items-center">
              ชิ้นแรก วันนี้
            </div>
            <div className="h-20 p-3 border-b text-black font-semibold text-lg flex items-center">
              เหลือ ทั้งหมด
            </div>
            <div className="h-12 p-3 text-black font-semibold text-lg flex items-center border-b">
              ล่าสุด วันนี้
            </div>
            <div className="h-16 p-3 text-black font-semibold text-lg flex items-center border-b">
              ความเร็วเฉลี่ย
            </div>
            <div className="h-30 p-3 text-black font-semibold text-lg flex items-center">
              พนักงานจัดออเดอร์
            </div>
          </div>
          <div className="flex md:w-full overflow-x-auto w-60">
            {floorData
              ?.slice()
              .sort((a, b) => a.product_floor.localeCompare(b.product_floor))
              .map((floor) => {
                return (
                  <div key={floor.product_floor} className="text-center w-full">
                    <div
                      className={`${floor.product_floor === '2' ? 'text-yellow-600' : floor.product_floor === '3' ? 'text-blue-600' : floor.product_floor === '4' ? 'text-red-700' : floor.product_floor === '5' ? 'text-green-700' : 'text-gray-600'} h-16 flex flex-col border-gray-300 border-t border-r border-b justify-center`}
                    >
                      <div className="text-lg font-bold">
                        F{floor.product_floor}
                      </div>
                      <div className="text-sm font-bold w-40 md:w-full md:text-center mx-auto">
                        {displayTime(floor.firstPickingTime)}
                      </div>
                    </div>
                    <div
                      className={`text-white h-20 border-b flex items-center justify-center border-r border-gray-300`}
                    >
                      <div className={`${floor.product_floor === '2' ? 'text-yellow-600' : floor.product_floor === '3' ? 'text-blue-600' : floor.product_floor === '4' ? 'text-red-700' : floor.product_floor === '5' ? 'text-green-700' : 'text-gray-600'} text-5xl font-bold`}>
                        {floor.remainingItem}
                      </div>
                    </div>
                    <div
                      className={`
                        ${floor.product_floor === '2' ? 'text-yellow-600' : floor.product_floor === '3' ? 'text-blue-600' : floor.product_floor === '4' ? 'text-red-700' : floor.product_floor === '5' ? 'text-green-700' : 'text-gray-600'}
                        h-12 border-b flex items-center justify-center border-r border-gray-300`}
                    >
                      <div className={`text-sm font-bold`}>
                        {displayTime(floor.lastPickingTime)}
                      </div>
                    </div>
                    {/* <div
                      className={`${getSpeedColorClass(calculateAverageSpeed(floor) * 60)} text-white h-16 flex flex-col justify-center border-r border-gray-300`}
                    >
                      <p className="text-lg font-bold">
                        {(calculateAverageSpeed(floor) * 60).toFixed(2)}
                      </p>
                      <p className="text-xs">รก./ชม.</p>
                    </div> */}
                    {(() => {
                      const floorEmployees = data?.SummaryPickingAndEmployee.filter(
                        (emp) => emp.floor === floor.product_floor
                      ) || [];

                      const avgSpeed = floorEmployees.length > 0
                        ? floorEmployees.reduce((sum, emp) => sum + Number(emp.speed), 0) / floorEmployees.length
                        : 0;

                      return (
                        <div
                          className={`${getSpeedColorClass2(avgSpeed)} text-white h-16 flex flex-col justify-center border-r border-gray-300 border-b`}
                        >
                          <p className="text-lg font-bold">
                            {avgSpeed.toFixed(2)}
                          </p>
                          <p className="text-xs">รก./ชม. (เฉลี่ย {floorEmployees.length} คน)</p>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between items-center text-center border-b border-r border-t border-gray-300 h-30">
                      {(() => {
                        const employees = data?.SummaryPickingAndEmployee.filter((emp) => emp.floor === floor.product_floor) || [];

                        if (employees.length === 0) {
                          return (
                            <div className="text-sm w-full py-8">
                              <p>ไม่มีข้อมูล</p>
                            </div>
                          );
                        }

                        return employees.map((emp) => (
                          <div key={emp.emp_nickname} className={`text-sm w-full text-white p-1 md:p-2 h-30 ${getSpeedColorClass2(Number(emp.speed) || 0)}`}>
                            <div className="flex flex-col items-center w-full">
                              <p className="text-[14px] md:text-lg font-bold">{emp.emp_nickname}</p>
                              <p className="inline-block mr-1 text-xs md:text-sm">
                                <p className="inline-block mr-1 font-bold text-[12px] md:text-base">
                                  {emp.counted}
                                </p>
                                รายการ</p>
                              <p className="inline-block text-xs md:text-sm">
                                <p className="inline-block mr-1 font-bold text-[12px] md:text-base">{(Number(emp.speed) || 0).toFixed(2)}</p> รก./ชม.</p>
                              {(() => {
                                const now = new Date().getTime();
                                const lastTime = new Date(emp.lastPickingTime).getTime();
                                const minutesDiff = (now - lastTime) / (1000 * 60);
                                const isRecent = minutesDiff < 5; // ถ้าห่างกันไม่ถึง 5 นาที ถือว่ายังทำงานอยู่

                                // แปลงเวลาเป็น timezone ไทย
                                const thaiTime = dayjs(emp.lastPickingTime).format("HH:mm:ss");

                                return (
                                  <p className={`${isRecent ? 'text-gray-200' : 'text-red-500 bg-white'} text-xs md:text-sm font-bold`}>
                                    ล่าสุด: {thaiTime}
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-xl font-semibold text-center block md:hidden">ข้อมูลจากพนักงาน Qc</p>
        <div className="md:grid md:grid-cols-5 gap-0 overflow-x-auto flex md:overflow-hidden">
          {groupedQCData(qcStationsData)?.map((station, index) => {
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
                <div className={`text-balck p-3 text-center font-bold text-lg border-b border-gray-300 bg-gray-200 ${station.qc_nickname === station.prepare_nickname && station.qc_nickname === station.packed_nickname ? 'text-red-500' : ''}`}>
                  Q{index + 1} [{station.qc_nickname}]
                </div>
                <div className="bg-gray-100 p-2 flex justify-between items-center text-xs w-80 md:w-full">
                  {!(station.qc_nickname === station.prepare_nickname && station.qc_nickname === station.packed_nickname) ?
                    <>
                      <span className="font-semibold text-base w-full text-center">
                        หัวโต๊ะ: {station.prepare_nickname}
                      </span>
                      <span className="font-semibold text-base w-full text-center">
                        แพ็ค: {station.packed_nickname}
                      </span>
                    </>
                    :
                    <span className="font-semibold text-base w-full text-center text-red-500">
                      ทุกตำแหน่งคือคนเดียวกัน
                    </span>
                  }
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
                    <div className="w-10 text-xs text-gray-600">รก / ลัง</div>
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
                <div className={`${speed >= 300 ? 'bg-blue-500' : speed >= 200 ? 'bg-green-600' : speed >= 150 ? 'bg-yellow-500' : speed >= 0 && 'bg-red-600'} text-white p-3 text-center font-bold text-xs`}>
                  speed <span className="text-xl">{speed}</span> รก./ชม.
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
