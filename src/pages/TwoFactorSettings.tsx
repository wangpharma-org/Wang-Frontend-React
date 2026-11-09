import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { RefreshCw, Search, ShieldCheck, ShieldOff, Users } from "lucide-react";
import TwoFactorSetup, { BackupCodes } from "../components/TwoFactorSetup";
import {
  AdminList,
  adminReset,
  adminSetRequired,
  apiError,
  disableTwoFactor,
  fetchAdminList,
  fetchTwoFactorStatus,
  METHOD_LABEL,
  regenerateBackupCodes,
  TwoFactorStatus,
} from "../components/twoFactor";

// OPHMBC-339 — ยืนยันตัวตน 2 ชั้นของระบบคลัง
//   ส่วนบน: ของฉัน (สมัคร / เปลี่ยนวิธี / ปิด / รหัสสำรอง)
//   ส่วนล่าง: จัดการพนักงาน — เฉพาะ manage_qc = Yes (auth เช็คสิทธิ์จริง ไม่มีสิทธิ์ = ไม่แสดง)

const askCode = async (title: string, text: string) => {
  const r = await Swal.fire({
    title,
    text,
    input: "text",
    inputAttributes: { inputmode: "numeric", autocomplete: "one-time-code", maxlength: "9" },
    inputPlaceholder: "รหัส 6 หลัก หรือรหัสสำรอง",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    inputValidator: (v) => (v && v.trim().length >= 6 ? null : "กรอกรหัสให้ครบ"),
  });
  return r.isConfirmed ? String(r.value).trim() : null;
};

