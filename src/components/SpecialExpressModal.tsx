// SpecialExpressPrint.tsx
import React, { useRef, useState } from 'react';
import { File } from 'lucide-react';

const SpecialExpressPrint: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Generate datetime
  const getCurrentDateTime = () => {
    return new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
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
      {/* Button that prints directly when clicked */}
      <button 
        onClick={handlePrint}
        disabled={isPrinting}
        className="flex-1 h-8 bg-amber-300 border border-amber-400 rounded-sm hover:bg-amber-500 disabled:bg-gray-400"
      >
        <span>{isPrinting ? 'กำลังพิมพ์...' : 'กรณีด่วนพิเศษ'}</span>
      </button>
      
      {/* Hidden print content */}
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
              @page {
                size: A4;
                margin: 0;
              }
              .special-express-doc {
                width: 100%;
                height: 100%;
                padding: 40mm 20mm;
                display: flex;
                flex-direction: column;
                font-family: Arial, sans-serif;
              }
              .doc-header {
                text-align: center;
                margin-bottom: 50px;
              }
              .doc-title {
                font-size: 36pt;
                font-weight: bold;
                margin-bottom: 20px;
                color: #000;
              }
              .doc-subtitle {
                font-size: 24pt;
                margin-bottom: 15px;
                color: #000;
              }
              .doc-datetime {
                font-size: 16pt;
                color: #333;
              }
              .doc-content {
                flex: 1;
                /* Add any additional content styles here */
              }
            }
          `}
        </style>
        
        <div className="special-express-doc">
          <div className="doc-header">
            <h1 className="doc-title">Special Express</h1>
            <h2 className="doc-subtitle">รายการด่วนพิเศษ</h2>
            <p className="doc-datetime">{getCurrentDateTime()}</p>
          </div>
          
          <div className="doc-content">
            {/* เพิ่มเนื้อหาเพิ่มเติมตามต้องการ */}
            {/* เช่น ข้อมูลออเดอร์, รายการสินค้า, บาร์โค้ด ฯลฯ */}
          </div>
        </div>
      </div>
    </>
  );
};

export default SpecialExpressPrint;