import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import Barcode from "react-barcode";

export interface ShoppingOrder {
  so_id: number;
  so_running: string;
  so_procode: string;
  so_amount: number;
  so_qc_amount: number;
  so_qc_request: number;
  so_unit: string;
  sh_running: string;
  picking_status: string;
  emp_code_floor_picking: string;
  so_picking_time: Date;
  so_qc_deficit: number;
  so_qc_note: null;
  so_already_qc: string;
  so_qc_time: null;
  emp_prepare_by: null;
  emp_qc_by: null;
  emp_packed_by: null;
  product: Product;
  shoppingHead: ShoppingHead;
  emp: Emp;
}

export interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  product_image_url: string;
  product_barcode: string;
  product_floor: string;
  product_addr: string;
  product_stock: string;
  product_unit: string;
  created_at: Date;
  updated_at: Date;
  detail: Detail[];
}

export interface Detail {
  product_detail_id: number;
  product_code: string;
  product_lot: string;
  product_exp: Date;
  creditor_code: string;
  quantity: string;
  unit_price: number;
  unit: string;
  total_price: number;
  note: null;
  purchase_entry_no: string;
  created_at: Date;
}

export interface ShoppingHead {
  sh_id: number;
  sh_running: string;
  sh_datetime: Date;
  mem_code: string;
  emp_code_picking: string;
  picking_status: string;
  picked_time: Date;
  picking_time: Date;
  sh_already_qc: string;
  emp_prepare_by: null;
  emp_qc_by: null;
  emp_packed_by: null;
  members: Members;
}

export interface Members {
  mem_id: number;
  mem_code: string;
  mem_name: string;
  province: string;
  address_line1: null;
  address_line2: null;
  sub_district: null;
  district: null;
  postal_code: null;
  emp_code: string;
  picking_status: string;
  mem_note: null;
  emp_code_picking: null;
  picking_time_start: Date;
  picking_time_end: Date;
  route_code: string;
  mem_tel: null;
  mem_route: MemRoute;
}

export interface MemRoute {
  route_code: string;
  route_name: string;
}

export interface Emp {
  emp_id: number;
  emp_code: string;
  created_at: Date;
  updated_at: Date;
  emp_name: string;
  emp_nickname: string;
  emp_tel: string;
  emp_floor: string;
}

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

export interface dataForEmp {
  dataEmp: Employees;
  mem_route: MemRoute[];
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
  table: {
    width: "100%",
    margin: "auto",
    fontSize: "10px",
    borderCollapse: "collapse" as const,
  },
  td: {
    padding: 0,
    verticalAlign: "middle" as const,
    border: "1px solid #333",
    whiteSpace: "nowrap" as const,
  },
  img: {
    width: "90px",
    height: "81px",
  },
  p: {
    margin: "auto",
    whiteSpace: "nowrap" as const,
  },
  smallFloatLeft: {
    float: "left" as const,
  },
  smallFloatRight: {
    float: "right" as const,
  },
};

