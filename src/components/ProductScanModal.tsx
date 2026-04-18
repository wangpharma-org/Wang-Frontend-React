import React, { useState, useRef, useEffect } from "react";
import {
  FiX,
  FiPlus,
  FiPackage,
  FiMinus,
} from "react-icons/fi";
import axios from "axios";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface LotRow {
  id: number;
  lot: string | null;
  mfg: string | null;
  exp: string | null;
  receive_good_qty: number;
  receive_bad_qty: number;
  not_receive_qty: number;
}

export interface ProductScanResult {
  product: {
    product_code: string;
    product_name: string;
    product_barcode: string | null;
    product_barcode2: string | null;
    product_barcode3: string | null;
    product_unit: string | null;
    product_floor: string | null;
    product_stock: number;
    return_rate: number;
    product_image_url: string | null;
  };
  lots: { id: number; lot: string | null; mfg: string | null; exp: string | null }[];
  purchase_history: {
    id: string;
    date_purchased: string;
    invoice_number: string;
    type: string;
    qty: number;
    priceUnit: number;
    unit: string | null;
    totalPrice: number;
  }[];
}

export interface CustomerSummary {
  mem_name: string;
  price_level: string | null;
  route_name: string | null;
}

export interface ConfirmedProduct {
  product_code: string;
  product_name: string;
  product_unit: string | null;
  product_floor: string | null;
  return_rate: number;
  price_per_unit: number;
  lot_items: LotRow[];
  reason: string;
}

interface Props {
  open: boolean;
  data: ProductScanResult | null;
  customer: CustomerSummary;
  mem_code: string;
  accessToken: string;
  onConfirm: (result: ConfirmedProduct) => void;
  onClose: () => void;
}

const REASONS = [
  "สินค้าเสีย / ชำรุด",
  "สินค้าหมดอายุ",
  "สินค้าผิดรายการ",
  "ส่งเกินจำนวน",
  "ลูกค้าไม่ต้องการ",
  "อื่นๆ",
];

const fmt = (n: number) =>
  n?.toLocaleString("th-TH", { minimumFractionDigits: 2 }) ?? "0.00";

// ── Stepper input (qty) ────────────────────────────────────
interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  color: "green" | "orange" | "slate";
}

const COLOR = {
  green: {
    wrap: "border-green-300 bg-green-50 focus-within:ring-2 focus-within:ring-green-400",
    btn: "text-green-600 hover:bg-green-100 active:bg-green-200",
    input: "text-green-700 bg-transparent",
    badge: "bg-green-500",
  },
  orange: {
    wrap: "border-orange-300 bg-orange-50 focus-within:ring-2 focus-within:ring-orange-400",
    btn: "text-orange-500 hover:bg-orange-100 active:bg-orange-200",
    input: "text-orange-600 bg-transparent",
    badge: "bg-orange-500",
  },
  slate: {
    wrap: "border-slate-300 bg-slate-50 focus-within:ring-2 focus-within:ring-slate-400",
    btn: "text-slate-500 hover:bg-slate-100 active:bg-slate-200",
    input: "text-slate-600 bg-transparent",
    badge: "bg-slate-400",
  },
};

