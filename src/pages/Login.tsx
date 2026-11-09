import { useAuth, LoginResult } from "../context/AuthContext"
import { useCallback, useState } from "react";
import logoMini from "../assets/logoMini.svg";
import { useNavigate } from "react-router";
import { Bounce, ToastContainer, toast } from "react-toastify";
import Swal from "sweetalert2";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import TwoFactorSetup, { BackupCodes, CodeInput } from "../components/TwoFactorSetup";
import {
  apiError,
  EnableResult,
  METHOD_LABEL,
  TwoFactorMethod,
  verifyChallenge,
} from "../components/twoFactor";

// OPHMBC-339 — หลังรหัสผ่าน อาจต้องยืนยันตัวตนอีกชั้น:
//   hrsoft_totp = TOTP ของ HRSoft (403 TOTP_REQUIRED) → ส่งรหัสพร้อม login ใหม่
//   two_factor  = 2FA ของ auth (403 TWO_FACTOR_REQUIRED) → ส่งรหัส + challenge_ticket ที่ /auth/2fa/verify
//   enroll      = ถูกบังคับแต่ยังไม่สมัคร (403 TWO_FACTOR_ENROLL_REQUIRED) → สมัครด้วย enroll_ticket แล้วเข้าระบบเลย
type Step =
  | { kind: "password" }
  | { kind: "hrsoft_totp" }
  | { kind: "two_factor"; method: TwoFactorMethod; ticket: string }
  | { kind: "enroll"; ticket: string; methods: TwoFactorMethod[] }
  | { kind: "backup"; result: EnableResult };

const toastError = (msg: string) =>
  toast.error(msg, {
    position: "top-center",
    autoClose: 2500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Bounce,
  });

const inputCls =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6";
const btnCls =
  "flex w-full cursor-pointer justify-center rounded-md bg-blue-500 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

const asMethod = (v: unknown): TwoFactorMethod =>
  v === "hrsoft_otp" ? "hrsoft_otp" : "totp";

