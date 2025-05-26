import React, { useState } from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import productImage from "../assets/ตัวอย่างสินค้า.png";

interface RequestNewProductModelProps {
  onClose: () => void;
  initialQuantity?: number;
}

const RequestNewProductModel = ({
  onClose,
  initialQuantity = 0,
}: RequestNewProductModelProps) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unit, setUnit] = useState("ขวด");
  const units = [
    {
      id: 1,
      label: "ขวด",
    },
    { 
      id: 2, 
      label: "กล่อง" 
    },
    {
      id: 3,
      label: "ชิ้น"
    },
    {
      id: 4,
      label: "แพ็ค"
    }
  ];

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleChange = (e: { target: { value: string } }) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setQuantity(value);
    } else {
      setQuantity(1);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden flex flex-col">
        {/* Product Image */}
        <div className="p-4 border-b">
          <div className="border rounded-md p-3">
            <div className="mb-2">
              <div className="text-blue-700 font-bold text-xl">Omega-3</div>
              <div className="text-cyan-400">สมอง ระบบประสาท สายตา</div>
              <div className="text-right text-3xl font-bold">30</div>
              <div className="text-right text-3xl font-bold">แคปซูล</div>
            </div>
            <div className="flex justify-center">
              <img
                src={productImage}
                alt="Omega-3"
                className="h-64 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="p-6">
          <div className="text-gray-700 mb-4 text-lg">จำนวนที่ต้องการซื้อ</div>

          <div className="relative mb-6">
            <input
              type="text"
              value={quantity}
              onChange={handleChange}
              className="w-full border border-blue-300 rounded-md p-3 text-center text-3xl text-blue-600"
            />
            <div className="absolute right-0 top-0 bottom-0 flex flex-col">
              <button
                onClick={handleIncrement}
                className="flex-1 px-3 bg-gray-200 rounded-tr-md hover:bg-gray-300"
              >
                <ChevronUp size={20} />
              </button>
              <button
                onClick={handleDecrement}
                className="flex-1 px-3 bg-gray-200 rounded-br-md hover:bg-gray-300"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* Unit Selection */}
          <div className="flex justify-center mb-6 gap-4">
            {units.map((unitOption) => (
              <label key={unitOption.id} className="flex items-center cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    name="unit"
                    value={unitOption.label}
                    checked={unit === unitOption.label}
                    onChange={() => setUnit(unitOption.label)}
                    className="appearance-none w-8 h-8 rounded-full border-2 border-blue-500 cursor-pointer"
                  />
                  {unit === unitOption.label && (
                    <div className="absolute w-4 h-4 bg-blue-500 rounded-full pointer-events-none"></div>
                  )}
                </div>
                <span className="ml-2 text-xl">{unitOption.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestNewProductModel;
