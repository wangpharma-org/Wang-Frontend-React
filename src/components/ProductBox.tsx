import { Socket } from "socket.io-client";
import { ShoppingOrder } from "../pages/ProductList";
import box from "../assets/product-17.png";
import { Dispatch, SetStateAction, useState } from "react";
import { useRef, useEffect } from "react";

interface ProductBoxProps {
  orderItem: ShoppingOrder;
  socket: Socket;
  handleDoubleClick: (orderItem: ShoppingOrder, status: string) => void;
  handleClick: (orderItem: ShoppingOrder, status: string) => void;
  prepareScan: string | null;
  setPrepareScan: Dispatch<SetStateAction<string | null>>;
}

// Removed from the top level and will be added inside the component

export default function ProductBox({
  orderItem,
  handleDoubleClick,
  handleClick,
  prepareScan,
  setPrepareScan,
}: ProductBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const handleScan = (so_running: string) => {
    console.log("handleScan");
    console.log("boolean : ", so_running === prepareScan);
    if (so_running === prepareScan) {
      setPrepareScan(null);
      setIsFocused(false);
    } else {
      setPrepareScan(so_running);
    }
  };

  const handleSend = (barcode: string) => {
    console.log("handleSend");
    console.log("barcode", barcode);
    setIsFocused(false);
    setPrepareScan(null);
    console.log(
        "Barcode All : ",
        barcode === orderItem?.product?.product_barcode,
        barcode === orderItem?.product?.product_barcode2,
        barcode === orderItem?.product?.product_barcode3 
    )
    if (
      barcode === orderItem?.product?.product_barcode ||
      barcode === orderItem?.product?.product_barcode2 ||
      barcode === orderItem?.product?.product_barcode3
    ) {
      console.log("barcode matched");
      handleClick(orderItem, "picking");
    }
  };

  useEffect(() => {
    if (prepareScan === orderItem.so_running) {
      if (inputRef.current) {
        inputRef.current.focus();
        setIsFocused(true);
        setInputValue("");
      }
    } else {
      if (inputRef.current) {
        inputRef.current.blur();
        setIsFocused(false);
        setInputValue("");
      }
    }
  }, [prepareScan, orderItem.so_running]);

  return (
    <div
      className={`p-2 rounded-sm mb-1 mt-1 ${
        isFocused
          ? "bg-yellow-400"
          : orderItem.picking_status === "pending"
          ? "bg-gray-400"
          : orderItem.picking_status === "picking"
          ? "bg-green-400"
          : "bg-red-400"
      }`}
    >
      <div
        //   onDoubleClick={(event) => doubleClick(event)}
        onClick={() => {
          if (orderItem?.picking_status === "picking") {
            handleDoubleClick(orderItem, "picking");
          } else {
            handleScan(orderItem.so_running);
          }
          //   handleDoubleClick(orderItem, "picking");
        }}
        className={`py-2 px-1 rounded-smm-1 cursor-pointer ${
          orderItem.picking_status === "pending"
            ? "bg-white"
            : orderItem.picking_status === "picking"
            ? "bg-green-100"
            : "bg-red-100"
        }`}
      >
        <div className="flex justify-stretch p-1">
          <div className="w-1/3 border border-gray-500 flex justify-center ">
            <img
              src={
                orderItem.product.product_image_url.startsWith("..")
                  ? `https://www.wangpharma.com${orderItem.product.product_image_url.slice(
                      2
                    )}`
                  : orderItem.product.product_image_url || box
              }
              className="w-25 h-25 object-cover"
            />
          </div>
          <div className="text-xs w-2/3 ml-1">
            <div className="flex justify-between pt-1 px-1">
              <p className="font-bold w-50 truncate ...   ">
                {orderItem.product.product_name}
              </p>
            </div>
            <div className="flex justify-between pt-1 px-1">
              <p className="text-amber-500 font-bold">
                {orderItem.product.product_code}
              </p>
              <input
                className="opacity-0 h-0 w-0"
                ref={inputRef}
                onChange={(e) => {
                  setInputValue(e.currentTarget.value);
                }}
                value={inputValue}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend(e.currentTarget.value);
                  }
                }}
              ></input>
              <button 
                className="text-white rounded-sm shadow-md bg-gray-500 py-2 px-3"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDoubleClick(orderItem, "picking");
                    setIsFocused(false);
                    setPrepareScan(null);
                }}
              >ไม่มีบาร์โค้ด</button>
              <p className="px-2 py-2 rounded-sm bg-blue-800 text-white text-sm font-bold">
                {orderItem.so_amount} {orderItem.so_unit}
              </p>
            </div>
            <p className="pl-1 font-bold">เลขบาร์โค้ด</p>
            <div className="flex justify-between pt-1 px-1">
              <p className="text-amber-500 font-bold">
                {orderItem.product.product_barcode}
              </p>
              <p>
                เหลือ {orderItem.product.product_stock}{" "}
                {orderItem.product.product_unit}
              </p>
            </div>
            {orderItem?.product?.lot_priority && (
              <div className="mt-1 pl-1 text-sm font-bold text-red-600">
                <p className="">
                  เลือกสินค้า LOT : {orderItem?.product?.lot_priority} ก่อน
                </p>
              </div>
            )}
            <div className="flex justify-between pt-1 px-1">
              <div className="flex font-semibold text-violet-600 text-[13px]">
                <p>F{orderItem.product.product_floor || "1"}</p>&nbsp;
                <p>/</p>&nbsp;
                <p>{orderItem.product.product_addr}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-around py-2 text-[11px]">
          {["หมด", "ไม่พอ", "ไม่เจอ", "เสีย", "ด้านล่าง"].map((label, idx) => {
            console.log("label", label);
            console.log("orderItem.picking_status", orderItem.picking_status);
            console.log(orderItem.picking_status === label);
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick(orderItem, label);
                }}
                className={`text-white rounded-sm shadow-md bg-amber-500 py-2 px-3 ${
                  orderItem.picking_status === label ? "bg-red-500" : ""
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between py-1 px-1 text-xs text-gray-500">
          <div className="flex justify-start">
            <p>{orderItem.emp_code_floor_picking ? "จัดแล้ว" : "ยังไม่จัด"}</p>
            &nbsp;
            {orderItem.emp_code_floor_picking && (
              <p>
                {" "}
                [{orderItem.emp_code_floor_picking || ""}] &nbsp;
                {new Date(orderItem.so_picking_time || "").toLocaleDateString(
                  "th-TH",
                  {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }
                )}{" "}
                {new Date(orderItem.so_picking_time || "").toLocaleTimeString(
                  "th-TH",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }
                )}
              </p>
            )}
          </div>
          {/* <div className="flex justify-end pr-1">
                        <button className="border-gray-300 border rounded-sm px-5 py-2 shadow-md bg-blue-400 text-white">
                          พิมพ์
                        </button>
                      </div> */}
        </div>
      </div>
    </div>
  );
}
