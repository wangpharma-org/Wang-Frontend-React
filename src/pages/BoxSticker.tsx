import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import dayjs from "dayjs";
import axios from "axios";
import clock from "../assets/clock.png";
import calendar from "../assets/check-mark.png";
import correct from "../assets/correct.png";
import "../css/print.css";
import phone from "../assets/phone-call.png";
import "dayjs/locale/th";
dayjs.locale("th");

export interface Employees {
  emp_id: number;
  emp_code: string;
  created_at: string;
  updated_at: string;
  emp_name: string;
  emp_nickname: string;
  emp_tel: string | null;
  emp_floor: string | null;
}

export interface MemRoute {
  route_code: string;
  route_name: string;
}

export interface dataForEmp {
  dataEmp: Employees;
  mem_route: MemRoute[];
}

export interface Address {
  mem_name: string;
  address_line1: string | null;
  address_line2: string | null;
  sub_district: string | null;
  district: string | null;
  postal_code: string | null;
  province: string | null;
  mem_tel: string | null;
  route_code: string | null;
  mem_shipping_note: string | null;
  mem_route: MemRoute;
  emp: Employees;
}

const styles = {
  container: {
    width: "98mm",
    height: "98mm",
    margin: "auto",
    fontFamily: '"Fahkwang", sans-serif',
    pageBreakInside: "avoid" as const,
  },
};

