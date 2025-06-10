import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { QRCodeSVG } from "qrcode.react";

const FormatSticker = () => {
  const [sticker, setSticker] = useState<any>(null);
  const ticketId = new URLSearchParams(window.location.search).get("ticketId");
  const token = sessionStorage.getItem("access_token");
  const [loading , setLoading] = useState(true);

  const route = [
    { id: 1, name: "เส้นทางการขนส่ง", value: "all" },
    { id: 2, name: "หาดใหญ่", value: "L1-1" },
    { id: 3, name: "สงขลา", value: "L1-2" },
    { id: 4, name: "สะเดา", value: "L1-3" },
    { id: 5, name: "สทิงพระ", value: "L1-5" },
    { id: 6, name: "นครศรีธรรมราช", value: "L10" },
    { id: 7, name: "กระบี่", value: "L11" },
    { id: 8, name: "ภูเก็ต", value: "L12" },
    { id: 9, name: "สุราษฎร์ธานี", value: "L13" },
    { id: 10, name: "ยาแห้ง ส่งฟรี ทั่วไทย", value: "L16" },
    { id: 11, name: "พังงา", value: "L17" },
    { id: 12, name: "เกาะสมุย", value: "L18" },
    { id: 13, name: "พัทลุง-นคร", value: "L19" },
    { id: 14, name: "ปัตตานี", value: "L2" },
    { id: 15, name: "ชุมพร", value: "L20" },
    { id: 16, name: "เกาะลันตา", value: "L21" },
    { id: 17, name: "เกาะพะงัน", value: "L22" },
    { id: 18, name: "สตูล", value: "L3" },
    { id: 19, name: "พัทลุง", value: "L4" },
    { id: 20, name: "พัทลุง VIP", value: "L4-1" },
    { id: 21, name: "นราธิวาส", value: "L5-1" },
    { id: 22, name: "สุไหงโกลก", value: "L5-2" },
    { id: 23, name: "ยะลา", value: "L6" },
    { id: 24, name: "เบตง", value: "L7" },
    { id: 25, name: "ตรัง", value: "L9" },
    { id: 26, name: "กระบี่-ตรัง", value: "L9-11" },
    { id: 27, name: "Office รับเอง", value: "Office" },
  ];

  console.log(
    `${import.meta.env.VITE_API_URL_ORDER}/api/picking/detail/${ticketId}`
  );
  console.log(ticketId);
  useEffect(() => {
    if (!sticker) return;
    const printTimeout = setTimeout(() => {
        window.print();
    }, 1000);
    window.onafterprint = () => {
      localStorage.setItem("print_status", "done");
      window.close();
    };
    return () => {
      clearTimeout(printTimeout);
      window.onafterprint = null;
    };
  }, [sticker]);

  useEffect(() => {
    let isCancelled = false;
  
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL_ORDER}/api/picking/detail/${ticketId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!isCancelled) {
          setSticker(response.data);
          setLoading(false);
          console.log(response.data);
        }
      } catch (error) {
        console.warn("❗ API failed, will retry in 1 second");
        if (!isCancelled) {
          setTimeout(fetchData, 1000); // retry after 1 sec
        }
      }
    };
  
    fetchData();
  
    return () => {
      isCancelled = true;
    };
  }, [ticketId]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
  );
  return (
    <div className="page h-full w-full mt-2">
      <div className="p-2 flex justify-between align-text-top">
        <div className="flex items-baseline gap-1.5">
            <p className="text-[16px]">คนจัด</p>
            <p className="text-[22px] font-bold">{sticker.emp.emp_nickname}</p>
        </div>
        <div className="flex items-center justify-center">
        <QRCodeSVG
                  value={sticker.mem.mem_code}
                  size={60}
            />
        </div>
      </div>

      {sticker.mem.shoppingHeads.map((_: Array<string[]>, index: number) =>
        index % 2 === 0 ? (
          <div key={index} className="flex justify-between px-2">
            <div className="border w-full text-center text-[16px]">
              {sticker.mem.shoppingHeads[index]?.sh_running || ""}
            </div>
            <div className="border w-full text-center text-[16px]">
              {sticker.mem.shoppingHeads[index + 1]?.sh_running || ""}
            </div>
          </div>
        ) : null
      )}

      <div className="flex justify-between pt-2 px-2">
        <table className="border text-center w-full">
          <thead>
            <tr className="border">
              <th className="border text-[14px] pt-0.5">
                เหลือง
                <br />
                F2
              </th>
              <th className="border text-[14px] pt-0.5">
                น้ำเงิน
                <br />
                F3
              </th>
              <th className="border text-[14px] pt-0.5">
                แดง
                <br />
                F4
              </th>
              <th className="border text-[14px] pt-0.5">
                เขียว
                <br />
                F5
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border">
              {[2, 3, 4, 5].map((floor) => (
                <td key={floor} className="border text-[12px] pt-0.5 font-bold">
                 { sticker.floorCounts[floor] > 0 ? '✓' : '✗'}
                </td>
              ))}
            </tr>
            <tr className="border">
              {[2, 3, 4, 5].map((floor) => (
                <td key={floor} className="border text-[15px] py-0.5 font-extrabold w-[25%]">
                  {sticker.floorCounts[floor] || ''} รก.
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between px-2 pt-2">
        <div>
          <p className="border flex justify-start text-[20px] px-5 font-bold">
            F{sticker.floor}
          </p>
        </div>
        <div>
          <p className="flex justify-end text-[14px]">
            {sticker.date_print && dayjs(sticker.date_print).format('DD/MM/YYYY HH:mm')}
          </p>
          <p className="flex justify-end text-[14px]">{sticker.mem.province && route.find(r => r.value === sticker.mem.province)?.name || "อื่นๆ"}</p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[20px] font-bold">{sticker.mem.mem_code}</p>
        <p className="text-[18px]">{sticker.mem.mem_name}</p>
      </div>

      <div className="flex justify-between pl-2 text-[18px] font-bold">
        <p>{sticker.mem.province && route.find(r => r.value === sticker.mem.province)?.name || "อื่นๆ"}</p>
      </div>
    </div>
  );
};
export default FormatSticker;
