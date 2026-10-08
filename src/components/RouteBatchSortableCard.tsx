import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Route } from "../pages/RouteManage";

export interface EditorGroup {
    key: string;
    name: string;
    min_remaining: string;
    departure_time: string;
    block_before_minutes: string;
    route_codes: string[];
}

// เวลาเริ่มระงับ = เวลาออกรถ - นาที (ต้องตรงกับ departureCutoffMinute ฝั่ง backend) — ติดลบนับเป็นต้นวัน
const blockTimeOf = (departureTime: string, minutes: string): string | null => {
    if (!departureTime || minutes === "") return null;
    const value = Number(minutes);
    if (!Number.isInteger(value) || value < 1) return null;
    const [hour, minute] = departureTime.split(":").map(Number);
    const cutoff = Math.max(0, hour * 60 + minute - value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(Math.floor(cutoff / 60))}:${pad(cutoff % 60)}`;
};

interface RouteBatchSortableCardProps {
    group: EditorGroup;
    index: number;
    allRoutes: Route[];
    assignedElsewhere: Set<string>;
    onChange: (index: number, field: "name" | "min_remaining" | "departure_time" | "block_before_minutes", value: string) => void;
    onToggleRoute: (index: number, route_code: string) => void;
    onRemove: (index: number) => void;
    // เวลาสิ้นสุดของวันนี้ (ระงับการจัดอัตโนมัติ) — null = วันนี้ไม่ได้เปิดใช้ จึงไม่ระงับ, undefined = ยังไม่รู้
    blockUntil?: string | null;
    // feature flag route-departure-block — false = ปิดทั้งระบบ ตั้งค่าไว้ก็ไม่ระงับ
    blockEnabled?: boolean;
}

const RouteBatchSortableCard = ({
    group,
    index,
    allRoutes,
    assignedElsewhere,
    onChange,
    onToggleRoute,
    onRemove,
    blockUntil,
    blockEnabled,
}: RouteBatchSortableCardProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: group.key });

    const blockTime = blockTimeOf(group.departure_time, group.block_before_minutes);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-3"
        >
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-xl px-1 pt-1"
                    title="ลากเพื่อจัดลำดับ"
                >
                    ⠿
                </button>
                <div className="flex-1">
                    <div className="flex flex-wrap items-end gap-3 mb-3">
                        <span className="flex items-center justify-center w-8 h-8 mb-1 rounded-full bg-blue-100 text-blue-800 font-bold text-sm shrink-0">
                            {index + 1}
                        </span>
                        <label className="flex-1 min-w-[10rem]">
                            <span className="block text-xs text-gray-500 mb-1">ชื่อชุด</span>
                            <input
                                type="text"
                                placeholder="ชื่อชุด เช่น ชุดที่ 1"
                                value={group.name}
                                onChange={(e) => onChange(index, "name", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </label>
                        <label>
                            <span className="block text-xs text-gray-500 mb-1">min เหลือ</span>
                            <input
                                type="number"
                                min={0}
                                placeholder="min"
                                value={group.min_remaining}
                                onChange={(e) => onChange(index, "min_remaining", e.target.value)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </label>
                        <label>
                            <span className="block text-xs text-gray-500 mb-1">เวลาออกรถ</span>
                            <input
                                type="time"
                                value={group.departure_time}
                                onChange={(e) => onChange(index, "departure_time", e.target.value)}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </label>
                        <label>
                            <span className="block text-xs text-gray-500 mb-1">ระงับก่อนออกรถ (นาที)</span>
                            <input
                                type="number"
                                min={1}
                                max={1440}
                                placeholder={group.departure_time ? "เว้นว่าง = ไม่ระงับ" : "ใส่เวลาออกรถก่อน"}
                                title="ระงับการจัดเส้นทางในชุดนี้ก่อนเวลาออกรถกี่นาที (เว้นว่าง = ไม่ระงับ)"
                                value={group.block_before_minutes}
                                disabled={!group.departure_time}
                                onChange={(e) => onChange(index, "block_before_minutes", e.target.value)}
                                className="w-40 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                            />
                        </label>
                        {blockTime &&
                            (blockEnabled === false ? (
                                <span className="mb-2 px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-sm whitespace-nowrap">
                                    → ระงับ {blockTime} น. · ฟีเจอร์ระงับก่อนออกรถถูกปิดอยู่
                                </span>
                            ) : blockUntil && blockTime >= blockUntil ? (
                                <span className="mb-2 px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-sm whitespace-nowrap">
                                    → ระงับ {blockTime} น. · วันนี้ไม่มีผล (เลยเวลาสิ้นสุด {blockUntil} น.)
                                </span>
                            ) : blockUntil === null ? (
                                <span className="mb-2 px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-sm whitespace-nowrap">
                                    → ระงับ {blockTime} น. · วันนี้ไม่มีผล (ไม่ได้เปิดระงับการจัดอัตโนมัติ)
                                </span>
                            ) : (
                                <span className="mb-2 px-3 py-1 rounded-lg bg-red-50 text-red-700 text-sm font-semibold whitespace-nowrap">
                                    → ระงับการจัด {blockTime}–{blockUntil ?? "เวลาสิ้นสุด"} น.
                                </span>
                            ))}
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                            ลบชุด
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allRoutes.map((route) => {
                            const checked = group.route_codes.includes(route.route_code);
                            const disabled = !checked && assignedElsewhere.has(route.route_code);
                            return (
                                <label
                                    key={route.route_code}
                                    className={`flex items-center gap-1 px-2 py-1 rounded border text-sm ${checked
                                        ? "bg-blue-50 border-blue-400 text-blue-800"
                                        : disabled
                                            ? "bg-gray-50 border-gray-200 text-gray-300"
                                            : "border-gray-300 text-gray-700"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={disabled}
                                        onChange={() => onToggleRoute(index, route.route_code)}
                                    />
                                    {route.route_code} - {route.route_name}
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteBatchSortableCard;
