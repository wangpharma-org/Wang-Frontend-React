/// <reference types="vite/client" />
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APIProvider } from "@vis.gl/react-google-maps";
import {
  canSeeFleetMap,
  DaySummary,
  DayTrips,
  errorMessage,
  fetchDays,
  fetchPath,
  fetchStops,
  fetchTrips,
  fetchVehicles,
  FleetSnapshot,
  FleetStatus,
  FleetVehicle,
  STATUS_META,
  STATUS_ORDER,
  Trip,
  VehiclePath,
  driverOf,
  routesText,
  VehicleStops,
  replayAt,
  compassThai,
  fetchVehicleLive,
  TrackPoint,
  fetchNextStop,
  NextStop,
} from "../components/fleet-map/api";
import FleetGoogleMap, { FitRequest } from "../components/fleet-map/FleetGoogleMap";
import CameraStrip from "../components/fleet-map/CameraStrip";
import { useAllowedZones } from "../components/fleet-map/useAllowedZones";
import ConnectionBanner, { ConnectionDot } from "../components/fleet-map/ConnectionBanner";
import VehicleDetail, { StatusBadge } from "../components/fleet-map/VehicleDetail";
import { ago, todayBkk } from "../components/fleet-map/format";
import LogisticsNav from "../components/logistics/LogisticsNav";
import { FleetNav } from "../components/fleet-map/FleetLayout";

/**
 * แผนที่รถ (GPS Cartrack) — MA-374 / MA-377
 * หน้า Map › Fleet ของเว็บ Cartrack ทำใหม่ในระบบเรา: รายการรถซ้าย แผนที่ขวา → กดรถ → กิจกรรม/trip/เส้นทาง
 * อ่านอย่างเดียว ไม่มีปุ่มสั่งงานรถ · เฉพาะ MANAGER / ADMIN (backend ตรวจซ้ำ)
 */
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const REFRESH_MS = 30_000;
/** โหมดติดตามรถ: ถามตำแหน่งทุก 5 วินาที */
const LIVE_MS = 5_000;
/** ร้านถัดไป: ถามทุก 15 วินาที (backend คำนวณใหม่เมื่อรถส่งตำแหน่งใหม่) */
const NEXT_STOP_MS = 15_000;
type Tab = "all" | "visible" | "notVisible";

