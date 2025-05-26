import { useState } from "react";
import { X, Package2 } from "lucide-react";
import productImage from "../assets/ตัวอย่างสินค้า.png";

const QcModal = ({ onClose }: { onClose: () => void }) => {
  const [quantity, setQuantity] = useState("2");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const statuses = [
    { id: "missing", label: "ขาด", color: "text-blue-500" },
    { id: "incomplete", label: "ไม่ครบ", color: "text-green-500" },
    { id: "wrong", label: "หยิบผิด", color: "text-cyan-400" },
    { id: "excess", label: "หยิบเกิน", color: "text-amber-500" },
    { id: "outOfStock", label: "ไม่มีของ", color: "text-red-500" },
  ];

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md w-full max-w-4xl">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <div className="text-xl text-red-500 font-medium">72011909</div>
            <p>ยาพารา</p>
          </div>
          <div className="flex-1 text-right text-green-500 font-medium">
            63005
            <br />
            ร้านจริญเฮลท์ 2008
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left side - Product Image */}
            <div className="w-full md:w-1/3 border border-gray-300">
              <div className="p-2 flex justify-center">
                <img
                  src={productImage}
                  alt="Omega 3 Fish Oil"
                  className="h-60 object-contain"
                />
              </div>
            </div>

            {/* Right side - Product Details */}
            <div className="w-full md:w-2/3">
              <div className="mb-4">
                <div className="text-2xl font-bold text-center text-gray-700">
                  72011909
                </div>
                <div className="text-lg text-center">
                  มามารีน ฟิชออยล์เม็ก3พลัสออย+มัลติวิตามินร์30แค็ป
                </div>
                <div className="text-lg text-center text-gray-600">
                  Mamarine Omega 3 Fish Oil And Multivitamin Dietary
                  Supplement...
                </div>
              </div>

              <div className="mb-4 flex items-baseline">
                <div className="text-lg mr-2">คงเหลือ</div>
                <div className="text-2xl text-green-500 mr-4">15</div>
                <div className="text-lg mr-2">ขวด</div>
                <div className="ml-auto text-lg">ชั้น</div>
                <div className="text-2xl text-red-500 ml-2">4</div>
              </div>

              <div className="mb-4 flex items-center">
                <div className="text-lg">ซื้อล่าสุด :</div>
                <div className="text-lg ml-2">72011909</div>
                <div className="text-lg ml-auto">08 /08 /68</div>
                <div className="text-lg ml-auto">30.00 ขวด</div>
              </div>

              <div className="mb-4 flex justify-center">
                <div className="bg-gray-100 p-2 w-3/4 text-center">
                  8858757014373 Or some barcode right here
                </div>
              </div>

              <div className="mb-8 mt-8">
                <div className="text-3xl text-center">
                  <span>คนหยิบ</span>
                  <span className="ml-4">น้อง</span>
                </div>
                <div className="text-3xl text-center">
                  <span>13/05/68</span>
                  <span className="ml-4">16:40:39</span>
                </div>
              </div>

              <div className="mb-4 flex items-center">
                <div className="text-green-500 mr-2">จำนวนสั่งซื้อ</div>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="border border-gray-300 rounded-md w-full max-w-xs p-2 text-center text-2xl text-red-500"
                />
                <div className="ml-4 text-lg">ขวด</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mb-4 flex flex-row items-center">
          <div className="w-1/2 pr-4">
            <button className="bg-blue-400 text-white ml-4 p-2 w-full rounded-md text-center">
              เช็ค Lot สินค้าให้เป็น Lot เดียวกันทุกตัว ลูกค้าคืน Lot ไม่ตรงกัน
            </button>
          </div>
          <div className="w-1/2 pl-4">
            <div className="flex flex-wrap items-center gap-x-4">
              {statuses.map((status) => (
                <label
                  key={status.id}
                  className="flex items-center cursor-pointer"
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="productStatus"
                      value={status.id}
                      checked={selectedStatus === status.id}
                      onChange={() => setSelectedStatus(status.id)}
                      className="appearance-none w-6 h-6 rounded-full border-2 border-gray-300 checked:border-blue-500 cursor-pointer"
                    />
                    {selectedStatus === status.id && (
                      <div className="absolute w-3 h-3 bg-blue-500 rounded-full pointer-events-none"></div>
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-8">
          <div className="text-gray-500 mb-2">มุมมองอื่นๆ</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="border border-gray-300 p-1">
              <img
                src={productImage}
                alt="Product 1"
                className="w-full h-32 object-cover"
              />
            </div>
            <div className="border border-gray-300 p-1">
              <img
                src={productImage}
                alt="Product 2"
                className="w-full h-32 object-cover"
              />
            </div>
            <div className="border border-gray-300 p-1">
              <img
                src={productImage}
                alt="Product 3"
                className="w-full h-32 object-cover"
              />
            </div>
            <div className="border border-gray-300 p-1">
              <img
                src={productImage}
                alt="Product 4"
                className="w-full h-32 object-cover"
              />
            </div>
          </div>
        </div>
        <div className="p-4 flex justify-between">
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2 bg-green-300 hover:bg-green-400 rounded-md text-gray-700"
          >
            <Package2 className="mr-1" size={18} />
            ตกลง
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-white"
          >
            <X className="mr-1" size={18} />
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
};

export default QcModal;
