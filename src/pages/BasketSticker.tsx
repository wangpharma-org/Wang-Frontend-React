import { useEffect, useState } from "react";

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

const BasketSticker = () => {
  const queryParams = new URLSearchParams(location.search);
  const mem_code = queryParams.get("mem_code");
  const mem_name = queryParams.get("mem_name");
  const printCount = parseInt(queryParams.get("print") || "1");

  const prepareEmpData = sessionStorage.getItem("prepare-emp");
  const QCEmpData = sessionStorage.getItem("qc-emp");
  const packedEmpData = sessionStorage.getItem("packed-emp");

  const getCurrentDateTime = () => {
    return new Date()
      .toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(",", "");
  };

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

  useEffect(() => {
    if (JSONQCEmpData && JSONpackedEmpData && JSONprepareEmpData) {
      window.onafterprint = () => {
        window.close();
      };
      window.print();
    }
  }, [JSONQCEmpData, JSONpackedEmpData, JSONprepareEmpData]);

  const renderSticker = (index: number) => (
    <div
      key={index}
      className="border-t-2 border-b-2 mt-6 w-full p-2 text-sm break-after-page"
    >
      <div className="flex justify-between mb-2">
        <p className="text-base">ใบที่ / ทั้งหมด</p>
        <p className="text-base">
          {index + 1} / {printCount}
        </p>
      </div>

      <div className="text-center mb-2">
        <p className="text-4xl font-bold">{mem_code}</p>
        <p className="text-2xl font-bold mt-2">{mem_name}</p>
        <p className="text-base font-bold mt-2">{getCurrentDateTime()}</p>
        <p className="text-base font-bold mt-3">{`${JSONprepareEmpData?.emp_nickname} / ${JSONQCEmpData?.emp_name} / ${JSONpackedEmpData?.emp_name}`}</p>
      </div>

      <div className="flex justify-between mt-2">
        <p className="text-base">ติดตะกร้า รอลังลัง ส่งฟรีทั่วไทย</p>
        <p className="text-base">
          {index + 1} / {printCount}
        </p>
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

export default BasketSticker;
