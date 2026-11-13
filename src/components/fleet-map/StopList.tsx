import { Stop, STOP_COLOR, StopSession } from "./api";
import { duration, hm } from "./format";

const fmtM = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} กม.` : `${m.toLocaleString("th-TH")} เมตร`);

type SessionLike = Pick<StopSession, "empName" | "start" | "end" | "endReason" | "summary" | "stops">;

/** ร้านที่ต้องส่งของรอบออกรถหนึ่งรอบ — ใช้ในรายละเอียดรถ (หน้าแผนที่) และหน้าการส่งสินค้า */
export function StopSessionCard({ ses, onFocus, hideHeader }: { ses: SessionLike; onFocus: (lat: number, lng: number) => void; hideHeader?: boolean }) {
  const s = ses.summary;
  const chips: [string, number, string][] = [
    ["ส่งแล้ว", s.delivered, "bg-green-50 text-green-700"],
    ["ยังไม่ได้ส่ง", s.pending, "bg-gray-100 text-gray-700"],
    ["ตีกลับ", s.returned, "bg-red-50 text-red-700"],
    ["ลูกค้ายกเลิก", s.cancelled, "bg-red-50 text-red-700"],
    ["มีข้อสังเกต", s.flagged, "bg-amber-50 text-amber-800"],
    ["ไม่มีพิกัดร้าน", s.noLocation, "bg-gray-100 text-gray-600"],
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      {!hideHeader && (
        <div className="mb-2 text-sm">
          <span className="font-semibold text-gray-900">{ses.empName}</span>
          <span className="text-gray-600"> ออกรถเวลา {hm(ses.start)} น.{ses.endReason === "open" ? "" : ` สิ้นสุดเวลา ${hm(ses.end)} น.`}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">ทั้งหมด {s.total} ร้าน</span>
        {chips.filter(([, n]) => n > 0).map(([label, n, cls]) => (
          <span key={label} className={`rounded-full px-2 py-0.5 ${cls}`}>{label} {n}</span>
        ))}
      </div>
      {ses.stops.length === 0 && <p className="mt-2 text-sm text-gray-500">ไม่พบบิลที่ผูกกับรอบออกรถนี้</p>}
      <ol className="mt-2 divide-y divide-gray-100">
        {ses.stops.map((st) => (
          <StopRow key={`${st.memCode}-${st.addressId ?? ""}`} st={st} onFocus={onFocus} />
        ))}
      </ol>
    </div>
  );
}

export function StopRow({ st, onFocus }: { st: Stop; onFocus: (lat: number, lng: number) => void }) {
  const pos = st.location ?? st.delivery?.point ?? null;
  const visitText = st.visit
    ? st.visit.leftAt
      ? `ระบบ GPS ตรวจพบว่ารถจอดใกล้ร้านเวลา ${hm(st.visit.arrivedAt)}–${hm(st.visit.leftAt)} น. (${duration(st.visit.durationSeconds ?? 0)})`
      : `ระบบ GPS ตรวจพบว่ารถเข้าจอดใกล้ร้านเวลา ${hm(st.visit.arrivedAt)} น.`
    : null;
  return (
    <li>
      <button
        disabled={!pos}
        onClick={() => pos && onFocus(pos.lat, pos.lng)}
        className="flex w-full gap-2 py-2 text-left disabled:cursor-default"
      >
        <span
          className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: STOP_COLOR[st.status], boxShadow: st.delivery && st.flags.length ? "0 0 0 2px #f59e0b" : undefined }}
        >
          {st.seq}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-gray-900">{st.name}</span>
            {st.branch && <span className="text-xs text-gray-500">{st.branch}</span>}
            <span className="ml-auto text-xs" style={{ color: STOP_COLOR[st.status] }}>
              {st.statusLabel}
              {st.delivery?.at ? ` ${hm(st.delivery.at)} น.` : ""}
            </span>
          </span>
          <span className="block text-xs text-gray-600">
            {st.bills} บิล{st.boxes ? ` ${st.boxes} กล่อง` : ""}
            {st.route ? ` เส้นทาง ${st.route.name}` : ""}
          </span>
          {visitText && <span className="block text-xs text-green-700">{visitText}</span>}
          {st.flags.map((f) => (
            <span key={f} className="mt-0.5 block text-xs text-amber-800">ข้อสังเกต: {f}</span>
          ))}
          {st.delivery?.distanceM != null && st.delivery.distanceM <= 100 && (
            <span className="block text-xs text-gray-500">ตำแหน่งที่ยืนยันการส่งห่างจากร้าน {fmtM(st.delivery.distanceM)}</span>
          )}
        </span>
      </button>
    </li>
  );
}

