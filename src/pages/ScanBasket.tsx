import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FEATURE_FLAG_MODULE = "basket-scan";

interface ExpectedItem {
  ticket_id: number; // OPHMBC-249: ระบุสติ๊กเกอร์ที่พิมพ์จริง 1 ใบ — reprint = ticket_id ใหม่เสมอ
  type: string; // 'ตะกร้า' | 'ลัง'
  floor: number;
  count: number;
  scanned: boolean; // มาจาก backend (basket_scan_log จริง) — คงอยู่แม้รีเฟรชหน้า
}

interface CategoryTally {
  key: string;
  label: string;
  sublabel: string;
  expected: number;
  scanned: number;
  colorClass: string;
}

interface ScanState {
  mem_code: string;
  mem_name: string;
  route_name: string;
  items: Map<number, ExpectedItem>; // key: ticket_id
}

const CATEGORY_COLORS: Record<string, string> = {
  "ตะกร้า-2": "bg-amber-400",
  "ตะกร้า-3": "bg-blue-500",
  "ตะกร้า-4": "bg-red-500",
  "ตะกร้า-5": "bg-emerald-500",
  ลัง: "bg-purple-500",
};

const ScanBasket = () => {
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [lastScannedKey, setLastScannedKey] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const anchorTicketIdRef = useRef<number | null>(null);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [featureFlag, setFeatureFlag] = useState<boolean | null>(null);
  const [featureFlagMsg, setFeatureFlagMsg] = useState<string>("");
  const [featureFlagLoading, setFeatureFlagLoading] = useState(false);

  const token = sessionStorage.getItem("access_token");
  const userInfoRaw = sessionStorage.getItem("user_info");
  const scannerName = userInfoRaw ? JSON.parse(userInfoRaw)?.nickname : null;
  const canManageFlag = userInfoRaw
    ? JSON.parse(userInfoRaw)?.manage_product === "Yes"
    : false;

  useEffect(() => {
    qrRef.current?.focus();
  }, []);

  // OPHMBC-249: kill switch เผื่อ load เกิน — เช็คทุกครั้งที่เปิดหน้า ถ้าปิดอยู่ backend
  // จะปฏิเสธทุก request อยู่แล้ว แต่เช็คฝั่งนี้ด้วยเพื่อโชว์ข้อความให้ผู้ใช้ชัดเจน
  const checkFeatureFlag = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/feature-flag/check/${FEATURE_FLAG_MODULE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeatureFlag(res.data?.status !== false);
      setFeatureFlagMsg(res.data?.msg || "");
    } catch {
      setFeatureFlag(true);
    }
  };

  useEffect(() => {
    void checkFeatureFlag();
  }, []);

  const toggleFeatureFlag = async () => {
    const newStatus = !featureFlag;
    const action = newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน";
    const result = await Swal.fire({
      title: `${action}ฟีเจอร์สแกนนับตะกร้า`,
      text: "การดำเนินการนี้จะส่งผลต่อการใช้งานของทุกเครื่องที่ใช้ฟีเจอร์นี้",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: newStatus ? "#10b981" : "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `ยืนยัน${action}`,
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setFeatureFlagLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/feature-flag/send`,
        {
          module: FEATURE_FLAG_MODULE,
          status: newStatus,
          msg: newStatus ? "" : "ปิดชั่วคราวเนื่องจาก load สูง",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeatureFlag(newStatus);
      setFeatureFlagMsg(newStatus ? "" : "ปิดชั่วคราวเนื่องจาก load สูง");
    } catch {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถปรับสถานะได้ กรุณาลองใหม่",
        icon: "error",
      });
    } finally {
      setFeatureFlagLoading(false);
    }
  };

  // OPHMBC-249: ระหว่างสแกน อาจมีตะกร้าใหม่ถูกพิมพ์เพิ่มจากชั้นอื่นเรื่อยๆ — ใช้ socket
  // เดียวกับหน้า /print-sticker (broadcast ทุกครั้งที่มีการพิมพ์ ticket ใหม่) เพื่อรีเฟรช
  // รายการที่คาดหวังให้ทันโดยไม่ต้องรอให้ผู้ใช้สแกนใบถัดไปก่อน
  useEffect(() => {
    const socket = io(`${import.meta.env.VITE_API_URL_ORDER}/socket/picking/ticket`, {
      path: "/socket/picking",
      extraHeaders: { Authorization: `Bearer ${token}` },
    });

    // OPHMBC-249: broadcast นี้ยิงทุกครั้งที่มีการพิมพ์ ticket ที่ไหนก็ได้ในระบบ (ไม่ scope
    // ตาม mem_code) ช่วงคลังยุ่งๆ อาจยิงถี่มาก — debounce กันยิง GET ซ้ำรัวๆ โดยไม่จำเป็น
    socket.on("ticket:get", () => {
      if (anchorTicketIdRef.current === null) return;
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        if (anchorTicketIdRef.current !== null) {
          fetchExpected(anchorTicketIdRef.current).catch(() => {
            // เงียบไว้ — เป็นแค่การรีเฟรชพื้นหลัง ไม่ต้องรบกวนผู้ใช้ถ้าล้มเหลวชั่วคราว
          });
        }
      }, 800);
    });

    return () => {
      socket.disconnect();
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseQr = (raw: string) => {
    const parts = raw.trim().split("|");
    if (parts.length !== 5) return null;
    const [prefix, mem_code, floor_str, count_str, ticket_id_str] = parts;
    if (prefix !== "WPK" && prefix !== "WPL") return null;
    const floor = parseInt(floor_str);
    const count = parseInt(count_str);
    const ticket_id = parseInt(ticket_id_str);
    if (!mem_code || isNaN(floor) || isNaN(count) || isNaN(ticket_id)) return null;
    return {
      type: prefix === "WPK" ? "ตะกร้า" : "ลัง",
      mem_code,
      floor,
      count,
      ticket_id,
    };
  };

  // OPHMBC-249: ดึงยอดล่าสุดจาก backend เสมอหลังสแกน (scanned มาจาก basket_scan_log จริง
  // ผูกกับ ticket_id ตรงๆ) เพื่อให้รีเฟรชหน้าแล้วเห็นความคืบหน้าเดิม ไม่รีเซ็ตกลับเป็น 0
  const fetchExpected = async (ticket_id: number) => {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL_ORDER}/api/basket-scan/expected`,
      {
        params: { ticket_id },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = res.data as {
      mem_code: string;
      mem_name: string;
      route_name: string;
      items: ExpectedItem[];
    };
    const items = new Map<number, ExpectedItem>();
    data.items.forEach((it) => items.set(it.ticket_id, it));
    anchorTicketIdRef.current = ticket_id;
    setScanState({
      mem_code: data.mem_code,
      mem_name: data.mem_name,
      route_name: data.route_name,
      items,
    });
  };

  const saveLog = async (parsed: {
    mem_code: string;
    type: string;
    floor: number;
    count: number;
    ticket_id: number;
  }) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/basket-scan/log`,
        parsed,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "บันทึกไม่สำเร็จ กรุณาลองใหม่";
      toast.warning(message);
      return false;
    }
  };

  const handleFirstScan = async (raw: string) => {
    const parsed = parseQr(raw);
    if (!parsed) {
      toast.error(`QR ไม่ถูกต้อง — ได้รับ: "${raw}"`);
      setQrInput("");
      return;
    }

    try {
      await saveLog(parsed);
      await fetchExpected(parsed.ticket_id);
      setLastScannedKey(parsed.ticket_id);
    } catch {
      toast.error("ไม่พบข้อมูลสติ๊กเกอร์ใบนี้");
    }

    setQrInput("");
  };

  const handleNextScan = async (raw: string) => {
    if (!scanState) return;
    const parsed = parseQr(raw);
    if (!parsed) {
      toast.error(`QR ไม่ถูกต้อง — ได้รับ: "${raw}"`);
      setQrInput("");
      return;
    }

    if (parsed.mem_code !== scanState.mem_code) {
      setErrorMsg(`สติ๊กเกอร์นี้เป็นของร้าน ${parsed.mem_code} ไม่ใช่ร้านนี้`);
      setTimeout(() => setErrorMsg(null), 3000);
      setQrInput("");
      return;
    }

    const expectedItem = scanState.items.get(parsed.ticket_id);
    if (!expectedItem) {
      setErrorMsg(`ไม่พบในรายการ (${parsed.type} F${parsed.floor} ที่ ${parsed.count})`);
      setTimeout(() => setErrorMsg(null), 3000);
      setQrInput("");
      return;
    }

    setErrorMsg(null);
    const saved = await saveLog(parsed);
    if (saved) {
      setLastScannedKey(parsed.ticket_id);
      await fetchExpected(parsed.ticket_id);
    }

    setQrInput("");
  };

  const handleReset = () => {
    anchorTicketIdRef.current = null;
    setScanState(null);
    setQrInput("");
    setLastScannedKey(null);
    setErrorMsg(null);
    setTimeout(() => qrRef.current?.focus(), 50);
  };

  const categories: CategoryTally[] = [];
  if (scanState) {
    const byCategory = new Map<string, CategoryTally>();
    for (const item of scanState.items.values()) {
      const catKey = item.type === "ตะกร้า" ? `ตะกร้า-${item.floor}` : "ลัง";
      const label = item.type === "ตะกร้า" ? `ชั้น ${item.floor}` : "ลัง";
      const existing = byCategory.get(catKey);
      if (existing) {
        existing.expected += 1;
        existing.scanned += item.scanned ? 1 : 0;
      } else {
        byCategory.set(catKey, {
          key: catKey,
          label,
          sublabel: "",
          expected: 1,
          scanned: item.scanned ? 1 : 0,
          colorClass: CATEGORY_COLORS[catKey] ?? "bg-slate-500",
        });
      }
    }
    categories.push(
      ...Array.from(byCategory.values())
        .map((c) => ({ ...c, sublabel: `${c.expected} ${c.key === "ลัง" ? "ลัง" : "ตะกร้า"}` }))
        .sort((a, b) => (a.key === "ลัง" ? 1 : b.key === "ลัง" ? -1 : a.key.localeCompare(b.key)))
    );
  }

  const lastScannedCategoryKey =
    scanState && lastScannedKey
      ? (() => {
          const item = scanState.items.get(lastScannedKey);
          if (!item) return null;
          return item.type === "ตะกร้า" ? `ตะกร้า-${item.floor}` : "ลัง";
        })()
      : null;

  const totalExpected = categories.reduce((s, c) => s + c.expected, 0);
  const totalScanned = categories.reduce((s, c) => s + c.scanned, 0);
  const allComplete = categories.length > 0 && categories.every((c) => c.scanned >= c.expected);

  if (featureFlag === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-sky-100 via-blue-100 to-blue-200 text-center">
        <span className="text-4xl">🚧</span>
        <p className="text-xl font-bold text-red-700">ฟีเจอร์สแกนนับตะกร้าถูกปิดใช้งานชั่วคราว</p>
        {featureFlagMsg && <p className="text-red-600">หมายเหตุ: {featureFlagMsg}</p>}
        {canManageFlag && (
          <button
            onClick={toggleFeatureFlag}
            disabled={featureFlagLoading}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border bg-red-50 border-red-300 text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <div className="w-2 h-2 rounded-full bg-red-500" />
            {featureFlagLoading ? "กำลังปรับปรุง..." : "เปิดใช้งานอีกครั้ง"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      onClick={() => qrRef.current?.focus()}
    >
      <ToastContainer position="top-center" autoClose={2500} />

      <input
        ref={qrRef}
        inputMode="none"
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        value={qrInput}
        onChange={(e) => setQrInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && qrInput.trim()) {
            if (!scanState) {
              void handleFirstScan(qrInput);
            } else {
              void handleNextScan(qrInput);
            }
          }
        }}
      />

      {!scanState ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-100 via-blue-100 to-blue-200">
          {canManageFlag && featureFlag !== null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void toggleFeatureFlag();
              }}
              disabled={featureFlagLoading}
              className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border shadow-sm transition-colors disabled:opacity-50 ${
                featureFlag
                  ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                  : "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${featureFlag ? "bg-green-500" : "bg-red-500"}`} />
              {featureFlagLoading ? "กำลังปรับปรุง..." : featureFlag ? "เปิดใช้งาน" : "ปิดใช้งาน"}
            </button>
          )}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center shadow-lg mb-2">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-blue-800 tracking-wide">สแกนนับตะกร้า</h1>
            <p className="text-blue-500 text-base text-center">
              สแกน QR บนสติ๊กเกอร์ตะกร้าหรือลังใบแรก<br />เพื่อเริ่มนับ
            </p>
          </div>
          <div className="w-full max-w-sm bg-white border border-blue-200 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-md">
            <div className="flex gap-1 items-center">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-blue-600 font-medium">พร้อมรับการสแกน</p>
          </div>
        </div>
      ) : (
        <div className="max-w-sm mx-auto min-h-screen bg-gray-50 pb-6">
          {/* Header เข้ม */}
          <div className="bg-slate-900 text-white px-5 pt-5 pb-6 rounded-b-3xl">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-slate-300 text-sm mb-4"
            >
              <span>←</span> กลับหน้าสแกน
            </button>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-cyan-400 text-xs font-medium mb-1">ข้อมูลร้าน</p>
                <p className="text-xl font-bold leading-tight">{scanState.mem_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded">
                    {scanState.mem_code}
                  </span>
                  {scanState.route_name && (
                    <span className="text-slate-400 text-xs">• {scanState.route_name}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-xl bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-2 12h2a2 2 0 002-2v-2" />
                  </svg>
                </div>
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {totalScanned <= 1 ? "สแกนครั้งแรก" : "กำลังสแกน"}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 -mt-3">
            {/* การ์ดข้อมูลเสริม */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-2xl p-3 shadow flex items-center gap-2">
                <span className="text-lg">🧭</span>
                <div>
                  <p className="text-[11px] text-gray-400">เส้นทาง</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {scanState.route_name || "-"}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow flex items-center gap-2">
                <span className="text-lg">👤</span>
                <div>
                  <p className="text-[11px] text-gray-400">ผู้สแกน</p>
                  <p className="text-sm font-semibold text-gray-800">{scannerName || "-"}</p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-2xl px-4 py-3 bg-red-500 text-white shadow mb-4 flex items-center gap-2 animate-pulse">
                <span className="text-xl shrink-0">❌</span>
                <p className="text-sm font-semibold">{errorMsg}</p>
              </div>
            )}

            {/* หัวข้อ */}
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-gray-800 font-bold">ตะกร้าตามชั้น/ลัง</p>
                <p className="text-xs text-gray-400">
                  {categories.length} รายการ · รวม {totalScanned}/{totalExpected} ชิ้น
                </p>
              </div>
              {allComplete && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  ✓ รวมครบทุกชั้น
                </span>
              )}
            </div>

            {/* รายการต่อชั้น/ลัง */}
            <div className="flex flex-col gap-3 mb-6">
              {categories.map((c) => {
                const isDone = c.scanned >= c.expected;
                return (
                  <div
                    key={c.key}
                    className={`flex items-center justify-between bg-white rounded-2xl p-4 shadow border transition-all duration-300 ${
                      c.key === lastScannedCategoryKey
                        ? "border-blue-300 ring-2 ring-blue-100"
                        : isDone
                        ? "border-emerald-200"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl ${c.colorClass} flex items-center justify-center text-white`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M21 8l-9-5-9 5 9 5 9-5zm0 0v8l-9 5m0-8L3 8m9 5v8" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{c.label}</p>
                        <p className="text-xs text-gray-400">{c.sublabel}</p>
                      </div>
                    </div>
                    <p className={`text-2xl font-bold ${isDone ? "text-emerald-500" : "text-gray-700"}`}>
                      {c.scanned}
                      <span className="text-sm text-gray-300">/{c.expected}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            {!allComplete ? (
              <div className="bg-white border border-blue-200 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-md mb-3">
                <div className="flex gap-1 items-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-blue-600 text-sm font-medium">พร้อมรับการสแกนใบถัดไป</p>
              </div>
            ) : (
              <button
                onClick={handleReset}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-2xl py-4 text-base shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                ✓ เสร็จสิ้น · รวมครบทุกชั้น
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanBasket;
