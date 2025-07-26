import { useEffect, useState } from "react";
import axios from "axios";
import "../css/print.css";

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

const SticketRequestProduct = () => {
  const queryParams = new URLSearchParams(location.search);
  const mem_code = queryParams.get("mem_code");

  let sh_running = queryParams.get("sh_running");

  const prepareEmpData = sessionStorage.getItem("prepare-emp");
  const QCEmpData = sessionStorage.getItem("qc-emp");
  const packedEmpData = sessionStorage.getItem("packed-emp");

  const [JSONpackedEmpData, setJSONpackedEmpData] = useState<dataForEmp>();
  const [JSONQCEmpData, setJSONQCEmpData] = useState<dataForEmp>();
  const [JSONprepareEmpData, setJSONprepareEmpData] = useState<dataForEmp>();
  const [dataPrint, setDataPrint] = useState<Address | null>(null);
  const [transformedShRunning, setTransformedShRunning] = useState<string>("");

  useEffect(() => {
    if (sh_running && !sh_running.includes(",")) {
        setTransformedShRunning(sh_running += ",")
    } else {
        setTransformedShRunning(sh_running || "");
    }
  },[sh_running]);

  useEffect(() => {
    if (prepareEmpData && QCEmpData && packedEmpData) {
      setJSONQCEmpData(JSON.parse(QCEmpData));
      setJSONpackedEmpData(JSON.parse(packedEmpData));
      setJSONprepareEmpData(JSON.parse(prepareEmpData));
    }
  }, [prepareEmpData, QCEmpData, packedEmpData, transformedShRunning]);

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


  return (
    <div
      className="border-t-2 border-b-2 w-full p-2 text-sm break-after-page"
      style={styles.container}
    >

    </div>
  );
};

export default SticketRequestProduct;
