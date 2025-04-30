import React from "react";
import { useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";
import dayjs from "dayjs";

interface Invoice {
  sh_running: string;
  mem_code: string;
  mem_name: string;
  emp_code: string;
  sh_listsale: number;
  sh_listfree: number;
  sh_sumprice: number;
  sh_datetime: string;
  sh_print: number;
  qc_invoice: string;
  qc_print: number;
  qc_timePrice: string;
  members: string[];
}

interface InvoiceTableProps {
  data: Invoice[];
}

const InvoiceList: React.FC<InvoiceTableProps> = () => {
  const [invoice, setInvoice] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [offset, setOffset] = useState(0);
  const [none , setNone ] = useState(false) 
  // const [newData, setNewData] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    console.log(token);
    const newSocket = io(`${import.meta.env.VITE_API_URL_INVOICE}/socket/all`, {
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("invoice:get", { offset: 0, limit: 10 });
    });

    newSocket.on("invoice:list", (data) => {
      console.log("📥 Received invoice:list", data);
      if(data.length === 0) {
        setNone(true)
      } else {
        setNone(false)
      }
      setInvoice(data);
      setLoading(false);
    });

    newSocket.on("unauthorized", (error) => {
      console.error("❌ Unauthorized:", error.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleNext = () => {
    if (loading) return;
    if (none) return;
    setLoading(true);
    const newOfset = offset + 10;
    console.log(offset, newOfset);
    setOffset(newOfset);
    socket?.emit("invoice:get", { offset: newOfset, limit: 10 });
  };

  const handleBack = () => {
    if ((loading) || (offset < 10)) return;
    setLoading(true);
    const newOfset = offset - 10;
    console.log(offset, newOfset);
    setOffset(newOfset);
    socket?.emit("invoice:get", { offset: newOfset, limit: 10 });
  };

  return (
    <div className="overflow-x-auto p-6">
      <div className="inline-block min-w-full overflow-hidden rounded-lg shadow-md bg-white">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 uppercase text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-6 py-3 text-center ">ลำดับที่</th>
              <th className="px-6 py-3 text-center ">เลขที่ใบจอง</th>
              <th className="px-6 py-3 text-center ">รหัสสมาชิก</th>
              <th className="px-6 py-3 text-center ">นามร้าน</th>
              <th className="px-6 py-3 text-center ">รหัสพนักงาน</th>
              <th className="px-6 py-3 text-center ">จำนวนที่ขาย</th>
              <th className="px-6 py-3 text-center ">จำนวนที่ให้ฟรี</th>
              <th className="px-6 py-3 text-center ">มูลค่ารวม</th>
              <th className="px-6 py-3 text-center ">วันที่ใบจอง</th>
              <th className="px-6 py-3 text-center ">จำนวนพิมพ์</th>
              <th className="px-6 py-3 text-center ">เลขบิล QC</th>
              <th className="px-6 py-3 text-center ">จำนวนพิมพ์ QC</th>
              <th className="px-6 py-3 text-center ">วันที่พิมพ์ QC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.map((invoice, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-center">{index + 1}</td>
                <td className="px-6 py-4">{invoice.sh_running}</td>
                <td className="px-6 py-4">{invoice.mem_code}</td>
                <td className="px-6 py-4">
                  {invoice.members.mem_name || invoice.mem_name}
                </td>
                <td className="px-6 py-4">
                  {invoice.members.emp_code || invoice.emp_code}
                </td>
                <td className="px-6 py-4 text-right">{invoice.sh_listsale}</td>
                <td className="px-6 py-4 text-right">{invoice.sh_listfree}</td>
                <td className="px-6 py-4 text-right">
                  {invoice.sh_sumprice.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  {dayjs(invoice.sh_datetime).format("DD/MM/YYYY HH:mm")}
                </td>
                <td className="px-6 py-4 text-right">{invoice.sh_print}</td>
                <td className="px-6 py-4">{invoice.qc_invoice}</td>
                <td className="px-6 py-4 text-right">{invoice.qc_print}</td>
                <td className="px-6 py-4 text-center">
                  {invoice.qc_timePrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        { none && <div className="w-full flex justify-center h-56 items-center">
              <p className="text-xl font-medium text-amber-400">ไม่พบข้อมูล</p>
            </div>}
      </div>
      <div className="w-full flex justify-center align-middle pt-5"><p className="text-base font-medium text-blue-500">รายการชุดที่ {(offset+10)/10}</p></div>
        <div className="w-full flex align-middle justify-center pt-3 gap-3">
          <button
            className="pt-3 pb-3 pl-4.5 pr-4.5 cursor-pointer align-middle bg-blue-400 rounded-[100%] text-base text-white font-bold"
            onClick={handleBack}
          >
            &lt;
          </button>
          <button
            className="pt-3 pb-3 pl-4.5 pr-4.5 cursor-pointer align-middle bg-blue-400 rounded-[100%] text-base text-white font-bold"
            onClick={handleNext}
          >
            &gt;
          </button>
        </div>
      
    </div>
  );
};

export default InvoiceList;
