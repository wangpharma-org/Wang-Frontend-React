import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th'); // ตั้ง locale ภาษาไทย

interface ReportItem {
    memberData: MemberData[];
    employeeData: EmployeeData[];
    routeData: RouteData[];
    date: Date;
    reportSumary: ReportSumary[];
}

interface MemberData {
    memCode: string;
    totalAmount_mem: number;
}

interface EmployeeData {
    emp_code: string;
    emp_nickname: string;
    countBill: number;
    countMember: number;
    countRoute: number;
    countlistOrder: number;
    totalAmount_emp: number;
}

interface RouteData {
    routeCode: string;
    routeName: string;
    totalAmount_route: number;

}

interface WhitePaper {
    id: number | null;
    sh_running: string | null;
    mem_code: string | null;
    price: string | null;
    count_list: number | null;
    whiteToEmployeeCount: number;
    latestScan_timeW: string | null;
}

interface YellowPaper {
    id: number | null;
    sh_running: string | null;
    mem_code: string | null;
    invoice_code: string | null;
    price: string | null;
    count_list: number | null;
    whiteToEmployeeCount: number;
    latestScan_timeW: string | null;
}

interface ReportSumary {
    id: number;
    sh_running: string;
    mem_code: string;
    mem_name: string;
    dateInvoice: string; // ISO Date string
    sh_sumprice: string; // ถ้าใช้ number ในระบบคุณก็เปลี่ยนเป็น number ได้
    emp_code_sale: string;
    vat: string;
    total: string;
    price: string;
    discount: string;
    paperStatus: string;
    yellowPaper: YellowPaper | null; // ปรับตามโครงสร้างจริงถ้ามี
    whitePaper: WhitePaper | null;
}



