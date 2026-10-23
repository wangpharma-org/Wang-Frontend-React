import { useEffect, useState, type ReactNode } from "react";
import { useShowAllHelp } from "./helpContext";

interface HelpPanelProps {
  // ใช้เป็น aria-label ของปุ่ม เช่น "วิธีใช้ สายหลักทั้งระบบ"
  topic: string;
  children: ReactNode;
}

// ปุ่ม ⓘ + กล่องคำอธิบายของแต่ละการตั้งค่า — สวิตช์ "แสดงคำอธิบายทั้งหมด" ที่หัวหน้าเปิดทุกกล่องพร้อมกัน
const HelpPanel = ({ topic, children }: HelpPanelProps) => {
  const showAll = useShowAllHelp();
  const [open, setOpen] = useState(showAll);
  useEffect(() => setOpen(showAll), [showAll]);

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`วิธีใช้ ${topic}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs text-sky-700 hover:bg-sky-100"
      >
        <span aria-hidden>ⓘ</span> {open ? "ซ่อนวิธีใช้" : "วิธีใช้"}
      </button>
      {open && (
        <div
          role="note"
          className="mt-2 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs leading-relaxed text-sky-900 [&_b]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-1 [&_ul]:mt-1"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default HelpPanel;
