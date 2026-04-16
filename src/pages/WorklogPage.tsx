import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar";
import { io } from "socket.io-client";

const VITE_API_URL_ORDER = import.meta.env.VITE_API_URL_ORDER as string;

interface TaskRotation {
  id: number;
  task_name: string;
  start_time: string;
  end_time: string;
  approve_status: "pending" | "approve" | "reject";
  approve_time: string | null;
  created_at: string;
  emp_code_approve: string | null;
  reject_reason: string | null;
}

interface TaskForm {
  task_name: string;
  start_time: string;
  end_time: string;
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
  const totalMin = Math.round(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} ชม. ${m} นาที`;
  if (h > 0) return `${h} ชั่วโมง`;
  return `${m} นาที`;
}

interface WorklogCardProps {
  wl: TaskRotation;
  onDelete?: (id: number) => void;
  deleting?: boolean;
}

function WorklogCard({ wl, onDelete, deleting }: WorklogCardProps) {
  const isPending = wl.approve_status === "pending";
  const isApproved = wl.approve_status === "approve";
  const isRejected = wl.approve_status === "reject";

  const accentClass = isPending
    ? "border-amber-100"
    : isApproved
    ? "border-emerald-100"
    : "border-red-100";

  const stripClass = isPending
    ? "bg-gradient-to-b from-amber-400 to-orange-400"
    : isApproved
    ? "bg-gradient-to-b from-emerald-400 to-teal-500"
    : "bg-gradient-to-b from-red-400 to-rose-500";

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

  const durationClass = isPending
    ? "bg-amber-50 text-amber-800"
    : isApproved
    ? "bg-emerald-50 text-emerald-800"
    : "bg-red-50 text-red-800";

  const statusLabel = isPending ? "รออนุมัติ" : isApproved ? "อนุมัติแล้ว" : "ไม่อนุมัติ";

  return (
    <div className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border ${accentClass}`}>
      {/* Left accent strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripClass}`} />

      <div className="pl-6 pr-5 py-3">
        {/* Top: title + badge + delete */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-lg font-bold text-gray-900 leading-snug flex-1">{wl.task_name}</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
              {statusLabel}
            </span>
            {isPending && onDelete && (
              <button
                onClick={() => onDelete(wl.id)}
                disabled={deleting}
                title="ลบรายการนี้"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                {deleting ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Duration chip */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold mb-2 ${durationClass}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(wl.start_time, wl.end_time)}
        </div>

        {/* Time row */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full ">
              <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-500">เริ่มงาน</span>
              <span className="font-semibold text-green-800">{formatDateTime(wl.start_time)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full">
              <svg className="h-4 w-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium uppercase tracking-wide text-rose-500">สิ้นสุดงาน</span>
              <span className="font-semibold text-red-800">{formatDateTime(wl.end_time)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {isApproved && (wl.approve_time || wl.emp_code_approve) && (
          <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center gap-2 text-xs text-emerald-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              อนุมัติโดย <strong>{wl.emp_code_approve}</strong>
              {wl.approve_time && <> · {formatDateTime(wl.approve_time)}</>}
            </span>
          </div>
        )}

        {isRejected && (
          <div className="mt-4 pt-3 border-t border-red-50 flex items-start gap-2 text-xs text-red-600">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span>
                ไม่อนุมัติโดย <strong>{wl.emp_code_approve}</strong>
                {wl.approve_time && <> · {formatDateTime(wl.approve_time)}</>}
              </span>
              {wl.reject_reason && (
                <p className="text-red-500 mt-0.5">เหตุผล: {wl.reject_reason}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label, count, color }: { label: string; count: number; color: "amber" | "emerald" | "red" }) {
  const colorMap = {
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
  };
  const badgeMap = {
    amber: "bg-amber-400",
    emerald: "bg-emerald-400",
    red: "bg-red-400",
  };
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-base font-bold text-white ${colorMap[color]}`}>
        {label}
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold text-white ${badgeMap[color]}`}>
          {count}
        </span>
      </div>
    </div>
  );
}

export default function WorklogPage() {
  const [worklogs, setWorklogs] = useState<TaskRotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<TaskForm>({ task_name: "", start_time: "", end_time: "" });

  const fetchWorklogs = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const res = await axios.get<TaskRotation[]>(
        `${VITE_API_URL_ORDER}/api/task-rotation`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorklogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch worklogs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklogs();

    const token = sessionStorage.getItem("access_token");
    const socket = io(`${VITE_API_URL_ORDER}/socket/task-rotation`, {
      path: "/socket/task-rotation",
      extraHeaders: { Authorization: `Bearer ${token ?? ""}` },
    });

    socket.on("connect", () => { console.log("✅ Connected to task-rotation socket"); });

    socket.on("task-rotation:approved", (payload: { id: number; approve_status: string; emp_code_approve: string; approve_time: string }) => {
      setWorklogs((prev) =>
        prev.map((wl) =>
          wl.id === payload.id
            ? { ...wl, approve_status: payload.approve_status as TaskRotation["approve_status"], approve_time: payload.approve_time, emp_code_approve: payload.emp_code_approve }
            : wl
        )
      );
    });

    socket.on("task-rotation:rejected", (payload: { id: number; approve_status: string; emp_code_approve: string; approve_time: string; reject_reason: string | null }) => {
      setWorklogs((prev) =>
        prev.map((wl) =>
          wl.id === payload.id
            ? { ...wl, approve_status: payload.approve_status as TaskRotation["approve_status"], approve_time: payload.approve_time, emp_code_approve: payload.emp_code_approve, reject_reason: payload.reject_reason }
            : wl
        )
      );
    });

    socket.on("task-rotation:deleted", (payload: { id: number }) => {
      setWorklogs((prev) => prev.filter((wl) => wl.id !== payload.id));
    });

    socket.on("disconnect", () => { console.log("Disconnected from task-rotation socket"); });
    return () => { socket.disconnect(); };
  }, []);

  const resetForm = () => setForm({ task_name: "", start_time: "", end_time: "" });

  const handleSubmit = async () => {
    if (!form.task_name.trim() || !form.start_time || !form.end_time) {
      Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ" });
      return;
    }
    if (form.end_time <= form.start_time) {
      Swal.fire({ icon: "warning", title: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น" });
      return;
    }
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("access_token");
      await axios.post(
        `${VITE_API_URL_ORDER}/api/task-rotation`,
        { task_name: form.task_name, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowModal(false);
      resetForm();
      fetchWorklogs();
      Swal.fire({ icon: "success", title: "บันทึกสำเร็จ", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Failed to create worklog", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึก Worklog ได้" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "ลบบันทึกนี้?",
      text: "รายการที่ลบแล้วจะไม่สามารถกู้คืนได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setDeletingId(id);
    try {
      const token = sessionStorage.getItem("access_token");
      await axios.delete(
        `${VITE_API_URL_ORDER}/api/task-rotation/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorklogs((prev) => prev.filter((wl) => wl.id !== id));
      Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("Failed to delete worklog", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถลบได้ กรุณาลองใหม่" });
    } finally {
      setDeletingId(null);
    }
  };

  const pending = worklogs.filter((w) => w.approve_status === "pending");
  const approved = worklogs.filter((w) => w.approve_status === "approve");
  const rejected = worklogs.filter((w) => w.approve_status === "reject");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Gradient header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white">บันทึกประวัติการทำงาน</h1>
          </div>
        </div>
      </div>


      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-28 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <svg className="animate-spin h-7 w-7 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-gray-400 text-base font-medium">กำลังโหลด...</p>
          </div>
        ) : (
          <>
            {/* Pending section */}
            <section className="mb-5">
              <SectionLabel label="รออนุมัติ" count={pending.length} color="amber" />
              {pending.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-amber-200 py-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-400">ไม่มีรายการรออนุมัติ</p>
                  <p className="text-sm text-gray-300 mt-1">กด "+ เพิ่ม Worklog" เพื่อสร้างรายการใหม่</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((wl) => (
                    <WorklogCard
                      key={wl.id}
                      wl={wl}
                      onDelete={handleDelete}
                      deleting={deletingId === wl.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Approved section */}
            <section className="mb-5">
              <SectionLabel label="อนุมัติแล้ว" count={approved.length} color="emerald" />
              {approved.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-emerald-200 py-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-400">ยังไม่มีรายการอนุมัติ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approved.map((wl) => <WorklogCard key={wl.id} wl={wl} />)}
                </div>
              )}
            </section>

            {/* Rejected section — only show if there are any */}
            {rejected.length > 0 && (
              <section>
                <SectionLabel label="ไม่อนุมัติ" count={rejected.length} color="red" />
                <div className="space-y-3">
                  {rejected.map((wl) => <WorklogCard key={wl.id} wl={wl} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-[100%] shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all text-base font-semibold"
        aria-label="เพิ่มบันทึก"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">เพิ่มบันทึกการทำงาน</h2>
                  <p className="text-blue-200 text-sm mt-0.5">กรอกรายละเอียดการทำงาน</p>
                </div>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-7 py-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่องาน</label>
                <input
                  type="text"
                  value={form.task_name}
                  onChange={(e) => setForm({ ...form, task_name: e.target.value })}
                  placeholder="กรอกชื่องาน..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาเริ่มต้น</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">เวลาสิ้นสุด</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              {form.start_time && form.end_time && form.end_time > form.start_time && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-2 text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">ระยะเวลา: <strong>{formatDuration(form.start_time, form.end_time)}</strong></span>
                </div>
              )}
            </div>

            <div className="px-7 pb-7 flex gap-3">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 py-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
