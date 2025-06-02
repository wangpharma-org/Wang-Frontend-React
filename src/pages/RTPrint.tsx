import React from "react";

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

const PrintRT: React.FC = () => {
  return (
    <div style={styles.container} className="grid grid-rows-9 border">
      <div className="row-span-1 grid grid-cols-3 divide-x divide-black border-b">
        <div className="col-span-2 p-1">
            <div className="w-full flex justify-between">
                <p className="text-[8px]">เลขที่ใบกำกับ</p>
                <p className="text-[8px]">BI : </p>
            </div>
            <div></div>
        </div>
        <div className="col-span-1 p-1">
            <div className="w-full flex justify-center">
                <p className="text-[6px]">ใส่เวลา</p>
            </div>
            <div className="w-full grid grid-cols-3 text-center">
                <div className="grid-cols-1">
                    <p className="text-[8px]">ผู้ดูแล</p>
                    <p className="text-[8px] font-bold">นาย</p>
                </div>
                <div className="grid-cols-1">
                    <p className="text-[8px]">ผู้จัด</p>
                    <p className="text-[8px] font-bold">นาย</p>
                </div>
                <div className="grid-cols-1">
                    <p className="text-[8px]">แพ็ค</p>
                    <p className="text-[8px] font-bold">นาย</p>
                </div>
            </div>
        </div>
      </div>
      <div className="row-span-2 grid grid-cols-6 divide-x divide-black border-b">
        <div className="col-span-3 grid grid-rows-2">
            <div className="row-span-1 border-b p-1">
                <div className="w-full flex justify-between">
                    <p className="text-[8px]">รหัสสินค้า</p>
                    <p className="text-[8px]">IC : </p>
                </div>
            </div>
            <div className="row-span-1 p-1">
                <div className="w-full flex justify-between">
                    <p className="text-[8px]">รหัสเจ้าหนี้</p>
                    <p className="text-[8px]">AP : </p>
                </div>
            </div>
        </div>
        <div className="col-span-2">
            <div className="flex justify-center">
                <img style={styles.img}></img>
            </div>
        </div>
        <div className="col-span-1 grid grid-rows-8">
            <div className="row-span-5 border-b text-center p-1">
                <p className="text-[8px]">คงเหลือ</p>
                <p className="text-[12px] font-bold">571</p>
                <p className="text-[8px]">ขวด</p>
            </div>
            <div className="row-span-3 p-1 w-full flex justify-center">
                <div className="flex gap-1 items-center">
                    <p className="text-[10px]">ชั้น</p>
                    <p className="text-[12px] font-bold">2</p>
                </div>
            </div>
        </div>
      </div>
      <div className="row-span-1 grid grid-cols-9 divide-x divide-black border-b">
        <div className="col-span-3 p-1">
            <div className="w-full flex justify-between">
                <p className="text-[8px]">รหัสลูกค้า</p>
                <p className="text-[8px]">AP : </p>
            </div>
        </div>
        <div className="col-span-6 grid grid-rows-2">
            <div className="row-span-1 border-b flex justify-center p-1 w-full">
                <p className="text-[8px]">ร้าน</p>
            </div>
            <div className="row-span-2 grid grid-cols-3 divide-x divide-black">
                <div className="col-span-1 w-full flex justify-center p-1">
                    <p className="text-[8px] font-bold">เส้นทาง</p>
                </div>
                <div className="col-span-2 w-full flex justify-center p-1">
                    <p className="text-[8px] font-bold">เบอร์โทร</p>
                </div>
            </div>
        </div>
      </div>
      <div className="row-span-1 grid grid-rows-2 border-b p-1">
        <div className="row-span-1 w-full flex justify-center">
            <p className="text-[12px] font-semibold">ชื่อสินค้า</p>
        </div>
        <div className="row-span-1 w-full flex justify-center gap-4">
            <div className="flex gap-1 items-center">
                <p className="text-[10px] font-semibold">สั่ง</p>
                <p className="text-[12px] font-semibold">1</p>
                <p className="text-[10px] font-semibold">หน่วย</p>
                <p className="text-[10px] font-semibold">/ ได้</p>
                <p className="text-[12px] font-semibold">1</p>
                <p className="text-[10px] font-semibold">หน่วย</p>
                <p className="text-[10px] font-semibold">/ RTIN</p>
                <p className="text-[12px] font-semibold">1</p>
                <p className="text-[10px] font-semibold">หน่วย</p>
            </div>
            <div className="flex gap-1 items-center">
                <p className="text-[10px] font-semibold">คนจัด : </p>
                <p className="text-[10px] font-semibold">นาย</p>
            </div>
        </div>
      </div>
      <div className="row-span-1 grid grid-cols-3 divide-x divide-black border-b">
        <div className="col-span-1 grid grid-rows-2">
            <div className="row-span-1 border-b flex justify-left w-full gap-1 p-1">
                <p className="text-[8px]">วันที่ :</p>
                <p className="text-[8px]">ไม่มีข้อมูล</p>
            </div>
            <div className="row-span-1 flex justify-left w-full gap-1 p-1">
                <p className="text-[8px]">ซื้อ :</p>
                <p className="text-[8px]">ไม่มีข้อมูล</p>
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
                    <p className="text-[8px]">ไม่มีข้อมูล</p>
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
                    <p className="text-[8px]">Lot :</p>
                    <p className="text-[8px]">ไม่มีข้อมูล</p>
                    <p className="text-[8px]">Exp :</p>
                    <p className="text-[8px]">ไม่มีข้อมูล</p>
                </div>
            </div>
            <div className="row-span-1 border-b">
            </div>
            <div className="row-span-1 border-b">
                <div className="flex justify-left w-full gap-1 p-1">
                    <p className="text-[8px]">ปรับ :</p>
                    <p className="text-[8px]">ไม่มีข้อมูล</p>
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
        <div className="col-span-1">
            
        </div>
      </div>
    </div>
  );
};

export default PrintRT;
