import { useState } from "react";
import { HINTS, type HintKey } from "./hints";

interface HintProps {
  k: HintKey;
  // ชื่อจุดที่อธิบาย ใช้เป็น aria-label "คำอธิบาย: ..."
  label: string;
  // เปิดค้างไว้ตั้งแต่แรก (ใช้กับจุดที่สำคัญ)
  defaultOpen?: boolean;
}

// ⓘ เล็ก ๆ ข้างช่องกรอก/สวิตช์/ปุ่ม — กดแล้วขึ้นคำอธิบายใต้จุดนั้น (ไม่ใช้ popover ลอย กันล้นจอมือถือ)
const Hint = ({ k, label, defaultOpen = false }: HintProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button
        type="button"
        aria-label={`คำอธิบาย: ${label}`}
        aria-expanded={open}
        onClick={(event) => {
          // อยู่ใน <label> — ไม่ให้คลิกไปโฟกัส/สลับช่องกรอก
          event.preventDefault();
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border align-middle text-[10px] leading-none ${
          open ? "border-sky-500 bg-sky-500 text-white" : "border-sky-300 bg-white text-sky-600 hover:bg-sky-50"
        }`}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          data-hint={k}
          className="mt-1 block w-full rounded-md bg-sky-50 px-2 py-1 text-left text-[11px] font-normal leading-snug text-sky-900"
        >
          {HINTS[k]}
        </span>
      )}
    </>
  );
};

export default Hint;
