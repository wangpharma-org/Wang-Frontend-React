import { useEffect, useState } from "react";
import Barcode from "react-barcode";
import triangle from "../assets/bleach.png";
import dayjs from "dayjs";
import axios from "axios";
import clock from "../assets/clock.png";
import calendar from "../assets/check-mark.png";
import correct from "../assets/correct.png";
import { QRCodeSVG } from "qrcode.react";

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
    border: "1px solid #333",
    margin: "auto",
    fontFamily: '"Fahkwang", sans-serif',
    pageBreakInside: "avoid" as const,
  },
};

const BoxStickerBlock = () => {
  const queryParams = new URLSearchParams(location.search);
  const mem_code = queryParams.get("mem_code");
  const printCount = parseInt(queryParams.get("print") || "1");

  const sh_running = queryParams.get("sh_running");

  const [sh_running_array, setSh_running_array] = useState<string[]>([]);

  const prepareEmpData = sessionStorage.getItem("prepare-emp");
  const QCEmpData = sessionStorage.getItem("qc-emp");
  const packedEmpData = sessionStorage.getItem("packed-emp");

  const [JSONpackedEmpData, setJSONpackedEmpData] = useState<dataForEmp>();
  const [JSONQCEmpData, setJSONQCEmpData] = useState<dataForEmp>();
  const [JSONprepareEmpData, setJSONprepareEmpData] = useState<dataForEmp>();
  const [dataPrint, setDataPrint] = useState<Address | null>(null);

  useEffect(() => {
    if (prepareEmpData && QCEmpData && packedEmpData) {
      setJSONQCEmpData(JSON.parse(QCEmpData));
      setJSONpackedEmpData(JSON.parse(packedEmpData));
      setJSONprepareEmpData(JSON.parse(prepareEmpData));
    }
    if (sh_running) {
      const shRunningArray = sh_running.split(",");
      setSh_running_array(shRunningArray);
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

  const renderSticker = (index: number) => (
    <div
      key={index}
      className="border-t-2 border-b-2 w-full p-2 text-sm break-after-page"
      style={styles.container}
    >
      <div className="flex justify-between">
        <div>
          <p className="font-semibold text-[18px]">
            {index + 1} / {printCount}
          </p>
          <p className="text-2xl font-bold">{mem_code}</p>
        </div>
        <div className="flex flex-col justify-left items-end">
          <p className="font-semibold text-[11px]">{`${dayjs().format(
            "DD-MM"
          )}-${dayjs().year() + 543} ${dayjs().format("HH:mm")}`}</p>
          <div className="flex">
            <div className="flex flex-col justify-start items-end mr-1">
              <p className="text-[11px]">สแกนบาร์โค้ดที่เครื่อง QC</p>
              <p className="text-[11px]">เพื่อสั่งพิมพ์สติกเกอร์ติดลังใหม่</p>
            </div>
            <QRCodeSVG value={sh_running || ""} size={60}></QRCodeSVG>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-center">
          <div className="w-[80%] flex justify-center mt-2">
            <p className="font-semibold text-[23px]">{dataPrint?.mem_name}</p>
          </div>
        </div>
        <div className="w-[100%] flex justify-between mt-1 px-10">
          <div>
            <p className="text-[12px]">{`${dataPrint?.address_line1 ?? ""} ${
              dataPrint?.address_line2 ?? ""
            } ผู้ดูแล : ${dataPrint?.sub_district ?? ""}`}</p>
            <p className="text-[12px] mt-1">{`QC: ${
              dataPrint?.district ?? ""
            }`}</p>
          </div>
          <div>
            <p className="text-[12px]">
              เบอร์โทรลูกค้า : {dataPrint?.mem_tel ?? "-"}
            </p>
            <p className="text-[12px] mt-1">
              เส้นทาง : {dataPrint?.mem_route?.route_name ?? "อื่นๆ"}
            </p>
          </div>
        </div>
        <div className="w-[100%] flex justify-center mt-3">
          <div className="grid grid-cols-2 gap-x-20 gap-y-2">
            {sh_running_array.map((sh_running) => (
              <div className="col-span-1">{sh_running}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {Array.from({ length: printCount }).map((_, index) =>
        renderSticker(index)
      )}
    </>
  );
};

export default BoxStickerBlock;
