import React, { useEffect, useState } from "react";

const SpecialExpressPrint: React.FC = () => {
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);

  const getCurrentDateTime = () => {
    return new Date()
      .toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(",", "");
  };

  // รอโหลด DOM เสร็จแล้วค่อยสั่งพิมพ์
  useEffect(() => {
    const handlePrint = () => {
      window.print();
    };

    const handleAfterPrint = () => {
      window.close(); // ปิดหน้าหลังพิมพ์เสร็จ
    };

    // รอให้ DOM โหลดครบก่อน
    const timeout = setTimeout(() => {
      setIsReadyToPrint(true);
    }, 500); // รอ 0.5 วินาทีให้แน่ใจว่า render เสร็จ

    window.onafterprint = handleAfterPrint;

    return () => {
      clearTimeout(timeout);
      window.onafterprint = null;
    };
  }, []);

  useEffect(() => {
    if (isReadyToPrint) {
      window.print();
    }
  }, [isReadyToPrint]);

  return (
    <>
      <div className="print-content">
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
                margin: 0;
              }
            }
          `}
        </style>

        <div className="mt-8 w-full text-center">
          <div className="doc-header">
            <h1 className="doc-title text-4xl mt-3">Special Express</h1>
            <h2 className="doc-subtitle text-4xl font-bold mt-3">รายการด่วนพิเศษ</h2>
            <p className="doc-datetime text-2xl mt-3">{getCurrentDateTime()}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SpecialExpressPrint;
