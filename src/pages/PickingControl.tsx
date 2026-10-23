import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import PipelineCard from "../components/picking-control/PipelineCard";
import { STAGES, type Stage, type StageKey, type StageState } from "../components/picking-control/stages";
import PickingRuleZone from "../components/picking-control/PickingRuleZone";
import RouteBatchZone from "../components/picking-control/RouteBatchZone";
import RouteLanes from "../components/picking-control/RouteLanes";
import OrderBlockSection from "../components/OrderBlockSection";
import HelpPanel from "../components/picking-control/HelpPanel";
import Hint from "../components/picking-control/Hint";
import Toggle from "../components/picking-control/Toggle";
import { ShowAllHelpContext, readShowAllHelp, writeShowAllHelp } from "../components/picking-control/helpContext";
import {
  API,
  PICKING_CONTROL_FLAG,
  errorMessage,
  fetchFlag,
  sendFlag,
  type Route,
  type RouteBatchGroupStatus,
  type RouteBatchSetting,
} from "../components/picking-control/pickingControlApi";

const REFRESH_MS = 60_000;

const nowHHmm = () =>
  new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

// OPHMBC-322 — แผงควบคุมสายการไหล: รวมสวิตช์สถานี / กติกาเริ่มจัด / โหมดชุด / ระงับอัตโนมัติ / สายรายเส้นทาง ไว้หน้าเดียว
const PickingControl = () => {
  const userInfo = JSON.parse(sessionStorage.getItem("user_info") ?? "null");
  const isAdmin = userInfo?.manage_product === "Yes";

  const [pageEnabled, setPageEnabled] = useState<boolean | null>(null);
  const [stages, setStages] = useState<StageState>({ picking: null, qc: null, loading: null, shipping: null });
  const [stageBusy, setStageBusy] = useState<StageKey | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [groups, setGroups] = useState<RouteBatchGroupStatus[]>([]);
  const [batchSetting, setBatchSetting] = useState<RouteBatchSetting | null>(null);
  const [updatedAt, setUpdatedAt] = useState(nowHHmm());
  const [showAllHelp, setShowAllHelp] = useState(readShowAllHelp);

  const loadStages = useCallback(async () => {
    const [picking, qc] = await Promise.all([fetchFlag("order"), fetchFlag("qc")]);
    setStages({ picking, qc, loading: null, shipping: null });
  }, []);

  const loadRoutes = useCallback(async () => {
    try {
      const [routeRes, groupRes, modeRes] = await Promise.all([
        axios.get<Route[]>(`${API}/route/get-route`),
        axios.get<RouteBatchGroupStatus[]>(`${API}/route-batch/groups`),
        axios.get<RouteBatchSetting>(`${API}/route-batch/mode`),
      ]);
      setRoutes(Array.isArray(routeRes.data) ? routeRes.data : []);
      setGroups(Array.isArray(groupRes.data) ? [...groupRes.data].sort((a, b) => a.position - b.position) : []);
      setBatchSetting(modeRes.data);
      setUpdatedAt(nowHHmm());
    } catch (error) {
      console.error("Error loading routes:", error);
    }
  }, []);

  useEffect(() => {
    fetchFlag(PICKING_CONTROL_FLAG)
      .then(setPageEnabled)
      .catch(() => setPageEnabled(false));
  }, []);

  useEffect(() => {
    if (!pageEnabled || !isAdmin) return;
    void loadStages();
    void loadRoutes();
    const interval = setInterval(() => {
      void loadStages();
      void loadRoutes();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [pageEnabled, isAdmin, loadStages, loadRoutes]);

  const toggleStage = async (stage: Stage, next: boolean) => {
    if (!stage.flag) return;
    const result = await Swal.fire({
      icon: next ? "question" : "warning",
      title: `${next ? "เปิด" : "ปิด"}สถานี ${stage.label} ทั้งระบบ?`,
      text: next ? "พนักงานจะกลับมาทำงานสถานีนี้ได้ทันที" : stage.offEffect,
      input: next ? undefined : "text",
      inputLabel: next ? undefined : "ข้อความที่จะแสดงบนจอพนักงาน",
      inputValue: next ? undefined : `ปิดสถานี${stage.label}ชั่วคราว`,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: next ? "#16a34a" : "#dc2626",
    });
    if (!result.isConfirmed) return;
    setStageBusy(stage.key);
    try {
      await sendFlag(stage.flag, next, next ? null : String(result.value ?? "") || null);
      await loadStages();
    } catch (error) {
      void Swal.fire({ icon: "error", title: "เปลี่ยนสถานะไม่สำเร็จ", text: errorMessage(error, "กรุณาลองใหม่") });
    } finally {
      setStageBusy(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 text-6xl">🚫</div>
        <p className="text-2xl font-semibold">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }
  if (pageEnabled === null) {
    return <div className="py-16 text-center text-gray-500">กำลังโหลด...</div>;
  }
  if (!pageEnabled) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-xl font-semibold">ยังไม่เปิดใช้งานแผงควบคุมสายการไหล</p>
        <p className="mt-2 text-sm text-gray-500">เปิด feature flag "{PICKING_CONTROL_FLAG}" ก่อนใช้งาน</p>
      </div>
    );
  }

  const cutStage = STAGES.find((stage) => stage.flag && stages[stage.key] === false);

  return (
    <ShowAllHelpContext.Provider value={showAllHelp}>
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-blue-900 sm:text-2xl">จัดการ Order — แผงควบคุมสายการไหล</h1>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">สวิตช์ / กติกา / โหมดชุด</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-sky-800">
              <Toggle
                size="sm"
                label="แสดงคำอธิบายทั้งหมด"
                checked={showAllHelp}
                onChange={(next) => {
                  setShowAllHelp(next);
                  writeShowAllHelp(next);
                }}
              />
              แสดงคำอธิบายทั้งหมด
            </label>
            <Hint k="showAllHelp" label="แสดงคำอธิบายทั้งหมด" />
            <p className="text-xs text-gray-500">
              อัปเดตล่าสุด {updatedAt} · ผู้ดูแล ({userInfo?.emp_code ?? "-"})
            </p>
          </div>
        </header>

        {cutStage && (
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            สายถูกตัดที่ '{cutStage.label}' — {cutStage.offEffect}
          </div>
        )}

        <PipelineCard states={stages} busy={stageBusy} onToggle={(stage, next) => void toggleStage(stage, next)} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-xl border-2 border-dashed border-pink-300 bg-white p-4 shadow-sm sm:p-6">
            <PickingRuleZone />
          </section>
          <section className="rounded-xl border border-gray-200 border-t-4 border-t-indigo-500 bg-white p-4 shadow-sm sm:p-6">
            <RouteBatchZone routes={routes} groups={groups} setting={batchSetting} onChanged={loadRoutes} />
          </section>
        </div>

        <details open className="group rounded-xl border border-gray-200 bg-white shadow-sm">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-800 sm:px-6">
            โซนจัดออเดอร์ · ระงับอัตโนมัติ (ตามเวลา / ยอดค้าง / รถออก / bypass) และรายชั้น
          </summary>
          <div className="border-t border-gray-100 p-4 sm:p-6 [&_section]:mb-0">
            <div className="mb-4">
              <HelpPanel topic="ระงับอัตโนมัติ">
                <ul>
                  <li>
                    <b>ตั้งเวลาระงับรายวัน</b> (กดหัวข้อเพื่อกาง) — ช่วงเวลาเริ่ม–สิ้นสุดของแต่ละวัน · min/max ยอดเหลือจัด · QC min/max ·
                    ถึงเวลาสิ้นสุดเปิดจัดทุกเส้นทางเสมอ
                  </li>
                  <li>
                    <b>เส้นทาง Bypass</b> — เส้นทางที่เลือกไว้ไม่ถูกระงับอัตโนมัติไม่ว่ากรณีใด
                  </li>
                  <li>กล่อง "สถานะตอนนี้" บอกว่าระงับอยู่ไหมและจะเปิดเมื่อไหร่</li>
                </ul>
                <p>ไม่ถูกระงับเสมอ: ร้านด่วน · ร้านที่กำลังจัดค้างอยู่ · เส้นทาง Bypass · คนจัดระหว่างระงับ (เฉพาะร้านที่มีสินค้าชั้นของตัวเอง)</p>
              </HelpPanel>
            </div>
            <OrderBlockSection floorLayout="table" />
          </div>
        </details>

        <RouteLanes routes={routes} groups={groups} setting={batchSetting} stages={stages} onChanged={loadRoutes} />
      </div>
    </div>
    </ShowAllHelpContext.Provider>
  );
};

export default PickingControl;
