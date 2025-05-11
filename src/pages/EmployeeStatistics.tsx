import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Socket, io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { Bounce, ToastContainer, toast } from "react-toastify";
import Clock from "../components/Clock";
import DropdownEmployeeStatistics from "../components/DropdownEmployeeStatistics";

interface Employee {
  name: string;
  nickname: string;
  phone: string;
  floor: string;
}

interface EmployeeStatistic {
  id: number;
  emp_code: string;
  work_date: string;
  shift_start: string;
  shift_end: string;
  total_working_time: number;
  total_orders: number;
  picked_orders: number;
  packed_orders: number;
  completed_orders: number;
  average_speed: number;
  real_time_spent: number;
  created_at: string;
  updated_at: string;
  employee: Employee;
}

const EmployeeStatisticsPage = () => {
  const [statistics, setStatistics] = useState<EmployeeStatistic[]>([]);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [totalShoppingOrders, setTotalShoppingOrders] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [totalStatusPicking, setTotalStatusPicking] = useState(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [selectroute, setSelectroute] = useState("เลือกเส้นทางขนส่ง");
  const { userInfo, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    const storedTotalShoppingOrders = localStorage.getItem(
      "totalShoppingOrders"
    );
    const storedTotalStatusPicking = localStorage.getItem("totalStatusPicking");

    if (storedTotalShoppingOrders !== null) {
      setTotalShoppingOrders(JSON.parse(storedTotalShoppingOrders));
    }
    if (storedTotalStatusPicking !== null) {
      setTotalStatusPicking(JSON.parse(storedTotalStatusPicking));
    }
  }, []);

  useEffect(() => {
    const storedTotalOrdersCount = localStorage.getItem("totalOrdersCount");
    if (storedTotalOrdersCount !== null) {
      setTotalOrdersCount(JSON.parse(storedTotalOrdersCount));
    }
  }, []);

  // สมมติว่า emp_code มาจาก WebSocket หรือ LocalStorage หรือ Context
  const emp_code = userInfo?.emp_code;

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3003/api/employee-statistics/${emp_code}`
        );
        setStatistics(response.data.data);
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatistics();
  }, [emp_code]);

  if (loading) {
    return <div>Loading...</div>;
  }
  const toggleSearch = () => {
    setShowInput((prev) => !prev);
    console.log("showInput " + showInput);
  };

  const togglePopupMenu = () => {
    setOpenMenu((prev) => !prev);
    setShowInput(false); // ปิด Search ด้วย
  };

  const closePopupMenu = () => {
    setOpenMenu(false);
  };
  const routeButtons = [
    { id: 1, name: "เส้นทางการขนส่ง", value: "all" },
    { id: 2, name: "หาดใหญ่", value: "หาดใหญ่" },
    { id: 3, name: "สงขลา", value: "สงขลา" },
    { id: 4, name: "สะเดา", value: "สะเดา" },
    { id: 5, name: "สทิงพระ", value: "สทิงพระ" },
    { id: 6, name: "นครศรีธรรมราช", value: "นครศรีธรรมราช" },
    { id: 7, name: "กระบี่", value: "กระบี่" },
    { id: 8, name: "ภูเก็ต", value: "ภูเก็ต" },
    { id: 9, name: "สุราษฎร์ธานี", value: "สุราษฎร์ธานี" },
    { id: 10, name: "ยาแห้ง ส่งฟรี ทั่วไทย", value: "ยาแห้ง ส่งฟรี ทั่วไทย" },
    { id: 11, name: "พังงา", value: "พังงา" },
    { id: 12, name: "เกาะสมุย", value: "เกาะสมุย" },
    { id: 13, name: "พัทลุง-นคร", value: "พัทลุง-นคร" },
    { id: 14, name: "ปัตตานี", value: "ปัตตานี" },
    { id: 15, name: "ชุมพร", value: "ชุมพร" },
    { id: 16, name: "เกาะลันตา", value: "เกาะลันตา" },
    { id: 17, name: "เกาะพะงัน", value: "เกาะพะงัน" },
    { id: 18, name: "สตูล", value: "สตูล" },
    { id: 19, name: "พัทลุง", value: "พัทลุง" },
    { id: 20, name: "พัทลุง VIP", value: "พัทลุง VIP" },
    { id: 21, name: "นราธิวาส", value: "นราธิวาส" },
    { id: 22, name: "สุไหงโกลก", value: "สุไหงโกลก" },
    { id: 23, name: "ยะลา", value: "ยะลา" },
    { id: 24, name: "เบตง", value: "เบตง" },
    { id: 25, name: "ตรัง", value: "ตรัง" },
    { id: 26, name: "กระบี่-ตรัง", value: "กระบี่-ตรัง" },
    { id: 27, name: "Office รับเอง", value: "Office รับเอง" },
  ];

  const groupedByDate = statistics.reduce((acc, current) => {
    if (!acc[current.work_date]) {
      acc[current.work_date] = [];
    }
    acc[current.work_date].push(current);
    return acc;
  }, {} as { [key: string]: EmployeeStatistic[] });

  return (
    <>
      <header className="bg-blue-400 text-white font-medium p-2">
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
        <div className="flex justify-between items-center">
          <button className="bg-white rounded-lg px-3 py-1 text-black drop-shadow-xs">
            ล้ง
          </button>

          <div className="flex justify-center text-xl mt-2">
            <Clock />
          </div>

          <button
            onClick={toggleSearch}
            className="bg-white rounded-lg p-2 text-black drop-shadow-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* <div className="flex justify-center text-sm mt-2">
        <Clock />
      </div> */}

        <div className="flex flex-col items-center text-xs gap-2 mt-1">
          <p className="text-black">
            ทั้งหมด <span className="text-gray-800">{totalOrdersCount}</span>{" "}
            ร้าน <span className="text-white">{totalShoppingOrders}</span>{" "}
            รายการ
          </p>
          <p className="text-black">
            เหลือจัด{" "}
            <span className="text-red-500">
              {totalShoppingOrders - totalStatusPicking}
            </span>{" "}
            รายการ | กำลังจัด{" "}
            <span className="text-green-500">{totalStatusPicking}</span> รายการ
          </p>
        </div>

        {showInput && (
          <div className="flex justify-center mt-2">
            <input
              type="text"
              placeholder="พิมพ์รหัสลูกค้า"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="p-1 rounded-sm text-black bg-white flex z-10 h-8"
            />
          </div>
        )}
        <div
          id="route-select"
          className="flex justify-center text-white w-full p-2"
        >
          <button
            ref={buttonRef}
            onClick={togglePopupMenu}
            className="rounded-lg px-3 py-2 text-black drop-shadow-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path
                fillRule="evenodd"
                d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {/* Dropdown */}
          <select
            value={selectroute}
            onChange={(e) => setSelectroute(e.target.value)}
            className="border border-gray-200 px-4 py-1 rounded text-black bg-white text-center flex justify-center w-full"
            style={{ marginLeft: "20px", marginRight: "20px" }}
          >
            {routeButtons.map((route) => (
              <option key={route.id} value={route.value}>
                {route.name}
              </option>
            ))}
          </select>
        </div>
        {/* <div>&nbsp;</div> */}
        <div>
          {openMenu && (
            <div
              ref={popupRef}
              className="fixed top-0 left-0 h-full z-50 w-3/5 sm:w-1/2 md:w-1/4 bg-blue-900 transition-transform duration-2000 ease-in-out transform translate-x-0"
            >
              <div id="infomation" className="p-4 relative">
                <button
                  onClick={closePopupMenu}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded"
                >
                  ✖
                </button>
                <div className="py-5">
                  <div className="bg-gray-100 p-1 rounded-full w-18 h-18 mx-auto">
                    <img
                      className="rounded-full w-16 h-16 bg-white mx-auto"
                      src="https://as2.ftcdn.net/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg"
                    />
                  </div>
                  <p className="flex justify-center mt-2 text-white">
                    {userInfo?.emp_code}
                  </p>
                  <p className="flex justify-center text-white">
                    {userInfo?.username}
                  </p>
                  <p className="flex justify-center text-white">
                    {userInfo?.floor_picking || "-"}
                  </p>
                </div>
                <div className="flex justify-center px-3 text-white">
                  <button
                    onClick={logout}
                    className="w-full mx-auto flex py-2 active:bg-red-600 scale-95 transition cursor-pointer text-center items-center font-light rounded-sm"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      <div className="p-4">
        {Object.keys(groupedByDate).map((date) => (
          <DropdownEmployeeStatistics
            key={date}
            title={date}
            data={groupedByDate[date]}
          />
        ))}
      </div>
    </>
  );
};

export default EmployeeStatisticsPage;
