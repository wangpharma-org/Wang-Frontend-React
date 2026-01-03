import { useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";

export interface TicketItem {
  ticket_id: number;
  mem_code: string;
  emp_code: string;
  emp_name: string;
  emp_code_request: string;
  emp_name_request: string;
  floor: number;
  sh_running: string;
  route_code: string;
  route_name: string;
  mem_name: string;
  floor_count2: number;
  floor_count3: number;
  floor_count4: number;
  floor_count5: number;
  type: string | null;
  count: number | null;
  status: string;
  update_at: string;
}

const StickerPrint = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectFloor, setSelectFloor] = useState("");
  const [data, setData] = useState<TicketItem[]>([]);
  const [listPrintTicket, setListPrint] = useState<TicketItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [updatedAt, setUpdatedAt] = useState("");
  const [countBox, setCountBox] = useState(0);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    console.log(token);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/picking/ticket`,
      {
        path: "/socket/picking",
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("ticket:get");
    });

    newSocket.on("ticket:get", (data) => {
      setData(data);
      setLoading(false);
      console.log("Received ticket data:", data);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      setLoading(true);
      setListPrint([]);
      setCurrentIndex(0);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const listByFloor = data.filter(
      (item) => item.floor === Number(selectFloor) && item.status === "pending"
    );
    setListPrint(listByFloor);

    const floorMemPairs = new Set(
      listByFloor.map(item => `${item.floor}_${item.mem_code}`)
    );

    const filteredData = data
      .filter(item =>
        floorMemPairs.has(`${item.floor}_${item.mem_code}`) &&
        item.type === "ลัง"
      )
      .map(item => item.count ?? 0);

    const maxCount = filteredData.length > 0 ? Math.max(...filteredData) : 0;
    setCountBox(maxCount);
    console.log("Max Count Box:", maxCount);

  }, [selectFloor, data]);

  useEffect(() => {
    if (listPrintTicket.length > 0 && currentIndex < listPrintTicket.length && updatedAt !== listPrintTicket[currentIndex].update_at) {
      const currentTicket = listPrintTicket[currentIndex];
      console.log("Current Ticket:", currentTicket);
      console.log(`Current Index: ${currentIndex}`);
      localStorage.removeItem("print_status");
      window.open(
        `/format-sticker?ticketId=${currentTicket.ticket_id}&sh_running=${currentTicket.sh_running
        }&mem_code=${currentTicket.mem_code}&mem_name=${currentTicket.mem_name
        }&route_code=${currentTicket.route_code}&route_name=${currentTicket.route_name
        }&emp_code=${currentTicket.emp_code}&emp_name=${currentTicket.emp_name
        }${currentTicket.emp_code_request
          ? `&emp_code_request=${currentTicket.emp_code_request}`
          : ""
        }${currentTicket.emp_name_request
          ? `&emp_name_request=${currentTicket.emp_name_request}`
          : ""
        }${currentTicket.floor_count2
          ? `&floor_count2=${currentTicket.floor_count2}`
          : ""
        }${currentTicket.floor_count3
          ? `&floor_count3=${currentTicket.floor_count3}`
          : ""
        }${currentTicket.floor_count4
          ? `&floor_count4=${currentTicket.floor_count4}`
          : ""
        }${currentTicket.floor_count5
          ? `&floor_count5=${currentTicket.floor_count5}`
          : ""
        }${currentTicket.type
          ? `&type=${currentTicket.type}`
          : ""
        }${currentTicket.count
          ? `&count=${currentTicket.count}`
          : ""
        }${currentTicket.floor ? `&floor=${currentTicket.floor}` : ""}
        ${countBox ? `&countBox=${countBox}` : ""}`,
        "_blank"
      );
    } else if (currentIndex >= listPrintTicket.length && listPrintTicket.length > 0) {
      setCurrentIndex(0);
    }
  }, [listPrintTicket, selectFloor, currentIndex, countBox]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "print_status" && event.newValue === "done") {
        const printedTicket = listPrintTicket[currentIndex];
        if (printedTicket) {
          if (socket?.connected) {
            socket.emit("ticket:put", {
              ticketId: printedTicket.ticket_id,
            });
          } else {
            console.warn("❌ Socket not connected");
          }
          setCurrentIndex((prev) => prev + 1);
          setUpdatedAt(printedTicket.update_at);
        }
      }
    };
    setCurrentIndex(0);
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [listPrintTicket, currentIndex, socket]);

  return (
    <div className="min-h-screen bg-gray-50 text-black p-4 pt-10">
      <div className="flex w-full justify-end">
        <form className="w-full mb-5 max-w-3xs">
          <select
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            value={selectFloor}
            onChange={(e) => setSelectFloor(e.target.value)}
          >
            <option value="" selected>
              เลือกชั้นที่เปิดเครื่อง
            </option>
            <option value="2">ชั้นที่ 2</option>
            <option value="3">ชั้นที่ 3</option>
            <option value="4">ชั้นที่ 4</option>
            <option value="5">ชั้นที่ 5</option>
          </select>
        </form>
      </div>

      <h1 className="text-3xl font-bold mb-4 text-center mt-10">
        รายการรอพิมพ์สติกเกอร์
      </h1>

      <div className="inline-block min-w-full overflow-hidden rounded-lg shadow-md bg-white mt-4">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 uppercase text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-6 py-3 text-center ">ลำดับที่</th>
              <th className="px-6 py-3 text-center ">ผู้สั่งพิมพ์</th>
              <th className="px-6 py-3 text-center ">ชั้น</th>
              <th className="px-6 py-3 text-center ">ลูกค้า</th>
              <th className="px-6 py-3 text-center ">เส้นทาง</th>
              <th className="px-6 py-3 text-center ">ผู้ขอสินค้าเพิ่ม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(listPrintTicket || !loading) &&
              listPrintTicket.map((list, index) => (
                <tr key={index} className="bg-white hover:bg-gray-50">
                  <td className="px-6 py-4 text-center">{index + 1}</td>
                  <td className="px-6 py-4 text-center">{`${list.emp_code} ${list.emp_name}`}</td>
                  <td className="px-6 py-4 text-center">{list.floor}</td>
                  <td className="px-6 py-4 text-center">{`${list.mem_code} ${list.mem_name}`}</td>
                  <td className="px-6 py-4 text-center">
                    {list.route_name ?? "อื่นๆ"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {list.emp_code_request
                      ? `${list.emp_code_request} ${list.emp_name_request}`
                      : "ไม่ใช่รายการขอเพิ่ม"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {loading && (
          <div className="w-full flex justify-center h-56 items-center">
            <p className="text-xl font-medium text-black">Loading ...</p>
          </div>
        )}
        {listPrintTicket?.length === 0 && !loading && (
          <div className="w-full flex justify-center h-56 items-center">
            <p className="text-xl font-medium text-black">ไม่มีรายการรอพิมพ์</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default StickerPrint;
