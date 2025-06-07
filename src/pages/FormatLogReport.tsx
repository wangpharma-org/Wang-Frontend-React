import { useEffect, useState, useMemo } from "react";
import axios from "axios";

interface ReportItem {
    report_id: number;
    sh_running: string;
    sh_datetime: Date;
    mem_code: string;
    mem_name: string;
    emp_code: string;
    emp_name: string;
    route_code: string;
    route_name: string;
    sh_sumprice: number;
}

interface GroupedReportItem {
    emp_code: string;
    emp_name: string;
    total_sh_sumprice: number;
}
const FormatLogReport = () => {
    const [logReport, setLogReport] = useState<ReportItem[]>();



    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL_VERIFY_ORDER}/api/dailyreport`)
                console.log(response.data)
                const ReportData = response.data.data
                setLogReport(ReportData)

            }
            catch (error) {
                console.log(error)
            }
        }
        fetchData();
    }, [])

    useEffect(() => {
        if (logReport) {
            console.log("logReport", logReport);
            JSON.stringify(logReport);
            console.log("typeof response.data.sh_sumprice", typeof  (logReport[0].sh_sumprice))
        }
    }, [logReport])

    const groupedReports = useMemo(() => {
        const groupedMap = new Map<string, GroupedReportItem>();

        logReport?.forEach(item => {
            // ใช้ emp_code เป็นคีย์ในการจัดกลุ่ม
            const key = item.emp_code;

            if (groupedMap.has(key)) {
                const existingGroup = groupedMap.get(key)!;
                existingGroup.total_sh_sumprice += Number(item.sh_sumprice);
                console.log(typeof existingGroup.total_sh_sumprice); // ควรเป็น 'number'
            } else {
                groupedMap.set(key, {
                    emp_code: item.emp_code,
                    emp_name: item.emp_name,
                    total_sh_sumprice: item.sh_sumprice,
                });

            }

        });

        // แปลง Map ให้เป็น Array เพื่อนำไป map แสดงผล
        return Array.from(groupedMap.values());
    }, [logReport]); // Dependency คือ logReport

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
                    {groupedReports.map((groupItem: GroupedReportItem, index: number) => (
                        <div key={index} className="border p-1 border-gray-300 flex justify-between">
                            <div>
                                <p className="">{groupItem.emp_name}</p>
                            </div>
                            <div>
                                <p className="">{groupItem.total_sh_sumprice}</p>
                            </div>
                        </div>
                    ))}
                    {/* <p>{logReport}</p> */}
                </div>
            </div>
            <div className="flex flex-col justify-center mt-5 text-center">
                <p className="text-lg font-bold">ตารางสรุปพื้นที่การขายสินค้าตามใบกำกับ ประจำวัน ... ที่ ... เดือน ... พ.ศ. ...</p>
                <div className="grid grid-cols-3 mt-3 text-xs font-bold">
                    {/* {logReport.map((item, index) => (
                        <div key={index} className="border p-1 border-gray-300 flex justify-between">
                            <div>
                                <p className="">{item.route_name}</p>
                            </div>
                            <div>
                                <p className="">{item.price}</p>
                            </div>
                        </div>
                    ))} */}
                </div>
            </div>
            <div className="flex flex-col justify-center mt-5 text-center">
                <p className="text-lg font-bold">ตารางสรุปฝ่ายขาย ตามใบกำกับ ประจำวัน ... ที่ ... เดือน ... พ.ศ. ...</p>
                <div className="grid grid-cols-3 mt-3 text-xs font-bold">
                    {/* {logReport.map((employee, index) => (
                        <div key={index} className="border p-2 border-gray-300 text-xs font-bold">
                            <div className="flex justify-center py-1 border-b-1 border-gray-300">
                                <p>[{employee.emp_code}]</p>
                                <p>{employee.emp_name}</p>
                            </div>
                            <div className="flex w-full mt-auto py-1 border-b-1 border-gray-300">
                                <div className="flex flex-col w-1/2">
                                    <p>ลูกค้า {employee.countMem} ราย</p>
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
                                    <p>{employee.countListOrder}</p>
                                </div>
                                <div className="flex flex-col w-1/3">
                                    <p>{employee.total_price}</p>
                                </div>
                            </div>
                        </div>
                    ))} */}
                </div>
            </div>
            {/* <div>
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
            </div> */}
        </div>
    );
}

export default FormatLogReport;