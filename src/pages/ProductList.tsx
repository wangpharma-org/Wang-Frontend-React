import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import Clock from "../components/Clock";

interface Product {
  product_code: string;
  product_name: string;
  product_image_url: string;
  product_barcode: string;
  product_floor: string | null;
  product_addr: string;
  product_stock: string;
  product_unit: string;
}

interface ShoppingOrder {
  so_running: string;
  so_amount: number;
  so_unit: string;
  picking_status: string;
  emp_code_floor_picking: string | null;
  so_picking_time: string | null;
  product: Product;
}

interface ShoppingHead {
  sh_running: string;
  shoppingOrders: ShoppingOrder[];
}

interface PickingData {
  mem_code: string;
  mem_name: string;
  shoppingHeads: ShoppingHead[];
  all_sh_running: string[];
  emp_code_picking: string;
}

function ProductList() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [listproduct, setListproduct] = useState<PickingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [CanSubmit, setCanSubmit] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const navigate = useNavigate();
  const mem_code = new URLSearchParams(window.location.search).get("mem_code");
  const { userInfo, logout } = useAuth();

  const popupRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [, setIsFiltered] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    console.log(token);
    console.log(`${import.meta.env.VITE_API_URL_ORDER}/socket/picking/listproducts`);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/picking/listproducts`,
      {
        path: '/socket/picking',
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("listproduct:get", mem_code);
    });


    newSocket.on("listproduct:get", (data) => {
      setListproduct(data);
      setLoading(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      setListproduct(null);
      setLoading(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (listproduct) {
      const hasPending = (listproduct?.shoppingHeads ?? []).some((head) =>
        head.shoppingOrders.some((order) => order.picking_status === "pending")
      );
      setCanSubmit(!hasPending);
    }
    console.log(listproduct)
  }, [listproduct]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(false);
        setShowInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInput]);


  const handleDoubleClick = (orderItem: ShoppingOrder) => {
    clickCountRef.current++;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 500);

    if (clickCountRef.current === 2) {
      clickCountRef.current = 0;

      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(orderItem.so_running)) {
          newSet.delete(orderItem.so_running);
        } else {
          newSet.add(orderItem.so_running);
        }
        return newSet;
      });
      if (orderItem.picking_status === "picking") {
        if (socket?.connected) {
          socket.emit("listproduct:unpicked", {
            so_running: orderItem.so_running,
            mem_code: mem_code,
          });
        }
      } else {
        if (socket?.connected) {
          socket?.emit("listproduct:picked", {
            so_running: orderItem.so_running,
            mem_code: mem_code,
            status: "picking",
          });
        }
      }
      console.log("Double clicked:", orderItem);
    }
  };



  const handleOutofStock = (orderItem: ShoppingOrder, status: string) => {
    console.log(orderItem, status);
    if (socket?.connected && orderItem.picking_status !== status) {
      socket.emit("listproduct:picked", {
        so_running: orderItem.so_running,
        mem_code: mem_code,
        status: status,
      });
    } else if (socket?.connected && orderItem.picking_status === status) {
      socket.emit("listproduct:picked", {
        so_running: orderItem.so_running,
        mem_code: mem_code,
        status: "pending",
      });
    }
  };

  const submitPicking = () => {
    if (socket?.connected) {
      socket.emit("listproduct:submitpicking", {
        mem_code: mem_code,
        all_sh_running: listproduct?.all_sh_running,
      });
    }
  }

  useEffect(() => {
    setIsFiltered(!!search || !!selectedFloor);
  }, [search, selectedFloor]);

  console.log("search " + search);
  console.log("selectedFloor " + selectedFloor);

  const setButton = () => {
    setSearch('');
    setSelectedFloor(null)
  }

  
  const totalOrders =
    (listproduct?.shoppingHeads ?? []).reduce(
      (total, head) => total + head.shoppingOrders.length,
      0
    ) || 0;

  const pickingCount =
    (listproduct?.shoppingHeads ?? []).reduce(
      (total, head) =>
        total +
        head.shoppingOrders.filter(
          (order) => order.picking_status === "picking" || order.picking_status === "หมด" || order.picking_status === "ไม่พอ" || order.picking_status === "ไม่เจอ" || order.picking_status === "เสีย" || order.picking_status === "ด้านล่าง",
        ).length,
      0
    ) || 0;
  const pendingCount =
    (listproduct?.shoppingHeads ?? []).reduce(
      (total, head) =>
        total +
        head.shoppingOrders.filter(
          (order) => order.picking_status === "pending"
        ).length,
      0
    ) || 0;

  const floorButtons = [
    { label: "ชั้น 1", value: "1", color: "bg-gray-400" },
    { label: "ชั้น 2", value: "2", color: "bg-yellow-500" },
    { label: "ชั้น 3", value: "3", color: "bg-indigo-500" },
    { label: "ชั้น 4", value: "4", color: "bg-red-500" },
    { label: "ชั้น 5", value: "5", color: "bg-emerald-500" },
    { label: "ยกลัง", value: "box", color: "bg-purple-500" }, // ถ้าคุณจะใช้ type พิเศษ
  ];

  const Btnlogout = () => {
    logout()
  };

  return (
    <div className="flex flex-col h-screen">
      <header
        className={`p-2  text-white font-medium ${selectedFloor === '1' ? "bg-gray-500" : selectedFloor === '2' ? "bg-yellow-500" : selectedFloor === '3' ? "bg-indigo-500" : selectedFloor === '4' ? "bg-red-500" : selectedFloor === '5' ? "bg-emerald-500" : selectedFloor === 'box' ? "bg-purple-500" : "bg-blue-400"} `}
      >
        <div>
          <div className="flex justify-between">
            <div>
              <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs">
                ลัง
              </button>
            </div>
            <div>
              {showInput && (
                <div ref={popupRef} className="flex absolute ">
                  <input type="text" placeholder="พิมพ์ข้อมูลที่ต้องการค้นหา" value={search} onChange={(e) => setSearch(e.target.value)} className="p-1 border rounded-sm text-black bg-white flex z-10 h-8" />
                </div>
              )}
              <div className="flex justify-center text-sm">
                <p><Clock></Clock></p>
              </div>
              <div className="flex justify-center text-xs">
                <p>
                  ทั้งหมด {listproduct?.shoppingHeads?.length || 0} บิล{" "}
                  {totalOrders} รายการ
                </p>
              </div>
              <div className="flex justify-center text-xs">
                <p>เหลือจัด {pendingCount} รายการ</p>&nbsp;<p>|</p>&nbsp;
                <p>กำลังจัด {pickingCount} รายการ</p>
              </div>
            </div>
            <div>
              <button ref={buttonRef} onClick={() => setShowInput((prev) => !prev)} className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs">
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
          <div className="flex justify-start">
            <div id="button" className="flex justify-start">
              <button ref={buttonRef} onClick={() => setOpenMenu((prev) => !prev)} className="px-3 pt-2 cursor-pointer text-center ">
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
            <div
              id="name"
              onClick={() => navigate("/order-list")}
              className="flex pt-2 cursor-pointer text-center justify-center mx-auto"
            >
              <p>{listproduct?.mem_code}</p>&nbsp;
              <p>{listproduct?.mem_name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative content bg-white overflow-y-auto h-full text-[#444444]">
        <div>
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
        </div>
        {loading ? (
          <div className="flex justify-center font-bold text-2xl mt-10">
            <p>Loading...</p>
          </div>
        ) : !listproduct?.shoppingHeads ? (
          <div className="flex flex-col items-center mt-5">
            <p className="font-bold text-2xl">รายการคำสั่งซื้อนี้ยืนยันไปแล้ว</p>
            <button onClick={() => navigate("/order-list")} className="bg-blue-400 px-3 py-1 mt-4 rounded-sm text-white">กลับ</button>
          </div>) : (
          <div>
            {listproduct.shoppingHeads.some(head =>
              head.shoppingOrders.some(orderItem => {
                const matchFloor = selectedFloor
                  ? (orderItem.product.product_floor || '1') === selectedFloor
                  : true;

                const matchSearch =
                  !search ||
                  orderItem.product.product_name.toLowerCase().includes(search.toLowerCase()) ||
                  orderItem.so_running.toLowerCase().includes(search.toLowerCase()) ||
                  orderItem.product.product_code.toLowerCase().includes(search.toLowerCase());

                return matchFloor && matchSearch;
              })
            ) ? (
              <div>
                <div className=" p-3">
                  {listproduct.shoppingHeads.map((head, headIdx) => (
                    <div
                      key={headIdx}
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    >
                      {head.shoppingOrders
                        .filter((orderItem) => {
                          const matchFloor = selectedFloor
                            ? (orderItem.product.product_floor || '1') === selectedFloor
                            : true

                          const matchSearch = !search || orderItem.product.product_name.includes(search) || orderItem.so_running.includes(search) || orderItem.product.product_code.includes(search);
                          return matchFloor && matchSearch;
                        }
                        )
                        .map((orderItem, Orderindex) => (
                          <div
                            key={Orderindex}
                            className={`p-2 rounded-sm mb-1 mt-1 ${orderItem.picking_status === "pending"
                              ? "bg-gray-400"
                              : orderItem.picking_status === "picking"
                                ? "bg-green-400"
                                : "bg-red-400"
                              }`}
                          >
                            <div
                              onClick={() => handleDoubleClick(orderItem)} // เพิ่ม onClick สำหรับดับเบิลคลิก
                              className={`py-2 px-1 rounded-smm-1 cursor-pointer ${orderItem.picking_status === "pending"
                                ? "bg-white"
                                : orderItem.picking_status === "picking"
                                  ? "bg-green-100"
                                  : "bg-red-100"
                                }`}
                            >
                              <div className="flex justify-stretch p-1">
                                <div className="w-1/3 border border-gray-500 flex justify-center ">
                                  <img
                                    src={orderItem.product.product_image_url || 'https://icons.veryicon.com/png/o/application/applet-1/product-17.png'}
                                    className="w-25 h-25 object-cover"
                                  />
                                </div>
                                <div className="text-xs w-2/3 ml-1">
                                  <div className="flex justify-between pt-1 px-1">
                                    <p className="font-bold">
                                      {orderItem.product.product_name}
                                    </p>
                                    <p>{head.sh_running}</p>
                                  </div>
                                  <div className="flex justify-between pt-1 px-1">
                                    <p>{orderItem.so_running}</p>
                                    <p className="px-2 py-2 rounded-sm bg-yellow-500 text-white">
                                      {orderItem.so_amount} {orderItem.so_unit}
                                    </p>
                                  </div>
                                  <div className="flex justify-between pt-1 px-1">
                                    <p className="text-amber-500 font-bold">
                                      {orderItem.product.product_code}
                                    </p>
                                    <p>
                                      เหลือ {orderItem.product.product_stock}{" "}
                                      {orderItem.product.product_unit}
                                    </p>
                                  </div>
                                  <div className="flex justify-between pt-1 px-1">
                                    <div className="flex font-semibold text-violet-600">
                                      <p>F{orderItem.product.product_floor || '1'}</p>&nbsp;
                                      <p>{orderItem.product.product_addr}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-around py-2 text-[11px]">
                                {["หมด", "ไม่พอ", "ไม่เจอ", "เสีย", "ด้านล่าง"].map(
                                  (label, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => handleOutofStock(orderItem, label)}
                                      className={`text-white rounded-sm shadow-md bg-amber-500 py-2 px-3 ${orderItem.picking_status === label
                                        ? "bg-red-500"
                                        : ""
                                        }`}
                                    >
                                      {label}
                                    </button>
                                  )
                                )}
                              </div>
                              <div className="flex justify-between py-1 px-1 text-xs text-gray-500">
                                <div className="flex justify-start">
                                  <p>
                                    {orderItem.emp_code_floor_picking
                                      ? "จัดแล้ว"
                                      : "ยังไม่จัด"}
                                  </p>
                                  &nbsp;{
                                    orderItem.emp_code_floor_picking &&
                                    <p> [{orderItem.emp_code_floor_picking || ""}] &nbsp;
                                      {new Date(
                                        orderItem.so_picking_time || ""
                                      ).toLocaleDateString("th-TH", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                      })}{" "}
                                      {new Date(
                                        orderItem.so_picking_time || ""
                                      ).toLocaleTimeString("th-TH", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}
                                    </p>
                                  }
                                </div>
                                {/* <div className="flex justify-end pr-1">
                        <button className="border-gray-300 border rounded-sm px-5 py-2 shadow-md bg-blue-400 text-white">
                          พิมพ์
                        </button>
                      </div> */}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (search || selectedFloor) && (

                <div className="flex flex-col justify-center items-center text-center h-[70vh]">
                  <div className=" font-bold mt-4 text-red-500 text-2xl">

                    {search && (
                      <div>
                        <p>ไม่มีรายการสินค้าชื่อ</p>
                        <p >{search}</p>
                        <p ></p>
                      </div>
                    )}
                    {selectedFloor && (
                      <div>
                        <p>ไม่มีสินค้าที่ต้องจัดในชั้น</p>
                        <p > {selectedFloor}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={setButton} className="px-5 py-1 rounded-sm mt-2 text-xl bg-red-500 text-white shadow-xl border-gray-300">คืนค่าเดิม</button>
                </div>
              ))}
          </div>
        )}
      </div>
      <div>
        <footer className={`p-3  text-white font-medium ${selectedFloor === '1' ? "bg-gray-500" : selectedFloor === '2' ? "bg-yellow-500" : selectedFloor === '3' ? "bg-indigo-500" : selectedFloor === '4' ? "bg-red-500" : selectedFloor === '5' ? "bg-emerald-500" : selectedFloor === 'box' ? "bg-purple-500" : "bg-blue-400"}`}>
          <div className="flex justify-around">
            {floorButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() =>
                  setSelectedFloor((prev) =>
                    prev === btn.value ? null : btn.value
                  )
                }
                className={`border border-gray-500 py-1 px-2 rounded-sm shadow-lg 
                            ${btn.color} 
                            hover:bg-yellow-300 hover:text-black
                            ${selectedFloor === btn.value
                    ? "ring-2 ring-yellow-300 text-black"
                    : ""
                  }`}>
                {btn.label}
              </button>
            ))}
          </div>
          <div>
            <button
              onClick={() => {
                submitPicking()
                navigate('/order-list')
              }}
              disabled={!CanSubmit || !listproduct || userInfo?.emp_code !== listproduct.emp_code_picking}
              className={`w-full px-3 py-1 shadow-md text-lg rounded-sm font-semibold  text-white mt-3 ${(CanSubmit && listproduct && userInfo?.emp_code === listproduct.emp_code_picking) ? "bg-green-400" : "bg-gray-400"}`}
            >
              {(!CanSubmit || !listproduct || userInfo?.emp_code !== listproduct.emp_code_picking) ? `คุณไม่มีสิทธิ์ในการยืนยัน` : (!CanSubmit) ? `กรุณาจัดสินค้าให้ครบ` : `ยืนยันการจัดสินค้า`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ProductList;
