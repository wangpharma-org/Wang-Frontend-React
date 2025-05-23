// BarcodeQcPrint.tsx
import React, { useRef, useState } from 'react';
import { Printer } from 'lucide-react';

const SendOtherMoal: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Document data (you can modify this or fetch from your store/API)
  const documentData = {
    sender: {
      title: "ชื่อส่ง",
      company: "บริษัท วังเภสัชฟาร์มาซูติคอล จำกัด",
      address: "141/3 ถ.จักการ ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110",
      phone: "โทร : 074-366681 - 5",
    },
    receiver: {
      title: "ชื่อผู้รับ",
      company: "ร้านจริญเภสัช 2008",
      address: "502 ถ.อินทรศีรี",
      district: "ต.แม่สอด อ.แม่สอด จ.ตาก 63110",
      phone: "เบอร์ 092-9298299",
    },
    orderDetails: {
      orderId: "63005"
    }
  };
  
  // ฟังก์ชันพิมพ์
  const handlePrint = () => {
    if (!printRef.current || isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // แสดงเนื้อหาที่ต้องการพิมพ์
      printRef.current.style.display = 'block';
      
      // เก็บค่า CSS ของ body เดิม
      const originalBodyStyle = document.body.style.cssText;
      
      // ซ่อนเนื้อหาอื่นๆ
      document.body.style.cssText = `visibility: hidden;`;
      printRef.current.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        visibility: visible;
        background-color: white;
      `;
      
      // ใช้ setTimeout เพื่อให้การเปลี่ยนแปลง CSS มีผล
      setTimeout(() => {
        window.print();
        
        // คืนค่าการแสดงผลกลับเป็นปกติหลังจากพิมพ์
        setTimeout(() => {
          document.body.style.cssText = originalBodyStyle;
          if (printRef.current) {
            printRef.current.style.cssText = `display: none;`;
          }
          setIsPrinting(false);
        }, 100);
      }, 100);
      
    } catch (error) {
      console.error("Error during print:", error);
      setIsPrinting(false);
    }
  };

  return (
    <>
      {/* Direct print button */}
      <button
        onClick={handlePrint}
        disabled={isPrinting}
        className={`mt-3 w-full ${
          isPrinting ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
        } text-white rounded-md p-2 flex items-center justify-center`}
      >
        <span>{isPrinting ? 'กำลังพิมพ์...' : 'ฝากขนส่งอื่น'}</span>
      </button>
      
      {/* ส่วนเนื้อหาที่จะพิมพ์ (ซ่อนไว้) */}
      <div 
        ref={printRef} 
        style={{ display: 'none' }}
        className="print-content"
      >
        <style type="text/css" media="print">
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-content, .print-content * {
                visibility: visible;
              }
              .print-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
              }
              .print-content div {
                font-size: 16pt;
              }
              .print-content .font-bold {
                font-size: 18pt;
              }
              @page {
                size: A4;
                margin: 10mm;
              }
            }
          `}
        </style>
        
        <div className="p-8">
          <div className="flex justify-between mb-8">
            <div className="max-w-xs">
              <div className="font-bold">{documentData.sender.title}</div>
              <div>{documentData.sender.company}</div>
              <div>{documentData.sender.address}</div>
              <div>{documentData.sender.phone}</div>
            </div>
            
            <div className="max-w-xs text-right">
              <div className="font-bold">{documentData.receiver.title}</div>
              <div>{documentData.receiver.company}</div>
              <div>{documentData.receiver.address}</div>
              <div>{documentData.receiver.district}</div>
              <div>{documentData.receiver.phone}</div>
            </div>
          </div>
          
          <div className="mt-8">
            {/* เนื้อหาเอกสารที่จะพิมพ์ */}
            {/* สามารถเพิ่มบาร์โค้ดหรือตารางสินค้าได้ที่นี่ */}
          </div>
        </div>
      </div>
    </>
  );
};

export default SendOtherMoal;