import { useMemo } from "react";
import Swal from "sweetalert2";
import { CheckCircle2, Database, FlaskConical, Loader2, Play, XCircle } from "lucide-react";
import {
  DryRunResult,
  LIVE_TARGET,
  SuspiciousRatio,
  UnmatchedCombo,
} from "../components/unit-ratio-backfill/unitRatioBackfillApi";
import {
  TargetProgress,
  useUnitRatioBackfill,
} from "../components/unit-ratio-backfill/useUnitRatioBackfill";

const fmt = (n: number) => n.toLocaleString("th-TH");
const pct = (part: number, total: number) =>
  total > 0 ? `${((part / total) * 100).toFixed(2)}%` : "-";

// แก้บิลย้อนหลังทั้งระบบ — backend ก็เช็ค manage_product ซ้ำอีกชั้น
const isAdmin = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user_info") || "{}")?.manage_product === "Yes";
  } catch {
    return false;
  }
};

const targetLabel = (target: string) =>
  target === LIVE_TARGET ? "ตาราง live (shopping_order)" : `เดือน ${target}`;

function StatCard({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "green" | "amber" | "red";
}) {
  const toneClass = {
    slate: "text-slate-800",
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function DryRunSummary({ result }: { result: DryRunResult }) {
  const { totals, file } = result;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        ไฟล์: {fmt(file.units)} หน่วย / {fmt(file.products)} สินค้า
        {file.invalidRows > 0 && (
          <span className="text-amber-600"> · ข้าม {fmt(file.invalidRows)} แถวที่ ratio ไม่ถูกต้อง</span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="รายการบิล (6 เดือน)" value={fmt(totals.lines)} sub={`มี ratio แล้ว ${fmt(totals.alreadyFilled)}`} />
        <StatCard
          label="จะเติม ratio"
          value={fmt(totals.willFill)}
          sub={pct(totals.willFill, totals.lines - totals.alreadyFilled) + " ของที่ยังว่าง"}
          tone="green"
        />
        <StatCard
          label="ชื่อหน่วยไม่ตรง (ปล่อยว่าง)"
          value={fmt(totals.renamedUnit)}
          sub="หน่วยถูกเปลี่ยนชื่อ / ไม่ได้ระบุหน่วย"
          tone="amber"
        />
        <StatCard label="ไม่มีสินค้าใน ecommerce" value={fmt(totals.productMissing)} tone="red" />
      </div>
      <p className="text-xs text-slate-500">
        ตรงทั้งรหัสและชื่อหน่วย {fmt(totals.exactMatch)} · สินค้าหน่วยเดียว (ratio = 1){" "}
        {fmt(totals.singleUnit)} · ตาราง live: จะเติม {fmt(result.liveTable.willFill)} จาก{" "}
        {fmt(result.liveTable.lines)}
      </p>
    </div>
  );
}

function MonthTable({
  result,
  progress,
}: {
  result: DryRunResult;
  progress: TargetProgress[];
}) {
  const progressMap = useMemo(
    () => new Map(progress.map((p) => [p.target, p])),
    [progress],
  );
  const rows = useMemo(
    () => [
      ...result.months.map((m) => ({ target: m.key, lines: m.lines, willFill: m.willFill })),
      { target: LIVE_TARGET, lines: result.liveTable.lines, willFill: result.liveTable.willFill },
    ],
    [result],
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-2">ช่วงข้อมูล</th>
            <th className="px-4 py-2 text-right">รายการทั้งหมด</th>
            <th className="px-4 py-2 text-right">dry run: จะเติม</th>
            <th className="px-4 py-2 text-right">เติมจริง</th>
            <th className="px-4 py-2">สถานะ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const p = progressMap.get(row.target);
            const updated = p?.result
              ? p.result.exactUpdated + p.result.singleUnitUpdated
              : null;
            return (
              <tr key={row.target}>
                <td className="px-4 py-2 font-medium text-slate-700">{targetLabel(row.target)}</td>
                <td className="px-4 py-2 text-right">{fmt(row.lines)}</td>
                <td className="px-4 py-2 text-right">{fmt(row.willFill)}</td>
                <td className="px-4 py-2 text-right">{updated === null ? "-" : fmt(updated)}</td>
                <td className="px-4 py-2">
                  <StatusBadge progress={p} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ progress }: { progress?: TargetProgress }) {
  if (!progress) return <span className="text-slate-400">-</span>;
  switch (progress.status) {
    case "pending":
      return <span className="text-slate-400">รอ</span>;
    case "running":
      return (
        <span className="inline-flex items-center gap-1 text-blue-600">
          <Loader2 size={14} className="animate-spin" /> กำลังทำ
        </span>
      );
    case "done":
      return (
        <span className="inline-flex items-center gap-1 text-green-600">
          <CheckCircle2 size={14} /> เสร็จ ({((progress.result?.durationMs ?? 0) / 1000).toFixed(1)}s)
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-red-600" title={progress.error}>
          <XCircle size={14} /> ผิดพลาด
        </span>
      );
  }
}

function UnmatchedTable({ rows }: { rows: UnmatchedCombo[] }) {
  if (rows.length === 0) return null;
  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
        รายการที่จะปล่อย ratio ว่าง (100 อันดับแรก) — ลูกค้าจะเลือก lot เองแทน
      </summary>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">รหัสสินค้า</th>
              <th className="px-4 py-2">หน่วยในบิล</th>
              <th className="px-4 py-2 text-right">รายการ</th>
              <th className="px-4 py-2">หน่วยใน ecommerce ตอนนี้</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.pro_code}|${row.so_unit ?? ""}`}>
                <td className="px-4 py-2 font-mono">{row.pro_code}</td>
                <td className="px-4 py-2">{row.so_unit || <span className="text-slate-400">(ว่าง)</span>}</td>
                <td className="px-4 py-2 text-right">{fmt(row.lines)}</td>
                <td className="px-4 py-2 text-slate-500">
                  {row.reason === "product_missing" ? (
                    <span className="text-red-600">ไม่มีสินค้านี้</span>
                  ) : (
                    row.ecom_units
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function SuspiciousTable({ rows }: { rows: SuspiciousRatio[] }) {
  if (rows.length === 0) return null;
  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-800">
        ratio สูงผิดปกติ (≥ 1,000) ที่ถูกใช้ในบิล {rows.length} รายการ — ควรให้ทีมสินค้าตรวจ
      </summary>
      <div className="max-h-72 overflow-auto bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">รหัสสินค้า</th>
              <th className="px-4 py-2">หน่วย</th>
              <th className="px-4 py-2 text-right">ratio</th>
              <th className="px-4 py-2 text-right">รายการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.pro_code}|${row.unit_name}`}>
                <td className="px-4 py-2 font-mono">{row.pro_code}</td>
                <td className="px-4 py-2">{row.unit_name}</td>
                <td className="px-4 py-2 text-right">{fmt(row.ratio)}</td>
                <td className="px-4 py-2 text-right">{fmt(row.lines)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const UnitRatioBackfill = () => {
  const admin = useMemo(isAdmin, []);
  const { file, setFile, dryRun, checking, check, running, runAll, progress, error } =
    useUnitRatioBackfill();

  const finished = progress.length > 0 && progress.every((p) => p.status === "done");

  const confirmRun = async () => {
    if (!dryRun) return;
    const ok = await Swal.fire({
      icon: "warning",
      title: "ยืนยัน migrate จริง?",
      html: `จะเติม ratio <b>${fmt(dryRun.totals.willFill + dryRun.liveTable.willFill)}</b> รายการ<br/>ทีละเดือน ${dryRun.months.length} เดือน + ตาราง live<br/><small>เติมเฉพาะรายการที่ยังว่าง รันซ้ำได้ไม่ทับค่าเดิม</small>`,
      showCancelButton: true,
      confirmButtonText: "เริ่ม migrate",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (ok.isConfirmed) await runAll();
  };

  if (!admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-xl font-bold text-red-600">เฉพาะผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Database className="text-blue-600" />
            Migrate อัตราส่วนหน่วย (so_unit_ratio)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            เติม ratio ให้บิลย้อนหลัง 6 เดือน จาก product_unit ของ ecommerce — ใช้ไฟล์ CSV
            ที่มีคอลัมน์ <code className="rounded bg-slate-100 px-1">pro_code,unit_name,ratio,level</code>
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={checking || running}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium hover:file:bg-slate-200 sm:max-w-md"
            />
            <button
              type="button"
              onClick={() => void check()}
              disabled={!file || checking || running}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {checking ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
              {checking ? "กำลังตรวจ..." : "Dry run"}
            </button>
            <button
              type="button"
              onClick={() => void confirmRun()}
              disabled={!dryRun || checking || running || finished}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:bg-slate-300"
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {running ? "กำลัง migrate..." : "Migrate จริง"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Dry run ไม่แก้ข้อมูล · ต้อง dry run กับไฟล์เดียวกันก่อนถึงจะกด migrate ได้
          </p>
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}
          {finished && (
            <p className="mt-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
              Migrate เสร็จครบทุกช่วง — กด Dry run อีกครั้งเพื่อตรวจผลได้
            </p>
          )}
        </div>

        {dryRun && (
          <>
            <DryRunSummary result={dryRun} />
            <MonthTable result={dryRun} progress={progress} />
            <SuspiciousTable rows={dryRun.suspicious} />
            <UnmatchedTable rows={dryRun.unmatched} />
          </>
        )}
      </div>
    </div>
  );
};

export default UnitRatioBackfill;
