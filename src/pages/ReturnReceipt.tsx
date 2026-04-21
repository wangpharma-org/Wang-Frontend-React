import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import dayjs from "dayjs";
import axios from "axios";
import {
  FiSearch,
  FiPrinter,
  FiX,
  FiPackage,
  FiCalendar,
  FiHash,
  FiSettings,
} from "react-icons/fi";
import ProductScanModal, {
  ConfirmedProduct,
  ProductScanResult,
} from "../components/ProductScanModal";
import { RETURN_RECEIPT_PRINT_KEY } from "./ReturnReceiptPrint";
import ReturnRatioConfigModal from "../components/ReturnRatioConfigModal";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface MemberData {
  mem_code: string;
  mem_name: string;
  address: string;
  emp_code_supervisor: string | null;
  emp_nickname_supervisor: string | null;
  route_code: string | null;
  route_name: string | null;
  price_option: string | null;
  debtor_type: string | null;
  payment_days: number | null;
  credit_limit: number | null;
  price_level: string | null;
}

interface ScannedProduct extends ConfirmedProduct {
  uid: string; // unique key in the list
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

interface LabeledFieldProps {
  label: string;
  children: React.ReactNode;
}

const LabeledField: React.FC<LabeledFieldProps> = ({ label, children }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
    {children}
  </div>
);

const ReadonlyField: React.FC<{ value: string | number | null | undefined; accent?: boolean }> = ({
  value,
  accent,
}) => (
  <div className="h-10 px-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center">
    <span
      className={`text-sm ${accent ? "text-blue-600 font-medium" : "text-gray-700"} ${
        !value ? "text-gray-300" : ""
      }`}
    >
      {value ?? ""}
    </span>
  </div>
);

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

const ReturnReceipt: React.FC = () => {
  const { userInfo, accessToken } = useAuth();
  const today = dayjs().format("YYYY-MM-DD");

  // Form state
  const [customerCode, setCustomerCode] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [remark, setRemark] = useState("");
  const [receiverCode, setReceiverCode] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  // Backend-loaded data
  const [nextCode, setNextCode] = useState<string>("รอระบบออกเลข");
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // รับคืน employee lookup
  const [receiverName, setReceiverName] = useState<string | null>(null);
  const [receiverLookupError, setReceiverLookupError] = useState<string | null>(null);

  const lookupReceiver = async (code: string) => {
    if (!code.trim() || !accessToken) return;
    setReceiverName(null);
    setReceiverLookupError(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/employee/${code.trim()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setReceiverName(res.data.display);
    } catch {
      setReceiverLookupError("ไม่พบพนักงาน");
    }
  };

  // Product list (items confirmed from modal)
  const [products, setProducts] = useState<ScannedProduct[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  // Printing
  const [printing, setPrinting] = useState(false);

  // Config modal
  const [configOpen, setConfigOpen] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const receiverRef = useRef<HTMLInputElement>(null);

  // ── On mount: fetch next code ──
  useEffect(() => {
    if (!accessToken) return;
    axios
      .get(`${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/next-code`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => setNextCode(res.data.code))
      .catch(() => {});
  }, [accessToken]);

  // ── Fetch member info ──
  const fetchMember = useCallback(async () => {
    if (!customerCode.trim() || !accessToken) return;
    setMemberLoading(true);
    setMemberError(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/member/${customerCode.trim()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setMemberData(res.data);
      receiverRef.current?.focus();
    } catch {
      setMemberError("ไม่พบข้อมูลลูกค้า");
      setMemberData(null);
    } finally {
      setMemberLoading(false);
    }
  }, [customerCode, accessToken]);

  // ── Scan barcode ──
  const handleBarcodeKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Enter" || !barcodeInput.trim()) return;
    if (!memberData) {
      alert("กรุณาระบุรหัสลูกค้าก่อนสแกนสินค้า");
      return;
    }
    setScanning(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/product`,
        {
          params: { barcode: barcodeInput.trim(), mem_code: memberData.mem_code },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setScanResult(res.data);
      setModalOpen(true);
    } catch {
      alert(`ไม่พบสินค้าจาก barcode: ${barcodeInput}`);
    } finally {
      setScanning(false);
      setBarcodeInput("");
      barcodeRef.current?.focus();
    }
  };

  // ── Confirm product from modal ──
  const handleModalConfirm = (result: ConfirmedProduct) => {
    const uid = `${result.product_code}-${Date.now()}`;
    setProducts((prev) => {
      // Replace if same product already in list
      const idx = prev.findIndex((p) => p.product_code === result.product_code);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...result, uid };
        return updated;
      }
      return [...prev, { ...result, uid }];
    });
    setModalOpen(false);
    barcodeRef.current?.focus();
  };

  // ── Remove product row ──
  const handleRemove = (uid: string) => {
    setProducts((prev) => prev.filter((p) => p.uid !== uid));
  };

  // ── Print / Save ──
  const handlePrint = async () => {
    if (!memberData || products.length === 0) return;
    setPrinting(true);
    try {
      const payload = {
        mem_code: memberData.mem_code,
        return_receipt_date: today,
        return_receipt_due_date: dueDate !== today ? dueDate : undefined,
        return_receipt_reason: remark || products.map((p) => p.reason).join(", "),
        emp_code_key: userInfo?.emp_code ?? "",
        emp_code_receive: receiverCode,
        items: products.map((p) => ({
          product_code: p.product_code,
          product_unit: p.product_unit ?? "",
          price_per_unit: p.price_per_unit,
          lot_items: p.lot_items.map((l) => ({
            lot_product_id: l.id,
            receive_good_qty: l.receive_good_qty,
            receive_bad_qty: l.receive_bad_qty,
            not_receive_qty: l.not_receive_qty,
          })),
        })),
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/print`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      // Open print window
      sessionStorage.setItem(
        RETURN_RECEIPT_PRINT_KEY,
        JSON.stringify({
          return_receipt_code: res.data.return_receipt_code ?? `NSORT-${Date.now()}`,
          date: today,
          dueDate,
          remark,
          member: {
            mem_code: memberData.mem_code,
            mem_name: memberData.mem_name,
            address: memberData.address,
            route_name: memberData.route_name,
            payment_days: memberData.payment_days,
          },
          products: products.map((p) => ({
            product_code: p.product_code,
            product_name: p.product_name,
            product_unit: p.product_unit,
            return_rate: p.return_rate,
            price_per_unit: p.price_per_unit,
            lot_items: p.lot_items,
            reason: p.reason,
          })),
          keyEmpDisplay: userInfo
            ? `${userInfo.nickname || userInfo.firstname || ""} (${userInfo.emp_code})`
            : "",
          receiverDisplay: receiverName || receiverCode,
        })
      );
      window.open("/return-receipt-print", "_blank");

      // Refresh next code & clear form
      const nextRes = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/next-code`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setNextCode(nextRes.data.code);
      setProducts([]);
      setMemberData(null);
      setCustomerCode("");
      setRemark("");
      setReceiverCode("");
      setReceiverName(null);
      setReceiverLookupError(null);
    } catch {
      alert("เกิดข้อผิดพลาด ไม่สามารถบันทึกได้");
    } finally {
      setPrinting(false);
    }
  };

  // ── Derived totals ──
  const computeProductTotals = (p: ScannedProduct) => {
    const totalGoodBad = p.lot_items.reduce(
      (s, l) => s + l.receive_good_qty + l.receive_bad_qty,
      0
    );
    const totalAmount = totalGoodBad * p.price_per_unit;
    const returnPrice = totalAmount * ((p.return_rate ?? 0) / 100);
    return { totalGoodBad, totalAmount, returnPrice };
  };

  const grandTotalAmount = products.reduce(
    (s, p) => s + computeProductTotals(p).totalAmount,
    0
  );
  const grandReturnPrice = products.reduce(
    (s, p) => s + computeProductTotals(p).returnPrice,
    0
  );

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-500 rounded-xl shadow-sm shadow-blue-200">
            <FiPackage className="text-white text-lg" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-800 leading-tight">
              รับของคืนจากลูกค้า
            </h1>
            <p className="text-xs text-gray-400">
              Scan รายการสินค้ารับคืนจากลูกค้า
            </p>
          </div>
          <button
            onClick={() => setConfigOpen(true)}
            className="flex items-center gap-2 h-9 px-4 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
          >
            <FiSettings className="text-base" />
            ตั้งค่าอัตราการรับคืน
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
        {/* ── Form Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {/* ─ Column 1 ─ */}
            <div className="p-6 space-y-4">
              <LabeledField label="วันที่">
                <div className="h-10 flex items-center gap-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
                  <FiCalendar className="text-gray-400 text-sm flex-shrink-0" />
                  <span className="text-sm text-gray-700 font-medium">
                    {today}
                  </span>
                </div>
              </LabeledField>

              <LabeledField label="เลขที่ใบรับคืน">
                <div className="h-10 flex items-center gap-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
                  <FiHash className="text-gray-400 text-sm flex-shrink-0" />
                  <span className="text-base font-bold text-blue-600 tracking-wide">
                    {nextCode}
                  </span>
                </div>
              </LabeledField>

              <LabeledField label="รหัสลูกค้า">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchMember()}
                      placeholder="ระบุรหัสลูกค้า"
                      className="w-full h-10 px-3 pr-8 text-base font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"
                    />
                    {customerCode && (
                      <button
                        onClick={() => {
                          setCustomerCode("");
                          setMemberData(null);
                          setMemberError(null);
                          setProducts([]);
                          setReceiverCode("");
                          setReceiverName(null);
                          setReceiverLookupError(null);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                        tabIndex={-1}
                      >
                        <FiX className="text-sm" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={fetchMember}
                    disabled={memberLoading}
                    className="h-10 px-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >
                    {memberLoading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiSearch />
                    )}
                  </button>
                </div>
                {memberError && (
                  <p className="mt-1 text-xs text-red-500">{memberError}</p>
                )}
              </LabeledField>

              <LabeledField label="บัญชีแยกประเภท">
                <ReadonlyField value={memberData?.debtor_type} />
              </LabeledField>

              <LabeledField label="วันที่ครบกำหนด">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"
                />
              </LabeledField>
            </div>

            {/* ─ Column 2 ─ */}
            <div className="p-6 space-y-4">
              <LabeledField label="นามลูกค้า">
                <ReadonlyField value={memberData?.mem_name ?? null} />
              </LabeledField>

              <LabeledField label="ที่อยู่">
                <div className="px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 min-h-[40px] flex items-start">
                  <span
                    className={`text-sm ${
                      memberData?.address ? "text-gray-700" : "text-gray-300"
                    } whitespace-pre-wrap`}
                  >
                    {memberData?.address.replace(/&nbsp;/g, "").trim() || ""}
                  </span>
                </div>
              </LabeledField>

              <LabeledField label="หมายเหตุ / เหตุผลการคืน">
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="หมายเหตุ (ถ้ามี)"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition"
                />
              </LabeledField>

              <LabeledField label="พนักงาน">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">ดูแล</p>
                    <div className="h-10 px-3 flex items-center bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-sm text-gray-600 truncate">
                        {memberData?.emp_nickname_supervisor || memberData?.emp_code_supervisor || ""}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">คีย์</p>
                    <div className="h-10 px-3 flex items-center bg-blue-50 rounded-xl border border-blue-100">
                      <span className="text-sm text-blue-700 font-semibold truncate">
                        {userInfo
                          ? `${userInfo.nickname || userInfo.firstname || ""} (${userInfo.emp_code})`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">พนักงานที่รับสินค้ามา</p>
                  {receiverName ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-10 px-3 flex items-center bg-blue-50 rounded-xl border border-blue-100">
                        <span className="text-sm text-blue-700 font-semibold truncate">
                          {receiverName}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setReceiverName(null);
                          setReceiverLookupError(null);
                          setReceiverCode("");
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                        title="แก้ไข"
                      >
                        <FiX className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={receiverRef}
                        type="text"
                        value={receiverCode}
                        onChange={(e) => {
                          setReceiverCode(e.target.value);
                          setReceiverLookupError(null);
                        }}
                        onBlur={(e) => lookupReceiver(e.target.value)}
                        onKeyDown={async (e) => { if (e.key === "Enter") { await lookupReceiver(receiverCode); barcodeRef.current?.focus(); } }}
                        placeholder="กรอกรหัสพนักงานรับคืน"
                        className={`w-full h-10 px-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition ${
                          receiverLookupError ? "border-red-300" : "border-gray-200"
                        }`}
                      />
                      {receiverLookupError && (
                        <p className="mt-1 text-xs text-red-500 px-1">
                          {receiverLookupError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </LabeledField>
            </div>

            {/* ─ Column 3 ─ */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabeledField label="ประเภทลูกหนี้">
                  <ReadonlyField value={memberData?.debtor_type ?? null} />
                </LabeledField>
                <LabeledField label="ชำระเงิน">
                  <div className="h-10 flex items-center gap-1.5 px-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-sm text-gray-700">
                      {memberData?.payment_days ?? 0}
                    </span>
                    <span className="text-sm text-gray-400">วัน</span>
                  </div>
                </LabeledField>
              </div>

              <LabeledField label="วงเงินอนุมัติ">
                <div className="h-10 px-3 flex items-center bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">
                    {fmt(memberData?.credit_limit)}
                  </span>
                </div>
              </LabeledField>

              <div className="grid grid-cols-2 gap-3">
                <LabeledField label="ระดับราคา">
                  <div className="h-10 px-3 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-sm font-bold text-gray-700">
                      {memberData?.price_level || ""}
                    </span>
                  </div>
                </LabeledField>
                <LabeledField label="รูปแบบ">
                  <ReadonlyField value={memberData?.price_option ?? null} />
                </LabeledField>
              </div>

              <LabeledField label="เส้นทาง">
                <ReadonlyField value={memberData?.route_name ?? null} />
              </LabeledField>
            </div>
          </div>
        </div>

        {/* ── Barcode Input ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4">
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-1 text-gray-300 flex-shrink-0">
              <svg
                width="36"
                height="28"
                viewBox="0 0 36 28"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="0" y="0" width="3" height="28" />
                <rect x="5" y="0" width="1.5" height="28" />
                <rect x="8" y="0" width="3" height="28" />
                <rect x="13" y="0" width="1.5" height="28" />
                <rect x="17" y="0" width="3" height="28" />
                <rect x="22" y="0" width="1.5" height="28" />
                <rect x="25" y="0" width="3" height="28" />
                <rect x="30" y="0" width="1.5" height="28" />
                <rect x="33" y="0" width="3" height="28" />
              </svg>
              <span className="text-xs">Barcode</span>
            </div>

            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder={
                memberData
                  ? "Scan barcode แล้วกด Enter เพื่อค้นหาสินค้า"
                  : "ระบุรหัสลูกค้าก่อนสแกนสินค้า"
              }
              disabled={!memberData || scanning}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition disabled:bg-gray-50 disabled:text-gray-400"
              autoFocus
            />

            {scanning && (
              <div className="flex items-center gap-2 text-sm text-blue-500">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                กำลังค้นหา...
              </div>
            )}

            <p className="text-xs text-gray-400">
              กด{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-xs">
                Enter
              </kbd>{" "}
              เพื่อค้นหาและเพิ่มสินค้า
            </p>
          </div>
        </div>

        {/* ── Product Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  {[
                    { label: "#", cls: "w-10 text-left" },
                    { label: "รหัสสินค้า", cls: "text-left" },
                    { label: "รายละเอียด", cls: "text-left" },
                    { label: "ชั้น", cls: "text-center" },
                    { label: "จำนวน (ยาดี+เสีย)", cls: "text-center" },
                    { label: "หน่วย", cls: "text-center" },
                    { label: "ราคา/หน่วย", cls: "text-right" },
                    { label: "จำนวนเงิน", cls: "text-right" },
                    { label: "% รับคืน", cls: "text-center" },
                    { label: "ราคารับคืน", cls: "text-right" },
                    { label: "เหตุผล", cls: "text-left" },
                    { label: "ลบ", cls: "text-center w-14" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className={`px-4 py-3 text-xs font-semibold text-gray-500 ${col.cls}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300">
                        <FiPackage className="text-5xl" />
                        <p className="text-sm font-medium">ยังไม่มีรายการสินค้า</p>
                        <p className="text-xs">
                          Scan barcode เพื่อเพิ่มสินค้าในรายการรับคืน
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((p, i) => {
                    const { totalGoodBad, totalAmount, returnPrice } =
                      computeProductTotals(p);
                    return (
                      <tr
                        key={p.uid}
                        className="border-b border-gray-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-blue-600 font-mono text-xs">
                          {p.product_code}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                          {p.product_name}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">
                          {p.product_floor || ""}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                          {totalGoodBad}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 text-xs">
                          {p.product_unit || ""}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {fmt(p.price_per_unit)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {fmt(totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.return_rate === 0 ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-500 rounded text-xs font-medium">
                              ขายขาด
                            </span>
                          ) : (
                            <span className="text-gray-600">{p.return_rate}%</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {fmt(returnPrice)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">
                          {p.reason}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemove(p.uid)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                          >
                            <FiX />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer: Buttons + Summary ── */}
          <div className="border-t border-gray-100 px-6 py-5">
            <div className="flex items-end justify-between gap-6">
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  disabled={printing || products.length === 0 || !memberData}
                  className="flex items-center gap-2 px-7 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-sm shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {printing ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiPrinter />
                  )}
                  <span>{printing ? "กำลังบันทึก..." : "พิมพ์"}</span>
                </button>
                <button
                  onClick={() => {
                    setProducts([]);
                    setMemberData(null);
                    setCustomerCode("");
                    setRemark("");
                    setReceiverCode("");
                    setReceiverName(null);
                    setReceiverLookupError(null);
                  }}
                  className="flex items-center gap-2 px-7 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                >
                  <FiX />
                  <span>ยกเลิก</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-end gap-6">
                  <span className="text-sm text-gray-500 w-32 text-right">
                    มูลค่าสินค้า
                  </span>
                  <span className="text-sm font-semibold text-gray-800 w-36 text-right tabular-nums">
                    {fmt(grandTotalAmount)}
                  </span>
                  <span className="text-xs text-gray-400 w-14">บาท.สต.</span>
                </div>
                <div className="flex items-center justify-end gap-6 pt-1 border-t border-gray-100">
                  <span className="text-sm text-gray-500 w-32 text-right">
                    รับคืน ในราคา
                  </span>
                  <span className="text-base font-bold text-emerald-600 w-36 text-right tabular-nums">
                    {fmt(grandReturnPrice)}
                  </span>
                  <span className="text-xs text-gray-400 w-14">บาท.สต.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Config Modal ── */}
      <ReturnRatioConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        accessToken={accessToken ?? ""}
      />

      {/* ── Product Scan Modal ── */}
      <ProductScanModal
        open={modalOpen}
        data={scanResult}
        customer={{
          mem_name: memberData?.mem_name ?? "",
          price_level: memberData?.price_level ?? null,
          route_name: memberData?.route_name ?? null,
        }}
        mem_code={memberData?.mem_code ?? ""}
        accessToken={accessToken ?? ""}
        onConfirm={handleModalConfirm}
        onClose={() => {
          setModalOpen(false);
          barcodeRef.current?.focus();
        }}
      />
    </div>
    </>
  );
};

export default ReturnReceipt;
