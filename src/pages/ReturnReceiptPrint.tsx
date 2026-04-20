import { useEffect } from "react";
import ReturnReceiptDoc, {
  ReturnReceiptPayload,
} from "../components/ReturnReceiptDoc";

export const RETURN_RECEIPT_PRINT_KEY = "return_receipt_print_payload";

export default function ReturnReceiptPrint() {
  const raw = sessionStorage.getItem(RETURN_RECEIPT_PRINT_KEY);
  const payload: ReturnReceiptPayload | null = raw ? JSON.parse(raw) : null;

  useEffect(() => {
    if (!payload) return;
    const t = setTimeout(() => {
      // window.print();
      window.addEventListener("afterprint", () => window.close(), {
        once: true,
      });
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!payload) {
    return (
      <div style={{ padding: 32, fontFamily: "sans-serif", color: "#555" }}>
        ไม่พบข้อมูลสำหรับพิมพ์ กรุณาปิดหน้าต่างนี้
      </div>
    );
  }

  return <ReturnReceiptDoc payload={payload} />;
}
