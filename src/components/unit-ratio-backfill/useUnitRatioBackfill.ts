import { useCallback, useState } from "react";
import {
  DryRunResult,
  errorMessage,
  LIVE_TARGET,
  RunResult,
  dryRunBackfill,
  runBackfill,
} from "./unitRatioBackfillApi";

export type TargetStatus = "pending" | "running" | "done" | "error";

export interface TargetProgress {
  target: string;
  status: TargetStatus;
  result?: RunResult;
  error?: string;
}

export function useUnitRatioBackfill() {
  const [file, setFileState] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<TargetProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  // เปลี่ยนไฟล์แล้วผล dry run เดิมใช้ไม่ได้ ต้องตรวจใหม่ก่อนรันจริงทุกครั้ง
  const setFile = useCallback((next: File | null) => {
    setFileState(next);
    setDryRun(null);
    setProgress([]);
    setError(null);
  }, []);

  const check = useCallback(async () => {
    if (!file) return;
    setChecking(true);
    setError(null);
    setProgress([]);
    try {
      setDryRun(await dryRunBackfill(file));
    } catch (err: unknown) {
      setDryRun(null);
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }, [file]);

  // รันทีละเดือนต่อกัน — แต่ละ request ไม่นานเกิน timeout และหยุดทันทีถ้าเดือนไหนพัง
  const runAll = useCallback(async () => {
    if (!file || !dryRun) return;
    const targets = [...dryRun.months.map((m) => m.key), LIVE_TARGET];
    setRunning(true);
    setError(null);
    setProgress(targets.map((target) => ({ target, status: "pending" })));

    const update = (target: string, patch: Partial<TargetProgress>) =>
      setProgress((prev) =>
        prev.map((p) => (p.target === target ? { ...p, ...patch } : p)),
      );

    for (const target of targets) {
      update(target, { status: "running" });
      try {
        const result = await runBackfill(file, target);
        update(target, { status: "done", result });
      } catch (err: unknown) {
        const message = errorMessage(err);
        update(target, { status: "error", error: message });
        setError(`หยุดที่ ${target}: ${message}`);
        break;
      }
    }
    setRunning(false);
  }, [file, dryRun]);

  return { file, setFile, dryRun, checking, check, running, runAll, progress, error };
}