function MySection() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [backup, setBackup] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchTwoFactorStatus());
      setError(null);
    } catch (e) {
      setError(apiError(e).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disable = async () => {
    const code = await askCode("ปิดการยืนยันตัวตน 2 ชั้น", "กรอกรหัสปัจจุบันเพื่อยืนยัน");
    if (!code) return;
    try {
      await disableTwoFactor(code);
      await Swal.fire({ icon: "success", title: "ปิดแล้ว", timer: 1200, showConfirmButton: false });
      void load();
    } catch (e) {
      Swal.fire({ icon: "error", title: "ปิดไม่ได้", text: apiError(e).message });
    }
  };

  const newBackup = async () => {
    const code = await askCode("ออกรหัสสำรองชุดใหม่", "รหัสสำรองชุดเดิมจะใช้ไม่ได้ทันที");
    if (!code) return;
    try {
      setBackup((await regenerateBackupCodes(code)).backup_codes);
    } catch (e) {
      Swal.fire({ icon: "error", title: "ไม่สำเร็จ", text: apiError(e).message });
    }
  };

  if (error) return <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!status) return <p className="text-sm text-gray-500">กำลังโหลด...</p>;
  if (!status.feature_enabled) {
    return (
      <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
        ระบบยังไม่เปิดใช้การยืนยันตัวตน 2 ชั้น
      </div>
    );
  }

  if (backup) {
    return (
      <div className="max-w-sm">
        <BackupCodes
          codes={backup}
          onDone={() => {
            setBackup(null);
            void load();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-my-two-factor>
      <div className="flex flex-wrap items-center gap-3">
        {status.method ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <ShieldCheck size={16} /> เปิดใช้: {METHOD_LABEL[status.method]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
            <ShieldOff size={16} /> ยังไม่ได้ตั้งค่า
          </span>
        )}
        {status.required && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">
            บัญชีนี้ต้องใช้ 2 ชั้น
          </span>
        )}
        {status.method && (
          <span className="text-sm text-gray-500">รหัสสำรองเหลือ {status.backup_codes_left} ชุด</span>
        )}
      </div>

      {editing ? (
        <div className="max-w-sm">
          <TwoFactorSetup
            methods={status.available_methods}
            currentMethod={status.method}
            onEnabled={(r) => {
              setEditing(false);
              setBackup(r.backup_codes);
            }}
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="mt-3 cursor-pointer text-sm text-gray-500 hover:underline"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-start-setup
            onClick={() => setEditing(true)}
            className="cursor-pointer rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
          >
            {status.method ? "เปลี่ยนวิธี" : "ตั้งค่าตอนนี้"}
          </button>
          {status.method && (
            <button
              type="button"
              onClick={newBackup}
              className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              ออกรหัสสำรองใหม่
            </button>
          )}
          {status.method && !status.required && (
            <button
              type="button"
              onClick={disable}
              className="cursor-pointer rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              ปิดการใช้งาน
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AdminSection() {
  const [data, setData] = useState<AdminList | null>(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busyEmp, setBusyEmp] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchAdminList());
      setError(null);
    } catch (e) {
      const err = apiError(e);
      if (err.status === 403) setHidden(true);
      else setError(err.message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const users = data?.users ?? [];
    if (!s) return users;
    return users.filter((u) =>
      [u.emp_code, u.username, u.name, u.nickname ?? ""].some((v) => v.toLowerCase().includes(s))
    );
  }, [data, q]);

  const toggle = async (empCode: string, selected: boolean) => {
    setBusyEmp(empCode);
    // ติ๊กให้เห็นทันที แล้วโหลดค่าจริงจาก auth (บันทึกไม่ได้ = load คืนค่าเดิม)
    setData((d) =>
      d
        ? {
            ...d,
            users: d.users.map((u) =>
              u.emp_code === empCode ? { ...u, selected: !selected } : u
            ),
          }
        : d
    );
    try {
      await adminSetRequired(empCode, !selected);
      await load();
    } catch (e) {
      await load();
      Swal.fire({ icon: "error", title: "บันทึกไม่ได้", text: apiError(e).message });
    } finally {
      setBusyEmp(null);
    }
  };

  const reset = async (empCode: string, name: string) => {
    const ok = await Swal.fire({
      icon: "warning",
      title: `รีเซ็ต 2FA ของ ${name || empCode}?`,
      text: "ใช้เมื่อมือถือหาย / ถูกล็อค — ถ้ายังถูกบังคับ เข้าระบบครั้งหน้าต้องตั้งค่าใหม่",
      showCancelButton: true,
      confirmButtonText: "รีเซ็ต",
      cancelButtonText: "ยกเลิก",
    });
    if (!ok.isConfirmed) return;
    setBusyEmp(empCode);
    try {
      await adminReset(empCode);
      await load();
    } catch (e) {
      Swal.fire({ icon: "error", title: "รีเซ็ตไม่ได้", text: apiError(e).message });
    } finally {
      setBusyEmp(null);
    }
  };

  if (hidden) return null;

  return (
    <section className="mt-10" data-admin-two-factor>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Users size={20} /> จัดการพนักงาน
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <RefreshCw size={14} /> โหลดใหม่
        </button>
      </div>
      {data && (
        <p className="mt-1 text-sm text-gray-500">
          บังคับตาม role: {data.required_roles.length ? data.required_roles.join(", ") : "ไม่มี"} ·
          เลือกเพิ่มรายคนได้ด้านล่าง
        </p>
      )}
      {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="relative mt-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหารหัส / ชื่อ / ชื่อเล่น"
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm"
        />
      </div>

      {!data ? (
        !error && <p className="mt-4 text-sm text-gray-500">กำลังโหลด...</p>
      ) : (
        <>
          {/* เดสก์ท็อป: ตาราง · มือถือ: การ์ด */}
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">รหัส</th>
                  <th className="px-3 py-2">ชื่อ</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">วิธีที่ใช้</th>
                  <th className="px-3 py-2">ต้องใช้</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.user_id} className="border-t border-gray-100" data-emp={u.emp_code}>
                    <td className="px-3 py-2 font-mono">{u.emp_code}</td>
                    <td className="px-3 py-2">
                      {u.name}
                      {u.nickname && <span className="text-gray-400"> ({u.nickname})</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{u.user_role}</td>
                    <td className="px-3 py-2">
                      <MethodBadge method={u.method} locked={u.locked} />
                    </td>
                    <td className="px-3 py-2">
                      <RequiredToggle
                        selected={u.selected}
                        required={u.required}
                        disabled={busyEmp === u.emp_code}
                        onToggle={() => toggle(u.emp_code, u.selected)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(u.method || u.locked) && (
                        <button
                          type="button"
                          onClick={() => reset(u.emp_code, u.name)}
                          className="cursor-pointer text-sm text-red-600 hover:underline"
                        >
                          รีเซ็ต
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-2 md:hidden">
            {rows.map((u) => (
              <div key={u.user_id} className="rounded-lg border border-gray-200 p-3" data-emp-card={u.emp_code}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-sm">{u.emp_code}</div>
                    <div className="truncate text-sm">
                      {u.name}
                      {u.nickname && <span className="text-gray-400"> ({u.nickname})</span>}
                    </div>
                    <div className="text-xs text-gray-500">{u.user_role}</div>
                  </div>
                  <MethodBadge method={u.method} locked={u.locked} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <RequiredToggle
                    selected={u.selected}
                    required={u.required}
                    disabled={busyEmp === u.emp_code}
                    onToggle={() => toggle(u.emp_code, u.selected)}
                  />
                  {(u.method || u.locked) && (
                    <button
                      type="button"
                      onClick={() => reset(u.emp_code, u.name)}
                      className="cursor-pointer text-sm text-red-600 hover:underline"
                    >
                      รีเซ็ต
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {rows.length === 0 && <p className="mt-4 text-sm text-gray-500">ไม่พบพนักงาน</p>}
        </>
      )}
    </section>
  );
}

function MethodBadge({ method, locked }: { method: AdminList["users"][number]["method"]; locked: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {method ? (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
          {method === "totp" ? "แอป Authenticator" : "LINE (ระบบ HR)"}
        </span>
      ) : (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">ยังไม่ตั้ง</span>
      )}
      {locked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">ถูกล็อค</span>}
    </span>
  );
}

function RequiredToggle({
  selected,
  required,
  disabled,
  onToggle,
}: {
  selected: boolean;
  required: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={onToggle}
        className="h-4 w-4 cursor-pointer accent-blue-500"
        data-required-toggle
      />
      <span>เลือกให้ต้องใช้</span>
      {required && !selected && <span className="text-xs text-orange-600">(บังคับตาม role)</span>}
    </label>
  );
}

const TwoFactorSettings = () => (
  <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
      <ShieldCheck className="text-blue-500" /> ยืนยันตัวตน 2 ชั้น
    </h1>
    <p className="mt-1 text-sm text-gray-500">
      เข้าระบบคลังด้วยรหัสผ่าน + รหัส 6 หลักจากมือถือ เพื่อกันคนอื่นใช้บัญชีของคุณ
    </p>
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-bold text-gray-900">ของฉัน</h2>
      <MySection />
    </section>
    <AdminSection />
  </div>
);

export default TwoFactorSettings;
