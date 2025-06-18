import { Socket } from "socket.io-client";
import { ShoppingOrder } from "../pages/ProductList";
import box from "../assets/product-17.png"

interface ProductBoxProps {
    orderItem: ShoppingOrder;
    // headShRunning: string;
    //   handleOutofStock: (orderItem: ShoppingOrder, status: string,socket:Socket) => void;
    socket: Socket;
    handleDoubleClick: (orderItem: ShoppingOrder, status: string) => void;
    headShRunning: string;
}

export default function ProductBox({ orderItem, handleDoubleClick }: ProductBoxProps) {
    return (

        <div
            // key={Orderindex}
            className={`p-2 rounded-sm mb-1 mt-1 ${orderItem.picking_status === "pending"
                ? "bg-gray-400"
                : orderItem.picking_status === "picking"
                    ? "bg-green-400"
                    : "bg-red-400"
                }`}
        >
            <div
                //   onDoubleClick={(event) => doubleClick(event)}
                onClick={() => handleDoubleClick(orderItem, 'picking')}
                className={`py-2 px-1 rounded-smm-1 cursor-pointer ${orderItem.picking_status === "pending"
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
                                orderItem.product.product_image_url.startsWith('..')
                                    ? `https://www.wangpharma.com${orderItem.product.product_image_url.slice(2)}`
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
                            <p className="px-2 py-2 rounded-sm bg-blue-800 text-white text-sm font-bold">
                                {orderItem.so_amount} {orderItem.so_unit}
                            </p>
                        </div>
                        <p className="pl-1 font-bold">เลขบาร์โค้ด</p>
                        <div className="flex justify-between pt-1 px-1">
                            <p className="text-amber-500 font-bold">
                                Bar : {orderItem.product.product_code}
                            </p>
                            <p>
                                เหลือ {orderItem.product.product_stock}{" "}
                                {orderItem.product.product_unit}
                            </p>
                        </div>
                        <div className="flex justify-between pt-1 px-1">
                            <div className="flex font-semibold text-violet-600 text-[13px]">
                                <p>F{orderItem.product.product_floor || '1'}</p>&nbsp;
                                <p>/</p>&nbsp;
                                <p>{orderItem.product.product_addr}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-around py-2 text-[11px]">
                    {["หมด", "ไม่พอ", "ไม่เจอ", "เสีย", "ด้านล่าง"].map(
                        (label, idx) => {
                            console.log("label", label);
                            console.log("orderItem.picking_status", orderItem.picking_status);
                            console.log(orderItem.picking_status === label);
                            return <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDoubleClick(orderItem, label);
                                }}
                                className={`text-white rounded-sm shadow-md bg-amber-500 py-2 px-3 ${orderItem.picking_status === label
                                    ? "bg-red-500"
                                    : ""
                                    }`}
                            >
                                {label}
                            </button>
                        }
                    )}
                </div>
                <div className="flex justify-between py-1 px-1 text-xs text-gray-500">
                    <div className="flex justify-start">
                        <p>
                            {orderItem.emp_code_floor_picking
                                ? "จัดแล้ว"
                                : "ยังไม่จัด"}
                        </p>
                        &nbsp;{
                            orderItem.emp_code_floor_picking &&
                            <p> [{orderItem.emp_code_floor_picking || ""}] &nbsp;
                                {new Date(
                                    orderItem.so_picking_time || ""
                                ).toLocaleDateString("th-TH", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                })}{" "}
                                {new Date(
                                    orderItem.so_picking_time || ""
                                ).toLocaleTimeString("th-TH", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                })}
                            </p>
                        }
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
