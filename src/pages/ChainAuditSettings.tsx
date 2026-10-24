import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save } from "lucide-react";

// ตั้งค่าเหตุผลหักแต้มของสายตรวจในคลัง: คนที่อยู่ถัดไปตรวจและหักแต้มคนก่อนหน้า
// รับเข้า → โหลดเข้าคลัง → หยิบ → QC · backend: /api/chain-audit (Wang-OrderPickingService)

const apiUrl = `${import.meta.env.VITE_API_URL_ORDER}/api/chain-audit`;
const authHeaders = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
});
const MAX_POINTS = 100;

interface Reason {
  id?: number;
  code?: string;
  label: string;
  points: number;
  is_active: boolean;
  updated_by_emp_code?: string | null;
  updated_at?: string;
}

interface Stage {
  auditor_station: string;
  audited_station: string;
  title: string;
  description: string;
  reasons: Reason[];
}

const stageKey = (s: Stage) => `${s.auditor_station}>${s.audited_station}`;
const editable = (r: Reason) => ({ label: r.label, points: r.points, is_active: r.is_active, id: r.id });

const errorMessage = (err: unknown) => {
  const message = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่";
};

function isAdmin(): boolean {
  try {
    return JSON.parse(sessionStorage.getItem("user_info") || "{}").manage_product === "Yes";
  } catch {
    return false;
  }
}

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const ChainAuditSettings = () => {
  const admin = useMemo(isAdmin, []);
  const [stages, setStages] = useState<Stage[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Reason[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const applyStages = (data: Stage[]) => {
    setStages(data);
    setDrafts(Object.fromEntries(data.map((s) => [stageKey(s), s.reasons.map((r) => ({ ...r }))])));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await axios.get<Stage[]>(`${apiUrl}/reasons`, authHeaders());
      applyStages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (key: string, fn: (rows: Reason[]) => Reason[]) =>
    setDrafts((prev) => ({ ...prev, [key]: fn(prev[key] ?? []) }));

  const isDirty = (stage: Stage) =>
    JSON.stringify((drafts[stageKey(stage)] ?? []).map(editable)) !== JSON.stringify(stage.reasons.map(editable));

  const problems = (rows: Reason[]): string | null => {
    const labels = rows.map((r) => r.label.trim().toLowerCase());
    if (labels.some((l) => !l)) return "มีเหตุผลที่ยังไม่ได้พิมพ์ข้อความ";
    if (new Set(labels).size !== labels.length) return "ข้อความเหตุผลซ้ำกัน";
    if (rows.some((r) => !Number.isInteger(r.points) || r.points < 0 || r.points > MAX_POINTS))
      return `แต้มต้องเป็นจำนวนเต็ม 0–${MAX_POINTS}`;
    return null;
  };

  const save = async (stage: Stage) => {
    const key = stageKey(stage);
    const rows = drafts[key] ?? [];
    const problem = problems(rows);
    if (problem) {
      void Swal.fire({ icon: "warning", title: problem, confirmButtonText: "ตกลง" });
      return;
    }
    setSaving(key);
    try {
      const res = await axios.put<Stage[]>(
        `${apiUrl}/reasons/${stage.auditor_station}/${stage.audited_station}`,
        { reasons: rows.map((r) => ({ ...(r.id ? { id: r.id } : {}), label: r.label.trim(), points: r.points, is_active: r.is_active })) },
        authHeaders(),
      );
      applyStages(res.data);
      void Swal.fire({ icon: "success", title: "บันทึกแล้ว", timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) {
      void Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: errorMessage(err), confirmButtonText: "ตกลง" });
    } finally {
      setSaving(null);
    }
  };

  const move = (key: string, index: number, delta: number) =>
    updateDraft(key, (rows) => {
      const next = [...rows];
      const target = index + delta;
      if (target < 0 || target >= next.length) return rows;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ตั้งค่าแต้ม — คนหลังตรวจคนก่อน</h1>
      <p className="mt-1 text-sm text-gray-600">
        สายในคลัง: รับเข้า → โหลดเข้าคลัง → หยิบ → QC · คนที่อยู่ถัดไปตรวจงานคนก่อนหน้า แล้วเลือกเหตุผลเพื่อหักแต้ม
      </p>
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ตอนนี้เป็นการตั้งค่าล่วงหน้า — ยังไม่มีปุ่มหักแต้มในหน้า QC · เหตุผลที่ปิดไว้จะไม่ขึ้นให้เลือก · แก้ได้เฉพาะผู้มีสิทธิ์จัดการสินค้า
      </div>

      {loading ? (
        <p className="py-10 text-center text-gray-500">กำลังโหลด...</p>
      ) : loadError ? (
        <div className="py-10 text-center">
          <p className="text-red-600">{loadError}</p>
          <button onClick={() => void load()} className="mt-3 rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
            ลองใหม่
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {stages.map((stage) => {
            const key = stageKey(stage);
            const rows = drafts[key] ?? [];
            const dirty = isDirty(stage);
            const activeCount = rows.filter((r) => r.is_active).length;
            return (
              <section key={key} className="rounded-xl border border-gray-200 bg-white shadow-sm" data-stage={key}>
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{stage.title}</h2>
                    <p className="text-sm text-gray-500">{stage.description}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    เปิดใช้ {activeCount}/{rows.length} เหตุผล
                  </span>
                </header>

                {rows.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">ยังไม่มีเหตุผลในขั้นนี้</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {rows.map((r, index) => (
                      <li key={r.id ?? `new-${index}`} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${r.is_active ? "" : "bg-gray-50"}`}>
                        <span className="w-6 text-center text-sm font-semibold text-gray-400">{index + 1}</span>
                        <input
                          aria-label={`ข้อความเหตุผลข้อ ${index + 1}`}
                          value={r.label}
                          disabled={!admin}
                          maxLength={255}
                          onChange={(e) => updateDraft(key, (all) => all.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))}
                          className={`min-w-0 flex-1 basis-56 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-transparent ${r.is_active ? "border-gray-300" : "border-gray-200 text-gray-500"}`}
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          หัก
                          <input
                            aria-label={`แต้มข้อ ${index + 1}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={MAX_POINTS}
                            step={1}
                            value={Number.isNaN(r.points) ? "" : r.points}
                            disabled={!admin}
                            onChange={(e) =>
                              updateDraft(key, (all) => all.map((x, i) => (i === index ? { ...x, points: e.target.value === "" ? NaN : Number(e.target.value) } : x)))
                            }
                            className="w-20 rounded-md border border-gray-300 px-2 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-transparent"
                          />
                          แต้ม
                        </label>
                        <Toggle
                          checked={r.is_active}
                          disabled={!admin}
                          label={`เปิดใช้ข้อ ${index + 1}`}
                          onChange={() => updateDraft(key, (all) => all.map((x, i) => (i === index ? { ...x, is_active: !x.is_active } : x)))}
                        />
                        {admin && (
                          <div className="flex gap-1">
                            <button type="button" aria-label="เลื่อนขึ้น" disabled={index === 0} onClick={() => move(key, index, -1)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button type="button" aria-label="เลื่อนลง" disabled={index === rows.length - 1} onClick={() => move(key, index, 1)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        {r.updated_at && r.updated_by_emp_code && (
                          <span className="basis-full pl-9 text-xs text-gray-400">
                            แก้ล่าสุดโดย {r.updated_by_emp_code} · {dayjs(r.updated_at).format("DD/MM/YYYY HH:mm")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {admin && (
                  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => updateDraft(key, (all) => [...all, { label: "", points: 1, is_active: true }])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4" /> เพิ่มเหตุผล
                    </button>
                    <div className="flex items-center gap-2">
                      {dirty && <span className="text-sm text-amber-600">ยังไม่ได้บันทึก</span>}
                      <button
                        type="button"
                        disabled={!dirty || saving === key}
                        onClick={() => setDrafts((prev) => ({ ...prev, [key]: stage.reasons.map((r) => ({ ...r })) }))}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                      >
                        <RotateCcw className="h-4 w-4" /> ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={!dirty || saving === key}
                        onClick={() => void save(stage)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        <Save className="h-4 w-4" /> {saving === key ? "กำลังบันทึก..." : "บันทึก"}
                      </button>
                    </div>
                  </footer>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChainAuditSettings;
