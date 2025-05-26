import React, { useRef, useState, useEffect, useCallback } from 'react';

interface OrderData {
  orderNumber: string;
  shopName: string;
  date: string;
  time: string;
  sheetNumber: number;
  totalSheets: number;
  basketStatus: string;
  basketNumber: number;
  totalBaskets: number;
}

interface FreeShippingModalProps {
  pinCart: number;
  orderData?: OrderData;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

const FreeShippingModal: React.FC<FreeShippingModalProps> = ({ 
  pinCart = 0, 
  orderData, 
  autoPrint = false,
  onPrintComplete 
}) => {
  // ต้องเรียก hooks ทั้งหมดก่อน conditional return
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  
  // ข้อมูลใบปะหน้า
  const labelData = orderData || {
    orderNumber: "63005",
    shopName: "ร้านเจริญเภสัช 2008",
    date: "13 / 05 / 68",
    time: "17:01",
    sheetNumber: 1,
    totalSheets: 1,
    basketStatus: "ติดตะกร้า รอลงลัง สีฟรีทั่วไทย",
    basketNumber: 1,
    totalBaskets: 1
  };

  // ฟังก์ชันพิมพ์ - ย้ายมาหลัง state declarations
  const handlePrint = useCallback(() => {
    if (!printRef.current || isPrinting || pinCart === 0) {
      console.log('Cannot print: ref not ready, already printing, or no items');
      return;
    }
    
    console.log('Starting print process...');
    
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
        z-index: 9999;
      `;
      
      // รอให้ browser render เสร็จก่อนสั่งพิมพ์
      setTimeout(() => {
        window.print();
        
        // คืนค่าการแสดงผลกลับเป็นปกติหลังจากพิมพ์
        setTimeout(() => {
          document.body.style.cssText = originalBodyStyle;
          if (printRef.current) {
            printRef.current.style.cssText = `display: none;`;
          }
          setIsPrinting(false);
          setHasPrinted(true);
          
          // เรียก callback เมื่อพิมพ์เสร็จ
          if (onPrintComplete) {
            onPrintComplete();
          }
        }, 100);
      }, 100);
      
    } catch (error) {
      console.error("Error during print:", error);
      setIsPrinting(false);
    }
  }, [isPrinting, pinCart, onPrintComplete]);

  // Auto print เมื่อ component mount และ autoPrint = true
  useEffect(() => {
    console.log('UseEffect triggered:', { autoPrint, pinCart, hasPrinted });
    
    // พิมพ์อัตโนมัติเมื่อ autoPrint = true และยังไม่เคยพิมพ์
    if (autoPrint && pinCart > 0 && !hasPrinted && !isPrinting) {
      console.log('Auto printing...');
      // รอให้ component render เสร็จก่อนสั่งพิมพ์
      const timer = setTimeout(() => {
        handlePrint();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [autoPrint, pinCart, hasPrinted, isPrinting, handlePrint]);

  // Reset hasPrinted เมื่อ pinCart เปลี่ยน
  useEffect(() => {
    setHasPrinted(false);
  }, [pinCart]);
  
  // ถ้าไม่มีจำนวนก็ไม่แสดงอะไร - ย้ายมาหลัง hooks ทั้งหมด
  if (pinCart === 0) return null;

  return (
    <>
      {/* ปุ่มพิมพ์ - ซ่อนถ้า autoPrint = true */}
      {!autoPrint && (
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className={`w-full ${
            isPrinting ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
          } text-white rounded-md p-3 flex items-center justify-center transition-colors`}
        >
          <span>{isPrinting ? 'กำลังพิมพ์...' : `พิมพ์ใบปะหน้า (${pinCart} ใบ)`}</span>
        </button>
      )}

      {/* เนื้อหาที่จะพิมพ์ (ซ่อนไว้) */}
      <div 
        ref={printRef} 
        style={{ display: 'none' }}
        className="print-content"
      >
        <style type="text/css" media="print">
          {`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-content, .print-content * {
                visibility: visible !important;
              }
              .print-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: visible !important;
              }
              .label-page {
                width: 102.5%;
                height: 50vh;
                page-break-after: always;
                display: flex;
                flex-direction: column;
                padding: 30px;
                box-sizing: border-box;
                border: 3px solid #000;
                position: relative;
                margin-left: -1.25%;
                overflow: visible !important;
              }
              .label-page:last-child {
                page-break-after: auto;
              }
              /* Header */
              .header-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 100px;
                font-size: 20pt;
                font-weight: bold;
              }
              /* Content Area */
              .content-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                text-align: center;
                margin-top: -50px;
                font-weight: bold;
              }
              .order-number {
                font-size: 32pt !important;
                font-weight: bold;
                margin-bottom: 30px;
                letter-spacing: 2px;
              }
              .shop-name {
                font-size: 26pt !important;
                margin-bottom: 20px;
                font-weight: bold;
              }
              .date-time {
                font-size: 28pt;
                margin-bottom: 40px;
                font-weight: bold;
              }
              .page-counter {
                font-size: 28pt;
                margin-bottom: 40px;
                font-weight: bold;
              }
              /* Footer */
              .footer-area {
                position: absolute;
                bottom: 40px;
                left: 40px;
                right: 40px;
                text-align: center;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
              }
              .basket-status {
                font-size: 24pt;
                margin-bottom: 15px;
                font-weight: bold;
              }
              .basket-counter {
                font-size: 28pt;
                font-weight: bold;
              }
              @page {
                size: A4;
                margin: 0;
              }
            }
          `}
        </style>
        
        {/* พิมพ์ตามจำนวนที่กำหนด */}
        {[...Array(pinCart)].map((_, index) => (
          <div key={index} className="label-page">
            {/* Header */}
            <div className="header-row">
              <div>ใบที่ / ทั้งหมด</div>
              <div style={{ fontWeight: 'bold' }}>
                {index + 1} / {pinCart}
              </div>
            </div>

            {/* Main Content */}
            <div className="content-area">
              <div className="order-number">
                {labelData.orderNumber}
              </div>
              
              <div className="shop-name">
                {labelData.shopName}
              </div>
              
              <div className="date-time">
                {labelData.date}   {labelData.time}
              </div>
              
              <div className="page-counter">
                นุ้ย / นุ้ย
              </div>
            </div>

            {/* Footer */}
            <div className="footer-area">
              <div className="basket-status">
                {labelData.basketStatus}
              </div>
              <div className="basket-counter">
                {index + 1} / {pinCart}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default FreeShippingModal;