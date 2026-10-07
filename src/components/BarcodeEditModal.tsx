import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios, { AxiosError } from "axios";
import {
  APPROVAL_CODE_MAX_LENGTH,
  ApprovalInfo,
  BARCODE_FIELD,
  BARCODE_SLOTS,
  BarcodeSlot,
  BarcodeSource,
  ChangeBarcodeResponse,
  ProductBarcodes,
  approvalApiUrl,
  authHeaders,
} from "./noBarcodeApproval";

export interface BarcodeEditTarget {
  product_name: string;
  sh_running: string;
  so_running: string;
  barcodes: ProductBarcodes;
}

interface Props {
  target: BarcodeEditTarget;
  packerLabel: string;
  station: string;
  onSaved: (
    product: ProductBarcodes,
    info: ApprovalInfo,
    movedFrom: ProductBarcodes[]
  ) => void;
  onClose: () => void;
}

type Step = "pick" | "input" | "card";
type Change = {
  action: "update" | "delete";
  slot: BarcodeSlot;
  barcode?: string;
  move_from_others?: boolean;
};

const SHAKE_MS = 400;
const BARCODE_MAX_LENGTH = 50;

const sourceLabel = (source: BarcodeSource) =>
  `${source.product_code} ${source.product_name} (ช่อง ${source.slots.join(", ")})`;

const errorOf = (err: unknown, fallback: string) => {
  const message = (err as AxiosError<{ message?: string | string[] }>).response
    ?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? fallback;
};

