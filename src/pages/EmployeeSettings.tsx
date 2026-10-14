import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Plus, RefreshCw, ScanLine, Search, Trash2, Users } from "lucide-react";
import {
  EmployeeSettingRow,
  errorMessage,
  fetchEmployeeSettings,
  FLOOR_OPTIONS,
  MAX_SCAN_WINDOWS,
  ScanWindow,
  updateEmployeeSettings,
} from "../components/employeeScanSetting";

// OPHMBC-316 — หน้าตั้งค่าพนักงาน: บังคับจัดออเดอร์แบบสแกนตามช่วงเวลา (หลายช่วง/วัน) + ชั้นประจำ
// เข้าได้เฉพาะ manage_qc = Yes (auth เช็คสิทธิ์จริง)

interface Draft {
  emp_floor: number | null;
  scan_required: boolean;
  scan_windows: ScanWindow[];
}

const toDraft = (row: EmployeeSettingRow): Draft => ({
  emp_floor: row.emp_floor,
  scan_required: row.scan_required,
  scan_windows: row.scan_windows.map((w) => ({ ...w })),
});

const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function EmployeeCard({
  row,
  onSaved,
}: {
  row: EmployeeSettingRow;
  onSaved: (row: EmployeeSettingRow) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(row));
  const [saving, setSaving] = useState(false);
  const original = useMemo(() => toDraft(row), [row]);
  const dirty = !sameDraft(draft, original);

  useEffect(() => setDraft(toDraft(row)), [row]);

  const setWindow = (index: number, key: keyof ScanWindow, value: string) =>
    setDraft((d) => ({
      ...d,
      scan_windows: d.scan_windows.map((w, i) => (i === index ? { ...w, [key]: value } : w)),
    }));

  const addWindow = () =>
    setDraft((d) => ({
      ...d,
      scan_windows: [...d.scan_windows, { start: "08:00", end: "12:00" }],
    }));

  const removeWindow = (index: number) =>
    setDraft((d) => ({
      ...d,
      scan_windows: d.scan_windows.filter((_, i) => i !== index),
    }));

  const save = async () => {
    if (draft.scan_required && draft.scan_windows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "ยังไม่ได้กำหนดช่วงเวลา",
        text: "เปิดบังคับสแกนต้องมีช่วงเวลาอย่างน้อย 1 ช่วง",
      });
      return;
    }
    if (draft.scan_windows.some((w) => !w.start || !w.end || w.start === w.end)) {
      Swal.fire({
        icon: "warning",
        title: "ช่วงเวลาไม่ถูกต้อง",
        text: "กรอกเวลาเริ่ม-สิ้นสุดให้ครบ และต้องไม่เท่ากัน",
      });
      return;
    }
    setSaving(true);
    try {
      const saved = await updateEmployeeSettings(row.emp_code, draft);
      onSaved({ ...row, ...saved });
      Swal.fire({
        icon: "success",
        title: "บันทึกแล้ว",
        text: `${row.emp_code} ${row.emp_nickname ?? ""}`.trim(),
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: errorMessage(err, "เกิดข้อผิดพลาด กรุณาลองใหม่"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid={`employee-card-${row.emp_code}`}
      className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
        dirty ? "border-amber-400" : "border-slate-200"
      } ${row.allowUsed ? "" : "opacity-60"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-800">
            {row.emp_code} {row.emp_nickname ? `(${row.emp_nickname})` : ""}
          </p>
          <p className="truncate text-sm text-slate-500">{row.emp_name || "-"}</p>
          {!row.allowUsed && <p className="text-xs font-semibold text-red-500">ปิดการใช้งานระบบ</p>}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
          ชั้น
          <select
            aria-label={`ชั้นของ ${row.emp_code}`}
            value={draft.emp_floor ?? ""}
            disabled={saving}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                emp_floor: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">-</option>
            {Array.from(new Set([...FLOOR_OPTIONS, ...(draft.emp_floor ? [draft.emp_floor] : [])]))
              .sort((a, b) => a - b)
              .map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
        <span className="text-sm font-medium text-slate-700">บังคับจัดแบบสแกน</span>
        <Switch
          checked={draft.scan_required}
          disabled={saving}
          onChange={() => setDraft((d) => ({ ...d, scan_required: !d.scan_required }))}
          label={`บังคับสแกน ${row.emp_code}`}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500">
          ช่วงเวลาที่ต้องสแกน (ทุกวัน · เวลาสิ้นสุดน้อยกว่าเวลาเริ่ม = ข้ามเที่ยงคืน)
        </p>
        {draft.scan_windows.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีช่วงเวลา</p>}
        {draft.scan_windows.map((w, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="time"
              aria-label={`เวลาเริ่มช่วงที่ ${index + 1}`}
              value={w.start}
              disabled={saving}
              onChange={(e) => setWindow(index, "start", e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="text-slate-400">–</span>
            <input
              type="time"
              aria-label={`เวลาสิ้นสุดช่วงที่ ${index + 1}`}
              value={w.end}
              disabled={saving}
              onChange={(e) => setWindow(index, "end", e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              aria-label={`ลบช่วงที่ ${index + 1}`}
              disabled={saving}
              onClick={() => removeWindow(index)}
              className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {draft.scan_windows.length < MAX_SCAN_WINDOWS && (
          <button
            type="button"
            disabled={saving}
            onClick={addWindow}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            <Plus size={16} /> เพิ่มช่วงเวลา
          </button>
        )}
      </div>

      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => setDraft(original)}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-600 disabled:opacity-40"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );
}

const EmployeeSettings = () => {
  const [rows, setRows] = useState<EmployeeSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyScan, setOnlyScan] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchEmployeeSettings());
      setForbidden(null);
    } catch (err) {
      const message = errorMessage(err, "โหลดข้อมูลไม่สำเร็จ");
      if ((err as { response?: { status?: number } }).response?.status === 403) {
        setForbidden(message);
      } else {
        Swal.fire({ icon: "error", title: "โหลดข้อมูลไม่สำเร็จ", text: message });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (showInactive || row.allowUsed) &&
        (!onlyScan || row.scan_required) &&
        (!keyword ||
          [row.emp_code, row.emp_name, row.emp_nickname ?? ""].some((v) =>
            v.toLowerCase().includes(keyword)
          ))
    );
  }, [rows, search, onlyScan, showInactive]);

  const scanCount = rows.filter((r) => r.allowUsed && r.scan_required).length;

  if (forbidden) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <p className="text-center text-xl font-bold text-red-600">{forbidden}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Users className="text-blue-600" />
              ตั้งค่าพนักงาน
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <ScanLine size={16} /> บังคับสแกนอยู่ {scanCount} คน · เวลาไทย
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> โหลดใหม่
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ค้นหารหัส / ชื่อ / ชื่อเล่น"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyScan} onChange={(e) => setOnlyScan(e.target.checked)} />
            เฉพาะที่บังคับสแกน
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            แสดงคนที่ปิดการใช้งาน
          </label>
        </div>

        {loading && rows.length === 0 ? (
          <p className="py-10 text-center text-slate-500">กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-slate-500">ไม่พบพนักงาน</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => (
              <EmployeeCard
                key={row.emp_code}
                row={row}
                onSaved={(saved) =>
                  setRows((prev) => prev.map((r) => (r.emp_code === saved.emp_code ? saved : r)))
                }
              />
            ))}
          </div>
        )}
        <p className="text-center text-xs text-slate-400">
          ชั้นและช่วงเวลาที่บันทึกมีผลกับหน้าจัดสินค้าภายใน 1 นาที ไม่ต้องออกจากระบบ
        </p>
      </div>
    </div>
  );
};

export default EmployeeSettings;
