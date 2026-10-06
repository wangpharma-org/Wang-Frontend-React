import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios, { AxiosError } from "axios";
import {
  APPROVAL_CODE_MAX_LENGTH,
  ApprovalInfo,
  VerifyResponse,
  approvalApiUrl,
  authHeaders,
} from "./noBarcodeApproval";

export interface ApprovalTarget {
  product_code: string;
  product_name: string;
  sh_running: string;
  so_running: string;
}

interface Props {
  target: ApprovalTarget;
  packerLabel: string;
  station: string;
  onApproved: (info: ApprovalInfo) => void;
  onClose: () => void;
}

const SHAKE_MS = 400;

export default function NoBarcodeApprovalModal({
  target,
  packerLabel,
  station,
  onApproved,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const lockSeconds = lockedUntil
    ? Math.max(0, Math.ceil((lockedUntil - now) / 1000))
    : 0;
  const locked = lockSeconds > 0;

  const dialogRef = useRef<HTMLDivElement>(null);

  // หน้า QC ดึง focus กลับช่องสแกนหลักเมื่อข้อมูลบิลอัปเดตผ่าน socket — กันไว้ไม่ให้รหัสบัตรถูกพิมพ์ลงช่องนั้น
  useEffect(() => {
    inputRef.current?.focus();
    const onFocusIn = (e: FocusEvent) => {
      if (!dialogRef.current?.contains(e.target as Node)) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  // ฟังทั้งหน้าต่าง เพราะตอนล็อกช่องรหัสถูก disable จะไม่ได้รับ keydown
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // นับถอยหลังตอนโดนล็อก แล้วคืน focus ให้เครื่องสแกนพิมพ์ต่อได้ทันทีที่ปลดล็อก
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null);
        setError(null);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const lockFor = (seconds: number) => {
    setNow(Date.now());
    setLockedUntil(Date.now() + seconds * 1000);
  };

  const reject = (message: string) => {
    setError(message);
    setCode("");
    setShake(true);
    window.setTimeout(() => setShake(false), SHAKE_MS);
    inputRef.current?.focus();
  };

  const submit = async () => {
    if (submitting || locked) return;
    if (!code.trim()) {
      setError("กรุณาสแกนบัตรผู้อนุมัติ");
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post<VerifyResponse>(
        `${approvalApiUrl}/verify`,
        { code, station, ...target },
        authHeaders()
      );
      const data = res.data;
      if (data.approved) {
        onApproved({
          emp_code: data.approver.emp_code,
          name: data.approver.name,
          approved_at: data.approved_at,
        });
        return;
      }
      reject(
        data.locked
          ? `สแกนผิดเกินกำหนด กรุณารอ ${data.retry_after} วินาที`
          : data.message
      );
      if (data.locked) lockFor(data.retry_after);
    } catch (err) {
      const res = (err as AxiosError<{ message?: string; retry_after?: number }>)
        .response;
      if (res?.status === 429 && res.data?.retry_after) {
        reject(`สแกนผิดเกินกำหนด กรุณารอ ${res.data.retry_after} วินาที`);
        lockFor(res.data.retry_after);
      } else {
        reject(res?.data?.message ?? "ตรวจสอบบัตรไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        // คลิกพื้นหลังแล้วคืน focus ให้ช่องรหัส ไม่ปิด modal กันกดพลาด
        if (e.target === e.currentTarget) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      <style>{`@keyframes nb-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}`}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nb-approval-title"
        className="w-[480px] max-w-[calc(100vw-32px)] rounded-2xl bg-white p-6 shadow-xl"
        style={shake ? { animation: `nb-shake ${SHAKE_MS}ms ease-in-out` } : undefined}
      >
        <div className="flex items-start justify-between">
          <h2 id="nb-approval-title" className="text-xl font-bold text-gray-800">
            สแกนบัตรผู้อนุมัติ
          </h2>
          <button
            type="button"
            className="cursor-pointer text-2xl leading-none text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="ปิด"
          >
            ×
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-1.5 rounded-xl bg-blue-50 p-4 text-base">
          <dt className="text-gray-500">รหัสสินค้า</dt>
          <dd className="font-bold text-gray-800">{target.product_code}</dd>
          <dt className="text-gray-500">เลขบิล</dt>
          <dd className="font-bold text-gray-800">{target.sh_running}</dd>
          <dt className="text-gray-500">ชื่อสินค้า</dt>
          <dd className="text-gray-800">{target.product_name}</dd>
          <dt className="text-gray-500">ผู้แพ็ค</dt>
          <dd className="text-gray-800">{packerLabel}</dd>
        </dl>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-center justify-between">
            <label htmlFor="nb-approval-code" className="text-sm font-medium text-gray-700">
              รหัสบัตรผู้อนุมัติ
            </label>
            <span className="text-sm tabular-nums text-gray-500">
              {code.length}/{APPROVAL_CODE_MAX_LENGTH}
            </span>
          </div>
          <input
            id="nb-approval-code"
            ref={inputRef}
            type="password"
            autoComplete="off"
            maxLength={APPROVAL_CODE_MAX_LENGTH}
            value={code}
            disabled={locked}
            onChange={(e) => {
              setCode(e.target.value);
              if (error && !locked) setError(null);
            }}
            className={`mt-1 w-full rounded-lg border-2 p-3 text-xl tracking-widest outline-none disabled:bg-gray-100 ${
              error ? "border-red-500" : "border-gray-300 focus:border-blue-500"
            }`}
          />
          <p className="mt-2 min-h-6 text-sm text-red-600" role="alert">
            {locked ? `ล็อกชั่วคราว อีก ${lockSeconds} วินาที` : error}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg bg-gray-200 px-5 py-2 text-gray-700 hover:bg-gray-300"
            >
              ยกเลิก (Esc)
            </button>
            <button
              type="submit"
              disabled={submitting || locked}
              className="cursor-pointer rounded-lg bg-green-500 px-5 py-2 font-bold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "กำลังตรวจสอบ..." : "ยืนยัน (Enter)"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
