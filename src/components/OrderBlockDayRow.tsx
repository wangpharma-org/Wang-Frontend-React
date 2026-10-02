import { memo } from "react";
import { DAY_NAMES, type DayDraft } from "./orderBlockUtils";

interface OrderBlockDayRowProps {
  draft: DayDraft;
  isToday: boolean;
  error: string | null;
  summary: string;
  disabled: boolean;
  onChange: (dayOfWeek: number, patch: Partial<DayDraft>) => void;
  onCopyToAll: (dayOfWeek: number) => void;
}

const inputClass =
  "block w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50";

const OrderBlockDayRow = ({
  draft,
  isToday,
  error,
  summary,
  disabled,
  onChange,
  onCopyToAll,
}: OrderBlockDayRowProps) => {
  const dayOfWeek = draft.day_of_week;
  const dayName = DAY_NAMES[dayOfWeek] ?? "";

  return (
    <div className={`p-5 ${isToday ? "bg-blue-50" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={draft.is_enabled}
            aria-label={`เปิดใช้การระงับอัตโนมัติวัน${dayName}`}
            disabled={disabled}
            onClick={() => onChange(dayOfWeek, { is_enabled: !draft.is_enabled })}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              draft.is_enabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                draft.is_enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
          <span className="font-semibold text-gray-900">{dayName}</span>
          {isToday && (
            <span className="px-2 py-0.5 text-xs rounded bg-blue-600 text-white">
              วันนี้
            </span>
          )}
        </div>
        {draft.is_enabled && (
          <button
            type="button"
            disabled={disabled || error !== null}
            onClick={() => onCopyToAll(dayOfWeek)}
            className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            ใช้ค่านี้กับทุกวัน
          </button>
        )}
      </div>

      {draft.is_enabled && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <label className="text-sm text-gray-600">
            เวลาเริ่ม
            <input
              type="time"
              value={draft.start_time}
              disabled={disabled}
              onChange={(event) =>
                onChange(dayOfWeek, { start_time: event.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className="text-sm text-gray-600">
            เวลาสิ้นสุด (เปิดเสมอ)
            <input
              type="time"
              value={draft.end_time}
              disabled={disabled}
              onChange={(event) =>
                onChange(dayOfWeek, { end_time: event.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className="text-sm text-gray-600">
            min — เหลือจัดถึงค่านี้ให้ระงับ
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.min_count}
              disabled={disabled}
              placeholder="เว้นว่าง"
              onChange={(event) =>
                onChange(dayOfWeek, { min_count: event.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className="text-sm text-gray-600">
            max — สะสมถึงค่านี้ให้เปิด
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.max_count}
              disabled={disabled}
              placeholder="เว้นว่าง"
              onChange={(event) =>
                onChange(dayOfWeek, { max_count: event.target.value })
              }
              className={inputClass}
            />
          </label>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      ) : (
        <p className="mt-3 text-sm text-gray-600">{summary}</p>
      )}
    </div>
  );
};

export default memo(OrderBlockDayRow);
