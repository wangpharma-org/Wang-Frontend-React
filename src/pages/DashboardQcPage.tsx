import React, { useEffect, useState } from "react";
import {
  Check,
  X,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Printer,
  Barcode,
  Package,
  File,
} from "lucide-react";
import QcModals from "../components/QcModal";
import RequestNewProductModel from "../components/RequestNewProductModel";
import SendOtherMoal from "../components/PrintDocument";
import SpecialExpressModal from "../components/SpecialExpressModal";
import FragilePrint from "../components/FragilePrint";
import FreeShippingModal from "../components/FreeShippingModal";

const DashboardPage = () => {
  const [openModal, setOpenModal] = useState(false);
  const [reqNewProduct, setReqNewProduct] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pinCart, setPinCart] = useState(0);

  const inputPinCart = () => {
    const input = prompt("กรอก จำนวน ตะกร้า (เฉพาะตัวเลข)");
    if (input !== null) {
      const newQuantity = parseInt(input);
      if (!isNaN(newQuantity) && newQuantity > 0) {
        setPinCart(newQuantity);
      }
    }
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1)); // ไม่ให้น้อยกว่า 1
  };

  const isReqNewPro = () => {
    setReqNewProduct(true);
  };

  const isOpenModal = () => {
    setOpenModal(true);
  };
  return (
    <div className="flex flex-col bg-white w-full font-sans text-sm">
      {/* Header */}
      <div className="border-b">
        <h1 className="text-center text-3xl font-medium p-2 text-gray-800">
          เส้นทางที่สามารถทำงานได้
        </h1>
        <div className="text-sm text-center px-4 pb-2 text-gray-600 overflow-hidden whitespace-nowrap">
          หาดใหญ่, สงขลา, สะเดา, ปัตตานี, สตูล, พัทลุง, นราธิวาส, สุไหงโกลก,
          ยะลา, เบตง, นครศรีฯ, รับเอง, อื่นๆ, สทิงพระ, ภูเก็ต, สุราษธานี, พังงา,
          ยาแห้ง ส่งฟรี ทั่วไทย, พัทลุง VIP, เกาะสมุย, พัทลุง-นคร, ชุมพร,
          กระบี่-ตรัง
        </div>
      </div>

      {/* Three column layout */}
      <div className="flex flex-row">
        {/* Column 1: Left sidebar with bill numbers */}
        <div className="w-64 border-r">
          {/* Section 1 */}
          <div className="border-b border-gray-300">
            <div className="px-2 py-1 bg-gray-100 font-medium text-sm text-center border-b border-gray-300">
              หมายเลขบินที่ 1
            </div>
            <div className="relative">
              <div className="p-3 text-center">
                <div className="text-2xl font-medium text-gray-700">
                  0210-352879
                </div>
              </div>
              <div className="absolute top-0 right-0 w-8 h-full flex flex-col items-center justify-center border-l border-gray-300">
                <div className="text-lg font-medium text-red-500">...</div>
                <div className="text-lg font-medium text-green-500 border-t border-gray-300">
                  ...
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs px-2 py-1 border-t border-gray-300">
              <span className="text-gray-600">สีแดง : สินค้า</span>
              <span className="text-gray-600">สีเขียว : ตะกร้า</span>
            </div>
          </div>

          {/* Section 2 */}
          <div className="border-b border-gray-300">
            <div className="px-2 py-1 bg-gray-100 font-medium text-sm text-center border-b border-gray-300">
              หมายเลขบินที่ 2
            </div>
            <div className="relative">
              <div className="p-3 text-center">
                <div className="text-2xl font-medium text-gray-700">
                  เลขบิลที่ 2
                </div>
              </div>
              <div className="absolute top-0 right-0 w-8 h-full flex flex-col items-center justify-center border-l border-gray-300">
                <div className="text-lg font-medium text-red-500">...</div>
                <div className="text-lg font-medium text-green-500 border-t border-gray-300">
                  ...
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs px-2 py-1 border-t border-gray-300">
              <span className="text-gray-600">สีแดง : สินค้า</span>
              <span className="text-gray-600">สีเขียว : ตะกร้า</span>
            </div>
          </div>

          {/* Sections 3-6 (simplified) */}
          {[3, 4, 5, 6].map((num) => (
            <div key={num} className="border-b border-gray-300">
              <div className="px-2 py-1 bg-gray-100 font-medium text-sm text-center border-b border-gray-300">
                หมายเลขบินที่ {num}
              </div>
              <div className="relative">
                <div className="p-3 text-center">
                  <div className="text-2xl font-medium text-gray-700">
                    เลขบิลที่ {num}
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-8 h-full flex flex-col items-center justify-center border-l border-gray-300">
                  <div className="text-lg font-medium text-red-500">...</div>
                  <div className="text-lg font-medium text-green-500 border-t border-gray-300">
                    ...
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs px-2 py-1 border-t border-gray-300">
                <span className="text-gray-600">สีแดง : สินค้า</span>
                <span className="text-gray-600">สีเขียว : ตะกร้า</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 2: Main dashboard content */}
        <div className="flex-1 p-3">
          {/* Top section with store/product info */}
          <div className="flex mb-4">
            <div className="w-1/2 pr-2">
              <div className="text-center text-red-500 font-medium">ด่วน</div>
              <div className="rounded-md border overflow-hidden">
                <div className="bg-gray-50 p-2 font-medium">63005</div>
                <div className="p-2 text-center text-sm bg-blue-50 text-blue-600">
                  ร้านจริญเฮลท์ 2008 L16
                  <div className="text-xs">ส่งที่ ห้าไทย</div>
                </div>
              </div>
            </div>

            <div className="w-1/2 pl-2">
              <div className="text-sm text-center">
                เงื่อนไขการรับสินค้า และการตรวจสอบ จะดูลูกค้านี้
              </div>
              <input className="bg-gray-100 h-10 w-full border border-gray-300 mt-4" />
            </div>
          </div>
          <div className="border border-gray-500"></div>

          {/* Status indicators */}
          <div className="flex mb-4 mt-4 gap-2">
            <div className="flex-1 border rounded-md overflow-hidden flex">
              <div className="w-12 bg-green-100 flex items-center justify-center">
                <Check className="text-green-500" size={24} />
              </div>
              <div className="flex-1 flex items-center justify-center text-3xl font-medium">
                0
              </div>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden flex">
              <div className="w-12 bg-red-100 flex items-center justify-center">
                <X className="text-red-500" size={24} />
              </div>
              <div className="flex-1 flex items-center justify-center text-3xl font-medium">
                2
              </div>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden flex">
              <div className="w-12 bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="text-yellow-500" size={24} />
              </div>
              <div className="flex-1 flex items-center justify-center text-3xl font-medium">
                0
              </div>
            </div>

            <div className="flex-1 border rounded-md overflow-hidden flex">
              <div className="w-12 bg-orange-100 flex items-center justify-center">
                <div className="font-bold text-orange-500">RT</div>
              </div>
              <div className="flex-1 flex items-center justify-center text-3xl font-medium">
                0
              </div>
            </div>
          </div>

          <div className="border border-gray-500"></div>

          {/* Counter section */}
          <div className="flex mb-4 mt-4 gap-2">
            {/* Column 1: หยิบสินค้า */}
            <div className="w-1/6">
              <div className="text-sm mb-1 px-2">หยิบ สินค้า</div>
              <div className="border border-green-500 rounded-md p-2 text-center text-xl text-green-600 font-medium">
                0
              </div>
            </div>

            {/* Column 2: ไม่หยิบสินค้า และปุ่มพิมพ์บาร์โค้ด */}
            <div className="w-1/6">
              <div className="text-sm mb-1 px-2">ไม่หยิบ สินค้า</div>
              <div className="border border-red-500 rounded-md p-2 text-center text-xl text-red-600 font-medium">
                2
              </div>

              <button
                // onClick={isOpenPrintModal}
                className="mt-3 w-full bg-blue-400 hover:bg-blue-500 text-white rounded-md p-2 flex items-center justify-center"
              >
                <Printer size={16} className="mr-1" />
                <span>พิมพ์บาร์โค้ด QC</span>
              </button>
              {/* แค่เปิด Modal ไม่ต้องส่งข้อมูล documentData */}
              {/* {showPrintModal && (
                <BarcodeQcPrintModal
                  onClose={() => setShowPrintModal(false)}
                  orderId="63005" // อาจส่งเฉพาะ ID หรือข้อมูลที่จำเป็นเพื่อให้ Modal ดึงข้อมูลเอง
                  shopName="ร้านจริญเฮลท์ 2008 L16"
                />
              )} */}
            </div>

            {/* Column 3: รหัสสินค้า*/}
            <div className="w-full">
              <div className="mt-6 flex flex-row mb-2 gap-4">
                <input
                  type="text"
                  placeholder="รหัสสินค้า / Barcode Number"
                  className="bg-orange-300 text-white p-3 rounded-md text-4xl text-center w-full h-20 border border-amber-600"
                />
                {openModal && <QcModals onClose={() => setOpenModal(false)} />}
                <button
                  onClick={isOpenModal}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-md px-4 py-2 text-sm whitespace-nowrap"
                >
                  เช็คบิล
                </button>
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="flex bg-gray-800 text-white text-xs rounded-t-md">
            <div className="w-10 p-2 text-center border-r border-gray-700">
              ที่ No
            </div>
            <div className="w-16 p-2 text-center border-r border-gray-700">
              คนจัด Picking
            </div>
            <div className="w-20 p-2 text-center border-r border-gray-700">
              รหัสสินค้า Product Number
            </div>
            <div className="w-32 p-2 text-center border-r border-gray-700">
              หมายเลขบาร์โค้ด Barcode Number
            </div>
            <div className="flex-1 p-2 text-center border-r border-gray-700">
              รายละเอียด Description
            </div>
            <div className="w-16 p-2 text-center border-r border-gray-700">
              จำนวน <span className="text-cyan-300">สั่ง</span> Order
            </div>
            <div className="w-16 p-2 text-center border-r border-gray-700">
              จำนวน <span className="text-red-500">ขาด</span> Absences
            </div>
            <div className="w-12 p-2 text-center border-r border-gray-700">
              หน่วย Unit
            </div>
            <div className="w-12 p-2 text-center border-r border-gray-700">
              สถานะ Status
            </div>
            <div className="w-24 p-2 text-center">หมายเหตุ comnment</div>
            <div className="w-24 p-2 text-center">พิมพ์จองสินค้า</div>
          </div>
          <div className="bg-purple-100 px-2 py-1 text-right text-xs">
            (หมายเหตุ- 01B0W/2FHYE)
          </div>
          {/* Table Content */}
          {[1, 2].map((number) => (
            <div
              key={number}
              className="border-l border-r border-b rounded-b-md"
            >
              {/* Table Row 1 */}
              <div className="bg-green-50 border-b">
                <div className="flex items-stretch">
                  {/* ลำดับ */}
                  <div className="w-10 p-2 text-center text-sm flex items-center justify-center">
                    {number}
                  </div>

                  {/* ยกเลิก Picking */}
                  <div className="w-16 p-2 flex flex-col items-center justify-center border-l border-gray-200">
                    <div className="text-xs mb-1">ชั้น 4</div>
                    <div className="w-6 h-6 bg-red-500 rounded-sm"></div>
                  </div>

                  {/* รหัสสินค้า */}
                  <div className="w-20 p-2 flex flex-col items-center justify-center border-l border-gray-200">
                    <div className="text-center">72011909</div>
                    <div className="text-center text-xs text-gray-500">
                      ยังไม่เช็ค
                    </div>
                  </div>

                  {/* บาร์โค้ด */}
                  <div className="w-32 p-2 flex items-center justify-center border-l border-gray-200">
                    <div className="text-xs text-gray-600">8858757501____</div>
                  </div>

                  {/* รายละเอียด */}
                  <div className="flex-1 p-2 border-l border-gray-200">
                    <div className="text-blue-500 font-medium mb-1">ยาพารา</div>
                    <div className="flex flex-col text-xs mb-2">
                      <div className="flex justify-between">
                        <span className="text-blue-400">จำนวน : </span>
                        <span className="text-orange-400 font-medium">
                          คงเหลือ: <span className="text-black">15</span>{" "}
                          <span className="text-green-500">ขวด</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-400">จำนวน : </span>
                      </div>
                      <div>
                        <span className="text-blue-400">เลขใบคีย์ซื้อ</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-green-50 rounded-md p-2 border border-gray-200">
                      <div className="flex items-center">
                        <div className="bg-orange-400 w-5 h-5 rounded-sm mr-2"></div>
                        <div className="text-gray-700">0210-352879</div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-gray-500 mr-2">01B0W/2FHYE</div>
                        <div className="bg-white w-5 h-5 rounded-sm border border-gray-300"></div>
                      </div>
                    </div>
                  </div>

                  {/* จำนวน Order */}
                  <div className="w-16 p-2 text-center flex flex-col items-center justify-center border-l border-gray-200">
                    <div className="font-medium">2</div>
                    <div className="text-xs">ใบขาว</div>
                  </div>

                  {/* จำนวน NG */}
                  <div className="w-16 p-2 text-center flex flex-col items-center justify-center border-l border-gray-200">
                    <div className="font-medium text-red-500 text-xl">2</div>
                  </div>

                  {/* หน่วย */}
                  <div className="w-12 p-2 flex items-center justify-center border-l border-gray-200">
                    <p>ขวด ใบขาว</p>
                  </div>

                  {/* สถานะ */}
                  <div className="w-12 p-2 flex items-center justify-center border-l border-gray-200">
                    <X className="text-red-500" size={18} />
                  </div>

                  {/* หมายเหตุ */}
                  <div className="w-24 p-2 border-l border-gray-200">
                    <div className="flex flex-col space-y-1">
                      <label className="flex items-center">
                        <input type="radio" name="status1" className="mr-1" />
                        <span className="text-xs">ขาด</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="status1" className="mr-1" />
                        <span className="text-xs">ไม่ครบ</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status1"
                          checked
                          className="mr-1"
                        />
                        <span className="text-xs text-blue-500">ห้อปลีก</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="status1" className="mr-1" />
                        <span className="text-xs">ห้อส่ง</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="status1" className="mr-1" />
                        <span className="text-xs">ไม่มีของ</span>
                      </label>
                    </div>
                  </div>
                  <div className="w-24 p-2 border-l border-gray-200">
                    <div className="flex flex-col gap-y-2">
                      <button
                        onClick={isReqNewPro}
                        className="flex items-center justify-center border border-blue-500 bg-blue-500 rounded-sm"
                      >
                        <File size={16} className="mr-1" />
                        ขอใหม่
                      </button>
                      {reqNewProduct && (
                        <RequestNewProductModel
                          onClose={() => setReqNewProduct(false)}
                        />
                      )}
                      <button className="flex items-center justify-center border border-blue-500 bg-blue-500 rounded-sm">
                        <File size={16} className="mr-1" />
                        ไปเอาของ
                      </button>
                      <button className="flex items-center justify-center border border-red-400 bg-red-400 rounded-sm">
                        <File size={16} className="mr-1" />
                        ส่ง RT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Column 3: Right side buttons and controls */}
        <div className="w-64 border-l p-3">
          <div className="text-xs mb-1 text-gray-500">
            พนักงานตรวจสอบสินค้า :
          </div>
          <div className="flex items-center mb-2">
            <div className="w-10 h-6 bg-orange-200 rounded-sm mr-2 flex items-center justify-center">
              <Barcode />
            </div>
            <div className="text-xs border rounded-sm px-2 py-1 w-full text-center">
              [ 0313 ] ตร
            </div>
          </div>

          <div className="text-xs mb-1 text-gray-500">
            พนักงานเช็คสินค้าคงคลัง 1 :
          </div>
          <div className="flex items-center mb-2">
            <div className="w-10 h-6 bg-red-200 rounded-sm mr-2 flex items-center justify-center">
              <Package />
            </div>
            <div className="text-xs border rounded-sm px-2 py-1 w-full text-center">
              [ 0313 ] ตร
            </div>
          </div>

          <div className="text-xs mb-1 text-gray-500">
            พนักงานเช็คสินค้าคงคลัง 2 :
          </div>
          <div className="flex items-center mb-2">
            <div className="w-10 h-6 bg-red-200 rounded-sm mr-2 flex items-center justify-center">
              <Package />
            </div>
            <div className="text-xs border rounded-sm px-2 py-1 w-full text-center">
              [ 0313 ] ตร
            </div>
          </div>

          <div className="text-sm text-center mb-1">จำนวนสินค้า</div>
          <div className="flex mb-4">
            <div className="border rounded-l-md p-2 text-center flex-1 text-3xl">
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="flex flex-col">
              <button
                onClick={increaseQuantity}
                className="bg-green-500 p-1 rounded-tr-md"
              >
                <ArrowUp size={16} className="text-white" />
              </button>
              <button
                onClick={decreaseQuantity}
                className="bg-red-500 p-1 rounded-br-md"
              >
                <ArrowDown size={16} className="text-white" />
              </button>
            </div>
          </div>

          <SendOtherMoal />
          {/* <button onClick={isOpenPrintModal} className="w-full bg-purple-600 text-white p-2 rounded-md mb-2 flex items-center justify-center">
            <File size={16} className="mr-1" />
            <span>ฝากขนส่งอื่น</span>
          </button>
          {showPrintModal && (
                <BarcodeQcPrintModal
                  onClose={() => setShowPrintModal(false)}
                  orderId="63005" // อาจส่งเฉพาะ ID หรือข้อมูลที่จำเป็นเพื่อให้ Modal ดึงข้อมูลเอง
                  shopName="ร้านจริญเฮลท์ 2008 L16"
                />
              )} */}

          {/* Action buttons for the items */}
          <div className="mt-4">
            <div className="flex items-center justify-around gap-2">
              {/* <button onClick={openSpecialExpressModal} className="flex-1 bg-amber-300 h-8 border border-amber-400 rounded-sm">
                กรณีด่วนพิเศษ
              </button>
              {printSpecialExpressModal && (<SpecialExpressModal onClose={() => setPrintSpecialExpressModel(false)}/>)} */}
              <SpecialExpressModal />
              {/* <button className="flex-1 bg-red-400 h-8 border border-red-500 rounded-sm">
                ระวังแตก
              </button> */}
              <FragilePrint />
            </div>
            <div className="flex flex-col items-center justify-center mt-4 gap-y-4">
              <button
                onClick={inputPinCart}
                className="flex-1 h-14 w-full bg-amber-300 border border-amber-400 rounded-sm text-lg font-medium px-4"
              >
                ติดตะกร้า รอลงลัง ส่งฟรี
              </button>
              <FreeShippingModal
                pinCart={pinCart}
                orderData={{
                  orderNumber: "63005",
                  shopName: "ร้านเจริญเภสัช 2008",
                  date: "13 / 05 / 68",
                  time: "17:01",
                  sheetNumber: 1,
                  totalSheets: 1,
                  basketStatus: "ติดตะกร้า รอลงลัง สีฟรีทั่วไทย",
                  basketNumber: 1,
                  totalBaskets: 1,
                }}
                autoPrint={pinCart > 0}
              />
              <button className="flex-1 h-14 w-full bg-green-500 border border-green-600 rounded-sm text-lg font-medium px-4">
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
