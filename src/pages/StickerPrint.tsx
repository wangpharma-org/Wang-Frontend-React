import axios from "axios";
import { useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";

interface FloorInfo {
  ticket_id: number;
  print_status: string;
}

interface TicketItem {
  mem_code: string;
  picking_status: string;
  mem_name: string;
  province: string;
  mem_route: MemRoute;
  F2: FloorInfo | null;
  F3: FloorInfo | null;
  F4: FloorInfo | null;
  F5: FloorInfo | null;
  [key: string]: any;
}

interface MemRoute {
  route_code: string;
  route_name: string;
}

interface Route {
  id: number;
  name: string;
  value: string;
}
const StickerPrint = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectFloor, setSelectFloor] = useState("");
  const [listPrintTicket, setListPrint] = useState<TicketItem[]>([]);
  const [isOpen, setIsOpen] = useState<number[]>([]);
  const [pendingTickets, setPendingTickets] = useState<FloorInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [route, setRoute] = useState<Route[] | null>(null);
  const [routeAPI, setRouteAPI] = useState<MemRoute[] | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    handleGetRoute();
    console.log(token);
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/picking/ticket`,
      {
        path: '/socket/picking',
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
      setListPrint(data);
      setLoading(false);
      console.log("Received ticket data:", data);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      setLoading(true);
      setListPrint([]);
      setPendingTickets([]);
      setCurrentIndex(0);
      setIsOpen([]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(()=>{
    if (routeAPI) {
      const route: Route[] = [
        { id: 1, name: "เส้นทางการขนส่ง", value: "all" },
        ...routeAPI.map((item, index) => ({
          id: index + 2,
          name: item.route_name,
          value: item.route_code,
        })),
      ]
      setRoute(route);
    }
  }, [routeAPI]);

  const handleGetRoute = async () => {
    const route = await axios.get(`${import.meta.env.VITE_API_URL_ORDER}/api/picking/get-route`)
    setRouteAPI(route.data);
  }

  const getCellClass = (status: string | undefined) => {
    console.log("Status:", status);
    if (status === undefined) {
      return "text-gray-500";
    }
    if (status === "pending") {
      return "text-red-500";
    }
    if (status === "printed") {
      return "text-green-500";
    }
  };

  useEffect(() => {
    if (selectFloor && listPrintTicket) {
      const floorKey = `F${selectFloor}`;

      const filtered = listPrintTicket
        .map((item) => item[floorKey] || [])
        .flat()
        .filter((floorData) => floorData.print_status === "pending");

      console.log("✅ Received ticket data:", filtered);

      setPendingTickets(filtered);
      setCurrentIndex(0);
    }
  }, [selectFloor, listPrintTicket]);

  useEffect(() => {
    if (pendingTickets.length > 0 && currentIndex < pendingTickets.length) {
      const currentTicket = pendingTickets[currentIndex];
      console.log(`Printing ticket ID: ${currentTicket.ticket_id}`);

      localStorage.removeItem("print_status");

      if (!isOpen.find((current) => current === currentTicket.ticket_id)) {
        console.log(isOpen);
        console.log(
          "Opening new window for ticket ID:",
          currentTicket.ticket_id
        );
        window.open(
          `/format-sticker?ticketId=${currentTicket.ticket_id}`,
          "_blank"
        );
        setIsOpen((prev) => [...prev, currentTicket.ticket_id]);
      }
    } else if (
      pendingTickets.length > 0 &&
      currentIndex >= pendingTickets.length
    ) {
      console.log(`✅ All pending tickets for floor ${selectFloor} printed.`);
      setPendingTickets([]);
      setCurrentIndex(0);
      setIsOpen([]);
    }
  }, [pendingTickets, currentIndex]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "print_status" && event.newValue === "done") {
        const printedTicket = pendingTickets[currentIndex];
        if (printedTicket) {
          if (socket?.connected) {
            socket.emit("ticket:put", {
              ticketId: printedTicket.ticket_id,
            });
            console.log("📤 Emit ticket:printed", printedTicket.ticket_id);
          } else {
            console.warn("❌ Socket not connected");
          }
          setCurrentIndex((prev) => prev + 1);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [pendingTickets, currentIndex, socket]);

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
      <div className="flex flex-wrap justify-center mb-6 gap-2">
        {route?.map((route) => (
          <button
            key={route.value}
            onClick={() => setSelectedRoute(route.value)}
            className={`border-2 cursor-pointer border-blue-500 px-2 py-1 rounded-lg hover:bg-blue-500 hover:text-white transition ${
              route.value === selectedRoute ? "bg-blue-500 text-white" : ""
            }`}
          >
            {route.name}
          </button>
        ))}
      </div>
      <h1 className="text-3xl font-bold mb-4 text-center mt-10">
        พื้นหลังสีเขียว คือ ชั้นอื่นๆ กำลังจัดสินค้าร้านนั้นอยู่
      </h1>

      <div className="inline-block min-w-full overflow-hidden rounded-lg shadow-md bg-white mt-4">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 uppercase text-gray-700 text-sm font-semibold">
            <tr>
              <th className="px-6 py-3 text-center ">ลำดับที่</th>
              <th className="px-6 py-3 text-center ">รหัส</th>
              <th className="px-6 py-3 text-center ">ชื่อร้าน</th>
              <th className="px-6 py-3 text-center ">เส้นทาง</th>
              <th className="px-6 py-3 text-center ">F2</th>
              <th className="px-6 py-3 text-center ">F3</th>
              <th className="px-6 py-3 text-center ">F4</th>
              <th className="px-6 py-3 text-center ">F5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(listPrintTicket || !loading) &&
              listPrintTicket
                .filter(
                  (list) =>
                    selectedRoute === "all" ||
                    selectedRoute === "" ||
                    list?.mem_route?.route_code === selectedRoute
                )
                .map((list, index) => (
                  <tr
                    key={index}
                    className={`${
                      list.picking_status === "picking"
                        ? "bg-green-100 hover:bg-green-200"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 text-center">{index + 1}</td>
                    <td className="px-6 py-4 text-center">{list.mem_code}</td>
                    <td className="px-6 py-4 text-center">{list.mem_name}</td>
                    <td className="px-6 py-4 text-center">{list.mem_route?.route_name ? list.mem_route?.route_name : 'อื่นๆ'}</td>

                    {[2, 3, 4, 5].map((floor) => (
                      <td
                        key={floor}
                        className={`px-6 py-4 ${getCellClass(
                          list[`F${floor}`]?.some(
                            (t: any) => t.print_status === "pending"
                          )
                            ? "pending"
                            : list[`F${floor}`]?.some(
                                (t: any) => t.print_status === "printed"
                              )
                            ? "printed"
                            : undefined
                        )}`}
                      >
                        <div className="flex justify-center items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="w-9 h-9 cursor-pointer"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"
                            />
                          </svg>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        { loading && <div className="w-full flex justify-center h-56 items-center">
              <p className="text-xl font-medium text-black">Loading ...</p>
        </div>}
      </div>
    </div>
  );
};
export default StickerPrint;
