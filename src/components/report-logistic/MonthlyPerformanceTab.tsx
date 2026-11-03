import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { API, authHeader, ExcelIcon, exportXlsx, fmtDate, fmtMonth, fmtTime } from "./shared";

// MA-363 — อัตราส่งสำเร็จย้อนหลังรายเดือน (ตัดรอบสิ้นเดือน) + ตัวชี้วัดพฤติกรรม

interface Metrics {
  work_days: number;
  done_stores: number;
  back_stores: number;
  leftover_stores: number;
  success_rate: number | null;
  avg_load_to_departure_min: number | null;
  avg_departure_to_first_min: number | null;
  stores_per_hour: number | null;
  avg_shift_end: string | null;
  location_bypass: number;
  scan_bypass: number;
  missing_store_photo: number;
  missing_customer_sign: number;
  departure_requests: number;
  departure_rejected: number;
  transfers_out: number;
  shift_end_outside: number;
  back_not_returned: number;
}

interface DriverMonthly {
  emp_code: string;
  emp_name: string;
  months: Record<string, Metrics>;
  total: Metrics;
}

// เกณฑ์สีอัตราส่งสำเร็จ — ปรับได้ที่นี่ที่เดียว
const GOOD = 95;
const WARN = 85;
const level = (r: number | null) =>
  r == null ? "none" : r >= 100 ? "perfect" : r >= GOOD ? "good" : r >= WARN ? "warn" : "bad";
const LEVEL = {
  perfect: { cell: "bg-emerald-700", text: "text-white", sub: "text-emerald-50", icon: "★", label: "100%" },
  good: { cell: "bg-emerald-100", text: "text-slate-900", sub: "text-slate-600", icon: "✓", label: `${GOOD}–99.9%` },
  warn: { cell: "bg-amber-100", text: "text-slate-900", sub: "text-slate-600", icon: "!", label: `${WARN}–${GOOD - 0.1}%` },
  bad: { cell: "bg-rose-200", text: "text-slate-900", sub: "text-slate-600", icon: "✕", label: `< ${WARN}%` },
  none: { cell: "bg-slate-50", text: "text-slate-400", sub: "text-slate-400", icon: "", label: "ไม่มีงาน" },
} as const;

