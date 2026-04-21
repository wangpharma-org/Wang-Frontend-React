import Barcode from "react-barcode";
import { useEffect } from "react";

const RecycleBoxBarcode = () => {
  const queryParams = new URLSearchParams(location.search);
  const uuid = queryParams.get("uuid") || "";
  const name = queryParams.get("name") || "";

  useEffect(() => {
    window.onafterprint = () => {
      localStorage.setItem("print_status", "done");
      window.close();
    };
    window.print();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <p className="text-base font-bold mb-1">{name}</p>
      <Barcode
        value={uuid}
        format="CODE128"
        width={1.5}
        height={40}
        displayValue={true}
        fontSize={8}
        margin={2}
      />
    </div>
  );
};

export default RecycleBoxBarcode;
