import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import Clock from "../components/Clock";
import ProductBox from "../components/ProductBox";
import ButtonMenu from "../components/buttonMenu";


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

export interface ShoppingOrder {
  so_running: string;
  so_amount: number;
  so_unit: string;
  picking_status: string;
  emp_code_floor_picking: string;
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
  // const handleDoubleClick = useDoubleClick();

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
      newSocket.emit("join_room", mem_code);
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

  // const doubleClick = (event:React.MouseEvent<HTMLDivElement, MouseEvent>) =>{
  //   console.log(event.detail)
  // }

  const handleDoubleClick = (orderItem: ShoppingOrder, status: string) => {
    clickCountRef.current++;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 500);

    if (clickCountRef.current === 2) {
      clickCountRef.current = 0;
      console.log("Double clicked on Picking Function");

      if (orderItem.picking_status !== "pending") {
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
            status: status,
          });
        }
      }
      console.log("Double clicked:", orderItem);
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

  // console.log("search " + search);
  // console.log("selectedFloor " + selectedFloor);

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
    { label: "1", value: "1", color: "bg-gray-400" },
    { label: "2", value: "2", color: "bg-yellow-500" },
    { label: "3", value: "3", color: "bg-blue-500" },
    { label: "4", value: "4", color: "bg-red-500" },
    { label: "5", value: "5", color: "bg-emerald-500" },
    { label: "ยกลัง", value: "box", color: "bg-purple-500" }, // ถ้าคุณจะใช้ type พิเศษ
  ];

  const Btnlogout = () => {
    logout()
  };

  return (
    <div className="flex flex-col h-screen">
      <header
        className={`p-2 sticky top-0 bg-blue-400 z-40 text-white font-medium ${selectedFloor === '1' ? "bg-gray-500" : selectedFloor === '2' ? "bg-yellow-500" : selectedFloor === '3' ? "bg-blue-500" : selectedFloor === '4' ? "bg-red-500" : selectedFloor === '5' ? "bg-emerald-500" : selectedFloor === 'box' ? "bg-purple-500" : "bg-blue-400"} `}
      >
        <div>
          <div className="flex justify-between">
            <div>
              <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs ">
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
            <div ref={popupRef}>
              <ButtonMenu></ButtonMenu>
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
                <div className=" p-3 mb-56 mt-3">
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
                        .map((orderItem, Orderindex) => {
                          if (socket) {
                            console.log("orderItem2", orderItem)
                            return <ProductBox orderItem={orderItem} key={Orderindex} headShRunning={head.sh_running} socket={socket} handleDoubleClick={handleDoubleClick} />
                          }
                        })}
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
        <footer className={`p-3 fixed bottom-0 left-0 right-0 z-40  text-white font-medium ${selectedFloor === '1' ? "bg-gray-500" : selectedFloor === '2' ? "bg-yellow-500" : selectedFloor === '3' ? "bg-blue-500" : selectedFloor === '4' ? "bg-red-500" : selectedFloor === '5' ? "bg-emerald-500" : selectedFloor === 'box' ? "bg-purple-500" : "bg-blue-400"}`}>
          <div className="flex">
            {floorButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() =>
                  setSelectedFloor((prev) =>
                    prev === btn.value ? null : btn.value
                  )
                }
                className={`border border-gray-500 py-1 px-1 rounded-sm shadow-lg w-full mx-1
                            ${btn.color} 
                            ${selectedFloor === btn.value
                    ? "ring-2 ring-yellow-300"
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
