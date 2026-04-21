import React, { useState } from "react";
import { FiX, FiSearch, FiSave, FiSettings } from "react-icons/fi";
import axios from "axios";

interface ProductConfig {
  product_code: string;
  product_name: string;
  product_unit: string | null;
  return_rate: number;
}

interface SavedEntry extends ProductConfig {
  new_rate: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  accessToken: string;
}

const ReturnRatioConfigModal: React.FC<Props> = ({ open, onClose, accessToken }) => {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState<ProductConfig | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [newRate, setNewRate] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [savedList, setSavedList] = useState<SavedEntry[]>([]);

  if (!open) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setProduct(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/product-config/${query.trim()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setProduct(res.data);
      setNewRate(res.data.return_rate);
    } catch {
      setSearchError("ไม่พบสินค้า");
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL_ORDER}/api/return-receipt/product-config`,
        { product_code: product.product_code, return_rate: newRate },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSavedList((prev) => {
        const filtered = prev.filter((e) => e.product_code !== product.product_code);
        return [{ ...product, new_rate: newRate }, ...filtered];
      });
      setProduct((prev) => prev ? { ...prev, return_rate: newRate } : null);
      setQuery("");
    } catch {
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setProduct(null);
    setSearchError(null);
    setSavedList([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="p-2 bg-slate-100 rounded-xl">
            <FiSettings className="text-slate-500 text-base" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-800">ตั้งค่า Pro Ratio Return</h2>
            <p className="text-xs text-gray-400">กำหนดอัตราส่วนรับคืน (%) ต่อสินค้า</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Search */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              รหัสสินค้า / Barcode
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearchError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="กรอกรหัสสินค้าหรือ barcode..."
                className="flex-1 h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="h-10 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
              >
                {searching ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiSearch size={14} />
                )}
                ค้นหา
              </button>
            </div>
            {searchError && (
              <p className="mt-1.5 text-xs text-red-500">{searchError}</p>
            )}
          </div>

          {/* Product result */}
          {product && (
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-4">
              <div>
                <p className="text-[11px] text-gray-400 font-mono">{product.product_code}</p>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{product.product_name}</p>
                {product.product_unit && (
                  <p className="text-xs text-gray-400 mt-0.5">หน่วย: {product.product_unit}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 font-medium">อัตราปัจจุบัน</p>
                  <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg">
                    <span className={`text-sm font-bold ${product.return_rate === 0 ? "text-red-500" : "text-gray-700"}`}>
                      {product.return_rate === 0 ? "ขายขาด (0%)" : `${product.return_rate}%`}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">เลือกอัตราใหม่</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "ขายขาด", value: 0 },
                      { label: "10%", value: 10 },
                      { label: "25%", value: 25 },
                      { label: "50%", value: 50 },
                      { label: "100%", value: 100 },
                    ].map((opt) => {
                      const active = newRate === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewRate(opt.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                            active
                              ? opt.value === 0
                                ? "bg-red-500 text-white shadow-sm shadow-red-200"
                                : "bg-blue-500 text-white shadow-sm shadow-blue-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {newRate === 0 && (
                    <p className="mt-2 text-xs text-red-500">⚠ ขายขาด — สินค้านี้จะไม่คำนวณราคาคืน</p>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || newRate === product.return_rate}
                  className="flex items-center gap-2 h-10 px-6 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-emerald-100"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiSave size={14} />
                  )}
                  บันทึก
                </button>
              </div>
            </div>
          )}

          {/* Saved history (this session) */}
          {savedList.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                บันทึกไปแล้ว (session นี้)
              </p>
              <div className="space-y-1.5">
                {savedList.map((e) => (
                  <div
                    key={e.product_code}
                    className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gray-400">{e.product_code}</p>
                      <p className="text-sm text-gray-700 truncate">{e.product_name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-shrink-0">
                      <span className="text-gray-400">{e.return_rate}%</span>
                      <span className="text-gray-300">→</span>
                      <span className={`font-bold ${e.new_rate === 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {e.new_rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleClose}
            className="h-9 px-5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnRatioConfigModal;
