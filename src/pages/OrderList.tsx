import Clock from "../components/Clock";
import { useState, useEffect } from "react";
import { Socket, io } from "socket.io-client";

const OrderList = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [orderList, setOrderList] = useState<null[]>([]);
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
      if (socket?.connected) {
        socket.emit("listorder:get");
      }
    });

    newSocket.on("listorder:get", (data) => {
      console.log(data);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);
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
            <div className="flex justify-center text-sm">
              <p>ร้านล่าสุด เวลา</p>
            </div>
            <div className="flex justify-center text-xs">
              <p>ทั้งหมด 0 ร้าน 0 รายการ</p>
            </div>
            <div className="flex justify-center text-xs">
              <p>เหลือจัด 0 รายการ</p>
              &nbsp;<p>|</p>&nbsp;
              <p>กำลังจัด 0 รายการ</p>
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
        <div className="flex justify-center font-bold text-2xl">
          <p>Loading...</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-gray-100 w-full">
          <div className="mt-2 px-2 w-full">
            <div className="w-full p-1 rounded-sm shadow-xl text-[10px] border cursor-pointer text-[#444444] bg-[#E6E6E6]">
              <div className="p-2 rounded-sm bg-[#E6E6E6] m-1">
                <div className="flex justify-between">
                  <div className="flex justify-start">
                    <p>MEM_CODE</p>&nbsp;<p>MEM_NAME</p>
                  </div>
                  <div>
                    <p>01/05/2025 12:00:00</p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="flex justify-start">
                    <p className="text-gray-600">ผู้ดูแล</p>&nbsp;
                    <p>EMP_NICKNAME</p>
                  </div>
                  <div className="flex justify-center">
                    <p>(PROVINCE)</p>
                  </div>
                  <div className="flex justify-end pb-1">
                    <p className="font-bold">3</p>
                    <p>บิล</p>
                    <p className="text-red-500 font-bold">2</p>
                    <p>/</p>
                    <p className="text-violet-500 font-bold">5</p>
                    <p>(เหลือ/All)</p>
                    <p>FLOOR</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="border-x-1 px-1 pt-1">
                    <div className="flex justify-center text-sm font-bold">
                      <p>F</p>
                      <p>1</p>
                    </div>
                    <div className="flex justify-center text-xs px-1">
                      <p>เหลือ</p>&nbsp;<p className="font-bold">5</p>&nbsp;
                      <p>รก.</p>
                    </div>
                  </div>
                  {/* Add more floor blocks as needed */}
                </div>

                <div className="flex justify-between pt-2">
                  <div className="flex justify-start">
                    <div className="flex justify-start">
                      <p>[EMP_CODE]</p>&nbsp;
                      <p className="text-amber-600 font-bold">EMP_PICKER</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <p>EMP_NICKNAME</p>
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
            </div>

            <div className="w-full bg-white border border-gray-300 rounded-b shadow-lg z-50">
              <ul>
                <li className="px-2 pb-2 text-xs">
                  <hr />
                  <div className="flex justify-between pt-1">
                    <div className="flex justify-start">
                      <p className="font-bold">1.</p>
                      <p>SH_RUNNING</p>
                    </div>
                    <p className="bg-[#8249EC] p-1 rounded-sm text-xs text-white">
                      5 รายการ
                    </p>
                  </div>
                  <div>
                    <p>เปิดบิล: 01/05/2025 12:00:00</p>
                  </div>
                  <div className="flex justify-start">
                    <p className="text-green-500 font-bold">EMP_NICKNAME</p>
                    &nbsp;<p className="text-red-500">กำลังทำงานอยู่</p>
                  </div>
                </li>
                <button className="border rounded-b-sm px-3 py-1 text-xs w-full bg-lime-600 text-white hover:bg-lime-700">
                  จัดแบบรวมบิล
                </button>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer flex items-end justify-center">
          <div>
            <div className="p-2 flex justify-around">
              <div>
                <button className="border border-gray-500 rounded-sm bg-orange-300 shadow-lg p-1">
                  ชั้น 1
                </button>
              </div>
              <div>
                <button className="border border-gray-500 rounded-sm bg-[#e3e38d] shadow-lg p-1">
                  ชั้น 2
                </button>
              </div>
              <div>
                <button className="border border-gray-500 rounded-sm bg-[#8d9ae3] shadow-lg p-1">
                  ชั้น 3
                </button>
              </div>
              <div>
                <button className="border border-gray-500 rounded-sm bg-[#e38d90] shadow-lg p-1">
                  ชั้น 4
                </button>
              </div>
              <div>
                <button className="border border-gray-500 rounded-sm bg-[#a0dba3] shadow-lg p-1">
                  ชั้น 5
                </button>
              </div>
              <div>
                <button className="border border-gray-500 rounded-sm bg-[#b58de3] shadow-lg p-1">
                  ยกลัง
                </button>
              </div>
            </div>

            <div className="flex justify-around p-1">
              <div className="border p-1">
                <div className="flex justify-center">
                  <p className="font-bold text-sm">F2</p>
                </div>
                <div className="text-[10px] flex justify-center">
                  <p>22/04/68 12:09</p>
                </div>
              </div>
              <div className="border p-1">
                <div className="flex justify-center">
                  <p className="font-bold text-sm">F3</p>
                </div>
                <div className="text-[10px] flex justify-center">
                  <p>22/04/68 12:09</p>
                </div>
              </div>
              <div className="border p-1">
                <div className="flex justify-center">
                  <p className="font-bold text-sm">F4</p>
                </div>
                <div className="text-[10px] flex justify-center">
                  <p>22/04/68 12:09</p>
                </div>
              </div>
              <div className="border p-1">
                <div className="flex justify-center">
                  <p className="font-bold text-sm">F5</p>
                </div>
                <div className="text-[10px] flex justify-center">
                  <p>22/04/68 12:09</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderList;
