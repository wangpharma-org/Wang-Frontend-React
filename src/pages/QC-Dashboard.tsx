import accept from "../assets/accept.png";
import incorect from "../assets/incorrect.png";
import warning from "../assets/warning.png";
import box from "../assets/return-box.png";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Modal from "../components/ModalQC";
import Barcode from "react-barcode";
import axios from "axios";
import prepareIcon from "../assets/received.png";
import QCIcon from "../assets/quality-control.png";
import PackingIcon from "../assets/package-delivered.png";

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
  sh_running: string;
  picking_status: string;
  emp_code_floor_picking: string;
  so_picking_time: string;
  so_qc_deficit: number;
  so_qc_note: string | null;
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
  attribute: ProductAttr[];
  productDetail: ProductDetail;
}

export interface ProductDetail {
  created_at: number;
  purchase_entry_no: string;
  quantity: number;
  unit: string;
}

export interface ProductAttr {
  product_att_id: number;
  product_code: string;
  product_img_url: string;
  created_at: string;
}

export interface Members {
  mem_code: string;
  mem_name: string;
  mem_note: string;
  province: string;
  mem_route: MemRoute;
}

export interface Employees {
  emp_id: number;
  emp_code: string;
  created_at: string;
  updated_at: string;
  emp_name: string;
  emp_nickname: string;
  emp_tel: string | null;
  emp_floor: string | null;
  restricted_qc: string[] | null;
}

export interface MemRoute {
  route_code: string;
  route_name: string;
}

export interface dataForEmp {
  dataEmp: Employees;
  mem_route: MemRoute[];
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
  const [countBox, setCountBox] = useState<number>(1);

  // Modal Open QC
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Modal Request more product
  const [modalReqestOpen, setModalRequestOpen] = useState<boolean>(false);
  const [dataRequest, setDataRequest] = useState<ShoppingOrder | null>(null);
  const [amountRequest, setAmountRequest] = useState<number>(1);

  // Data State
  const [orderForQC, setOrderForQC] = useState<ShoppingOrder>();
  const [order, setOrder] = useState<ShoppingOrder[]>([]);
  const [hasNotQC, setHasnotQC] = useState<number>(0);
  const [hasQC, setHasQC] = useState<number>(0);
  const [hasPicked, setHasPicked] = useState<number>(0);
  const [hasNotPicked, setHasNotPicked] = useState<number>(0);
  const [inComplete, setInComplete] = useState<number>(0);
  const [RT, setRT] = useState<number>(0);
  const [shRunningArray, setSHRunningArray] = useState<
    string[] | string | null
  >(null);

  // State ของ AutoFocus
  const inputBill = useRef<HTMLInputElement>(null);
  const inputBarcode = useRef<HTMLInputElement>(null);
  const inputRefEmpPrepare = useRef<HTMLInputElement>(null);
  const inputRefEmpQC = useRef<HTMLInputElement>(null);
  const inputRefEmpPacked = useRef<HTMLInputElement>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  // State ของ Input พนักงาน
  const [prepareEmp, setPrepareEmp] = useState<dataForEmp>();
  const [QCEmp, setQCEmp] = useState<dataForEmp>();
  const [packedEMP, setPackedEmp] = useState<dataForEmp>();
  const [inputPrepare, setInputPrepare] = useState<string>("");
  const [inputQC, setInputQC] = useState<string>("");
  const [inputPacked, setInputPacked] = useState<string>("");

  // State ของ Modal QC
  const [qcNote, setQCNote] = useState<string | null>(null);
  const [qcAmount, setQCAmount] = useState<number>(0);
  const [oldQCAmount, setOldQCAmount] = useState<number>(0);

  // State ของการยืนยัน Order
  const [submitSuccess, setSubmitSucess] = useState<boolean>(false);
  const [submitFailed, setSubmitFailed] = useState<boolean>(false);

  // State ของการจำกัดเส้นทาง
  const [restrictedQC, setRestrictedQC] = useState<string[] | null>(null);
  const [route, setRoute] = useState<MemRoute[] | null>(null);

