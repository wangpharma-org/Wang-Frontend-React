export type OrderBlockPhase = "off" | "before" | "window";

export interface OrderBlockDay {
  day_of_week: number;
  is_enabled: boolean;
  start_time: string | null;
  end_time: string;
  min_count: number | null;
  max_count: number | null;
  qc_min_count: number | null;
  qc_max_count: number | null;
}

export interface OrderBlockRoute {
  route_code: string;
  route_name: string;
  block_bypass: boolean;
  departed_at: string | null;
  is_blocked: boolean;
}

export interface OrderBlockStatus {
  day_of_week: number;
  phase: OrderBlockPhase;
  all_blocked: boolean;
  pending_count: number;
  qc_pending_count: number;
}

export interface OrderBlockOverview {
  days: OrderBlockDay[];
  routes: OrderBlockRoute[];
  status: OrderBlockStatus;
}

// ช่องตัวเลขเก็บเป็น string เพื่อให้แอดมินเคลียร์ค่าเป็นว่างได้
export interface DayDraft {
  day_of_week: number;
  is_enabled: boolean;
  start_time: string;
  end_time: string;
  min_count: string;
  max_count: string;
  qc_min_count: string;
  qc_max_count: string;
}

export interface StatusSummary {
  tone: "red" | "green" | "blue" | "gray";
  title: string;
  detail: string;
}

export const DEFAULT_END_TIME = "14:00";

// แสดงจันทร์ก่อน แต่ค่า day_of_week ยึดตาม backend (0 = อาทิตย์)
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DAY_NAMES: Record<number, string> = {
  0: "อาทิตย์",
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
};

const toCountText = (count: number | null | undefined): string =>
  count == null ? "" : String(count);

export const toDraft = (day: OrderBlockDay): DayDraft => ({
  day_of_week: day.day_of_week,
  is_enabled: day.is_enabled,
  start_time: day.start_time ?? "",
  end_time: day.end_time ?? DEFAULT_END_TIME,
  min_count: toCountText(day.min_count),
  max_count: toCountText(day.max_count),
  qc_min_count: toCountText(day.qc_min_count),
  qc_max_count: toCountText(day.qc_max_count),
});

export const toDrafts = (days: OrderBlockDay[]): DayDraft[] =>
  DAY_ORDER.map((dayOfWeek) =>
    toDraft(
      days.find((day) => day.day_of_week === dayOfWeek) ?? {
        day_of_week: dayOfWeek,
        is_enabled: false,
        start_time: null,
        end_time: DEFAULT_END_TIME,
        min_count: null,
        max_count: null,
        qc_min_count: null,
        qc_max_count: null,
      },
    ),
  );

const isWholeNumber = (value: string) => /^\d+$/.test(value.trim());

const validateRange = (
  minText: string,
  maxText: string,
  label: string,
): string | null => {
  const min = minText.trim();
  const max = maxText.trim();
  if (!min && !max) return null;
  if (!min || !max) {
    return `min และ max ของ${label} ต้องกรอกทั้งคู่ หรือเว้นว่างทั้งคู่`;
  }
  if (!isWholeNumber(min) || !isWholeNumber(max)) {
    return `min และ max ของ${label} ต้องเป็นจำนวนเต็มไม่ติดลบ`;
  }
  if (Number(min) >= Number(max)) return `min ของ${label} ต้องน้อยกว่า max`;
  return null;
};

const validateFields = (draft: DayDraft): string | null => {
  if (!draft.start_time) return "กรุณาระบุเวลาเริ่ม";
  if (!draft.end_time) return "กรุณาระบุเวลาสิ้นสุด";
  if (draft.start_time >= draft.end_time) {
    return "เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด";
  }
  return (
    validateRange(draft.qc_min_count, draft.qc_max_count, "ยอดรอ QC") ??
    validateRange(draft.min_count, draft.max_count, "ยอดเหลือจัด")
  );
};

// วันที่ปิดอยู่ไม่ต้องตรวจ เพราะค่าในช่องยังไม่มีผลกับการระงับ
export const validateDay = (draft: DayDraft): string | null =>
  draft.is_enabled ? validateFields(draft) : null;

export const describeDay = (draft: DayDraft): string => {
  if (!draft.is_enabled) return "ไม่ระงับอัตโนมัติในวันนี้ (รถออกก็ไม่ระงับ)";
  const { start_time: start, end_time: end } = draft;
  const min = draft.min_count.trim();
  const max = draft.max_count.trim();
  const qcMin = draft.qc_min_count.trim();
  const qcMax = draft.qc_max_count.trim();
  const qcRule =
    qcMin && qcMax
      ? `รอ QC ≥ ${qcMax} รายการ → ระงับ · รอ QC ≤ ${qcMin} รายการ → เปิด (มาก่อนเงื่อนไขอื่น) · `
      : "";
  if (!min && !max) {
    return qcRule
      ? `ช่วง ${start}–${end}: ${qcRule}นอกนั้นระงับตั้งแต่ ${start} · ${end} เปิดเสมอ`
      : `${start} ระงับทุกเส้นทางทันที → ${end} เปิดจัดตามปกติ`;
  }
  return `ช่วง ${start}–${end}: ${qcRule}เหลือจัด ≤ ${min} รายการ → ระงับ · สะสมถึง ${max} รายการ → เปิด · ${end} เปิดเสมอ`;
};

