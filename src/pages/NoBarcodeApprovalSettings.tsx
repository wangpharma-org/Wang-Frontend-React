import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { Copy, Eye, EyeOff, QrCode, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { downloadApprovalQrImage } from "../components/approvalQrImage";
import {
  ApprovalAction,
  ApprovalLog,
  ApprovalResult,
  ApprovalSettings,
  APPROVAL_CODE_MAX_LENGTH,
  approvalApiUrl,
  authHeaders,
} from "../components/noBarcodeApproval";

type Tab = "approvers" | "logs";
type LogFilter = "all" | ApprovalResult;

const MASK = "•".repeat(APPROVAL_CODE_MAX_LENGTH);

const ACTION_LABEL: Record<ApprovalAction, string> = {
  show_qr: "แสดง QR",
  barcode_update: "แก้บาร์โค้ด",
  barcode_delete: "ลบบาร์โค้ด",
  barcode_move_out: "ย้ายบาร์โค้ดออก",
};

const relatedLabel = (log: ApprovalLog) => {
  if (!log.related_product_code) return "";
  return log.action === "barcode_move_out"
    ? ` (ย้ายไปสินค้า ${log.related_product_code})`
    : ` (ย้ายมาจากสินค้า ${log.related_product_code})`;
};

type FlagKey = "enabled" | "barcode_edit_enabled" | "print_label_enabled";
const FLAG_CONFIG: Record<FlagKey, { path: string; title: string }> = {
  enabled: {
    path: "flag",
    title: "บังคับอนุมัติก่อนสแกนสินค้าที่ไม่มีบาร์โค้ด",
  },
  barcode_edit_enabled: {
    path: "barcode/flag",
    title: "แก้/ลบบาร์โค้ดจากหน้า QC (ต้องสแกนบัตร)",
  },
  print_label_enabled: {
    path: "print-label/flag",
    title: "หน้าพิมพ์ฉลาก QR บาร์โค้ดสินค้า",
  },
};

const errorMessage = (err: unknown) =>
  (err as AxiosError<{ message?: string }>).response?.data?.message ??
  "เกิดข้อผิดพลาด กรุณาลองใหม่";

const isAdmin = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user_info") || "{}")?.manage_product === "Yes";
  } catch {
    return false;
  }
};

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

