import { useState } from "react";
import { EmployeeStatistic } from "../types";

interface DropdownProps {
  title: string;
  data: EmployeeStatistic[];
}

const DropdownEmployeeStatistics = ({ title, data }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="border border-gray-300 rounded-lg mb-4">
      <div
        className="p-2 bg-gray-100 cursor-pointer flex justify-between items-center"
        onClick={toggleDropdown}
      >
        <span>{title}</span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && data.length > 0 && (
        <div className="p-4 bg-white">
          {/* Header Information */}
          <div className="grid grid-cols-5 text-sm mb-2">
            <p>เริ่มงาน: {new Date(data[0]?.shift_start).toLocaleString()}</p>
            <p>สิ้นสุด: {new Date(data[0]?.shift_end).toLocaleString()}</p>
            <p className="col-span-1 text-center font-bold">เวลา</p>
            <p>ชิ้นแรก: {data[0]?.first_floor || "N/A"}</p>
            <p>ชิ้นล่าสุด: {data[0]?.last_floor || "N/A"}</p>
          </div>

          {/* เวลาในการทำงาน */}
          <div className="grid grid-cols-5 text-sm mb-2">
            <p className="col-span-3 text-right font-semibold">
              ชิ้นแรก - ชิ้นล่าสุด = เวลาทำงาน
            </p>
            <p className="col-span-2">{data[0]?.total_working_time} นาที</p>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-5 text-center font-bold mb-2 bg-blue-200 p-2 rounded">
            <p>ชั้น</p>
            <p>ทั้งหมด</p>
            <p>เหลือจัด</p>
            <p>กำลังจัด</p>
            <p>จัดแล้ว</p>
          </div>

          {/* Table Content */}
          {data.map((stat, index) => {
            // คำนวณของที่เหลือจัด
            const remainingOrders =
              stat.total_orders - (stat.packed_orders + stat.completed_orders);

            return (
              <div
                key={index}
                className={`grid grid-cols-5 text-center ${
                  index % 2 === 0 ? "bg-gray-100" : "bg-white"
                }`}
              >
                <p>{stat.employee?.floor || "N/A"}</p>
                <p>{stat.total_orders}</p>
                <p>{remainingOrders}</p>
                <p>{stat.packed_orders}</p>
                <p>{stat.picked_orders}</p>
              </div>
            );
          })}

          {/* Summary Row */}
          <div className="grid grid-cols-5 text-center font-bold mt-2 bg-gray-100 p-2 rounded">
            <p className="text-orange-600">ชั้น {data.length} ชั้น</p>
            <p className="text-purple-500">
              {data.reduce((sum, stat) => sum + stat.total_orders, 0)}
            </p>
            <p className="text-red-500">
              {data.reduce(
                (sum, stat) =>
                  sum +
                  (stat.total_orders -
                    (stat.packed_orders + stat.completed_orders)),
                0
              )}
            </p>
            <p className="text-blue-500">
              {data.reduce((sum, stat) => sum + stat.packed_orders, 0)}
            </p>
            <p className="text-green-500">
              {data.reduce((sum, stat) => sum + stat.picked_orders, 0)}
            </p>
          </div>

          {/* Summary Information */}
          <div className="mt-4 text-sm">
            <div className="flex justify-between mb-1">
              <p>ความเร็ว:</p>
              <p>{data[0]?.average_speed} ชิ้น/นาที</p>
            </div>
            <div className="flex justify-between mb-1">
              <p>เหลือ + กำลังจัด:</p>
              <p>{data[0]?.total_orders - data[0]?.picked_orders} รายการ</p>
            </div>
            <div className="flex justify-between mb-1 text-red-500">
              <p>เวลาแล้วเสร็จ:</p>
              <p>{new Date(data[0]?.shift_end).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownEmployeeStatistics;
