import { useMemo, useRef, useState } from "react";
import axios from "axios";
import { Printer, QrCode, Search, Trash2 } from "lucide-react";
import BarcodeLabelPrint from "../components/BarcodeLabelPrint";
import {
  BARCODE_FIELD,
  BARCODE_SLOTS,
  type BarcodeLabel,
  authHeaders,
} from "../components/noBarcodeApproval";

// OPHMBC-309 — เลือกบาร์โค้ดสินค้าหลายรายการแล้วพิมพ์ฉลาก QR รวดเดียว
interface ProductRow {
  product_code: string;
  product_name: string;
  product_barcode: string | null;
  product_barcode2: string | null;
  product_barcode3: string | null;
}

const MAX_COPIES = 50;
const labelKey = (label: Pick<BarcodeLabel, "product_code" | "barcode">) =>
  `${label.product_code}|${label.barcode}`;

const ProductBarcodePrintSelect = () => {
  const searchRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<ProductRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BarcodeLabel[]>([]);
  const [printLabels, setPrintLabels] = useState<BarcodeLabel[] | null>(null);

  const selectedKeys = useMemo(() => new Set(selected.map(labelKey)), [selected]);
  const totalLabels = selected.reduce((sum, label) => sum + label.copies, 0);

  // ใช้ API เดียวกับหน้าจัดการสินค้า — ค้นจากบาร์โค้ดทั้ง 3 ช่องและรหัสสินค้า
  const search = async () => {
    const text = keyword.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post<ProductRow[]>(
        `${import.meta.env.VITE_API_URL_ORDER}/api/manage/get-product-detail-manage`,
        { barcode: text },
        authHeaders()
      );
      setResults(res.data);
      setSearched(true);
    } catch {
      setError("ค้นหาไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
      searchRef.current?.select();
    }
  };

  const toggle = (product: ProductRow, barcode: string) => {
    const key = labelKey({ product_code: product.product_code, barcode });
    setSelected((prev) =>
      prev.some((label) => labelKey(label) === key)
        ? prev.filter((label) => labelKey(label) !== key)
        : [
            ...prev,
            {
              barcode,
              product_code: product.product_code,
              name: product.product_name,
              copies: 1,
            },
          ]
    );
  };

  const setCopies = (key: string, value: number) => {
    const copies = Math.min(MAX_COPIES, Math.max(1, Math.floor(value) || 1));
    setSelected((prev) =>
      prev.map((label) => (labelKey(label) === key ? { ...label, copies } : label))
    );
  };

  // พิมพ์ในหน้านี้ด้วย browser print — ส่ง array ใหม่ทุกครั้งเพื่อให้กดพิมพ์ซ้ำได้
  const print = () => {
    if (selected.length > 0) setPrintLabels([...selected]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_400px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <QrCode className="text-blue-600" />
            พิมพ์ฉลาก QR บาร์โค้ดสินค้า
          </h1>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="สแกนหรือพิมพ์ บาร์โค้ด / รหัสสินค้า"
                className="w-full rounded-lg border-2 border-slate-300 py-2.5 pl-10 pr-3 text-lg outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer rounded-lg bg-blue-600 px-5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "กำลังค้นหา..." : "ค้นหา"}
            </button>
          </form>
          <p className="mt-2 min-h-5 text-sm text-red-600" role="alert">
            {error}
          </p>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">รหัสสินค้า</th>
                  <th className="px-4 py-3 font-medium">ชื่อสินค้า</th>
                  <th className="px-4 py-3 font-medium">บาร์โค้ด (กดเพื่อเลือก)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                      {searched ? "ไม่พบสินค้า" : "ค้นหาสินค้าเพื่อเลือกบาร์โค้ดที่จะพิมพ์"}
                    </td>
                  </tr>
                ) : (
                  results.map((product) => {
                    const barcodes = BARCODE_SLOTS.map((slot) =>
                      product[BARCODE_FIELD[slot]]?.trim()
                    ).filter((barcode): barcode is string => !!barcode);
                    return (
                      <tr key={product.product_code}>
                        <td className="px-4 py-3 font-mono">{product.product_code}</td>
                        <td className="px-4 py-3">{product.product_name}</td>
                        <td className="px-4 py-3">
                          {barcodes.length === 0 ? (
                            <span className="text-slate-400">ไม่มีบาร์โค้ด</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {barcodes.map((barcode) => {
                                const checked = selectedKeys.has(
                                  labelKey({ product_code: product.product_code, barcode })
                                );
                                return (
                                  <label
                                    key={barcode}
                                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono ${
                                      checked
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-slate-300 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggle(product, barcode)}
                                    />
                                    {barcode}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              ที่เลือกไว้ ({selected.length})
            </h2>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="cursor-pointer text-sm text-slate-500 hover:text-red-600"
              >
                ล้างทั้งหมด
              </button>
            )}
          </div>
          {selected.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">ยังไม่ได้เลือกบาร์โค้ด</p>
          ) : (
            <ul className="mt-3 max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {selected.map((label) => {
                const key = labelKey(label);
                return (
                  <li key={key} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800" title={label.name}>
                        {label.name}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {label.product_code} · {label.barcode}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={MAX_COPIES}
                      value={label.copies}
                      onChange={(e) => setCopies(key, Number(e.target.value))}
                      aria-label={`จำนวนดวง ${label.barcode}`}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-right"
                    />
                    <span className="text-xs text-slate-500">ดวง</span>
                    <button
                      type="button"
                      onClick={() => setSelected((prev) => prev.filter((l) => labelKey(l) !== key))}
                      aria-label={`เอา ${label.barcode} ออก`}
                      className="cursor-pointer text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={print}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer className="h-5 w-5" />
            พิมพ์ {totalLabels} ดวง
          </button>
        </aside>
      </div>
      <BarcodeLabelPrint labels={printLabels} onDone={() => setPrintLabels(null)} />
    </div>
  );
};

export default ProductBarcodePrintSelect;
