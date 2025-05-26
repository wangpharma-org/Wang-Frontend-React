const FormatLogReport = () => {
    const SumIndexMemInvoice = () => {

    }
    const data = [
        { id: 1, name: "Customer A", sales: 1000 },
        { id: 2, name: "Customer B", sales: 1500 },
        { id: 3, name: "Customer C", sales: 2000 },
        { id: 4, name: "Customer D", sales: 2500 },
        { id: 5, name: "Customer E", sales: 3000 },
        { id: 6, name: "Customer F", sales: 1000 },
        { id: 7, name: "Customer G", sales: 1500 },
        { id: 8, name: "Customer H", sales: 2000 },
        { id: 9, name: "Customer I", sales: 2500 },
        { id: 10, name: "Customer J", sales: 3000 }
    ]
    const route = [
        { route_name: "ทั้งหมด", price: 0 },
        { route_name: "L1-1 หาดใหญ่", price: 245 },
        { route_name: "L1-2 สงขลา", price: 388 },
        { route_name: "L1-3 สะเดา", price: 324 },
        { route_name: "L1-5 สทิงพระ", price: 201 },
        { route_name: "L10 นครศรีฯ", price: 410 },
        { route_name: "L11 กระบี่", price: 271 },
        { route_name: "L12 ภูเก็ต", price: 497 },
        { route_name: "L13 สุราษฏร์ธานี", price: 358 },
        { route_name: "L16 ยาแห้ง ส่งฟรี ทั่วไทย", price: 0 },
        { route_name: "L17 พังงา", price: 305 },
        { route_name: "L18 เกาะสมุย", price: 472 },
        { route_name: "L19 พัทลุง-นครฯ", price: 399 },
        { route_name: "L2 ปัตตานี", price: 263 },
        { route_name: "L20 ชุมพร", price: 315 },
        { route_name: "L21 เกาะลันตา", price: 452 },
        { route_name: "L22 เกาะพะงัน", price: 481 },
        { route_name: "L3 สตูล", price: 289 },
        { route_name: "L4 พัทลุง", price: 221 },
        { route_name: "L4-1 พัทลุง VIP", price: 322 },
        { route_name: "L5-1 นราธิวาส", price: 412 },
        { route_name: "L1-3 สุไหงโกลก", price: 390 },
        { route_name: "L6 ยะลา", price: 278 },
        { route_name: "L7 เบตง", price: 437 },
        { route_name: "L9 ตรัง", price: 341 },
        { route_name: "L9-11 กระบี่-ตรัง", price: 369 },
        { route_name: "Office รับเอง", price: 0 }

    ];
    const employees = [
        {
            emp_id: "EMP001",
            name: "สมชาย ใจดี",
            total_customers: 25,
            total_areas: 3,
            total_bills: 40,
            total_items: 125,
            total_price: 15300
        },
        {
            emp_id: "EMP002",
            name: "อรทัย สายบุญ",
            total_customers: 18,
            total_areas: 2,
            total_bills: 28,
            total_items: 92,
            total_price: 10120
        },
        {
            emp_id: "EMP003",
            name: "ศักดิ์ดา สุขใจ",
            total_customers: 30,
            total_areas: 4,
            total_bills: 50,
            total_items: 180,
            total_price: 18750
        },
        {
            emp_id: "EMP004",
            name: "วาสนา ดีจริง",
            total_customers: 22,
            total_areas: 3,
            total_bills: 33,
            total_items: 104,
            total_price: 11280
        },
        {
            emp_id: "EMP005",
            name: "สุชาติ ตั้งใจ",
            total_customers: 15,
            total_areas: 1,
            total_bills: 20,
            total_items: 67,
            total_price: 8230
        },
        {
            emp_id: "EMP006",
            name: "วิไลวรรณ ใจงาม",
            total_customers: 27,
            total_areas: 3,
            total_bills: 38,
            total_items: 113,
            total_price: 13450
        },
        {
            emp_id: "EMP007",
            name: "นเรศ สอนดี",
            total_customers: 19,
            total_areas: 2,
            total_bills: 25,
            total_items: 84,
            total_price: 9650
        },
        {
            emp_id: "EMP008",
            name: "เกศสุดา เก่งมาก",
            total_customers: 32,
            total_areas: 4,
            total_bills: 52,
            total_items: 190,
            total_price: 20110
        },
        {
            emp_id: "EMP009",
            name: "ปิติพงษ์ แก้วใส",
            total_customers: 20,
            total_areas: 2,
            total_bills: 30,
            total_items: 100,
            total_price: 11000
        },
        {
            emp_id: "EMP010",
            name: "ยุพา ประเสริฐ",
            total_customers: 17,
            total_areas: 2,
            total_bills: 24,
            total_items: 73,
            total_price: 8780
        }
    ];

    return (
        <div>
            <div className="flex flex-col justify-center mt-15  text-center">
                <style>
                    {`
                @media print {
  .page-break {
    page-break-before: always;
  }
                }
            `}
                </style>
                <div className="flex flex-col">
                    <p className="text-4xl font-bold ">รายงาน</p>
                    <p className="text-2xl font-bold mt-3">ผลการตรวจสอบบันทึกการขายประจำวัน</p>
                    <p className="text-base font-bold mt-3">ออกรายงาน วัน ... ที่ ... เดือน ... พ.ศ. ...</p>
                </div>
                <div className="mt-50">
                    <p className="text-4xl font-bold">ประจำวัน</p>
                    <p className="text-xl font-bold mt-3">วัน ... ที่ ... เดือน ... พ.ศ. ...</p>
                </div>
                <div className="mt-50">
                    <p className="text-xl font-bold">รายงานนี้เป็นส่วนหนึ่งของขั้นตอนการตรวจสอบ</p>
                    <p className="text-xl font-bold">บันทึกการขายสินค้าประจำวัน</p>
                    <p className="text-xl font-bold">บริษัท วังเภสัชฟาร์มาซูติคอล จำกัด</p>
                </div>
                <div className="flex justify-between mt-20 mx-5">
                    <div className="flex flex-col justify-center">
                        <p>ลงชื่อ____________________ออกรายงาน</p>
                        <p>(________________________)</p>
                        <p>วันที่____/____/____</p>
                    </div>
                    <div>
                        <p>ลงชื่อ____________________ออกรายงาน</p>
                        <p>(________________________)</p>
                        <p>วันที่____/____/____</p>
                    </div>
                </div>
            </div>
            <div className="page-break flex flex-col justify-center mt-15 text-center">
                <p className="text-lg font-bold">ตารางสรุปรายชื่อลูกค้าตามใบกำกบัการขาย ประจำวัน ... ที่ ... เดือน ... พ.ศ. ...</p>
                <div className="grid grid-cols-5 mt-3 text-xs font-bold">
                    {data.map((item, index) => (
                        <div key={index} className="border p-1 border-gray-300 flex justify-between">
                            <div>
                                <p className="">{item.name}</p>
                            </div>
                            <div>
                                <p className="">{item.sales}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-col justify-center mt-5 text-center">
                <p className="text-lg font-bold">ตารางสรุปพื้นที่การขายสินค้าตามใบกำกับ ประจำวัน ... ที่ ... เดือน ... พ.ศ. ...</p>
                <div className="grid grid-cols-3 mt-3 text-xs font-bold">
                    {route.map((item, index) => (
                        <div key={index} className="border p-1 border-gray-300 flex justify-between">
                            <div>
                                <p className="">{item.route_name}</p>
                            </div>
                            <div>
                                <p className="">{item.price}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-col justify-center mt-5 text-center">
                <p className="text-lg font-bold">ตารางสรุปฝ่ายขาย ตามใบกำกับ ประจำวัน ... ที่ ... เดือน ... พ.ศ. ...</p>
                <div className="grid grid-cols-3 mt-3 text-xs font-bold">
                    {employees.map((employee, index) => (
                        <div key={index} className="border p-2 border-gray-300 text-xs font-bold">
                            <div className="flex justify-center py-1 border-b-1 border-gray-300">
                                <p>[{employee.emp_id}]</p>
                                <p>{employee.name}</p>
                            </div>
                            <div className="flex w-full mt-auto py-1 border-b-1 border-gray-300">
                                <div className="flex flex-col w-1/2">
                                    <p>ลูกค้า {employee.total_customers} ราย</p>
                                </div>
                                <div className="flex flex-col w-1/2">
                                    <p>ในพื้นที่: {employee.total_areas} เขต</p>
                                </div>
                            </div>
                            
                            <div className="flex w-full mt-auto py-1 border-b-1 border-gray-300">
                                <div className="flex flex-col w-1/3">
                                    <p>บิล</p>
                                </div>
                                <div className="flex flex-col w-1/3">
                                    <p>รายการ</p>
                                </div>
                                <div className="flex flex-col w-1/3">
                                    <p>มูลค่า</p>
                                </div>
                            </div>
                            <div className="flex w-full mt-2">
                                <div className="flex flex-col w-1/3">
                                    <p>{employee.total_bills}</p>
                                </div>
                                <div className="flex flex-col w-1/3">
                                    <p>{employee.total_items}</p>
                                </div>
                                <div className="flex flex-col w-1/3">
                                    <p>{employee.total_price}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-lg font-bold text-center mt-5">รายการใบกำกับสินค้า</p>
                <table>
                    <thead>
                        <td>ที่</td>
                        <td>วันที่</td>
                    </thead>
                </table>
            </div>
        </div>
    );
}

export default FormatLogReport;