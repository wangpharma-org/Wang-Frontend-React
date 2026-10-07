import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import type { BarcodeLabel } from "./noBarcodeApproval";
import "../css/barcode-label-print.css";

// OPHMBC-309 — พิมพ์ฉลาก QR ของบาร์โค้ดสินค้าด้วย browser print ในหน้าเดิม (ไม่เปิด popup)
// QR เก็บค่าบาร์โค้ดตรงๆ เครื่องสแกน 2D ที่หน้า QC จึงอ่านแล้วได้สินค้าเหมือนสแกนบาร์โค้ด
// หน้าละ 4 ดวง (2x2) แต่ละดวงใหญ่เต็มช่องหนึ่งในสี่ของกระดาษ
const LABELS_PER_PAGE = 4;
// ตอนพิมพ์ 1vh = 1% ของความสูงพื้นที่พิมพ์ — เผื่อไว้นิดกันล้นไปหน้าใหม่
const PAGE_HEIGHT = "96vh";
// QR สูงไม่เกิน 25% ของหน้า (A4 ≈ 7 ซม.) — ช่องละครึ่งหน้า เหลือที่ให้ชื่อและเลขบาร์โค้ด
const QR_MAX_HEIGHT = "25vh";
const PRINT_CLASS = "printing-barcode-labels";

interface Props {
  // null = ไม่พิมพ์ / มีค่า = เปิดหน้าต่างพิมพ์ทันที
  labels: BarcodeLabel[] | null;
  onDone: () => void;
}

export default function BarcodeLabelPrint({ labels, onDone }: Props) {
  // หน้า QC re-render บ่อย (socket) — ถ้า effect ผูกกับ onDone ตัวใหม่ทุกครั้งจะสั่งพิมพ์ซ้ำ
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!labels?.length) return;
    document.body.classList.add(PRINT_CLASS);
    // รอให้ portal render ก่อนเปิดหน้าต่างพิมพ์ (แบบเดียวกับสติกเกอร์ในหน้า QC)
    const timer = window.setTimeout(() => window.print(), 300);
    const handleAfterPrint = () => {
      document.body.classList.remove(PRINT_CLASS);
      onDoneRef.current();
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove(PRINT_CLASS);
    };
  }, [labels]);

  if (!labels?.length) return null;

  const expanded = labels.flatMap((label) =>
    Array.from({ length: Math.max(1, label.copies) }, () => label)
  );

  const pages = Array.from(
    { length: Math.ceil(expanded.length / LABELS_PER_PAGE) },
    (_, page) => expanded.slice(page * LABELS_PER_PAGE, (page + 1) * LABELS_PER_PAGE)
  );

  // portal เป็นลูกตรงของ body — CSS ตอนพิมพ์ซ่อนลูกอื่นของ body ทั้งหมด
  return createPortal(
    <div id="barcode-label-print">
      {pages.map((pageLabels, pageIndex) => (
        <div
          key={pageIndex}
          className="grid grid-cols-2 grid-rows-2 overflow-hidden"
          style={{
            height: PAGE_HEIGHT,
            ...(pageIndex < pages.length - 1 ? { breakAfter: "page" } : {}),
          }}
        >
          {pageLabels.map((label, index) => (
            <div
              key={index}
              className="flex min-h-0 flex-col items-center justify-center p-2 text-center"
            >
              {/* leading-normal — leading-tight ตัดสระบน/ล่างภาษาไทยของบรรทัดที่ 2 */}
              <p className="line-clamp-2 break-all text-[8pt] font-bold leading-normal">
                {label.name}
              </p>
              <p className="mb-1 text-[11pt]">{label.product_code}</p>
              <QRCodeSVG
                value={label.barcode}
                style={{
                  width: `min(100%, ${QR_MAX_HEIGHT})`,
                  height: "auto",
                  aspectRatio: "1",
                }}
              />
              <p className="mt-1 line-clamp-2 break-all font-mono text-[12pt] leading-tight">
                {label.barcode}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}
