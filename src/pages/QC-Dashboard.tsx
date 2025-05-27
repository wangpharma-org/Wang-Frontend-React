import accept from "../assets/accept.png";
import incorect from "../assets/incorrect.png";
import warning from "../assets/warning.png";
import box from "../assets/return-box.png";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { data } from "react-router";

export interface Root {
  sh_running: string;
  sh_datetime: string;
  shoppingOrders: ShoppingOrder[];
  members: Members;
}

export interface ShoppingOrder {
  so_amount: number;
  so_unit: string;
  picking_status: string;
  emp_code_floor_picking: string;
  so_picking_time: string;
  so_qc_deficit: number;
  so_qc_note: string;
  so_already_qc: string;
  product: Product;
}

export interface Product {
  product_code: string;
  product_name: string;
  product_barcode: string;
  product_floor: string;
}

export interface Members {
  mem_code: string;
  mem_name: string;
  mem_note: string;
  province: string;
}

export type ShoppingHead = Root[];
export type ShoppingHeadOne = Root;

const QCDashboard = () => {
  const [dataQC, setDataQC] = useState<ShoppingHead | ShoppingHeadOne | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [wantConnect, setWantConnect] = useState<boolean>(false);
  const [mem_code, setMem_code] = useState<string | null>(null);
  const [sh_running, setSh_running] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    console.log(token);
    console.log(`${import.meta.env.VITE_API_URL_ORDER}/socket/qc/dashboard`);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/qc/dashboard`,
      {
        path: "/socket/qc",
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      //   if (wantConnect === true && mem_code) {
      //     newSocket.emit("join_room", {mem_code: mem_code, sh_running: null});
      //     setLoading(true);
      //   }
      //   if (wantConnect === true && sh_running) {
      //     newSocket.emit("join_room", {mem_code: null, sh_running: sh_running});
      //     setLoading(true);
      //   }
    });

    newSocket.on("qcdata", (data) => {
      console.log("Received data:", data);
      setDataQC(data);
      setLoading(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      setDataQC(null);
      setLoading(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleConnect = (some_value: string) => {
    console.log(socket?.connected);
    if (socket?.connected) {
      if (some_value.length === 10) {
        setSh_running(some_value);
        setMem_code(null);
        setWantConnect(true);
        EmitJoinRoom();
      } else {
        setMem_code(some_value);
        setSh_running(null);
        setWantConnect(true);
        EmitJoinRoom();
      }
      //   socket.emit("join_room", { mem_code, sh_running });
    } else {
      console.error("❌ Socket is not initialized");
    }
  };

  const EmitJoinRoom = () => {
    if (socket && wantConnect) {
      if (mem_code) {
        socket.emit("join_room", { mem_code, sh_running: null });
      } else if (sh_running) {
        socket.emit("join_room", { mem_code: null, sh_running });
      }
      setWantConnect(true);
    } else {
      console.error("❌ Socket is not initialized");
    }
  };

  const handleClear = () => {
    setDataQC([]);
    setLoading(false);
    setWantConnect(false);
    setMem_code(null);
    setSh_running(null);
    if (socket) {
      socket.emit("leave_room", { mem_code, sh_running });
      console.log("✅ Left room");
    }
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-center mt-7">
          เส้นทางที่สามารถทำงานได้
        </h1>
        <p className="mt-2">
          หาดใหญ่ , สงขลา , สะเดา , ปัตตานี , สตูล , นราธิวาส , สุไหงโกลก , ยะลา
          , เบตง , นครศรี ฯ , รับเอง , อื่นๆ , สทิงพระ , ภูเก็ต , สุราษฏร์ธานี ,
          พังงา , ยาแห้ง ส่งฟรี ทั่วไทย , พัทลุง-นคร , ชุมพร , กระบี่ - ตรัง
        </p>
        <div className="w-full mt-5 h-8 px-6">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-1 bg-blue-50 p-4 rounded-xl">
                <button className="bg-green-500 text-white p-2 px-6 rounded-lg hover:bg-green-600 cursor-pointer" onClick={() => handleClear()}>ล้างข้อมูล</button>
              {Array.from({ length: 6 }).map((_, index) => {
                const bill = Array.isArray(dataQC)
                  ? dataQC[index]
                  : index === 0
                  ? dataQC
                  : null;
                const shRunning = bill ? bill.sh_running : null;
                return (
                  <div key={index} className="bg-blue-400 p-2 rounded-lg mt-3">
                    <p className="text-lg text-white font-bold">
                        หมายเลขบิลที่ {index + 1}
                    </p>
                    <div className="flex items-center gap-1.5 justify-center mt-1">
                      <input
                        className="bg-white w-5/6 h-12 text-center placeholder-gray-500 rounded-sm text-xl"
                        placeholder="หมายเลขบิล"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleConnect(e.currentTarget.value);
                          }
                        }}
                        value={shRunning ?? ''}
                      ></input>
                      <div className="px-4 py-2 bg-white rounded-sm">
                        <p className="text-green-600 font-bold text-2xl">
                            {bill ? bill.shoppingOrders.length : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="col-span-4 bg-blue-50 rounded-xl">
              <div>
                <div className="grid grid-cols-2 p-4 gap-2">
                  <div className="col-span-1">
                    <p className="text-red-600 font-black text-lg">
                      ** ด่วน **
                    </p>
                    <div className="bg-white  rounded-lg mt-2 grid grid-cols-2 items-center border-4 border-blue-400">
                      <p className="text-4xl font-bold border-r-3 py-5 mr-10 border-blue-400">
                        {Array.isArray(dataQC)
                          ? dataQC[0].members.mem_code
                          : dataQC
                          ? dataQC?.members.mem_code
                          : "-"}
                      </p>
                      <div className="p-2 pr-10">
                        <p className="text-2xl font-bold border-b-3 pb-2 mb-2 border-blue-400">
                          {Array.isArray(dataQC)
                            ? dataQC[0].members.mem_name
                            : dataQC
                            ? dataQC?.members.mem_name
                            : "-"}
                        </p>
                        <p className="text-lg">
                          {Array.isArray(dataQC)
                            ? dataQC[0].members.province
                            : dataQC
                            ? dataQC?.members.province
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <p className="text-black font-black text-lg">
                      เงื่อนไขการบรรจุสินค้า และการตรวจสอบ ของลูกค้านี้
                    </p>
                    <div className="bg-white  rounded-lg mt-2 items-start border-4 border-red-400 py-4.5 px-2">
                      <p className="text-lg font-semibold text-center p-1">
                        *** เงื่อนไข ***
                      </p>
                      <p className="">
                        {Array.isArray(dataQC)
                          ? dataQC[0]?.members?.mem_note ?? "-"
                          : dataQC?.members?.mem_note ?? "-"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center px-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-6xl">
                    <div className="bg-white w-full text-3xl border-4 border-green-500 rounded-lg flex">
                      <div className="w-1/2 flex justify-center items-center">
                        <img
                          src={accept}
                          className="w-12 h-auto object-cover"
                        />
                      </div>
                      <div className="w-1 bg-green-500"></div>
                      <div className="w-1/2 flex justify-center items-center p-3">
                        <p className="text-center text-3xl font-bold">{2}</p>
                      </div>
                    </div>
                    <div className="bg-white w-full text-3xl border-4 border-red-500 rounded-lg flex">
                      <div className="w-1/2 flex justify-center items-center">
                        <img
                          src={incorect}
                          className="w-12 h-auto object-cover"
                        />
                      </div>
                      <div className="w-1 bg-red-500"></div>
                      <div className="w-1/2 flex justify-center items-center p-3">
                        <p className="text-center text-3xl font-bold">{2}</p>
                      </div>
                    </div>
                    <div className="bg-white w-full text-3xl border-4 border-yellow-500 rounded-lg flex">
                      <div className="w-1/2 flex justify-center items-center">
                        <img
                          src={warning}
                          className="w-12 h-auto object-cover"
                        />
                      </div>
                      <div className="w-1 bg-yellow-500"></div>
                      <div className="w-1/2 flex justify-center items-center p-3">
                        <p className="text-center text-3xl font-bold">{2}</p>
                      </div>
                    </div>
                    <div className="bg-white w-full text-3xl border-4 border-red-500 rounded-lg flex">
                      <div className="w-1/2 flex justify-center items-center">
                        <img src={box} className="w-12 h-auto object-cover" />
                      </div>
                      <div className="w-1 bg-red-500"></div>
                      <div className="w-1/2 flex justify-center items-center p-3">
                        <p className="text-center text-3xl font-bold">{2}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-3 mt-3 px-4">
                <div className="col-span-1 border-green-500 border-4 bg-white p-2 px-5 rounded-lg">
                  <p>หยิบแล้ว</p>
                  <p className="text-2xl font-bold text-green-600">{2}</p>
                </div>
                <div className="col-span-1 border-red-500 border-4 bg-white p-2 px-5  rounded-lg">
                  <p>ยังไม่หยิบ</p>
                  <p className="text-2xl font-bold text-red-600">{2}</p>
                </div>
                <input
                  className="col-span-6 border-orange-500 border-4 p-2 px-5 rounded-lg text-4xl text-center bg-orange-100"
                  placeholder="รหัสสินค้า / Barcode"
                ></input>
              </div>
              <div className="px-4 mt-3">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-400 text-white">
                      <th className="p-2">ที่</th>
                      <th className="p-2">คนจัด</th>
                      <th className="p-2">รหัสสินค้า</th>
                      <th className="p-2">หมายเลขบาร์โค้ด</th>
                      <th className="p-2">รายละเอียด</th>
                      <th className="p-2">จำนวนสั่ง</th>
                      <th className="p-2">ขาด</th>
                      <th className="p-2">หน่วย</th>
                      <th className="p-2">สถานะ</th>
                      <th className="p-2">หมายเหตุ</th>
                      <th className="p-2">พิมพ์จองสินค้า</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white py-5">
                    <tr className="hover:bg-gray-50">
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        1
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-lg">ชั้น {4}</p>
                          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full mt-1"></div>
                        </div>
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-lg">{4545345}</p>
                          <p className="text-base text-red-600 font-bold">
                            ยังไม่จัด
                          </p>
                        </div>
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-lg">{23454545345}</p>
                        </div>
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-lg border-b-2 pb-1.5 mb-1.5 border-blue-400">
                            -อุทัยทิพย์/ขวด50มล42บ24*1ลัง/ใหม่190466
                          </p>
                          <div className="flex justify-between w-full px-10">
                            <p className="text-base text-blue-500 font-bold">
                              รับเข้า
                            </p>
                            <p className="text-base">{15}</p>
                          </div>
                          <div className="flex justify-between w-full px-10">
                            <p className="text-base text-blue-500 font-bold">
                              จำนวน
                            </p>
                            <p className="text-base">{15}</p>
                          </div>
                          <div className="flex justify-between w-full px-10">
                            <p className="text-base text-blue-500 font-bold">
                              เลขคีย์ใบซื้อ
                            </p>
                            <p className="text-base">{15}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <div>
                          <p className="text-xl font-bold">15</p>
                          <p className="text-base text-blue-500">ใบขาว</p>
                        </div>
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <p className="text-2xl font-bold text-red-600">2</p>
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <p className="text-xl font-bold">ขวด</p>
                        <p className="text-base text-blue-500">ใบขาว</p>
                      </td>
                      <td className="py-4 text-lg border-r-2 border-blue-400">
                        <div className="flex items-center justify-center">
                          <img src={incorect} className="w-12"></img>
                        </div>
                      </td>
                      <td className="py-4 text-sm border-r-2 border-blue-400 ">
                        <div className="flex flex-col space-y-1 px-2">
                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`qc_status_`}
                              value="ขาด"
                              className="text-blue-600"
                            />
                            <span className="text-base font-bold text-blue-800">
                              ขาด
                            </span>
                          </label>

                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`qc_status_`}
                              value="ไม่ครบ"
                              className="text-blue-600"
                            />
                            <span className="text-base font-bold text-green-700">
                              ไม่ครบ
                            </span>
                          </label>

                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`qc_status_`}
                              value="หยิบผิด"
                              className="text-blue-600"
                            />
                            <span className="text-base font-bold text-blue-500">
                              หยิบผิด
                            </span>
                          </label>

                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`qc_status_`}
                              value="หยิบเกิน"
                              className="text-blue-600"
                            />
                            <span className="text-base font-bold text-orange-500">
                              หยิบเกิน
                            </span>
                          </label>

                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`qc_status_`}
                              value="ไม่มีของ"
                              className="text-blue-600"
                            />
                            <span className="text-base font-bold text-red-600">
                              ไม่มีของ
                            </span>
                          </label>
                        </div>
                      </td>
                      <td className="py-4 text-lg">
                        <div className="flex flex-col space-y-2 px-3">
                          <button className="bg-blue-500 p-1 rounded-lg text-base text-white hover:bg-blue-600 cursor-pointer">
                            ขอใหม่
                          </button>
                          <button className="bg-red-500 p-1 rounded-lg text-base text-white hover:bg-red-600 cursor-pointer">
                            ส่ง RT
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-span-1 bg-blue-50 rounded-xl">Test</div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default QCDashboard;