const RequestProduct: React.FC = () => {
  const queryParams = new URLSearchParams(location.search);
  const so_running = queryParams.get("so_running");
  const [data, setData] = useState<ShoppingOrder | null>(null);
  const prepareEmpData = sessionStorage.getItem("prepare-emp");
  const QCEmpData = sessionStorage.getItem("qc-emp");
  const packedEmpData = sessionStorage.getItem("packed-emp");
  const [imageLoaded, setImageLoaded] = useState(false);

  const [JSONpackedEmpData, setJSONpackedEmpData] = useState<dataForEmp>();
  const [JSONQCEmpData, setJSONQCEmpData] = useState<dataForEmp>();
  const [JSONprepareEmpData, setJSONprepareEmpData] = useState<dataForEmp>();

  const handleGetData = async (so_running: string) => {
    const data = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/qc/get-rt/${so_running}`
    );
    if (data.status === 200 && data) {
      setData(data.data);
    }
  };

  useEffect(() => {
    if (prepareEmpData && QCEmpData && packedEmpData) {
      setJSONQCEmpData(JSON.parse(QCEmpData));
      setJSONpackedEmpData(JSON.parse(packedEmpData));
      setJSONprepareEmpData(JSON.parse(prepareEmpData));
    }
  }, [prepareEmpData, QCEmpData, packedEmpData]);

  useEffect(() => {
    if (so_running) {
      handleGetData(so_running);
    }
  }, [so_running]);

  useEffect(() => {
    console.log(data);
  }, [data]);

  useEffect(() => {
    if (
      JSONQCEmpData &&
      JSONpackedEmpData &&
      JSONprepareEmpData &&
      data &&
      imageLoaded
    ) {
      window.onafterprint = () => {
        window.close();
      };
      window.print();
    }
  }, [JSONQCEmpData, JSONpackedEmpData, JSONprepareEmpData, data, imageLoaded]);

  return (
    <div style={styles.container} className="grid grid-rows-9 border">
      <div className="row-span-1 grid grid-cols-3 divide-x divide-black border-b">
        <div className="col-span-2 p-1">
          <div className="w-full flex justify-between">
            <p className="text-[8px]">เลขที่ใบกำกับ</p>
            <p className="text-[8px]">BI : {data?.sh_running}</p>
          </div>
          <div className="flex justify-left overflow-hidden w-full">
            <div className="scale-100">
              <Barcode
                value={data?.sh_running || ""}
                format="CODE128"
                width={1.2}
                height={20}
                displayValue={false}
                background="transparent"
                margin={0}
              />
            </div>
          </div>
        </div>
        <div className="col-span-1 p-1">
          <div className="w-full flex justify-center">
            <p className="text-[6px]">ใส่เวลา</p>
          </div>
          <div className="w-full grid grid-cols-3 text-center">
            <div className="grid-cols-1">
              <p className="text-[8px]">ผู้ดูแล</p>
              <p className="text-[8px] font-bold">
                {JSONprepareEmpData?.dataEmp?.emp_nickname}
              </p>
            </div>
            <div className="grid-cols-1">
              <p className="text-[8px]">ผู้จัด</p>
              <p className="text-[8px] font-bold">
                {JSONQCEmpData?.dataEmp?.emp_nickname}
              </p>
            </div>
            <div className="grid-cols-1">
              <p className="text-[8px]">แพ็ค</p>
              <p className="text-[8px] font-bold">
                {JSONpackedEmpData?.dataEmp?.emp_nickname}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="row-span-2 grid grid-cols-6 divide-x divide-black border-b">
        <div className="col-span-3 grid grid-rows-2">
          <div className="row-span-1 border-b p-1">
            <div className="w-full flex justify-between">
              <p className="text-[8px]">รหัสสินค้า</p>
              <p className="text-[8px]">IC : {data?.product?.product_code}</p>
            </div>
            <div className="flex justify-left overflow-hidden w-full">
              <div className="scale-100">
                <Barcode
                  value={data?.product?.product_code || ""}
                  format="CODE128"
                  width={1.2}
                  height={20}
                  displayValue={false}
                  background="transparent"
                  margin={0}
                />
              </div>
            </div>
          </div>
          <div className="row-span-1 p-1">
            <div className="w-full flex justify-between">
              <p className="text-[8px]">รหัสเจ้าหนี้</p>
              <p className="text-[8px]">
                AR :{" "}
                {Array.isArray(data?.product?.detail) &&
                data.product.detail.length > 0
                  ? data.product.detail[0]?.creditor_code
                  : "ไม่มีข้อมูล"}
              </p>
            </div>
            {Array.isArray(data?.product?.detail) && data?.product?.detail[0]?.creditor_code && (
              <div className="flex justify-left overflow-hidden w-full">
                <div className="scale-100">
                  <Barcode
                    value={Array.isArray(data?.product?.detail) && data?.product?.detail[0]?.creditor_code || ""}
                    format="CODE128"
                    width={1.2}
                    height={20}
                    displayValue={false}
                    background="transparent"
                    margin={0}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="col-span-2">
          <div className="flex justify-center">
            <img
              style={styles.img}
              src={
                data?.product?.product_image_url.startsWith("..")
                  ? `https://www.wangpharma.com${data?.product?.product_image_url.slice(
                      2
                    )}`
                  : data?.product?.product_image_url
              }
              onLoad={() => setImageLoaded(true)}
            ></img>
          </div>
        </div>
        <div className="col-span-1 grid grid-rows-8">
          <div className="row-span-5 border-b text-center p-1">
            <p className="text-[8px]">คงเหลือ</p>
            <p className="text-[12px] font-bold">
              {data?.product?.product_stock}
            </p>
            <p className="text-[8px]">ขวด</p>
          </div>
          <div className="row-span-3 p-1 w-full flex justify-center">
            <div className="flex gap-1 items-center">
              <p className="text-[10px]">ชั้น</p>
              <p className="text-[12px] font-bold">
                {data?.product?.product_floor}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="row-span-1 grid grid-cols-9 divide-x divide-black border-b">
        <div className="col-span-3 p-1">
          <div className="w-full flex justify-between">
            <p className="text-[8px]">รหัสลูกค้า</p>
            <p className="text-[8px]">AP : {data?.shoppingHead?.mem_code}</p>
          </div>
          {data?.shoppingHead?.mem_code && (
            <div className="flex justify-left overflow-hidden w-full">
              <div className="scale-100">
                <Barcode
                  value={data?.shoppingHead?.mem_code}
                  format="CODE128"
                  width={1.2}
                  height={20}
                  displayValue={false}
                  background="transparent"
                  margin={0}
                />
              </div>
            </div>
          )}
        </div>
        <div className="col-span-6 grid grid-rows-2">
          <div className="row-span-1 border-b flex justify-center p-0.5 w-full">
            <p className="text-[9px]">
              {data?.shoppingHead?.members?.mem_name}
            </p>
          </div>
          <div className="row-span-2 grid grid-cols-3 divide-x divide-black">
            <div className="col-span-1 w-full flex justify-center p-1">
              <p className="text-[8px] font-bold">
                {data?.shoppingHead?.members?.mem_route?.route_name}
              </p>
            </div>
            <div className="col-span-2 w-full flex justify-center p-1">
              <p className="text-[8px] font-bold">
                {data?.shoppingHead?.members?.mem_tel}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="row-span-1 grid grid-rows-2 border-b p-1">
        <div className="row-span-1 w-full flex justify-center">
          <p className="text-[10px] font-semibold">
            {data?.product?.product_name}
          </p>
        </div>
        <div className="row-span-1 w-full flex justify-center gap-4">
          <div className="flex gap-1 items-center">
            <p className="text-[10px] font-semibold">สั่ง</p>
            <p className="text-[12px] font-semibold">{data?.so_amount}</p>
            <p className="text-[10px] font-semibold">{data?.so_unit}</p>
          </div>
          <div className="flex gap-1 items-center">
            <p className="text-[10px] font-semibold">คนจัด : </p>
            {
              <p className="text-[10px] font-semibold">
                {data?.emp?.emp_nickname}
              </p>
            }
          </div>
        </div>
      </div>
      <div className="row-span-1 grid grid-cols-3 divide-x divide-black border-b">
        <div className="col-span-1 grid grid-rows-2">
          <div className="row-span-1 border-b flex justify-left w-full gap-1 p-1">
            <p className="text-[8px]">วันที่ :</p>
            {Array.isArray(data?.product?.detail) && data?.product?.detail[0]?.created_at && (
              <p className="text-[8px]">
                {Array.isArray(data?.product?.detail) && dayjs(data?.product?.detail[0]?.created_at).format(
                  "DD-MM-YYYY"
                )}
              </p>
            )}
          </div>
          <div className="row-span-1 flex justify-left w-full gap-1 p-1">
            <p className="text-[8px]">ซื้อ :</p>
            <p className="text-[8px]">
              {Array.isArray(data?.product?.detail) && data?.product?.detail[0]?.purchase_entry_no}
            </p>
          </div>
        </div>
        <div className="col-span-1 grid grid-rows-2">
          <div className="row-span-1 border-b flex justify-left w-full gap-1 p-1">
            <p className="text-[8px]">วันที่ :</p>
            <p className="text-[8px]">ไม่มีข้อมูล</p>
          </div>
          <div className="row-span-1 flex justify-left w-full gap-1 p-1">
            <p className="text-[8px]">คืน :</p>
            <p className="text-[8px]">ไม่มีข้อมูล</p>
          </div>
        </div>
        <div className="col-span-1 grid grid-rows-2">
          <div className="row-span-1 border-b flex justify-left w-full gap-1 p-1">
            <p className="text-[8px]">วันที่ :</p>
            <p className="text-[8px]">ไม่มีข้อมูล</p>
          </div>
          <div className="row-span-1 flex justify-left w-full gap-1 p-1">
            <p className="text-[8px]">สั่ง :</p>
            <p className="text-[8px]">ไม่มีข้อมูล</p>
          </div>
        </div>
      </div>
      <div className="row-span-1 grid grid-rows-2 border-b">
        <div className="row-span-1 grid grid-cols-3 divide-x divide-black border-b">
          <div className="col-span-1">
            <div className="flex justify-left w-full gap-1 p-1">
              <p className="text-[8px]">ซื้อ :</p>
              <p className="text-[8px]">{Array.isArray(data?.product?.detail) && data?.product?.detail[0]?.quantity}</p>
              <p className="text-[8px]">{Array.isArray(data?.product?.detail) && data?.product?.detail[0]?.unit}</p>
            </div>
          </div>
          <div className="col-span-1">
            <div className="flex justify-left w-full gap-1 p-1">
              <p className="text-[8px]">คืน :</p>
              <p className="text-[8px]">ไม่มีข้อมูล</p>
            </div>
          </div>
          <div className="col-span-1">
            <div className="flex justify-left w-full gap-1 p-1">
              <p className="text-[8px]">สั่ง :</p>
              <p className="text-[8px]">ไม่มีข้อมูล</p>
            </div>
          </div>
        </div>
        <div className="row-span-1 grid grid-cols-3 divide-x divide-black">
          <div className="col-span-1">
            <div className="flex justify-left w-full gap-1 p-1">
              <p className="text-[8px]">ซื้อ+แถม :</p>
              <p className="text-[8px]">ไม่มีข้อมูล</p>
            </div>
          </div>
          <div className="col-span-2">
            <div className="flex justify-center w-full gap-1 p-1">
              <p className="text-[8px]">ผู้แทน :</p>
              <p className="text-[8px]">ไม่มีข้อมูล</p>
            </div>
          </div>
        </div>
      </div>
      <div className="row-span-2 grid grid-cols-3 divide-x divide-black">
        <div className="col-span-2 grid grid-rows-4">
          <div className="row-span-1 border-b">
            <div className="flex justify-center w-full gap-1 p-1">
              <p className="text-[8px]">
                Lot : {Array.isArray(data?.product?.detail) && data?.product?.detail[0]?.product_lot}
              </p>
              <p className="text-[8px]">
                Exp :{" "}
                {Array.isArray(data?.product?.detail) && dayjs(data?.product?.detail[0]?.product_exp).format(
                  "DD-MM-YYYY"
                )}
              </p>
            </div>
          </div>
          <div className="row-span-1 border-b"></div>
          <div className="row-span-1 border-b">
            <div className="flex justify-left w-full gap-1 p-1">
              <p className="text-[7px]">ปรับ :</p>
              <p className="text-[7px]">ไม่มีข้อมูล</p>
            </div>
          </div>
          <div className="row-span-1 grid grid-cols-3 divide-black divide-x">
            <div className="col-span-1 flex justify-center w-full gap-1 p-1">
              <p className="text-[8px]">[ ] แก้บิล..............</p>
            </div>
            <div className="col-span-1 flex justify-center w-full gap-1 p-1">
              <p className="text-[8px]">[ ] RTIN..............</p>
            </div>
            <div className="col-span-1 flex justify-center w-full gap-1 p-1">
              <p className="text-[8px]">[ ] ปรับออก..............</p>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex w-full h-full items-center justify-center">
          <div className="transform -rotate-45 origin-center">
            <p className="text-[10px] font-bold">{data?.so_procode}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestProduct;
