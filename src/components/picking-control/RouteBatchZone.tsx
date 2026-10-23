import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import RouteBatchSortableCard, { type EditorGroup } from "../RouteBatchSortableCard";
import {
  API,
  authHeaders,
  errorMessage,
  type Route,
  type RouteBatchGroupStatus,
  type RouteBatchMode,
  type RouteBatchSetting,
} from "./pickingControlApi";

interface RouteBatchZoneProps {
  routes: Route[];
  groups: RouteBatchGroupStatus[];
  setting: RouteBatchSetting | null;
  onChanged: () => Promise<void>;
}

const toEditor = (groups: RouteBatchGroupStatus[]): EditorGroup[] =>
  groups.map((g) => ({
    key: String(g.id),
    name: g.name ?? "",
    min_remaining: String(g.min_remaining),
    departure_time: g.departure_time ?? "",
    block_before_minutes: g.block_before_minutes === null ? "" : String(g.block_before_minutes),
    route_codes: g.routes.map((r) => r.route_code),
  }));

const newGroup = (): EditorGroup => ({
  key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: "",
  min_remaining: "",
  departure_time: "",
  block_before_minutes: "",
  route_codes: [],
});

const RouteBatchZone = ({ routes, groups, setting, onChanged }: RouteBatchZoneProps) => {
  const [editor, setEditor] = useState<EditorGroup[]>(() => toEditor(groups));
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  // ดีไซน์ต้องการหน้าแน่น ๆ — แสดงสรุปชุดก่อน กด "แก้ไขชุด" ถึงจะกางตัวแก้ที่มี checkbox ทุกเส้นทาง
  const [editing, setEditing] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));
  const isBatch = setting?.mode === "batch";

  // รีเฟรชข้อมูลจาก server แล้วล้างฟอร์มตาม — แก้ชุดได้เฉพาะโหมดปกติ จึงไม่ทับงานที่กำลังแก้
  useEffect(() => setEditor(toEditor(groups)), [groups]);
  useEffect(
    () => setThreshold(setting?.switch_max_threshold ? String(setting.switch_max_threshold) : ""),
    [setting],
  );

  const unassigned = useMemo(() => {
    const assigned = new Set(editor.flatMap((g) => g.route_codes));
    return routes.filter((r) => !assigned.has(r.route_code));
  }, [editor, routes]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await onChanged();
      setEditing(false);
      void Swal.fire({ icon: "success", title: success, timer: 1500, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: errorMessage(error, "กรุณาลองใหม่") });
    } finally {
      setBusy(false);
    }
  };

  const setMode = async (mode: RouteBatchMode) => {
    if (mode === setting?.mode) return;
    if (mode === "batch") {
      const confirm = await Swal.fire({
        icon: "warning",
        title: "เปิดโหมดเปิดทีละชุด?",
        text: "ระบบจะรีเซ็ตทุกชุดเป็นยังไม่เปิด แล้วเปิดเฉพาะชุดแรก ชุดถัดไปเปิดอัตโนมัติเมื่อของในชุดปัจจุบันเหลือถึง min",
        showCancelButton: true,
        confirmButtonText: "เปิดโหมดนี้",
        cancelButtonText: "ยกเลิก",
      });
      if (!confirm.isConfirmed) return;
    }
    await run(() => axios.put(`${API}/route-batch/mode`, { mode }, authHeaders()), "เปลี่ยนโหมดสำเร็จ");
  };

  const saveGroups = async () => {
    for (const g of editor) {
      const name = g.name || "(ไม่มีชื่อ)";
      if (g.route_codes.length === 0) {
        void Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: `ชุด "${name}" ต้องมีอย่างน้อย 1 เส้นทาง` });
        return;
      }
      if (g.min_remaining === "" || Number(g.min_remaining) < 0) {
        void Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: `กรุณาระบุ min ของชุด "${name}"` });
        return;
      }
    }
    await run(
      () =>
        axios.put(
          `${API}/route-batch/groups`,
          {
            groups: editor.map((g) => ({
              name: g.name || undefined,
              min_remaining: Number(g.min_remaining),
              departure_time: g.departure_time || undefined,
              block_before_minutes:
                g.departure_time && g.block_before_minutes !== "" ? Number(g.block_before_minutes) : null,
              route_codes: g.route_codes,
            })),
          },
          authHeaders(),
        ),
      "บันทึกการจัดกลุ่มสำเร็จ",
    );
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setEditor((prev) =>
      arrayMove(
        prev,
        prev.findIndex((g) => g.key === active.id),
        prev.findIndex((g) => g.key === over.id),
      ),
    );
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">โซนขึ้นของ · โหมดการเปิดเส้นทาง</h3>
      <div className="flex flex-wrap items-center gap-2">
        {(["normal", "batch"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={setting?.mode === mode}
            disabled={busy || !setting || (mode === "batch" && groups.length === 0)}
            onClick={() => void setMode(mode)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-50 ${
              setting?.mode === mode
                ? "border-blue-400 bg-blue-50 text-blue-800"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span
              className={`h-3.5 w-3.5 rounded-full border-2 ${
                setting?.mode === mode ? "border-blue-600 bg-blue-600 ring-2 ring-inset ring-white" : "border-gray-400"
              }`}
            />
            {mode === "normal" ? "โหมดปกติ" : "เปิดทีละชุด"}
          </button>
        ))}
        <label className="flex items-center gap-2 text-xs text-gray-600 sm:ml-2">
          max auto-switch
          <input
            aria-label="max auto-switch"
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            disabled={busy || groups.length === 0}
            placeholder="ไม่บังคับ"
            className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50"
          />
          บิลค้างทั้งระบบ
        </label>
        <button
          type="button"
          onClick={() =>
            void run(
              () => axios.put(`${API}/route-batch/switch-threshold`, { threshold: Number(threshold) }, authHeaders()),
              "บันทึก max สำเร็จ",
            )
          }
          disabled={busy || threshold === "" || groups.length === 0}
          className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          บันทึก max
        </button>
      </div>
      {groups.length === 0 && (
        <p className="mt-2 text-xs text-amber-600">ต้องตั้งชุดเส้นทางอย่างน้อย 1 ชุดก่อนถึงจะเปิดโหมดเปิดทีละชุดได้</p>
      )}

      {isBatch ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          กำลังใช้โหมดเปิดทีละชุด — สลับกลับเป็นโหมดปกติก่อนถึงจะแก้ชุดเส้นทางได้ (สถานะแต่ละชุดดูได้ที่สายรายเส้นทางด้านล่าง)
        </p>
      ) : !editing ? (
        <div className="mt-4 space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-xl border border-gray-200 p-3" data-testid={`batch-summary-${group.position}`}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">
                  {group.position}
                </span>
                <span className="font-semibold text-gray-900">{group.name || "(ไม่มีชื่อ)"}</span>
                <span className="text-gray-500">
                  min {group.min_remaining}
                  {group.departure_time ? ` · ออกรถ ${group.departure_time}` : ""}
                  {group.block_time ? ` · ระงับ ${group.block_time}` : ""}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.routes.map((r) => (
                  <span key={r.route_code} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {r.route_code} - {r.route_name}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {unassigned.length > 0 && (
            <p className="text-xs text-amber-600">
              ยังไม่ได้จัดกลุ่ม {unassigned.length} เส้นทาง: {unassigned.map((r) => r.route_code).join(", ")}
            </p>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
          >
            {groups.length === 0 ? "+ ตั้งชุดเส้นทาง" : "แก้ไขชุด"}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={editor.map((g) => g.key)} strategy={verticalListSortingStrategy}>
              {editor.map((group, index) => (
                <RouteBatchSortableCard
                  key={group.key}
                  group={group}
                  index={index}
                  allRoutes={routes}
                  assignedElsewhere={new Set(editor.filter((_, i) => i !== index).flatMap((g) => g.route_codes))}
                  onChange={(i, field, value) =>
                    setEditor((prev) => prev.map((g, j) => (j === i ? { ...g, [field]: value } : g)))
                  }
                  onToggleRoute={(i, code) =>
                    setEditor((prev) =>
                      prev.map((g, j) => {
                        // 1 เส้นทางอยู่ได้แค่ 1 ชุด
                        if (j !== i) return { ...g, route_codes: g.route_codes.filter((c) => c !== code) };
                        return g.route_codes.includes(code)
                          ? { ...g, route_codes: g.route_codes.filter((c) => c !== code) }
                          : { ...g, route_codes: [...g.route_codes, code] };
                      }),
                    )
                  }
                  onRemove={(i) => setEditor((prev) => prev.filter((_, j) => j !== i))}
                  blockUntil={groups.length > 0 ? groups[0].block_until : undefined}
                  blockEnabled={groups[0]?.departure_block_enabled}
                />
              ))}
            </SortableContext>
          </DndContext>
          {unassigned.length > 0 && (
            <p className="mb-3 text-xs text-amber-600">
              ยังไม่ได้จัดกลุ่ม {unassigned.length} เส้นทาง: {unassigned.map((r) => r.route_code).join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditor((prev) => [...prev, newGroup()])}
              className="rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              + เพิ่มชุด
            </button>
            <button
              type="button"
              onClick={() => {
                setEditor(toEditor(groups));
                setEditing(false);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => void saveGroups()}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก..." : "บันทึกการจัดกลุ่ม"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteBatchZone;
