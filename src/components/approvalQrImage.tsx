import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";

interface CardData {
  code: string;
  emp_code: string;
  name: string;
}

const WIDTH = 600;
const PADDING = 40;
const QR_SIZE = WIDTH - PADDING * 2;
const NAME_TOP = 80;
const SUB_TOP = 130;
const QR_TOP = 170;
const FONT = '"Sarabun", "Tahoma", sans-serif';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// ชื่อยาวให้ย่อขนาดตัวอักษรลงจนพอดีความกว้าง แทนการตัดชื่อทิ้ง
const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxSize: number,
  weight: string
) => {
  let size = maxSize;
  do {
    ctx.font = `${weight} ${size}px ${FONT}`;
    size -= 2;
  } while (ctx.measureText(text).width > QR_SIZE && size > 14);
};

// ภาพ QR ของรหัสบัตร มีชื่อด้านบน — ไม่ใส่รหัส 20 ตัวเป็นตัวอักษร คนเห็นภาพจะได้อ่านรหัสไปพิมพ์เองไม่ได้
export const downloadApprovalQrImage = async ({
  code,
  emp_code,
  name,
}: CardData): Promise<void> => {
  // SVG ที่โหลดเป็น <img> ต้องมี xmlns — QRCodeSVG ไม่ใส่ให้เอง
  const svg = renderToStaticMarkup(
    <QRCodeSVG
      xmlns="http://www.w3.org/2000/svg"
      value={code}
      size={QR_SIZE}
      level="M"
      marginSize={2}
    />
  );
  const qr = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  );

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = QR_TOP + QR_SIZE + PADDING;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  fitText(ctx, name, 40, "bold");
  ctx.fillText(name, WIDTH / 2, NAME_TOP);
  ctx.fillStyle = "#4b5563";
  ctx.font = `24px ${FONT}`;
  ctx.fillText(`รหัสพนักงาน ${emp_code}`, WIDTH / 2, SUB_TOP);
  // ปิด smoothing ให้ขอบโมดูล QR คม สแกนง่าย
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, PADDING, QR_TOP, QR_SIZE, QR_SIZE);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `approval-qr_${emp_code}.png`;
  link.click();
};
