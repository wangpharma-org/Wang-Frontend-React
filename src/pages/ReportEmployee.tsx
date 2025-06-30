import { useState, useEffect, useRef } from "react";
import Clock from "../components/Clock";
import { useNavigate } from "react-router";
import { Socket, io } from "socket.io-client";
import axios from "axios";
// import ProductList from "./ProductList";
import ButtonMenu from "../components/buttonMenu";

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
  const [, setSocket] = useState<Socket | null>(null);
  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [orderList, setOrderList] = useState<orderList[]>([]);
  const [totalProduct, setTotalShoppingOrders] = useState(0);
  // const [latestTimes, setLatestTimes] = useState<Record<string, Date>>({});
  const [totalPicking, setTotalPicking] = useState(0);
  const token = sessionStorage.getItem("access_token");
  const [report, setReport] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterData, setFilterData] = useState<EmployeeReport[]>([]);


  const togglePopupMenu = () => {
    setOpenMenu((prev) => !prev);
    console.log("Click menu");
  };

  useEffect(() => {
    fetchData();
    console.log(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/picking/listorder`
    );
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/picking/listorder`,
      {
        path: "/socket/picking",
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
      // console.log("Data " + JSON.stringify(data));
      setOrderList(data.memberOrderWithAllShRunning);
      // setLatestTimes(data.lastestDate);
      // console.log('time', data.lastestDate);
      setLoading(false);
    });

    newSocket.on("connect_error", (error) => {
      console.log(error);
      console.error("❌ Failed to connect to server:", error.message);
      setOrderList([]);
      setLoading(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);


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
      console.log(error)
    }
  };

  console.log("ReportData", report)


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

    // console.log("order List " + orderList);
  }, [orderList]);

  useEffect(() => {
    if (!Array.isArray(report)) {
      setFilterData([]); // หรือไม่ต้องทำอะไร
      return;
    }

    const filterDate = report.filter(report => report.dateEnd);
    const sortDate = filterDate.sort((a, b) =>
      new Date(a.dateEnd).getTime() -
      new Date(b.dateStart).getTime()
    )
    const PrefilterData = sortDate.sort((a, b) => b.countPicking - a.countPicking);
    setFilterData(PrefilterData)
  }, [report])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        console.log("ClickOutside1",),
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
  }, []);

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



  const floor = [
    { label: "ชั้น 1", value: "1" },
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
              <div className="flex justify-center font-bold">
                <Clock ></Clock>
              </div>
              <div className="flex justify-center">
                <p>
                  ทั้งหมด {orderList.length} ร้าน {totalProduct} รายการ
                </p>
              </div>
              <div className="flex justify-center">
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
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 text-black">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
                  onClick={togglePopupMenu}
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
      <div className="overflow-y-auto h-full p-1">
        {openMenu && (
          <div ref={popupRef}>
            <ButtonMenu />
          </div>
        )}
        {/* {report[0]?.productPerMinutes}
        {report[1]?.productPerMinutes}
        {report[2]?.productPerMinutes} */}
        {loading ? (
          <div className="flex justify-center font-bold text-2xl mt-10">
            <p>Loading...</p>
          </div>
        ) : report.length === 0 ? (
          <div className="flex justify-center font-bold text-2xl mt-10">
            ไม่มีข้อมูล
          </div>
        ) :
          (<div>
            {filterData
              .map((emp, index) => (
                <div key={index} className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <div className="bg-blue-900 text-white p-2 flex rounded-t-3xl">
                      <div className="bg-white p-1 rounded-full flex justify-center">
                        <img className="rounded-full w-20"
                          src="https://as2.ftcdn.net/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg" />
                      </div>
                      <div className="w-6/8 ml-5">
                        <div>
                          <p className="flex justify-start font-bold text-lg">{emp?.emp_name}</p>
                        </div>
                        <div className=" text-sm">
                          <div className="flex justify-between  pt-2">
                            <div className="flex justify-start">
                              <p>{emp?.emp_code}</p>&nbsp;
                              <p>{emp?.emp_nickname}</p>
                            </div>
                            <div className="flex justify-end">
                              <p className="">{emp.emp_workingPeriod_startTime} - {emp.emp_workingPeriod_endTime}</p>&nbsp;
                            </div>
                          </div>
                          <div className="flex justify-between pt-2">
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
                    <div className="px-3 bg-white text-sm">
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
                    <div className="flex text-white justify-center shadow-2xl pb-2 rounded-b-3xl bg-white px-2">
                      {floor.map((floor, floorIdx) => (
                        <div key={floorIdx} className={`px-2.5 py-1 mb-1 mt-1 text-sm font-bold w-full ${floor.value === "1" ? "bg-gray-500 rounded-l-2xl" : floor.value === "2" ? "bg-yellow-500" : floor.value === "3" ? "bg-indigo-500" : floor.value === "4" ? "bg-red-500" : floor.value === "5" ? "bg-emerald-500 rounded-r-2xl" : "bg-white"}`}>
                          <div className="flex justify-center pb-3">
                            {floor.label}
                          </div>
                          <div className="flex justify-center">
                            <p>รก.</p>&nbsp;
                            <p>{floor.value === "1" ? emp?.floor1 : floor.value === "2" ? emp?.floor2 : floor.value === "3" ? emp?.floor3 : floor.value === "4" ? emp?.floor4 : floor.value === "5" ? emp?.floor5 : "0"}</p>&nbsp;
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
