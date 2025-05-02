import { useEffect, useRef, useState } from 'react';

interface Product {
    product_code: string;
    product_name: string;
    product_image_url: string;
    product_barcode: string;
    product_floor: string;
    product_addr: string;
    product_stock: string;
    product_unit: string;
}

interface ShoppingOrder {
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
    shoppingOrders: ShoppingOrder[];
}

interface PickingData {
    mem_code: string;
    mem_name: string;
    shoppingHeads: ShoppingHead[];
    all_sh_running: string[];
}

function ProductList() {
    const [listproduct, setListproduct] = useState<PickingData | null>(null);
    const [showButton, setShowButton] = useState(false);  // state for showing the button
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [doubleClickedItem, setDoubleClickedItem] = useState<ShoppingOrder | null>(null);
    const [selectedFloor, setSelectedFloor] = useState('');

    useEffect(() => {
        // mock data
        const mockData: PickingData = {
            mem_code: "M001",
            mem_name: "พนักงานทดสอบ",
            all_sh_running: ["SH001"],
            shoppingHeads: [
                {
                    sh_running: "SH001",
                    shoppingOrders: [
                        {
                            so_running: "SO001",
                            so_amount: 5,
                            so_unit: "ชิ้น",
                            picking_status: "pending",
                            emp_code_floor_picking: null,
                            so_picking_time: new Date().toISOString(),
                            product: {
                                product_code: "P001",
                                product_name: "สินค้า A",
                                product_image_url: "https://via.placeholder.com/150",
                                product_barcode: "1234567890",
                                product_floor: "1",
                                product_addr: "Aisle 3",
                                product_stock: "20",
                                product_unit: "ชิ้น",
                            },
                        },
                    ],
                },
            ],
        };

        setTimeout(() => {
            setListproduct(mockData);
        }, 1000);
    }, []);

    const handleDoubleClick = (orderItem: ShoppingOrder) => {
        clickCountRef.current++; // เพิ่มจำนวนคลิก

        if (clickTimerRef.current) clearTimeout(clickTimerRef.current); // เคลียร์ timeout ก่อนหน้า
        clickTimerRef.current = setTimeout(() => {
            clickCountRef.current = 0; // รีเซ็ตจำนวนคลิกหลังจาก 500ms
        }, 500);

        if (clickCountRef.current === 2) { // ถ้าคลิกสองครั้งในช่วงเวลาที่กำหนด
            clickCountRef.current = 0; // รีเซ็ตการนับคลิก
            if (doubleClickedItem?.so_running === orderItem.so_running) {
                setDoubleClickedItem(null); // กลับไปสีเดิม
            } else {
                setDoubleClickedItem(orderItem); // เปลี่ยนสี
            }
            console.log('Double clicked:', orderItem.so_running);
        }
    };
    
    const gotomainpage = () => {
        window.location.href = "/Main_Order";
    };

    // Calculate totals, picking, and pending counts
    const totalOrders = listproduct?.shoppingHeads.reduce((total, head) => total + head.shoppingOrders.length, 0) || 0;
    const pickingCount = listproduct?.shoppingHeads.reduce((total, head) => total + head.shoppingOrders.filter(order => order.picking_status === 'picking').length, 0) || 0;
    const pendingCount = listproduct?.shoppingHeads.reduce((total, head) => total + head.shoppingOrders.filter(order => order.picking_status === 'pending').length, 0) || 0;

    // const [products, setProducts] = useState<Product[]>([
    //     { product_code: "P001", product_name: "สินค้า A", product_floor: "1" },
    //     { product_code: "P002", product_name: "สินค้า B", product_floor: "2" },
    //     { product_code: "P003", product_name: "สินค้า C", product_floor: "3" },
    //     { product_code: "P004", product_name: "สินค้า D", product_floor: "2" },
    // ]);
    
    //     // กรองสินค้าตามชั้นที่เลือก
    //     const filteredProducts = products.filter(product => 
    //         selectedFloor ? product.product_floor === selectedFloor : true
    //     );

    const submit = () => {
        console.log('Submit button clicked');
        // You can add your submit logic here
    };

    if (!listproduct) {
        return <div className="flex justify-center font-bold text-2xl items-center">Loading...</div>;
    }

    if (!listproduct.shoppingHeads) {
        return (
            <div className="flex flex-col items-center mt-5">
                <p className="font-bold text-2xl">ไม่มีรายการสินค้า</p>
                <button onClick={gotomainpage} className="font-semibold text-xl mt-5 border px-2 py-1 bg-gray-200 shadow-md rounded-sm">
                    กลับไปที่หน้าแรก
                </button>
            </div>
        );
    }

    return (
        <div className='flex flex-col min-w-screen'>
            <div id="header" className="header p-2 bg-gray-300">
                <div className="flex justify-between">
                    <div>
                        <button className="border rounded-sm px-3 py-1 shadow-lg">ลัง</button>
                    </div>
                    <div>
                        <div className="flex justify-center text-sm">
                            <p>เวลาตอนนี้&nbsp;</p>
                            <p>{listproduct?.mem_code}</p>
                        </div>
                        <div className="flex justify-center text-xs">
                            <p>
                                ทั้งหมด {listproduct?.shoppingHeads?.length || 0} ร้าน {totalOrders} รายการ
                            </p>
                        </div>
                        <div className="flex justify-center text-xs">
                            <p>เหลือจัด {pickingCount} รายการ</p>&nbsp;<p>|</p>&nbsp;
                            <p>กำลังจัด {pendingCount} รายการ</p>
                        </div>
                    </div>
                    <div>
                        <button className="border rounded-sm px-3 py-1 shadow-lg">icon</button>
                    </div>
                </div>
                <div className="flex justify-between">
                    <div>
                        <button className="border rounded-sm px-3 py-1 shadow-lg">2</button>
                    </div>
                    <div onClick={gotomainpage} className="flex pt-2 cursor-pointer">
                        <p>{listproduct?.mem_code}</p>&nbsp;
                        <p>{listproduct?.mem_name}</p>
                    </div>
                    <div>
                        <button className="border rounded-sm px-3 py-1 shadow-lg">2</button>
                    </div>
                </div>
            </div>
            <div className="content bg-blue-100 overflow-y-auto p-1 text-[#444444]">
            {listproduct.shoppingHeads.map((head, headIdx) => (
                <div key={headIdx} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {head.shoppingOrders.map((orderItem, Orderindex) => (
                        <div
                            key={Orderindex}
                            className={`border p-1 rounded-sm mb-1 ${
                                doubleClickedItem?.so_running === orderItem.so_running
                                    ? 'bg-[#70CD8C]'  // สีที่เปลี่ยนเมื่อดับเบิลคลิก
                                    : orderItem.picking_status === 'picking'
                                    ? 'bg-[#70CD8C]'  // สีเมื่อ picking
                                    : 'bg-[#E6E6E6]'   // สีเริ่มต้น
                            }`}
                        >
                            <div
                                onClick={() => handleDoubleClick(orderItem)} // เพิ่ม onClick สำหรับดับเบิลคลิก
                                className="py-2 px-1 rounded-sm bg-[#E6E6E6] m-1 cursor-pointer"
                            >
                                    <div className="flex justify-stretch p-1">
                                        <div className="w-1/3 border border-gray-500">
                                            <img src={orderItem.product.product_image_url} className="w-32 h-32 object-cover" />
                                        </div>
                                        <div className="text-xs w-2/3 ml-1">
                                            <div className="flex justify-between pt-1 px-1">
                                                <p className="font-bold">{orderItem.product.product_name}</p>
                                                <p>{head.sh_running}</p>
                                            </div>
                                            <div className="flex justify-between pt-1 px-1">
                                                <p>{orderItem.so_running}</p>
                                                <p className="border border-[#613DB6] px-2 py-1 rounded-sm bg-[#855CE5] text-white">
                                                    {orderItem.so_amount} {orderItem.so_unit}
                                                </p>
                                            </div>
                                            <div className="flex justify-between pt-1 px-1">
                                                <p className="text-amber-500 font-bold">{orderItem.product.product_code}</p>
                                                <p>เหลือ {orderItem.product.product_stock} {orderItem.product.product_unit}</p>
                                            </div>
                                            <div className="flex justify-between pt-1 px-1">
                                                <div className="flex font-semibold text-violet-600">
                                                    <p>F{orderItem.product.product_floor}</p>&nbsp;<p>{orderItem.product.product_addr}</p>
                                                </div>
                                                <p className="font-semibold">[{orderItem.emp_code_floor_picking || ''}]</p>
                                            </div>
                                            <div className="flex justify-between py-2 text-[11px]">
                                                {["หมด", "ไม่พอ", "ไม่เจอ", "เสีย", "ด้านล่าง"].map((label, idx) => (
                                                    <button key={idx} className="border text-white rounded-sm shadow-md bg-amber-500 p-1">{label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between py-1 text-xs text-gray-500">
                                        <div className="flex justify-start">
                                            <p>{orderItem.emp_code_floor_picking ? 'จัดแล้ว' : 'ยังไม่จัด'}</p>&nbsp;
                                            <p>
                                                {new Date(orderItem.so_picking_time || '').toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                })}{' '}
                                                {new Date(orderItem.so_picking_time || '').toLocaleTimeString('th-TH', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex justify-end pr-5">
                                            <button className="border-gray-300 border rounded-sm px-3 py-1 shadow-md bg-blue-400 text-white">STK</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="footer flex items-end justify-between py-1 text-[14px]">
                <div className="mx-1">
                    <button className="border border-gray-500 px-2 py-1 rounded-sm bg-orange-300 shadow-lg">ชั้น 1</button>
                </div>
                <div className="mr-1">
                    <button className="border border-gray-500 px-2 py-1 rounded-sm bg-[#e3e38d] shadow-lg">ชั้น 2</button>
                </div>
                <div className="mr-1">
                    <button className="border border-gray-500 px-2 py-1 rounded-sm bg-[#8d9ae3] shadow-lg">ชั้น 3</button>
                </div>
                <div className="mr-1">
                    <button className="border border-gray-500 px-2 py-1 rounded-sm bg-[#e38d90] shadow-lg">ชั้น 4</button>
                </div>
                <div className="mr-1">
                    <button className="border border-gray-500 px-2 py-1 rounded-sm bg-[#a0dba3] shadow-lg">ชั้น 5</button>
                </div>
                <div className="mr-1">
                    <button className="border border-gray-500 px-2 py-1 rounded-sm bg-[#b58de3] shadow-lg">ยกลัง</button>
                </div>
            </div>

            {showButton && (
                <div>
                    <button
                        onClick={submit}
                        className="w-full border px-3 py-1 bg-gray-200 shadow-md text-lg"
                    >
                        ยืนยันการจัด
                    </button>
                </div>
            )}
        </div>
    );
}

export default ProductList;