export default function BarcodeEditModal({
  target,
  packerLabel,
  station,
  onSaved,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [change, setChange] = useState<Change | null>(null);
  const [newBarcode, setNewBarcode] = useState("");
  // บาร์โค้ดไปซ้ำกับสินค้าอื่น — ให้เลือกย้ายมาได้ ถ้าอันนั้นใส่ผิด
  const [conflict, setConflict] = useState<BarcodeSource[] | null>(null);
  const [moves, setMoves] = useState<BarcodeSource[]>([]);
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
  const current = (slot: BarcodeSlot) =>
    target.barcodes[BARCODE_FIELD[slot]]?.trim() || null;

  // ทุกขั้นที่มีช่องพิมพ์ ให้ focus อยู่ในช่องเสมอ — หน้า QC ดึง focus กลับช่องสแกนหลักเมื่อ socket อัปเดต
  useEffect(() => {
    inputRef.current?.focus();
    const onFocusIn = (e: FocusEvent) => {
      if (inputRef.current && !dialogRef.current?.contains(e.target as Node)) {
        inputRef.current.focus();
      }
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), SHAKE_MS);
    inputRef.current?.focus();
  };

  const lockFor = (seconds: number) => {
    setNow(Date.now());
    setLockedUntil(Date.now() + seconds * 1000);
  };

  const goTo = (next: Step) => {
    setError(null);
    setConflict(null);
    setCode("");
    setStep(next);
  };

  // ตรวจค่ากับ server ก่อนให้สแกนบัตร — ค่าผิดจะไม่ถูกนับเป็นการสแกนบัตรผิด
  const validate = async (next: Change) => {
    setSubmitting(true);
    try {
      const res = await axios.post<{ move_from: BarcodeSource[] }>(
        `${approvalApiUrl}/barcode/validate`,
        { product_code: target.barcodes.product_code, ...next },
        authHeaders()
      );
      setChange(next);
      setMoves(res.data.move_from ?? []);
      goTo("card");
    } catch (err) {
      const data = (err as AxiosError<{ move_from?: BarcodeSource[] }>).response
        ?.data;
      setConflict(data?.move_from?.length ? data.move_from : null);
      fail(errorOf(err, "ตรวจสอบบาร์โค้ดไม่สำเร็จ กรุณาลองใหม่"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitBarcode = () => {
    if (submitting || !change) return;
    const barcode = newBarcode.trim();
    if (!barcode) {
      fail("กรุณาสแกนบาร์โค้ดใหม่");
      return;
    }
    void validate({ action: "update", slot: change.slot, barcode });
  };

  const submitCard = async () => {
    if (submitting || locked || !change) return;
    if (!code.trim()) {
      fail("กรุณาสแกนบัตรผู้อนุมัติ");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post<ChangeBarcodeResponse>(
        `${approvalApiUrl}/barcode`,
        {
          code,
          station,
          product_code: target.barcodes.product_code,
          sh_running: target.sh_running,
          so_running: target.so_running,
          ...change,
        },
        authHeaders()
      );
      const data = res.data;
      if (data.approved) {
        onSaved(
          data.product,
          {
            emp_code: data.approver.emp_code,
            name: data.approver.name,
            approved_at: data.approved_at,
          },
          data.moved_from ?? []
        );
        return;
      }
      setCode("");
      fail(
        data.locked
          ? `สแกนผิดเกินกำหนด กรุณารอ ${data.retry_after} วินาที`
          : data.message
      );
      if (data.locked) lockFor(data.retry_after);
    } catch (err) {
      const res = (err as AxiosError<{ message?: string; retry_after?: number }>)
        .response;
      setCode("");
      if (res?.status === 429 && res.data?.retry_after) {
        fail(`สแกนผิดเกินกำหนด กรุณารอ ${res.data.retry_after} วินาที`);
        lockFor(res.data.retry_after);
      } else {
        fail(errorOf(err, "บันทึกไม่สำเร็จ กรุณาลองใหม่"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const summary = change && (
    <div className="rounded-lg bg-amber-50 p-3 text-base text-gray-800">
      <p>
        ช่อง {change.slot}:{" "}
        <span className="font-mono">{current(change.slot) ?? "(ว่าง)"}</span>
        {change.action === "delete" ? (
          <span className="font-bold text-red-600"> → ลบ</span>
        ) : (
          <>
            {" → "}
            <span className="font-mono font-bold text-green-700">{change.barcode}</span>
          </>
        )}
      </p>
      {moves.map((source) => (
        <p key={source.product_code} className="mt-1 text-sm text-red-700">
          และลบ <span className="font-mono">{change.barcode}</span> ออกจากสินค้า{" "}
          {sourceLabel(source)}
        </p>
      ))}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      <style>{`@keyframes be-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}`}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-edit-title"
        className="w-[520px] max-w-[calc(100vw-32px)] rounded-2xl bg-white p-6 shadow-xl"
        style={shake ? { animation: `be-shake ${SHAKE_MS}ms ease-in-out` } : undefined}
      >
        <div className="flex items-start justify-between">
          <h2 id="barcode-edit-title" className="text-xl font-bold text-gray-800">
            {step === "card" ? "สแกนบัตรผู้อนุมัติ" : "แก้ไขบาร์โค้ดสินค้า"}
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
          <dd className="font-bold text-gray-800">{target.barcodes.product_code}</dd>
          <dt className="text-gray-500">ชื่อสินค้า</dt>
          <dd className="text-gray-800">{target.product_name}</dd>
          <dt className="text-gray-500">เลขบิล</dt>
          <dd className="text-gray-800">{target.sh_running}</dd>
          <dt className="text-gray-500">ผู้แพ็ค</dt>
          <dd className="text-gray-800">{packerLabel}</dd>
        </dl>

        {step === "pick" && (
          <>
            <ul className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200">
              {BARCODE_SLOTS.map((slot) => {
                const value = current(slot);
                return (
                  <li key={slot} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-14 text-sm text-gray-500">ช่อง {slot}</span>
                    <span
                      className={`flex-1 font-mono text-lg ${value ? "text-gray-800" : "text-gray-400"}`}
                    >
                      {value ?? "(ว่าง)"}
                    </span>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setChange({ action: "update", slot });
                        setNewBarcode("");
                        goTo("input");
                      }}
                      className="cursor-pointer rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      {value ? "แก้" : "เพิ่ม"}
                    </button>
                    <button
                      type="button"
                      disabled={!value || submitting}
                      onClick={() => void validate({ action: "delete", slot })}
                      className="cursor-pointer rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ลบ
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 min-h-6 text-sm text-red-600" role="alert">
              {error}
            </p>
            <p className="text-xs text-gray-500">
              แก้ในระบบหยิบสินค้าเท่านั้น ถ้า EasyAcc ส่งข้อมูลสินค้านี้มาใหม่ ค่าที่แก้จะถูกแทนที่
            </p>
          </>
        )}

        {step === "input" && change && (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              submitBarcode();
            }}
          >
            <label htmlFor="barcode-edit-new" className="text-sm font-medium text-gray-700">
              สแกนบาร์โค้ดใหม่สำหรับช่อง {change.slot}{" "}
              <span className="text-gray-400">(เดิม: {current(change.slot) ?? "ว่าง"})</span>
            </label>
            <input
              id="barcode-edit-new"
              ref={inputRef}
              autoComplete="off"
              maxLength={BARCODE_MAX_LENGTH}
              value={newBarcode}
              onChange={(e) => {
                setNewBarcode(e.target.value);
                if (error) setError(null);
                setConflict(null);
              }}
              className={`mt-1 w-full rounded-lg border-2 p-3 font-mono text-xl outline-none ${
                error ? "border-red-500" : "border-gray-300 focus:border-blue-500"
              }`}
            />
            <p className="mt-2 min-h-6 text-sm text-red-600" role="alert">
              {error}
            </p>
            {conflict && (
              <div className="mt-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-gray-800">
                <p>ถ้าสินค้าด้านล่างใส่บาร์โค้ดนี้ผิด ย้ายมาที่สินค้านี้ได้ ระบบจะลบออกจากสินค้านั้นให้</p>
                <ul className="mt-1 list-disc pl-5">
                  {conflict.map((source) => (
                    <li key={source.product_code}>{sourceLabel(source)}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    void validate({
                      action: "update",
                      slot: change.slot,
                      barcode: newBarcode.trim(),
                      move_from_others: true,
                    })
                  }
                  className="mt-2 cursor-pointer rounded-lg bg-orange-500 px-4 py-1.5 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  ย้ายมาที่สินค้านี้
                </button>
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => goTo("pick")}
                className="cursor-pointer rounded-lg bg-gray-200 px-5 py-2 text-gray-700 hover:bg-gray-300"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer rounded-lg bg-blue-500 px-5 py-2 font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "กำลังตรวจสอบ..." : "ถัดไป (Enter)"}
              </button>
            </div>
          </form>
        )}

        {step === "card" && change && (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCard();
            }}
          >
            {summary}
            <div className="mt-4 flex items-center justify-between">
              <label htmlFor="barcode-edit-card" className="text-sm font-medium text-gray-700">
                รหัสบัตรผู้อนุมัติ
              </label>
              <span className="text-sm tabular-nums text-gray-500">
                {code.length}/{APPROVAL_CODE_MAX_LENGTH}
              </span>
            </div>
            <input
              id="barcode-edit-card"
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
                onClick={() => goTo(change.action === "update" ? "input" : "pick")}
                className="cursor-pointer rounded-lg bg-gray-200 px-5 py-2 text-gray-700 hover:bg-gray-300"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={submitting || locked}
                className="cursor-pointer rounded-lg bg-green-500 px-5 py-2 font-bold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "กำลังบันทึก..." : "ยืนยัน (Enter)"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