const shiftDay = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export default function FleetMap() {
  const navigate = useNavigate();
  const allowed = canSeeFleetMap();

  const [snap, setSnap] = useState<FleetSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("visible");
  const [statusFilter, setStatusFilter] = useState<Set<FleetStatus>>(new Set());
  // ตัวกรองเพิ่มเติม + การเรียง (เทียบเมนูตัวกรองของเว็บ Cartrack)
  const [colourFilter, setColourFilter] = useState("all");
  const [engineFilter, setEngineFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState<"all" | "with" | "without">("all");
  const [sortBy, setSortBy] = useState<"name" | "status" | "recent" | "speed">("name");
  const [cluster, setCluster] = useState(true);
  // ชั้น "จุดที่อนุญาต" (จาก HRSoft) — โหลดเมื่อเปิดเท่านั้น
  const [showZones, setShowZones] = useState(false);
  const zonesState = useAllowedZones(showZones);
  const allowedZones = showZones && zonesState.data?.ok ? zonesState.data.zones : null;
  const zoneOwnerName = (code: string) =>
    (zonesState.data?.ok ? zonesState.data.drivers.find((d) => d.employeeCode === code)?.empName : null) ?? null;
  const [fit, setFit] = useState<FitRequest | null>(null);
  const fitId = useRef(0);
  const fittedOnce = useRef(false);
  const loadingRef = useRef(false);

  // รถที่เลือก
  const [selectedReg, setSelectedReg] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [day, setDay] = useState(todayBkk());
  const defaultDaysRange = () => ({ from: shiftDay(todayBkk(), -6), to: todayBkk() });
  const [daysRange, setDaysRange] = useState(defaultDaysRange);
  const daysToken = useRef(0);
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [daysLoading, setDaysLoading] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [dayTrips, setDayTrips] = useState<DayTrips | null>(null);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [path, setPath] = useState<VehiclePath | null>(null);
  const [stops, setStops] = useState<VehicleStops | null>(null);
  // เวลาที่เลือกบนแถบช่วงเวลา → แสดงตำแหน่งรถย้อนหลังบนแผนที่
  const [cursor, setCursor] = useState<number | null>(null);
  const [stopsError, setStopsError] = useState<string | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const detailToken = useRef(0); // กันผลของรถ/วันก่อนหน้ามาทับเมื่อกดเปลี่ยนเร็ว

  const requestFit = (points: google.maps.LatLngLiteral[]) => {
    if (points.length) setFit({ id: ++fitId.current, points });
  };

  const selected = useMemo(
    () => snap?.vehicles.find((v) => v.registration === selectedReg) ?? null,
    [snap, selectedReg],
  );

  const colours = useMemo(() => [...new Set((snap?.vehicles ?? []).map((v) => v.colour).filter(Boolean) as string[])].sort(), [snap]);
  const engines = useMemo(() => [...new Set((snap?.vehicles ?? []).map((v) => v.engineType).filter(Boolean) as string[])].sort(), [snap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (snap?.vehicles ?? []).filter((v) => {
      if (tab === "visible" && !v.visible) return false;
      if (tab === "notVisible" && v.visible) return false;
      if (statusFilter.size && !statusFilter.has(v.status)) return false;
      if (colourFilter !== "all" && v.colour !== colourFilter) return false;
      if (engineFilter !== "all" && v.engineType !== engineFilter) return false;
      if (driverFilter === "with" && !driverOf(v)) return false;
      if (driverFilter === "without" && driverOf(v)) return false;
      return (
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.registration.toLowerCase().includes(q) ||
        (driverOf(v) ?? "").toLowerCase().includes(q) ||
        routesText(v.currentDriver?.routes).toLowerCase().includes(q)
      );
    });
    const byName = (a: FleetVehicle, b: FleetVehicle) => a.name.localeCompare(b.name, "th");
    const sorters: Record<typeof sortBy, (a: FleetVehicle, b: FleetVehicle) => number> = {
      name: byName,
      status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || byName(a, b),
      recent: (a, b) => (b.lastEventAt ?? "").localeCompare(a.lastEventAt ?? ""),
      speed: (a, b) => (b.speed ?? -1) - (a.speed ?? -1) || byName(a, b),
    };
    return [...rows].sort(sorters[sortBy]);
  }, [snap, query, tab, statusFilter, colourFilter, engineFilter, driverFilter, sortBy]);

  const load = useCallback(async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    if (!silent) setError(null);
    try {
      const s = await fetchVehicles();
      setSnap(s);
      setError(null);
    } catch (e) {
      // รีเฟรชเบื้องหลังล้ม → เก็บข้อมูลเดิมไว้ แค่บอกว่าอาจไม่ล่าสุด
      setError(errorMessage(e));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // โหลดครั้งแรก + รีเฟรชทุก 30 วิ (หยุดเมื่อแท็บถูกซ่อน)
  useEffect(() => {
    if (!allowed) return;
    load();
    const t = setInterval(() => { if (!document.hidden) load(true); }, REFRESH_MS);
    const onVis = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [allowed, load]);

  // fit รถทั้งหมดครั้งแรกที่ได้ข้อมูล · ติดตามรถเมื่อเปิดโหมดติดตาม
  useEffect(() => {
    if (!snap) return;
    if (!fittedOnce.current) {
      fittedOnce.current = true;
      requestFit(filtered.filter((v) => v.lat != null).map((v) => ({ lat: v.lat!, lng: v.lng! })));
    }
    // โหมดติดตาม: กล้องเลื่อนตามรถใน FollowLayer
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ทำเฉพาะตอนได้ snapshot ใหม่
  }, [snap]);

  const loadDays = useCallback((reg: string, range: { from: string; to: string }) => {
    const token = ++daysToken.current;
    const alive = () => token === daysToken.current;
    setDaysLoading(true);
    setDaysError(null);
    fetchDays(reg, range.from, range.to)
      .then((d) => alive() && setDays(d))
      .catch((e) => alive() && setDaysError(errorMessage(e)))
      .finally(() => alive() && setDaysLoading(false));
  }, []);

  // fitPath: ปรับแผนที่ให้เห็นเส้นทางทั้งวัน (ตอนเลือกดูวันที่ผ่านมา) — กดที่รถวันนี้จะซูมที่รถแทน ไม่ถอยออก
  const loadDetail = useCallback(async (reg: string, date: string, withDays: boolean, range?: { from: string; to: string }, fitPath = false) => {
    const token = ++detailToken.current;
    const alive = () => token === detailToken.current;
    setTripsLoading(true); setTripsError(null); setDayTrips(null);
    setPathLoading(true); setPath(null);
    setStops(null); setStopsError(null); setCursor(null);

    if (withDays && range) loadDays(reg, range);
    fetchStops(reg, date)
      .then((s) => alive() && setStops(s))
      .catch((e) => alive() && setStopsError(errorMessage(e)));
    fetchTrips(reg, date)
      .then((t) => alive() && setDayTrips(t))
      .catch((e) => alive() && setTripsError(errorMessage(e)))
      .finally(() => alive() && setTripsLoading(false));
    // เส้นทางช้าที่สุด (จุด GPS หลายพันจุด) — เป็นของเสริม ล้มก็ยังดู trip ได้
    try {
      const pth = await fetchPath(reg, date);
      if (!alive()) return;
      setPath(pth);
      if (fitPath) {
        setFollowing(false);
        requestFit(pth.points.map(([lat, lng]) => ({ lat, lng })));
      }
    } catch {
      /* ไม่ต้องขึ้น error ทั้งแผง */
    } finally {
      if (alive()) setPathLoading(false);
    }
  }, [loadDays]);

  const select = (v: FleetVehicle) => {
    // กดรถคันเดิมซ้ำ = ซูมกลับไปที่รถ
    if (v.registration === selectedReg) {
      if (v.lat != null) requestFit([{ lat: v.lat, lng: v.lng! }]);
      return;
    }
    const today = todayBkk();
    const range = defaultDaysRange();
    setSelectedReg(v.registration);
    setFollowing(false);
    setDetailTab("trips");
    setDay(today);
    setDays(null);
    setDaysRange(range);
    if (v.lat != null) requestFit([{ lat: v.lat, lng: v.lng! }]);
    // ไม่มีตำแหน่งปัจจุบัน → ให้เห็นเส้นทางของวันแทน
    loadDetail(v.registration, today, true, range, v.lat == null);
  };

  // ───── โหมดติดตามรถแบบเรียลไทม์: ถามตำแหน่งทุก 5 วินาที + เส้นทางที่เพิ่งวิ่งผ่าน ─────
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [onRoad, setOnRoad] = useState(false);
  const [displayT, setDisplayT] = useState<number | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!following || !selectedReg) {
      setTrack([]);
      setDisplayT(null);
      return;
    }
    // ระหว่างรอคำตอบแรก ใช้เส้นทาง 20 นาทีล่าสุดของวันนี้ (ถ้าโหลดแล้ว)
    const cutoff = Date.now() / 1000 - 20 * 60;
    if (path && path.date === todayBkk()) {
      const src: TrackPoint[] = path.road?.length ? path.road : path.points.map((p) => [p[0], p[1], p[2]] as TrackPoint);
      setTrack((t) => (t.length ? t : src.filter((p) => p[2] >= cutoff)));
    }
  }, [following, selectedReg, path]);
  useEffect(() => {
    if (!following || !selectedReg) return;
    let alive = true;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const { vehicle, recent, road } = await fetchVehicleLive(selectedReg);
        if (!alive) return;
        setSnap((prev) =>
          prev
            ? { ...prev, vehicles: prev.vehicles.map((v) => (v.registration === vehicle.registration ? { ...vehicle, currentDriver: v.currentDriver } : v)) }
            : prev,
        );
        const next = road?.length ? road : recent;
        if (next?.length) {
          setTrack(next);
          setOnRoad(!!road?.length);
        }
        setLiveError(null);
      } catch (e) {
        if (alive) setLiveError(errorMessage(e));
      }
    };
    tick();
    const id = setInterval(tick, LIVE_MS);
    const clockId = setInterval(() => setClock(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(id);
      clearInterval(clockId);
    };
  }, [following, selectedReg]);

  // ร้านถัดไป: backend เลือกจากเวลาขับตามถนน (OSRM /table) — ถามทุก 15 วินาทีระหว่างติดตาม
  const [nextStop, setNextStop] = useState<NextStop | null>(null);
  useEffect(() => {
    setNextStop(null);
    if (!following || !selectedReg) return;
    let alive = true;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await fetchNextStop(selectedReg);
        if (alive) setNextStop(r);
      } catch {
        /* เป็นของเสริม ไม่ขึ้น error ทับการติดตาม */
      }
    };
    tick();
    const id = setInterval(tick, NEXT_STOP_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [following, selectedReg]);

  // เปิดจากหน้าอื่นด้วย ?reg=<ทะเบียน>&date=<YYYY-MM-DD>&tab=stops (เช่น หน้าตรวจการส่งสินค้า)
  // อ่านครั้งเดียวตอนเปิดหน้า แล้วล้างออกจาก URL กันเปิดซ้ำตอนรีเฟรช
  const deepLink = useRef<{ reg: string; date: string | null; tab: string | null } | null>(
    (() => {
      const q = new URLSearchParams(window.location.search);
      const reg = q.get("reg");
      return reg ? { reg, date: q.get("date"), tab: q.get("tab") } : null;
    })(),
  );
  const [detailTab, setDetailTab] = useState<"trips" | "stops" | "events">("trips");
  useEffect(() => {
    const want = deepLink.current;
    if (!want || !snap) return;
    deepLink.current = null;
    window.history.replaceState(null, "", window.location.pathname);
    const v = snap.vehicles.find((x) => x.registration === want.reg);
    if (!v) return;
    const today = todayBkk();
    const date = want.date && /^\d{4}-\d{2}-\d{2}$/.test(want.date) && want.date <= today ? want.date : today;
    const end = shiftDay(date, 3) > today ? today : shiftDay(date, 3);
    const range = { from: shiftDay(end, -6), to: end };
    if (want.tab === "stops") setDetailTab("stops");
    setSelectedReg(v.registration);
    setFollowing(false);
    setDay(date);
    setDays(null);
    setDaysRange(range);
    if (date === today && v.lat != null) requestFit([{ lat: v.lat, lng: v.lng! }]);
    loadDetail(v.registration, date, true, range, date !== today || v.lat == null);
  }, [snap, loadDetail]);

  const close = () => {
    detailToken.current++;
    setSelectedReg(null);
    setFollowing(false);
    setDays(null);
    setDayTrips(null);
    setPath(null);
    setStops(null);
  };

  const selectDay = (d: string) => {
    if (!selectedReg || d === day) return;
    setDay(d);
    const isToday = d === todayBkk();
    if (isToday && selected?.lat != null) requestFit([{ lat: selected.lat, lng: selected.lng! }]);
    loadDetail(selectedReg, d, false, undefined, !isToday || selected?.lat == null);
  };

  const onTripClick = (t: Trip) => {
    setFollowing(false);
    requestFit([
      ...(t.startLat != null && t.startLng != null ? [{ lat: t.startLat, lng: t.startLng }] : []),
      ...(t.endLat != null && t.endLng != null ? [{ lat: t.endLat, lng: t.endLng }] : []),
    ]);
  };

  const toggleStatus = (s: FleetStatus) =>
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-semibold">แผนที่รถ (GPS) สำหรับผู้จัดการและผู้ดูแลระบบ</p>
        <p className="text-sm text-gray-600">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลตำแหน่งรถ หากต้องการใช้งานกรุณาติดต่อผู้ดูแลระบบ</p>
        <button onClick={() => navigate("/")} className="rounded-lg bg-blue-600 px-4 py-2 text-white">กลับหน้าหลัก</button>
      </div>
    );
  }

  const tabs: [Tab, string, number | undefined][] = [
    ["all", "ทั้งหมด", snap?.counts.total],
    ["visible", "มีสัญญาณ (7 วัน)", snap?.counts.visible],
    ["notVisible", "ไม่มีสัญญาณ", snap?.counts.notVisible],
  ];

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-2">
          <button onClick={() => navigate("/")} className="whitespace-nowrap rounded px-2 py-1 text-gray-600 hover:bg-gray-100">กลับหน้าหลัก</button>
          <h1 className="whitespace-nowrap text-lg font-bold">แผนที่รถ</h1>
          <span className="hidden truncate text-xs text-gray-500 md:inline">
            ข้อมูลจากระบบ Cartrack{snap ? ` ปรับปรุงล่าสุดเวลา ${new Date(snap.generatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. ระบบปรับปรุงข้อมูลทุก 30 วินาที` : ""}
          </span>
          <span className="ml-auto" />
          <ConnectionDot />
          <button
            onClick={() => load()}
            disabled={loading}
            className="ml-2 whitespace-nowrap rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "กำลังโหลดข้อมูล" : "โหลดข้อมูลใหม่"}
          </button>
        </div>
        <LogisticsNav className="px-3 pb-2" />
        <FleetNav />
        <ConnectionBanner />
      </header>

      {error && snap && (
        <div className="bg-amber-50 px-4 py-1.5 text-sm text-amber-800">ไม่สามารถปรับปรุงข้อมูลได้ ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน ({error})</div>
      )}

      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        {/* แผงซ้าย: รายการรถ หรือ รายละเอียดรถที่เลือก */}
        <aside className="flex min-h-0 flex-1 flex-col border-gray-200 bg-gray-50 md:w-[400px] md:flex-none md:border-r">
          {selected ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <VehicleDetail
                vehicle={selected}
                days={days}
                daysLoading={daysLoading}
                daysError={daysError}
                selectedDay={day}
                dayTrips={dayTrips}
                tripsLoading={tripsLoading}
                tripsError={tripsError}
                path={path}
                pathLoading={pathLoading}
                stops={stops}
                stopsError={stopsError}
                defaultTab={detailTab}
                cursor={cursor}
                onCursor={setCursor}
                following={following}
                onClose={close}
                onRetry={() => loadDetail(selected.registration, day, days == null, daysRange)}
                onToggleFollow={() => setFollowing((x) => !x)}
                onSelectDay={selectDay}
                onTripClick={onTripClick}
                onFitPath={() => {
                  if (!path?.points.length) return;
                  setFollowing(false);
                  requestFit(path.points.map(([lat, lng]) => ({ lat, lng })));
                }}
                daysRange={daysRange}
                onDaysRangeChange={(from, to) => {
                  setDaysRange({ from, to });
                  loadDays(selected.registration, { from, to });
                }}
                onFocusPoint={(lat, lng) => {
                  setFollowing(false);
                  requestFit([{ lat, lng }]);
                }}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2 border-b border-gray-200 bg-white p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาทะเบียนหรือชื่อรถ"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_ORDER.filter((s) => (snap?.counts.byStatus[s] ?? 0) > 0 || statusFilter.has(s)).map((s) => {
                    const on = statusFilter.has(s);
                    const m = STATUS_META[s];
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${on ? "font-semibold" : "border-gray-300 bg-white text-gray-700"}`}
                        style={on ? { borderColor: m.color, backgroundColor: `${m.color}1f`, color: m.color } : undefined}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.label} {snap?.counts.byStatus[s] ?? 0}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                  <select aria-label="เรียงตาม" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs">
                    <option value="name">เรียงตามชื่อรถ</option>
                    <option value="status">เรียงตามสถานะ</option>
                    <option value="recent">เรียงตามข้อมูลล่าสุด</option>
                    <option value="speed">เรียงตามความเร็ว</option>
                  </select>
                  {colours.length > 1 && (
                    <select aria-label="สีรถ" value={colourFilter} onChange={(e) => setColourFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs">
                      <option value="all">ทุกสี</option>
                      {colours.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  {engines.length > 1 && (
                    <select aria-label="ชนิดเครื่องยนต์" value={engineFilter} onChange={(e) => setEngineFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs">
                      <option value="all">ทุกชนิดเครื่องยนต์</option>
                      {engines.map((c) => <option key={c} value={c}>{c === "Combustion" ? "เครื่องยนต์สันดาป" : c === "Electric" ? "ไฟฟ้า" : c}</option>)}
                    </select>
                  )}
                  <select aria-label="คนขับ" value={driverFilter} onChange={(e) => setDriverFilter(e.target.value as typeof driverFilter)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs">
                    <option value="all">คนขับทั้งหมด</option>
                    <option value="with">มีข้อมูลคนขับ</option>
                    <option value="without">ไม่มีข้อมูลคนขับ</option>
                  </select>
                  <label className="ml-auto flex items-center gap-1">
                    <input type="checkbox" checked={cluster} onChange={(e) => setCluster(e.target.checked)} />
                    รวมหมุดที่อยู่ใกล้กันเป็นกลุ่ม
                  </label>
                  <label className="flex items-center gap-1" title="จุดของบริษัทและบ้านพักของคนขับรถร่วม ที่ลงเวลาเข้าหรือออกงานได้ ตามข้อมูลในระบบ HRSoft">
                    <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
                    แสดงจุดที่อนุญาต
                  </label>
                </div>
                {showZones && (zonesState.loading || zonesState.error || (zonesState.data && !zonesState.data.ok)) && (
                  <p className={`px-3 pb-1 text-xs ${zonesState.loading ? "text-gray-500" : "text-amber-800"}`}>
                    {zonesState.loading
                      ? "กำลังโหลดจุดที่อนุญาต"
                      : zonesState.error ?? (zonesState.data && !zonesState.data.ok ? zonesState.data.message : "")}
                  </p>
                )}
                <div className="flex">
                  {tabs.map(([key, label, n]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setTab(key);
                        requestFit(
                          (snap?.vehicles ?? [])
                            .filter((v) => (key === "all" ? true : key === "visible" ? v.visible : !v.visible) && v.lat != null)
                            .map((v) => ({ lat: v.lat!, lng: v.lng! })),
                        );
                      }}
                      className={`flex-1 border-b-2 py-1.5 text-center ${tab === key ? "border-orange-500 text-orange-600" : "border-transparent text-gray-600"}`}
                    >
                      <div className="text-base font-bold">{n ?? "-"}</div>
                      <div className="text-[11px]">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
                {!snap && loading && <p className="p-6 text-center text-gray-500">กำลังโหลดข้อมูล</p>}
                {!snap && error && (
                  <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
                    <p>{error}</p>
                    <button onClick={() => load()} className="mt-2 rounded bg-red-600 px-3 py-1 text-white">ลองอีกครั้ง</button>
                  </div>
                )}
                {snap && filtered.length === 0 && <p className="p-6 text-center text-sm text-gray-500">ไม่พบรถที่ตรงกับเงื่อนไขที่เลือก</p>}
                {filtered.map((v) => (
                  <button
                    key={v.registration}
                    onClick={() => select(v)}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-blue-300"
                  >
                    <span className="h-3 w-3 flex-none rounded-full" style={{ backgroundColor: STATUS_META[v.status].color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900">{v.name}</span>
                      {driverOf(v) && (
                        <span className="block truncate text-xs text-gray-700">
                          คนขับ {driverOf(v)}
                          {v.currentDriver?.routes.length ? ` เส้นทาง ${routesText(v.currentDriver.routes)}` : ""}
                        </span>
                      )}
                      <span className="block truncate text-xs text-gray-500">{v.positionDescription ?? (v.lat == null ? "ไม่มีพิกัด" : "")}</span>
                    </span>
                    <span className="flex flex-none flex-col items-end gap-0.5">
                      <StatusBadge status={v.status} />
                      <span className="text-[11px] text-gray-500">
                        {v.status === "driving" && v.speed != null ? `${Math.round(v.speed)} กม./ชม.` : ago(v.lastEventAt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* แผนที่ */}
        <main className="relative h-[45vh] flex-none md:h-auto md:flex-1">
          {MAPS_KEY ? (
            <APIProvider apiKey={MAPS_KEY} language="th" region="TH">
              <FleetGoogleMap
                cluster={cluster}
                zones={allowedZones}
                zoneOwnerName={zoneOwnerName}
                vehicles={filtered}
                selected={selected}
                path={path}
                stops={stops}
                follow={
                  following && selected
                    ? {
                        vehicle: selected,
                        track,
                        onRoad,
                        target: nextStop?.stop ? { lat: nextStop.stop.lat, lng: nextStop.stop.lng, name: nextStop.stop.name, route: nextStop.route } : null,
                      }
                    : null
                }
                onFollowTime={setDisplayT}
                replay={cursor != null && path ? replayAt(path, cursor) : null}
                fit={fit}
                onSelect={(v) => {
                  // กดที่ตัวรถบนแผนที่ = ดูแบบเรียลไทม์ (โหมดติดตาม)
                  select(v);
                  if (v.lat != null) setFollowing(true);
                }}
                onUserMove={() => following && setFollowing(false)}
              />
            </APIProvider>
          ) : null}
          {MAPS_KEY && following && selected && (
            <FollowCard
              vehicle={selected}
              next={nextStop}
              clock={clock}
              displayT={displayT}
              onRoad={onRoad}
              error={liveError}
              onStop={() => setFollowing(false)}
            />
          )}
          {MAPS_KEY && !following && selected && selected.lat != null && (
            <button
              onClick={() => setFollowing(true)}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:bg-orange-600"
            >
              ติดตามรถคันนี้แบบเรียลไทม์
            </button>
          )}
          {!MAPS_KEY && (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
              ยังไม่ได้ตั้งค่า Google Maps key (VITE_GOOGLE_MAPS_API_KEY) รายการรถและรายละเอียดยังใช้งานได้ตามปกติ
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/** การ์ดโหมดติดตามรถ: ทิศที่มุ่งหน้า ความเร็ว ถนน เวลาที่อัปเดต และร้านที่ยังไม่ส่งข้างหน้า */
function FollowCard({
  vehicle: v,
  next,
  clock,
  displayT,
  onRoad,
  error,
  onStop,
}: {
  vehicle: FleetVehicle;
  next: NextStop | null;
  clock: number;
  /** เวลาของตำแหน่งที่ลูกศรแสดงอยู่ (วินาที epoch) */
  displayT: number | null;
  onRoad: boolean;
  error: string | null;
  onStop: () => void;
}) {
  const behindS = displayT != null ? Math.max(0, Math.round(clock / 1000 - displayT)) : null;
  const ageS = v.lastEventAt ? Math.max(0, Math.round((clock - Date.parse(v.lastEventAt)) / 1000)) : null;
  const driving = v.status === "driving";
  const over = driving && v.speed != null && v.roadSpeed != null && v.roadSpeed > 0 && v.speed > v.roadSpeed;
  const dist = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} กม.` : `${Math.round(m)} เมตร`);
  return (
    <div className="absolute left-1/2 top-3 w-[min(460px,calc(100%-24px))] -translate-x-1/2 rounded-xl bg-white/95 p-3 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="font-semibold text-gray-900">กำลังติดตาม {v.name}</span>
        <button onClick={onStop} className="ml-auto rounded-lg border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50">
          หยุดติดตาม
        </button>
      </div>
      <div className="mt-1.5 text-base font-semibold" style={{ color: STATUS_META[v.status].color }}>
        {driving && v.bearing != null ? `มุ่งหน้าทิศ${compassThai(v.bearing)}` : v.statusLabel}
        {driving && v.speed != null && (
          <span className={over ? "text-red-600" : "text-gray-900"}>
            {" "}
            {Math.round(v.speed)} กม./ชม.
          </span>
        )}
        {driving && v.roadSpeed != null && v.roadSpeed > 0 && (
          <span className="text-xs font-normal text-gray-500"> (ความเร็วที่ถนนกำหนด {Math.round(v.roadSpeed)} กม./ชม.)</span>
        )}
      </div>
      {v.positionDescription && <p className="mt-0.5 text-gray-700">{v.positionDescription}</p>}
      {driverOf(v) && <p className="mt-0.5 text-xs text-gray-600">คนขับ {driverOf(v)}</p>}
      {next?.stop ? (
        <div className="mt-1 rounded-lg bg-green-50 px-2 py-1 text-xs text-green-900">
          <div>
            <span className="font-semibold">ร้านค้าลำดับถัดไป: {next.stop.name}</span>
            {next.stop.branch ? ` (${next.stop.branch})` : ""}
          </div>
          {next.method === "road" && next.stop.durationS != null && next.stop.distanceM != null ? (
            <div>
              ระยะเวลาเดินทางโดยประมาณ {Math.max(1, Math.round(next.stop.durationS / 60))} นาที ระยะทาง {dist(next.stop.distanceM)}
              {next.stop.etaAt ? ` คาดว่าจะถึงเวลาประมาณ ${new Date(next.stop.etaAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.` : ""}
            </div>
          ) : (
            <div>ระยะทางเป็นเส้นตรง {dist(next.stop.straightM)} (ยังไม่ได้คำนวณตามเส้นทางถนน)</div>
          )}
          <div className="text-green-800/80">
            {next.method === "road" ? "ระบบเลือกจากร้านที่ยังไม่ได้ส่งซึ่งใช้ระยะเวลาเดินทางตามถนนน้อยที่สุด" : "ระบบเลือกจากร้านที่ยังไม่ได้ส่งซึ่งอยู่ใกล้ที่สุดเป็นเส้นตรง"}
            {` คงเหลือร้านที่ยังไม่ได้ส่ง ${next.pendingTotal} ร้าน`}
            {next.pendingNoLocation ? ` (ไม่มีพิกัดร้าน ${next.pendingNoLocation} ร้าน)` : ""}
          </div>
        </div>
      ) : next?.reason ? (
        <p className="mt-1 text-xs text-gray-500">{next.reason}</p>
      ) : null}
      {behindS != null && (
        <p className="mt-1 text-[11px] text-gray-500">
          ตำแหน่งที่แสดงล่าช้ากว่าเวลาจริงประมาณ {behindS < 60 ? `${behindS} วินาที` : `${Math.floor(behindS / 60)} นาที`} ตามเส้นทางที่รถเดินทางจริง
          {onRoad ? " และปรับเส้นทางตามแนวถนนแล้ว" : ""}
        </p>
      )}
      <CameraStrip registration={v.registration} />
      <p className={`mt-1 text-[11px] ${ageS != null && ageS > 180 ? "text-amber-700" : "text-gray-500"}`}>
        {ageS == null
          ? "ยังไม่ได้รับข้อมูลตำแหน่งรถ"
          : `ได้รับตำแหน่งล่าสุดจากรถเมื่อ ${ageS < 60 ? `${ageS} วินาที` : `${Math.floor(ageS / 60)} นาที`}ที่แล้ว${ageS > 180 ? " รถอาจอยู่ในพื้นที่ที่ไม่มีสัญญาณ" : ""}`}
        {error ? ` (ไม่สามารถปรับปรุงข้อมูลได้: ${error})` : ""}
      </p>
    </div>
  );
}