const NoBarcodeApprovalSettings = () => {
  const admin = useMemo(isAdmin, []);
  const [tab, setTab] = useState<Tab>("approvers");
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyEmp, setBusyEmp] = useState<string | null>(null);
  const [flagBusy, setFlagBusy] = useState<FlagKey | null>(null);
  // รหัสเต็มเก็บไว้เฉพาะในหน้านี้ตอน admin กดแสดง/เพิ่งสร้าง
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const [logs, setLogs] = useState<ApprovalLog[]>([]);
  const [logCounts, setLogCounts] = useState({ all: 0, approved: 0, rejected: 0 });
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [logLoading, setLogLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await axios.get<ApprovalSettings>(`${approvalApiUrl}/settings`, authHeaders());
      setSettings(res.data);
    } catch (err) {
      Swal.fire({ icon: "error", title: "โหลดข้อมูลไม่สำเร็จ", text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async (filter: LogFilter) => {
    setLogLoading(true);
    try {
      const res = await axios.get<{ items: ApprovalLog[]; counts: typeof logCounts }>(
        `${approvalApiUrl}/logs`,
        { ...authHeaders(), params: { result: filter } }
      );
      setLogs(res.data.items);
      setLogCounts(res.data.counts);
    } catch (err) {
      Swal.fire({ icon: "error", title: "โหลด Log ไม่สำเร็จ", text: errorMessage(err) });
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!admin) return;
    void loadSettings();
    // ไม่ต้องรอผล — บันทึกพลาดไม่ควรทำให้ใช้งานหน้านี้ไม่ได้
    axios
      .post(`${approvalApiUrl}/audit`, { action: "view_page" }, authHeaders())
      .catch(() => undefined);
  }, [admin, loadSettings]);

  useEffect(() => {
    if (admin && tab === "logs") void loadLogs(logFilter);
  }, [admin, tab, logFilter, loadLogs]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = settings?.employees ?? [];
    if (!keyword) return rows;
    return rows.filter((emp) =>
      [emp.emp_code, emp.emp_name, emp.emp_nickname].some((v) =>
        v?.toLowerCase().includes(keyword)
      )
    );
  }, [settings, search]);

  const toggleFlag = async (key: FlagKey) => {
    if (!settings) return;
    const next = !settings[key];
    const action = next ? "เปิด" : "ปิด";
    const confirm = await Swal.fire({
      icon: "question",
      title: `${action}: ${FLAG_CONFIG[key].title}`,
      text: "มีผลกับหน้า QC ทุกเครื่องทันที",
      showCancelButton: true,
      confirmButtonText: `ยืนยัน${action}`,
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;
    setFlagBusy(key);
    try {
      await axios.put(
        `${approvalApiUrl}/${FLAG_CONFIG[key].path}`,
        { enabled: next },
        authHeaders()
      );
      setSettings({ ...settings, [key]: next });
    } catch (err) {
      Swal.fire({ icon: "error", title: "ปรับสถานะไม่สำเร็จ", text: errorMessage(err) });
    } finally {
      setFlagBusy(null);
    }
  };

  const toggleApprover = async (empCode: string, next: boolean) => {
    setBusyEmp(empCode);
    try {
      const res = await axios.put<{ is_enabled: boolean; code?: string }>(
        `${approvalApiUrl}/approvers/${encodeURIComponent(empCode)}`,
        { is_enabled: next },
        authHeaders()
      );
      if (res.data.code) {
        const code = res.data.code;
        setRevealed((prev) => ({ ...prev, [empCode]: code }));
      }
      await loadSettings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: errorMessage(err) });
    } finally {
      setBusyEmp(null);
    }
  };

  // ดึงจาก server ทุกครั้ง (ไม่ใช้ค่าที่แสดงค้างไว้) เพื่อให้การแสดง/คัดลอกถูกบันทึกลงประวัติทุกครั้ง
  const fetchCode = async (
    empCode: string,
    purpose: "reveal" | "copy" | "print"
  ): Promise<string | null> => {
    try {
      const res = await axios.get<{ code: string }>(
        `${approvalApiUrl}/approvers/${encodeURIComponent(empCode)}/code`,
        { ...authHeaders(), params: { purpose } }
      );
      return res.data.code;
    } catch (err) {
      Swal.fire({ icon: "error", title: "แสดงรหัสไม่สำเร็จ", text: errorMessage(err) });
      return null;
    }
  };

  const toggleReveal = async (empCode: string) => {
    if (revealed[empCode]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[empCode];
        return next;
      });
      return;
    }
    setBusyEmp(empCode);
    const code = await fetchCode(empCode, "reveal");
    if (code) setRevealed((prev) => ({ ...prev, [empCode]: code }));
    setBusyEmp(null);
  };

  const downloadQrImage = async (empCode: string) => {
    setBusyEmp(empCode);
    try {
      const code = await fetchCode(empCode, "print");
      if (!code) return;
      const emp = settings?.employees.find((e) => e.emp_code === empCode);
      await downloadApprovalQrImage({
        code,
        emp_code: empCode,
        name: emp
          ? `${emp.emp_name}${emp.emp_nickname ? ` (${emp.emp_nickname})` : ""}`
          : empCode,
      });
    } catch {
      Swal.fire({ icon: "error", title: "สร้างภาพ QR ไม่สำเร็จ", text: "กรุณาลองใหม่" });
    } finally {
      setBusyEmp(null);
    }
  };

  const copyCode = async (empCode: string) => {
    setBusyEmp(empCode);
    const code = await fetchCode(empCode, "copy");
    setBusyEmp(null);
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      Swal.fire({ icon: "success", title: "คัดลอกรหัสแล้ว", timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "คัดลอกไม่สำเร็จ", text: "เบราว์เซอร์ไม่อนุญาตให้คัดลอก" });
    }
  };

  const regenerate = async (empCode: string) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: `สร้างรหัสใหม่ให้ ${empCode}?`,
      text: "รหัสเดิมจะใช้ไม่ได้ทันที ต้องพิมพ์บาร์โค้ดบนบัตรใหม่",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "สร้างรหัสใหม่",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;
    setBusyEmp(empCode);
    try {
      const res = await axios.post<{ code: string }>(
        `${approvalApiUrl}/approvers/${encodeURIComponent(empCode)}/regenerate`,
        {},
        authHeaders()
      );
      setRevealed((prev) => ({ ...prev, [empCode]: res.data.code }));
      await loadSettings();
    } catch (err) {
      Swal.fire({ icon: "error", title: "สร้างรหัสไม่สำเร็จ", text: errorMessage(err) });
    } finally {
      setBusyEmp(null);
    }
  };

  if (!admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-xl font-bold text-red-600">เฉพาะผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <ShieldCheck className="text-blue-600" />
              อนุมัติสแกนสินค้าที่ไม่มีบาร์โค้ด
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ผู้มีสิทธิ์อนุมัติ {settings?.approver_count ?? 0} คน
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {(Object.keys(FLAG_CONFIG) as FlagKey[]).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-700">
                  {FLAG_CONFIG[key].title}
                </span>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings?.[key] ?? false}
                    disabled={!settings || flagBusy !== null}
                    onChange={() => void toggleFlag(key)}
                    label={FLAG_CONFIG[key].title}
                  />
                  <span
                    className={`w-6 text-sm font-bold ${settings?.[key] ? "text-green-600" : "text-slate-400"}`}
                  >
                    {settings?.[key] ? "เปิด" : "ปิด"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          {(
            [
              ["approvers", "ตั้งค่าสิทธิ์พนักงาน"],
              ["logs", "Log การอนุมัติ"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-base font-medium ${
                tab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "approvers" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <div className="relative max-w-sm">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหารหัส / ชื่อพนักงาน"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">รหัสพนักงาน</th>
                    <th className="px-4 py-3 font-medium">ชื่อ</th>
                    <th className="px-4 py-3 font-medium">สิทธิ์อนุมัติ</th>
                    <th className="px-4 py-3 font-medium">รหัสบัตรอนุมัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                        กำลังโหลด...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                        ไม่พบพนักงาน
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const busy = busyEmp === emp.emp_code;
                      const code = revealed[emp.emp_code];
                      return (
                        <tr key={emp.emp_code} className={emp.allow_used ? "" : "text-slate-400"}>
                          <td className="px-4 py-3 font-mono">{emp.emp_code}</td>
                          <td className="px-4 py-3">
                            {emp.emp_name}
                            {emp.emp_nickname && (
                              <span className="text-slate-500"> ({emp.emp_nickname})</span>
                            )}
                            {!emp.allow_used && (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                                ปิดการใช้งานระบบ
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Switch
                              checked={emp.is_enabled}
                              disabled={busy}
                              onChange={() => void toggleApprover(emp.emp_code, !emp.is_enabled)}
                              label={`สิทธิ์อนุมัติของ ${emp.emp_code}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {emp.has_code ? (
                              <div className="flex items-center gap-2">
                                <span className="min-w-[200px] font-mono tracking-wider">
                                  {code ?? MASK}
                                </span>
                                <button
                                  type="button"
                                  title={code ? "ซ่อน" : "แสดง"}
                                  disabled={busy}
                                  onClick={() => void toggleReveal(emp.emp_code)}
                                  className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                >
                                  {code ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button
                                  type="button"
                                  title="คัดลอก"
                                  disabled={busy}
                                  onClick={() => void copyCode(emp.emp_code)}
                                  className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  type="button"
                                  title="ดาวน์โหลดภาพ QR"
                                  disabled={busy}
                                  onClick={() => void downloadQrImage(emp.emp_code)}
                                  className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                >
                                  <QrCode size={16} />
                                </button>
                                <button
                                  type="button"
                                  title="สร้างรหัสใหม่"
                                  disabled={busy}
                                  onClick={() => void regenerate(emp.emp_code)}
                                  className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                >
                                  <RefreshCw size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
              {(
                [
                  ["all", "ทั้งหมด", logCounts.all],
                  ["approved", "อนุมัติ", logCounts.approved],
                  ["rejected", "ไม่ผ่าน", logCounts.rejected],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLogFilter(key)}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium ${
                    logFilter === key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">วันเวลา</th>
                    <th className="px-4 py-3 font-medium">ผู้อนุมัติ</th>
                    <th className="px-4 py-3 font-medium">ประเภท</th>
                    <th className="px-4 py-3 font-medium">บาร์โค้ด (เดิม → ใหม่)</th>
                    <th className="px-4 py-3 font-medium">รหัสสินค้า</th>
                    <th className="px-4 py-3 font-medium">รายละเอียดสินค้า</th>
                    <th className="px-4 py-3 font-medium">เลขบิล</th>
                    <th className="px-4 py-3 font-medium">ผู้แพ็คที่ได้รับอนุมัติ</th>
                    <th className="px-4 py-3 font-medium">ผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                        กำลังโหลด...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                        ยังไม่มี Log
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                          {dayjs(log.created_at).format("DD/MM/YYYY HH:mm:ss")}
                        </td>
                        <td className="px-4 py-3">
                          {log.approver_emp_code
                            ? `${log.approver_emp_code} ${log.approver_name ?? ""}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ACTION_LABEL[log.action] ?? log.action}
                        </td>
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          {log.barcode_slot
                            ? `ช่อง ${log.barcode_slot}: ${log.old_barcode ?? "(ว่าง)"} → ${
                                log.new_barcode ?? "ลบ"
                              }${relatedLabel(log)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono">{log.product_code}</td>
                        <td className="px-4 py-3">{log.product_name ?? "-"}</td>
                        <td className="px-4 py-3 font-mono">{log.sh_running}</td>
                        <td className="px-4 py-3">
                          {log.packer_emp_code} {log.packer_name ?? ""}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              log.result === "approved"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {log.result === "approved" ? "อนุมัติ" : "ไม่ผ่าน"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NoBarcodeApprovalSettings;