const pct = (r: number | null) => (r == null ? "-" : `${r}%`);
const mins = (m: number | null) => (m == null ? "-" : m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} น.` : `${m} น.`);
const n0 = (n: number) => (n === 0 ? "0" : String(n));

// แถวตัวชี้วัดในรายละเอียดรายคน — group = หัวข้อ, risk = ค่ามากกว่า 0 ควรดู
const ROWS: { group: string; label: string; get: (m: Metrics) => string; risk?: (m: Metrics) => boolean }[] = [
  { group: "ผลการส่ง", label: "อัตราส่งสำเร็จ", get: (m) => pct(m.success_rate) },
  { group: "ผลการส่ง", label: "ส่งสำเร็จ (ร้าน)", get: (m) => n0(m.done_stores) },
  { group: "ผลการส่ง", label: "ตีกลับ (ร้าน)", get: (m) => n0(m.back_stores), risk: (m) => m.back_stores > 0 },
  { group: "ผลการส่ง", label: "ค้างไม่ส่ง (ร้าน)", get: (m) => n0(m.leftover_stores), risk: (m) => m.leftover_stores > 0 },
  { group: "ผลการส่ง", label: "วันทำงาน", get: (m) => n0(m.work_days) },
  { group: "เวลา / ความเร็ว", label: "ขึ้นของแรก → ออกรถ", get: (m) => mins(m.avg_load_to_departure_min) },
  { group: "เวลา / ความเร็ว", label: "ออกรถ → ร้านแรก", get: (m) => mins(m.avg_departure_to_first_min) },
  { group: "เวลา / ความเร็ว", label: "ร้านต่อชั่วโมง", get: (m) => (m.stores_per_hour == null ? "-" : String(m.stores_per_hour)) },
  { group: "เวลา / ความเร็ว", label: "เวลาจบกะเฉลี่ย", get: (m) => m.avg_shift_end ?? "-" },
  { group: "ความถูกต้องหลักฐาน", label: "ส่งห่างจุดเดิม > 100 ม.", get: (m) => n0(m.location_bypass), risk: (m) => m.location_bypass > 0 },
  { group: "ความถูกต้องหลักฐาน", label: "สแกนลังข้าม (งาน)", get: (m) => n0(m.scan_bypass), risk: (m) => m.scan_bypass > 0 },
  { group: "ความถูกต้องหลักฐาน", label: "ไม่มีรูปหน้าร้าน", get: (m) => n0(m.missing_store_photo), risk: (m) => m.missing_store_photo > 0 },
  { group: "ความถูกต้องหลักฐาน", label: "ไม่มีลายเซ็นลูกค้า", get: (m) => n0(m.missing_customer_sign), risk: (m) => m.missing_customer_sign > 0 },
  { group: "พฤติกรรมเสี่ยง", label: "ขอ OTP ออกรถก่อน", get: (m) => n0(m.departure_requests), risk: (m) => m.departure_requests > 0 },
  { group: "พฤติกรรมเสี่ยง", label: "OTP ถูกปฏิเสธ", get: (m) => n0(m.departure_rejected), risk: (m) => m.departure_rejected > 0 },
  { group: "พฤติกรรมเสี่ยง", label: "โอนงานให้คนอื่น", get: (m) => n0(m.transfers_out), risk: (m) => m.transfers_out > 0 },
  { group: "พฤติกรรมเสี่ยง", label: "จบกะนอกพื้นที่บริษัท", get: (m) => n0(m.shift_end_outside), risk: (m) => m.shift_end_outside > 0 },
  { group: "พฤติกรรมเสี่ยง", label: "ของตีกลับยังไม่คืนคลัง", get: (m) => n0(m.back_not_returned), risk: (m) => m.back_not_returned > 0 },
];

function DriverDetail({ d, months }: { d: DriverMonthly; months: string[] }) {
  const cols = [...months.map((m) => ({ key: m, label: fmtMonth(m), m: d.months[m] })), { key: "total", label: "รวม", m: d.total }];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px] border-collapse min-w-[640px] [&_td]:border [&_th]:border [&_td]:border-slate-200 [&_th]:border-slate-200">
        <thead>
          <tr className="text-sm text-slate-700 bg-slate-50">
            <th className="text-left font-extrabold px-3 py-2 w-56">ตัวชี้วัด</th>
            {cols.map((c) => <th key={c.key} className={`text-right font-extrabold px-3 py-2 ${c.key === "total" ? "bg-blue-50 text-blue-700" : ""}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <Fragment key={r.label}>
              {(i === 0 || ROWS[i - 1].group !== r.group) && (
                <tr><td colSpan={cols.length + 1} className="px-3 pt-3 pb-1 text-sm font-extrabold text-blue-700 bg-blue-50/50">{r.group}</td></tr>
              )}
              <tr className="border-t border-slate-100">
                <td className="px-3 py-1.5 font-semibold text-slate-700">{r.label}</td>
                {cols.map((c) => {
                  const flagged = r.risk?.(c.m);
                  return (
                    <td key={c.key} className={`px-3 py-1.5 text-right tabular-nums ${c.key === "total" ? "bg-blue-50/60" : ""} ${flagged ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>
                      {flagged && <span className="text-amber-500 mr-1" aria-label="ควรตรวจสอบ">●</span>}
                      {r.get(c.m)}
                    </td>
                  );
                })}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface BackStore {
  time: string | null;
  mem_code: string;
  mem_name: string;
  route_code: string | null;
  route_name: string | null;
  box_amount: number;
  sh_runnings: string[];
  bill_notes: string[];
  status: string;
  returned_at: string | null;
  note: string | null;
  photo_url: string | null;
}

// รายละเอียดร้านที่ตีกลับของพนักงานคนนี้ในช่วงเดือนที่เลือก
function BackStores({ empCode, from, to }: { empCode: string; from: string; to: string }) {
  const [rows, setRows] = useState<BackStore[] | null>(null);
  const [limit, setLimit] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(false);
    axios.get<{ stores: BackStore[]; limit: number }>(`${API}/api/logistic/driver-performance/back-stores`, {
      params: { from, to, emp_code: empCode },
      headers: authHeader(),
    })
      .then((res) => { if (alive) { setRows(res.data.stores ?? []); setLimit(res.data.limit); } })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [empCode, from, to]);

  return (
    <div className="mt-4 px-1">
      <div className="text-base font-extrabold text-rose-700 mb-2">
        รายละเอียดร้านที่ตีกลับ {rows && <span className="tabular-nums">({rows.length}{rows.length >= limit ? "+" : ""} ครั้ง)</span>}
      </div>
      {error ? (
        <div className="text-sm text-slate-500">โหลดรายการตีกลับไม่สำเร็จ</div>
      ) : rows == null ? (
        <div className="text-sm text-slate-400">กำลังโหลด...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-400">ไม่มีร้านที่ตีกลับในช่วงนี้</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] border-collapse min-w-[960px] [&_td]:border [&_th]:border [&_td]:border-rose-100 [&_th]:border-rose-200">
            <thead>
              <tr className="bg-rose-50 text-rose-800 text-sm">
                <th className="text-left font-extrabold px-3 py-2">วันที่</th>
                <th className="text-left font-extrabold px-3 py-2">เวลา</th>
                <th className="text-left font-extrabold px-3 py-2">ร้าน</th>
                <th className="text-left font-extrabold px-3 py-2">เส้นทาง</th>
                <th className="text-left font-extrabold px-3 py-2">เลข SO</th>
                <th className="text-left font-extrabold px-3 py-2">เลขที่บิล</th>
                <th className="text-center font-extrabold px-3 py-2">ลัง</th>
                <th className="text-left font-extrabold px-3 py-2">เหตุผล</th>
                <th className="text-left font-extrabold px-3 py-2">คืนคลัง</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => (
                <tr key={`${b.mem_code}-${b.time}-${i}`} className="align-top">
                  <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{fmtDate(b.time)}</td>
                  <td className="px-3 py-2 font-bold text-slate-800 tabular-nums">{fmtTime(b.time)}</td>
                  <td className="px-3 py-2">
                    <div className="font-bold text-slate-800">{b.mem_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{b.mem_code}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{b.route_code ? <><b>{b.route_code}</b> {b.route_name ?? ""}</> : "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{b.sh_runnings.length ? b.sh_runnings.map((so) => <div key={so}>{so}</div>) : "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{b.bill_notes.length ? b.bill_notes.map((no) => <div key={no}>{no}</div>) : "-"}</td>
                  <td className="px-3 py-2 text-center tabular-nums font-semibold">{b.box_amount}</td>
                  <td className="px-3 py-2 text-rose-700 font-semibold break-words max-w-[260px]">
                    {b.note || "-"}
                    {b.photo_url && <a href={b.photo_url} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 font-semibold mt-0.5">ดูรูป</a>}
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    {b.returned_at
                      ? <span className="text-emerald-700 font-semibold">✓ {fmtDate(b.returned_at)} {fmtTime(b.returned_at)}</span>
                      : b.status === "ตีกลับ" ? <span className="text-amber-700 font-bold">! ยังไม่คืน</span> : <span className="text-slate-500">{b.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MonthlyPerformanceTab({ empQuery }: { empQuery: string }) {
  const thisMonth = dayjs().format("YYYY-MM");
  const [from, setFrom] = useState(dayjs().subtract(5, "month").format("YYYY-MM"));
  const [to, setTo] = useState(thisMonth);
  const [months, setMonths] = useState<string[]>([]);
  const [data, setData] = useState<DriverMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"worst" | "name">("worst");
  const [openEmp, setOpenEmp] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<{ months: string[]; drivers: DriverMonthly[] }>(`${API}/api/logistic/driver-performance/monthly`, {
        params: { from, to },
        headers: authHeader(),
      });
      setMonths(res.data.months ?? []);
      setData(res.data.drivers ?? []);
    } catch (e) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string })?.message : undefined;
      setError(msg ?? "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    const list = data.filter((d) => !q || d.emp_code.toLowerCase().includes(q) || d.emp_name.toLowerCase().includes(q));
    return [...list].sort((a, b) =>
      sortBy === "name" ? a.emp_name.localeCompare(b.emp_name, "th") : (a.total.success_rate ?? 101) - (b.total.success_rate ?? 101));
  }, [data, empQuery, sortBy]);

  // อัตราสำเร็จรวมทั้งทีมต่อเดือน (ถ่วงตามจำนวนร้าน ไม่ใช่เฉลี่ยของ %)
  const team = useMemo(() => Object.fromEntries([...months, "total"].map((m) => {
    const ms = rows.map((d) => (m === "total" ? d.total : d.months[m]));
    const done = ms.reduce((s, x) => s + x.done_stores, 0);
    const all = ms.reduce((s, x) => s + x.done_stores + x.back_stores + x.leftover_stores, 0);
    return [m, { rate: all ? Math.round((done / all) * 1000) / 10 : null, all }];
  })), [rows, months]);

  const exportExcel = () => {
    const metricRow = (m: Metrics) => ({
      "อัตราส่งสำเร็จ (%)": m.success_rate ?? "",
      "ส่งสำเร็จ (ร้าน)": m.done_stores,
      "ตีกลับ (ร้าน)": m.back_stores,
      "ค้างไม่ส่ง (ร้าน)": m.leftover_stores,
      "วันทำงาน": m.work_days,
      "ขึ้นของแรก→ออกรถ (นาที)": m.avg_load_to_departure_min ?? "",
      "ออกรถ→ร้านแรก (นาที)": m.avg_departure_to_first_min ?? "",
      "ร้านต่อชั่วโมง": m.stores_per_hour ?? "",
      "เวลาจบกะเฉลี่ย": m.avg_shift_end ?? "",
      "ส่งห่างจุดเดิม >100 ม.": m.location_bypass,
      "สแกนลังข้าม (งาน)": m.scan_bypass,
      "ไม่มีรูปหน้าร้าน": m.missing_store_photo,
      "ไม่มีลายเซ็นลูกค้า": m.missing_customer_sign,
      "ขอ OTP ออกรถก่อน": m.departure_requests,
      "OTP ถูกปฏิเสธ": m.departure_rejected,
      "โอนงานให้คนอื่น": m.transfers_out,
      "จบกะนอกพื้นที่บริษัท": m.shift_end_outside,
      "ของตีกลับยังไม่คืนคลัง": m.back_not_returned,
    });
    exportXlsx(`ประเมินขนส่ง_${from}_ถึง_${to}.xlsx`, [
      {
        name: "อัตราส่งสำเร็จ",
        rows: rows.map((d) => ({
          "รหัสพนักงาน": d.emp_code,
          "พนักงาน": d.emp_name,
          ...Object.fromEntries(months.map((m) => [fmtMonth(m), d.months[m].success_rate ?? ""])),
          "รวมทั้งช่วง": d.total.success_rate ?? "",
        })),
      },
      {
        name: "ตัวชี้วัดรายเดือน",
        rows: rows.flatMap((d) => [...months, "total"].map((m) => ({
          "รหัสพนักงาน": d.emp_code,
          "พนักงาน": d.emp_name,
          "เดือน": m === "total" ? "รวมทั้งช่วง" : fmtMonth(m),
          ...metricRow(m === "total" ? d.total : d.months[m]),
        }))),
      },
      {
        name: "หมายเหตุ",
        rows: [
          { "หัวข้อ": "อัตราส่งสำเร็จ", "รายละเอียด": "ร้านส่งสำเร็จ ÷ (ส่งสำเร็จ + ตีกลับ + ค้างไม่ส่ง) นับเป็นจำนวนร้าน" },
          { "หัวข้อ": "ตัดรอบ", "รายละเอียด": "สิ้นเดือนตามเวลาไทย" },
          { "หัวข้อ": "ค้างไม่ส่ง", "รายละเอียด": "งานที่ยังสถานะกำลังส่ง และขึ้นของก่อนวันนี้ (นับตามเดือนที่ขึ้นของ)" },
          { "หัวข้อ": "ข้อจำกัด", "รายละเอียด": "งานตีกลับที่ถูกขึ้นรถใหม่/โอนงาน จะนับให้พนักงานคนล่าสุด ตัวเลขรายคนเป็นค่าประมาณ" },
          { "หัวข้อ": "ไม่นับ", "รายละเอียด": "งานที่ Admin ยืนยันส่งแทน" },
        ],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* ตัวกรองช่วงเดือน + export — แถวเดียวเหนือข้อมูล */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-600">ตั้งแต่</label>
        <input type="month" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)}
          className="border border-blue-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white" />
        <label className="text-sm text-slate-600">ถึง</label>
        <input type="month" value={to} min={from} max={thisMonth} onChange={(e) => e.target.value && setTo(e.target.value)}
          className="border border-blue-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "worst" | "name")}
          className="border border-blue-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="worst">เรียง: อัตราสำเร็จต่ำสุดก่อน</option>
          <option value="name">เรียง: ชื่อ</option>
        </select>
        <button onClick={exportExcel} disabled={!rows.length || loading}
          className="ml-auto inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2 transition">
          {ExcelIcon} Export Excel
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="text-center py-24">
          <div className="text-slate-500 mb-4">{error}</div>
          <button onClick={load} className="bg-blue-600 text-white font-semibold rounded-xl px-5 py-2.5">ลองใหม่</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-blue-100 p-12 text-center text-slate-400">ไม่มีข้อมูลในช่วงที่เลือก</div>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-blue-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-blue-50">
            <div>
              <div className="font-extrabold text-lg text-slate-800">อัตราส่งสำเร็จรายเดือน</div>
              <div className="text-sm text-slate-500">ส่งสำเร็จ ÷ (สำเร็จ + ตีกลับ + ค้างไม่ส่ง) · ตัดรอบสิ้นเดือน · กดชื่อเพื่อดูตัวชี้วัด</div>
            </div>
            {/* legend — ทุกช่องมีตัวเลขกำกับ ไม่พึ่งสีอย่างเดียว */}
            <div className="ml-auto flex flex-wrap gap-3 text-sm text-slate-700">
              {(["perfect", "good", "warn", "bad"] as const).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 font-semibold">
                  <span className={`w-5 h-5 rounded grid place-items-center text-[11px] font-bold ${LEVEL[k].text} ${LEVEL[k].cell}`}>{LEVEL[k].icon}</span>
                  {LEVEL[k].label}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px] min-w-[760px] [&_td]:border [&_th]:border [&_td]:border-slate-200 [&_th]:border-blue-200">
              <thead>
                <tr className="bg-blue-50 text-blue-800 text-sm">
                  <th className="text-left font-extrabold px-4 py-3 sticky left-0 bg-blue-50">พนักงาน</th>
                  {months.map((m) => <th key={m} className="font-extrabold px-1 py-3 text-center">{fmtMonth(m)}</th>)}
                  <th className="font-extrabold px-3 py-3 text-center">รวม</th>
                  <th className="font-extrabold px-3 py-3 text-center" title="จำนวนตัวชี้วัดพฤติกรรมที่มีค่ามากกว่า 0 ในช่วงนี้">ควรตรวจสอบ</th>
                </tr>
                <tr className="text-sm text-slate-700 bg-slate-50">
                  <td className="px-4 py-2 font-extrabold sticky left-0 bg-slate-50">ทั้งทีม</td>
                  {[...months, "total"].map((m) => (
                    <td key={m} className="px-1 py-2 text-center tabular-nums font-extrabold">{pct(team[m]?.rate ?? null)}</td>
                  ))}
                  <td />
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const flags = ROWS.filter((r) => r.risk && r.group !== "ผลการส่ง" && r.risk(d.total)).length;
                  const open = openEmp === d.emp_code;
                  return (
                    <Fragment key={d.emp_code}>
                      <tr className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50/40 ${open ? "bg-blue-50/50" : ""}`} onClick={() => setOpenEmp(open ? null : d.emp_code)}>
                        <td className="px-4 py-2 sticky left-0 bg-inherit">
                          <div className="font-extrabold text-slate-900">{d.emp_name}</div>
                          <div className="text-xs text-slate-500 font-mono font-semibold">{d.emp_code}</div>
                        </td>
                        {[...months.map((m) => [m, d.months[m]] as const), ["total", d.total] as const].map(([m, x]) => {
                          const lv = level(x.success_rate);
                          return (
                            <td key={m} className="px-[2px] py-[2px]">
                              <div
                                className={`rounded-md h-14 flex flex-col items-center justify-center tabular-nums ${LEVEL[lv].cell} ${m === "total" ? "ring-2 ring-blue-300" : ""}`}
                                title={`${d.emp_name} · ${m === "total" ? "รวม" : fmtMonth(m)}\nส่งสำเร็จ ${x.done_stores} · ตีกลับ ${x.back_stores} · ค้าง ${x.leftover_stores} ร้าน`}
                              >
                                <span className={`text-lg font-extrabold leading-none ${LEVEL[lv].text}`}>{pct(x.success_rate)}</span>
                                {x.success_rate != null && <span className={`text-xs font-semibold mt-1 ${LEVEL[lv].sub}`}>{x.done_stores + x.back_stores + x.leftover_stores} ร้าน</span>}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          {flags > 0
                            ? <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-800 bg-amber-100 rounded-full px-2.5 py-0.5">● {flags} ข้อ</span>
                            : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-white">
                          <td colSpan={months.length + 3} className="px-2 pb-4 border-b border-blue-100">
                            <DriverDetail d={d} months={months} />
                            <BackStores empCode={d.emp_code} from={from} to={to} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
