import React from "react";
import { useEffect, useState, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import dayjs from "dayjs";
// import { Bounce, Id, ToastContainer, toast } from 'react-toastify';
// import { Fieldset } from "@headlessui/react";
import { useAuth } from "../context/AuthContext";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface YellowPaper {
  id: number;
  sh_running: string;
  mem_code: string;
  mem_name: string;
  price: number;
  count_list: number;
  invoice_code: string;
  latestScan_timeY: string;
  yellowToEmployeeCount: number
  latestScan_timeW: string;
}

export interface WhitePaper {
  id: number;
  sh_running: string;
  mem_code: string;
  mem_name: string;
  price: number;
  count_list: number;
  scan_timeW: string; // หรือ Date
  scan_emp_nameW: string;
  whiteToEmployeeCount: number
  latestScan_timeW: string;
}

export interface Invoice {
  id: number;
  sh_running: string;
  mem_code: string;
  mem_name: string;
  dateInvoice: string;
  paperStatus: string;
  yellowPaper: YellowPaper;
  whitePaper: WhitePaper;
}

export interface MatchData {
  sh_running: string;
  result: string;
}

function VerifyOrder() {
  const [invoice, setInvoice] = useState<Invoice[]>([]);
  // const [yellow, setYellow] = useState("");
  // const [search, setSearch] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const { userInfo } = useAuth();
  const [match, setMatch] = useState<MatchData[]>([]);


  useEffect(() => {
    console.log(
      `${import.meta.env.VITE_API_URL_VERIFY_ORDER}/verify-order/invoice`
    );
    const socket = io(
      `${import.meta.env.VITE_API_URL_VERIFY_ORDER}/verify-order/invoice`,
      {
        path: "/verify-order",
        // extraHeaders: {
        //   Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        // },
      }
    );
    setSocket(socket);

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      socket.emit("invoice:get");
    });

    socket.on('invoice:get', (invoiceData: Invoice[]) => {
      console.log(invoiceData)
      setInvoice(invoiceData);
    })


    socket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      socket.emit("invoice:get");
    });
  }, [])

  const fetchAllInvoices = useCallback(() => {
    if (socket) {
      console.log("Fetching all invoices...");
      socket.emit("invoice:get");
    }
  }, [socket]);

  useEffect(() => {
    const checkdata = io(
      `${import.meta.env.VITE_API_URL_VERIFY_ORDER}/verify-order/invoice`,
      {
        path: "/verify-order",
      }
    );

    checkdata.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      checkdata.emit("subscribeToConsistencyCheck");
    });
    checkdata.on("subscribeToConsistencyCheck", (data: MatchData[]) => {
      console.log("Consistency Check Data:", data);
      setMatch(data);
    });
    checkdata.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket");
    });
  }, []);


  const parseWhitePaper = (value: string) => {
    const [sh_running, count_list, mem_code, price] = value.split('/');
    return {
      sh_running,
      mem_code,
      count_list: Number(count_list),
      price,
      emp_code: userInfo?.emp_code,
    };
  };

  const parseYellowPaper = (value: string) => {
    const [sh_running, mem_code, invoice_code, count_list, price] = value.split('/');
    return {
      sh_running,
      mem_code,
      invoice_code,
      count_list: Number(count_list),
      price: Number(price),
      emp_code: userInfo?.emp_code,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const whitePaperInput = form.elements.namedItem("whitePaper") as HTMLInputElement | null;
    if (whitePaperInput && whitePaperInput.value) {
      const data = parseWhitePaper(whitePaperInput.value);
      console.log('ส่งข้อมูลใบขาว:', data);
      socket?.emit("whitepaper:create", data);
      whitePaperInput.value = ''; // เคลียร์ค่า input
      return whitePaperInput; // ออกจากการทำงานหลังจาก xử lý input นี้แล้ว
    }

    const yellowPaperInput = form.elements.namedItem("yellowPaper") as HTMLInputElement | null;
    if (yellowPaperInput && yellowPaperInput.value) {
      const data = parseYellowPaper(yellowPaperInput.value);
      console.log('ส่งข้อมูลใบเหลือง:', data);
      socket?.emit("yellowpaper:create", data);
      yellowPaperInput.value = ''; // เคลียร์ค่า input
      return yellowPaperInput;
    }

    const searchInput = form.elements.namedItem("search") as HTMLInputElement | null;
    if (searchInput) { // Check if searchInput exists in the current form
      const searchValue = searchInput.value.trim();
      if (searchValue) {
        console.log('Performing search for:', searchValue);
        // setIsLoading(true); // Optional: set loading state
        try {
          const response = await fetch(`http://localhost:3007/invoice/${searchValue}`);
          // const response = await fetch(`${import.meta.env.VITE_API_INVOICE_SEARCH_URL}/invoice/${searchValue}`); // Recommended: Use env variable

          if (!response.ok) {
            if (response.status === 404) {
              console.log(`Invoice with ID ${searchValue} not found.`);
              setInvoice([]); // Clear invoices or show a "not found" message
              // toast.warn(`ไม่พบข้อมูลสำหรับ: ${searchValue}`);
            } else {
              console.error("Search API error:", response.status, response.statusText);
              setInvoice([]); // Or keep existing data, depending on desired behavior
              // toast.error(`เกิดข้อผิดพลาดในการค้นหา (HTTP ${response.status})`);
            }
            return;
          }

          const data: Invoice | null = await response.json();

          if (data) {
            setInvoice([data]); // Display the single found invoice
            // toast.success(`แสดงผลการค้นหาสำหรับ: ${searchValue}`);
          } else {
            console.log(`No data returned for invoice ID ${searchValue}, though request was successful.`);
            setInvoice([]);
            // toast.warn(`ไม่พบข้อมูลสำหรับ: ${searchValue}`);
          }
        } catch (error) {
          console.error("Error during search:", error);
          setInvoice([]); // Clear results on network error or JSON parsing error
          // toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อหรือประมวลผลข้อมูลการค้นหา");
        } finally {
          // setIsLoading(false); // Optional: clear loading state
        }
      } else {
        // Search value is empty, refetch all invoices
        console.log("Search input is empty, fetching all invoices.");
        fetchAllInvoices();
        // toast.info("แสดงข้อมูลทั้งหมด");
      }
    }
  };

  const iconStyle = (paperStatus: string) => {
    switch (paperStatus) {
      case "Match":
        return "text-yellow-500";
      case "Not Match":
        return "text-green-500";
      case "Incomplete":
        return "text-red-500";
      case "miss":
        return "text-red-500";
    }

  }

  const sortedInvoice = [...invoice].sort((a, b) => dayjs(b.dateInvoice).valueOf() - dayjs(a.dateInvoice).valueOf());

  return (
    <div className="overflow-x-auto p-6">
      {/* <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      /> */}
      <div className="flex justify-around mb-8">
        <div className=" w-full flex flex-col">
          <div className="flex justify-center mb-4">
            <p>เพิ่มข้อมูล</p>
          </div>
          <div className="flex mx-5">
            <div className="relative w-full mr-3">
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                <input
                  type="text"
                  name="whitePaper"
                  className="border border-gray-500 text-black w-full mr-1 p-2 rounded-xs bg-blue-50 text-3xl"
                  placeholder="ใบขาว"
                />

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6 absolute transform -translate-y-1/2 right-3 top-1/2 text-gray-400"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </form>
            </div>
            <div className="relative w-full ml-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input type="text" name="yellowPaper" className="border border-gray-500 text-black w-full p-2 rounded-xs bg-yellow-50 text-3xl" placeholder="ใบเหลือง" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 absolute transform -translate-y-1/2 right-3 top-1/2 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </form>
            </div>
          </div>
        </div>
        <div className=" w-full flex flex-col mx-5">
          <div className="flex justify-center mb-4">
            <p>ค้นหา</p>
          </div>
          <div className="flex w-full">
            <div className="relative w-full mr-3">
              <form onSubmit={handleSubmit} className="">
                <div className="relative w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                  <input type="text" name="search" className="border border-gray-500 text-black w-full mr-1 p-2 rounded-xs text-right text-3xl" placeholder="ค้นหาข้อมูล" />
                </div>
              </form>
            </div>
            <div>
              <button className=" text-black ">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-13 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="inline-block min-w-full overflow-hidden shadow-md bg-white">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 uppercase text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-5 py-3 text-center border">ลำดับที่</th>
              <th className="px-5 py-3 text-center border">เลขที่ใบจอง</th>
              <th className="px-5 py-3 text-center border">รหัสสมาชิก</th>
              <th className="px-5 py-3 text-center border">นามร้าน</th>
              <th className="px-5 py-3 text-center border">จำนวนที่ขาย</th>
              <th className="px-5 py-3 text-center border">มูลค่ารวม</th>
              <th className="px-5 py-3 text-center border">วันที่ใบจอง</th>
              <th className="px-5 py-3 text-center border">จำนวนครั้งที่สแกน</th>
              <th className="px-5 py-3 text-center border">เวลาที่สแกนล่าสุด</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">เลขบิล</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">จำนวน</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">มูลค่ารวม</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">จำนวนครั้งที่สแกน</th>
              <th className="px-5 py-3 text-center bg-yellow-200 border">เวลาที่สแกนล่าสุด</th>
              <th className="px-5 py-3 text-center border">สถานะ</th>

            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedInvoice.map((item, index) => (
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{index + 1}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item.sh_running}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item.mem_code}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item?.mem_name}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item?.whitePaper?.count_list || "-"}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item?.whitePaper?.price || "-"}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item?.dateInvoice ? dayjs(item?.dateInvoice).format("DD/MM/YYYY HH:mm:ss") : "-"}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item?.whitePaper?.whiteToEmployeeCount}</td>
                <td className="px-6 py-4 text-center border-x-1 border-b-1">{item?.whitePaper?.latestScan_timeW ? dayjs(item?.whitePaper?.latestScan_timeW).format("DD/MM/YYYY HH:mm:ss") : "-"}</td>
                <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">{item?.yellowPaper?.invoice_code || "-"}</td>
                <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">{item?.yellowPaper?.count_list || "-"}</td>
                <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">{item?.yellowPaper?.price || "-"}</td>
                <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">{item?.yellowPaper?.yellowToEmployeeCount || 0}</td>
                <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">{item?.yellowPaper?.latestScan_timeY ? dayjs(item?.yellowPaper?.latestScan_timeY).tz("Asia/Bangkok").format("DD/MM/YYYY HH:mm:ss") : "-"}</td>
                <td className={`px-6 py-4 text-center border-x-1 border-b-1 `}>{item.paperStatus === "Miss" ? "-" : item.paperStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

  );
};

export default VerifyOrder;
