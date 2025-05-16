import { useState, useEffect, useRef } from "react";
import Clock from "../components/Clock";
import { useAuth } from "../context/AuthContext";
import { DataStrategyMatch, useNavigate } from "react-router";
import { Socket, io } from "socket.io-client";
import axios from "axios";
import ProductList from "./ProductList";

interface Product {
  product_floor: string;
}

interface ShoppingOrder {
  picking_status: string;
  product: Product;
  so_procode: string;
  so_running: string;
}

interface ShoppingHead {
  sh_id: number;
  sh_running: string;
  sh_datetime: string;
  shoppingOrders: ShoppingOrder[];
}

interface Emp {
  emp_nickname: string;
}

interface orderList {
  all_sh_running: string[];
  emp: Emp;
  emp_code: string;
  emp_code_picking: string;
  emp_picking: Emp;
  mem_code: string;
  mem_id: number;
  mem_name: string;
  picking_status: string;
  province: string;
  shoppingHeads: ShoppingHead[];
}

interface EmployeeReport {
  emp_code: string;
  emp_floor: string;
  emp_name: string;
  emp_nickname: string;
  emp_tel: string;
  emp_workingPeriod_endTime: string;
  emp_workingPeriod_startTime: string;
  shoppingOrder: ShoppingOrder[];
  dateStart: string;
  dateEnd: string;
  productPerMinute: number;
  countPicking: number;
  floor1: number;
  floor2: number;
  floor3: number;
  floor4: number;
  floor5: number;
}
interface ShoppingOrder {
  so_running: string;
  so_picking_time: string;
  product: Product;
};

interface Product {
  product_floor: string;
}

