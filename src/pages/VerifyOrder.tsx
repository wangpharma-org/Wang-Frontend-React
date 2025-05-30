import React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { Socket, io } from "socket.io-client";
import dayjs from "dayjs";
import { Bounce, Id, ToastContainer, toast } from 'react-toastify';
// import { Fieldset } from "@headlessui/react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";



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

function VerifyOrder() {
  const [invoice, setInvoice] = useState<Invoice[]>([]);
  // const [yellow, setYellow] = useState("");
  // const [search, setSearch] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const { userInfo } = useAuth();
  const [match, setMatch] = useState<Invoice[]>([]);
  // const [selectedStatus, setSelectedStatus] = useState('Match');
  const [isOpen, setIsOpen] = useState(false);
  const [originalData, setOriginalData] = useState<Invoice[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [errorWhitePaper, setErrorWhitePaper] = useState<boolean>(false);
  const [errorYellowPaper, setErrorYellowPaper] = useState<boolean>(false);
  const [status, setStatus] = useState("");
  const [enabled, setEnabled] = useState(false);// false = white, true = yellow
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();



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
      setOriginalData(invoiceData);
    })

    socket.on("white-paper-error", (error) => {
      const errorMessage: string = error.message;
      console.error("White Paper Error:", errorMessage);
      setErrorWhitePaper(!!errorMessage);
    });

    socket.on("yellow-paper-error", (error) => {
      const errorMessage: string = error.message;
      console.error("Yellow Paper Error:", errorMessage);
      setErrorYellowPaper(!!errorMessage);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      socket.emit("invoice:get");
    });

    clearSearch(); // Clear the search input
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
    checkdata.on("subscribeToConsistencyCheck", (data: Invoice[]) => {
      console.log("Consistency Check Data:", data);
      setMatch(data);
    });
    checkdata.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket");
    });
  }, []);

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      console.log("Clicked outside, closing dropdown.");
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [handleOutsideClick]);

  useEffect(() => {
    if (enabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [enabled]);

  const parseWhitePaper = (value: string) => {
    const [sh_running, mem_code, count_list, price] = value.split('/');
    return {
      sh_running,
      mem_code,
      count_list: count_list,
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
      count_list,
      price,
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
    }

    const yellowPaperInput = form.elements.namedItem("yellowPaper") as HTMLInputElement | null;
    if (yellowPaperInput && yellowPaperInput.value) {
      const data = parseYellowPaper(yellowPaperInput.value);
      console.log('ส่งข้อมูลใบเหลือง:', data);
      socket?.emit("yellowpaper:create", data);
      yellowPaperInput.value = ''; // เคลียร์ค่า input
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
            toast.success(`แสดงผลการค้นหาสำหรับ: ${searchValue}`);
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
          setStatus("");
          // setIsLoading(false); // Optional: clear loading state
        }
      } else {
        // Search value is empty, refetch all invoices
        console.log("Search input is empty, fetching all invoices.");
        searchInput.value = ''; // ล้างช่อง search
        fetchAllInvoices();
        // toast.info("แสดงข้อมูลทั้งหมด");
      }
    }
  };

  const sortedInvoice = [...invoice].sort((a, b) => dayjs(b.dateInvoice).valueOf() - dayjs(a.dateInvoice).valueOf());

  const clearSearch = () => {
    const searchInput = document.querySelector<HTMLInputElement>("input[name='search']");
    if (searchInput) searchInput.value = '';
  }

  // const clearWhite = () => {
  //   const whiteInput = document.querySelector<HTMLInputElement>("input[name='search']");
  //   if (whiteInput) whiteInput.value = '';
  // }
  // const clearYellow = () => {
  //   const yellowInput = document.querySelector<HTMLInputElement>("input[name='search']");
  //   if (yellowInput) yellowInput.value = '';
  // }


  const filterPaperStatus = (status: string) => {
    const filteredInvoices = invoice.filter((item) => item.paperStatus === status);
    console.log("Filtered invoices:", filteredInvoices);
    setInvoice(filteredInvoices);
    setIsOpen(false); // Close the dropdown after selection
    setStatus(status); // Set the selected status
    console.log("Selected status:", status);

  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
    console.log("Dropdown toggled:", !isOpen);
    if (!isOpen === true) {
      setInvoice(originalData); // Reset to original data when dropdown is closed
      console.log("originalData", originalData);
      console.log("Dropdown closed, resetting invoice data.");
      setStatus("");

    }
  };

  const handlePrint = () => {
    navigate("/log-report")
  }


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
      <div>
        <div className="flex items-center">
          <div className="flex w-full justify-center">
            <div className="flex items-center justify-center mr-4">
              <p className="mr-2 text-gray-600 text-xs">Focus Mode</p>
              <div className="p-4">
                {/* Toggle switch */}
                <div
                  onClick={() => setEnabled(!enabled)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${enabled ? "bg-yellow-200" : "bg-blue-100"
                    }`}
                >
                  <div
                    className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-0"
                      }`}
                  />
                </div>


              </div>
            </div>
          </div>
          <div className="flex w-full justify-end">
            <div className="">
              <button onClick={handlePrint} className="flex items-center justify-center border px-2 py-1 rounded-lg text-white bg-indigo-500 hover:bg-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                พิมพ์สรุปรายวัน</button>
            </div>
          </div>
        </div>
        <div className="flex justify-around mb-8">
          <div className=" w-full flex flex-col">
            <div className="flex justify-center mb-4">
              <p>เพิ่มข้อมูล</p>
            </div>
            <div className="flex mx-5">
              {/* Conditional input */}
              {!enabled && (
                <div className="w-full">
                  <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                    <input
                      type="text"
                      name="whitePaper"
                      autoComplete="off"
                      className={`border text-black w-full p-2 rounded-xs text-3xl ${errorWhitePaper == true ? "border-red-500 bg-red-200" : " border-gray-500  bg-blue-50"}`}
                      onChange={() => { setErrorWhitePaper(false), setInvoice(originalData), clearSearch() }}
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
                  <p className="text-xs text-gray-400 text-center">SH_running / mem_code / count_list / price</p>
                </div>
              )}
              {enabled && (
                <div className=" w-full">
                  {/* Conditional input */}
                  <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                    <input
                      type="text"
                      name="yellowPaper"
                      autoComplete="off"
                      className={`border text-black w-full p-2 rounded-xs text-3xl ${errorYellowPaper == true ? "border-red-500 bg-red-200" : "bg-yellow-50 border-gray-500"}`}
                      onChange={() => { setErrorYellowPaper(false), setInvoice(originalData), clearSearch() }}
                      placeholder="ใบเหลือง" />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6 absolute transform -translate-y-1/2 right-3 top-1/2 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </form>
                  <p className="text-xs text-gray-400 text-center">SH_running / mem_code / invoice_code / count_list / price</p>
                </div>
              )}
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
                    <input
                      type="text"
                      name="search"
                      autoComplete="off"
                      className="border border-gray-500 text-black w-full mr-1 p-2 rounded-xs text-right text-3xl"
                      onChange={() => { setInvoice(originalData) }}
                      placeholder="ค้นหาข้อมูล" />
                  </div>
                </form>
                <p className="text-xs text-gray-400 text-center">SH_running หรือ mem_code </p>
              </div>
              <div>
                <div ref={dropdownRef}>
                  {status === "Match" ? (<button onClick={toggleDropdown} className=" text-black ">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-13 text-green-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </button>
                  ) : status === "Not Match" ? (
                    <button onClick={toggleDropdown} className=" text-black ">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-13 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </button>
                  ) : status === "Incomplete" ? (
                    <button onClick={toggleDropdown} className=" text-black ">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-13 text-amber-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                    </button>
                  ) : status === "Miss" ? (
                    <button onClick={toggleDropdown} className=" text-black ">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-13 text-gray-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </button>
                  ) : (
                    <button onClick={toggleDropdown} className=" text-black ">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-13 text-gray-500 hover:text-gray-700">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                      </svg>
                    </button>

                  )}
                  {isOpen && (
                    <div>
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                        <ul className="py-1">
                          <li className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => filterPaperStatus("Match")}>
                            <p className=" my-auto">Match</p>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-green-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </li>
                          <li className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => filterPaperStatus("Not Match")}>
                            <p className=" my-auto">Not Match</p>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-red-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </li>
                          <li className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => filterPaperStatus("Incomplete")}>
                            <p className=" my-auto">Incomplete</p>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-amber-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                          </li>
                          <li className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => filterPaperStatus("Miss")}>
                            <p className=" my-auto">Miss</p>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-gray-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
            {invoice.length === 0 && (
              <tr>
                <td colSpan={14} className="text-center py-4 text-gray-500 text-3xl">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {
              sortedInvoice
                .map((item, index) => (
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
                    <td className="px-6 py-4 text-center bg-yellow-100 border-x-1 border-b-1">{item?.yellowPaper?.latestScan_timeY ? dayjs(item?.yellowPaper?.latestScan_timeY).format("DD/MM/YYYY HH:mm:ss") : "-"}</td>
                    <td className={`px-6 py-4 text-center border-x-1 border-b-1  border-black `}>{item.paperStatus === "Match" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-green-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>

                    ) : item.paperStatus === "Not Match" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-red-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>

                    ) : item.paperStatus === "Incomplete" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-amber-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>

                    ) : item.paperStatus === "Miss" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-gray-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>

                    ) : (
                      "Unknown Status"
                    )
                    }</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>

  );
};

export default VerifyOrder;
