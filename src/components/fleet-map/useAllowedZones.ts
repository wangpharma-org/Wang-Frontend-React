import { useEffect, useState } from "react";
import { fetchAllowedZones } from "./api";

/** โหลดจุดที่อนุญาตเมื่อเปิดชั้นแผนที่ — เก็บผลไว้ใช้ร่วมกันทุกหน้าในแท็บเดียวกัน 10 นาที */
let shared: { at: number; value: Awaited<ReturnType<typeof fetchAllowedZones>> } | null = null;
export function useAllowedZones(enabled: boolean, reload = 0) {
  const [state, setState] = useState<{ loading: boolean; data: Awaited<ReturnType<typeof fetchAllowedZones>> | null; error: string | null }>({
    loading: false,
    data: shared?.value ?? null,
    error: null,
  });
  useEffect(() => {
    if (!enabled) return;
    if (!reload && shared && Date.now() - shared.at < 10 * 60_000) {
      setState({ loading: false, data: shared.value, error: null });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchAllowedZones()
      .then((value) => {
        shared = { at: Date.now(), value };
        if (alive) setState({ loading: false, data: value, error: null });
      })
      .catch(() => {
        if (alive) setState({ loading: false, data: null, error: "ไม่สามารถโหลดจุดที่อนุญาตได้" });
      });
    return () => {
      alive = false;
    };
  }, [enabled, reload]);
  return state;
}
