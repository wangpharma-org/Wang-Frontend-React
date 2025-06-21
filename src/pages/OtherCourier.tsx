import { useEffect, useState } from "react"
import axios from "axios"

export interface Address {
  mem_name: string;
  address_line1: string | null;
  address_line2: string | null;
  sub_district: string | null;
  district: string | null;
  postal_code: string | null;
  province: string | null;
  mem_tel: string | null;
}

const OtherCourier = () => {
  const [dataPrint, setDataPrint] = useState<Address>()
  const queryParams = new URLSearchParams(location.search);
  const mem_code = queryParams.get("mem_code");
  // const [hasPrinted , setHasPrinted] = useState<boolean>(false)
  
  useEffect(()=>{
    if (mem_code) {
      handleGet()
    }
  },[mem_code])

  useEffect(()=>{
    if (dataPrint) {
      window.onafterprint = () => {
        window.close();
      };
      console.log('data print', dataPrint)
      window.print()
    }
  },[dataPrint])

  const handleGet = async() => {
    const data = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/qc/get-address/${mem_code}`
    );
    setDataPrint(data.data);
  }

  return (
    <div className="p-2 mt-2"> 
      <div>
        <p className="text-[12px] font-bold">ชื่อผู้ส่ง</p>
        <p className="text-[12px]">บริษัท วังเภสัชฟาร์มาซูติคอล จำกัด</p>
        <p className="text-[12px]">141/3 ถ.รัถการ ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110</p>
        <p className="text-[12px]">โทร : 074-366681-5</p>
      </div>
      <div className="w-full pl-35 mt-5">
        <div>
          <p className="text-[12px] font-bold">ชื่อผู้รับ</p>
          <p className="text-[12px]">{dataPrint?.mem_name}</p>
          <p className="text-[12px]">{`${dataPrint?.address_line1?.replace(/@|&nbsp;|&amp;/g, ' ')} ${dataPrint?.address_line2?.replace(/@|&nbsp;|&amp;/g, ' ')}`}</p>
          <p className="text-[12px]">{`ต.${dataPrint?.sub_district?.replace(/@|&nbsp;|&amp;/g, ' ')}  อ.${dataPrint?.district?.replace(/@|&nbsp;|&amp;/g, ' ')} จ.${dataPrint?.province?.replace(/@|&nbsp;|&amp;/g, ' ')} ${dataPrint?.postal_code?.replace(/@|&nbsp;|&amp;/g, ' ')}`}</p>
          <p className="text-[12px]">{dataPrint?.mem_tel?.replace(/@|&nbsp;|&amp;/g, ' ') && `เบอร์ ${dataPrint?.mem_tel?.replace(/@|&nbsp;|&amp;/g, ' ')}`}</p>
        </div>
      </div>
    </div>
  )
}
export default OtherCourier