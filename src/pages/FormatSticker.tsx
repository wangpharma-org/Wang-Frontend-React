import { useEffect, useState, useRef } from "react";
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
    <div className="page h-full w-full">
      <div className="p-5 flex justify-between">
        <div className="flex pl-5 pb-5 items-baseline gap-1.5">
            <p className="text-lg">คนจัด</p>
            <p className="text-2xl">{sticker.emp.emp_nickname}</p>
        </div>
        <div className="w-20 h-20 flex items-center justify-center">
        <QRCodeSVG
                  value={sticker.mem.mem_code}
                  size={100}
            />
        </div>
      </div>

      {sticker.mem.shoppingHeads.map((_: Array<string[]>, index: number) =>
        index % 2 === 0 ? (
          <div key={index} className="flex justify-between px-5">
            <div className="border w-full text-center">
              {sticker.mem.shoppingHeads[index]?.sh_running || ""}
            </div>
            <div className="border w-full text-center">
              {sticker.mem.shoppingHeads[index + 1]?.sh_running || ""}
            </div>
          </div>
        ) : null
      )}

      <div className="flex justify-between p-5">
        <table className="border text-center w-full">
          <thead>
            <tr className="border">
              <th className="border">
                เหลือง
                <br />
                F2
              </th>
              <th className="border">
                น้ำเงิน
                <br />
                F3
              </th>
              <th className="border">
                แดง
                <br />
                F4
              </th>
              <th className="border">
                เขียว
                <br />
                F5
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border">
              {[2, 3, 4, 5].map((floor) => (
                <td key={floor} className="border">
                 { sticker.floorCounts[floor] > 0 ? '✓' : '✗'}
                </td>
              ))}
            </tr>
            <tr className="border">
              {[2, 3, 4, 5].map((floor) => (
                <td key={floor} className="border">
                  {sticker.floorCounts[floor] || 0} รายการ
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between p-5">
        <div>
          <p className="border flex justify-start text-xl px-10">
            F{sticker.floor}
          </p>
        </div>
        <div>
          <p className="flex justify-end">
            {sticker.date_print && dayjs(sticker.date_print).format('DD/MM/YYYY HH:mm')}
          </p>
          <p className="flex justify-end">{sticker.mem.province}</p>
        </div>
      </div>

      <div className="text-center text-2xl">
        <p>{sticker.mem.mem_code}</p>
        <p>{sticker.mem.mem_name}</p>
      </div>

      <div className="flex justify-between pl-5 pb-5 text-2xl">
        <p>{sticker.mem.province}</p>
      </div>
    </div>
  );
};
export default FormatSticker;
