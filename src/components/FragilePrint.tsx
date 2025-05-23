// FragilePrint.tsx
import React, { useRef, useState } from 'react';

const FragilePrint: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    if (!printRef.current || isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // Show print content
      printRef.current.style.display = 'block';
      
      // Store original styles
      const originalBodyStyle = document.body.style.cssText;
      
      // Hide everything except print content
      document.body.style.cssText = `visibility: hidden;`;
      printRef.current.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        visibility: visible;
        background-color: white;
      `;
      
      setTimeout(() => {
        window.print();
        
        // Restore after print
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
      <button 
        onClick={handlePrint}
        disabled={isPrinting}
        className="flex-1 bg-red-400 h-8 border border-red-500 rounded-sm hover:bg-red-500 disabled:bg-gray-400"
      >
        {isPrinting ? 'กำลังพิมพ์...' : 'ระวังแตก'}
      </button>

      {/* Hidden Print Content */}
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
              }
              @page {
                size: A4;
                margin: 5mm;
              }
              .fragile-page {
                width: 100%;
                height: 100%;
                page-break-after: always;
                display: flex;
                align-items: top;
                justify-content: center;
              }
              .fragile-page:last-child {
                page-break-after: auto;
              }
              .sticker-image {
                width: 600mm;
                height: auto;
                max-height: 287mm;
                object-fit: contain;
              }
            }
          `}
        </style>
        
        {/* Thai Fragile Sticker */}
        <div className="fragile-page">
          <img 
            src="public/images/fragile-thai.png" 
            alt="ระวังแตก Fragile Sticker Thai"
            className="sticker-image"
          />
        </div>

        {/* English Fragile Sticker */}
        <div className="fragile-page">
          <img 
            src="public/images/fragile-eng.png" 
            alt="Fragile Sticker English"
            className="sticker-image"
          />
        </div>
      </div>
    </>
  );
};

export default FragilePrint;