  // ทำให้รหัสพนักงานไม่หายเมื่อ Refresh
  useEffect(() => {
    if (prepareEmp?.dataEmp?.emp_code) {
      setInputPrepare(
        `${prepareEmp.dataEmp.emp_code} ${
          prepareEmp.dataEmp.emp_nickname || ""
        }`
      );
    }
  }, [prepareEmp]);

  useEffect(() => {
    if (QCEmp?.dataEmp?.emp_code) {
      setInputQC(
        `${QCEmp.dataEmp.emp_code} ${QCEmp.dataEmp.emp_nickname || ""}`
      );
    }
    if (QCEmp?.dataEmp?.emp_code) {
      setRestrictedQC(QCEmp.dataEmp.restricted_qc);
    }
    if (QCEmp?.mem_route) {
      setRoute(QCEmp?.mem_route);
    }
  }, [QCEmp]);

  useEffect(() => {
    if (packedEMP?.dataEmp?.emp_code) {
      setInputPacked(
        `${packedEMP.dataEmp.emp_code} ${packedEMP.dataEmp.emp_nickname || ""}`
      );
    }
  }, [packedEMP]);

  // เริ่มต้นโปรแกรม

  useEffect(() => {
    console.log(`${import.meta.env.VITE_API_URL_ORDER}/socket/qc/dashboard`);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/qc/dashboard`,
      {
        path: "/socket/qc",
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

    const prepareEmpData = sessionStorage.getItem("prepare-emp");
    const QCEmpData = sessionStorage.getItem("qc-emp");
    const packedEmpData = sessionStorage.getItem("packed-emp");

    if (prepareEmpData) {
      setPrepareEmp(JSON.parse(prepareEmpData));
    }
    if (QCEmpData) {
      setQCEmp(JSON.parse(QCEmpData));
    }
    if (packedEmpData) {
      setPackedEmp(JSON.parse(packedEmpData));
    }

    if (!prepareEmpData) {
      inputRefEmpPrepare.current?.focus();
    } else if (!QCEmpData) {
      inputRefEmpQC.current?.focus();
    } else if (!packedEmpData) {
      inputRefEmpPacked.current?.focus();
    }

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // auto focus

  useEffect(() => {
    if (packedEMP && prepareEmp && QCEmp) {
      console.log("เข้าเงื่อนไข");
      console.log("inputBill ref:", inputBill.current);
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [packedEMP, prepareEmp, QCEmp]);

  useEffect(() => {
    if (isReady) {
      inputBill.current?.focus();
    }
  }, [isReady]);

  // เริ่มต่อ web socket

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
      const shRunningArray = Array.isArray(dataQC)
        ? dataQC.map((item) => item.sh_running)
        : dataQC.sh_running;
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
      inputBarcode.current?.focus();
      setSHRunningArray(shRunningArray);
    }
    if (dataQC) {
      if (Array.isArray(dataQC) && dataQC.length > 0) {
        if (restrictedQC?.includes(dataQC[0]?.members?.mem_route?.route_code)) {
          alert("คุณไม่มีสิทธิ์ทำงานในเส้นทางของลูกค้าคนนี้");
          handleClear();
        }
      }
    }
  }, [dataQC]);

  // Modal ขอสินค้าใหม่
  useEffect(() => {
    if (dataRequest) {
      setModalRequestOpen(true);
    }
  }, [dataRequest]);

  // ตรวจสอบว่าเป็นรหัสลูกค้าหรือเลขบิล
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

  // เคลียร์ข้อมูล

  const handleClear = () => {
    inputBill.current?.focus();
    setSubmitFailed(false);
    setSubmitSucess(false);
    setHasQC(0);
    setHasNotPicked(0);
    setHasnotQC(0);
    setInComplete(0);
    setRT(0);
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

  // ดึงข้อมูลสำหรับแสดงในหน้าขอสินค้าเพิ่ม

  const handleFetchData = async (so_running: string) => {
    const data = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/qc/get-order/${so_running}`
    );
    setDataRequest(data.data);
  };

