import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface MemberInfo {
  mem_code: string;
  mem_name: string;
  route_code: string;
}

interface SoStatus {
  sh_running: string;
  found: boolean;
}

interface ScanState {
  mem_code: string;
  box_no: number;
  total_boxes: number;
  all_sh_running: string[];
  soList: SoStatus[];
  memberInfo: MemberInfo | null;
}

const ScanBox = () => {
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [billInput, setBillInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [errorSO, setErrorSO] = useState<string | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const billRef = useRef<HTMLInputElement>(null);

  const token = sessionStorage.getItem("access_token");
  const allFound = scanState?.soList.every((s) => s.found) ?? false;
  const foundCount = scanState?.soList.filter((s) => s.found).length ?? 0;
  const totalCount = scanState?.soList.length ?? 0;

  useEffect(() => {
    qrRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scanState && !allFound) {
      billRef.current?.focus();
    }
  }, [scanState, allFound]);

  const handleQrScan = async (raw: string) => {
    const parts = raw.trim().split("|");
    if (parts.length !== 5 || parts[0] !== "WP") {
      toast.error(`QR ไม่ถูกต้อง — ได้รับ: "${raw}" (${parts.length} ส่วน)`);
      setQrInput("");
      return;
    }

    const [, mem_code, sh_running_raw, box_no_str, total_boxes_str] = parts;
    const box_no = parseInt(box_no_str);
    const total_boxes = parseInt(total_boxes_str);
    const all_sh_running = sh_running_raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/box-scan/member-info`,
        {
          params: { mem_code },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setScanState({
        mem_code,
        box_no,
        total_boxes,
        all_sh_running,
        soList: all_sh_running.map((sh) => ({ sh_running: sh, found: false })),
        memberInfo: res.data,
      });
    } catch {
      toast.error("ไม่พบข้อมูลสมาชิก");
    }

    setQrInput("");
  };

  const handleBillScan = async (raw: string) => {
    if (!scanState) return;

    const scanned = raw.trim();
    const match = scanState.soList.find((s) => s.sh_running === scanned);

    if (!match) {
      setErrorSO(scanned);
      setTimeout(() => setErrorSO(null), 3000);
      setBillInput("");
      return;
    }

    if (match.found) {
      toast.warning(`เลข SO ${scanned} สแกนไปแล้ว`);
      setBillInput("");
      return;
    }

    setErrorSO(null);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/box-scan/log`,
        {
          mem_code: scanState.mem_code,
          sh_running: scanned,
          all_sh_running: scanState.all_sh_running.join(","),
          box_no: scanState.box_no,
          total_boxes: scanState.total_boxes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLastScanned(scanned);
      setScanState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          soList: prev.soList.map((s) =>
            s.sh_running === scanned ? { ...s, found: true } : s
          ),
        };
      });
    } catch {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }

    setBillInput("");
  };

  const handleReset = () => {
    setScanState(null);
    setQrInput("");
    setBillInput("");
    setLastScanned(null);
    setErrorSO(null);
    setTimeout(() => qrRef.current?.focus(), 50);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-blue-200 flex flex-col items-center justify-center p-4"
      onClick={() => {
        if (!scanState) qrRef.current?.focus();
        else if (!allFound) billRef.current?.focus();
      }}
    >
      <ToastContainer position="top-center" autoClose={2500} />

      {/* Hidden inputs */}
      <input
        ref={qrRef}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        value={qrInput}
        onChange={(e) => setQrInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && qrInput.trim()) handleQrScan(qrInput);
        }}
      />
      <input
        ref={billRef}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        value={billInput}
        onChange={(e) => setBillInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && billInput.trim()) handleBillScan(billInput);
        }}
      />

      {/* Phase 1: รอสแกน QR */}
      {!scanState && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-lg mb-2">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-blue-800 tracking-wide">สแกนสติกเกอร์บนลัง</h1>
            <p className="text-blue-500 text-base text-center">นำเครื่องสแกนไปสแกน QR Code<br />บนสติกเกอร์ที่ติดอยู่บนลัง</p>
          </div>

          <div className="w-full bg-white border border-blue-200 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-md">
            <div className="flex gap-1 items-center">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-blue-600 font-medium">พร้อมรับการสแกน</p>
          </div>
        </div>
      )}

      {/* Phase 2 & 3: แสดงข้อมูล */}
      {scanState && (
        <div className="w-full max-w-sm flex flex-col gap-4">

          {/* Status Banner */}
          <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg ${
            allFound
              ? "bg-emerald-500 text-white"
              : "bg-amber-400 text-amber-900"
          }`}>
            <span className="text-2xl">{allFound ? "✅" : "🔍"}</span>
            <div>
              <p className="font-bold text-lg leading-tight">
                {allFound ? "พบบิลครบแล้ว!" : "กำลังค้นหาบิล..."}
              </p>
              <p className="text-sm opacity-80">
                {allFound ? "ใส่บิลลงในลังได้เลย" : `พบแล้ว ${foundCount} / ${totalCount} ใบ`}
              </p>
            </div>
          </div>

          {/* ข้อมูลลูกค้า */}
          <div className="bg-white border border-blue-100 rounded-2xl p-4 flex flex-col gap-2 shadow-md">
            <p className="text-blue-900 font-bold text-lg leading-tight">
              {scanState.memberInfo?.mem_name ?? scanState.mem_code}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-blue-500">
              <span>รหัส: {scanState.mem_code}</span>
              {scanState.memberInfo?.route_code && (
                <span>เส้นทาง: {scanState.memberInfo.route_code}</span>
              )}
              <span>ลังที่ {scanState.box_no} / {scanState.total_boxes}</span>
            </div>
          </div>

          {/* Error Banner */}
          {errorSO && (
            <div className="rounded-2xl px-5 py-4 bg-red-500 text-white shadow-lg flex items-center gap-3 animate-pulse">
              <span className="text-3xl shrink-0">❌</span>
              <div>
                <p className="font-bold text-base leading-tight">เลข SO ไม่ตรง!</p>
                <p className="text-sm font-mono opacity-90 mt-0.5">{errorSO}</p>
                <p className="text-xs opacity-75 mt-0.5">ไม่พบในรายการของลังนี้</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="bg-blue-100 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allFound ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: totalCount > 0 ? `${(foundCount / totalCount) * 100}%` : "0%" }}
            />
          </div>

          {/* รายการ SO */}
          <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-md flex flex-col gap-2">
            <p className="text-blue-800 font-semibold mb-1">รายการ SO</p>
            {scanState.soList.map((s) => (
              <div
                key={s.sh_running}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 transition-all duration-300 ${
                  s.found
                    ? "bg-emerald-50 border border-emerald-300"
                    : s.sh_running === lastScanned
                    ? "bg-blue-50 border border-blue-300"
                    : "bg-blue-50/50 border border-blue-100"
                }`}
              >
                <span className={`font-mono text-sm font-medium ${s.found ? "text-emerald-700" : "text-blue-700"}`}>
                  {s.sh_running}
                </span>
                <span className={`text-lg font-bold ${s.found ? "text-emerald-500" : "text-blue-200"}`}>
                  {s.found ? "✓" : "○"}
                </span>
              </div>
            ))}
          </div>

          {/* Status scan */}
          {!allFound ? (
            <div className="bg-white border border-blue-200 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-md">
              <div className="flex gap-1 items-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-blue-600 text-sm font-medium">พร้อมรับการสแกน Barcode บิล</p>
            </div>
          ) : (
            <button
              onClick={handleReset}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold rounded-2xl py-4 text-lg shadow-lg transition-all duration-200"
            >
              สแกนลังถัดไป
            </button>
          )}

          <button
            onClick={handleReset}
            className="text-blue-400 text-sm text-center underline underline-offset-2 hover:text-blue-600 transition"
          >
            ยกเลิก / สแกนใหม่
          </button>
        </div>
      )}
    </div>
  );
};

export default ScanBox;