const FormatLogReport = () => {
    const [logReport, setLogReport] = useState<ReportItem | null>(null);
    const location = useLocation();
    const today = location.state?.today ?? true;

    console.log("today", today)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const url = today
                    ? `${import.meta.env.VITE_API_URL_VERIFY_ORDER}/api/dailyreport/today`
                    : `${import.meta.env.VITE_API_URL_VERIFY_ORDER}/api/dailyreport/yesterday`;

                const response = await axios.get(url);
                // console.log(response.data)
                const ReportData = response.data
                setLogReport(ReportData)
            }
            catch (error) {
                console.log(error)
            }
        }
        fetchData();
    }, [today])

    useEffect(() => {
        if (logReport) {
            console.log("logReport", logReport);
            console.log("logReport", logReport.routeData);
            console.log("logReport", logReport.reportSumary);

            // console.log("typeof response.data.sh_sumprice", typeof  (logReport[0].sh_sumprice))
        }

    }, [logReport])

    function parseThaiDate(dateString: Date) {
        const date = dayjs(dateString);

        return {
            day: date.date(),                 // วันที่
            month: date.month() + 1,         // เดือน (0-based + 1)
            monthName: date.format('MMMM'),  // ชื่อเดือนภาษาไทย
            year: date.year() + 543,         // ปี พ.ศ.
            weekday: date.format('dddd'),    // ชื่อวันภาษาไทย
            fullDate: date.format('D MMMM YYYY'), // รูปแบบเต็ม "10 มิถุนายน 2025"
        };
    }
    if (!logReport) return <div>Loading...</div>;
    const dateInfo = parseThaiDate(logReport?.date);
    console.log("dateInfo", dateInfo);

    // const CheckScaninWhite
    // :()=()=> {

    // }
    const hasWhitePaper = logReport?.reportSumary?.some(item => item.whitePaper != null);

    const formatDate = (dateString: string) => {
        const date = dayjs(dateString);
        if (!date.isValid()) {
            return '-';
        }
        return date.format('DD/MM/YYYY HH:mm:ss');

    }

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
                    <p className="text-base font-bold mt-3">ออกรายงาน วัน {dateInfo.weekday} ที่ {dateInfo.day} เดือน {dateInfo.monthName} พ.ศ. {dateInfo.year}</p>
                </div>
                <div className="mt-50">
                    <p className="text-4xl font-bold">ประจำวัน</p>
                    <p className="text-xl font-bold mt-3">วัน {dateInfo.weekday} ที่ {dateInfo.day} เดือน {dateInfo.monthName} พ.ศ. {dateInfo.year}</p>
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
                        <p>วันที่_{dateInfo.day}_/____/_{dateInfo.year}_</p>
                    </div>
                    <div>
                        <p>ลงชื่อ____________________ออกรายงาน</p>
                        <p>(________________________)</p>
                        <p>วันที่_{dateInfo.day}_/____/_{dateInfo.year}_</p>
                    </div>
                </div>
            </div>
            <div className="page-break flex flex-col justify-center mt-15 text-center">
                <p className="text-base font-bold">ตารางสรุปรายชื่อลูกค้าตามใบกำกับการขาย ประจำวัน {dateInfo.weekday} ที่ {dateInfo.day} เดือน {dateInfo.monthName} พ.ศ. {dateInfo.year}</p>
                <div className="grid grid-cols-6 mt-3 text-xs font-bold">
                    {/* <p>{logReport?.date}</p> */}
                    {logReport?.memberData.map((Memitem, indexs) => (
                        <div key={indexs} className="border p-1 border-gray-300 flex justify-between">
                            <div>
                                <p className="">{Memitem.memCode}</p>
                            </div>
                            <div>
                                <p className="">{Memitem.totalAmount_mem}</p>
                            </div>
                        </div>
                    ))
                    }

                </div>
            </div>
            <div className="flex flex-col justify-center mt-5 text-center">
                <p className="text-base font-bold">ตารางสรุปพื้นที่การขายสินค้าตามใบกำกับ ประจำวัน {dateInfo.weekday} ที่ {dateInfo.day} เดือน {dateInfo.monthName} พ.ศ. {dateInfo.year}</p>
                <div className="grid grid-cols-3 mt-3 text-xs font-bold">
                    {logReport?.routeData.map((item, index) => (
                        <div key={index} className="border p-1 border-gray-300 flex justify-between">
                            <div className="flex">
                                <p className="">{item.routeCode}</p>&nbsp;
                                <p className="">{item.routeName}</p>
                            </div>
                            <div>
                                <p className="">{item.totalAmount_route}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-col justify-center mt-5 text-center">
                <p className="text-base font-bold">ตารางสรุปฝ่ายขาย ตามใบกำกับ ประจำวัน {dateInfo.weekday} ที่ {dateInfo.day} เดือน {dateInfo.monthName} พ.ศ. {dateInfo.year}</p>
                <div className="grid grid-cols-3 mt-3 text-xs font-bold">
                    {logReport?.employeeData
                        // .filter()
                        .map((employee, index) => (
                            <div key={index} className="border p-2 border-gray-300 text-xs font-bold">
                                <div className="flex justify-center py-1 border-b-1 border-gray-300">
                                    <p>[{employee.emp_code}]</p>
                                    <p>{employee.emp_nickname}</p>
                                </div>
                                <div className="flex w-full mt-auto py-1 border-b-1 border-gray-300">
                                    <div className="flex flex-col w-1/2">
                                        <p>ลูกค้า {employee.countMember} ราย</p>
                                    </div>
                                    <div className="flex flex-col w-1/2">
                                        <p>ในพื้นที่: {employee.countRoute} เขต</p>
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
                                        <p>{employee.countBill}</p>
                                    </div>
                                    <div className="flex flex-col w-1/3">
                                        <p>{employee.countlistOrder}</p>
                                    </div>
                                    <div className="flex flex-col w-1/3">
                                        <p>{employee.totalAmount_emp}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
            <div>
                <p className="text-base font-bold text-center mt-5">รายการใบกำกับสินค้า</p>
                <div className="mt-5 w-full flex justify-center">
                    <table className="w-full border-collapse">
                        <thead className=" font-bold text-center border border-gray-300 text-[10px]">
                            <tr>
                                <th className="px-1 py-1 border border-gray-300">ที่</th>
                                <th className="px-1 py-1 border border-gray-300">วันที่</th>
                                <th className="px-1 py-1 border border-gray-300">สถานะ</th>
                                <th className="px-1 py-1 border border-gray-300">เลขที่บิล</th>
                                <th className="px-1 py-1 border border-gray-300">รหัสลูกค้า</th>
                                <th className="px-1 py-1 border border-gray-300">จำนวนเงิน</th>
                                <th className="px-1 py-1 border border-gray-300">ส่วนลด</th>
                                <th className="px-1 py-1 border border-gray-300">ยอดรวม</th>
                                <th className="px-1 py-1 border border-gray-300">ภาษี</th>
                                <th className="px-1 py-1 border border-gray-300">ยอดรวมสุทธิ</th>
                                <th className="px-1 py-1 border border-gray-300">พนักงานขาย</th>
                                <th className="px-1 py-1 border border-gray-300">หมายเหตุ</th>
                                <th className="px-1 py-1 border border-gray-300">วันที่ตรวจสอบ</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px]">
                            {logReport?.reportSumary?.length > 0 ? (
                                logReport.reportSumary.map((item, index) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{index + 1}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{formatDate(item.dateInvoice)}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center"> {item.whitePaper == null ? '✕' : '✓'}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{item.sh_running}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{item.mem_code}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-right">{item.total}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-right">{item.discount  }</td>
                                        <td className="border border-gray-300 px-1 py-1 text-right">{item.total}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-right">{item.vat}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-right">{item.sh_sumprice}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-left">{item.emp_code_sale}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-left">{item.sh_running}</td>
                                        <td className="border border-gray-300 px-1 py-1 text-center">{formatDate(item.whitePaper?.latestScan_timeW || "-")}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={14} className="text-center py-2 text-gray-500">ไม่มีข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <p className="text-base font-bold text-center mt-5">รายการใบสั่งจอง ใบขาว</p>
                <div className="mt-5 w-full flex justify-center">
                    <table className="w-full border-collapse">
                        <thead className=" font-bold text-center border border-gray-300 text-[10px]">
                            <tr>
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
                            </tr>
                        </thead>
                        <tbody className="text-[10px]">
                            {hasWhitePaper ?
                                (logReport?.reportSumary
                                    .filter(item => item.whitePaper != null)
                                    .map((item, index) => (
                                        <tr key={index} >
                                            <td className="border border-gray-300 px-1 py-1 text-center">{index + 1}</td>
                                            <td className="border border-gray-300 px-1 py-1 text-center">{formatDate(item.dateInvoice)}</td>
                                            <td className="border border-gray-300 px-1 py-1 text-center">{formatDate(item.whitePaper?.latestScan_timeW || "-")}</td>
                                            <td className="border border-gray-300 px-1 py-1 text-center">{item.whitePaper?.mem_code}</td>
                                            <td className="border border-gray-300 px-1 py-1 text-left">{item.whitePaper?.sh_running}</td>
                                            <td className="border border-gray-300 px-1 py-1 text-center">{item.yellowPaper == null ? "???" : ""}</td>
                                            {item.yellowPaper != null ? (
                                                <>
                                                    <td className="border border-gray-300 px-1 py-1 text-left">{item.yellowPaper?.invoice_code}</td>
                                                    <td className="border border-gray-300 px-1 py-1 text-left">{item.yellowPaper?.mem_code}</td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center">{formatDate(item.dateInvoice)}</td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center">{formatDate(item.yellowPaper?.latestScan_timeW || "-")}</td>
                                                </>
                                            ) : (
                                                <td className="border border-gray-300 px-1 py-1 text-center font-bold" colSpan={4}>
                                                    ไม่มีการยันบิล
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="text-center py-2 text-sm text-gray-500">
                                            ไม่มีข้อมูล
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FormatLogReport;