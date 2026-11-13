import { useEffect, useState } from "react";
import { ConnectionStatus, errorMessage, fetchConnectionStatus } from "./api";

/**
 * สถานะการเชื่อมต่อ Cartrack / Vision / OSRM (MA-374) — ถามร่วมกันทุก component ทุก 30 วินาที
 * error = เรียกเซิร์ฟเวอร์ระบบขนส่งเองไม่ได้ (คนละเรื่องกับ Cartrack ล่ม)
 */
const POLL_MS = 30_000;
type State = { status: ConnectionStatus | null; error: string | null; at: number };
let state: State = { status: null, error: null, at: 0 };
const listeners = new Set<(s: State) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function poll() {
  if (document.hidden && state.status) return;
  try {
    state = { status: await fetchConnectionStatus(), error: null, at: Date.now() };
  } catch (e) {
    state = { ...state, error: errorMessage(e), at: Date.now() };
  }
  listeners.forEach((l) => l(state));
}

export function refreshFleetStatus() {
  return poll();
}

export function useFleetStatus() {
  const [s, setS] = useState<State>(state);
  useEffect(() => {
    listeners.add(setS);
    if (!timer) {
      poll();
      timer = setInterval(poll, POLL_MS);
    } else setS(state);
    return () => {
      listeners.delete(setS);
      if (!listeners.size && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return s;
}
