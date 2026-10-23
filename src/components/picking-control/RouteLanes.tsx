import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import Toggle from "./Toggle";
import HelpPanel from "./HelpPanel";
import {
  errorMessage,
  setRoutesActive,
  type Route,
  type RouteBatchGroupStatus,
  type RouteBatchSetting,
} from "./pickingControlApi";
import type { StageState } from "./stages";

interface RouteLanesProps {
  routes: Route[];
  groups: RouteBatchGroupStatus[];
  setting: RouteBatchSetting | null;
  stages: StageState;
  onChanged: () => Promise<void>;
}

// สถานีย่อยของเส้นทาง — จัดออเดอร์ใช้ is_active เดิม, QC/ขึ้นของยังไม่มีระบบรองรับรายเส้นทาง
const StationChip = ({
  label,
  on,
  note,
  muted,
}: {
  label: string;
  on: boolean;
  note: string;
  muted: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
      muted ? "border-gray-200 bg-gray-50 text-gray-400" : on ? "border-green-300 bg-green-50 text-gray-800" : "border-gray-300 bg-white text-gray-600"
    }`}
  >
    <Toggle size="sm" checked={on && !muted} disabled label={`${label} ${note}`} />
    <span className="font-semibold">{label}</span>
    <span className={muted ? "text-gray-400" : on ? "text-green-700" : "text-gray-500"}>{note}</span>
  </span>
);

const RouteLanes = ({ routes, groups, setting, stages, onChanged }: RouteLanesProps) => {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const isBatch = setting?.mode === "batch";

  const routeByCode = useMemo(() => new Map(routes.map((r) => [r.route_code, r])), [routes]);
  const keyword = search.trim().toLowerCase();
  const matches = (r: { route_code: string; route_name: string }) =>
    !keyword || r.route_code.toLowerCase().includes(keyword) || (r.route_name ?? "").toLowerCase().includes(keyword);

  const grouped = new Set(groups.flatMap((g) => g.routes.map((r) => r.route_code)));
  const ungrouped = routes.filter((r) => !grouped.has(r.route_code));
  const activeCount = routes.filter((r) => r.is_active).length;

  const apply = async (codes: string[], next: boolean, what: string) => {
    const confirm = await Swal.fire({
      icon: isBatch ? "warning" : "question",
      title: `${next ? "เปิด" : "ปิด"}${what}?`,
      text: isBatch
        ? "กำลังอยู่โหมดเปิดทีละชุด — การสั่งเปิด/ปิดด้วยมือจะออกจากโหมดเปิดทีละชุดกลับเป็นโหมดปกติ"
        : `จะ${next ? "เปิด" : "ปิด"}การจัดออเดอร์ ${codes.length} เส้นทาง`,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;
    setBusy(true);
    try {
      await setRoutesActive(codes, next);
      await onChanged();
    } catch (error) {
      void Swal.fire({ icon: "error", title: "อัปเดตเส้นทางไม่สำเร็จ", text: errorMessage(error, "กรุณาลองใหม่") });
    } finally {
      setBusy(false);
    }
  };

  const renderRoute = (route: Route, groupOpen: boolean, blocked: boolean) => {
    // ชุดถูกปิด/ไม่ได้จัดกลุ่มในโหมดชุด = เทาทั้งแถว
    const muted = !groupOpen || blocked;
    const pickingNote =
      stages.picking === false ? "ปิดทั้งระบบ" : blocked ? "ถูกระงับ" : !groupOpen ? "รอเปิดชุด" : route.is_active ? "เปิด" : "ปิด";
    const qcNote = stages.qc === false ? "ปิดทั้งระบบ" : "เร็วๆ นี้";
    return (
      <div
        key={route.route_code}
        data-testid={`lane-${route.route_code}`}
        className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${
          blocked ? "border-red-100 bg-red-50/60" : "border-gray-100 bg-white"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3 sm:w-64">
          <Toggle
            tone="blue"
            label={`สวิตช์เส้นทาง ${route.route_code}`}
            checked={route.is_active}
            disabled={busy}
            onChange={(next) => void apply([route.route_code], next, `เส้นทาง ${route.route_code}`)}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{route.route_name}</p>
            <p className={`text-xs ${blocked ? "text-red-600" : route.is_active ? "text-green-600" : "text-gray-500"}`}>
              {route.route_code} · {blocked ? "ถูกระงับ — ไม่ขึ้นคิวจัด" : route.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StationChip label="จัดออเดอร์" on={route.is_active} note={pickingNote} muted={muted || stages.picking === false} />
          <StationChip label="QC" on={false} note={qcNote} muted />
          <StationChip label="ขึ้นของ" on={false} note="เร็วๆ นี้" muted />
        </div>
      </div>
    );
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">สายรายเส้นทาง — จัดเป็นชุด สวิตช์หัวชุดคุมทั้งชุด</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="ค้นหาเส้นทาง"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัสหรือชื่อเส้นทาง..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-64"
          />
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">ทั้งหมด {routes.length}</span>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">เปิดใช้งาน {activeCount}</span>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">ปิด/ระงับ {routes.length - activeCount}</span>
        </div>
      </div>
      <div className="-mt-2 mb-4">
        <HelpPanel topic="สายรายเส้นทาง">
          <ul>
            <li><b>สวิตช์หัวชุด</b> — เปิด/ปิดการจัดออเดอร์ทุกเส้นทางในชุดพร้อมกัน</li>
            <li><b>สวิตช์เส้นทาง</b> (น้ำเงิน) — เปิด/ปิดการจัดออเดอร์ของเส้นทางนั้น</li>
            <li>ชิป จัดออเดอร์ / QC / ขึ้นของ = สถานะรายสถานี (QC และขึ้นของรายเส้นทางยังไม่รองรับ)</li>
            <li><b>ยังไม่จัดกลุ่ม</b> — เส้นทางที่ไม่อยู่ในชุดไหน ในโหมดเปิดทีละชุดจะถูกระงับ</li>
          </ul>
          <p>⚠️ กดสวิตช์ตอนอยู่<b>โหมดเปิดทีละชุด</b> ระบบจะออกจากโหมดนั้นกลับเป็นโหมดปกติ (มีถามยืนยันก่อน)</p>
        </HelpPanel>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const groupRoutes = group.routes
            .map((r) => routeByCode.get(r.route_code) ?? { route_code: r.route_code, route_name: r.route_name, is_active: r.is_active })
            .filter(matches);
          const allOn = group.routes.length > 0 && group.routes.every((r) => routeByCode.get(r.route_code)?.is_active);
          const someOn = group.routes.some((r) => routeByCode.get(r.route_code)?.is_active);
          // โหมดชุด: ชุดเปิดตามที่ระบบเปิดให้ · โหมดปกติ: ถือว่าเปิดเมื่อมีเส้นทางเปิดอยู่
          const open = isBatch ? group.opened : someOn;
          const badge = isBatch
            ? group.opened
              ? "เปิดชุดอยู่"
              : "ชุดถูกปิด — เทาทั้งชุด"
            : allOn
              ? "เปิดทั้งชุด"
              : someOn
                ? "เปิดบางเส้นทาง"
                : "ปิดทั้งชุด";
          if (keyword && groupRoutes.length === 0) return null;
          return (
            <div key={group.id} data-testid={`group-${group.position}`}>
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-white ${
                  open ? "bg-blue-800" : "bg-slate-600"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Toggle
                    size="lg"
                    label={`สวิตช์หัวชุด ${group.position}`}
                    checked={isBatch ? group.opened : allOn}
                    disabled={busy}
                    onChange={(next) =>
                      void apply(
                        group.routes.map((r) => r.route_code),
                        next,
                        `ทั้งชุดที่ ${group.position}${group.name ? ` (${group.name})` : ""}`,
                      )
                    }
                  />
                  <div className="min-w-0">
                    <p className="font-bold">
                      ชุดที่ {group.position}
                      {group.name ? ` · ${group.name}` : ""}
                    </p>
                    <p className="text-xs text-white/80">
                      {group.departure_time ? `ออกรถ ${group.departure_time} · ` : ""}min {group.min_remaining} · {group.routes.length} เส้นทาง
                      {group.is_departure_blocked ? " · ระงับก่อนออกรถแล้ว" : ""}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${open ? "bg-green-500" : "bg-white/20"}`}>
                  {badge}
                </span>
              </div>
              <div className="mt-2 space-y-2 sm:pl-4">
                {groupRoutes.map((route) => renderRoute(route, open, false))}
              </div>
            </div>
          );
        })}

        {ungrouped.filter(matches).length > 0 && (
          <div data-testid="group-ungrouped">
            <div
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-white ${
                groups.length === 0 ? "bg-blue-800" : "bg-orange-700"
              }`}
            >
              <p className="font-bold">
                {groups.length === 0 ? "ทุกเส้นทาง" : "ยังไม่จัดกลุ่ม"}
                <span className="ml-2 text-xs font-normal text-white/80">
                  {ungrouped.length} เส้นทาง —{" "}
                  {isBatch ? "ไม่อยู่ในชุดไหน จึงถูกระงับในโหมดเปิดทีละชุด" : "คุมรายตัว ไม่มีสวิตช์ชุด (ไปจัดกลุ่มที่โซนขึ้นของ)"}
                </span>
              </p>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                {isBatch ? "ถูกระงับ" : "คุมรายตัว"}
              </span>
            </div>
            <div className="mt-2 space-y-2 sm:pl-4">
              {ungrouped.filter(matches).map((route) => renderRoute(route, true, isBatch))}
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        สวิตช์ย่อย "QC" และ "ขึ้นของ" รายเส้นทางยังไม่มีระบบรองรับ (แสดงไว้ตามดีไซน์) — ตอนนี้สวิตช์เส้นทางคุมเฉพาะการจัดออเดอร์
      </p>
    </section>
  );
};

export default RouteLanes;
