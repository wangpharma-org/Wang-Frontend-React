import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { QRCodeSVG } from "qrcode.react";

const FormatSticker = () => {
  const [sticker, setSticker] = useState<any>(null);
  const ticketId = new URLSearchParams(window.location.search).get("ticketId");
  const token = sessionStorage.getItem("access_token");
  const [loading , setLoading] = useState(true);

  console.log(
    `${import.meta.env.VITE_API_URL_ORDER}/api/picking/detail/${ticketId}`
  );
  console.log(ticketId);
  useEffect(() => {
    if (!sticker) return;
    console.log('sticker', sticker);
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
        console.log(response)
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
        {sticker?.emp_request?.emp_nickname && <div className="flex items-baseline gap-1.5">
            <p className="text-[16px]">รายการขอเพิ่ม : </p>
            <p className="text-[22px] font-bold">{sticker?.emp_request?.emp_nickname}</p>
        </div>}
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
                <td key={floor} className="border text-[15px] py-0.5">
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
          <p className="flex justify-end text-[14px]">{sticker.mem.mem_route ? sticker.mem.mem_route.route_name : "อื่นๆ"}</p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[20px] font-bold">{sticker.mem.mem_code}</p>
        <p className="text-[18px]">{sticker.mem.mem_name}</p>
      </div>

      <div className="flex justify-between pl-2 text-[18px] font-bold">
        <p>{sticker.mem.mem_route ? sticker.mem.mem_route.route_name : "อื่นๆ"}</p>
      </div>
    </div>
  );
};
export default FormatSticker;
