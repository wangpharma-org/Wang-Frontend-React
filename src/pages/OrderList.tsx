import Clock from "../components/Clock";
import { useState, useEffect, useRef } from "react";
import { Socket, io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import axios from "axios";
import { Bounce, ToastContainer, toast } from "react-toastify";

interface Product {
  product_floor: string;
  product_unit: string;
}

interface ShoppingOrder {
  picking_status: string;
  product: Product;
  so_procode: string;
  so_running: string;
  so_picking_time: string;
  so_unit: string;
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

type PickingTime = {
  floor: string;
  latest_picking_time: Date;
}

const OrderList = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderList, setOrderList] = useState<orderList[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProduct, setTotalShoppingOrders] = useState(0);
  const [totalPicking, setTotalPicking] = useState(0);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const popupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const popupRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectroute, setSelectroute] = useState<string>(sessionStorage.getItem('route') ?? "เลือกเส้นทางขนส่ง");
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();
  const [latestTimes, setLatestTimes] = useState<PickingTime[]>([]);
  const [search, setSearch] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [floorCounts, setFloorCounts] = useState<Record<string, number>>({});
  const handleDoubleClick = useDoubleClick();

  const togglePopup = (id: string) => {
    setOpenPopupId((prev) => (prev === id ? null : id));
  };

  const togglePopupMenu = () => {
    setOpenMenu((prev) => !prev);
    console.log("Click menu");
  };

  const toggleSearch = () => {
    setShowInput((prev) => !prev);
    setSelectroute("all")
    console.log("showInput " + showInput);
  };

  useEffect(() => {
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

    const routeSession = sessionStorage.getItem('route');
    if (routeSession) {
      setSelectroute(routeSession);
    }
    
    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("listorder:get");
    });

    newSocket.on("listorder:get", (data) => {
      // console.log("Data " + JSON.stringify(data));
      setOrderList(data.memberOrderWithAllShRunning);
      setLatestTimes(data.lastestDate);
      console.log('time', data.lastestDate);
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

  useEffect(()=>{
    if(selectroute) {
      sessionStorage.setItem('route', selectroute)
    }
  }, [selectroute])

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
    localStorage.setItem("totalShoppingOrders", JSON.stringify(totalShoppingOrders));

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
    localStorage.setItem("totalStatusPicking", JSON.stringify(totalStatusPicking));
    setTotalPicking(totalStatusPicking);

    // const latestByFloor: Record<string, Date> = {};

    // orderList.forEach((order) => {
    //   order.shoppingHeads.forEach((sh) => {
    //     sh.shoppingOrders.forEach((so) => {
    //       const rawTime = so.so_picking_time;
    //       if (rawTime && !isNaN(Date.parse(rawTime))) {
    //         const soTime = new Date(rawTime);
    //         const floor = so.product.product_floor;
    //         if (!latestByFloor[floor] || soTime > latestByFloor[floor]) {
    //           latestByFloor[floor] = soTime;
    //         }
    //       }
    //     });
    //   });
    // });
    // setLatestTimes(latestByFloor);

    const newFloorCounts: Record<string, number> = {};

    orderList.forEach((member) => {
      member.shoppingHeads.forEach((head) => {
        head.shoppingOrders.forEach((order) => {
          if (order.picking_status === "pending") {
            const unit = order.so_unit || "";
            const hasBox = unit.includes("ลัง");
            const floorKey = hasBox
              ? "box"
              : order.product.product_floor || "1";
            newFloorCounts[floorKey] = (newFloorCounts[floorKey] || 0) + 1;
          }
        });
      });
    });
    setFloorCounts(newFloorCounts);
    console.log("order List " + JSON.stringify(orderList));
  }, [orderList]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setOpenPopupId(null);
        setOpenMenu(false);
        setShowInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInput]);

  const changeToPending = (mem_code: string) => {
    if (socket?.connected) {
      socket.emit("listorder:unpicking", {
        mem_code: mem_code,
      });
    }
  };

  const handleSubmit = (mem_code: string, all_sh_running: string[]) => {
    if (socket?.connected) {
      socket.emit("listorder:submitpicking", {
        mem_code: mem_code,
        all_sh_running: all_sh_running,
      });
    }
  };

  const changeToPicking = (mem_code: string) => {
    console.log("socket status", socket?.connected);
    if (socket?.connected) {
      console.log("can emit");
      socket.emit("listorder:picking", {
        mem_code: mem_code,
      });
    } else {
      throw new Error("can not emit change to picking");
    }
  };

  const filteredData = orderList.filter((order) => {
    const matchSearch =
      !search ||
      order.mem_name.toLowerCase().includes(search.toLowerCase()) ||
      order.mem_code.toLowerCase().includes(search.toLowerCase());

    const matchFloor =
      !selectedFloor ||
      order.shoppingHeads.some((sh) =>
        sh.shoppingOrders.some((so) => {
          const unit = so.so_unit || "";
          const floor = so.product.product_floor || "1";

          if (selectedFloor === "box") {
            return unit.includes("ลัง");
          }

          return floor === selectedFloor;
        })
      );

    const matchRoute =
      selectroute === "all" ||
      selectroute === "เลือกเส้นทางขนส่ง" ||
      order.province === selectroute;

    return matchSearch && matchFloor && matchRoute;
  });

  const isFiltered =
    search ||
    selectedFloor ||
    (selectroute && selectroute !== "");
  console.log("search " + search);
  console.log("selectedFloor " + selectedFloor);
  console.log("selectroute " + selectroute);

  const floorButtons = [
    { label: "1", value: "1", color: "bg-gray-500" },
    { label: "2", value: "2", color: "bg-yellow-500" },
    { label: "3", value: "3", color: "bg-blue-500" },
    { label: "4", value: "4", color: "bg-red-500" },
    { label: "5", value: "5", color: "bg-emerald-500" },
    { label: "ยกลัง", value: "box", color: "bg-purple-500" },
  ];

  const printSticker = async (mem_code: string) => {
    console.log("printSticker", mem_code);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/picking/createTicket`,
        {
          mem_code: mem_code,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          },
        }
      );
      console.log("response", response);
      if (response.status === 201) {
        console.log("Sticker created successfully!");
        toast.success("สั่งพิมพ์สติกเกอร์สำเร็จ", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      } else {
        toast.error("มีข้อผิดพลาดในการสั่งพิมพ์", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      }
    } catch (error) {
      console.error("Error printing sticker:", error);
    }
  };

  const setButton = () => {
    setSearch("");
    setSelectroute("เลือกเส้นทางขนส่ง");
    setSelectedFloor(null);
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

  useEffect(() => {
    console.log("totalPicking", totalPicking);
  }, [totalPicking]);

  function useDoubleClick(delay = 500) {
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef<number | null>(null);

    const handleClick = (callback: Function) => {
      clickCountRef.current++;
      if (clickCountRef.current === 1) {
        return setOpenPopupId(null);
      }

      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, delay);

      if (clickCountRef.current === 2) {
        clickCountRef.current = 0;
        callback();
      }
    };

    return handleClick;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div>
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
      </div>
      <header className="p-2 bg-blue-400 text-white font-medium sticky top-0 z-40">
        <div className="flex justify-between">
          <div>
            <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs">
              ลัง
            </button>
          </div>
          <div>
            {showInput && (
              <div ref={popupRef} className="flex absolute ">
                <input
                  type="text"
                  placeholder="พิมพ์รหัสลูกค้า"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="p-1 rounded-sm text-black bg-white flex z-10 h-8"
                />
              </div>
            )}
            <div className="flex justify-center text-sm">
              <Clock></Clock>
            </div>
            <div className="flex justify-center text-sm">
              <p>
                ทั้งหมด {orderList.length} ร้าน {totalProduct} รายการ
              </p>
            </div>
            <div className="flex justify-center text-sm">
              <p>เหลือจัด {totalProduct - totalPicking} รายการ</p>
              &nbsp;<p>|</p>&nbsp;
              <p>กำลังจัด {totalPicking} รายการ</p>
            </div>
          </div>
          <div>
            <div className="flex ">
              <button
                ref={buttonRef}
                onClick={toggleSearch}
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
            <select
              value={selectroute}
              onChange={(e) => { setSelectroute(e.target.value); setSearch("") }}
              className="border border-gray-200 px-2 py-1 rounded text-black bg-white text-center flex justify-center w-full"
            >
              {routeButtons.map((route) => (
                <option key={route.id} value={route.value}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
          <div>&nbsp;</div>
        </div>
      </header>

      <div className="relative flex-grow overflow-y-auto">
        <div>
          {openMenu && (
            <div
              ref={popupRef}
              className="fixed top-0 left-0 h-full z-50 w-3/5 sm:w-1/2 md:w-1/4 bg-blue-900 transition-transform duration-2000 ease-in-out transform translate-x-0"
            >
              <div id="infomation" className="p-4">
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.2}
                      stroke="currentColor"
                      className="size-9 rounded-full mr-1 ml-1 p-1 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"
                      />
                    </svg>
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center font-bold text-2xl mt-10">
            <p>Loading...</p>
          </div>
        ) : orderList.length === 0 ? (
          <div className="flex justify-center font-bold text-2xl mt-10">
            <p>ไม่มีรายการสินค้า</p>
          </div>
        ) : (
          <div>
            {filteredData.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full mb-36 mt-3">
                  {orderList
                    .sort((a, b) => {
                      const maxA = Math.max(
                        ...a.shoppingHeads.map((sh) =>
                          new Date(sh.sh_datetime).getTime()
                        )
                      );
                      const maxB = Math.max(
                        ...b.shoppingHeads.map((sh) =>
                          new Date(sh.sh_datetime).getTime()
                        )
                      );
                      return maxA - maxB;
                    })
                    .filter((order) => filteredData.includes(order))
                    .map((order) => {
                      const allFloors = ["1", "2", "3", "4", "5"];
                      const popupRef = (el: HTMLDivElement | null) => {
                        popupRefs.current[order.mem_code] = el;
                      };
                      const isOpen = openPopupId === order.mem_code;

                      // สรุปจำนวนต่อ floor
                      const floorSummary = order.shoppingHeads
                        .flatMap((head) => head.shoppingOrders)
                        .reduce((acc, order) => {
                          const floor = order.product.product_floor || "1";
                          if (!acc[floor]) {
                            acc[floor] = { total: 0, remaining: 0 };
                          }
                          acc[floor].total += 1;
                          if (order.picking_status === "pending") {
                            acc[floor].remaining += 1;
                          }
                          // console.log("floor", floor);
                          // console.log("order.product.product_floor", order.product.product_floor);
                          return acc;
                        }, {} as Record<string, { total: number; remaining: number }>);
                      console.log("floorSummary", floorSummary);
                      return (
                        <div
                          key={order.mem_id}
                          className="mt-2 px-3 w-full grid grid-cols-1 md:grid-cols-1 gap-3"
                        >
                          <div
                            onClick={() => togglePopup(order.mem_code)}
                            className={`w-full p-2 rounded-sm shadow-xl text-[12px] text-[#444444] ${order.picking_status === "picking"
                              ? "bg-green-400"
                              : "bg-gray-400"
                              }`}
                          >
                            <div
                              className={`p-1 rounded-sm ${order.picking_status === "picking"
                                ? "bg-green-100"
                                : "bg-white"
                                }`}
                            >
                              <div className="flex justify-between">
                                <div className="flex justify-start">
                                  <p>{order.mem_code}</p>&nbsp;
                                  <p className="truncate max-w-[170px]">
                                    {order.mem_name}
                                  </p>
                                </div>
                                <div>
                                  <p>
                                    {new Date(
                                      Math.max(
                                        ...order.shoppingHeads.map((sh) =>
                                          new Date(sh.sh_datetime).getTime()
                                        )
                                      )
                                    ).toLocaleString("th-TH", {
                                      year: "2-digit",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                      timeZone: "UTC",
                                    })}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-between">
                                <div className="flex justify-start">
                                  <p className="text-gray-600">ผู้ดูแล</p>&nbsp;
                                  <p>{order.emp.emp_nickname}</p>
                                </div>
                                <div className="flex justify-center">
                                  <p>({order.province})</p>
                                </div>
                                <div className="flex justify-end pb-1">
                                  <p className="font-bold">
                                    {order.shoppingHeads.length}
                                  </p>&nbsp;
                                  <p>บิล</p>&nbsp;
                                  <p className="text-red-500 font-bold">
                                    {order.shoppingHeads.flatMap(
                                      (h) => h.shoppingOrders
                                    ).length -
                                      order.shoppingHeads
                                        .flatMap((h) => h.shoppingOrders)
                                        .filter(
                                          (so) =>
                                            so.picking_status === "picking" ||
                                            so.picking_status === "หมด" ||
                                            so.picking_status === "ไม่พอ" ||
                                            so.picking_status === "ไม่เจอ" ||
                                            so.picking_status === "เสีย" ||
                                            so.picking_status === "ด้านล่าง"
                                        ).length}
                                  </p>
                                  &nbsp;
                                  <p>/</p>&nbsp;
                                  <p className="text-violet-500 font-bold">
                                    {
                                      order.shoppingHeads.flatMap(
                                        (h) => h.shoppingOrders
                                      ).length
                                    }
                                  </p>&nbsp;
                                  <p>(เหลือ/All)</p>
                                  {/* <p>FLOOR</p> */}
                                </div>
                              </div>

                              <div className="flex flex-nowrap overflow-hidden w-full justify-center my-1 gap-0.5">
                                {allFloors.map((floor) => {
                                  const data = floorSummary[floor] || {
                                    total: 0,
                                    remaining: 0,
                                  };
                                  return (
                                    <div
                                      key={floor}
                                      className={`flex-none px-0.5 py-1.5 mx-0.5 rounded shadow-sm text-center w-14 ${data.remaining > 0
                                        ? "bg-yellow-200"
                                        : "bg-red-200"
                                        }`}
                                    >
                                      <div className="text-xs font-bold">
                                        F{floor}
                                      </div>
                                      <div className="text-[10px] text-gray-600">
                                        เหลือ{" "}
                                        <span className="font-bold text-sm">
                                          {data.remaining}
                                        </span>{" "}
                                        รก.
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex justify-between pt-2">
                                <div className="flex justify-start">
                                  {order.emp_code_picking && (
                                    <div className="flex justify-start">
                                      <p>[{order.emp_code_picking}]</p>&nbsp;
                                      <p className="text-amber-600 font-bold">
                                        {order.emp_picking.emp_nickname}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-center">
                                  {order?.picking_status === "picking" &&
                                    order?.emp_code_picking ===
                                    userInfo?.emp_code && (
                                      <div className="pr-1">
                                        <button
                                          disabled={
                                            !(
                                              order.shoppingHeads
                                                .flatMap(
                                                  (h) => h.shoppingOrders
                                                )
                                                .filter(
                                                  (so) =>
                                                    so.picking_status !==
                                                    "pending"
                                                ).length -
                                              order.shoppingHeads.flatMap(
                                                (h) => h.shoppingOrders
                                              ).length ===
                                              0
                                            )
                                          }
                                          className={`border rounded-sm px-2 py-1  text-white shadow-xl border-gray-300 ${order.shoppingHeads
                                            .flatMap((h) => h.shoppingOrders)
                                            .filter(
                                              (so) =>
                                                so.picking_status !==
                                                "pending"
                                            ).length -
                                            order.shoppingHeads.flatMap(
                                              (h) => h.shoppingOrders
                                            ).length ===
                                            0
                                            ? "bg-green-600"
                                            : "bg-gray-500"
                                            }`}
                                          onClick={(e) => {
                                            e.stopPropagation();

                                            handleDoubleClick(() => {
                                              handleSubmit(
                                                order?.mem_code,
                                                order?.all_sh_running
                                              )
                                            }
                                            );
                                          }}
                                        >
                                          ยืนยัน
                                        </button>
                                      </div>
                                    )}
                                  {order?.picking_status === "picking" &&
                                    order?.emp_code_picking ===
                                    userInfo?.emp_code && (
                                      <div className="pr-1">
                                        <button
                                          className="border rounded-sm px-2 py-1 bg-amber-400 text-white shadow-xl border-gray-300 cursor-pointer z-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDoubleClick(() => {
                                              changeToPending(order?.mem_code);
                                            })
                                          }}
                                        >
                                          เปลี่ยน
                                        </button>
                                      </div>
                                    )}
                                  {order?.picking_status === "pending" && (
                                    <div className="pr-1">
                                      <button
                                        className="border rounded-sm px-2 py-1 bg-green-500 text-white shadow-xl border-gray-300"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDoubleClick(() => {
                                            changeToPicking(order?.mem_code);
                                          })
                                        }}
                                      >
                                        เริ่มจัด
                                      </button>
                                    </div>
                                  )}
                                  <div>
                                    {userInfo?.floor_picking && (
                                      <button
                                        className="border rounded-sm px-2 py-1 bg-blue-400 text-white shadow-xl border-gray-300"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          printSticker(order?.mem_code);
                                        }}
                                      >
                                        พิมพ์สติกเกอร์
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {isOpen && (
                              <div
                                ref={popupRef}
                                className="w-full bg-white border border-gray-300 rounded-b shadow-lg z-40 mt-2 rounded-sm px-3"
                              >
                                <ul>
                                  {order.shoppingHeads.map((sh, index) => (
                                    <li
                                      key={sh.sh_id}
                                      className="pt-2 pb-2 text-xs"
                                    >
                                      <div className="flex justify-between pt-1">
                                        <div className="flex justify-start">
                                          <p className="font-bold">
                                            {index + 1}.
                                          </p>
                                          <p>{sh.sh_running}</p>
                                        </div>
                                        <p className="bg-yellow-500 p-1 rounded-sm text-xs text-white">
                                          {sh.shoppingOrders.length} รายการ
                                        </p>
                                      </div>
                                      <div>
                                        <p>
                                          เปิดบิล:{" "}
                                          {new Date(
                                            sh.sh_datetime
                                          ).toLocaleString("th-TH", {
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                            hour12: false,
                                            timeZone: "UTC",
                                          })}
                                        </p>
                                      </div>
                                      <div className="flex justify-start">
                                        <p className="text-green-500 font-bold">
                                          {order.emp_code_picking} {order.emp.emp_nickname}
                                        </p>
                                        &nbsp;
                                        <p className="text-red-500">
                                          กำลังทำงานอยู่
                                        </p>
                                      </div>
                                      <hr className="mt-2" />
                                    </li>
                                  ))}
                                  <button
                                    disabled={
                                      order?.picking_status !== "picking"
                                    }
                                    className={`border rounded-sm px-3 py-2 text-xs w-full mb-2 text-white ${
                                      order?.picking_status === "picking"
                                        ? "hover:bg-lime-700 bg-green-600"
                                        : "hover:bg-gray-600 bg-gray-500"
                                    }`}
                                    // className={`border rounded-sm px-3 py-2 text-xs w-full mb-2 text-white hover:bg-lime-700 bg-green-600`}
                                    onClick={() => {
                                      handleDoubleClick(async () => {
                                        if (
                                          order?.picking_status === "picking"
                                        ) {
                                          console.log(
                                            'if order?.picking_status === "picking"'
                                          );
                                          navigate(
                                            `/product-list?mem_code=${order?.mem_code}`
                                          );
                                        } else {
                                          console.log("else");
                                          await changeToPicking(
                                            order?.mem_code
                                          );
                                          navigate(
                                            `/product-list?mem_code=${order?.mem_code}`
                                          );
                                        }
                                      })
                                    }}
                                  >
                                    จัดแบบรวมบิล
                                  </button>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              isFiltered && (
                <div className="flex flex-col justify-center items-center text-center h-full">
                  <div className=" font-bold mt-4 text-red-500">
                    <p className="text-2xl ">ไม่พบข้อมูลที่ค้นหา</p>
                    {search && <p className="text-xl ">{search}</p>}
                    {selectroute !== "all" && (
                      <p className="text-xl ">เส้นทาง: {selectroute}</p>
                    )}
                    {selectedFloor && (
                      <p className="text-xl ">ชั้น: {selectedFloor}</p>
                    )}
                  </div>
                  <button
                    onClick={setButton}
                    className="px-5 py-1 rounded-sm mt-2 text-xl bg-red-500 text-white shadow-xl border-gray-300"
                  >
                    คืนค่าเดิม
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
      <div>
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-blue-400 text-white p-2">
          <div className="footer flex items-end justify-around ">
            <div className="w-full ">
              <div className="flex justify-around">
                {floorButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() =>
                      setSelectedFloor((prev) =>
                        prev === btn.value ? null : btn.value
                      )
                    }
                    className={` border border-gray-500 py-1 px-1 rounded-sm shadow-lg w-full flex justify-center mx-1 relative
                            ${btn.color} 
                            ${selectedFloor === btn.value
                        ? "ring-2 ring-yellow-300"
                        : ""
                      }
                            `}
                  >
                    <div className="flex text-center gap-2">
                      <span className="text-white font-medium ">
                        {btn.label}
                      </span>
                    </div>
                    <span className="absolute -top-3 -right-1 text-[12px] bg-white text-black font-bold rounded-full px-2 py-0.5 shadow-sm">
                      {floorCounts[String(btn.value)] || 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-1 mt-1 flex justify-center">
                {['1', '2', '3', '4', '5'].map((floor) => {
                  const match = latestTimes.find((latestTime) => latestTime.floor === floor);
                  return (
                    <div key={floor} className="border px-1 py-1 rounded-sm w-full">
                      <div className="flex justify-center">
                        <p className="font-bold text-sm">F{floor}</p>
                      </div>
                      <div className="text-[12px] flex justify-center">
                        <p className="flex text-center">
                          {match?.latest_picking_time
                            ? new Date(match.latest_picking_time).toLocaleString("th-TH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            : '-'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
export default OrderList;
