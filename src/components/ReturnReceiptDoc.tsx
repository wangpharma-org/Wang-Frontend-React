import React from "react";
import { QRCodeSVG } from "qrcode.react";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface DocLotRow {
  lot: string | null;
  mfg: string | null;
  exp: string | null;
  receive_good_qty: number;
  receive_bad_qty: number;
}

export interface DocProduct {
  product_code: string;
  product_name: string;
  product_unit: string | null;
  return_rate: number;
  price_per_unit: number;
  lot_items: DocLotRow[];
  reason: string;
}

export interface DocMember {
  mem_code: string;
  mem_name: string;
  address: string;
  route_name: string | null;
  payment_days: number | null;
}

export interface ReturnReceiptPayload {
  return_receipt_code: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  remark: string;
  member: DocMember;
  products: DocProduct[];
  keyEmpDisplay: string;
  receiverDisplay: string;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** DD / MM / YY (พ.ศ. short) */
const thaiDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = ((d.getFullYear() + 543) % 100).toString().padStart(2, "0");
  return `${day} / ${month} / ${year}`;
};

// Thai baht text
const ONES = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
function _digits(n: number): string {
  if (n <= 0) return "";
  let r = "";
  if (n >= 1000000) { r += _digits(Math.floor(n / 1000000)) + "ล้าน"; n %= 1000000; }
  if (n >= 100000)  { r += ONES[Math.floor(n / 100000)] + "แสน"; n %= 100000; }
  if (n >= 10000)   { r += ONES[Math.floor(n / 10000)]  + "หมื่น"; n %= 10000; }
  if (n >= 1000)    { r += ONES[Math.floor(n / 1000)]   + "พัน"; n %= 1000; }
  if (n >= 100)     { r += ONES[Math.floor(n / 100)]    + "ร้อย"; n %= 100; }
  if (n >= 10) {
    const t = Math.floor(n / 10); n %= 10;
    r += t === 1 ? "สิบ" : t === 2 ? "ยี่สิบ" : ONES[t] + "สิบ";
  }
  if (n > 0) r += (r.endsWith("สิบ") && n === 1) ? "เอ็ด" : ONES[n];
  return r;
}
function thaiBahtText(amount: number): string {
  if (amount === 0) return "ศูนย์บาทถ้วน";
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);
  return _digits(baht) + "บาท" + (satang === 0 ? "ถ้วน" : _digits(satang) + "สตางค์");
}

// ────────────────────────────────────────────────────────────
// Shared cell styles
// ────────────────────────────────────────────────────────────

const TD: React.CSSProperties = {
  borderLeft: "1px solid #000",
  borderRight: "1px solid #000",
  padding: "2px 4px",
  fontSize: "8pt",
  lineHeight: "1.3",
};
const TH: React.CSSProperties = {
  borderTop: "1px solid #000",
  borderLeft: "1px solid #000",
  borderRight: "1px solid #000",
  borderBottom: "1px solid #000",
  padding: "3px 4px",
  fontSize: "8pt",
  fontWeight: "bold",
  textAlign: "center",
  backgroundColor: "#fff",
};

const MIN_ROWS = 20;

