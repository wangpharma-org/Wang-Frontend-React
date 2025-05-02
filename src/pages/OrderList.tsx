import Clock from "../components/Clock";
import { useState, useEffect, useRef } from "react";
import { Socket, io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

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

const OrderList = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderList, setOrderList] = useState<orderList[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProduct, setTotalShoppingOrders] = useState(0);
  const [totalPicking, setTotalPicking] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("เลือกตัวเลือก");
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const popupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const popupRef = useRef<HTMLDivElement | null>(null);
  const togglePopup = (id: string) => {
    setOpenPopupId((prev) => (prev === id ? null : id));
  };
  const [selectedFloor, setSelectedFloor] = useState("");
  const { userInfo } = useAuth();

  console.log(userInfo);
  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    console.log(token);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/listorder`,
      {
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("listorder:get");
    });

    newSocket.on("listorder:get", (data) => {
      setOrderList(data);
      setLoading(false);
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
            head.shoppingOrders.filter((so) => so.picking_status === "picking")
              .length,
          0
        ),
      0
    );
    setTotalPicking(totalStatusPicking);

    

    console.log(orderList);
  }, [orderList]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setOpenPopupId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const changeToPending = (mem_code:string) => {
    if(socket?.connected) {
        socket.emit("listorder:unpicking", {
            mem_code: mem_code,
        });
    }
  }

  const changeToPicking = (mem_code:string) => {
    if(socket?.connected) {
        socket.emit("listorder:picking", {
            mem_code: mem_code,
        });
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="p-2 bg-blue-400 text-white font-medium">
        <div className="flex justify-between">
          <div>
            <button className="rounded-sm px-3 py-1 text-black bg-white drop-shadow-xs">
              ลัง
            </button>
          </div>
          <div>
            <div className="flex justify-center text-sm">
              <Clock></Clock>
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
            <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs">
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
        <div className="flex">
          <div className="flex justify-start">
            <button className="px-3 py-1">
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
      </header>

      <div className="flex-grow overflow-y-auto">
        {loading && (
          <div className="flex justify-center font-bold text-2xl">
            <p>Loading...</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 w-full my-2">
          {orderList.map((order) => {
            const allFloors = ["2", "3", "4", "5"];
            const popupRef = (el: HTMLDivElement | null) => {
              popupRefs.current[order.mem_code] = el;
            };
            const isOpen = openPopupId === order.mem_code;

            // สรุปจำนวนต่อ floor
            const floorSummary = order.shoppingHeads
              .flatMap((head) => head.shoppingOrders)
              .reduce((acc, order) => {
                const floor = order.product.product_floor;
                if (!acc[floor]) {
                  acc[floor] = { total: 0, remaining: 0 };
                }
                acc[floor].total += 1;
                if (order.picking_status === "picking") {
                  acc[floor].remaining += 1;
                }
                return acc;
              }, {} as Record<string, { total: number; remaining: number }>);

            return (
              <div
                key={order.mem_id}
                className="mt-2 px-3 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
              >
                <div
                  onClick={() => togglePopup(order.mem_code)}
                  className={`w-full p-3 rounded-sm shadow-xl text-[10px] text-[#444444] bg-gray-400 ${
                    order.picking_status === "picking" ? "bg-green-400" : ""
                  }`}
                >
                  <div className="p-2 rounded-sm bg-white">
                    <div className="flex justify-between">
                      <div className="flex justify-start">
                        <p>{order.mem_code}</p>&nbsp;<p>{order.mem_name}</p>
                      </div>
                      <div>
                        <p>
                          {new Date(
                            Math.max(
                              ...order.shoppingHeads.map((sh) =>
                                new Date(sh.sh_datetime).getTime()
                              )
                            )
                          ).toLocaleString()}
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
                        </p>
                        <p>บิล</p>
                        <p className="text-red-500 font-bold">
                          {
                            order.shoppingHeads
                              .flatMap((h) => h.shoppingOrders)
                              .filter((so) => so.picking_status === "picking")
                              .length
                          }
                        </p>
                        <p>/</p>
                        <p className="text-violet-500 font-bold">
                          {
                            order.shoppingHeads.flatMap((h) => h.shoppingOrders)
                              .length
                          }
                        </p>
                        <p>(เหลือ/All)</p>
                        <p>FLOOR</p>
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
                            className={`flex-none px-1 py-1.5 mx-0.5 rounded shadow-sm text-center w-17 ${data.remaining>0 ? "bg-yellow-200":"bg-red-200"}`}
                          >
                            <div className="text-xs font-bold">F{floor}</div>
                            <div className="text-[10px] text-gray-600">
                              เหลือ{" "}
                              <span className="font-bold">
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
                        {(order.emp_code_picking) && <div className="flex justify-start">
                          <p>[{order.emp_code_picking}]</p>&nbsp;
                          <p className="text-amber-600 font-bold">
                            {order.emp_picking.emp_nickname}
                          </p>
                        </div>}
                      </div>
                      <div className="flex justify-center">
                        {order?.picking_status === "picking" &&
                          order?.emp_code_picking === userInfo?.emp_code && (
                            <div className="pr-1">
                              <button className="border rounded-sm px-2 py-1 bg-green-600 text-white shadow-xl border-gray-300">
                                ยืนยัน
                              </button>
                            </div>
                          )}
                        {order?.picking_status === "picking" &&
                          order?.emp_code_picking === userInfo?.emp_code && (
                          <div className="pr-1">
                            <button 
                                className="border rounded-sm px-2 py-1 bg-amber-400 text-white shadow-xl border-gray-300 cursor-pointer z-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    changeToPending(order?.mem_code);
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
                                    changeToPicking(order?.mem_code);
                                }}
                            >
                              เริ่มจัด
                            </button>
                          </div>
                        )}
                        <div>
                          <button className="border rounded-sm px-2 py-1 bg-blue-400 text-white shadow-xl border-gray-300">
                            🖨️STK
                          </button>
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
                          <li key={sh.sh_id} className="pt-2 pb-2 text-xs">
                            <div className="flex justify-between pt-1">
                              <div className="flex justify-start">
                                <p className="font-bold">{index + 1}.</p>
                                <p>{sh.sh_running}</p>
                              </div>
                              <p className="bg-yellow-500 p-1 rounded-sm text-xs text-white">
                                {sh.shoppingOrders.length} รายการ
                              </p>
                            </div>
                            <div>
                              <p>
                                เปิดบิล:{" "}
                                {new Date(sh.sh_datetime).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex justify-start">
                              <p className="text-green-500 font-bold">
                                {order.emp.emp_nickname}
                              </p>
                              &nbsp;
                              <p className="text-red-500">กำลังทำงานอยู่</p>
                            </div>
                            <hr className="mt-2" />
                          </li>
                        ))}
                        <button className="border rounded-sm px-3 py-2 text-xs w-full mb-2 bg-green-600 text-white hover:bg-lime-700">
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
      <footer className="p-2 bg-blue-400 text-white font-medium">
        <div className="footer flex items-end justify-around ">
          <div>
            <div className="flex justify-between">
              <div>
                <button
                  onClick={() => setSelectedFloor("1")}
                  className="border border-gray-500 rounded-sm bg-gray-400 shadow-lg p-1"
                >
                  ชั้น 1
                </button>
              </div>
              <div>
                <button
                  onClick={() => setSelectedFloor("2")}
                  className="border border-gray-500 rounded-sm bg-yellow-500 shadow-lg p-1"
                >
                  ชั้น 2
                </button>
              </div>
              <div>
                <button
                  onClick={() => setSelectedFloor("3")}
                  className="border border-gray-500 rounded-sm bg-indigo-500 shadow-lg p-1"
                >
                  ชั้น 3
                </button>
              </div>
              <div>
                <button
                  onClick={() => setSelectedFloor("4")}
                  className="border border-gray-500 rounded-sm bg-red-500 shadow-lg p-1"
                >
                  ชั้น 4
                </button>
              </div>
              <div>
                <button
                  onClick={() => setSelectedFloor("5")}
                  className="border border-gray-500 rounded-sm bg-emerald-500 shadow-lg p-1"
                >
                  ชั้น 5
                </button>
              </div>
              <div>
                <button
                  onClick={() => setSelectedFloor("")}
                  className="border border-gray-500 rounded-sm bg-purple-500 shadow-lg p-1"
                >
                  ยกลัง
                </button>
              </div>
            </div>

            <div className="flex justify-around p-1">
              {["F2", "F3", "F4", "F5"].map((floor) => (
                <div key={floor} className="border p-1">
                  <div className="flex justify-center">
                    <p className="font-bold text-sm">{floor}</p>
                  </div>
                  <div className="text-[8px] flex justify-center">
                    <p>22/04/68 12:09</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default OrderList;
