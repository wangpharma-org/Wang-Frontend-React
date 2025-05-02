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
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [statusOrder, setStatusOrder] = useState<string>('');

    useEffect(() => {
        // mock data
        const mockData: PickingData = {
            mem_code: "M001",
            mem_name: "พนักงานทดสอบ",
            all_sh_running: ["SH001", "SH002", "SH003", "SH004", "SH005"],
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
                                product_name: "สินค้า A ชั้น1",
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
                {
                    sh_running: "SH002",
                    shoppingOrders: [
                        {
                            so_running: "SO002",
                            so_amount: 10,
                            so_unit: "ชิ้น",
                            picking_status: "pending",
                            emp_code_floor_picking: null,
                            so_picking_time: new Date().toISOString(),
                            product: {
                                product_code: "P001",
                                product_name: "สินค้า B ชั้น2",
                                product_image_url: "https://via.placeholder.com/150",
                                product_barcode: "1234567890",
                                product_floor: "2",
                                product_addr: "Aisle 3",
                                product_stock: "20",
                                product_unit: "ชิ้น",
                            },
                        },
                    ],
                },
                {
                    sh_running: "SH003",
                    shoppingOrders: [
                        {
                            so_running: "SO003",
                            so_amount: 10,
                            so_unit: "ชิ้น",
                            picking_status: "pending",
                            emp_code_floor_picking: null,
                            so_picking_time: new Date().toISOString(),
                            product: {
                                product_code: "P001",
                                product_name: "สินค้า C ชั้น3",
                                product_image_url: "https://via.placeholder.com/150",
                                product_barcode: "1234567890",
                                product_floor: "3",
                                product_addr: "Aisle 3",
                                product_stock: "20",
                                product_unit: "ชิ้น",
                            },
                        },
                    ],
                },
                {
                    sh_running: "SH004",
                    shoppingOrders: [
                        {
                            so_running: "SO004",
                            so_amount: 10,
                            so_unit: "ชิ้น",
                            picking_status: "pending",
                            emp_code_floor_picking: null,
                            so_picking_time: new Date().toISOString(),
                            product: {
                                product_code: "P001",
                                product_name: "สินค้า D ชั้น4",
                                product_image_url: "https://via.placeholder.com/150",
                                product_barcode: "1234567890",
                                product_floor: "4",
                                product_addr: "Aisle 3",
                                product_stock: "20",
                                product_unit: "ชิ้น",
                            },
                        },
                    ],
                },
                {
                    sh_running: "SH005",
                    shoppingOrders: [
                        {
                            so_running: "SO005",
                            so_amount: 10,
                            so_unit: "ชิ้น",
                            picking_status: "pending",
                            emp_code_floor_picking: null,
                            so_picking_time: new Date().toISOString(),
                            product: {
                                product_code: "P001",
                                product_name: "สินค้า E ชั้น5",
                                product_image_url: "https://via.placeholder.com/150",
                                product_barcode: "1234567890",
                                product_floor: "5",
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
        clickCountRef.current++;

        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => {
            clickCountRef.current = 0;
        }, 500);

        if (clickCountRef.current === 2) {
            clickCountRef.current = 0;

            setSelectedItems(prev => {
                const newSet = new Set(prev);
                if (newSet.has(orderItem.so_running)) {
                    newSet.delete(orderItem.so_running); // ยกเลิกเลือก
                } else {
                    newSet.add(orderItem.so_running); // เลือก
                }
                return newSet;
            });

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

    const floorButtons = [
        { label: 'ชั้น 1', value: '1', color: 'bg-gray-400' },
        { label: 'ชั้น 2', value: '2', color: 'bg-yellow-500' },
        { label: 'ชั้น 3', value: '3', color: 'bg-indigo-500' },
        { label: 'ชั้น 4', value: '4', color: 'bg-red-500' },
        { label: 'ชั้น 5', value: '5', color: 'bg-emerald-500' },
        { label: 'ยกลัง', value: 'box', color: 'bg-purple-500' }, // ถ้าคุณจะใช้ type พิเศษ
    ];

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
        <div className='flex flex-col h-screen'>
            <header className="p-2 bg-blue-400 text-white font-medium">
                <div>
                    <div className="flex justify-between">
                        <div>
                            <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs">ลัง</button>
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
                            <button className="bg-white rounded-sm px-3 py-1 text-black drop-shadow-xs">
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
                    <div className="flex justify-start">
                        <div id="button" className='flex justify-start'>
                            <button className="px-3 pt-2 cursor-pointer text-center ">
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
                        <div id="name" onClick={gotomainpage} className="flex pt-2 cursor-pointer text-center justify-center mx-auto">
                            <p>{listproduct?.mem_code}</p>&nbsp;
                            <p>{listproduct?.mem_name}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="content bg-white overflow-y-auto h-full p-1 text-[#444444]">
                {listproduct.shoppingHeads.map((head, headIdx) => (
                    <div key={headIdx} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {head.shoppingOrders.filter((orderItem) =>
                            selectedFloor ? orderItem.product.product_floor === selectedFloor : true
                        )
                            .map((orderItem, Orderindex) => (
                                <div
                                    key={Orderindex}
                                    className={`p-2 rounded-sm mb-1 ${selectedItems.has(orderItem.so_running)
                                        ? 'bg-green-400'
                                        : orderItem.picking_status === 'picking'
                                            ? 'bg-green-400'
                                            : 'bg-gray-400'
                                        }`}
                                >
                                    <div
                                        onClick={() => handleDoubleClick(orderItem)} // เพิ่ม onClick สำหรับดับเบิลคลิก
                                        className="py-2 px-1 rounded-sm bg-[#E6E6E6] m-1 cursor-pointer"
                                    >
                                        <div className="flex justify-stretch p-1">
                                            <div className="w-1/3 border border-gray-500">
                                                <img src={orderItem.product.product_image_url} className="w-25 h-25 object-cover" />
                                            </div>
                                            <div className="text-xs w-2/3 ml-1">
                                                <div className="flex justify-between pt-1 px-1">
                                                    <p className="font-bold">{orderItem.product.product_name}</p>
                                                    <p>{head.sh_running}</p>
                                                </div>
                                                <div className="flex justify-between pt-1 px-1">
                                                    <p>{orderItem.so_running}</p>
                                                    <p className="border border-[#613DB6] px-2 py-1 rounded-sm bg-violet-500 text-white">
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
                                            </div>
                                        </div>
                                        <div className="flex justify-around py-2 text-[11px]">
                                            {["หมด", "ไม่พอ", "ไม่เจอ", "เสีย", "ด้านล่าง"].map((label, idx) => (
                                                <button key={idx} className="border text-white rounded-sm shadow-md bg-amber-500 py-1 px-2">{label}</button>
                                            ))}
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
            <footer className="py-2 bg-blue-400 text-white font-medium flex justify-between ">
                {floorButtons.map((btn) => (
                    <button
                        key={btn.value}
                        onClick={() => setSelectedFloor((prev) => (prev === btn.value ? null : btn.value))}
                        className={`border border-gray-500 py-1 px-2 rounded-sm shadow-lg 
                            ${btn.color} 
                            hover:bg-yellow-300 hover:text-black
                            ${selectedFloor === btn.value ? 'ring-2 ring-yellow-300 text-black' : ''}
                            `}
                        >
                        {btn.label}
                    </button>
                ))}

                {showButton && (
                    <div>
                        <button
                            onClick={submit}
                            className="w-full border px-3 py-1 shadow-md text-lg rounded-sm font-semibold bg-green-400 text-white"
                        >
                            ยืนยันการจัด
                        </button>
                    </div>
                )}
            </footer>
        </div>
    );
}

export default ProductList;
