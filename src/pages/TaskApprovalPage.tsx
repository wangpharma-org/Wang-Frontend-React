import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar";
import { io } from "socket.io-client";

const VITE_API_URL_ORDER = import.meta.env.VITE_API_URL_ORDER as string;

type ApproveStatus = "pending" | "approve" | "reject";
type TabFilter = "pending" | "approve" | "reject";

interface EmployeeInfo {
  emp_code: string;
  emp_name: string;
  emp_nickname: string;
}

interface TaskRotationWithEmployee {
  id: number;
  task_name: string;
  start_time: string;
  end_time: string;
  approve_status: ApproveStatus;
  approve_time: string | null;
  created_at: string;
  emp_code_approve: string | null;
  reject_reason: string | null;
  employee: EmployeeInfo;
}

interface ApprovedSocketPayload {
  id: number;
  approve_status: string;
  emp_code_approve: string;
  approve_time: string;
}

interface RejectedSocketPayload {
  id: number;
  approve_status: string;
  emp_code_approve: string;
  approve_time: string;
  reject_reason: string | null;
}

interface DeletedSocketPayload {
  id: number;
}

function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end: string): string {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs <= 0) return "—";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชั่วโมง`;
  return `${minutes} นาที`;
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} วันที่แล้ว`;
  if (hours > 0) return `${hours} ชม. ที่แล้ว`;
  if (minutes > 0) return `${minutes} นาทีที่แล้ว`;
  return "เพิ่งสร้าง";
}

interface TaskCardProps {
  task: TaskRotationWithEmployee;
  onApprove: (task: TaskRotationWithEmployee) => void;
  onReject: (task: TaskRotationWithEmployee) => void;
  actioningId: number | null;
}

