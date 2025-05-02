import Clock from "../components/Clock";
import { useState, useEffect } from "react";
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
  const [selectedOption, setSelectedOption] = useState('เลือกตัวเลือก');

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
  }, [orderList]);

  return (
    <div>
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

      <div className="content overflow-y-auto">
        {loading && (
          <div className="flex justify-center font-bold text-2xl">
            <p>Loading...</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 bg-gray-100 w-full">
          {orderList.map((order) => {
            const allFloors = ["2", "3", "4", "5"];

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
                className="mt-2 px-2 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-gray-100"
              >
                <div className="w-full p-1 rounded-sm shadow-xl text-[10px] border cursor-pointer text-[#444444] bg-[#E6E6E6]">
                  <div className="p-2 rounded-sm bg-[#E6E6E6] m-1">
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

                    <div className="flex justify-center">
                      {allFloors.map((floor) => {
                        const data = floorSummary[floor] || {
                          total: 0,
                          remaining: 0,
                        };
                        return (
                          <div key={floor} className="border-x-1 px-1 pt-1">
                            <div className="flex justify-center text-sm font-bold">
                              <p>F</p>
                              <p>{floor}</p>
                            </div>
                            <div className="flex justify-center text-xs px-1">
                              <p>เหลือ</p>&nbsp;
                              <p className="font-bold">{data.remaining}</p>
                              &nbsp;
                              <p>รก.</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between pt-2">
                      <div className="flex justify-start">
                        <div className="flex justify-start">
                          <p>[{order.emp_code}]</p>&nbsp;
                          <p className="text-amber-600 font-bold">
                            {order.emp_picking.emp_nickname}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <p>{order.emp.emp_nickname}</p>
                      </div>
                      <div className="flex justify-center">
                        <div className="pr-1">
                          <button className="border rounded-sm px-2 py-1 bg-[#00A65A] text-white shadow-xl border-gray-300">
                            ยืนยัน
                          </button>
                        </div>
                        <div className="pr-1">
                          <button className="border rounded-sm px-2 py-1 bg-amber-400 text-white shadow-xl border-gray-300">
                            เปลี่ยน
                          </button>
                        </div>
                        <div className="pr-1">
                          <button className="border rounded-sm px-2 py-1 bg-amber-400 text-white shadow-xl border-gray-300">
                            เริ่มจัด
                          </button>
                        </div>
                        <div>
                          <button className="border rounded-sm px-2 py-1 bg-blue-400 text-white shadow-xl border-gray-300">
                            🖨️STK
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-white border border-gray-300 rounded-b shadow-lg z-50">
                    <ul>
                      {order.shoppingHeads.map((sh, index) => (
                        <li key={sh.sh_id} className="px-2 pb-2 text-xs">
                          <hr />
                          <div className="flex justify-between pt-1">
                            <div className="flex justify-start">
                              <p className="font-bold">{index + 1}.</p>
                              <p>{sh.sh_running}</p>
                            </div>
                            <p className="bg-[#8249EC] p-1 rounded-sm text-xs text-white">
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
                            &nbsp;<p className="text-red-500">กำลังทำงานอยู่</p>
                          </div>
                        </li>
                      ))}
                      <button className="border rounded-b-sm px-3 py-1 text-xs w-full bg-lime-600 text-white hover:bg-lime-700">
                        จัดแบบรวมบิล
                      </button>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default OrderList;
