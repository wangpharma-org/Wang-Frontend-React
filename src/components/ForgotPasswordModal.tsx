import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, UserRoundCog, X } from "lucide-react";

const authUrl = `${import.meta.env.VITE_API_URL_AUTH}/api/auth/forgot-password`;
const DEFAULT_RESET_URL = "https://hr.wangpharma.com/forgot-password";

/**
 * OPHMBC-325 — ลืมรหัสผ่าน (รหัสเดียวกับระบบ HR · แบบระบบขาย) มีสองทาง:
 *   1. รีเซ็ตเองด้วย OTP ที่หน้าเว็บ HRSoft (ลิงก์จาก GET /auth/forgot-password)
 *   2. ขอให้ HR ออกรหัสชั่วคราว (POST /auth/forgot-password — auth ส่งต่อให้ HRSoft)
 */
export default function ForgotPasswordModal({
  open,
  onClose,
  initialEmpCode,
}: {
  open: boolean;
  onClose: () => void;
  initialEmpCode: string;
}) {
  const [resetUrl, setResetUrl] = useState(DEFAULT_RESET_URL);
  const [empCode, setEmpCode] = useState(initialEmpCode);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmpCode(initialEmpCode);
    setResult(null);
    axios
      .get<{ reset_url?: string }>(authUrl)
      .then((res) => res.data.reset_url && setResetUrl(res.data.reset_url))
      .catch(() => undefined);
  }, [open, initialEmpCode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const requestHr = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = empCode.trim();
    if (!code) return;
    setSending(true);
    setResult(null);
    try {
      const res = await axios.post<{ ok: boolean; already_pending: boolean }>(authUrl, { emp_code: code });
      setResult({
        ok: true,
        text: res.data.already_pending
          ? "ส่งคำขอไว้แล้ว รอ HR ติดต่อพร้อมรหัสผ่านชั่วคราว"
          : "ส่งคำขอถึง HR แล้ว HR จะรีเซ็ตและแจ้งรหัสผ่านชั่วคราวให้คุณโดยตรง",
      });
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      setResult({
        ok: false,
        text: typeof message === "string" ? message : "ติดต่อระบบ HR ไม่ได้ กรุณาลองใหม่ หรือติดต่อ HR โดยตรง",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-forgot-dialog
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">ลืมรหัสผ่าน</h3>
            <p className="mt-1 text-sm text-gray-500">
              รหัสผ่านเข้าระบบคือรหัสเดียวกับระบบ HR (HRSoft) เลือกทางที่ตรงกับคุณ
            </p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer text-gray-400 hover:text-gray-600" aria-label="ปิด">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold text-gray-900">รีเซ็ตเองด้วย OTP</p>
                <p className="text-sm text-gray-500">
                  ระบบ HR ส่งรหัส OTP ไปทาง LINE ที่ผูกไว้ หรืออีเมล แล้วตั้งรหัสใหม่ที่หน้าเว็บของ HR
                </p>
                <a
                  href={resetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  data-forgot-otp
                >
                  <ExternalLink className="h-4 w-4" /> เปิดหน้ารีเซ็ตรหัสผ่านของ HR
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <UserRoundCog className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold text-gray-900">ขอให้ HR ออกรหัสผ่านชั่วคราว</p>
                <p className="text-sm text-gray-500">
                  สำหรับคนที่ยังไม่ได้ผูก LINE กับระบบ HR หรือรับ OTP ไม่ได้ — คำขอส่งถึง HR โดยตรง
                </p>
                <form className="flex flex-wrap items-end gap-2" onSubmit={requestHr}>
                  <div>
                    <label htmlFor="forgot-emp-code" className="block text-xs font-medium text-gray-700">
                      รหัสพนักงาน
                    </label>
                    <input
                      id="forgot-emp-code"
                      value={empCode}
                      onChange={(e) => setEmpCode(e.target.value)}
                      inputMode="numeric"
                      className="mt-1 block w-36 rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500"
                      data-forgot-emp
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !empCode.trim()}
                    className="inline-flex cursor-pointer items-center rounded-md bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    data-forgot-request
                  >
                    {sending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    ส่งคำขอถึง HR
                  </button>
                </form>
                {result && (
                  <p
                    className={result.ok ? "flex items-start gap-1.5 text-sm text-emerald-700" : "text-sm text-red-600"}
                    data-forgot-result={result.ok ? "ok" : "error"}
                  >
                    {result.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                    {result.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
