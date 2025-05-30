const FormatLogReport = () => {
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
    const mockData = [
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500001",
            warehouse: "WH01",
            customer_code: "00956",
            amount: 1500,
            discount: 100,
            total: 1400,
            vat: 98,
            grand_total: 1498,
            sales_emp: "EMP001",
            key_emp: "EMP001",
            note: "SH001",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500002",
            warehouse: "WH02",
            customer_code: "00957",
            amount: 2300,
            discount: 150,
            total: 2150,
            vat: 150.5,
            grand_total: 2300.5,
            sales_emp: "EMP002",
            key_emp: "EMP002",
            note: "SH002",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500003",
            warehouse: "WH01",
            customer_code: "00958",
            amount: 1200,
            discount: 0,
            total: 1200,
            vat: 84,
            grand_total: 1284,
            sales_emp: "EMP003",
            key_emp: "EMP003",
            note: "SH003",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500004",
            warehouse: "WH03",
            customer_code: "00959",
            amount: 3100,
            discount: 200,
            total: 2900,
            vat: 203,
            grand_total: 3103,
            sales_emp: "EMP004",
            key_emp: "EMP004",
            note: "SH004",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500005",
            warehouse: "WH02",
            customer_code: "00960",
            amount: 800,
            discount: 50,
            total: 750,
            vat: 52.5,
            grand_total: 802.5,
            sales_emp: "EMP005",
            key_emp: "EMP005",
            note: "SH005",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500006",
            warehouse: "WH01",
            customer_code: "00961",
            amount: 2700,
            discount: 300,
            total: 2400,
            vat: 168,
            grand_total: 2568,
            sales_emp: "EMP006",
            key_emp: "EMP006",
            note: "SH006",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500007",
            warehouse: "WH03",
            customer_code: "00962",
            amount: 1600,
            discount: 100,
            total: 1500,
            vat: 105,
            grand_total: 1605,
            sales_emp: "EMP007",
            key_emp: "EMP007",
            note: "SH007",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500008",
            warehouse: "WH02",
            customer_code: "00963",
            amount: 1900,
            discount: 200,
            total: 1700,
            vat: 119,
            grand_total: 1819,
            sales_emp: "EMP008",
            key_emp: "EMP008",
            note: "SH008",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500009",
            warehouse: "WH01",
            customer_code: "00964",
            amount: 3000,
            discount: 500,
            total: 2500,
            vat: 175,
            grand_total: 2675,
            sales_emp: "EMP009",
            key_emp: "EMP009",
            note: "SH009",
            checked_date: ""
        },
        {
            date: "20/06/68",
            status: "✕",
            bill_no: "500010",
            warehouse: "WH03",
            customer_code: "00965",
            amount: 1000,
            discount: 0,
            total: 1000,
            vat: 70,
            grand_total: 1070,
            sales_emp: "EMP010",
            key_emp: "EMP010",
            note: "SH010",
            checked_date: ""
        }
    ];
    const mockTableData = [
        {
            no: 1,
            orderDateTime: "20/06/68 08:30",
            scanDateTime1: "20/06/68 08:45",
            customerCode1: "C001",
            whitePaperNo: "WP-1001",
            empty: "",
            yellowPaperNo: "",
            customerCode2: "",
            uploadDateTime: "",
            scanDateTime2: ""
        },
        {
            no: 2,
            orderDateTime: "20/06/68 09:00",
            scanDateTime1: "20/06/68 09:10",
            customerCode1: "C002",
            whitePaperNo: "WP-1002",
            empty: "",
            yellowPaperNo: "YP-2002",
            customerCode2: "C002",
            uploadDateTime: "20/06/68 09:12",
            scanDateTime2: "20/06/68 09:18"
        },
        {
            no: 3,
            orderDateTime: "20/06/68 09:20",
            scanDateTime1: "20/06/68 09:25",
            customerCode1: "C003",
            whitePaperNo: "WP-1003",
            empty: "",
            yellowPaperNo: "YP-2003",
            customerCode2: "C003",
            uploadDateTime: "20/06/68 09:28",
            scanDateTime2: "20/06/68 09:30"
        },
        {
            no: 4,
            orderDateTime: "20/06/68 10:00",
            scanDateTime1: "20/06/68 10:05",
            customerCode1: "C004",
            whitePaperNo: "WP-1004",
            empty: "",
            yellowPaperNo: "YP-2004",
            customerCode2: "C004",
            uploadDateTime: "20/06/68 10:10",
            scanDateTime2: "20/06/68 10:15"
        },
        {
            no: 5,
            orderDateTime: "20/06/68 10:30",
            scanDateTime1: "20/06/68 10:35",
            customerCode1: "C005",
            whitePaperNo: "WP-1005",
            empty: "",
            yellowPaperNo: "YP-2005",
            customerCode2: "C005",
            uploadDateTime: "20/06/68 10:38",
            scanDateTime2: "20/06/68 10:40"
        },
        {
            no: 6,
            orderDateTime: "20/06/68 11:00",
            scanDateTime1: "20/06/68 11:03",
            customerCode1: "C006",
            whitePaperNo: "WP-1006",
            empty: "",
            yellowPaperNo: "YP-2006",
            customerCode2: "C006",
            uploadDateTime: "20/06/68 11:05",
            scanDateTime2: "20/06/68 11:07"
        },
        {
            no: 7,
            orderDateTime: "20/06/68 11:20",
            scanDateTime1: "20/06/68 11:25",
            customerCode1: "C007",
            whitePaperNo: "WP-1007",
            empty: "",
            yellowPaperNo: "YP-2007",
            customerCode2: "C007",
            uploadDateTime: "20/06/68 11:30",
            scanDateTime2: "20/06/68 11:32"
        },
        {
            no: 8,
            orderDateTime: "20/06/68 12:00",
            scanDateTime1: "20/06/68 12:05",
            customerCode1: "C008",
            whitePaperNo: "WP-1008",
            empty: "",
            yellowPaperNo: "YP-2008",
            customerCode2: "C008",
            uploadDateTime: "20/06/68 12:10",
            scanDateTime2: "20/06/68 12:12"
        },
        {
            no: 9,
            orderDateTime: "20/06/68 12:30",
            scanDateTime1: "20/06/68 12:33",
            customerCode1: "C009",
            whitePaperNo: "WP-1009",
            empty: "",
            yellowPaperNo: "YP-2009",
            customerCode2: "C009",
            uploadDateTime: "20/06/68 12:35",
            scanDateTime2: "20/06/68 12:38"
        },
        {
            no: 10,
            orderDateTime: "20/06/68 13:00",
            scanDateTime1: "20/06/68 13:05",
            customerCode1: "C010",
            whitePaperNo: "WP-1010",
            empty: "",
            yellowPaperNo: "YP-2010",
            customerCode2: "C010",
            uploadDateTime: "20/06/68 13:10",
            scanDateTime2: "20/06/68 13:15"
        }
    ];

    const CheckScaninWhite = (item: any) => {

        return item.scanDateTime2 !== "";
    };

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
                <div className="mt-5 w-full flex justify-center">
                    <table className="w-full border-collapse">
                        <thead className=" font-bold text-center border border-gray-300 text-[10px]">
                            <td className="px-1 py-1 border border-gray-300">ที่</td>
                            <td className="px-1 py-1 border border-gray-300">วันที่</td>
                            <td className="px-1 py-1 border border-gray-300">สถานะ</td>
                            <td className="px-1 py-1 border border-gray-300">เลขที่บิล</td>
                            <td className="px-1 py-1 border border-gray-300">คลังสินค้า</td>
                            <td className="px-1 py-1 border border-gray-300">รหัสลูกค้า</td>
                            <td className="px-1 py-1 border border-gray-300">จำนวนเงิน</td>
                            <td className="px-1 py-1 border border-gray-300">ส่วนลด</td>
                            <td className="px-1 py-1 border border-gray-300">ยอดรวม</td>
                            <td className="px-1 py-1 border border-gray-300">ภาษี</td>
                            <td className="px-1 py-1 border border-gray-300">ยอดรวมสุทธิ</td>
                            <td className="px-1 py-1 border border-gray-300">พนักงานขาย</td>
                            <td className="px-1 py-1 border border-gray-300">พนักงานคีย์</td>
                            <td className="px-1 py-1 border border-gray-300">หมายเหตุ</td>
                            <td className="px-1 py-1 border border-gray-300">วันที่ตรวจสอบ</td>
                        </thead>
                        <tbody className="text-[10px]">
                            {mockData.map((item, index) => (
                                <tr key={index} >
                                    <td className="border border-gray-300 px-1 py-1 text-center">{index + 1}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-center">{item.date}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-center">{item.status}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-center">{item.bill_no}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-left">{item.warehouse}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-center">{item.customer_code}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-right">{item.amount.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-right">{item.discount.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-right">{item.total.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-right">{item.vat.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-right">{item.grand_total.toFixed(2)}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-left">{item.sales_emp}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-left">{item.key_emp}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-left">{item.note}</td>
                                    <td className="border border-gray-300 px-1 py-1 text-center">{item.checked_date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <p className="text-lg font-bold text-center mt-5">รายการใบสั่งจอง ใบขาว</p>
                <div className="mt-5 w-full flex justify-center">
                    <table className="w-full border-collapse">
                        <thead className=" font-bold text-center border border-gray-300 text-[10px]">
                            <td className="px-1 py-1 border border-gray-300">ที่</td>
                            <td className="px-1 py-1 border border-gray-300">วันที่ / เวลา[สั่ง]</td>
                            <td className="px-1 py-1 border border-gray-300">วันที่ / เวลา[สแกน]</td>
                            <td className="px-1 py-1 border border-gray-300">รหัสลูกค้า</td>
                            <td className="px-1 py-1 border border-gray-300">เลขที่ใบขาว</td>
                            <td className="px-1 py-1 border border-gray-300">&nbsp;</td>
                            <td className="px-1 py-1 border border-gray-300">เลขที่ใบเหลือง</td>
                            <td className="px-1 py-1 border border-gray-300">รหัสลูกค้า</td>
                            <td className="px-1 py-1 border border-gray-300">วันที่ / เวลา[อัพโหลด]</td>
                            <td className="px-1 py-1 border border-gray-300">วันที่ / เวลา[สแกน]</td>
                        </thead>
                        <tbody className="text-[10px]">
                            {mockTableData
                                .map((item, index) => (
                                    <tr key={index} >
                                        <td className="border border-gray-300 px-1 py-1 text-center">{index + 1}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{item.orderDateTime}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{item.scanDateTime1}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{item.customerCode1}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-left">{item.whitePaperNo}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{CheckScaninWhite(item) ? item.empty : "???"}</td>
                                        {CheckScaninWhite(item) ? (
                                            <>
                                                <td className="border border-gray-300 px-1 py-1 text-left">{item.yellowPaperNo}</td>
                                                <td className="border border-gray-300 px-1 py-1 text-left">{item.customerCode2}</td>
                                                <td className="border border-gray-300 px-1 py-1 text-center">{item.uploadDateTime}</td>
                                                <td className="border border-gray-300 px-1 py-1 text-center">{item.scanDateTime2}</td>
                                            </>
                                        ) : (
                                            <td className="border border-gray-300 px-1 py-1 text-center font-bold" colSpan={4}>
                                                ไม่มีการยันบิล
                                            </td>
                                        )}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FormatLogReport;