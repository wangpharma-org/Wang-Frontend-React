import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, KeyRound, MessageSquare, Smartphone } from "lucide-react";
import {
  apiError,
  enableHrsoftOtp,
  enableTotp,
  EnableResult,
  METHOD_LABEL,
  setupTotp,
  TotpSetup,
  TwoFactorMethod,
} from "./twoFactor";

// OPHMBC-339 — สมัคร/เปลี่ยนวิธียืนยันตัวตน 2 ชั้น
// ใช้ทั้งหน้า login (token = enroll_ticket) และหน้าตั้งค่า (token = access token)

const inputCls =
  "block w-full rounded-md bg-white px-3 py-2 text-center text-lg tracking-[0.4em] text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500";
const btnCls =
  "flex w-full cursor-pointer justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

export function CodeInput({
  value,
  onChange,
  id,
  placeholder = "000000",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      maxLength={9}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.trim())}
      className={inputCls}
    />
  );
}

export function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      /* บางเบราว์เซอร์ไม่ให้คัดลอก — ให้จดเอง */
    }
  };
  return (
    <div className="space-y-4" data-backup-codes>
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        <b>เก็บรหัสสำรองไว้ในที่ปลอดภัย</b> ใช้แทนรหัส 6 หลักได้ครั้งละ 1 รหัส
        (เช่น มือถือหาย) · รหัสชุดนี้แสดงครั้งเดียว
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-base">
        {codes.map((c) => (
          <div key={c} className="rounded bg-gray-100 px-2 py-1 text-center">
            {c}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
      >
        <Copy size={16} /> {copied ? "คัดลอกแล้ว" : "คัดลอกรหัสสำรอง"}
      </button>
      <button type="button" onClick={onDone} className={btnCls} data-backup-done>
        จดรหัสสำรองแล้ว
      </button>
    </div>
  );
}

const METHOD_ICON: Record<TwoFactorMethod, typeof Smartphone> = {
  totp: Smartphone,
  hrsoft_otp: MessageSquare,
};

const METHOD_HINT: Record<TwoFactorMethod, string> = {
  totp: "สแกน QR ด้วย Google Authenticator / Microsoft Authenticator แล้วกรอกรหัส 6 หลักในแอปทุกครั้งที่เข้าระบบ",
  hrsoft_otp: "ใช้รหัส 6 หลักที่ได้ทาง LINE ตอนลงเวลาเข้างาน (ใช้ได้ช่วงเวลาที่ฝ่าย HR กำหนด)",
};

export default function TwoFactorSetup({
  methods,
  token,
  currentMethod,
  onEnabled,
}: {
  methods: TwoFactorMethod[];
  /** enroll_ticket (หน้า login) — ไม่ส่ง = access token ใน sessionStorage */
  token?: string;
  /** มีวิธีเดิมอยู่ = ต้องกรอกรหัสของวิธีเดิมก่อนเปลี่ยน */
  currentMethod?: TwoFactorMethod | null;
  onEnabled: (result: EnableResult) => void;
}) {
  const [method, setMethod] = useState<TwoFactorMethod | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(
    async (m: TwoFactorMethod) => {
      setMethod(m);
      setCode("");
      setError(null);
      if (m === "totp" && !setup) {
        setBusy(true);
        try {
          setSetup(await setupTotp(token));
        } catch (e) {
          setError(apiError(e).message);
        } finally {
          setBusy(false);
        }
      }
    },
    [setup, token]
  );

  // มีวิธีเดียว = เลือกให้เลย (TOTP สร้าง QR ทันที)
  const only = methods.length === 1 ? methods[0] : null;
  useEffect(() => {
    if (only && method === null) void pick(only);
  }, [only, method, pick]);

  if (methods.length === 0) {
    return (
      <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
        ระบบยังไม่พร้อมให้ตั้งค่ายืนยันตัวตน 2 ชั้น กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) return;
    setBusy(true);
    setError(null);
    try {
      const result =
        method === "totp"
          ? await enableTotp(code, currentCode || undefined, token)
          : await enableHrsoftOtp(code, currentCode || undefined, token);
      onEnabled(result);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-two-factor-setup>
      {methods.length > 1 && (
        <div className="grid gap-2">
          {methods.map((m) => {
            const Icon = METHOD_ICON[m];
            return (
              <button
                key={m}
                type="button"
                data-method={m}
                onClick={() => pick(m)}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition ${
                  method === m
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <Icon className="mt-0.5 shrink-0 text-blue-500" size={20} />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    {METHOD_LABEL[m]}
                    {currentMethod === m && " (ใช้อยู่)"}
                  </span>
                  <span className="block text-xs text-gray-500">{METHOD_HINT[m]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {methods.length === 1 && method && (
        <p className="text-sm text-gray-600">{METHOD_HINT[method]}</p>
      )}

      {method === "totp" && !setup && busy && (
        <p className="text-center text-sm text-gray-500">กำลังสร้าง QR...</p>
      )}

      {method && (method !== "totp" || setup) && (
        <form onSubmit={submit} className="space-y-4">
          {method === "totp" && setup && (
            <div className="flex flex-col items-center gap-2" data-totp-qr>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <QRCodeSVG value={setup.otpauth_uri} size={180} />
              </div>
              <p className="text-xs text-gray-500">สแกนไม่ได้? พิมพ์รหัสนี้ในแอป</p>
              <code
                className="break-all rounded bg-gray-100 px-2 py-1 text-center text-sm"
                data-totp-secret
              >
                {setup.secret.replace(/(.{4})/g, "$1 ").trim()}
              </code>
            </div>
          )}

          {currentMethod && (
            <div>
              <label htmlFor="current-code" className="mb-1 block text-sm font-medium text-gray-700">
                <KeyRound size={14} className="mr-1 inline" />
                รหัสของวิธีเดิม ({METHOD_LABEL[currentMethod]}) หรือรหัสสำรอง
              </label>
              <CodeInput id="current-code" value={currentCode} onChange={setCurrentCode} />
            </div>
          )}

          <div>
            <label htmlFor="new-code" className="mb-1 block text-sm font-medium text-gray-700">
              {method === "totp" ? "รหัส 6 หลักจากแอป" : "รหัส 6 หลักจาก LINE วันนี้"}
            </label>
            <CodeInput id="new-code" value={code} onChange={setCode} autoFocus />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-700" data-setup-error>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy || code.length < 6} className={btnCls}>
            {busy ? "กำลังตรวจสอบ..." : "ยืนยันและเปิดใช้"}
          </button>
        </form>
      )}

      {error && !method && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}
    </div>
  );
}
