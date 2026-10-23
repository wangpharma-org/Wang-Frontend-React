import { Fragment } from "react";
import Toggle from "./Toggle";
import HelpPanel from "./HelpPanel";
import { STAGES, type Stage, type StageKey, type StageState } from "./stages";

interface PipelineCardProps {
  states: StageState;
  busy: StageKey | null;
  onToggle: (stage: Stage, next: boolean) => void;
}

const Connector = ({ left, right }: { left: boolean | null; right: boolean | null }) => {
  if (left === null || right === null) {
    return (
      <div className="hidden sm:flex flex-col items-center justify-center px-1 min-w-16">
        <div className="w-full border-t-2 border-dashed border-gray-300" />
        <span className="mt-1 text-[10px] text-gray-400">–</span>
      </div>
    );
  }
  const flowing = left && right;
  return (
    <div className="hidden sm:flex flex-col items-center justify-center px-1 min-w-16">
      <div
        className={`w-full border-t-2 ${flowing ? "border-green-500" : "border-dashed border-red-400"}`}
      />
      <span
        className={`mt-1 rounded-full px-2 text-[10px] whitespace-nowrap ${
          flowing ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
        }`}
      >
        {flowing ? "ไหลผ่าน" : "ตัดวงจร"}
      </span>
    </div>
  );
};

const PipelineCard = ({ states, busy, onToggle }: PipelineCardProps) => (
  <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
    <h2 className="text-sm font-semibold text-gray-800 mb-4">
      สายหลักทั้งระบบ — เปิด/ปิดแต่ละขั้นแยกกันได้
    </h2>
    <div className="-mt-2 mb-4">
      <HelpPanel topic="สายหลักทั้งระบบ">
        <p>
          กดสวิตช์ของสถานีเพื่อ <b>เปิด/ปิดทั้งคลัง</b> — ปิดแล้วระบบให้พิมพ์ข้อความที่จะขึ้นบนจอพนักงาน
        </p>
        <ul>
          <li><b>ปิดจัดออเดอร์</b> — หน้าจัดออเดอร์ทุกเครื่องขึ้นหน้าพักระบบ เริ่มจัดร้านใหม่ไม่ได้</li>
          <li><b>ปิด QC</b> — หน้า QC ทุกเครื่องขึ้น "ระบบโดนสั่งระงับการใช้งาน" บิลที่จัดเสร็จจะค้างรอ QC</li>
          <li>เส้น "ไหลผ่าน" = ทั้งสองฝั่งเปิด · "ตัดวงจร" = ฝั่งใดฝั่งหนึ่งปิด · ด้านบนหน้าจะขึ้นแถบเตือนสีเหลือง</li>
          <li>"ขึ้นของ" และ "จัดส่ง" อยู่ในระบบขนส่ง ยังสั่งจากหน้านี้ไม่ได้</li>
        </ul>
        <p>⚠️ มีผลกับ<b>ทุกเครื่องทันที</b> — ใช้เมื่อจำเป็นและอย่าลืมเปิดคืน</p>
      </HelpPanel>
    </div>
    {/* จอแคบ = ตาราง 2×2 ไม่มีเส้นเชื่อม, จอกว้าง = สายเรียงแถวเดียวตามดีไซน์ */}
    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch sm:gap-0">
      {STAGES.map((stage, index) => {
        const value = states[stage.key];
        const supported = stage.flag !== null;
        return (
          <Fragment key={stage.key}>
            {index > 0 && (
              <Connector left={states[STAGES[index - 1].key]} right={value} />
            )}
            <div
              data-testid={`stage-${stage.key}`}
              className={`flex-1 sm:min-w-28 rounded-xl border-2 p-3 sm:p-4 flex flex-col items-center gap-2 ${
                !supported
                  ? "border-dashed border-gray-300 bg-gray-50"
                  : value
                    ? "border-green-500 bg-white"
                    : "border-red-300 bg-red-50/40"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {stage.icon}
              </span>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">
                {stage.label}
              </span>
              <Toggle
                size="lg"
                label={`สวิตช์สถานี${stage.label}`}
                checked={!!value}
                disabled={!supported || value === null || busy !== null}
                onChange={(next) => onToggle(stage, next)}
              />
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  !supported
                    ? "bg-gray-200 text-gray-500"
                    : value
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {!supported
                  ? "เร็วๆ นี้"
                  : value === null
                    ? "กำลังโหลด..."
                    : value
                      ? "เปิดรับงาน"
                      : "ปิดอยู่"}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
    <p className="mt-3 text-xs text-gray-500">
      สถานี "ขึ้นของ" และ "จัดส่ง" อยู่ในระบบขนส่ง (logistics) — ยังสั่งเปิด/ปิดจากหน้านี้ไม่ได้
    </p>
  </section>
);

export default PipelineCard;