const toCount = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

// วันที่ปิดอยู่แต่ค่าในช่องยังไม่สมบูรณ์ ให้คงค่าที่บันทึกไว้เดิม ไม่ส่งค่าครึ่งๆ กลางๆ ไป backend
export const toPayload = (
  draft: DayDraft,
  saved: OrderBlockDay | undefined,
): OrderBlockDay => {
  if (!draft.is_enabled && validateFields(draft) !== null) {
    return {
      day_of_week: draft.day_of_week,
      is_enabled: false,
      start_time: saved?.start_time ?? null,
      end_time: saved?.end_time ?? DEFAULT_END_TIME,
      min_count: saved?.min_count ?? null,
      max_count: saved?.max_count ?? null,
      qc_min_count: saved?.qc_min_count ?? null,
      qc_max_count: saved?.qc_max_count ?? null,
    };
  }
  return {
    day_of_week: draft.day_of_week,
    is_enabled: draft.is_enabled,
    start_time: draft.start_time || null,
    end_time: draft.end_time,
    min_count: toCount(draft.min_count),
    max_count: toCount(draft.max_count),
    qc_min_count: toCount(draft.qc_min_count),
    qc_max_count: toCount(draft.qc_max_count),
  };
};

export const isSameDraft = (a: DayDraft, b: DayDraft): boolean =>
  a.is_enabled === b.is_enabled &&
  a.start_time === b.start_time &&
  a.end_time === b.end_time &&
  a.min_count.trim() === b.min_count.trim() &&
  a.max_count.trim() === b.max_count.trim() &&
  a.qc_min_count.trim() === b.qc_min_count.trim() &&
  a.qc_max_count.trim() === b.qc_max_count.trim();

export const describeStatus = (
  status: OrderBlockStatus,
  today: OrderBlockDay | undefined,
): StatusSummary => {
  if (!today?.is_enabled) {
    return {
      tone: "gray",
      title: "วันนี้ไม่ได้เปิดใช้การระงับอัตโนมัติ",
      detail: "ทุกเส้นทางจัดได้ตามปกติ",
    };
  }
  const hasThreshold = today.min_count != null && today.max_count != null;
  const hasQcThreshold =
    today.qc_min_count != null && today.qc_max_count != null;

  if (status.phase === "off") {
    return {
      tone: "green",
      title: `เลยเวลาสิ้นสุด ${today.end_time} แล้ว — เปิดจัดทุกเส้นทาง`,
      detail: "รถที่ออกหลังจากนี้จะไม่ทำให้เส้นทางถูกระงับ",
    };
  }
  if (status.phase === "before") {
    return {
      tone: "blue",
      title: `ยังไม่ถึงเวลาเริ่ม ${today.start_time ?? "-"}`,
      detail: "ตอนนี้ระงับเฉพาะเส้นทางที่รถออกแล้ว",
    };
  }
  if (status.all_blocked) {
    const openWhen = [
      hasQcThreshold ? `รอ QC ลดถึง ${today.qc_min_count} รายการ` : null,
      hasThreshold
        ? `เหลือจัดสะสมถึง ${today.max_count} รายการ${hasQcThreshold ? " (ขณะที่รอ QC ยังไม่ถึง max)" : ""}`
        : null,
    ].filter((condition) => condition !== null);
    return {
      tone: "red",
      title: "กำลังระงับทุกเส้นทาง ยกเว้น bypass และร้านด่วน",
      detail:
        openWhen.length > 0
          ? `จะเปิดเมื่อ${openWhen.join(" หรือ")} หรือถึงเวลา ${today.end_time}`
          : `จะเปิดเวลา ${today.end_time}`,
    };
  }
  const blockWhen = [
    hasQcThreshold ? `รอ QC ≥ ${today.qc_max_count} รายการ` : null,
    hasThreshold
      ? `เหลือจัด ≤ ${today.min_count} รายการ${hasQcThreshold ? " (ขณะที่รอ QC ยังไม่ถึง min)" : ""}`
      : null,
  ].filter((condition) => condition !== null);
  return {
    tone: "green",
    title: "อยู่ในช่วงเวลา แต่ยังเปิดจัดอยู่",
    detail: `จะระงับทุกเส้นทางเมื่อ${blockWhen.join(" หรือ")}`,
  };
};

export const formatTime = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      })
    : "";
