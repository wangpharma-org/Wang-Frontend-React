import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { QRCodeSVG } from "qrcode.react";
import { useMemo } from "react";

const FormatSticker = () => {
  const ticketId = new URLSearchParams(window.location.search).get("ticketId");
  const emp_code = new URLSearchParams(window.location.search).get("emp_code");
  const emp_name = new URLSearchParams(window.location.search).get("emp_name");
  const sh_running = new URLSearchParams(window.location.search).get(
    "sh_running"
  );
  const mem_code = new URLSearchParams(window.location.search).get("mem_code");
  const mem_name = new URLSearchParams(window.location.search).get("mem_name");
  const route_code = new URLSearchParams(window.location.search).get(
    "route_code"
  );
  const route_name = new URLSearchParams(window.location.search).get(
    "route_name"
  );
  const emp_code_request = new URLSearchParams(window.location.search).get(
    "emp_code_request"
  );
  const emp_name_request = new URLSearchParams(window.location.search).get(
    "emp_name_request"
  );
  const floor_count2 = new URLSearchParams(window.location.search).get(
    "floor_count2"
  );
  const floor_count3 = new URLSearchParams(window.location.search).get(
    "floor_count3"
  );
  const floor_count4 = new URLSearchParams(window.location.search).get(
    "floor_count4"
  );
  const floor_count5 = new URLSearchParams(window.location.search).get(
    "floor_count5"
  );
  const type = new URLSearchParams(window.location.search).get("type");
  const count = new URLSearchParams(window.location.search).get("count");
  const floor = new URLSearchParams(window.location.search).get("floor");
  const countBox = new URLSearchParams(window.location.search).get("countBox");

  const printData = useMemo(() => ({
    emp_code: emp_code ?? null,
    emp_name: emp_name ?? null,
    sh_running:
      sh_running
        ?.split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0) ?? null,
    mem_code: mem_code ?? null,
    mem_name: mem_name ?? null,
    route_code: route_code ?? null,
    route_name: route_name ?? null,
    emp_code_request: emp_code_request ?? null,
    emp_name_request: emp_name_request ?? null,
    floor_count2: floor_count2 ? Number(floor_count2) : 0,
    floor_count3: floor_count3 ? Number(floor_count3) : 0,
    floor_count4: floor_count4 ? Number(floor_count4) : 0,
    floor_count5: floor_count5 ? Number(floor_count5) : 0,
    floor: floor ? Number(floor) : 0,
    type: type ?? null,
    count: count ? Number(count) : null,
    countBox: countBox ? Number(countBox) : 0,
  }), [
    emp_code,
    emp_name,
    sh_running,
    mem_code,
    mem_name,
    route_code,
    route_name,
    emp_code_request,
    emp_name_request,
    floor_count2,
    floor_count3,
    floor_count4,
    floor_count5,
    floor,
    type,
    count,
    countBox,
  ]);

  const [loading, setLoading] = useState(true);
  const printedRef = useRef(false);

  console.log(ticketId);

  useEffect(() => {
     if (printedRef.current) return;
    setLoading(false);
    if (!printData) return;
    const printTimeout = setTimeout(() => {
        printedRef.current = true;
      window.print();
    }, 1000);
    window.onafterprint = () => {
      localStorage.setItem("print_status", "done");
      window.close();
    };
    return () => {
      clearTimeout(printTimeout);
      window.onafterprint = null;
    };
  }, [printData]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  return (
    <div className="page h-full w-full mt-2">
      <div className="p-2 flex justify-between align-text-top">
        <div className="flex items-baseline gap-1.5">
          <p className="text-[16px]">คนจัด</p>
          <p className="text-[22px] font-bold">{printData.emp_name}</p>
        </div>
        <div>
          {printData?.emp_name_request && (
            <div className="flex items-baseline gap-1.5">
              <p className="text-[16px]">รายการขอเพิ่ม : </p>
              <p className="text-[22px] font-bold">
                {printData?.emp_name_request}
              </p>
            </div>
          )}
          {printData?.type && printData.count && (
            <div className="flex items-baseline gap-1.5 font-bold text-[20px]">
              <p>{printData.type}ที่ {printData.count}</p>
            </div>
          )}
        </div>
      </div>

      {printData.sh_running?.map((_, index: number) => {
        if (index % 2 !== 0) return null;

        return (
          <div key={index} className="flex justify-between px-2">
            <div className="border w-full text-center text-[18px]">
              {printData.sh_running?.[index] || ""}
            </div>
            <div className="border w-full text-center text-[18px]">
              {printData.sh_running?.[index + 1] || ""}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between pt-2 px-2">
        <table className="border text-center w-full border-collapse">
          <thead>
            <tr className="border">
              <th className="border text-[14px] pt-0.5">เหลือง</th>
              <th className="border text-[14px] pt-0.5">น้ำเงิน</th>
              <th className="border text-[14px] pt-0.5">แดง</th>
              <th className="border text-[14px] pt-0.5">เขียว</th>
            </tr>
            <tr className="border">
              <th className="border text-[14px]">F2</th>
              <th className="border text-[14px]">F3</th>
              <th className="border text-[14px]">F4</th>
              <th className="border text-[14px]">F5</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border text-[15px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count2 > 0 ? "✓" : "x"}
              </td>
              <td className="border text-[15px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count3 > 0 ? "✓" : "x"}
              </td>
              <td className="border text-[15px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count4 > 0 ? "✓" : "x"}
              </td>
              <td className="border text-[15px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count5 > 0 ? "✓" : "x"}
              </td>
            </tr>
            <tr>
              <td className="border text-[17px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count2}
              </td>
              <td className="border text-[17px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count3}
              </td>
              <td className="border text-[17px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count4}
              </td>
              <td className="border text-[17px] pt-0.5 font-bold w-[25%]">
                {printData.floor_count5}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between px-2 pt-2">
        <div>
          <p className="border flex justify-start text-[20px] px-5 font-bold">
            F{floor}
          </p>
        </div>
        <div>
          <p className="flex justify-end text-[14px]">
            {dayjs().format("DD/MM/YYYY HH:mm")}
          </p>
        </div>
      </div>
      <div className="flex justify-between align-top mx-4">
        <div className="flex items-start justify-center mt-1">
          {printData.mem_code && (
            <QRCodeSVG value={printData.mem_code} size={60} />
          )}
        </div>

        <div className="text-right">
          <p className="text-[30px] font-bold">{printData.mem_code}</p>
        </div>
      </div>
      <div className="text-right mr-3">
        <p className="text-[30px]">{printData.mem_name}</p>
      </div>

      <div className="flex justify-between pl-2 text-[28px] font-bold">
        <p>{printData.route_name ?? "อื่นๆ"}</p>
      </div>

      {printData.type === "ตะกร้า" && countBox == '0' ? <div>
          <p className="text-[20px] font-bold px-2">
            จำนวนลังที่พิมพ์: {countBox || 0}
          </p>
        </div> : null
      }

    </div>
  );
};
export default FormatSticker;
