import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Route } from "../pages/RouteManage";

export interface EditorGroup {
    key: string;
    name: string;
    min_remaining: string;
    departure_time: string;
    route_codes: string[];
}

interface RouteBatchSortableCardProps {
    group: EditorGroup;
    index: number;
    allRoutes: Route[];
    assignedElsewhere: Set<string>;
    onChange: (index: number, field: "name" | "min_remaining" | "departure_time", value: string) => void;
    onToggleRoute: (index: number, route_code: string) => void;
    onRemove: (index: number) => void;
}

const RouteBatchSortableCard = ({
    group,
    index,
    allRoutes,
    assignedElsewhere,
    onChange,
    onToggleRoute,
    onRemove,
}: RouteBatchSortableCardProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: group.key });

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
                    <div className="flex gap-3 mb-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm shrink-0">
                            {index + 1}
                        </span>
                        <input
                            type="text"
                            placeholder="ชื่อชุด เช่น ชุดที่ 1"
                            value={group.name}
                            onChange={(e) => onChange(index, "name", e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                            type="number"
                            min={0}
                            placeholder="min"
                            value={group.min_remaining}
                            onChange={(e) => onChange(index, "min_remaining", e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                            type="time"
                            value={group.departure_time}
                            onChange={(e) => onChange(index, "departure_time", e.target.value)}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                        />
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
