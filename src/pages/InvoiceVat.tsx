import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const InvoiceVat: React.FC<InvoiceTableProps> = () => {
  const [invoice, setInvoice] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<string[]>([])

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    const newSocket = io(`${import.meta.env.VITE_API_URL_INVOICE}/socket/vat`, {
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("invoice:next");
    });

    newSocket.on("invoice:available", () => {
        console.log("📢 Invoice available from server");
        if (invoice.length === 0 || currentIndex >= invoice.length) {
            newSocket.emit("invoice:next");
        }
    });

    newSocket.on("invoice:print", (data) => {
      console.log("📥 Received invoice:vat", data);
      if (Array.isArray(data) && data.length > 0) {
        setInvoice(data);
        setCurrentIndex(0)
      }
      setLoading(false);
    });

    newSocket.on("unauthorized", (error) => {
      console.error("❌ Unauthorized:", error.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (invoice.length > 0 && currentIndex < invoice.length) {
      console.log('Index :', currentIndex);
      const currentInvoice = invoice[currentIndex];
      localStorage.removeItem("print_status");
      if(!isOpen.find((current) => current === currentInvoice.sh_running)) {
        window.open(
            `/format-vat?sh_running=${currentInvoice.sh_running}`,
            "_blank"
        );
        setIsOpen(prev => [...prev, currentInvoice.sh_running]);
      }
    } else if (invoice.length > 0 && currentIndex >= invoice.length) {
        console.log("✅ All current invoices printed");
        setInvoice([]);
        if (socket?.connected) {
            socket.emit("invoice:next");
        }
    }
  }, [currentIndex, invoice]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "print_status" && event.newValue === "done") {
        const printedInvoice = invoice[currentIndex];
        if (socket?.connected && printedInvoice) {
          socket.emit("invoice:printed", {
            sh_running: printedInvoice.sh_running,
          });
          console.log("📤 Emit invoice:printed", printedInvoice.sh_running);
        } else {
          console.warn("❌ Socket not connected or invoice missing");
        }
        setCurrentIndex((prev) => prev + 1);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [socket, invoice, currentIndex]);


  return (
    <div className="overflow-x-auto p-6">
      <div className="inline-block min-w-full overflow-hidden rounded-lg shadow-md bg-white">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 uppercase text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-6 py-3 text-center">ลำดับที่</th>
              <th className="px-6 py-3 text-center">เลขที่ใบจอง</th>
              <th className="px-6 py-3 text-center">รหัสสมาชิก</th>
              <th className="px-6 py-3 text-center">นามร้าน</th>
              <th className="px-6 py-3 text-center">รหัสพนักงาน</th>
              <th className="px-6 py-3 text-center">จำนวนที่ขาย</th>
              <th className="px-6 py-3 text-center">จำนวนที่ให้ฟรี</th>
              <th className="px-6 py-3 text-center">มูลค่ารวม</th>
              <th className="px-6 py-3 text-center">วันที่ใบจอง</th>
              <th className="px-6 py-3 text-center">จำนวนพิมพ์</th>
              <th className="px-6 py-3 text-center">เลขบิล QC</th>
              <th className="px-6 py-3 text-center">จำนวนพิมพ์ QC</th>
              <th className="px-6 py-3 text-center">วันที่พิมพ์ QC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.map((invoice, index) => (
              <tr
                key={index}
                className={`hover:bg-gray-50 ${
                  index === currentIndex ? "bg-green-200" : ""
                }`}
              >
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
      </div>
    </div>
  );
};

export default InvoiceVat;
