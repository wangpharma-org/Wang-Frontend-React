import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import Clock from "../components/Clock";
import ProductBox from "../components/ProductBox";
import { Bounce, toast, ToastContainer } from "react-toastify";
import axios from "axios";
import printBucket from "../assets/print_bucket.png";
import Swal from "sweetalert2";

interface Product {
  product_code: string;
  product_name: string;
  product_image_url: string;
  product_barcode: string | null;
  product_barcode2: string | null;
  product_barcode3: string | null;
  product_floor: string | null;
  product_addr: string;
  product_stock: number;
  product_unit: string;
  product_shelf: string;
  lot_priority: string;
}

export interface ShoppingOrder {
  sh_running: string;
  so_running: string;
  so_amount: number;
  so_unit: string;
  picking_status: string;
  emp_code_floor_picking: string | null;
  so_picking_time: string | null;
  product: Product;
}

interface ShoppingHead {
  sh_running: string;
  emp_code_picking: string;
  shoppingOrders: ShoppingOrder[];
}

interface PickingData {
  mem_code: string;
  mem_name: string;
  shoppingHeads: ShoppingHead[];
  all_sh_running: string[];
  emp_code_picking: string;
}

interface MemRoute {
  route_code: string;
  route_name: string;
}

interface RouteButton {
  id: number;
  name: string;
  value: string;
}