const BoxSticker = () => {
  const queryParams = new URLSearchParams(location.search);
  const mem_code = queryParams.get("mem_code");
  const printCount = parseInt(queryParams.get("print") || "1");

  const prepareEmpData = sessionStorage.getItem("prepare-emp");
  const QCEmpData = sessionStorage.getItem("qc-emp");
  const packedEmpData = sessionStorage.getItem("packed-emp");

  const [JSONpackedEmpData, setJSONpackedEmpData] = useState<dataForEmp>();
  const [JSONQCEmpData, setJSONQCEmpData] = useState<dataForEmp>();
  const [JSONprepareEmpData, setJSONprepareEmpData] = useState<dataForEmp>();
  const [dataPrint, setDataPrint] = useState<Address | null>(null);
  const sh_running = queryParams.get("sh_running");

  useEffect(() => {
    if (prepareEmpData && QCEmpData && packedEmpData) {
      setJSONQCEmpData(JSON.parse(QCEmpData));
      setJSONpackedEmpData(JSON.parse(packedEmpData));
      setJSONprepareEmpData(JSON.parse(prepareEmpData));
    }
  }, [prepareEmpData, QCEmpData, packedEmpData]);

  useEffect(() => {
    if (JSONQCEmpData && JSONpackedEmpData && JSONprepareEmpData && dataPrint) {
      window.onafterprint = () => {
        window.close();
      };
      window.print();
    }
  }, [JSONQCEmpData, JSONpackedEmpData, JSONprepareEmpData, dataPrint]);

  useEffect(() => {
    if (mem_code) {
      handleGet();
    }
  }, []);

  useEffect(() => {
    if (dataPrint) {
      console.log("data print", dataPrint);
    }
  }, [dataPrint]);

  const handleGet = async () => {
    const data = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/qc/get-address/${mem_code}`
    );
    console.log(data);
    setDataPrint(data.data);
  };

  const cleanText = (text?: string | null) =>
    (text ?? "").replace(/&nbsp;/g, "").trim();

  const renderSticker = (index: number) => (
    <div
      key={index}
      className="w-full p-2 text-sm break-after-page"
      style={styles.container}
    >
      <p className="text-[9px] text-center text-gray-500">ขอได้รับความขอบคุณจากวังเภสัช</p>
      <div className="flex justify-between">
        <p className="font-bold text-[18px] rotate-[-12deg] mt-2">Wangpharma</p>
        <p className="font-semibold text-[22px] mt-3">
          {index === 0 ? "บิล" : `${index} / ${printCount}`}
        </p>
        <div className="flex flex-col justify-center items-center">
          <p className="font-bold text-[17px]">
            {dataPrint?.mem_route?.route_name ?? "อื่นๆ"}
          </p>
          <p className="font-bold text-[16px]">
            <span className="text-[12px] font-bold">รหัสลูกค้า </span>{" "}
            {mem_code ?? ""}
          </p>
        </div>
      </div>
      <div>
        <p className="text-[10px]">
          23 ซ.พัฒโน ถ.อนุสรณ์อาจารย์ทอง ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110{" "}
        </p>
        <p className="text-[10px]">
          074-366681-5 wwww.wangpharma.com Line ID : orderwangpharma
        </p>
      </div>
      <div className="border-t">
        <div className="flex justify-between">
          <div className="w-[65%] mt-1">
            <p className="font-semibold text-[18px]">{dataPrint?.mem_name}</p>
            <p className="text-[12px] line-clamp-2 mt-1">
              {`${cleanText(dataPrint?.address_line1)} ${cleanText(
                dataPrint?.address_line2
              )} ต.${cleanText(dataPrint?.sub_district)}`}{" "}
              อ.{cleanText(dataPrint?.district)} จ.
              {cleanText(dataPrint?.province)}{" "}
              {cleanText(dataPrint?.postal_code)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <img src={phone} className="w-2.5 h-2.5"></img>
                <p className="text-[9px]">
                  {dataPrint?.mem_tel ?? "-"} <span>(ลูกค้า)</span>
                </p>
              </div>
              {dataPrint?.emp?.emp_tel && (
                <div className="flex items-center gap-1">
                  <img src={phone} className="w-2.5 h-2.5"></img>
                  <p className="text-[9px]">{dataPrint?.emp?.emp_tel} <span>(ฝ่ายขาย)</span></p>
                </div>
              )}
            </div>
          </div>
          <div className="w-[35%] flex justify-center items-center">
            <QRCodeSVG
              value={`WP|${mem_code}|${sh_running}|${index + 1}|${printCount}`}
              size={60}
            />
          </div>
        </div>
        <div className="flex justify-between mt-1 border-t-1 border-b-1 py-1 px-26">
          <div className="flex items-center gap-1">
            <img src={calendar} className="w-3"></img>
            <p className="text-[7px]">อาทิตย์ - อาทิตย์</p>
          </div>
          <div className="flex items-center gap-1">
            <img src={clock} className="w-3"></img>
            <p className="text-[7px]">00.00 - 00.00</p>
          </div>
        </div>
        <div className="flex justify-center items-center border-b-1 mt-0.5">
          <p
            className={`${sh_running && sh_running?.length > 66 ? "text-[9px]" : "text-[12px]"
              }`}
          >
            {sh_running?.replace(/,/g, " , ")}
          </p>
        </div>
      </div>
      <div className="flex justify-center items-center border-b">
        <div className="w-[100%] grid grid-cols-3 justify-center items-center">
          <div className="col-span-2 grid grid-cols-3 grid-rows-2">
            <p className="col-span-1">
              <p className="text-[12px] mt-1">เตรียม</p>
            </p>
            <p className="col-span-1">
              <p className="text-[12px] mt-1">ตรวจ</p>
            </p>
            <p className="col-span-1">
              <p className="text-[12px] mt-1">แพ็ค</p>
            </p>

            <p className="text-[12px] col-span-1">
              [{JSONprepareEmpData?.dataEmp.emp_code}]{" "}
              {JSONprepareEmpData?.dataEmp?.emp_nickname}
            </p>
            <p className="text-[12px] col-span-1">
              [{JSONQCEmpData?.dataEmp?.emp_code}] {" "}
              {JSONQCEmpData?.dataEmp?.emp_nickname}
            </p>
            <p className="text-[12px] col-span-1">
              [{JSONpackedEmpData?.dataEmp.emp_code}]{" "}
              {JSONpackedEmpData?.dataEmp.emp_nickname}
            </p>
          </div>
          <div className="col-span-1">
            <p className="text-[12px] pb-1 mt-1 font-bold">
              {`${dayjs().locale("th").format("dddd D/MMM")}/${(
                dayjs().year() + 543
              )
                .toString()
                .slice(-2)} ${dayjs().format("HH:mm")} น.`}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center border-b">
        <div className="w-[33%] border-r h-10 ">
          {index === 0 ? (
            <div className="flex justify-center items-center">
              <img src={correct} className="w-7"></img>
              <p className="text-[10px] p-1.5 font-bold text-center">เอกสารบิล <br />อยู่ในซองนี้</p>
            </div>
          ) : (
            <p className="text-[16px] p-2 text-center font-extrabold">-</p>
          )}
        </div>
        <div className="w-[33%] flex flex-col justify-center items-center border-r h-10">
          <p className="text-[12px]">สายรถ</p>
          <p className="text-[12px]">
            หาดใหญ่ - {dataPrint?.mem_route?.route_name ?? "อื่นๆ"}
          </p>
        </div>
        <div className="w-[33%] flex flex-col justify-center items-center h-10">
          <p className="text-[12px]">จัดส่ง</p>
          <p className="text-[12px]">ขนส่งวังเภสัช</p>
        </div>
      </div>
      <div className="flex py-0.5 justify-center">
        <div className="flex w-[100%] justify-center">
          <div className="flex w-[100%] justify-center border-b">
            <div className="flex p-0.5 items-center text-center justify-center w-full">
              <p className="text-center">
                {dataPrint?.mem_shipping_note !== "" &&
                  dataPrint?.mem_shipping_note !== null
                  ? dataPrint?.mem_shipping_note
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
      {index === 0 && (
        <div className="flex justify-center px-1">
          <p className="text-[9px] leading-tight text-center font-bold border-gray-800 rounded-sm px-1 py-0.5 w-[90%]">
            ⚠ กรุณาอย่ารับสินค้า หากซองนี้ถูกเปิดก่อนที่ท่านจะรับสินค้า
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {Array.from({ length: printCount + 1 }).map((_, index) =>
        renderSticker(index)
      )}
    </>
  );
};

export default BoxSticker;