const Stepper: React.FC<StepperProps> = ({ value, onChange, color }) => {
  const c = COLOR[color];
  return (
    <div
      className={`flex items-center rounded-xl border ${c.wrap} overflow-hidden transition-all`}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onChange(Math.max(0, value - 1))}
        className={`w-8 h-10 flex items-center justify-center flex-shrink-0 ${c.btn} transition-colors`}
      >
        <FiMinus size={12} />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        onFocus={(e) => e.target.select()}
        className={`w-14 h-10 text-center text-sm font-bold ${c.input} focus:outline-none`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onChange(value + 1)}
        className={`w-8 h-10 flex items-center justify-center flex-shrink-0 ${c.btn} transition-colors`}
      >
        <FiPlus size={12} />
      </button>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

const ProductScanModal: React.FC<Props> = ({
  open,
  data,
  customer,
  accessToken,
  onConfirm,
  onClose,
}) => {
  const [lots, setLots] = useState<LotRow[]>([]);
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [showAddLot, setShowAddLot] = useState(false);
  const [newLot, setNewLot] = useState({ lot: "", mfg: "", exp: "" });
  const [addingLot, setAddingLot] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Sync lots when data changes
  useEffect(() => {
    if (data) {
      setLots(
        data.lots.map((l) => ({
          ...l,
          receive_good_qty: 0,
          receive_bad_qty: 0,
          not_receive_qty: 0,
        }))
      );
      const latest = data.purchase_history.find((h) => h.type === "ขาย");
      setPricePerUnit(latest?.priceUnit ?? 0);
      setSelectedReason(REASONS[0]);
      setCustomReason("");
      setImgError(false);
      setShowAddLot(false);
    }
  }, [data]);

  // Auto-focus first input
  useEffect(() => {
    if (open && lots.length > 0) {
      setTimeout(() => firstInputRef.current?.focus(), 120);
    }
  }, [open, lots.length]);

  if (!open || !data) return null;

  const { product, purchase_history } = data;

  const updateLotQty = (
    id: number,
    field: "receive_good_qty" | "receive_bad_qty" | "not_receive_qty",
    value: number
  ) => {
    setLots((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: Math.max(0, value) } : l))
    );
  };

  const handleAddLot = async () => {
    if (!newLot.lot && !newLot.mfg && !newLot.exp) return;
    setAddingLot(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/add-lot`,
        { product_code: product.product_code, ...newLot },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const saved = res.data as { id: number; lot: string; mfg: string; exp: string };
      setLots((prev) => [
        ...prev,
        { id: saved.id, lot: saved.lot, mfg: saved.mfg, exp: saved.exp,
          receive_good_qty: 0, receive_bad_qty: 0, not_receive_qty: 0 },
      ]);
      setNewLot({ lot: "", mfg: "", exp: "" });
      setShowAddLot(false);
    } catch {
      // ignore — user will retry
    } finally {
      setAddingLot(false);
    }
  };

  const handleConfirm = () => {
    const reason =
      selectedReason === "อื่นๆ" ? customReason || "อื่นๆ" : selectedReason;
    onConfirm({
      product_code: product.product_code,
      product_name: product.product_name,
      product_unit: product.product_unit,
      product_floor: product.product_floor,
      return_rate: product.return_rate,
      price_per_unit: pricePerUnit,
      lot_items: lots.filter(
        (l) => l.receive_good_qty + l.receive_bad_qty + l.not_receive_qty > 0
      ),
      reason,
    });
  };

  const totalGood = lots.reduce((s, l) => s + l.receive_good_qty, 0);
  const totalBad = lots.reduce((s, l) => s + l.receive_bad_qty, 0);
  const totalNot = lots.reduce((s, l) => s + l.not_receive_qty, 0);
  const totalQty = totalGood + totalBad;
  const totalAmount = totalQty * pricePerUnit;
  const returnAmount = totalAmount * (product.return_rate / 100);
  const hasQty = totalGood + totalBad + totalNot > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          {/* Product image (small) */}
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.product_image_url && !imgError ? (
              <img
                src={
                  product.product_image_url.startsWith("..")
                    ? product.product_image_url.replace(/^\.\./, "https://wangpharma.com")
                    : product.product_image_url
                }
                alt={product.product_name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <FiPackage className="text-blue-400 text-xl" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-mono">{product.product_code}</p>
            <p className="text-base font-semibold text-gray-800 leading-tight truncate">
              {product.product_name}
            </p>
          </div>
          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {product.product_floor && (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">
                ชั้น {product.product_floor}
              </span>
            )}
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                product.return_rate === 0
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {product.return_rate === 0 ? "ขายขาด" : `คืน ${product.return_rate}%`}
            </span>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
              {customer.mem_name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all ml-1"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-[260px_1fr_1fr] h-full">

            {/* ── Left panel: Reason + Price ── */}
            <div className="p-5 space-y-5 overflow-y-auto">

              {/* ราคา/หน่วย */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  ราคา / หน่วย (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="w-full h-11 pl-4 pr-14 text-right text-lg font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-0 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">
                    บาท
                  </span>
                </div>
                {data.purchase_history.find((h) => h.type === "ขาย") && (
                  <p className="mt-1 text-xs text-gray-400">
                    ราคาล่าสุด:{" "}
                    <span className="text-blue-500 font-medium">
                      {fmt(data.purchase_history.find((h) => h.type === "ขาย")!.priceUnit)} บาท
                    </span>
                  </p>
                )}
              </div>

              {/* เหตุผล */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  เหตุผลการคืนสินค้า
                </p>
                <div className="space-y-1">
                  {REASONS.map((r) => {
                    const active = selectedReason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedReason(r)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                          active
                            ? "bg-blue-500 text-white font-medium shadow-sm shadow-blue-200"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                {selectedReason === "อื่นๆ" && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="ระบุเหตุผล..."
                    className="mt-2 w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                )}
              </div>

            </div>

            {/* ── Middle panel: Purchase history ── */}
            <div className="p-5 flex flex-col gap-3 border-l border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">
                ประวัติการซื้อขาย ({purchase_history.length})
              </p>
              <div className="overflow-auto flex-1 rounded-xl border border-gray-100 text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 sticky top-0">
                      <th className="px-2 py-2 text-left text-gray-400 font-semibold">วันที่</th>
                      <th className="px-2 py-2 text-left text-gray-400 font-semibold">เลขที่</th>
                      <th className="px-2 py-2 text-center text-gray-400 font-semibold">ประเภท</th>
                      <th className="px-2 py-2 text-center text-gray-400 font-semibold">จำนวน</th>
                      <th className="px-2 py-2 text-right text-gray-400 font-semibold">ราคา/หน่วย</th>
                      <th className="px-2 py-2 text-right text-gray-400 font-semibold">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase_history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-2 py-6 text-center text-gray-300">
                          ไม่มีประวัติ
                        </td>
                      </tr>
                    ) : (
                      purchase_history.map((h) => (
                        <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-2 py-2 text-gray-500 whitespace-nowrap">
                            {h.date_purchased
                              ? new Date(h.date_purchased).toLocaleDateString("th-TH", {
                                  day: "2-digit", month: "2-digit", year: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="px-2 py-2 text-blue-500 font-mono truncate max-w-[80px]">
                            {h.invoice_number || "—"}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                h.type === "รับคืน"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-green-100 text-green-600"
                              }`}
                            >
                              {h.type}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center text-gray-600">
                            {h.qty} {h.unit}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-600">
                            {fmt(h.priceUnit)}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-gray-700">
                            {fmt(h.totalPrice)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Right panel: Lot table (main focus) ── */}
            <div className="p-5 flex flex-col gap-4 border-l border-gray-100">

              {/* Column header labels */}
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">
                  Lot สินค้า — กรอกจำนวนรับคืน
                </p>
                <div className="flex items-center gap-4 text-xs font-semibold pr-1">
                  <span className="text-green-600 w-[120px] text-center">รับคืน (ยาดี)</span>
                  <span className="text-orange-500 w-[120px] text-center">รับคืน (ยาเสีย)</span>
                  <span className="text-slate-500 w-[120px] text-center">ไม่รับ</span>
                </div>
              </div>

              {/* Lot rows */}
              <div className="flex flex-col gap-2">
                {lots.length === 0 ? (
                  <div className="py-12 text-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                    ยังไม่มี Lot — กดเพิ่ม Lot ด้านล่าง
                  </div>
                ) : (
                  lots.map((l) => {
                    const filled = l.receive_good_qty + l.receive_bad_qty + l.not_receive_qty > 0;
                    return (
                      <div
                        key={l.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          filled
                            ? "border-blue-200 bg-blue-50/40"
                            : "border-gray-100 bg-gray-50/60 hover:border-gray-200"
                        }`}
                      >
                        {/* Lot info */}
                        <div className="flex-1 min-w-0 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Lot</p>
                            <p className="font-mono font-medium text-gray-700 truncate">
                              {l.lot || <span className="text-gray-300">—</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">MFG</p>
                            <p className="text-gray-600 truncate">
                              {l.mfg || <span className="text-gray-300">—</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">EXP</p>
                            <p className="text-gray-600 truncate">
                              {l.exp || <span className="text-gray-300">—</span>}
                            </p>
                          </div>
                        </div>

                        {/* Steppers */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* ยาดี */}
                          <Stepper
                            value={l.receive_good_qty}
                            onChange={(v) => updateLotQty(l.id, "receive_good_qty", v)}
                            color="green"
                          />
                          {/* ยาเสีย */}
                          <Stepper
                            value={l.receive_bad_qty}
                            onChange={(v) => updateLotQty(l.id, "receive_bad_qty", v)}
                            color="orange"
                          />
                          {/* ไม่รับ */}
                          <Stepper
                            value={l.not_receive_qty}
                            onChange={(v) => updateLotQty(l.id, "not_receive_qty", v)}
                            color="slate"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Lot */}
              {showAddLot ? (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                  <p className="text-sm font-semibold text-blue-700">เพิ่ม Lot ใหม่</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        { key: "lot", label: "Lot No." },
                        { key: "mfg", label: "วันผลิต (MFG)" },
                        { key: "exp", label: "วันหมดอายุ (EXP)" },
                      ] as { key: keyof typeof newLot; label: string }[]
                    ).map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-blue-500 mb-1 block font-medium">
                          {label}
                        </label>
                        <input
                          type="text"
                          value={newLot[key]}
                          onChange={(e) =>
                            setNewLot((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-full h-10 px-3 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          placeholder={label}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddLot(false);
                        setNewLot({ lot: "", mfg: "", exp: "" });
                      }}
                      className="h-9 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-white"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLot}
                      disabled={addingLot}
                      className="h-9 px-5 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium"
                    >
                      {addingLot ? "กำลังบันทึก..." : "บันทึก Lot"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddLot(true)}
                  className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 transition-colors self-start px-1"
                >
                  <FiPlus size={14} />
                  เพิ่ม Lot ใหม่
                </button>
              )}

              {/* Summary */}
              {hasQty && (
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 mb-1">รับคืน (ยาดี)</p>
                      <p className="text-xl font-bold text-green-700">{totalGood}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-orange-500 mb-1">รับคืน (ยาเสีย)</p>
                      <p className="text-xl font-bold text-orange-600">{totalBad}</p>
                    </div>
                    <div className="bg-slate-100 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 mb-1">ไม่รับ</p>
                      <p className="text-xl font-bold text-slate-600">{totalNot}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-500 mb-1">
                        มูลค่าคืน
                        {product.return_rate > 0 && (
                          <span className="text-gray-400"> ({product.return_rate}%)</span>
                        )}
                      </p>
                      <p
                        className={`text-xl font-bold ${
                          product.return_rate === 0 ? "text-red-500" : "text-blue-700"
                        }`}
                      >
                        {product.return_rate === 0 ? "0.00" : fmt(returnAmount)}
                      </p>
                    </div>
                  </div>
                  {totalQty > 0 && (
                    <p className="text-xs text-gray-400 mt-2 text-right">
                      รวม {totalQty} {product.product_unit} ×{" "}
                      <span className="font-medium text-gray-600">{fmt(pricePerUnit)} บาท</span>
                      {" = "}
                      <span className="font-semibold text-gray-700">{fmt(totalAmount)} บาท</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/40">
          <p className="text-sm text-gray-400">
            {hasQty
              ? `เลือก ${lots.filter((l) => l.receive_good_qty + l.receive_bad_qty + l.not_receive_qty > 0).length} Lot`
              : "กรอกจำนวนรับคืนอย่างน้อย 1 Lot"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-6 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasQty}
              className="h-10 px-8 text-sm text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-all font-semibold shadow-sm shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductScanModal;