const Login = () => {
  const { login, completeLogin, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<Step>({ kind: "password" })
  const [code, setCode] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const closeForgot = useCallback(() => setForgotOpen(false), [])
  const navigate = useNavigate()

  const backToPassword = () => {
    setStep({ kind: "password" })
    setCode('')
    setTotpCode('')
  }

  /** ผล login ที่ไม่ผ่าน → ไปขั้นถัดไป หรือแจ้งเหตุผล */
  const handleFailure = async (result: Extract<LoginResult, { ok: false }>) => {
    const data = result.data ?? {}
    switch (result.code) {
      case 'ATTENDANCE_REQUIRED':
        // OPHMBC-325 — ยังไม่ลงเวลาเข้างาน (หรือลงเวลาออกแล้ว) ใช้ระบบไม่ได้ · แจ้งเตือนอย่างเดียว ไม่มีลิงก์ไปลงเวลา
        await Swal.fire({
          icon: 'warning',
          title: 'ยังเข้าใช้งานไม่ได้',
          text: result.message || 'กรุณาลงเวลาเข้างานก่อนเข้าใช้ระบบ',
          confirmButtonText: 'ตกลง',
        })
        return
      case 'TOTP_REQUIRED':
        // รอบแรกยังไม่ได้ส่งรหัส = ถามรหัส · ส่งแล้วยังได้ = รหัสผิด
        if (step.kind === 'hrsoft_totp') toastError(result.message || 'รหัส 6 หลักไม่ถูกต้อง')
        setStep({ kind: 'hrsoft_totp' })
        setTotpCode('')
        return
      case 'TWO_FACTOR_REQUIRED':
        setStep({
          kind: 'two_factor',
          method: asMethod(data.method),
          ticket: String(data.challenge_ticket ?? ''),
        })
        setCode('')
        return
      case 'TWO_FACTOR_ENROLL_REQUIRED':
        setStep({
          kind: 'enroll',
          ticket: String(data.enroll_ticket ?? ''),
          methods: Array.isArray(data.methods) ? data.methods.map(asMethod) : [],
        })
        return
      default:
        // ข้อความจาก auth ตรงเคส (รหัสผิด / ถูกระงับ / HRSoft ไม่พร้อม / ล็อค ฯลฯ) — ไม่มีให้ใช้ข้อความเดิม
        toastError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true)
    try {
      const result = await login(username, password, {
        totpCode: step.kind === 'hrsoft_totp' ? totpCode : undefined,
      })
      if (!result.ok) await handleFailure(result)
    } finally {
      setBusy(false)
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== 'two_factor') return
    setBusy(true)
    try {
      const tokens = await verifyChallenge(step.ticket, code)
      completeLogin(tokens.access_token, tokens.refresh_token)
    } catch (err) {
      const { code: errCode, message } = apiError(err)
      if (errCode === 'TWO_FACTOR_TICKET_EXPIRED') {
        backToPassword()
        toastError(message)
        return
      }
      if (errCode === 'TWO_FACTOR_LOCKED') backToPassword()
      setCode('')
      toastError(message)
    } finally {
      setBusy(false)
    }
  };

  /** สมัครด้วยตั๋วเสร็จ — โชว์รหัสสำรองก่อน แล้วค่อยเข้าระบบ */
  const handleEnrolled = (result: EnableResult) => setStep({ kind: 'backup', result })

  const finishBackup = () => {
    if (step.kind !== 'backup') return
    const { access_token, refresh_token } = step.result
    if (access_token && refresh_token) {
      completeLogin(access_token, refresh_token)
    } else {
      backToPassword()
    }
  }

  if (isAuthenticated) {
    navigate('/')
  }

  const title =
    step.kind === 'password' ? 'เข้าสู่ระบบ'
    : step.kind === 'enroll' ? 'ตั้งค่ายืนยันตัวตน 2 ชั้น'
    : step.kind === 'backup' ? 'รหัสสำรอง'
    : 'ยืนยันตัวตน'

    return (
      <>
        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 pt-35">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <img
              alt="Your Company"
              src={logoMini}
              className="mx-auto h-14 w-auto"
            />
            <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
              {title}
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            {step.kind === 'password' && (
            <form action="#" method="POST" className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
                  ชื่อผู้ใช้ (Username)
                </label>
                <div className="mt-2">
                  <input
                    id = "username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                    รหัสผ่าน (Password)
                  </label>
                </div>
                <div className="mt-2">
                  <input
                  id = "password"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>
                {/* OPHMBC-325 — รหัสผ่านเป็นของระบบ HR: รีเซ็ตเองด้วย OTP หรือขอ HR ออกรหัสชั่วคราว (แบบระบบขาย) */}
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="cursor-pointer text-sm font-medium text-blue-500 hover:text-blue-600 hover:underline"
                    data-forgot-password
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
              </div>

              <div>
                <button
                  onClick={handleLogin}
                  disabled={busy}
                  className={btnCls}
                >
                  เข้าสู่ระบบ
                </button>
              </div>
            </form>
            )}

            {/* รหัส 6 หลักของ HRSoft (ตั้งไว้ที่ระบบ HR) */}
            {step.kind === 'hrsoft_totp' && (
              <form onSubmit={handleLogin} className="space-y-6" data-step="hrsoft-totp">
                <p className="text-center text-sm text-gray-600">
                  กรอกรหัส 6 หลักจากแอป Authenticator ที่ผูกกับ<b>ระบบ HR</b> (หรือรหัสสำรองของระบบ HR)
                </p>
                <CodeInput id="hrsoft-totp" value={totpCode} onChange={setTotpCode} autoFocus />
                <button type="submit" disabled={busy || totpCode.length < 6} className={btnCls}>
                  {busy ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
                </button>
                <BackLink onClick={backToPassword} />
              </form>
            )}

            {/* 2FA ของระบบคลัง (auth) */}
            {step.kind === 'two_factor' && (
              <form onSubmit={handleVerify} className="space-y-6" data-step="two-factor">
                <p className="text-center text-sm text-gray-600">
                  {step.method === 'totp'
                    ? 'กรอกรหัส 6 หลักจากแอป Authenticator ของระบบคลัง'
                    : 'กรอกรหัส 6 หลักที่ได้ทาง LINE ตอนลงเวลาเข้างาน'}
                </p>
                <p className="text-center text-xs text-gray-400">
                  ({METHOD_LABEL[step.method]} · ใช้รหัสสำรอง XXXX-XXXX แทนได้)
                </p>
                <CodeInput id="two-factor-code" value={code} onChange={setCode} autoFocus />
                <button type="submit" disabled={busy || code.length < 6} className={btnCls}>
                  {busy ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
                </button>
                <BackLink onClick={backToPassword} />
              </form>
            )}

            {step.kind === 'enroll' && (
              <div className="space-y-4" data-step="enroll">
                <p className="text-sm text-gray-600">
                  บัญชีนี้ต้องใช้การยืนยันตัวตน 2 ชั้น เลือกวิธีที่สะดวกแล้วตั้งค่าให้เสร็จภายใน 10 นาที
                </p>
                <TwoFactorSetup
                  methods={step.methods}
                  token={step.ticket}
                  onEnabled={handleEnrolled}
                />
                <BackLink onClick={backToPassword} />
              </div>
            )}

            {step.kind === 'backup' && (
              <BackupCodes codes={step.result.backup_codes} onDone={finishBackup} />
            )}
          </div>
        </div>
        <ForgotPasswordModal open={forgotOpen} onClose={closeForgot} initialEmpCode={username} />
      </>
    )
  }

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full cursor-pointer text-center text-sm text-gray-500 hover:text-gray-700 hover:underline"
    >
      กลับไปหน้าเข้าสู่ระบบ
    </button>
  )
}
export default Login