const Report = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [orderList, setOrderList] = useState<orderList[]>([]);
  const { userInfo, logout } = useAuth();
  const [totalProduct, setTotalShoppingOrders] = useState(0);
  const [latestTimes, setLatestTimes] = useState<Record<string, Date>>({});
  const [totalPicking, setTotalPicking] = useState(0);
  const token = sessionStorage.getItem("access_token");
  const [report, setReport] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log(`${import.meta.env.VITE_API_URL_ORDER}/socket/listorder`);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/listorder`,
      {
        extraHeaders: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      }
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("listorder:get");
    });

    newSocket.on("listorder:get", (data) => {
      console.log("Data " + data);
      setOrderList(data);
      setLoading(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      setOrderList([]);
      setLoading(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL_ORDER
          }/api/report`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setReport(response.data);
        const reportData = response.data;
        console.log(reportData);
      } catch (error) {

      }
    };
    fetchData();

  }, [])
  // JSON.stringify(report)
  // console.log("ReportData", JSON.stringify(report))

  useEffect(() => {
    const totalShoppingOrders = orderList.reduce(
      (total, order) =>
        total +
        order.shoppingHeads.reduce(
          (headTotal, head) => headTotal + head.shoppingOrders.length,
          0
        ),
      0
    );
    setTotalShoppingOrders(totalShoppingOrders);

    const totalStatusPicking = orderList.reduce(
      (total, order) =>
        total +
        order.shoppingHeads.reduce(
          (headTotal, head) =>
            headTotal +
            head.shoppingOrders.filter((so) => so.picking_status !== "pending")
              .length,
          0
        ),
      0
    );
    setTotalPicking(totalStatusPicking);

    const latestByFloor: Record<string, Date> = {};

    orderList.forEach((order) => {
      order.shoppingHeads.forEach((sh) => {
        const shTime = new Date(sh.sh_datetime);

        sh.shoppingOrders.forEach((so) => {
          const floor = so.product.product_floor;
          if (!latestByFloor[floor] || shTime > latestByFloor[floor]) {
            latestByFloor[floor] = shTime;
          }
        });
      });
    });
    setLatestTimes(latestByFloor);

    // console.log("order List " + orderList);
  }, [orderList]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu]);

  const Btnlogout = () => {
    logout()
  };

  const formatDate = (dateString: string) => {
    const Day = new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "2-digit",
      year: "2-digit",
    });
    return Day;
  };

  const formatTime = (dateString: string) => {
    const Time = new Date(dateString).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return Time;
  };

  const filterDate = report.filter(report => report.dateEnd);
  const sortDate = filterDate.sort((a, b) =>
    new Date(a.dateEnd).getTime() -
    new Date(b.dateStart).getTime()
  )
  const filterData = sortDate.sort((a, b) => b.countPicking - a.countPicking);

  const floor = [
    { label: "ชั้น 2", value: "2" },
    { label: "ชั้น 3", value: "3" },
    { label: "ชั้น 4", value: "4" },
    { label: "ชั้น 5", value: "5" },
  ]


  return (
    <div className="flex flex-col h-screen">
      <div className="">
        <header className="p-2 bg-blue-400 text-white font-medium">
          <div className="flex justify-between">
            <div>
              <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs">
                ลัง
              </button>
            </div>
            <div>
              <div className="flex justify-center text-sm font-bold">
                <Clock ></Clock>
              </div>
              <div className="flex justify-center text-xs">
                <p>
                  ทั้งหมด {orderList.length} ร้าน {totalProduct} รายการ
                </p>
              </div>
              <div className="flex justify-center text-xs">
                <p>เหลือจัด {totalProduct - totalPicking} รายการ</p>
                &nbsp;<p>|</p>&nbsp;
                <p>กำลังจัด {totalPicking} รายการ</p>
              </div>
            </div>
            <div>
              <div className="flex ">
                <button
                  onClick={() => navigate("/order-list")}
                  className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex mt-1 ">
            <div className="flex">
              <div className="flex justify-start">
                <button
                  ref={buttonRef}
                  onClick={() => setOpenMenu((prev) => !prev)}
                  className="px-3 py-1"
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
              </div>
            </div>
            <div
              id="route-select"
              className="flex justify-center text-white w-full"
            >
            </div>
            <div>&nbsp;</div>
          </div>
        </header>
      </div>
      <div className="overflow-y-auto h-full p- bg-gray-300">
        {openMenu && (
          <div ref={popupRef} className="fixed top-0 left-0 h-full z-50 w-3/5 sm:w-1/2 md:w-1/4 bg-blue-900 transition-transform duration-2000 ease-in-out transform translate-x-0">
            <div id="infomation" className="p-4">
              <div className="py-5">
                <div className="bg-gray-100 p-1 rounded-full w-18 h-18 mx-auto">
                  <img className="rounded-full w-16 h-16 bg-white mx-auto"
                    src="https://as2.ftcdn.net/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg" />
                </div>
                <p className="flex justify-center mt-2 text-white">{userInfo?.emp_code}</p>
                <p className="flex justify-center text-white">{userInfo?.username}</p>
                <p className="flex justify-center text-white">คุณเป็นพนักงานประจำชั้น</p>
                <p className="flex justify-center text-white">{userInfo?.floor_picking || "-"}</p>
              </div>
              <div className="flex justify-center px-3 text-white">
                <button onClick={() => navigate("/order-list")} className="w-full mx-auto flex py-2 active:bg-red-600 scale-95 transition cursor-pointer text-center items-center font-light rounded-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9 rounded-full mr-1 ml-1 p-1 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  รายการคำสั่งซื้อ
                </button>
              </div>
              <div className="flex justify-center px-3 text-white">
                <button onClick={() => navigate("/report")} className="w-full mx-auto flex py-2 active:bg-red-600 scale-95 transition cursor-pointer text-center items-center font-light rounded-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9 rounded-full mr-1 ml-1 p-1 text-white">
                    <path strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
                    />
                  </svg>
                  สถิติพนักงาน
                </button>
              </div>
              <div className="flex justify-center px-3 text-white">
                <button onClick={Btnlogout} className="w-full mx-auto flex py-2 hover:bg-red-600 cursor-pointer text-center items-center font-light rounded-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor"
                    className="size-9 rounded-full mr-1 ml-1 p-1 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                  </svg>
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        )}
        {/* {report[0]?.productPerMinutes}
        {report[1]?.productPerMinutes}
        {report[2]?.productPerMinutes} */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            {filterData
              .map((emp, index) => (
                <div key={index} className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <div className="bg-blue-900 text-white p-2 flex rounded-t-3xl">
                      <div className="bg-white p-1 rounded-full flex justify-center">
                        <img className="rounded-full w-20"
                          src="https://as2.ftcdn.net/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg" />
                      </div>
                      <div className="w-6/8 ml-5">
                        <div>
                          <p className="flex justify-start font-bold">{emp?.emp_name}</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs  pt-2">
                            <div className="flex justify-start">
                              <p>{emp?.emp_code}</p>&nbsp;
                              <p>{emp?.emp_nickname}</p>
                            </div>
                            <div className="flex justify-end">
                              <p className="">{emp.emp_workingPeriod_startTime} - {emp.emp_workingPeriod_endTime}</p>&nbsp;
                            </div>
                          </div>
                          <div className="flex justify-between text-xs pt-2">
                            <div>
                              <p className="py-1">{emp?.emp_tel}</p>&nbsp;
                            </div>
                            <div className="">
                              <p className="px-2 py-1 rounded-sm bg-gray-500">ชั้น {emp?.emp_floor}</p>&nbsp;
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 bg-white text-xs">
                      <div className="flex justify-between w-full pt-1">
                        <div className="flex justify-start">
                          <p>รายการจัดทั้งหมด</p>
                        </div>
                        <div className="flex justify-end">
                          <p>{emp?.countPicking}</p>&nbsp;
                          <p>รายการ</p>
                        </div>
                      </div>
                      <div className="flex justify-between w-full pt-2">
                        <div className="flex justify-start">
                          <p>ชิ้นแรก</p>
                        </div>
                        <div className="flex justify-end">
                          <p>{formatDate(emp.dateStart)}</p>&nbsp;
                          <p>{formatTime(emp.dateStart)}</p>&nbsp;
                          <p>น.</p>
                        </div>
                      </div>
                      <div className="flex justify-between w-full pt-2">
                        <div className="flex justify-start">
                          <p>ชิ้นล่าสุด</p>
                        </div>
                        <div className="flex justify-end">
                          <p>{formatDate(emp.dateEnd)}</p>&nbsp;
                          <p>{formatTime(emp.dateEnd)}</p>&nbsp;
                          <p>น.</p>
                        </div>
                      </div>
                      <div className="flex justify-between w-full py-2 ">
                        <div className="flex justify-start">
                          <p>ความเร็ว</p>
                          <div className="flex">
                            <p> (ชิ้น /</p>&nbsp;
                            <p className="text-blue-500">นาที</p>
                            <p>)</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <p>{(emp?.productPerMinute)?.toFixed(2)}</p>&nbsp;
                          <div className="flex">
                            <p>ชิ้น /</p>&nbsp;
                            <p className="text-blue-500">นาที</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex text-white justify-around w-full shadow-2xl pb-2 rounded-b-3xl bg-white px-2">
                      {floor.map((floor, floorIdx) => (
                        <div key={floorIdx} className={`px-5 py-1 rounded-xl mb-1 mt-1 text-sm font-bold ${floor.value === "2" ? "bg-yellow-500" : floor.value === "3" ? "bg-indigo-500" : floor.value === "4" ? "bg-red-500" : floor.value === "5" ? "bg-emerald-500" : "bg-white"}`}>
                          <div className="flex justify-center pb-3">
                            {floor.label}
                          </div>
                          <div className="flex justify-between w-full">
                            <p>เหลือ</p>&nbsp;
                            <p>{floor.value === "2" ? emp?.floor2 : floor.value === "3" ? emp?.floor3 : floor.value === "4" ? emp?.floor4 : floor.value === "5" ? emp?.floor5 : "0"}</p>&nbsp;
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Report;
