import React from "react";
import Navbar from "../components/Navbar";

interface QCStation {
  stationId: string;
  employeeCode: string;
  employeeName: string;
  completedItems: number;
  completedBoxes: number;
  firstOrderTime: string | null;
  lastOrderTime: string | null;
}

interface floorData {
  floor: string;
  color: object;
  firstOrderToday: string | null;
  remainingItems: number;
  lastOrderToday: string | null;
  completedItems: number | null;
}

const Dashboard: React.FC = () => {

  const totalsOfQc = 975;
  const addQc = 10;
  const reduceQc = 10;

  const floorData: floorData[] = [
    {
      floor: 'F1',
      color: { primary: 'bg-cyan-400', secondary: 'bg-cyan-300', border: 'border-cyan-500' },
      firstOrderToday: '08:17', // เวลาเริ่มจัดชิ้นแรกวันนี้ (null ถ้ายังไม่เริ่ม)
      remainingItems: 0, // รายการสินค้าที่เหลือจัดทั้งหมด
      lastOrderToday: '14:15', // เวลาจัดชิ้นล่าสุดวันนี้ (null ถ้ายังไม่เริ่ม)
      completedItems: 245 // จำนวนสินค้าที่จัดไปแล้วของแต่ละชั้น
    },
    {
      floor: 'F2',
      color: { primary: 'bg-orange-400', secondary: 'bg-orange-300', border: 'border-orange-500' },
      firstOrderToday: '06:50',
      remainingItems: 0,
      lastOrderToday: '15:07',
      completedItems: 892
    },
    {
      floor: 'F3',
      color: { primary: 'bg-blue-600', secondary: 'bg-blue-500', border: 'border-blue-700' },
      firstOrderToday: '00:27',
      remainingItems: 0,
      lastOrderToday: '15:07',
      completedItems: 563
    },
    {
      floor: 'F4',
      color: { primary: 'bg-red-500', secondary: 'bg-red-400', border: 'border-red-600' },
      firstOrderToday: '00:26',
      remainingItems: 0,
      lastOrderToday: '15:08',
      completedItems: 734
    },
    {
      floor: 'F5',
      color: { primary: 'bg-green-500', secondary: 'bg-green-400', border: 'border-green-600' },
      firstOrderToday: null, // ยังไม่เริ่มจัดออเดอร์วันนี้
      remainingItems: 0,
      lastOrderToday: null,
      completedItems: 0
    }
  ];

  // ข้อมูล QC Stations (ข้อมูลจำลอง - ในการใช้งานจริงควรดึงจาก API)
  const qcStationsData: QCStation[] = [
    {
      stationId: 'Q1',
      employeeCode: 'EMP001',
      employeeName: 'ทราย',
      completedItems: 1062,
      completedBoxes: 168,
      firstOrderTime: '06:54',
      lastOrderTime: '15:08'
    },
    {
      stationId: 'Q2',
      employeeCode: 'EMP002',
      employeeName: 'ทราย',
      completedItems: 985,
      completedBoxes: 152,
      firstOrderTime: '07:15',
      lastOrderTime: '14:45'
    },
    {
      stationId: 'Q3',
      employeeCode: 'EMP003',
      employeeName: 'ทราย',
      completedItems: 1124,
      completedBoxes: 198,
      firstOrderTime: '06:30',
      lastOrderTime: '15:20'
    },
    {
      stationId: 'Q4',
      employeeCode: 'EMP004',
      employeeName: 'สมชาย',
      completedItems: 1089,
      completedBoxes: 187,
      firstOrderTime: '06:45',
      lastOrderTime: '15:30'
    },
    {
      stationId: 'Q5',
      employeeCode: 'EMP005',
      employeeName: 'สมหญิง',
      completedItems: 876,
      completedBoxes: 145,
      firstOrderTime: '07:00',
      lastOrderTime: '14:30'
    },
  ];

    // ฟังก์ชันคำนวณเวลาทำงาน (ชั่วโมง)
    const calculateWorkingHours = (firstTime: string | null, lastTime: string | null): number => {
      if (!firstTime || !lastTime) return 0;
  
      const [firstHour, firstMin] = firstTime.split(':').map(Number);
      const [lastHour, lastMin] = lastTime.split(':').map(Number);
      
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
  const calculateSpeed = (completedItems: number, workingHours: number): number => {
    if (workingHours === 0) return 0;
    return Math.round(completedItems / workingHours);
  };

  // ฟังก์ชันคำนวณรายการต่อลัง
  const calculateItemsPerBox = (completedItems: number, completedBoxes: number): number => {
    if (completedBoxes === 0) return 0;
    return Math.round(completedItems / completedBoxes);
  };

  const getStationSpeed = (station: QCStation): number => {
    const workingHours = calculateWorkingHours(station.firstOrderTime, station.lastOrderTime);
    return calculateSpeed(station.completedItems, workingHours);
  };

  // ฟังก์ชันคำนวณความเร็วเฉลี่ย
  const calculateAverageSpeed = (floor: any): number  => {
    // ถ้ายังไม่เริ่มจัดออเดอร์วันนี้
    if (!floor.firstOrderToday || !floor.lastOrderToday || floor.completedItems === 0) {
      return 0;
    }

    // แปลงเวลาเป็นนาที
    const [firstHour, firstMin] = floor.firstOrderToday.split(':').map(Number);
    const [lastHour, lastMin] = floor.lastOrderToday.split(':').map(Number);
    
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
    const averageSpeed = floor.completedItems / timeDifferenceInMinutes;
    
    return averageSpeed;
  };

  // ฟังก์ชันแสดงเวลา (ถ้า null แสดง **:**)
  const displayTime = (time: Date) => {
    return time ? `${time} น.` : '__:__ น.';
  };

  const quartarlyData = [
    { quarter: 'Q1', speed: 129},
    { quarter: 'Q2', speed: 110},
    { quarter: 'Q3', speed: 118},
    { quarter: 'Q4', speed: 143},
    { quarter: 'Q5', speed: 124},
    // { quarter: 'Q6', speed: 100},
  ];

  const calculateCompletionTime = () => {
    // 1. เอาเวลาทั้งหมดมา
    const speedValues = quartarlyData.map(q => q.speed);
    const sumSpeed = speedValues.reduce((sum, speed) => sum + speed, 0); // บวกเวลา
    console.log("ผลบวกเวลา: ", sumSpeed);

    // เวลาเดิม (เวลาที่ต้องใช้ในการทำงาน)
    const timeBeforeChange = totalsOfQc / sumSpeed;

    // === การเพิ่ม QC ===
    // เวลาที่ต้องใช้หลังเพิ่ม Qc = (จำนวน Qc ทั้งหมด * เวลาที่ต้องใช้ในการทำงาน) / (จำนวน Qc ทั้งหมด+1)
    const formulasAfterAddQc = (totalsOfQc * sumSpeed) / (totalsOfQc + addQc);
    const timeAfterAddQc = totalsOfQc / formulasAfterAddQc;
    
    // เวลาที่ลด (นาที) = เวลาที่ต้องใช้ในการทำงาน - เวลาที่ต้องใช้หลังเพิ่ม Qc
    const timeReduced = timeBeforeChange - timeAfterAddQc;
    const minutesReduced = Math.abs(Math.round(timeReduced * 60));

    // === การลด QC ===
    // เวลาที่ต้องใช้หลังลด Qc = (จำนวน Qc ทั้งหมด * เวลาที่ต้องใช้ในการทำงาน) / (จำนวน Qc ทั้งหมด - 1)
    const formulasAfterReduceQc = (totalsOfQc * sumSpeed) / (totalsOfQc - reduceQc);
    const timeAfterReduceQc = totalsOfQc / formulasAfterReduceQc;
    
    // เวลาที่เพิ่ม (นาที) = เวลาที่ต้องใช้หลังลด Qc - เวลาที่ต้องใช้ในการทำงาน
    const timeIncreased = timeAfterReduceQc - timeBeforeChange;
    const minutesIncreased = Math.abs(Math.round(timeIncreased * 60));

    console.log("=== Debug Info ===");
    console.log("เวลาเดิม:", timeBeforeChange.toFixed(4), "ชั่วโมง");
    console.log("เวลาหลังเพิ่ม", addQc, "QC:", timeAfterAddQc.toFixed(4), "ชั่วโมง");
    console.log("เวลาที่ลด:", timeReduced.toFixed(4), "ชั่วโมง =", minutesReduced, "นาที");
    console.log("เวลาหลังลด", reduceQc, "QC:", timeAfterReduceQc.toFixed(4), "ชั่วโมง");
    console.log("เวลาที่เพิ่ม:", timeIncreased.toFixed(4), "ชั่วโมง =", minutesIncreased, "นาที");

    // คำนวน ชม. เป็น เวลาปัจจุบัน
    const currentTime = new Date();
    const completionTime = new Date(currentTime.getTime() + (timeAfterAddQc * 60 * 60 * 1000));

    return {
      minutesReduced: minutesReduced, 
      minutesIncreased: minutesIncreased,
      timeBeforeChange: timeBeforeChange.toFixed(4),
      timeAfterAddQc: timeAfterAddQc.toFixed(4),
      timeAfterReduceQc: timeAfterReduceQc.toFixed(4)
    };
  };
  const { minutesReduced, minutesIncreased, timeBeforeChange, timeAfterAddQc, timeAfterReduceQc } = calculateCompletionTime();

  const calculateActualCompletionTime = () => {
    const speedValues = quartarlyData.map(q => q.speed);
    const sumSpeed = speedValues.reduce((sum, speed) => sum + speed, 0);

    const minutesNeeded = Math.ceil((totalsOfQc * 60) / sumSpeed)

    const currentTime = new Date();
    const completionTime = new Date(currentTime.getTime() + (minutesNeeded * 60 * 1000));

    // จัด format DD/MM/YY ไทย
    const thaiYear = (completionTime.getFullYear() + 543).toString().slice(-2);
    const thaiDate = `${completionTime.getDate().toString().padStart(2, '0')}/${(completionTime.getMonth() + 1).toString().padStart(2, '0')}/${thaiYear}`;
    const thaiTime = `${completionTime.getHours().toString().padStart(2, '0')}:${completionTime.getMinutes().toString().padStart(2, '0')}`;
    console.log("=== การคำนวณเวลาเสร็จ ===");
    console.log("ผลรวมความเร็ว:", sumSpeed, "ต่อชั่วโมง");
    console.log("เวลาที่ต้องใช้:", minutesNeeded, "นาที");
    console.log("เวลาปัจจุบัน:", currentTime.toLocaleString('th-TH'));
    console.log("เสร็จใน:", thaiDate, thaiTime, "น.");
    return {
      thaiDate,
      thaiTime,
      minutesNeeded,
      sumSpeed,
      currentTime: currentTime.toLocaleString('th-TH'),
      completionTime: completionTime.toLocaleString('th-TH')
    };
  }
  const { thaiDate, thaiTime, minutesNeeded, sumSpeed, currentTime, completionTime } = calculateActualCompletionTime();


  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      {/* Header Section with Dates and Metrics */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <div className="grid grid-cols-4 gap-6">
          {/* Column Headers */}
          <div className="font-semibold text-gray-700"></div>
          <div className="text-center text-2xl">
            <div className=" text-red-500 px-3 py-1 rounded font-bold">
              22 / 05 / 68
            </div>
          </div>
          <div className="text-center text-2xl">
            <div className=" text-yellow-500 px-3 py-1 rounded font-bold">
              23 / 05 / 68
            </div>
          </div>
          <div className="text-center text-2xl">
            <div className=" text-green-600 px-3 py-1 rounded font-bold">
              24 / 05 / 68
            </div>
          </div>


          {/* SO_IN Row */}
          <div className="font-semibold text-gray-700 text-3xl text-center">
            SO <span className="text-sm">IN</span>
          </div>
          <div className="text-center text-2xl font-bold">6,447</div>
          <div className="text-center text-2xl font-bold">8,229</div>
          <div className="text-center text-2xl font-bold">2,117</div>

          {/* ทั่วดิน Row */}
          <div className="font-semibold text-red-600 text-4xl text-center">
            ทั่วถิ่น
          </div>
          <div className="text-center text-2xl font-bold">0</div>
          <div className="text-center text-2xl font-bold">121</div>
          <div className="text-center text-2xl font-bold">230</div>

          {/* หาดใหญ่ Row */}
          <div className="font-semibold text-blue-500 text-4xl text-center">
            หาดใหญ่
          </div>
          <div className="text-center text-2xl font-bold">0</div>
          <div className="text-center text-2xl font-bold">28</div>
          <div className="text-center text-2xl font-bold">46</div>

          {/* ทั่วไทย Row */}
          <div className="font-semibold text-orange-500 text-4xl text-center">
            ทั่วไทย
          </div>
          <div className="text-center text-2xl font-bold">4</div>
          <div className="text-center text-2xl font-bold">331</div>
          <div className="text-center text-2xl font-bold">215</div>

          {/* รวม Row */}
          <div className="font-semibold text-green-600 text-4xl text-center">
            รวม
          </div>
          <div className="text-center text-2xl font-bold">4</div>
          <div className="text-center text-2xl font-bold">480</div>
          <div className="text-center text-2xl font-bold">491</div>
        </div>
      </div>

      {/* Middle Section with Large Number */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-center gap-20 items-center text-center">
            <div className="text-sm text-gray-600 font-bold">
              เหลือ QC ทั้งหมด
            </div>
            <div className="text-8xl font-bold text-purple-600 mb-2">{totalsOfQc}</div>
            <div className="text-sm text-gray-600 font-bold">รายการ</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-center items-center h-full min-h-[100px]">
            <div className="text-lg font-semibold">
              เสร็จใน <span className="text-purple-600 text-2xl">{thaiDate}</span>{" "}
              <span className="text-purple-600 text-4xl">{thaiTime}</span> น.
            </div>
          </div>
          <div className="h-px w-full bg-gray-300 mx-4"></div>
          <div className="flex justify-center gap-2">
            <p className="text-[12px] text-green-500">
              ทุกการเพิ่ม Qc 1 Stations จะช่วยลดเวลาได้ {minutesReduced} น.
            </p>
            <p className="text-[12px]">ในทางกลับกัน</p>
            <p className="text-[12px] text-red-500">
              ทุกการ หายไปของ Qc 1 Stations จะเพิ่มเวลาการทำงาน {minutesIncreased} น.
            </p>
          </div>
          {/* <p className="text-[10px] text-center">ทุกการเพิ่ม Qc 1 Stations จะช่วยลดเวลาได้ 9 น. ในทางกลับกัน ทุกการ หายไปของ Qc 1 Stations จะเพิ่มเวลาการทำงาน 10 น.</p> */}
        </div>
      </div>

      {/* Weekly Analysis Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <div className="grid grid-cols-6 gap-0 mb-4">
          {/* Labels Column */}
          <div className="text-left bg-gray-100 border-r">
            <div className="h-16 p-3 border-b text-black font-semibold text-sm flex items-center">
              ชิ้นแรก วันนี้
            </div>
            <div className="h-20 p-3 border-b text-black font-semibold text-sm flex items-center">
              เหลือ ทั้งหมด
            </div>
            <div className="h-12 p-3 border-b text-black font-semibold text-sm flex items-center">
              ล่าสุด วันนี้
            </div>
            <div className="h-16 p-3 text-black font-semibold text-sm flex items-center">
              ความเร็วเฉลี่ย
            </div>
          </div>
          {floorData.map((floor, index) => (
            <div key={floor.floor} className="text-center">
            <div className={`${floor.color.primary} text-white h-16 border-b ${floor.color.border} flex flex-col justify-center`}>
              <div className="text-sm font-bold">{floor.floor}</div>
              <div className="text-xs">{displayTime(floor.firstOrderToday)}</div>
            </div>
            <div className={`${floor.color.primary} text-white h-20 border-b ${floor.color.border} flex items-center justify-center`}>
              <div className="text-4xl font-bold">{floor.remainingItems}</div>
            </div>
            <div className={`${floor.color.secondary} text-white h-12 border-b ${floor.color.border.replace('border-', 'border-').replace('500', '400')} flex items-center justify-center`}>
              <div className="text-xs">{displayTime(floor.lastOrderToday)}</div>
            </div>
            <div className={`${floor.color.secondary} text-white h-16 flex flex-col justify-center`}>
              <div className="text-sm font-bold">{calculateAverageSpeed(floor).toFixed(2)}</div>
              <div className="text-xs">รก./นาที</div>
            </div>
          </div>
          ))}
        </div>
      </div>

      {/* Quarterly Analysis Section - Updated with Dynamic Data */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-5 gap-0">
          {qcStationsData.map((station) => {
            const workingHours = calculateWorkingHours(station.firstOrderTime, station.lastOrderTime);
            const itemsPerBox = calculateItemsPerBox(station.completedItems, station.completedBoxes);
            const speed = getStationSpeed(station);
            
            return (
              <div key={station.stationId} className="border border-gray-300">
                <div className="bg-orange-600 text-white p-3 text-center font-bold text-lg">
                  {station.stationId}
                </div>
                <div className="bg-gray-100 p-2 flex justify-center items-center text-xs">
                  <span className="font-semibold">{station.employeeName} หัวโต๊ะ + {station.employeeName} คิว + {station.employeeName} แพ็ค</span>
                </div>
                <div className="bg-white flex">
                  <div className="flex-1 p-4 text-center border-r border-gray-300">
                    <div className="text-3xl font-bold">{station.completedItems}</div>
                    <div className="text-xs text-gray-600">รก.</div>
                  </div>
                  <div className="flex-1 p-4 text-center border-r border-gray-300">
                    <div className="text-3xl font-bold">{itemsPerBox}</div>
                    <div className="text-xs text-gray-600">รก / ลัง</div>
                  </div>
                  <div className="flex-1 p-4 text-center">
                    <div className="text-3xl font-bold">{station.completedBoxes}</div>
                    <div className="text-xs text-gray-600">ลัง</div>
                  </div>
                </div>
                <div className="bg-white p-2 text-center text-xs text-gray-500 border-t border-gray-300">
                  {station.firstOrderTime ? `${station.firstOrderTime} น.` : '__:__'} ชิ้นแรก &lt;== | {workingHours.toFixed(2)} | ==&gt; ล่าสุด {station.lastOrderTime ? `${station.lastOrderTime} น.` : '__:__'}
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
