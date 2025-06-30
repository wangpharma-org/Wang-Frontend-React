import { useEffect, useState } from "react";
import axios from "axios";
import reciept from "../assets/receipt.png";
import order from "../assets/sent.png";
import statistics from "../assets/employees statistics.png";
import checklist from "../assets/checklist.png";
import barcode from "../assets/barcode-scanner.png"
import reportPicking from "../assets/report-picking.png";
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
    name: "สถิติการจัดออเดอร์ (พนักงาน)",
    href: "/report",
    imageSrc: reportPicking,
  },
  {
    id: 6,
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
  const defaultVisibility = listMenu.reduce((acc, menu) => {
    acc[menu.id] = false; // เริ่มต้นเป็น false ทุกเมนู
    return acc;
  }, {} as Record<number, boolean>);

  const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>(defaultVisibility);

  useEffect(() => {
    // โหลดสถานะของแต่ละปุ่ม (แมพจาก listMenu.id)
    const fetchVisibility = async () => {
      const results = await Promise.all(
        listMenu.map(async (menu) => {
          try {
            const res = await axios.get(
              `${import.meta.env.VITE_API_URL_VERIFY_ORDER}/api/hide-button/${menu.id}`
            );
            console.log(`Fetched visibility for id ${menu.id}:`, res.data.value);
            return { id: menu.id, visible: res.data.value };
          } catch (err) {
            console.error(`Error fetching for id ${menu.id}`, err);
            return { id: menu.id, visible: true }; // fallback ให้แสดงปุ่ม
          }
        })
      );

      const map: Record<number, boolean> = {};
      results.forEach(({ id, visible }) => {
        map[id] = visible;
      });
      setVisibilityMap(map);
    };

    fetchVisibility();
  }, []);

  
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8 cursor-pointer">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          เมนูหลัก
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {listMenu
            .filter((menu) => visibilityMap[menu.id] !== false) // ซ่อนเฉพาะที่ได้ false
            .map((menu) => (
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
              <h3 className="text-sm font-medium text-gray-800 group-hover:text-blue-500 text-center">
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
