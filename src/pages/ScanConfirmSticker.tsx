import { useEffect, useRef } from "react";
import Barcode from "react-barcode";
import dayjs from "dayjs";
import "../css/print.css";
import "dayjs/locale/th";
import correct from "../assets/correct.png";
dayjs.locale("th");

const ScanConfirmSticker = () => {
  const q = new URLSearchParams(window.location.search);
  const mem_code = q.get("mem_code") ?? "";
  const mem_name = decodeURIComponent(q.get("mem_name") ?? "");
  const route_code = q.get("route_code") ?? "";
  const box_no = q.get("box_no") ?? "1";
  const total_boxes = q.get("total_boxes") ?? "1";
  const all_sh_running = decodeURIComponent(q.get("all_sh_running") ?? "");
  const scanned_at = decodeURIComponent(q.get("scanned_at") ?? "");

  const soList = all_sh_running
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const printedRef = useRef(false);

  useEffect(() => {
    if (printedRef.current) return;
    const t = setTimeout(() => {
      printedRef.current = true;
      window.print();
    }, 500);
    window.onafterprint = () => {
      window.close();
    };
    return () => {
      clearTimeout(t);
      window.onafterprint = null;
    };
  }, []);

  const formattedDate = scanned_at
    ? `${dayjs(scanned_at).locale("th").format("dddd D/MMM")}/${(dayjs(scanned_at).year() + 543).toString().slice(-2)} ${dayjs(scanned_at).format("HH:mm")} น.`
    : "";

  return (
    <div
      style={{
        width: "98mm",
        height: "98mm",
        margin: "auto",
        fontFamily: '"Fahkwang", sans-serif',
        pageBreakInside: "avoid",
      }}
      className="p-2 text-sm"
    >
      {/* Header */}
      <div className="flex justify-between">
        <p className="font-bold text-[18px] rotate-[-12deg] mt-2">Wangpharma</p>
        <p className="font-semibold text-[22px] mt-3">
          {box_no} / {total_boxes}
        </p>
        <div className="flex flex-col justify-center items-center">
          <p className="font-bold text-[17px]">{route_code || "อื่นๆ"}</p>
          <p className="font-bold text-[16px]">
            <span className="text-[12px] font-bold">รหัสลูกค้า </span>
            {mem_code}
          </p>
        </div>
      </div>

      {/* Address line */}
      <div>
        <p className="text-[10px]">
          23 ซ.พัฒโน ถ.อนุสรณ์อาจารย์ทอง ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110
        </p>
        <p className="text-[10px]">
          074-366681-5 www.wangpharma.com Line ID : orderwangpharma
        </p>
      </div>

      {/* Customer + Barcode */}
      <div className="border-t">
        <div className="flex justify-between">
          <div className="w-[65%] flex justify-center items-center mt-4">
            <p className="font-semibold text-[18px]">{mem_name}</p>
          </div>
          <div className="w-[35%] flex flex-col justify-center items-center mt-1">
            <Barcode
              value={mem_code || ""}
              format="CODE128"
              width={1.4}
              height={25}
              displayValue={false}
              background="transparent"
              fontSize={7}
              margin={0}
            />
          </div>
        </div>
      </div>

      {/* SO list */}
      <div className="flex justify-center items-center border-t border-b py-0.5">
        <p
          className={
            soList.join(", ").length > 66 ? "text-[9px]" : "text-[12px]"
          }
        >
          {soList.join(" , ")}
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-center items-center border-b">
        <div className="w-full h-12 flex flex-col justify-center items-center gap-0.5">
          <div className="flex items-center gap-1">
            <img src={correct} className="w-5" />
            <p className="text-[13px] font-bold">สแกนบิลครบแล้ว</p>
          </div>
          <p className="text-[10px] text-center leading-tight">{formattedDate}</p>
        </div>
      </div>
    </div>
  );
};

export default ScanConfirmSticker;