  const handleRequestMore = async (
    so_running: string | null,
    amount: number
  ) => {
    if (so_running) {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/qc/request-qc`,
        {
          so_running,
          amount,
          sh_running: Array.isArray(dataQC) ? null : dataQC?.sh_running,
          mem_code: Array.isArray(dataQC)
            ? dataQC.length > 0
              ? dataQC[0]?.members?.mem_code
              : null
            : null,
        }
      );
      if (response.status === 201) {
        setModalRequestOpen(false);
      }
    } else {
      return;
    }
  };

  // ดึงข้อมูลสำหรับแสดงในหน้า QC ตอน Scan

  const handleScan = async (barcode: string) => {
    console.log(barcode);
    console.log("order", order);
    const foundOrder = order.find(
      (o) =>
        o.product.product_barcode === barcode &&
        o.so_already_qc !== "Yes" &&
        o.so_already_qc !== "RT"
    );
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
    if (inputBarcode.current) {
      inputBarcode.current.value = "";
    }
    // const so_running = order.find()
    // const data = await axios.get(`${import.meta.env.VITE_API_URL_ORDER}/api/qc/${}`)
  };

  const handleModalClose = () => {
    setModalOpen(false);
    inputBarcode.current?.focus();
  };

  // ดึง API ข้อมูลพนักงาน

  const handleGetDataEmp = async (emp_code: string, type_emp: string) => {
    const data = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/qc/get-emp/${emp_code}`
    );
    if (type_emp === "prepare-emp" && data) {
      sessionStorage.setItem("prepare-emp", JSON.stringify(data.data));
      setPrepareEmp(data.data);
      if (!QCEmp) {
        inputRefEmpQC.current?.focus();
      }
    } else if (type_emp === "qc-emp" && data) {
      sessionStorage.setItem("qc-emp", JSON.stringify(data.data));
      setQCEmp(data.data);
      if (!packedEMP) {
        inputRefEmpPacked.current?.focus();
      }
    } else if (type_emp === "packed-emp" && data) {
      sessionStorage.setItem("packed-emp", JSON.stringify(data.data));
      setPackedEmp(data.data);
    } else {
      return;
    }
  };

  const handleClearEmpData = (type_emp: string) => {
    if (type_emp === "prepare-emp") {
      sessionStorage.removeItem("prepare-emp");
      setPrepareEmp(undefined);
      setInputPrepare("");
      inputRefEmpPrepare.current?.focus();
      // setDataQC(null);
    } else if (type_emp === "qc-emp") {
      sessionStorage.removeItem("qc-emp");
      setQCEmp(undefined);
      setInputQC("");
      setRoute(null);
      inputRefEmpQC.current?.focus();
      // setDataQC(null);
    } else if (type_emp === "packed-emp") {
      sessionStorage.removeItem("packed-emp");
      setPackedEmp(undefined);
      setInputPacked("");
      inputRefEmpPacked.current?.focus();
      // setDataQC(null);
    } else {
      return;
    }
  };

