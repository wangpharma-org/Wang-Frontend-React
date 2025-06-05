import React, { useEffect, useState } from "react";
import warningTH from "../assets/fragile-thai.png";
import warningENG from "../assets/fragile-eng.png";

const FragilePrint: React.FC = () => {
  const [imagesLoaded, setImagesLoaded] = useState(0);

  useEffect(() => {
    if (imagesLoaded === 2) {
      window.onafterprint = () => {
        window.close();
      };
      window.print();
    }
  }, [imagesLoaded]);

  const handleImageLoad = () => {
    setImagesLoaded((prev) => prev + 1);
  };

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
              }
              @page {
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

        <div className="fragile-page">
          <img
            src={warningTH}
            alt="ระวังแตก Fragile Sticker Thai"
            className="sticker-image"
            onLoad={handleImageLoad}
          />
        </div>

        <div className="fragile-page">
          <img
            src={warningENG}
            alt="Fragile Sticker English"
            className="sticker-image"
            onLoad={handleImageLoad}
          />
        </div>
      </div>
    </>
  );
};

export default FragilePrint;