function ProductList() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [listproduct, setListproduct] = useState<PickingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [CanSubmit, setCanSubmit] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const navigate = useNavigate();
  const mem_code = new URLSearchParams(window.location.search).get("mem_code");
  const route_code = new URLSearchParams(window.location.search).get("route_code");
  const route_name = new URLSearchParams(window.location.search).get("route_name");
  const { userInfo, logout } = useAuth();
  const [floorCounts, setFloorCounts] = useState<Record<string, number>>({});
  const popupRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [, setIsFiltered] = useState(false);
  const [apiRoute, setAPIRoute] = useState<MemRoute[] | null>(null);
  const [routeButtons, setRouteButton] = useState<RouteButton[] | null>(null);
  const [selectroute, setSelectroute] = useState(
    sessionStorage.getItem("route") ?? "all"
  );
  const [featureFlag, setFeatureFlag] = useState<boolean>(true);
  const [msgFeatureFlag, setMsgFeatureFlag] = useState<string | null>(null);
  const [changeRoute, setChangeRoute] = useState<boolean>(false);
  // const handleDoubleClick = useDoubleClick();

  const [prepareScan, setPrepareScan] = useState<string | null>(null);

  const checkFlag = async () => {
    const flag = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/feature-flag/check/order`
    );
    console.log("Flag : ", flag.data);
    if (flag.data.status === true) {
      setFeatureFlag(true);
      // setMsgFeatureFlag(flag.data.msg);
    } else if (flag.data.status === false) {
      setFeatureFlag(false);
      setMsgFeatureFlag(flag.data.msg ?? 'ไม่มีหมายเหตุ');
    }
  };

  useEffect(() => {
    if (changeRoute === true) {
      navigate("/order-list")
    }
  }, [selectroute, changeRoute])

  useEffect(() => {
    handleGetRoute();
    const token = sessionStorage.getItem("access_token");
    console.log(token);
    console.log(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/picking/listproducts`
    );
    const newSocket = io(
      `${import.meta.env.VITE_API_URL_ORDER}/socket/picking/listproducts`,
      {
        path: "/socket/picking",
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    setSocket(newSocket);

    checkFlag();

    newSocket.on("feature_flag:true", () => {
      console.log("feature_flag:true");
      setFeatureFlag(true);
    });

    newSocket.on("feature_flag:false", (msg: string) => {
      console.log('feature_flag:false');
      setMsgFeatureFlag(msg ?? 'ไม่มีหมายเหตุ');
      setFeatureFlag(false);
    })

    newSocket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      newSocket.emit("join_room", mem_code);
    });

    newSocket.on("listproduct:get", (data) => {
      setListproduct(data);
      setLoading(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to server:", error.message);
      setListproduct(null);
      setLoading(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (CanSubmit) {
      submitPicking();
    }
  }, [CanSubmit]);

  useEffect(() => {
    if (apiRoute) {
      const mappedRoutes: RouteButton[] = [
        { id: 1, name: "เส้นทางการขนส่ง", value: "all" },
        ...apiRoute.map((route, index) => ({
          id: index + 2,
          name: route.route_name,
          value: route.route_code,
        })),
      ];
      setRouteButton(mappedRoutes);
    }
  }, [apiRoute]);

  useEffect(() => {
    if (listproduct) {
      console.log("listproduct:", listproduct);
      const hasPending = (listproduct.shoppingHeads ?? []).some((head) =>
        head.shoppingOrders.some((order) => order.picking_status === "pending")
      );
      setCanSubmit(!hasPending);
    } else {
      setCanSubmit(false);
    }
    console.log(listproduct);

    if (listproduct && Array.isArray(listproduct.shoppingHeads)) {
      const floorCountMap: Record<string, number> = {};
      listproduct.shoppingHeads.forEach((head) => {
        head.shoppingOrders.forEach((order) => {
          const status = order.picking_status;
          const unit = order.so_unit || "";
          const isBox = unit.includes("ลัง");

          if (status !== "picking") {
            const floorKey = isBox ? "box" : order.product.product_floor || "1";
            floorCountMap[floorKey] = (floorCountMap[floorKey] || 0) + 1;
          }
        });
      });
      setFloorCounts(floorCountMap);
      console.log(
        "จำนวนสินค้าที่ยังไม่ถูก pick ตามแต่ละชั้น (รวม box):",
        floorCountMap
      );
    }
  }, [listproduct]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(false);
        setShowInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInput]);

  const handleGetRoute = async () => {
    const route = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/picking/get-route`
    );
    setAPIRoute(route.data);
  };

  const handleClick = (orderItem: ShoppingOrder, status: string) => {
    if (orderItem.picking_status !== "pending") {
      if (socket?.connected) {
        console.log("orderItem to unpick : ", orderItem);
        socket.emit("listproduct:unpicked", {
          so_running: orderItem.so_running,
          mem_code: mem_code,
          sh_running: orderItem.sh_running,
        });
      }
    } else {
      if (socket?.connected) {
        socket?.emit("listproduct:picked", {
          so_running: orderItem.so_running,
          mem_code: mem_code,
          status: status,
          sh_running: orderItem.sh_running,
        });
      }
    }
  }

  const handleDoubleClick = (orderItem: ShoppingOrder, status: string) => {
    clickCountRef.current++;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 500);

    if (clickCountRef.current === 2) {
      clickCountRef.current = 0;
      console.log("Double clicked on Picking Function");

      if (orderItem.picking_status !== "pending") {
        if (socket?.connected) {
          console.log("orderItem to unpick : ", orderItem);
          socket.emit("listproduct:unpicked", {
            so_running: orderItem.so_running,
            mem_code: mem_code,
            sh_running: orderItem.sh_running,
          });
        }
      } else {
        if (socket?.connected) {
          socket?.emit("listproduct:picked", {
            so_running: orderItem.so_running,
            mem_code: mem_code,
            status: status,
            sh_running: orderItem.sh_running,
          });
        }
      }
      console.log("Double clicked:", orderItem);
    }
  };

  const submitPicking = () => {
    if (socket?.connected) {
      socket.emit("listproduct:submitpicking", {
        mem_code: mem_code,
        all_sh_running: listproduct?.all_sh_running,
      });
    }
  };

  useEffect(() => {
    setIsFiltered(!!search || !!selectedFloor);
  }, [search, selectedFloor]);

  // console.log("search " + search);
  // console.log("selectedFloor " + selectedFloor);

  const setButton = () => {
    setSearch("");
    setSelectedFloor(null);
  };

  const totalOrders =
    (listproduct?.shoppingHeads ?? []).reduce(
      (total, head) => total + head.shoppingOrders.length,
      0
    ) || 0;

  const pickingCount =
    (listproduct?.shoppingHeads ?? []).reduce(
      (total, head) =>
        total +
        head.shoppingOrders.filter(
          (order) =>
            order.picking_status === "picking" ||
            order.picking_status === "หมด" ||
            order.picking_status === "ไม่พอ" ||
            order.picking_status === "ไม่เจอ" ||
            order.picking_status === "เสีย" ||
            order.picking_status === "ด้านล่าง"
        ).length,
      0
    ) || 0;
  const pendingCount =
    (listproduct?.shoppingHeads ?? []).reduce(
      (total, head) =>
        total +
        head.shoppingOrders.filter(
          (order) => order.picking_status === "pending"
        ).length,
      0
    ) || 0;

  const floorButtons = [
    { label: "1", value: "1", color: "bg-gray-400" },
    { label: "2", value: "2", color: "bg-yellow-500" },
    { label: "3", value: "3", color: "bg-blue-500" },
    { label: "4", value: "4", color: "bg-red-500" },
    { label: "5", value: "5", color: "bg-emerald-500" },
    { label: "ยกลัง", value: "box", color: "bg-purple-500" },
  ];

  const Btnlogout = () => {
    logout();
  };

   const printStickerSelect = (
    type: string,
    product_name: string | null,
  ) => {
    Swal.fire({
      title: `${type}ที่`,
      input: "number",
      inputAttributes: {
        autocapitalize: "off",
        min: "1"
      },
      showCancelButton: true,
      confirmButtonText: "พิมพ์สติกเกอร์",
      cancelButtonText: "ยกเลิก",
      showLoaderOnConfirm: true,

      didOpen: () => {
        const confirmBtn = Swal.getConfirmButton();
        const input = Swal.getInput();

        if (confirmBtn) {
          confirmBtn.disabled = true;
        }

        input?.addEventListener("input", () => {
          if (confirmBtn) {
            confirmBtn.disabled = !input.value;
          }
        });
      },

      preConfirm: async (count_save) => {
        if (!count_save) {
          Swal.showValidationMessage("กรุณาระบุจำนวน");
          return;
        }

        try {
          const checkPrintStatus = await axios.post(
            `${import.meta.env.VITE_API_URL_ORDER}/api/picking/CheckStatusPrint`,
            {
              mem_code,
              type,
              count: Number(count_save),
              floor: userInfo?.floor_picking,
            },
            {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem(
                  "access_token"
                )}`,
              },
            }
          );
          if (checkPrintStatus.data) {
            printSticker(
              mem_code!,
              type,
              Number(count_save),
              product_name
            );
          }
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            const { message } = error.response.data;

            // แยก logic ตาม type จาก backend
            switch (error.response.data.type) {
              case "haveTicket": {
                const result = await Swal.fire({
                  icon: "warning",
                  title: "แจ้งเตือน",
                  text: message,
                  showCancelButton: true,
                  confirmButtonText: "พิมพ์ซ้ำ",
                  cancelButtonText: "ยกเลิก",
                  reverseButtons: true,
                });

                if (result.isConfirmed) {
                  printSticker(
                    mem_code!,
                    type,
                    Number(count_save),
                    product_name
                    
                  );
                }

                break;
              }

              case "countTicket":
                Swal.fire({
                  icon: "error",
                  title: "จำนวนไม่ถูกต้อง",
                  text: message,
                });
                break;

              case "createTicketOne":
                Swal.fire({
                  icon: "error",
                  title: "จำนวนไม่ถูกต้อง",
                  text: message,
                });
                break;

              default:
                Swal.fire({
                  icon: "error",
                  title: "เกิดข้อผิดพลาด",
                  text: message || "ไม่สามารถดำเนินการได้",
                });
            }
          } else {
            Swal.fire({
              icon: "error",
              title: "Server Error",
              text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
            });
          }
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    });
  };

  const printSticker = async (
    mem_code: string,
    type: string,
    count: number,
    product_name: string | null
  ) => {
    console.log("printSticker", mem_code);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/picking/createTicket`,
        {
          mem_code: mem_code,
          emp_code: userInfo?.emp_code,
          emp_name: userInfo?.nickname,
          floor: userInfo?.floor_picking,
          route_code: route_code ?? null,
          route_name: route_name ?? null,
          mem_name: listproduct?.mem_name,
          emp_name_request: null,
          emp_code_request: null,
          type: type ?? null,
          count: count ?? null,
          product_name: product_name ?? null,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          },
        }
      );
      console.log("response", response);
      if (response.status === 201) {
        console.log("Sticker created successfully!");
        toast.success("สั่งพิมพ์สติกเกอร์สำเร็จ", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      } else {
        toast.error("มีข้อผิดพลาดในการสั่งพิมพ์", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      }
    } catch (error) {
      console.error("Error printing sticker:", error);
    }
  };

  const SaveBox = () => {
    Swal.fire({
      title: "กรุณาระบุจำนวนลัง",
      input: "text",
      inputAttributes: {
        autocapitalize: "off"
      },
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      showLoaderOnConfirm: true,
      preConfirm: async (count_save: number) => {
        try {
          const githubUrl = `${import.meta.env.VITE_API_URL_ORDER}/api/picking/savebox`;

          const response = await axios.post(githubUrl,
            {
              emp_code: userInfo?.emp_code,
              count_save: count_save
            });
          console.log(response.data)

          return response.data;
        } catch {
          Swal.showValidationMessage(`
            กรุณาใส่เฉพาะตัวเลข
        `);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    })
  }

  if (featureFlag === false) {
    return (
      <div className="flex flex-col min-h-screen text-center items-center justify-center">
        <p className="text-2xl font-bold text-red-700">
          ระบบโดนสั่งระงับการใช้งาน
        </p>
        <p className="text-2xl font-bold text-red-700">
          หมายเหตุ : {msgFeatureFlag}
        </p>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col h-screen">
        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />
        <header
          className={`p-2 sticky top-0 bg-blue-400 z-40 text-white font-medium ${selectedFloor === "1"
              ? "bg-gray-500"
              : selectedFloor === "2"
                ? "bg-yellow-500"
                : selectedFloor === "3"
                  ? "bg-blue-500"
                  : selectedFloor === "4"
                    ? "bg-red-500"
                    : selectedFloor === "5"
                      ? "bg-emerald-500"
                      : selectedFloor === "box"
                        ? "bg-purple-500"
                        : "bg-blue-400"
            } `}
        >
          <div>
            <div className="flex justify-between">
              <div>
                <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs " onClick={SaveBox}>
                  ลัง
                </button>
              </div>
              <div>
                {showInput && (
                  <div ref={popupRef} className="flex absolute ">
                    <input
                      type="text"
                      placeholder="พิมพ์ข้อมูลที่ต้องการค้นหา"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="p-1 border rounded-sm text-black bg-white flex z-10 h-8"
                    />
                  </div>
                )}
                <div className="flex justify-center text-sm">
                  <p>
                    <Clock></Clock>
                  </p>
                </div>
                <div className="flex justify-center text-xs">
                  <p>
                    ทั้งหมด {listproduct?.shoppingHeads?.length || 0} บิล{" "}
                    {totalOrders} รายการ
                  </p>
                </div>
                <div className="flex justify-center text-xs">
                  <p>เหลือจัด {pendingCount} รายการ</p>&nbsp;<p>|</p>&nbsp;
                  <p>กำลังจัด {pickingCount} รายการ</p>
                </div>
              </div>
              <div>
                <button
                  ref={buttonRef}
                  onClick={() => setShowInput((prev) => !prev)}
                  className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div id="button" className="flex justify-start">
                <button
                  ref={buttonRef}
                  onClick={() => setOpenMenu((prev) => !prev)}
                  className="px-3 pt-2 cursor-pointer text-center "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div
                id="name"
                onClick={() => navigate("/order-list")}
                className="flex pt-2 cursor-pointer text-center justify-center items-center mx-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
                &nbsp;
                <p>{listproduct?.mem_code}</p>&nbsp;
                <p className="w-40 truncate">{listproduct?.mem_name}</p>
              </div>
              
              <div
                className="mr-2"
                onClick={() => printStickerSelect("ตะกร้า", null)}
              >
                <img src={printBucket} className="w-9" />
              </div>
            </div>
            <div
              id="route-select"
              className="flex justify-center text-white w-full mt-1"
            >
              <select
                value={selectroute}
                onChange={(e) => {
                  setSelectroute(e.target.value);
                  sessionStorage.setItem("route", e.target.value);
                  setChangeRoute(true);
                  setSearch("");
                }}
                className="border border-gray-200 px-2 py-1 rounded text-black bg-white text-center flex justify-center w-full"
              >
                {routeButtons?.map((route) => (
                  <option key={route.id} value={route.value}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="relative content bg-white overflow-y-auto h-full text-[#444444]">
          <div>
            {openMenu && (
              <div
                ref={popupRef}
                className="fixed top-0 left-0 h-full z-50 w-3/5 sm:w-1/2 md:w-1/4 bg-blue-900 transition-transform duration-2000 ease-in-out transform translate-x-0"
              >
                <div id="infomation" className="p-4">
                  <div className="py-5">
                    <div className="bg-gray-100 p-1 rounded-full w-18 h-18 mx-auto">
                      <img
                        className="rounded-full w-16 h-16 bg-white mx-auto"
                        src="https://as2.ftcdn.net/jpg/03/31/69/91/1000_F_331699188_lRpvqxO5QRtwOM05gR50ImaaJgBx68vi.jpg"
                      />
                    </div>
                    <div>
                      <p className="flex justify-center mt-3 text-white">
                        รหัสพนักงาน : {userInfo?.emp_code}
                      </p>
                      <p className="flex justify-center mt-1 text-white">
                        ชื่อ : {userInfo?.firstname} {userInfo?.lastname}
                      </p>
                      <p className="flex justify-center mt-1 text-white">
                        ชื่อเล่น : {userInfo?.nickname}
                      </p>
                      <p className="flex justify-center mt-1 text-white">
                        {`ประจำชั้น ${userInfo?.floor_picking || ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center px-3 text-white">
                    <button
                      onClick={Btnlogout}
                      className="w-full mx-auto flex py-2 hover:bg-red-600 cursor-pointer text-center items-center font-light rounded-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.2}
                        stroke="currentColor"
                        className="size-9 rounded-full mr-1 ml-1 p-1 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"
                        />
                      </svg>
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {loading ? (
            <div className="flex justify-center font-bold text-2xl mt-10">
              <p>Loading...</p>
            </div>
          ) : !listproduct?.shoppingHeads ? (
            <div className="flex flex-col items-center mt-5">
              <p className="font-bold text-2xl">
                รายการคำสั่งซื้อนี้ยืนยันไปแล้ว
              </p>
              <button
                onClick={() => navigate("/order-list")}
                className="bg-blue-400 px-3 py-1 mt-4 rounded-sm text-white"
              >
                กลับ
              </button>
            </div>
          ) : (
            <div>
              {listproduct.shoppingHeads.some((head) =>
                head.shoppingOrders.some((orderItem) => {
                  const matchFloor =
                    !selectedFloor ||
                    (() => {
                      const unit = orderItem.so_unit || "";
                      const floor = orderItem.product.product_floor || "1";

                      if (selectedFloor === "box") {
                        return unit.includes("ลัง");
                      }
                      return floor === selectedFloor;
                    })();

                  const matchSearch =
                    !search ||
                    orderItem.product.product_name
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    orderItem.so_running
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    orderItem.product.product_code
                      .toLowerCase()
                      .includes(search.toLowerCase());

                  return matchFloor && matchSearch;
                })
              ) ? (
                <div>
                  <div className=" p-3 mb-56 mt-3">
                    {listproduct.shoppingHeads.map((head, headIdx) => (
                      <div
                        key={headIdx}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 md:gap-3"
                      >
                        {head.shoppingOrders
                          .filter((orderItem) => {
                            const matchFloor =
                              !selectedFloor ||
                              (() => {
                                const unit = orderItem.so_unit || "";
                                const floor =
                                  orderItem.product.product_floor || "1";

                                if (selectedFloor === "box") {
                                  return unit.includes("ลัง");
                                }
                                return floor === selectedFloor;
                              })();

                            const matchSearch =
                              !search ||
                              orderItem.product.product_name.includes(search) ||
                              orderItem.so_running.includes(search) ||
                              orderItem.product.product_code.includes(search);
                            return matchFloor && matchSearch;
                          })
                          .sort((a, b) =>
                            a.product.product_code.localeCompare(
                              b.product.product_shelf,
                              "th",
                              {
                                numeric: true,
                              }
                            )
                          )
                          .map((orderItem, Orderindex) => {
                            if (socket) {
                              console.log("orderItem2", orderItem);
                              return (
                                <ProductBox
                                  prepareScan={prepareScan}
                                  setPrepareScan={setPrepareScan}
                                  orderItem={orderItem}
                                  key={Orderindex}
                                  socket={socket}
                                  handleDoubleClick={handleDoubleClick}
                                  handleClick={handleClick}
                                  printStickerSelect={printStickerSelect}
                                />
                              );
                            }
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                (search || selectedFloor) && (
                  <div className="flex flex-col justify-center items-center text-center h-[70vh]">
                    <div className=" font-bold mt-4 text-red-500 text-2xl">
                      {search && (
                        <div>
                          <p>ไม่มีรายการสินค้าชื่อ</p>
                          <p>{search}</p>
                          <p></p>
                        </div>
                      )}
                      {selectedFloor && (
                        <div>
                          <p>ไม่มีสินค้าที่ต้องจัดในชั้น</p>
                          <p> {selectedFloor}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={setButton}
                      className="px-5 py-1 rounded-sm mt-2 text-xl bg-red-500 text-white shadow-xl border-gray-300"
                    >
                      คืนค่าเดิม
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
        <div>
          <footer
            className={`p-3 fixed bottom-0 left-0 right-0 z-40  text-white font-medium ${selectedFloor === "1"
                ? "bg-gray-500"
                : selectedFloor === "2"
                  ? "bg-yellow-500"
                  : selectedFloor === "3"
                    ? "bg-blue-500"
                    : selectedFloor === "4"
                      ? "bg-red-500"
                      : selectedFloor === "5"
                        ? "bg-emerald-500"
                        : selectedFloor === "box"
                          ? "bg-purple-500"
                          : "bg-blue-400"
              }`}
          >
            <div className="flex">
              {floorButtons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() =>
                    setSelectedFloor((prev) =>
                      prev === btn.value ? null : btn.value
                    )
                  }
                  className={`border border-gray-500 py-1 px-1 rounded-sm shadow-lg w-full flex justify-center mx-1 relative
                            ${btn.color} 
                            ${selectedFloor === btn.value
                      ? "ring-2 ring-yellow-300"
                      : ""
                    }`}
                >
                  <div className="flex text-center gap-2">
                    <span className="text-white font-medium ">{btn.label}</span>
                  </div>
                  <span className="absolute -top-3 -right-1 text-[12px] bg-white text-black font-bold rounded-full px-2 py-0.5 shadow-sm">
                    {floorCounts[String(btn.value)] || 0}
                  </span>
                </button>
              ))}
            </div>
            <div>
              <button
                onClick={() => {
                  submitPicking();
                  navigate("/order-list");
                }}
                disabled={
                  !CanSubmit ||
                  !listproduct ||
                  userInfo?.emp_code !== listproduct.emp_code_picking
                }
                className={`w-full px-3 py-1 shadow-md text-lg rounded-sm font-semibold  text-white mt-3 ${CanSubmit &&
                    listproduct &&
                    userInfo?.emp_code === listproduct.emp_code_picking
                    ? "bg-green-400"
                    : "bg-gray-400"
                  }`}
              >
                {!CanSubmit ||
                  !listproduct ||
                  userInfo?.emp_code !== listproduct.emp_code_picking
                  ? `คุณไม่มีสิทธิ์ในการยืนยัน`
                  : !CanSubmit
                    ? `กรุณาจัดสินค้าให้ครบ`
                    : `ยืนยันการจัดสินค้า`}
              </button>
            </div>
          </footer>
        </div>
      </div>
    );
  }
}

export default ProductList;