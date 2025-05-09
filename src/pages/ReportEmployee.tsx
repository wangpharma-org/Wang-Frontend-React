import { useState, useEffect, useRef } from "react";
import Clock from "../components/Clock";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { Socket, io } from "socket.io-client";

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
      // setLoading(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      setOrderList([]);
      // setLoading(true);
    });
    return () => {
      newSocket.disconnect();
    };
  }, []);
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

    console.log("order List " + orderList);
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
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <div className="bg-blue-900 text-white p-2 flex rounded-t-3xl">
              <div className="bg-white p-1 rounded-full flex justify-center">
                <img className="rounded-full w-20"
                  src="https://as2.ftcdn.net/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg" />
              </div>
              <div className="w-6/8 ml-5">
                <div>
                  <p className="flex justify-start font-bold">name</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs  pt-2">
                    <div className="flex justify-start">
                      <p>0021</p>&nbsp;
                      <p>แนน</p>
                    </div>
                    <div className="flex justify-end">
                      <p className="">00:00:00 - 00:00:00</p>&nbsp;
                    </div>
                  </div>
                  <div className="flex justify-between text-xs pt-2">
                    <div>
                      <p className="py-1">000-000-0000</p>&nbsp;
                    </div>
                    <div className="">
                      <p className="px-2 py-1 rounded-sm bg-gray-500">ชั้น 2</p>&nbsp;
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
                  <p>800</p>&nbsp;
                  <p>รายการ</p>
                </div>
              </div>
              <div className="flex justify-between w-full pt-2">
                <div className="flex justify-start">
                  <p>ชิ้นแรก</p>
                </div>
                <div className="flex justify-end">
                  <p>22/04/68</p>&nbsp;
                  <p>05:55</p>&nbsp;
                  <p>น.</p>
                </div>
              </div>
              <div className="flex justify-between w-full pt-2">
                <div className="flex justify-start">
                  <p>ชิ้นล่าสุด</p>
                </div>
                <div className="flex justify-end">
                  <p>22/04/68</p>&nbsp;
                  <p>05:55</p>&nbsp;
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
                  <p>1.87</p>&nbsp;
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
                    <p>2</p>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Report;
