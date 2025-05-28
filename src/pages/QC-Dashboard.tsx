import accept from "../assets/accept.png";
import incorect from "../assets/incorrect.png";
import warning from "../assets/warning.png";
import box from "../assets/return-box.png";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Modal from "../components/ModalQC";
import Barcode from "react-barcode";
import axios from "axios";
import { data } from "react-router";

export interface Root {
  sh_running: string;
  sh_datetime: string;
  shoppingOrders: ShoppingOrder[];
  members: Members;
}

export interface ShoppingOrder {
  so_running: string;
  so_amount: number;
  so_unit: string;
  picking_status: string;
  emp_code_floor_picking: string;
  so_picking_time: string;
  so_qc_deficit: number;
  so_qc_note: string;
  so_already_qc: string;
  so_qc_amount: number;
  product: Product;
}

export interface Product {
  product_code: string;
  product_name: string;
  product_barcode: string;
  product_floor: string;
  product_unit: string;
  product_stock: string;
  product_image_url: string;
  so_picking_time: string;
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
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [InputValues, setInputValues] = useState<string[]>(Array(6).fill(""));
  const [hasNotQC, setHasnotQC] = useState<number>(0);
  const [hasQC, setHasQC] = useState<number>(0);
  const [hasPicked, setHasPicked] = useState<number>(0);
  const [hasNotPicked, setHasNotPicked] = useState<number>(0);
  const [inComplete, setInComplete] = useState<number>(0);
  const [RT, setRT] = useState<number>(0);
  const [order, setOrder] = useState<ShoppingOrder[]>([]);
  const inputBill = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderForQC, setOrderForQC] = useState<ShoppingOrder>();

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

  useEffect(() => {
    if (socket && wantConnect) {
      if (mem_code) {
        socket.emit("join_room", { mem_code, sh_running: null });
        setLoading(true);
      } else if (sh_running) {
        socket.emit("join_room", { mem_code: null, sh_running });
        setLoading(true);
      }
    }
  }, [mem_code, sh_running, socket, wantConnect]);

  useEffect(() => {
    if (dataQC) {
      const values = Array(6).fill("");
      if (Array.isArray(dataQC)) {
        dataQC.forEach((bill, index) => {
          if (index < 6) {
            values[index] = bill.sh_running;
          }
        });
      } else {
        values[0] = dataQC.sh_running;
      }
      setInputValues(values);
    }
    if (dataQC) {
      const shoppingOrder = Array.isArray(dataQC)
        ? dataQC.flatMap((bill) => bill.shoppingOrders)
        : dataQC.shoppingOrders;
      const notQC = shoppingOrder?.filter(
        (so) => so.so_already_qc === "No"
      ).length;
      const isQC = shoppingOrder?.filter(
        (so) => so.so_already_qc === "Yes"
      ).length;
      const inComplete = shoppingOrder?.filter(
        (so) => so.so_already_qc === "InComplete"
      ).length;
      const rt = shoppingOrder?.filter(
        (so) => so.so_already_qc === "RT"
      ).length;
      const picked = shoppingOrder?.filter(
        (so) => so.picking_status === "picking"
      ).length;
      const notPicked = shoppingOrder?.filter(
        (so) => so.picking_status === "pending"
      ).length;
      setOrder(shoppingOrder);
      console.log(shoppingOrder);
      setHasnotQC(notQC);
      setHasQC(isQC);
      setHasPicked(picked);
      setHasNotPicked(notPicked);
      setInComplete(inComplete);
      setRT(rt);
    }
  }, [dataQC]);

  const handleConnect = (some_value: string) => {
    console.log(socket?.connected);
    if (socket?.connected) {
      if (some_value.length === 10) {
        setSh_running(some_value);
        setMem_code(null);
      } else {
        setMem_code(some_value);
        setSh_running(null);
      }
      setIsInputLocked(true);
      setWantConnect(true);
    } else {
      console.error("❌ Socket is not initialized");
    }
  };

  const handleClear = () => {
    inputBill.current?.focus();
    setOrder([]);
    setRT(0);
    setInComplete(0);
    setDataQC(null);
    setLoading(false);
    setWantConnect(false);
    setHasPicked(0);
    setHasNotPicked(0);
    setMem_code(null);
    setSh_running(null);
    setIsInputLocked(false);
    setHasnotQC(0);
    setInputValues(Array(6).fill(""));
    if (socket) {
      socket.emit("leave_room", { mem_code, sh_running });
      console.log("✅ Left room");
    }
  };

  const handleScan = async (barcode: string) => {
    const foundOrder = order.find((o) => o.product.product_barcode === barcode);
    if (foundOrder) {
      const so_running = foundOrder.so_running;
      console.log("so_running ที่เจอ:", so_running);
      const data = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/qc/get-order/${so_running}`
      );
      setOrderForQC(data.data);
    } else {
      console.log("ไม่พบ barcode นี้ใน order");
    }
    // const so_running = order.find()
    // const data = await axios.get(`${import.meta.env.VITE_API_URL_ORDER}/api/qc/${}`)
  };

  useEffect(() => {
    console.log(orderForQC);
    if (orderForQC) {
      setModalOpen(true);
    }
  }, [orderForQC]);

  return (
    <div>
      <button className="bg-amber-500 px-3" onClick={() => setModalOpen(true)}>
        เปิด Modal
      </button>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex justify-between border-b-2 pb-3 border-gray-200">
          <div className="text-red-600">
            <p className="text-xl">{orderForQC?.product?.product_code}</p>
            <p className="text-lg">{orderForQC?.product?.product_name}</p>
          </div>
          <div className="text-green-600">
            <p className="text-xl">
              {Array.isArray(dataQC)
                ? dataQC.length > 0
                  ? dataQC[0]?.members?.mem_name
                  : "ไม่มีเลขบิล"
                : dataQC
                ? dataQC?.members?.mem_name
                : "-"}
            </p>
            <p className="text-lg">
              {Array.isArray(dataQC)
                ? dataQC.length > 0
                  ? dataQC[0]?.members?.mem_code
                  : "ไม่มีเลขบิล"
                : dataQC
                ? dataQC?.members?.mem_code
                : "-"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-7 mt-6">
          <div className="col-span-3">
            <img
              src={orderForQC?.product?.product_image_url}
              className="w-sm drop-shadow-xl rounded-lg"
            ></img>
          </div>
          <div className="col-span-4">
            <div className="text-center">
              <div className="w-full flex justify-center">
                <div className="text-sm font-normal">
                  <Barcode
                    value={orderForQC?.product?.product_barcode}
                    format="CODE128"
                    width={1.2}
                    height={25}
                    displayValue={true}
                    fontSize={11}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold">{43345434}</p>
              <p className="text-xl mt-2 font-bold">
                {orderForQC?.product?.product_name}
              </p>
              <div className="flex justify-between px-30 mt-3">
                <div className="flex gap-2">
                  <p className="text-xl">คงเหลือ</p>
                  <p className="text-xl font-bold text-green-700">
                    {orderForQC?.product?.product_stock}
                  </p>
                  <p className="text-xl">{orderForQC?.product?.product_unit}</p>
                </div>
                <div className="flex gap-2 font-bold">
                  <p className="text-xl">ชั้น</p>
                  <p className="text-xl text-red-700">
                    {orderForQC?.product?.product_floor}
                  </p>
                </div>
              </div>
              <div className="flex justify-between px-30 mt-2">
                <div className="flex gap-2">
                  <p className="text-xl">ซื้อล่าสุด</p>
                  <p className="text-xl">วันที่</p>
                </div>
                <div className="flex gap-2">
                  <p className="text-xl">30.00</p>
                  <p className="text-xl">ขวด</p>
                </div>
              </div>
              <div className="flex w-full justify-center mt-5">
                <div className="flex gap-2 text-5xl">
                  <p>คนหยิบ</p>
                  <p>นาย</p>
                </div>
              </div>
              <div className="flex w-full justify-center mt-6">
                <div className="flex gap-2 text-4xl font">
                  <p>
                    {orderForQC?.so_picking_time &&
                      new Date(orderForQC.so_picking_time).toLocaleString(
                        "th-TH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                  </p>
                </div>
              </div>
              <div className="flex w-full justify-center mt-5">
                <div className="flex gap-2 items-center">
                  <p className="text-xl">จำนวนสั่งซื้อ</p>
                  <input className="border-3 text-4xl w-56 border-green-600 rounded-sm text-center text-green-800 font-bold" value={orderForQC?.so_qc_amount}></input>
                  <p className="text-xl">{orderForQC?.so_unit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-12 mt-15 border-b-2 pb-4 border-gray-200">
          <div className="p-2 bg-blue-500 text-white font-bold text-base rounded-sm">
            เช็ค Lot สินค้าให้เป็น Lot เดียวกันทุกตัว ลูกคืนคืนถ้า Lot
            ไม่ต้องการ
          </div>
          <div className="flex space-y-1 gap-4 items-center">
            <label className="inline-flex items-center space-x-2">
              <input
                type="radio"
                name={`qc_status_`}
                value="ขาด"
                className="text-blue-600"
              />
              <span className="text-base font-bold text-blue-800">ขาด</span>
            </label>

            <label className="inline-flex items-center space-x-2">
              <input
                type="radio"
                name={`qc_status_`}
                value="ไม่ครบ"
                className="text-blue-600"
              />
              <span className="text-base font-bold text-green-700">ไม่ครบ</span>
            </label>

            <label className="inline-flex items-center space-x-2">
              <input
                type="radio"
                name={`qc_status_`}
                value="หยิบผิด"
                className="text-blue-600"
              />
              <span className="text-base font-bold text-blue-500">หยิบผิด</span>
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
              <span className="text-base font-bold text-red-600">ไม่มีของ</span>
            </label>
            <button className="px-2 bg-green-500 py-1 rounded-lg text-white font-bold hover:bg-green-600 cursor-pointer">
              เคลียร์ค่า
            </button>
          </div>
        </div>
        {/* <button
          onClick={() => setModalOpen(false)}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md"
        >
          ปิด
        </button> */}
      </Modal>
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
            <div className="col-span-1 bg-blue-50 p-4 rounded-xl self-start">
              <button
                className="bg-green-500 text-white p-2 px-6 rounded-lg hover:bg-green-600 cursor-pointer"
                onClick={() => handleClear()}
              >
                ล้างข้อมูล
              </button>
              {Array.from({ length: 6 }).map((_, index) => {
                const bill = Array.isArray(dataQC)
                  ? dataQC[index]
                  : index === 0
                  ? dataQC
                  : null;

                return (
                  <div key={index} className="bg-blue-400 p-2 rounded-lg mt-3">
                    <p className="text-lg text-white font-bold">
                      หมายเลขบิลที่ {index + 1}
                    </p>
                    <div className="flex items-center gap-1.5 justify-center mt-1">
                      <input
                        className="bg-white w-5/6 h-12 text-center placeholder-gray-500 rounded-sm text-xl"
                        placeholder="หมายเลขบิล"
                        ref={index === 0 ? inputBill : null}
                        readOnly={isInputLocked}
                        onChange={(e) => {
                          const update = [...InputValues];
                          update[index] = e.target.value;
                          setInputValues(update);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleConnect(e.currentTarget.value);
                          }
                        }}
                        value={InputValues[index]}
                      ></input>
                      <div className="px-4 py-2 bg-white rounded-sm">
                        <p className="text-green-600 font-bold text-2xl">
                          {bill ? bill?.shoppingOrders?.length : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="col-span-4 bg-blue-50 rounded-xl self-start pb-5 mb-10">
              <div>
                <div className="grid grid-cols-2 p-4 gap-2">
                  <div className="col-span-1">
                    <p className="text-red-600 font-black text-lg">
                      ** ด่วน **
                    </p>
                    <div className="bg-white  rounded-lg mt-2 grid grid-cols-2 items-center border-4 border-blue-400">
                      <p className="text-4xl font-bold border-r-3 py-5 mr-10 border-blue-400">
                        {Array.isArray(dataQC)
                          ? dataQC.length > 0
                            ? dataQC[0]?.members?.mem_code
                            : "-"
                          : dataQC
                          ? dataQC?.members?.mem_code
                          : "-"}
                      </p>
                      <div className="p-2 pr-10">
                        <p className="text-2xl font-bold border-b-3 pb-2 mb-2 border-blue-400">
                          {Array.isArray(dataQC)
                            ? dataQC.length > 0
                              ? dataQC[0]?.members?.mem_name
                              : "ไม่มีเลขบิล"
                            : dataQC
                            ? dataQC?.members?.mem_name
                            : "-"}
                        </p>
                        <p className="text-lg">
                          {Array.isArray(dataQC)
                            ? dataQC.length > 0
                              ? dataQC[0]?.members?.province
                              : "-"
                            : dataQC
                            ? dataQC?.members?.province
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <p className="text-black font-black text-lg">
                      เงื่อนไขการบรรจุสินค้า และการตรวจสอบ ของลูกค้านี้
                    </p>
                    <div className="bg-white  rounded-lg mt-2 items-start border-4 border-red-400 py-4.5 px-2 h-26">
                      <p className="">
                        {Array.isArray(dataQC)
                          ? dataQC[0]?.members?.mem_note ?? "ไม่ระบุเงื่อนไข"
                          : dataQC?.members?.mem_note ?? "ไม่ระบุเงื่อนไข"}
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
                        <p className="text-center text-3xl font-bold">
                          {hasQC}
                        </p>
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
                        <p className="text-center text-3xl font-bold">
                          {hasNotQC}
                        </p>
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
                        <p className="text-center text-3xl font-bold">
                          {inComplete}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white w-full text-3xl border-4 border-red-500 rounded-lg flex">
                      <div className="w-1/2 flex justify-center items-center">
                        <img src={box} className="w-12 h-auto object-cover" />
                      </div>
                      <div className="w-1 bg-red-500"></div>
                      <div className="w-1/2 flex justify-center items-center p-3">
                        <p className="text-center text-3xl font-bold">{RT}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-3 mt-3 px-4">
                <div className="col-span-1 border-green-500 border-4 bg-white p-2 px-5 rounded-lg">
                  <p>หยิบแล้ว</p>
                  <p className="text-2xl font-bold text-green-600">
                    {hasPicked}
                  </p>
                </div>
                <div className="col-span-1 border-red-500 border-4 bg-white p-2 px-5  rounded-lg">
                  <p>ยังไม่หยิบ</p>
                  <p className="text-2xl font-bold text-red-600">
                    {hasNotPicked}
                  </p>
                </div>
                <input
                  className="col-span-6 border-orange-500 border-4 p-2 px-5 rounded-lg text-4xl text-center bg-orange-100"
                  placeholder="รหัสสินค้า / Barcode"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleScan(e.currentTarget.value);
                    }
                  }}
                ></input>
              </div>
              <div className="px-4 mt-3">
                <table className="w-full rounded-lg overflow-hidden">
                  <thead className="bg-blue-400">
                    <tr className=" text-white rounded-lg">
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
                    {order?.length > 0 ? (
                      order.map((so, index) => {
                        return (
                          <tr className="hover:bg-gray-50 border-b-2 border-blue-200">
                            <td className="py-4 text-lg border-r-2 border-blue-200 font-semibold px-2">
                              {index + 1}
                            </td>
                            <td className="py-4 text-lg border-r-2 border-blue-200">
                              <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-lg">
                                  ชั้น {so?.product?.product_floor || "ชั้น 1"}
                                </p>
                                <div
                                  className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full mt-1 ${
                                    so.product.product_floor === "5"
                                      ? "bg-green-500"
                                      : so.product.product_floor === "4"
                                      ? "bg-red-500"
                                      : so.product.product_floor === "3"
                                      ? "bg-blue-500"
                                      : so.product.product_floor === "2"
                                      ? "bg-yellow-500"
                                      : "bg-gray-400"
                                  } `}
                                ></div>
                              </div>
                            </td>
                            <td className="py-4 text-lg border-r-2 border-blue-200 px-1">
                              <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-lg">
                                  {so?.product?.product_code}
                                </p>
                                <p
                                  className={`text-base font-bold ${
                                    so?.picking_status === "pending"
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {so?.picking_status === "pending"
                                    ? "ยังไม่จัด"
                                    : "จัดแล้ว"}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 text-lg border-r-2 border-blue-200">
                              <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-lg">
                                  {so?.product?.product_barcode}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 text-lg border-r-2 border-blue-200">
                              <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-lg pb-1.5">
                                  {so?.product?.product_name}
                                </p>
                                <div className="w-full px-3.5">
                                  <div className="border-t-2 border-blue-200 w-full mb-1.5"></div>
                                </div>
                                <div className="flex justify-between w-full px-10 ">
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
                            <td className="py-4 text-lg border-r-2 border-blue-200">
                              <div>
                                <p className="text-xl font-bold">
                                  {so.so_amount - so.so_qc_amount}
                                </p>
                                <p className="text-base text-blue-500">ใบขาว</p>
                              </div>
                            </td>
                            <td className="py-4 text-lg border-r-2 border-blue-200">
                              <p className="text-2xl font-bold text-red-600">
                                2
                              </p>
                            </td>
                            <td className="py-4 text-lg border-r-2 border-blue-200">
                              <p className="text-xl font-bold">{so.so_unit}</p>
                              <p className="text-base text-blue-500">ใบขาว</p>
                            </td>
                            <td className="py-4 text-lg border-r-2 border-blue-200">
                              <div className="flex items-center justify-center">
                                <img src={incorect} className="w-10"></img>
                              </div>
                            </td>
                            <td className="py-4 text-sm border-r-2 border-blue-200">
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
                                <button className="px-2 bg-green-500 py-1 rounded-lg mt-1 text-white font-bold hover:bg-green-600 cursor-pointer">
                                  เคลียร์ค่า
                                </button>
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
                        );
                      })
                    ) : (
                      <tr></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-span-1 bg-blue-50 rounded-xl self-start">
              Test
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default QCDashboard;