const ReturnReceiptDoc: React.FC<{ payload: ReturnReceiptPayload }> = ({ payload }) => {
  const {
    return_receipt_code,
    date,
    dueDate,
    remark,
    member,
    products,
    keyEmpDisplay,
    receiverDisplay,
  } = payload;

  interface PrintRow {
    rowNum: number | null;
    product_code: string | null;
    product_name: string | null;
    isKhaiKhat: boolean;
    lot: string | null;
    mfg: string | null;
    exp: string | null;
    qty: number;
    unit: string | null;
    price: number;
    amount: number;
  }
  const rows: PrintRow[] = [];
  let n = 0;
  for (const p of products) {
    const isKhaiKhat = p.return_rate === 0;
    const lots = p.lot_items;
    if (lots.length === 0) {
      n++;
      rows.push({ rowNum: n, product_code: p.product_code, product_name: p.product_name, isKhaiKhat, lot: null, mfg: null, exp: null, qty: 0, unit: p.product_unit, price: p.price_per_unit, amount: 0 });
    } else {
      lots.forEach((l, li) => {
        const qty = l.receive_good_qty + l.receive_bad_qty;
        if (li === 0) n++;
        rows.push({
          rowNum: li === 0 ? n : null,
          product_code: li === 0 ? p.product_code : null,
          product_name: li === 0 ? p.product_name : null,
          isKhaiKhat: li === 0 ? isKhaiKhat : false,
          lot: l.lot, mfg: l.mfg, exp: l.exp,
          qty,
          unit: li === 0 ? p.product_unit : null,
          price: li === 0 ? p.price_per_unit : 0,
          amount: p.return_rate === 0 ? 0 : qty * p.price_per_unit * (p.return_rate / 100),
        });
      });
    }
  }
  const emptyCount = Math.max(0, MIN_ROWS - rows.length);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const vatAmount = 0;
  const netAmount = totalAmount + vatAmount;

  const empDisplay = receiverDisplay || keyEmpDisplay;

  return (
    <div className="print-content" style={{ fontFamily: "'Sarabun', sans-serif", color: "#000", backgroundColor: "#fff" }}>
      {/* ── Print CSS ── */}
      <style type="text/css">{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
        }
        body { margin: 0; background: #fff; }
      `}</style>

      <div className="border" style={{ width: "210mm", height: "297mm", overflow: "hidden", margin: "0 auto", padding: "8mm", boxSizing: "border-box" }}>

        {/* ══════════════════════════════════════════
            HEADER: QR | Title | QR
        ══════════════════════════════════════════ */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "3mm" }}>
          <div style={{ textAlign: "center" }}>
            <QRCodeSVG value={member.mem_code} size={55} />
            <div style={{ fontSize: "7pt", marginTop: "1mm" }}>Member</div>
          </div>
          <div style={{ textAlign: "center", alignSelf: "center" }}>
            <div style={{ fontSize: "17pt", fontWeight: "semibold", lineHeight: "1.2" }}>ใบส่งคืนสินค้า</div>
            <div style={{ fontSize: "13pt", fontWeight: "semibold", marginTop: "1mm" }}>SORTIV</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <QRCodeSVG value={return_receipt_code} size={55} />
            <div style={{ fontSize: "7pt", marginTop: "1mm" }}>Invoice</div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            INFO SECTION
        ══════════════════════════════════════════ */}
        <div style={{ display: "flex", gap: "2mm", marginBottom: "2mm" }}>
          {/* Left block: รหัสลูกค้า */}
          <div style={{ flex: "0 0 64%", border: "1px solid #000", borderRadius: "6px", overflow: "hidden", padding: "2mm 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ fontSize: "8pt", fontWeight: "bold", whiteSpace: "nowrap", padding: "0.4mm 4px 0.4mm 7px" }}>รหัสลูกค้า</td>
                  <td style={{ fontSize: "8pt", padding: "0.4mm 4px" }}>{member.mem_code}</td>
                  <td style={{ fontSize: "8pt", padding: "0.4mm 4px" }}>เลขประจำตัวผู้เสียภาษี</td>
                  <td style={{ fontSize: "8pt", padding: "0.4mm 7px 0.4mm 4px", whiteSpace: "nowrap" }}>&#9745; สำนักงานใหญ่</td>
                </tr>
                <tr>
                  <td style={{ fontSize: "8pt", fontWeight: "bold", whiteSpace: "nowrap", padding: "0.4mm 4px 0.4mm 7px" }}>นามร้าน</td>
                  <td colSpan={3} style={{ fontSize: "8pt", padding: "0.4mm 7px 0.4mm 4px" }}>{member.mem_name}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: "8pt", fontWeight: "bold", whiteSpace: "nowrap", padding: "0.4mm 4px 0.4mm 7px", verticalAlign: "top" }}>ที่อยู่</td>
                  <td colSpan={3} style={{ fontSize: "8pt", padding: "0.4mm 7px 0.4mm 4px" }}>{member.address.replace(/&nbsp;/g, "")}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: "8pt", fontWeight: "bold", whiteSpace: "nowrap", padding: "0.4mm 4px 0.4mm 7px", verticalAlign: "top" }}>หมายเหตุ</td>
                  <td colSpan={3} style={{ fontSize: "8pt", padding: "0.4mm 7px 0.4mm 4px" }}>
                    {[remark, member.route_name].filter(Boolean).join("  ")}
                    {"  "}QC ........................ / Pack ........................
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right block: วันที่ */}
          <div style={{ flex: 1, border: "1px solid #000", borderRadius: "6px", overflow: "hidden", padding: "2mm 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  { label: "วันที่", value: thaiDate(date) },
                  { label: "เลขที่ใบกำกับ", value: return_receipt_code },
                  { label: "พนักงานขาย", value: empDisplay },
                  { label: "กำหนดชำระ", value: member.payment_days ? `${member.payment_days} วัน` : "" },
                  { label: "ครบกำหนด", value: dueDate && dueDate !== date ? thaiDate(dueDate) : "" },
                ].map(({ label, value }) => (
                  <tr key={label}>
                    <td style={{ fontSize: "8pt", fontWeight: "bold", whiteSpace: "nowrap", padding: "0.4mm 4px 0.4mm 7px" }}>{label}</td>
                    <td style={{ fontSize: "8pt", padding: "0.4mm 7px 0.4mm 4px" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            PRODUCT TABLE
        ══════════════════════════════════════════ */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "-1px", tableLayout: "fixed", borderBottom: "1px solid #000" }}>
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "31%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr>
              {[
                { label: "ที่" },
                { label: "ขายขาด" },
                { label: "รหัสสินค้า" },
                { label: "รายละเอียด", align: "left" as const },
                { label: "จำนวน" },
                { label: "หน่วย" },
                { label: "ราคา/หน่วย" },
                { label: "ส่วนลด" },
                { label: "จำนวนเงิน" },
              ].map((col) => (
                <th key={col.label} style={{ ...TH, textAlign: col.align ?? "center" }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Data rows */}
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td style={{ ...TD, textAlign: "center", height: "5.5mm" }}>{row.rowNum ?? ""}</td>
                <td style={{ ...TD, textAlign: "center" }}>{row.isKhaiKhat ? "✓" : ""}</td>
                <td style={{ ...TD, textAlign: "center", fontFamily: "monospace", fontSize: "7.5pt" }}>{row.product_code ?? ""}</td>
                <td style={{ ...TD }}>
                  {row.product_name && <div style={{ fontSize: "8pt" }}>{row.product_name}</div>}
                  {(row.lot || row.mfg || row.exp) && (
                    <div style={{ fontSize: "7pt", color: "#444", marginTop: row.product_name ? "0.5mm" : 0 }}>
                      {[row.lot && `Lot : ${row.lot}`, row.mfg && `MFG : ${row.mfg}`, row.exp && `EXP : ${row.exp}`]
                        .filter(Boolean).join("  ")}
                    </div>
                  )}
                </td>
                <td style={{ ...TD, textAlign: "center" }}>{row.qty > 0 ? row.qty.toFixed(2) : ""}</td>
                <td style={{ ...TD, textAlign: "center" }}>{row.unit ?? ""}</td>
                <td style={{ ...TD, textAlign: "right" }}>{row.price > 0 ? fmt(row.price) : ""}</td>
                <td style={{ ...TD, textAlign: "right" }}></td>
                <td style={{ ...TD, textAlign: "right" }}>{row.amount > 0 ? fmt(row.amount) : ""}</td>
              </tr>
            ))}

            {/* Empty fill rows */}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <tr key={`e-${i}`}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} style={{ ...TD, height: "5.5mm" }}></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ══════════════════════════════════════════
            SUMMARY SECTION
        ══════════════════════════════════════════ */}
        <div style={{ display: "flex", gap: "2mm", marginTop: "2mm" }}>
          {/* Block 1a + 1b: column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2mm" }}>
            {/* Block 1a: ยอดเงินสุทธิ text */}
            <div style={{ border: "1px solid #000", borderRadius: "0", padding: "4px 7px" }}>
              <div style={{ fontSize: "8pt", fontWeight: "bold" }}>
                ยอดเงินสุทธิ : {thaiBahtText(netAmount)}
              </div>
            </div>

            {/* Block 1b: หมายเหตุ + QR */}
            <div style={{ padding: "4px 7px", minHeight: "25mm", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: "8pt", fontWeight: "bold" }}>:: หมายเหตุ ::</div>
              <div style={{ textAlign: "center" }}>
                <QRCodeSVG value={return_receipt_code} size={52} />
                <div style={{ fontSize: "7pt", marginTop: "1mm" }}>Payment</div>
              </div>
            </div>
          </div>

          {/* Block 2 + 3: column */}
          <div style={{ flex: "0 0 32%", display: "flex", flexDirection: "column", gap: "2mm" }}>
            {/* Block 2: ราคาสินค้า + ภาษี */}
            <div style={{ border: "1px solid #000", borderRadius: "0", padding: "4px 8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: "1.5mm" }}>ราคาสินค้า</td>
                    <td style={{ textAlign: "right", paddingBottom: "1.5mm" }}>{fmt(totalAmount)}</td>
                  </tr>
                  <tr>
                    <td>ภาษีมูลค่าเพิ่ม 7%</td>
                    <td style={{ textAlign: "right" }}>{fmt(vatAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Block 3: ยอดเงินสุทธิ */}
            <div style={{ border: "1px solid #000", borderRadius: "0", padding: "4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "8pt", fontWeight: "bold" }}>ยอดเงินสุทธิ</div>
              <div style={{ fontSize: "9pt", fontWeight: "bold" }}>{fmt(netAmount)}</div>
            </div>

            <div style={{ textAlign: "right", fontSize: "7pt", color: "#555" }}>[1/1]</div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SIGNATURE SECTION
        ══════════════════════════════════════════ */}
        <div style={{ display: "flex", gap: "2mm", marginTop: "2mm" }}>
          {["ผู้อนุมัติ / ลูกค้า", "พนักงานขาย", "ฝ่ายบัญชี", "ผู้ส่งของ"].map((title) => (
            <div
              key={title}
              style={{
                flex: 1,
                border: "1px solid #000",
                borderRadius: "6px",
                padding: "4px 6px",
                display: "flex",
                flexDirection: "column",
                minHeight: "25mm",
              }}
            >
              <div style={{ fontSize: "8pt", fontWeight: "bold", textAlign: "center" }}>{title}</div>
              <div style={{ flex: 1 }} />
              <div style={{ paddingBottom: "5mm" }}>
                <div style={{ borderBottom: "1px solid #000", margin: "0 4px 2px 4px" }} />
                <div style={{ fontSize: "8pt", textAlign: "center", marginTop: "5mm" }}>
                  ({"\u00A0".repeat(35)})
                </div>
                <div style={{ fontSize: "7pt", textAlign: "center", marginTop: "1mm" }}>
                  วันที่ _______ / _______ / _______
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ReturnReceiptDoc;
