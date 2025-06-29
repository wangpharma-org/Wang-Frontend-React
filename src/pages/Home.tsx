import { useEffect, useState } from "react";
import axios from "axios";
import reciept from "../assets/receipt.png";
import order from "../assets/sent.png";
import statistics from "../assets/employees statistics.png";
import checklist from "../assets/checklist.png";
import barcode from "../assets/barcode-scanner.png"
import { useNavigate } from "react-router";
const listMenu = [
  {
    id: 1,
    name: "ใบกำกับสินค้า",
    href: "/invoice-all",
    imageSrc: reciept,
  },
  {
    id: 2,
    name: "ระบบตรวจสอบสินค้า (QC)",
    href: "/dashboard-qc",
    imageSrc: barcode,
  },
  {
    id: 3,
    name: "จัดออเดอร์",
    href: "/order-list",
    imageSrc: order,
  },
  
  {
    id: 4,
    name: "สถิติการจัดออเดอร์",
    href: "/employee-statistics",
    imageSrc: statistics,
  },
  {
    id: 5,
    name: "ตรวจสอบบิล",
    href: "/verify-order",
    imageSrc: checklist,
  },
];
const Home = () => {
  const navigate = useNavigate()
  const handleNavigate = (link: string) => {
    navigate(link)
  }
  const [showButtonVerifyBill, setShowButtonVerifyBill] = useState<boolean>(true);

    useEffect(() => {
    fetchButtonVisibility();
  }, []);
  const fetchButtonVisibility = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL_VERIFY_ORDER}/api/hide-button`);
      const value = res.data.value;
      setShowButtonVerifyBill(value);

      console.log(value ? "Unhided ButtonVerify" : "Hided ButtonVerify");
    } catch (error) {
      console.error("Error fetching button visibility:", error);
    }
  };

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8 cursor-pointer">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          เมนูหลัก
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {listMenu.map((menu) => (
            <a
              key={menu.id}
              onClick={() => handleNavigate(menu.href)}
              className="group flex flex-col items-center rounded-lg bg-white p-4 shadow hover:shadow-lg hover:scale-105 transition"
            >
              <div className="w-20 h-20 mb-2">
                <img
                  src={menu.imageSrc}
                  className="w-full h-full rounded-md object-cover"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-800 group-hover:text-blue-500">
                {menu.name}
              </h3>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Home;
