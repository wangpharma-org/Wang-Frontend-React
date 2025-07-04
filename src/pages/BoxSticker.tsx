import { useEffect, useState } from "react";
import Barcode from "react-barcode";
import triangle from "../assets/bleach.png";
import dayjs from "dayjs";
import axios from "axios";
import clock from "../assets/clock.png";
import calendar from "../assets/check-mark.png";
import correct from "../assets/correct.png";

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

const BoxSticker = () => {
  const queryParams = new URLSearchParams(location.search);
  const mem_code = queryParams.get("mem_code");
  const printCount = parseInt(queryParams.get("print") || "1");

  const prepareEmpData = sessionStorage.getItem("prepare-emp");
  const QCEmpData = sessionStorage.getItem("qc-emp");
  const packedEmpData = sessionStorage.getItem("packed-emp");

  //   const getCurrentDateTime = () => {
  //     return new Date()
  //       .toLocaleString("en-GB", {
  //         year: "numeric",
  //         month: "2-digit",
  //         day: "2-digit",
  //         hour: "2-digit",
  //         minute: "2-digit",
  //         second: "2-digit",
  //         hour12: false,
  //       })
  //       .replace(",", "");
  //   };

  const [JSONpackedEmpData, setJSONpackedEmpData] = useState<dataForEmp>();
  const [JSONQCEmpData, setJSONQCEmpData] = useState<dataForEmp>();
  const [JSONprepareEmpData, setJSONprepareEmpData] = useState<dataForEmp>();
  const [dataPrint, setDataPrint] = useState<Address | null>(null);
  let sh_running = queryParams.get("sh_running");

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

  const renderSticker = (index: number) => (
    <div
      key={index}
      className="border-t-2 border-b-2 w-full p-2 text-sm break-after-page"
      style={styles.container}
    >
      <div className="flex justify-between mt-2">
        <p className="font-semibold">Wangpharma</p>
        <p className="font-semibold text-[18px]">
          {index + 1} / {printCount}
        </p>
        <div className="flex flex-col justify-center items-center">
          <p className="font-semibold text-[16px]">
            {dataPrint?.mem_route?.route_name ?? "อื่นๆ"}
          </p>
          <p className="text-[7px]">{dataPrint?.route_code ?? ""}</p>
        </div>
      </div>
      <div>
        <p className="text-[7px]">
          23 ซ.พัฒโน ถ.อนุสรณ์อาจารย์ทอง ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110{" "}
        </p>
        <p className="text-[7px]">
          074-366681-5 wwww.wangpharma.com Line ID : orderwangpharma
        </p>
      </div>
      <div className="border-t mt-1">
        <div className="flex justify-between ">
          <div className="w-[70%] flex justify-center mt-5">
            <p className="font-semibold text-[18px]">{dataPrint?.mem_name}</p>
          </div>
          <div className="w-[30%] flex flex-col justify-center items-center mt-1">
            <p className="text-[7px]">Customer Code</p>
            <div className="scale-100">
              <Barcode
                value={mem_code || ""}
                format="CODE128"
                width={0.8}
                height={23}
                displayValue={true}
                background="transparent"
                fontSize={7}
                margin={0}
              />
            </div>
          </div>
        </div>
        <div className="w-[100%] flex justify-between mt-1 pr-3">
          <div>
            <p className="text-[8px]">{`${dataPrint?.address_line1 ?? ""} ${
              dataPrint?.address_line2 ?? ""
            } ต.${dataPrint?.sub_district ?? ""}`}</p>
            <p className="text-[8px]">{`อ.${dataPrint?.district ?? ""} จ.${
              dataPrint?.province ?? ""
            } ${dataPrint?.postal_code ?? ""}`}</p>
          </div>
          <div>
            <p className="text-[8px]">
              เบอร์โทรลูกค้า : {dataPrint?.mem_tel ?? "-"}
            </p>
            {dataPrint?.emp?.emp_tel && (
              <p className="text-[8px]">
                ฝ่ายขาย : {dataPrint?.emp?.emp_tel ?? "-"}
              </p>
            )}
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
        <div className="flex py-1 justify-center px-1">
          <div className="w-[90%] flex justify-center">
            <div className="flex border rounded-sm justify-center border-gray-800">
              <div className="w-10 border-r p-2 flex justify-center items-center mr-1 border-gray-800">
                <img src={triangle} className="m-1"></img>
              </div>
              <div className="p-1 flex items-center text-center">
                <p className="text-center">
                  {dataPrint?.mem_shipping_note !== "" &&
                  dataPrint?.mem_shipping_note !== null
                    ? dataPrint?.mem_shipping_note
                    : "ไม่มีหมายเหตุการส่งสินค้า"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center mt-1 border-b-1">
          <p className="text-[8px]">{sh_running?.replace(/,/g, " , ")}</p>
        </div>
      </div>
      <div className="flex justify-center items-center border-b">
        <div className="w-[100%] flex flex-col justify-center items-center">
          <div className="flex justify-between p-1 gap-15">
            <p className="text-[8px]">Ordering time line:</p>
          </div>
          <p className="text-[8px]">
            พนักงานเตรียมสินค้า / พนักงานตรวจสอบ / พนักงานแพ็คสินค้าลงลัง
          </p>
          <p className="text-[8px]">
            [{JSONprepareEmpData?.dataEmp.emp_code}]{" "}
            {JSONprepareEmpData?.dataEmp?.emp_nickname} / [
            {JSONprepareEmpData?.dataEmp?.emp_code}] /{" "}
            {JSONQCEmpData?.dataEmp?.emp_nickname} [
            {JSONpackedEmpData?.dataEmp.emp_code}]{" "}
            {JSONpackedEmpData?.dataEmp.emp_nickname}
          </p>
          <p className="text-[8px] pb-1">{`${dayjs().format("DD-MM")}-${
            dayjs().year() + 543
          } ${dayjs().format("HH:mm")}`}</p>
        </div>
      </div>
      <div className="flex justify-center items-center border-b">
        <div className="w-[33%] border-r h-10 ">
          {index === 0 ? (
            <div className="flex justify-center items-center">
              <img src={correct} className="w-7"></img>
              <p className="text-[16px] font-bold p-2">ลังนี้มีบิล</p>
            </div>
          ) : (
            <p className="text-[16px] p-2 text-center font-extrabold">-</p>
          )}
        </div>
        <div className="w-[33%] flex flex-col justify-center items-center border-r h-10">
          <p className="text-[8px]">สายรถ</p>
          <p className="text-[10px]">
            หาดใหญ่ - {dataPrint?.mem_route?.route_name ?? "อื่นๆ"}
          </p>
        </div>
        <div className="w-[33%] flex flex-col justify-center items-center h-10">
          <p className="text-[8px]">จัดส่ง</p>
          <p className="text-[10px]">ขนส่งวังเภสัช</p>
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

export default BoxSticker;
