import { useEffect, useState } from "react";
import Barcode from "react-barcode";
import triangle from "../assets/bleach.png";
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
  const mem_name = queryParams.get("mem_name");
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

  const [JSONpackedEmpData, setJSONpackedEmpData] = useState<Employees>();
  const [JSONQCEmpData, setJSONQCEmpData] = useState<Employees>();
  const [JSONprepareEmpData, setJSONprepareEmpData] = useState<Employees>();

  useEffect(() => {
    if (prepareEmpData && QCEmpData && packedEmpData) {
      setJSONQCEmpData(JSON.parse(QCEmpData));
      setJSONpackedEmpData(JSON.parse(packedEmpData));
      setJSONprepareEmpData(JSON.parse(prepareEmpData));
    }
  }, [prepareEmpData, QCEmpData, packedEmpData]);

  //   useEffect(() => {
  //     if (JSONQCEmpData && JSONpackedEmpData && JSONprepareEmpData) {
  //       window.onafterprint = () => {
  //         window.close();
  //       };
  //       window.print();
  //     }
  //   }, [JSONQCEmpData, JSONpackedEmpData, JSONprepareEmpData]);

  useEffect(() => {
    window.onafterprint = () => {
      window.close();
    };
    window.print();
  }, []);

  const renderSticker = (index: number) => (
    <div
      key={index}
      className="border-t-2 border-b-2 mt-6 w-full p-2 text-sm break-after-page"
      style={styles.container}
    >
      <div className="flex justify-between">
        <p className="font-semibold">Wangpharma</p>
        <p className="font-semibold text-[18px]">
          {index + 1} / {printCount}
        </p>
        <div className="flex flex-col justify-center items-center">
          <p className="font-semibold text-[16px]">เส้นทาง</p>
          <p className="text-[7px]">L1-3</p>
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
        <div className="flex justify-between mt-2">
          <div className="w-[70%] flex justify-center mt-5">
            <p className="font-semibold text-[16px]">ชื่อร้าน</p>
          </div>
          <div className="w-[30%] flex flex-col justify-center items-center mt-1">
            <p className="text-[7px]">Customer Code</p>
            <div className="scale-100">
              <Barcode
                value="123456789012"
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
        <div className="w-[100%] flex justify-between mt-1">
          <div>
            <p className="text-[8px]">ที่อยู่ลูกค้า เบอร์โทรลูกค้า</p>
            <p className="text-[8px]">จังหวัด</p>
          </div>
          <p className="text-[8px]">ลูกค้า:</p>
        </div>
        <div className="flex justify-between mt-1 border-t-1 border-b-1 py-1 px-26">
          <div className="flex">
            <p className="text-[7px]">อาทิตย์ - อาทิตย์</p>
          </div>
          <div className="flex">
            <p className="text-[7px]">00.00 - 00.00</p>
          </div>
        </div>
        <div className="flex border-b-1 py-1 justify-center px-1">
          <div className="w-[80%] flex justify-center">
            <div className="flex border rounded-sm justify-center border-gray-500">
              <div className="w-10 border-r p-2 flex justify-center items-center mr-1 border-gray-500">
                <img src={triangle} className="m-1"></img>
              </div>
              <div className="p-1">
                <p className="text-center">
                  ส่งสินค้าวันเว้นวัน ที่ร้านวัสดุก่อสร้าง
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-[20%] flex-col items-center justify-center">
            <p className="text-[7px]">Shipping No.</p>
            <QRCodeSVG value={`${132432 || ""}`} size={40} />
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center border-b">
        <div className="w-[40%] flex flex-col justify-center items-center">
          <div className="flex justify-between p-1 gap-5">
            <p className="text-[8px]">Ordering time line:</p>
            <p className="text-[8px]">ขาย / คีย์</p>
          </div>
          <p className="text-[8px] pb-1">[]</p>
        </div>
        <div className="w-[60%] flex flex-col justify-center items-center border-l">
          <div className="flex justify-between p-1 gap-15">
            <p className="text-[8px]">Ordering time line:</p>
            <p className="text-[8px]">ตรวจ / </p>
          </div>
          <p className="text-[8px]">[] ชื่อ [] ชื่อ [] ชื่อ</p>
          <p className="text-[8px] pb-1">| | </p>
        </div>
      </div>
      <div className="flex justify-center items-center border-b">
        <div className="w-[33%] flex flex-col justify-center items-center border-r h-10">
          <p className="text-[16px] font-bold p-2">ลังนี้มีบิล</p>
        </div>
        <div className="w-[33%] flex flex-col justify-center items-center border-r h-10">
          <p className="text-[8px]">สายรถ</p>
          <p className="text-[10px]">เส้นทางขนส่ง</p>
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