  const handleSubmitQC = async (
    data: ShoppingOrder & {
      emp_prepare_by: string;
      emp_qc_by: string;
      emp_packed_by: string;
      mem_code: string | null;
      sh_running: string | null;
    }
  ) => {
    console.log(data);
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL_ORDER}/api/qc/update-qc`,
      {
        so_running: data.so_running,
        so_qc_note: data.so_qc_note,
        so_qc_amount: data.so_qc_amount + oldQCAmount,
        so_amount: data.so_amount,
        emp_prepare_by: data.emp_prepare_by,
        emp_qc_by: data.emp_qc_by,
        emp_packed_by: data.emp_packed_by,
        mem_code: data.mem_code,
        sh_running: data.sh_running,
      }
    );
    console.log(response.status);
    if (response.status === 201) {
      setModalOpen(false);
    }
  };

  const SubmitShoppingHead = async () => {
    if (prepareEmp && QCEmp && packedEMP && dataQC && hasNotQC === 0) {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/qc/submit-qc`,
        {
          sh_running: shRunningArray,
          emp_prepare: prepareEmp,
          emp_qc: QCEmp,
          emp_packed: packedEMP,
        }
      );
      if (response.status === 201) {
        console.log("SubmitShoppingHead Success");
        handleClear();
        setSubmitFailed(false);
        setSubmitSucess(true);
      } else if (response.status === 500) {
        console.log("SubmitShoppingHead Failed");
        setSubmitFailed(true);
      }
    }
  };

  const handleRT = async (
    so_running: string,
    sh_running: string,
    mem_code: string
  ) => {
    const data = await axios.post(
      `${import.meta.env.VITE_API_URL_ORDER}/api/qc/update-rt`,
      {
        so_running: so_running,
        sh_running: sh_running,
        mem_code: mem_code,
      }
    );
    if (data.status === 201) {
      window.open(`/print-rt?so_running=${so_running}`);
    }
  };

  useEffect(() => {
    console.log(orderForQC);
    if (orderForQC) {
      setModalOpen(true);
      setQCNote(orderForQC.so_qc_note);
      console.log("so_qc_amount", orderForQC.so_qc_amount);
      setQCAmount(orderForQC.so_amount - orderForQC.so_qc_amount);
      setOldQCAmount(orderForQC.so_qc_amount);
    }
  }, [orderForQC]);

  return (
    <div>
      <Modal
        isOpen={modalReqestOpen}
        onClose={() => setModalRequestOpen(false)}
      >
        <div className="text-center">
          <p className="text-2xl font-bold mb-3">ขอสินค้าใหม่</p>
        </div>
        <div className="grid grid-cols-2">
          <div className="col-span-1 mt-3">
            <img
              src={dataRequest?.product.product_image_url}
              className="w-lg rounded-lg drop-shadow-2xl"
            ></img>
          </div>
          <div className="col-span-1 mt-20 ml-3 flex flex-col justify-between">
            <div>
              <p className="text-3xl font-bold">
                {`
                ${
                  Array.isArray(dataQC)
                    ? dataQC.length > 0
                      ? dataQC[0]?.members?.mem_name
                      : "ไม่มีเลขบิล"
                    : dataQC
                    ? dataQC?.members?.mem_name
                    : "-"
                }`}
              </p>
              <p className="text-4xl font-bold mt-6 line-clamp-2">
                {dataRequest?.product.product_name}
              </p>
              <p className="text-xl mt-4">
                รหัสสินค้า : {dataRequest?.product.product_barcode}
              </p>

              <div className="mt-4">
                <p className="font-bold mb-1">จำนวนที่ต้องการ</p>
                <div className="flex items-center">
                  <input
                    className="border-3 text-4xl w-56 border-green-600 rounded-sm text-center text-green-800 font-bold"
                    value={amountRequest}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const numericValue = rawValue.replace(/\D/g, "");
                      setAmountRequest(Number(numericValue));
                    }}
                  ></input>
                  <p className="text-xl font-bold ml-3">
                    {dataRequest?.so_unit}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full justify-end">
              <button
                disabled={amountRequest === 0}
                className={`text-center text-white text-lg p-2 rounded-lg px-8 cursor-pointer ${
                  amountRequest > 0
                    ? "hover:bg-green-800 bg-green-700"
                    : "hover:bg-gray-600 bg-gray-500"
                }`}
                onClick={() =>
                  handleRequestMore(
                    dataRequest?.so_running ?? null,
                    amountRequest
                  )
                }
              >
                ยืนยัน
              </button>
              <div
                className="text-center text-white bg-red-700 text-lg p-2 rounded-lg hover:bg-red-800 cursor-pointer px-5"
                onClick={() => {
                  setModalRequestOpen(false);
                  setDataRequest(null);
                }}
              >
                ยกเลิก
              </div>
            </div>
          </div>
        </div>
      </Modal>
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
              <p className="text-2xl font-bold">
                {orderForQC?.product?.product_code}
              </p>
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
              {/* <div className="flex justify-between px-30 mt-2">
                <div className="flex gap-2">
                  <p className="text-xl">ซื้อล่าสุด</p>
                  <p className="text-xl">วันที่</p>
                </div>
                <div className="flex gap-2">
                  <p className="text-xl">30.00</p>
                  <p className="text-xl">ขวด</p>
                </div>
              </div> */}
              <div className="flex w-full justify-center mt-5">
                {orderForQC?.picking_status === "picking" ? (
                  <div className="flex gap-2 text-5xl">
                    <p>คนหยิบ</p>
                    <p>{orderForQC.emp_code_floor_picking}</p>
                  </div>
                ) : (
                  <div className="flex gap-2 text-5xl">
                    <p>ยังไม่จัด</p>
                  </div>
                )}
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
                  <input
                    className="border-3 text-4xl w-56 border-green-600 rounded-sm text-center text-green-800 font-bold"
                    value={qcAmount}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const numericValue = rawValue.replace(/\D/g, "");
                      setQCAmount(Number(numericValue));
                    }}
                  ></input>
                  <p className="text-xl">{orderForQC?.so_unit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-12 mt-5 border-b-2 pb-4 border-gray-200">
          <div className="p-2 bg-blue-500 text-white font-bold text-base rounded-sm">
            เช็ค Lot สินค้าให้เป็น Lot เดียวกันทุกตัว ลูกคืนคืนถ้า Lot
            ไม่ต้องการ
          </div>
          <div className="flex space-y-1 gap-4 items-center">
            <div className="flex space-y-1 gap-4 items-center">
              {["ขาด", "ไม่ครบ", "หยิบผิด", "หยิบเกิน", "ไม่มีของ"].map(
                (label) => (
                  <label
                    key={label}
                    className="inline-flex items-center space-x-2"
                  >
                    <input
                      type="radio"
                      name={`qc_status_${orderForQC?.so_running}`}
                      value={label}
                      className="text-blue-600"
                      checked={qcNote === label}
                      onChange={(e) => setQCNote(e.target.value)}
                    />
                    <span className="text-base font-bold">{label}</span>
                  </label>
                )
              )}
              <button
                className="px-2 bg-blue-500 py-1 rounded-lg text-white font-bold hover:bg-blue-600 cursor-pointer"
                onClick={() => setQCNote(null)}
              >
                เคลียร์ค่า
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-5">
          {orderForQC?.product?.attribute?.slice(0, 4).map((url) => {
            return (
              <img
                src={url.product_img_url}
                alt=""
                className="h-50 drop-shadow-xl rounded-sm"
              />
            );
          })}
        </div>
        <div className="flex gap-10 w-full justify-center">
          <button
            onClick={() => {
              if (orderForQC && prepareEmp && packedEMP && QCEmp) {
                handleSubmitQC({
                  ...orderForQC,
                  so_qc_note: qcNote,
                  so_qc_amount: qcAmount,
                  emp_prepare_by: prepareEmp.emp_code,
                  emp_packed_by: packedEMP.emp_code,
                  emp_qc_by: QCEmp.emp_code,
                  sh_running: Array.isArray(dataQC) ? null : dataQC?.sh_running,
                  mem_code: Array.isArray(dataQC)
                    ? dataQC.length > 0
                      ? dataQC[0]?.members?.mem_code
                      : null
                    : null,
                });
              }
            }}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 cursor-pointer"
          >
            ตกลง
          </button>
          <button
            onClick={handleModalClose}
            className="mt-4 bg-red-700 text-white px-4 py-2 rounded-md hover:bg-red-800 cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      </Modal>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-center mt-7">
          เส้นทางที่สามารถทำงานได้
        </h1>
        <p className="mt-2 px-10 text-lg">
          {route ? route
            ?.filter((r) => !restrictedQC?.includes(r.route_code))
            ?.filter((r) => r.route_name !== "อื่นๆ")
            .map((r, index, arr) => (
              <span key={r.route_code}>
                {r.route_name}
                {index < arr.length - 1 ? " , " : ""}
              </span>
            )) : 'กรุณาป้อนรหัสพนักงาน QC เพื่อแสดงเส้นทางที่ทำงานได้'}
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
                  <div
                    key={index}
                    className={` p-2 rounded-lg mt-3 ${
                      isReady ? "bg-blue-400" : "bg-gray-500"
                    }`}
                  >
                    <p className="text-lg text-white font-bold">
                      หมายเลขบิลที่ {index + 1}
                    </p>
                    <div className="flex items-center gap-1.5 justify-center mt-1">
                      <input
                        className="bg-white w-5/6 h-12 text-center placeholder-gray-500 rounded-sm text-xl"
                        placeholder="หมายเลขบิล"
                        disabled={!isReady}
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
                        <p
                          className={`font-bold text-2xl ${
                            isReady ? "text-green-600" : "text-black"
                          }`}
                        >
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
                              ? dataQC[0]?.members?.mem_route?.route_name
                              : "-"
                            : dataQC
                            ? dataQC?.members?.mem_route?.route_name
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
                  disabled={!isReady}
                  ref={inputBarcode}
                  className={`col-span-6  border-4 p-2 px-5 rounded-lg text-4xl text-center ${
                    isReady
                      ? `bg-orange-100 border-orange-500`
                      : `border-gray-500 bg-gray-200 `
                  }`}
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
                  <tbody className="py-5">
                    {order?.length > 0 ? (
                      order
                        .sort((a, b) => {
                          const getPriority = (item: any) => {
                            if (item.so_already_qc === "RT") return 2;
                            if (item.so_already_qc === "Yes") return 1;
                            return 0; // ยังไม่ QC
                          };

                          return getPriority(a) - getPriority(b);
                        })
                        .map((so, index) => {
                          return (
                            <tr
                              className={`  border-b-2 border-blue-200 ${
                                so.so_already_qc === "Yes"
                                  ? "bg-green-100 hover:bg-green-100"
                                  : so.so_already_qc === "RT"
                                  ? "bg-red-100 hover:bg-red-100"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                            >
                              <td className="py-4 text-lg border-r-2 border-blue-200 font-semibold px-2">
                                {index + 1}
                              </td>
                              <td className="py-4 text-lg border-r-2 border-blue-200">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <p className="text-lg">
                                    ชั้น{" "}
                                    {so?.product?.product_floor || "ชั้น 1"}
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
                                    <div className="flex justify-center gap-1">
                                      <p className="text-base text-blue-500 font-bold">
                                        คงเหลือ
                                      </p>
                                      <p className="text-base">
                                        {so.product.product_stock}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex justify-between w-full px-10">
                                    <p className="text-base text-blue-500 font-bold">
                                      จำนวน
                                    </p>
                                    {/* <p className="text-base">{15}</p> */}
                                  </div>
                                  <div className="flex justify-between w-full px-10">
                                    <p className="text-base text-blue-500 font-bold">
                                      เลขคีย์ใบซื้อ
                                    </p>
                                    {/* <p className="text-base">{15}</p> */}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 text-lg border-r-2 border-blue-200">
                                <div>
                                  <p className="text-xl font-bold">
                                    {so.so_amount}
                                  </p>
                                  <p className="text-base text-blue-500">
                                    ใบขาว
                                  </p>
                                </div>
                              </td>
                              <td className="py-4 text-lg border-r-2 border-blue-200">
                                <p className="text-2xl font-bold text-red-600">
                                  {so.so_amount - so.so_qc_amount}
                                </p>
                              </td>
                              <td className="py-4 text-lg border-r-2 border-blue-200">
                                <p className="text-xl font-bold">
                                  {so.so_unit}
                                </p>
                                <p className="text-base text-blue-500">ใบขาว</p>
                              </td>
                              <td className="py-4 text-lg border-r-2 border-blue-200">
                                <div className="flex items-center justify-center">
                                  <img
                                    src={
                                      so.so_already_qc === "Yes"
                                        ? accept
                                        : so.so_already_qc === "RT"
                                        ? box
                                        : incorect
                                    }
                                    className="w-10"
                                  ></img>
                                </div>
                              </td>
                              <td className="py-4 text-sm border-r-2 border-blue-200">
                                <div className="flex flex-col space-y-1 px-2">
                                  <label className="inline-flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name={`qc_status_${so.so_running}`}
                                      checked={so.so_qc_note === "ขาด"}
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
                                      name={`qc_status_${so.so_running}`}
                                      checked={so.so_qc_note === "ไม่ครบ"}
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
                                      name={`qc_status_${so.so_running}`}
                                      checked={so.so_qc_note === "หยิบผิด"}
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
                                      name={`qc_status_${so.so_running}`}
                                      checked={so.so_qc_note === "หยิบเกิน"}
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
                                      name={`qc_status_${so.so_running}`}
                                      checked={so.so_qc_note === "ไม่มีของ"}
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
                                  <button
                                    disabled={so.picking_status !== "picking"}
                                    className={` p-1 rounded-lg text-base text-white cursor-pointer ${
                                      so.picking_status !== "picking"
                                        ? "bg-gray-500 hover:bg-gray-600"
                                        : "bg-blue-500 hover:bg-blue-600"
                                    } `}
                                    onClick={() =>
                                      handleFetchData(so.so_running)
                                    }
                                  >
                                    ขอใหม่
                                  </button>
                                  <button
                                    // disabled={so.so_already_qc === 'RT'}
                                    className={` p-1 rounded-lg text-base text-white cursor-pointer ${
                                      so.so_already_qc === "RT"
                                        ? "hover:bg-gray-600 bg-gray-500"
                                        : "hover:bg-red-600 bg-red-500"
                                    }`}
                                    onClick={() => {
                                      const mem_code = Array.isArray(dataQC)
                                        ? dataQC.length > 0
                                          ? dataQC[0]?.members?.mem_code
                                          : null
                                        : dataQC?.members?.mem_code ?? null;
                                      handleRT(
                                        so.so_running,
                                        so.sh_running,
                                        mem_code
                                      );
                                    }}
                                  >
                                    {so.so_already_qc === "RT"
                                      ? "ส่ง RT แล้ว"
                                      : "ส่ง RT"}
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
                {!dataQC && submitSuccess ? (
                  <div className="w-full flex justify-center text-3xl mt-5 text-green-700 font-bold">
                    <p>ยืนยันการตรวจสอบรายการสำเร็จ</p>
                  </div>
                ) : (
                  !dataQC && (
                    <div className="w-full flex justify-center text-3xl mt-5 text-red-700 font-bold">
                      <p>
                        กรุณากรอกรหัสพนักงานและรหัสลูกค้าหรือเลขบิลให้เรียบร้อย
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="col-span-1 bg-blue-50 rounded-xl self-start flex-col justify-center py-3">
              <div className="w-full mt-3">
                <p>พนักงานเตรียมสินค้า</p>
                <div className="grid grid-cols-4 px-3 gap-2 mt-2">
                  <div
                    className="col-span-1 bg-amber-600 rounded-sm flex justify-center p-2 hover:bg-amber-700 cursor-pointer"
                    onClick={() => handleClearEmpData("prepare-emp")}
                  >
                    <img src={prepareIcon} className="w-6"></img>
                  </div>
                  <input
                    className="col-span-3 bg-white text-lg justify-center text-center rounded-sm p-1 drop-shadow-sm"
                    placeholder="พนักงานเตรียมสินค้า"
                    value={inputPrepare}
                    ref={inputRefEmpPrepare}
                    onChange={(e) => setInputPrepare(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleGetDataEmp(e.currentTarget.value, "prepare-emp");
                      }
                    }}
                    readOnly={!!prepareEmp?.emp_code}
                  ></input>
                </div>
              </div>

              <div className="w-full mt-2">
                <p>พนักงานตรวจสอบสินค้า</p>
                <div className="grid grid-cols-4 px-3 gap-2 mt-2">
                  <div
                    className="col-span-1 bg-red-700 rounded-sm flex justify-center p-2 hover:bg-red-800 cursor-pointer"
                    onClick={() => handleClearEmpData("qc-emp")}
                  >
                    <img src={QCIcon} className="w-6"></img>
                  </div>
                  <input
                    className="col-span-3 bg-white text-lg justify-center text-center rounded-sm p-1 drop-shadow-sm"
                    placeholder="พนักงานตรวจสอบสินค้า"
                    ref={inputRefEmpQC}
                    onChange={(e) => setInputQC(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleGetDataEmp(e.currentTarget.value, "qc-emp");
                      }
                    }}
                    value={inputQC}
                    readOnly={!!QCEmp?.emp_code}
                  ></input>
                </div>
              </div>

              <div className="w-full mt-2">
                <p>พนักงานแพ็คสินค้าลงลัง</p>
                <div className="grid grid-cols-4 px-3 gap-2 mt-2">
                  <div
                    className="col-span-1 bg-green-600 rounded-sm flex justify-center p-2 hover:bg-green-700 cursor-pointer"
                    onClick={() => handleClearEmpData("packed-emp")}
                  >
                    <img src={PackingIcon} className="w-6"></img>
                  </div>
                  <input
                    className="col-span-3 bg-white text-lg justify-center text-center rounded-sm p-1 drop-shadow-sm"
                    placeholder="พนักงานแพ็คสินค้าลงลัง"
                    ref={inputRefEmpPacked}
                    value={inputPacked}
                    readOnly={!!packedEMP?.emp_code}
                    onChange={(e) => setInputPacked(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleGetDataEmp(e.currentTarget.value, "packed-emp");
                      }
                    }}
                  ></input>
                </div>
              </div>

              <div className="grid grid-cols-2 mt-5 px-13 gap-5">
                <div className="col-span-1">
                  <input
                    className="text-5xl drop-shadow-sm text-center font-semibold bg-white w-23 p-3.5 rounded-sm"
                    value={countBox}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const numericValue = rawValue.replace(/\D/g, "");
                      setCountBox(Number(numericValue));
                    }}
                  ></input>
                </div>
                <div className="col-span-1">
                  <div
                    className="bg-green-600 text-2xl font-bold text-white py-1 rounded-sm hover:bg-green-700 cursor-pointer select-none"
                    onClick={() => setCountBox((prev) => prev + 1)}
                  >
                    +
                  </div>
                  <div
                    className="bg-red-700 text-2xl font-bold text-white py-1 rounded-sm mt-1 hover:bg-red-800 cursor-pointer select-none"
                    onClick={() =>
                      countBox > 1 && setCountBox((prev) => prev - 1)
                    }
                  >
                    -
                  </div>
                </div>
              </div>

              <div className="mt-5 px-13">
                <div
                  className="w-full bg-blue-500 text-base text-white p-1 font-bold rounded-sm hover:bg-blue-600 select-none cursor-pointer"
                  onClick={() => {
                    const mem_code = Array.isArray(dataQC)
                      ? dataQC.length > 0
                        ? dataQC[0]?.members?.mem_code
                        : null
                      : dataQC?.members?.mem_code ?? null;
                    window.open(`/othercourier?mem_code=${mem_code}`);
                  }}
                >
                  ฝากขนส่งอื่น
                </div>
                <div
                  className="w-full bg-amber-500 text-base text-white p-1 font-bold rounded-sm hover:bg-amber-600 select-none cursor-pointer mt-2"
                  onClick={() => {
                    window.open("/special");
                  }}
                >
                  กรณีด่วนพิเศษ
                </div>
                <div
                  className="w-full bg-red-700 text-base text-white p-1 font-bold rounded-sm hover:bg-red-800 select-none cursor-pointer mt-2"
                  onClick={() => {
                    window.open("/fragileprint");
                  }}
                >
                  ระวังแตก
                </div>
                <div
                  className="w-full bg-yellow-500 text-base text-white p-1 font-bold rounded-sm hover:bg-yellow-600 select-none cursor-pointer mt-2"
                  onClick={() => {
                    const mem_code = Array.isArray(dataQC)
                      ? dataQC.length > 0
                        ? dataQC[0]?.members?.mem_code
                        : null
                      : dataQC?.members?.mem_code ?? null;

                    const mem_name = Array.isArray(dataQC)
                      ? dataQC.length > 0
                        ? dataQC[0]?.members?.mem_name
                        : null
                      : dataQC?.members?.mem_name ?? null;

                    window.open(
                      `/basket-sticker?mem_code=${mem_code}&mem_name=${mem_name}&print=${countBox}`
                    );
                  }}
                >
                  ติดตะกร้า รอลงลัง ส่งฟรี
                </div>
                <button
                  disabled={hasNotQC !== 0}
                  className={`w-full  text-base text-white p-3 font-bold rounded-sm  select-none cursor-pointer mt-4 ${
                    hasNotQC === 0
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-500 hover:bg-gray-600"
                  }`}
                  onClick={() => SubmitShoppingHead()}
                >
                  เสร็จสิ้น
                </button>
                <p className="mt-2 font-bold text-red-700">
                  {submitFailed ? `ยืนยันไม่สำเร็จ ลองอีกครั้ง` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default QCDashboard;