function TaskCard({ task, onApprove, onReject, actioningId }: TaskCardProps) {
  const isPending = task.approve_status === "pending";
  const isApproved = task.approve_status === "approve";
  const isRejected = task.approve_status === "reject";
  const isActioning = actioningId === task.id;

  const accentClass = isPending
    ? "border-amber-100"
    : isApproved
    ? "border-emerald-100"
    : "border-red-100";

  const topBarClass = isPending
    ? "bg-gradient-to-r from-amber-400 to-orange-400"
    : isApproved
    ? "bg-gradient-to-r from-emerald-400 to-teal-400"
    : "bg-gradient-to-r from-red-400 to-rose-500";

  const avatarClass = isPending
    ? "bg-amber-100 text-amber-700"
    : isApproved
    ? "bg-emerald-100 text-emerald-700"
    : "bg-red-100 text-red-700";

  const badgeClass = isPending
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : isApproved
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-red-50 text-red-700 ring-1 ring-red-200";

  const dotClass = isPending
    ? "bg-amber-400 animate-pulse"
    : isApproved
    ? "bg-emerald-500"
    : "bg-red-500";

  const statusLabel = isPending ? "รออนุมัติ" : isApproved ? "อนุมัติแล้ว" : "ไม่อนุมัติ";

  const durationClass = isPending
    ? "bg-amber-50 text-amber-800"
    : isApproved
    ? "bg-emerald-50 text-emerald-800"
    : "bg-red-50 text-red-800";

  return (
    <div className={`group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border ${accentClass}`}>
      <div className={`h-1 w-full ${topBarClass}`} />

      <div className="p-5">
        {/* Row 1: employee avatar + name + badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarClass}`}>
            {task.employee.emp_code}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-800 leading-tight">
              {task.employee.emp_name}
              {task.employee.emp_nickname ? ` (${task.employee.emp_nickname})` : ""}
            </p>
            <p className="text-sm text-gray-400">{timeAgo(task.created_at)}</p>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            {statusLabel}
          </span>
        </div>

        {/* Task name */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">{task.task_name}</h3>

        {/* Time chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-sm text-gray-600">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-400">เริ่ม</span>
            <span className="font-medium text-gray-700">{formatDateTime(task.start_time)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-sm text-gray-600">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-400">สิ้นสุด</span>
            <span className="font-medium text-gray-700">{formatDateTime(task.end_time)}</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold ${durationClass}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDuration(task.start_time, task.end_time)}
          </span>
        </div>

        {/* Bottom action / result */}
        {isPending && (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(task)}
              disabled={isActioning}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-semibold hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2"
            >
              {isActioning ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              อนุมัติ
            </button>
            <button
              onClick={() => onReject(task)}
              disabled={isActioning}
              className="flex-1 py-2.5 rounded-xl bg-white border-2 border-red-200 text-red-600 text-base font-semibold hover:bg-red-50 hover:border-red-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              ไม่อนุมัติ
            </button>
          </div>
        )}

        {isApproved && task.approve_time && (
          <div className="bg-emerald-50 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-emerald-700">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              อนุมัติโดย <strong>{task.emp_code_approve}</strong> · {formatDateTime(task.approve_time)}
            </span>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-50 rounded-xl px-4 py-2.5 flex items-start gap-2 text-sm text-red-700">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span>
                ไม่อนุมัติโดย <strong>{task.emp_code_approve}</strong>
                {task.approve_time && <> · {formatDateTime(task.approve_time)}</>}
              </span>
              {task.reject_reason && (
                <p className="text-red-500 mt-0.5">เหตุผล: {task.reject_reason}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabFilter }) {
  const icons = {
    pending: (
      <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    approve: (
      <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    reject: (
      <svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  const messages = {
    pending: "ไม่มีรายการรออนุมัติ",
    approve: "ยังไม่มีรายการที่อนุมัติแล้ว",
    reject: "ยังไม่มีรายการที่ไม่อนุมัติ",
  };
  const bgClass = { pending: "bg-amber-50", approve: "bg-emerald-50", reject: "bg-red-50" };

  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 flex flex-col items-center text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${bgClass[tab]}`}>
        {icons[tab]}
      </div>
      <p className="text-lg font-semibold text-gray-400">{messages[tab]}</p>
    </div>
  );
}

export default function TaskApprovalPage() {
  const [tasks, setTasks] = useState<TaskRotationWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabFilter>("pending");
  const [search, setSearch] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const res = await axios.get<TaskRotationWithEmployee[]>(
        `${VITE_API_URL_ORDER}/api/task-rotation/all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถโหลดข้อมูลได้" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const token = sessionStorage.getItem("access_token");
    const socket = io(`${VITE_API_URL_ORDER}/socket/task-rotation`, {
      path: "/socket/task-rotation",
      extraHeaders: { Authorization: `Bearer ${token ?? ""}` },
    });

    socket.on("connect", () => { console.log("✅ Connected to task-rotation socket (approval)"); });

    socket.on("task-rotation:approved", (payload: ApprovedSocketPayload) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.id
            ? { ...t, approve_status: payload.approve_status as ApproveStatus, approve_time: payload.approve_time, emp_code_approve: payload.emp_code_approve }
            : t
        )
      );
    });

    socket.on("task-rotation:rejected", (payload: RejectedSocketPayload) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.id
            ? { ...t, approve_status: payload.approve_status as ApproveStatus, approve_time: payload.approve_time, emp_code_approve: payload.emp_code_approve, reject_reason: payload.reject_reason }
            : t
        )
      );
    });

    socket.on("task-rotation:deleted", (payload: DeletedSocketPayload) => {
      setTasks((prev) => prev.filter((t) => t.id !== payload.id));
    });

    socket.on("disconnect", () => { console.log("Disconnected from task-rotation socket (approval)"); });
    return () => { socket.disconnect(); };
  }, []);

  const handleApprove = async (task: TaskRotationWithEmployee) => {
    const result = await Swal.fire({
      title: "ยืนยันการอนุมัติ?",
      html: `<p class="text-sm text-gray-600">งาน: <strong>${task.task_name}</strong><br/>พนักงาน: <strong>${task.employee.emp_name} (${task.employee.emp_code})</strong></p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "อนุมัติ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setActioningId(task.id);
    try {
      const token = sessionStorage.getItem("access_token");
      await axios.patch(
        `${VITE_API_URL_ORDER}/api/task-rotation/${task.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire({ icon: "success", title: "อนุมัติสำเร็จ", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Failed to approve task", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถอนุมัติได้ กรุณาลองใหม่" });
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (task: TaskRotationWithEmployee) => {
    const result = await Swal.fire({
      title: "ไม่อนุมัติ Worklog นี้?",
      html: `<p class="text-sm text-gray-600 mb-3">งาน: <strong>${task.task_name}</strong><br/>พนักงาน: <strong>${task.employee.emp_name} (${task.employee.emp_code})</strong></p>`,
      input: "textarea",
      inputPlaceholder: "ระบุเหตุผล (ไม่บังคับ)...",
      inputAttributes: { style: "font-size: 14px; border-radius: 8px;" },
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ไม่อนุมัติ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setActioningId(task.id);
    try {
      const token = sessionStorage.getItem("access_token");
      await axios.patch(
        `${VITE_API_URL_ORDER}/api/task-rotation/${task.id}/reject`,
        { reason: result.value || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire({ icon: "info", title: "บันทึกการไม่อนุมัติแล้ว", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Failed to reject task", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกได้ กรุณาลองใหม่" });
    } finally {
      setActioningId(null);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchTab = t.approve_status === tab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.task_name.toLowerCase().includes(q) ||
      t.employee.emp_code.toLowerCase().includes(q) ||
      t.employee.emp_name.toLowerCase().includes(q) ||
      t.employee.emp_nickname.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const pendingCount = tasks.filter((t) => t.approve_status === "pending").length;
  const approveCount = tasks.filter((t) => t.approve_status === "approve").length;
  const rejectCount = tasks.filter((t) => t.approve_status === "reject").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Gradient header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">อนุมัติบันทึกการทำงาน</h1>
                <p className="text-blue-200 text-sm mt-0.5">ตรวจสอบและอนุมัติ Worklog ของพนักงาน</p>
              </div>
            </div>
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-base font-medium disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-1 mt-2">
            <div className="flex items-center gap-2.5 bg-white/15 rounded-xl px-4 py-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white/80 text-base">รออนุมัติ</span>
              <span className="text-xl font-bold text-white">{pendingCount}</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/15 rounded-xl px-4 py-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-300" />
              <span className="text-white/80 text-base">อนุมัติ</span>
              <span className="text-xl font-bold text-white">{approveCount}</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/15 rounded-xl px-4 py-1.5">
              <span className="w-3 h-3 rounded-full bg-red-300" />
              <span className="text-white/80 text-base">ไม่อนุมัติ</span>
              <span className="text-xl font-bold text-white">{rejectCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1 flex-wrap">
            {(["pending", "approve", "reject"] as TabFilter[]).map((t) => {
              const count = t === "pending" ? pendingCount : t === "approve" ? approveCount : rejectCount;
              const activeStyle =
                t === "pending"
                  ? "bg-amber-500 text-white shadow-sm"
                  : t === "approve"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-red-500 text-white shadow-sm";
              const label = t === "pending" ? "รออนุมัติ" : t === "approve" ? "อนุมัติแล้ว" : "ไม่อนุมัติ";
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-semibold transition-all ${
                    tab === t ? activeStyle : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                  {count > 0 && t === "pending" && (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${tab === t ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา ชื่องาน / รหัสพนักงาน / ชื่อพนักงาน..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <svg className="animate-spin h-7 w-7 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-base text-gray-400 font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onApprove={handleApprove}
                onReject={handleReject}
                actioningId={actioningId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
