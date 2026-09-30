import { PauseCircle, RefreshCw } from "lucide-react";
import Clock from "./Clock";

interface FeatureSuspendedScreenProps {
  msg: string | null;
}

const FeatureSuspendedScreen = ({ msg }: FeatureSuspendedScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white/95 shadow-2xl ring-1 ring-black/5 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />

        <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <span className="absolute inset-0 rounded-full bg-red-400/40 animate-ping" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-100">
              <PauseCircle className="h-14 w-14 text-red-600" strokeWidth={1.75} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            ระงับการจัดออเดอร์ชั่วคราว
          </h1>
          <p className="mt-2 text-slate-500">
            ระบบโดนสั่งระงับการใช้งาน กรุณารอจนกว่าระบบจะเปิดอีกครั้ง
          </p>

          <div className="mt-6 w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              หมายเหตุ
            </p>
            <p className="mt-1 text-lg font-medium text-amber-900 break-words">
              {msg?.trim() || "ไม่มีหมายเหตุ"}
            </p>
          </div>

          <div className="mt-6 inline-flex items-center rounded-full bg-slate-800 px-5 py-2 text-lg font-semibold tabular-nums">
            <Clock />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin [animation-duration:3s]" />
          หน้าจอจะกลับมาใช้งานได้เองเมื่อระบบเปิด ไม่ต้องรีเฟรช
        </div>
      </div>
    </div>
  );
};

export default FeatureSuspendedScreen;
