// คำอธิบาย "ระงับก่อนออกรถ" ของชุดเส้นทางแบบเข้าใจง่าย: เส้นเวลา 1 ภาพ + กฎ 3 ข้อ + รายละเอียดที่พับไว้
// ต้องตรงกับ logic ฝั่ง backend (order-block.service.ts isDepartureBlocked / route-batch departure-cutoff.ts)
// ถ้าแก้กฎต้องแก้ข้อความที่นี่ด้วย

const EXAMPLE = {
    departure: "11:45",
    minutes: 30,
    blockFrom: "11:15",
    endTime: "14:00",
};

const RouteBatchBlockGuide = () => {
    const { departure, minutes, blockFrom, endTime } = EXAMPLE;

    return (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <span className="font-semibold text-gray-800">ระงับก่อนออกรถ ทำงานยังไง?</span>
                <span className="text-gray-500">
                    ตัวอย่าง: ออกรถ {departure} · ระงับก่อน {minutes} นาที
                </span>
            </div>

            {/* เส้นเวลา: จัดได้ → ระงับ → จัดได้ */}
            <div className="flex h-9 overflow-hidden rounded-md text-xs font-semibold">
                <div className="flex flex-[3] items-center justify-center bg-green-100 text-green-800">จัดได้</div>
                <div className="flex flex-[4] items-center justify-center bg-red-500 text-white">ระงับการจัด</div>
                <div className="flex flex-[3] items-center justify-center bg-green-100 text-green-800">จัดได้</div>
            </div>
            <div className="relative mt-1 h-10 text-xs text-gray-600">
                <div className="absolute left-[30%] -translate-x-1/2 text-center">
                    <div className="font-bold text-gray-800">{blockFrom}</div>
                    <div>
                        เริ่มระงับ ({departure} − {minutes} นาที)
                    </div>
                </div>
                <div className="absolute left-[70%] -translate-x-1/2 text-center">
                    <div className="font-bold text-gray-800">{endTime}</div>
                    <div>เวลาสิ้นสุด (เปิดเสมอ)</div>
                </div>
            </div>

            <ol className="mt-3 space-y-1 text-gray-700">
                <li>
                    <b>①</b> ระงับ<b>เฉพาะเส้นทางที่ติ๊ก</b>ในชุดนั้น
                </li>
                <li>
                    <b>②</b> มีผลเฉพาะวันที่<b>เปิด "ระงับการจัดออเดอร์อัตโนมัติ"</b> (ด้านล่างของหน้านี้) — เวลาสิ้นสุดเอามาจากตรงนั้น
                </li>
                <li>
                    <b>③</b> ร้านด่วน · ร้านที่กำลังจัดค้าง · เส้นทาง bypass <b>ยังจัดได้</b>
                </li>
            </ol>

            <details className="mt-3">
                <summary className="cursor-pointer select-none text-blue-700">รายละเอียดเพิ่มเติม</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600">
                    <li>ยอดรอ QC ลดถึง min หรือยอดเหลือจัดสะสมถึง max → เปิดจัดได้ก่อนเวลาสิ้นสุด</li>
                    <li>
                        ถึงเวลาสิ้นสุด โหมดเปิดทีละชุดจะ<b>กลับเป็นโหมดปกติเอง</b> และหลังจากนั้นจะไม่สลับเข้าโหมดเปิดทีละชุดเองตามยอด max
                    </li>
                    <li>
                        ถ้าเวลาเริ่มระงับเลยเวลาสิ้นสุด (เช่น ออกรถ 22:00 ระงับก่อน 30 = 21:30 แต่สิ้นสุด {endTime}) → วันนั้นไม่ระงับ
                    </li>
                    <li>ถ้าการ์ดขึ้น "ฟีเจอร์ระงับก่อนออกรถถูกปิดอยู่" = ผู้ดูแลระบบปิดไว้ชั่วคราว ตั้งค่าไว้ได้แต่จะไม่ระงับ</li>
                </ul>
            </details>
        </div>
    );
};

export default RouteBatchBlockGuide;
