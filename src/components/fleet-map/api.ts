import axios from "axios";

/**
 * GPS รถจาก Cartrack ผ่าน logistics-backend `/api/logistic/telematics` (MA-374/375) — อ่านอย่างเดียว
 * backend จำกัดสิทธิ์ MANAGER / ADMIN · ระยะทางเป็น กม. · เวลาเป็น ISO UTC
 */
const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";
const BASE = `${API}/api/logistic/telematics`;

const ALLOWED_ROLES = ["MANAGER", "ADMIN", "SUPER_ADMIN"];

/** ตำแหน่งรถสด + ประวัติเส้นทางผูกกับตัวคนขับ → เฉพาะ MANAGER/ADMIN (backend ตรวจซ้ำ) */
export const canSeeFleetMap = () => {
  try {
    const u = JSON.parse(sessionStorage.getItem("user_info") ?? "null");
    return ALLOWED_ROLES.includes(String(u?.user_role ?? "").toUpperCase());
  } catch {
    return false;
  }
};

const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem("access_token")}` });

export type FleetStatus =
  | "driving"
  | "idling"
  | "moving_ignition_off"
  | "ignition_off"
  | "no_gps"
  | "lost_visibility";

export const STATUS_META: Record<FleetStatus, { label: string; color: string }> = {
  driving: { label: "กำลังขับ", color: "#16a34a" },
  idling: { label: "จอดติดเครื่องยนต์", color: "#f59e0b" },
  moving_ignition_off: { label: "เคลื่อนที่ขณะดับเครื่องยนต์", color: "#9333ea" },
  ignition_off: { label: "ดับเครื่องยนต์", color: "#64748b" },
  no_gps: { label: "ไม่มีสัญญาณ GPS", color: "#dc2626" },
  lost_visibility: { label: "ขาดการติดต่อ", color: "#9ca3af" },
};
export const STATUS_ORDER = Object.keys(STATUS_META) as FleetStatus[];

export interface FleetVehicle {
  registration: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  type: string | null;
  engineType: string | null;
  status: FleetStatus;
  statusLabel: string;
  visible: boolean;
  ignition: boolean;
  speed: number | null;
  roadSpeed: number | null;
  bearing: number | null;
  lat: number | null;
  lng: number | null;
  positionDescription: string | null;
  lastEventAt: string | null;
  odometerKm: number | null;
  driverName: string | null;
  /** คนขับที่ลงทะเบียนออกรถคันนี้ในระบบขนส่งและยังไม่จบกะ (MA-374) */
  currentDriver?: CurrentDriver | null;
}

export interface RouteRef {
  code: string;
  name: string;
}
/** คนขับตามการลงทะเบียนตอนออกรถในระบบขนส่ง (MA-374) */
export interface AssignedDriver {
  empCode: string;
  empName: string;
  carNumber: string | null;
  routes: RouteRef[];
}
export interface CurrentDriver extends AssignedDriver {
  since: string;
}
export type SessionEnd = "shift_end" | "next_departure" | "car_taken" | "cap" | "open";
export const SESSION_END_LABEL: Record<SessionEnd, string> = {
  shift_end: "บันทึกจบกะ",
  next_departure: "ออกรถรอบถัดไป",
  car_taken: "คนขับอื่นนำรถออก",
  cap: "ไม่มีบันทึกจบกะ",
  open: "ยังไม่จบกะ",
};
export interface DayDriver {
  empCode: string;
  empName: string;
  start: string;
  end: string;
  endReason: SessionEnd;
  routes: RouteRef[];
}
/** ชื่อคนขับที่แสดง: การลงทะเบียนในระบบขนส่งก่อน แล้วค่อยคนขับที่ผูกในระบบ Cartrack */
export const driverOf = (v: Pick<FleetVehicle, "currentDriver" | "driverName">) =>
  v.currentDriver?.empName ?? v.driverName ?? null;
export const routesText = (routes: RouteRef[] | undefined) => (routes ?? []).map((r) => r.name).join(", ");

export interface FleetSnapshot {
  generatedAt: string;
  counts: { total: number; visible: number; notVisible: number; byStatus: Record<FleetStatus, number> };
  vehicles: FleetVehicle[];
}

export interface DaySummary {
  date: string;
  trips: number;
  distanceKm: number;
  drivingSeconds: number;
  idleSeconds: number;
  ignitionSeconds: number;
  harshEvents: number;
  speedingEvents: number;
  maxSpeed: number | null;
  firstStart: string | null;
  lastEnd: string | null;
  stopSeconds?: number;
}

export interface Trip {
  start: string | null;
  end: string | null;
  durationSeconds: number;
  startLocation: string | null;
  endLocation: string | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  startGeofence: string | null;
  endGeofence: string | null;
  distanceKm: number;
  idleSeconds: number;
  drivingSeconds: number;
  maxSpeed: number | null;
  harshBraking: number;
  harshAcceleration: number;
  harshCornering: number;
  speedingEvents: number;
  driverName: string | null;
  /** คนขับตามการลงทะเบียนออกรถ — null คือไม่พบการลงทะเบียนในช่วงเวลานั้น */
  assigned?: AssignedDriver | null;
}

export interface IdlingPeriod {
  start: string;
  end: string;
  durationSeconds: number;
  place: string | null;
}

export interface DayTrips {
  date: string;
  summary: DaySummary & { stopSeconds: number };
  ongoing: boolean;
  trips: Trip[];
  /** ช่วงจอดติดเครื่องยนต์ — ใช้วาด Timeline */
  idling: IdlingPeriod[];
  /** คนขับที่ลงทะเบียนใช้รถคันนี้ในวันนั้น */
  drivers?: DayDriver[];
}

export interface PathEvent {
  type: string;
  label: string;
  lat: number;
  lng: number;
  at: string;
  speed: number | null;
  place: string | null;
}

/**
 * เหตุการณ์ที่ปักบนแผนที่ — ตัด "ออกนอกเลน" / "ระยะห่างคันหน้า" (กล้องแจ้งวันละหลายสิบครั้ง รกจนดูอะไรไม่ออก)
 * และติด/ดับเครื่อง (เห็นจากเส้นทางอยู่แล้ว)
 */
export const MAP_EVENT_TYPES = new Set([
  "HARSH_BRAKING",
  "HARSH_ACCELERATION",
  "HARSH_CORNERING",
  "OVERSPEEDING",
  "SPEEDING",
  "FORWARD_COLLISION_WARNING",
  "URBAN_FORWARD_COLLISION_WARNING",
  "PEDESTRIAN_COLLISION_WARNING",
  "CAMERA_COVERED",
  "DISTRACTION_DETECTED",
  "FATIGUE_DETECTED",
  "PHONE_DETECTED",
  "SMOKING_DETECTED",
  "YAWNING_DETECTED",
  "NO_SEATBELT_DETECTED",
]);

/** สถานะรถ ณ จุดสัญญาณ: 0 ดับเครื่อง/จอด · 1 จอดติดเครื่องยนต์ · 2 ขับ · 3 ขับเร็วเกินกำหนด */
export type PathState = 0 | 1 | 2 | 3;
export const PATH_STATE_META: Record<PathState, { label: string; color: string }> = {
  0: { label: "ดับเครื่องยนต์หรือจอด", color: "#e5e7eb" },
  1: { label: "จอดติดเครื่องยนต์", color: "#f5b942" },
  2: { label: "ขับขี่", color: "#5aa65a" },
  3: { label: "ขับขี่เกินความเร็วที่กำหนด", color: "#c4473a" },
};
/** [lat, lng, epochSeconds, speed, state, altitude, batteryVolt, odometerKm] — backend เก่าส่งแค่ 4 ช่องแรก */
export type PathPoint = [number, number, number, number, PathState?, (number | null)?, (number | null)?, (number | null)?];

export interface VehiclePath {
  date: string;
  totalPoints: number;
  points: PathPoint[];
  /** ช่วงสถานะต่อเนื่อง (วินาที epoch) */
  segments?: { start: number; end: number; state: PathState }[];
  stateSeconds?: { stopped: number; idling: number; driving: number; speeding: number };
  /** เส้นทางที่จับเข้ากับถนนแล้ว [lat, lng, epochSeconds] — null/ไม่มี เมื่อ backend ไม่ได้เปิด OSRM */
  road?: TrackPoint[] | null;
  events: PathEvent[];
}
/** [lat, lng, epochSeconds] */
export type TrackPoint = [number, number, number];

/** ตำแหน่ง ณ เวลา t บนเส้น (ประมาณค่าระหว่างจุด) + ทิศของช่วงนั้น */
export function trackAt(track: TrackPoint[], t: number): { lat: number; lng: number; bearing: number } | null {
  if (!track.length) return null;
  if (t <= track[0][2]) return { lat: track[0][0], lng: track[0][1], bearing: track.length > 1 ? bearingDeg(pt(track[0]), pt(track[1])) : 0 };
  let lo = 0;
  let hi = track.length - 1;
  if (t >= track[hi][2]) {
    const a = track[Math.max(0, hi - 1)];
    return { lat: track[hi][0], lng: track[hi][1], bearing: hi > 0 ? bearingDeg(pt(a), pt(track[hi])) : 0 };
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[mid][2] <= t) lo = mid;
    else hi = mid;
  }
  const a = track[lo];
  const b = track[hi];
  const f = b[2] === a[2] ? 0 : (t - a[2]) / (b[2] - a[2]);
  return { lat: a[0] + (b[0] - a[0]) * f, lng: a[1] + (b[1] - a[1]) * f, bearing: bearingDeg(pt(a), pt(b)) };
}
const pt = (p: TrackPoint | PathPoint) => ({ lat: p[0], lng: p[1] });

/** ตำแหน่งรถย้อนหลังสำหรับแถบช่วงเวลา: พิกัดจากเส้นตามถนน (ถ้ามี) ความเร็ว/สถานะจากจุดสัญญาณ */
export function replayAt(path: VehiclePath, t: number) {
  const meta = pointAt(path.points, t);
  if (!meta) return null;
  const onRoad = path.road?.length ? trackAt(path.road, t) : null;
  if (!onRoad) return meta;
  return { p: [onRoad.lat, onRoad.lng, t, meta.p[3], meta.p[4]] as PathPoint, bearing: onRoad.bearing };
}

/** ตำแหน่งรถ ณ เวลา t (วินาที) — ประมาณค่าระหว่างจุดสัญญาณสองจุด */
export function pointAt(points: PathPoint[], t: number) {
  if (!points.length) return null;
  let lo = 0;
  let hi = points.length - 1;
  if (t <= points[0][2]) return { p: points[0], bearing: 0 };
  if (t >= points[hi][2]) return { p: points[hi], bearing: 0 };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][2] <= t) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const f = b[2] === a[2] ? 0 : (t - a[2]) / (b[2] - a[2]);
  const lat = a[0] + (b[0] - a[0]) * f;
  const lng = a[1] + (b[1] - a[1]) * f;
  const bearing = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return { p: [lat, lng, t, f < 0.5 ? a[3] : b[3], f < 0.5 ? a[4] : b[4]] as PathPoint, bearing };
}

const reg = (r: string) => encodeURIComponent(r);

export const fetchVehicles = async () =>
  (await axios.get<FleetSnapshot>(`${BASE}/vehicles`, { headers: auth() })).data;

export const fetchDays = async (registration: string, from?: string, to?: string) =>
  (
    await axios.get<{ days: DaySummary[] }>(`${BASE}/vehicles/${reg(registration)}/days`, {
      headers: auth(),
      params: from && to ? { from, to } : undefined,
    })
  ).data.days ?? [];

export const fetchTrips = async (registration: string, date: string) =>
  (await axios.get<DayTrips>(`${BASE}/vehicles/${reg(registration)}/trips`, { params: { date }, headers: auth() })).data;

export const fetchPath = async (registration: string, date: string) =>
  (await axios.get<VehiclePath>(`${BASE}/vehicles/${reg(registration)}/path`, { params: { date }, headers: auth() })).data;

/** ข้อความ error ภาษาไทย — 4xx/502/503 ใช้ข้อความจาก backend (ตั้งใจให้ผู้ใช้เห็น) */
export const errorMessage = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    const msg = (e.response?.data as { message?: unknown } | undefined)?.message;
    if (status === 401) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    if (status === 403) return "สำหรับผู้จัดการและผู้ดูแลระบบเท่านั้น";
    // 502/503 = backend ติดต่อ Cartrack ไม่ได้ ข้อความจาก backend บอกสาเหตุ (ภาษาไทย) ให้ผู้ใช้เห็นตรง ๆ
    if (typeof msg === "string" && msg && (status === 502 || status === 503 || (status && status < 500))) return msg;
    if (!e.response) return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้";
    return "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
};

// ─────────────────────────── หน้าอื่นของระบบติดตามรถ (MA-373) ───────────────────────────

const get = async <T,>(path: string, params?: Record<string, string | undefined>) =>
  (await axios.get<T>(`${BASE}${path}`, {
    headers: auth(),
    params: params && Object.fromEntries(Object.entries(params).filter(([, v]) => v)),
  })).data;

export interface LiveDashboard {
  date: string;
  generatedAt: string;
  totals: {
    fleetSize: number;
    activeVehicles: number;
    drivingSeconds: number;
    idleSeconds: number;
    idlingRatePercent: number;
    tripsCompleted: number;
    distanceKm: number;
  };
  utilisationByHour: { hour: number; percent: number }[];
  vehicles: {
    registration: string;
    name: string;
    status: FleetStatus;
    statusLabel: string;
    firstIgnitionOn: string | null;
    lastIgnitionOff: string | null;
    drivingSeconds: number;
    idleSeconds: number;
    trips: number;
    distanceKm: number;
    /** คนขับที่ลงทะเบียนใช้รถในวันนั้น คั่นด้วยจุลภาค */
    drivers?: string;
  }[];
}

export interface OverviewDashboard {
  from: string;
  to: string;
  totals: {
    fleetSize: number;
    activeVehicles: number;
    trips: number;
    distanceKm: number;
    drivingSeconds: number;
    idleSeconds: number;
    harshEvents: number;
    avgKmPerVehicleDay: number;
    avgKmPerVehicle: number;
    belowAverageVehicles: number;
  };
  daily: {
    date: string;
    activeVehicles: number;
    inactiveOnDay: number;
    inactiveWholePeriod: number;
    trips: number;
    distanceKm: number;
    drivingSeconds: number;
    idleSeconds: number;
    idleRatePercent: number;
    harshEvents: number;
    speedingEvents: number;
  }[];
  operatingByHour: { hour: number; seconds: number }[];
  longTripStartsByHour: { hour: number; count: number }[];
  vehicles: {
    registration: string;
    name: string;
    activeDays: number;
    trips: number;
    distanceKm: number;
    drivingSeconds: number;
    idleSeconds: number;
    harshEvents: number;
    speedingEvents: number;
    maxSpeed: number | null;
  }[];
}

export interface Geofence {
  id: string;
  name: string;
  description: string | null;
  positionDescription: string | null;
  colour: string | null;
  polygon: [number, number][];
  vehiclesInside: string[];
}
export interface Poi {
  id: string;
  name: string;
  description: string | null;
  positionDescription: string | null;
  colour: string | null;
  radiusMeters: number | null;
  lat: number | null;
  lng: number | null;
}
export interface Visit {
  registration: string;
  vehicleName: string;
  geofenceId: string;
  geofenceName: string;
  enter: string | null;
  leave: string | null;
  durationSeconds: number;
  distanceKm: number;
}
export interface VisitsResponse {
  from: string;
  to: string;
  summary: { geofenceId: string; geofenceName: string; visits: number; vehicles: number; avgDurationSeconds: number }[];
  visits: Visit[];
}

export const HEATMAP_TYPES = [
  { value: "movement", label: "จุดที่รถวิ่งผ่าน" },
  { value: "harsh", label: "เบรก เร่ง หรือเลี้ยวรุนแรง" },
  { value: "speeding", label: "ขับขี่เกินความเร็วที่ถนนกำหนด" },
  { value: "idling", label: "จอดติดเครื่องยนต์" },
  { value: "camera", label: "การเตือนจากกล้อง" },
] as const;
export type HeatmapType = (typeof HEATMAP_TYPES)[number]["value"];
export interface Heatmap {
  from: string;
  to: string;
  registration: string | null;
  type: HeatmapType;
  typeLabel: string;
  totalEvents: number;
  maxCount: number;
  cells: { lat: number; lng: number; count: number }[];
}

export interface Driver {
  driverId: string | null;
  name: string;
  employeeNumber: string | null;
  phone: string | null;
  email: string | null;
  licenseValidEnd: string | null;
  licenseExpired: boolean;
  status: string | null;
}

export interface Alert {
  at: string | null;
  registration: string | null;
  vehicleName: string;
  type: string;
  typeLabel: string;
  message: string;
  lat: number | null;
  lng: number | null;
  speed: number | null;
}

export type ColumnKind = "text" | "datetime" | "duration" | "km" | "number" | "speed";
export interface ReportColumn {
  key: string;
  label: string;
  kind: ColumnKind;
}
export interface ReportTypeInfo {
  type: string;
  title: string;
  description: string;
}
export interface Report extends ReportTypeInfo {
  from: string;
  to: string;
  registration: string | null;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
}

export const fetchLive = () => get<LiveDashboard>("/dashboard/live");
export const fetchOverview = (from: string, to: string) => get<OverviewDashboard>("/dashboard/overview", { from, to });
export const fetchGeofences = () => get<{ geofences: Geofence[]; pois: Poi[] }>("/geofences");
export const fetchVisits = (from: string, to: string) => get<VisitsResponse>("/geofence-visits", { from, to });
export const fetchHeatmap = (type: HeatmapType, from: string, to: string, registration?: string) =>
  get<Heatmap>("/heatmap", { type, from, to, registration });
export const fetchDrivers = () => get<{ drivers: Driver[] }>("/drivers");
export const fetchAlerts = (from: string, to: string) => get<{ from: string; to: string; alerts: Alert[] }>("/alerts", { from, to });
export const fetchReportTypes = () => get<ReportTypeInfo[]>("/reports");
export const fetchReport = (type: string, from: string, to: string, registration?: string) =>
  get<Report>(`/reports/${encodeURIComponent(type)}`, { from, to, registration });

export interface CameraEvent {
  at: string | null;
  registration: string;
  vehicleName: string;
  type: string;
  label: string;
  important: boolean;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  place: string | null;
  driverName?: string | null;
}
export interface CameraEvents {
  from: string;
  to: string;
  registration: string | null;
  scope: "important" | "all";
  total: number;
  byType: { type: string; label: string; count: number }[];
  byVehicle: { registration: string; vehicleName: string; count: number }[];
  events: CameraEvent[];
}
export const fetchCameraEvents = (from: string, to: string, scope: "important" | "all", registration?: string) =>
  get<CameraEvents>("/camera-events", { from, to, scope, registration });

/** หน้าคลิปเหตุการณ์ในระบบ Cartrack — บัญชียังไม่ได้เปิดใช้ Vision API จึงดูคลิปในระบบเราไม่ได้ */
export const CARTRACK_VISION_URL = "https://fleetweb-th.cartrack.com/vision/events";

// ─────────────────────────── จับคู่รถในระบบขนส่งกับ Cartrack (MA-374) ───────────────────────────

export type LinkMethod = "auto" | "manual" | "manual_none" | "none";
export interface CarLink {
  carId: number;
  carNumber: string;
  registration: string | null;
  vehicleName: string | null;
  method: LinkMethod;
  candidates: string[];
  updatedBy: string | null;
}
export interface CarLinks {
  links: CarLink[];
  unlinkedVehicles: { registration: string; name: string }[];
  vehicles: { registration: string; name: string }[];
}
export const fetchCarLinks = () => get<CarLinks>("/car-links");
export const saveCarLink = async (carId: number, registration: string | null) =>
  (await axios.put<CarLinks>(`${BASE}/car-links/${carId}`, { registration }, { headers: auth() })).data;
export const resetCarLink = async (carId: number) =>
  (await axios.delete<CarLinks>(`${BASE}/car-links/${carId}`, { headers: auth() })).data;

export interface DriverSession extends DayDriver {
  shippingOutId: number;
  carId: number;
  carNumber: string | null;
  registration: string | null;
  vehicleName: string | null;
}
export const fetchDriverSessions = (date: string) =>
  get<{ date: string; sessions: DriverSession[] }>("/driver-sessions", { date });

// ─────────────────────────── ร้านที่ต้องส่งในแต่ละรอบออกรถ (MA-374) ───────────────────────────

export type StopStatus = "delivered" | "pending" | "returned" | "cancelled";
export interface Stop {
  seq: number;
  memCode: string;
  addressId: number | null;
  name: string;
  branch: string | null;
  address: string | null;
  route: RouteRef | null;
  bills: number;
  boxes: number;
  status: StopStatus;
  statusLabel: string;
  /** history = จุดกลางของตำแหน่งที่กดส่งสำเร็จครั้งก่อน ๆ · member = พิกัดในข้อมูลร้าน */
  location: { lat: number; lng: number; source: "history" | "member"; samples: number } | null;
  delivery: {
    at: string | null;
    point: { lat: number; lng: number } | null;
    distanceM: number | null;
    bypassed: boolean;
  } | null;
  carAtDelivery: { state: "stopped" | "driving" | "unknown"; distanceM: number | null } | null;
  visit: { arrivedAt: string; leftAt: string | null; durationSeconds: number | null; distanceM: number } | null;
  flags: string[];
}
export interface StopsSummary {
  total: number;
  delivered: number;
  pending: number;
  returned: number;
  cancelled: number;
  visited: number;
  noLocation: number;
  flagged: number;
}
export interface StopSession extends DayDriver {
  shippingOutId: number;
  carNumber: string | null;
  stops: Stop[];
  summary: StopsSummary;
}
export interface VehicleStops {
  vehicle: { registration: string; name: string };
  date: string;
  sessions: StopSession[];
}
export const fetchStops = (registration: string, date: string) =>
  get<VehicleStops>(`/vehicles/${encodeURIComponent(registration)}/stops`, { date });

export const STOP_COLOR: Record<StopStatus, string> = {
  delivered: "#16a34a",
  pending: "#6b7280",
  returned: "#dc2626",
  cancelled: "#dc2626",
};

// ─────────────────────────── ตรวจการส่งสินค้าทั้งวัน + พิกัดร้าน (MA-374) ───────────────────────────

export interface ReviewSession extends DayDriver {
  shippingOutId: number;
  carNumber: string | null;
  registration: string | null;
  vehicleName: string | null;
  /** รถยังไม่ได้จับคู่กับระบบ GPS จึงตรวจตำแหน่งรถไม่ได้ */
  gpsAvailable: boolean;
  /** เวลาที่กล่อง GPS ส่งข้อมูลล่าสุด */
  gpsLastSignalAt?: string | null;
  /** จับคู่แล้ว แต่กล่อง GPS ไม่ส่งข้อมูลตั้งแต่ก่อนออกรอบ */
  gpsNoSignal?: boolean;
  /** รอบสุดท้ายของวันของรถคันนี้: จุดที่รถจอดล่าสุด เทียบกับจุดที่คนขับลงเวลาออกงานได้ (HRSoft) */
  endParking?: EndParking | null;
  summary: StopsSummary;
  stops: Stop[];
}
export interface FlaggedStop extends Stop {
  shippingOutId: number;
  empCode: string;
  empName: string;
  registration: string | null;
  vehicleName: string | null;
}
export interface DeliveriesReview {
  date: string;
  totals: StopsSummary & { sessions: number; parkingOutside?: number };
  /** โหลดจุดที่อนุญาตจาก HRSoft ได้ไหม */
  zones?: { available: true; fetchedAt: string } | { available: false; message: string };
  sessions: ReviewSession[];
  flagged: FlaggedStop[];
}

// ─────────────────────────── จุดที่อนุญาตของคนขับ (จาก HRSoft · MA-374) ───────────────────────────

export interface AllowedZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  /** company = จุดของบริษัท · personal = บ้านพักของคนขับรถร่วม */
  kind: "company" | "personal";
  ownerEmployeeCode: string | null;
}
export interface AllowedDriver {
  employeeCode: string;
  empName: string | null;
  found: boolean;
  allowAll: boolean;
  policyEnabled: boolean;
  checkinZoneIds: string[];
  checkoutZoneIds: string[];
  homeZoneIds: string[];
}
export type AllowedZones =
  | { ok: true; fetchedAt: string; zones: AllowedZone[]; drivers: AllowedDriver[] }
  | { ok: false; message: string };
export interface EndParking {
  lat: number;
  lng: number;
  since: string;
  /** true = จอดในจุดที่ลงเวลาออกงานได้ · false = นอกจุด · null = ไม่มีข้อมูลจุดของคนขับ */
  allowed: boolean | null;
  zone: { id: string; name: string; kind: AllowedZone["kind"] } | null;
  nearest: { name: string; distanceM: number } | null;
}
export const fetchAllowedZones = () => get<AllowedZones>("/allowed-zones");
export const ZONE_COLOR: Record<AllowedZone["kind"], string> = { company: "#2563eb", personal: "#9333ea" };
export const ZONE_KIND_LABEL: Record<AllowedZone["kind"], string> = { company: "จุดของบริษัท", personal: "บ้านพักคนขับ" };
export const fetchDeliveriesReview = (date: string) => get<DeliveriesReview>("/deliveries-review", { date });

export type LocationAdvice = "fill" | "fill_low_confidence" | "review" | "ok";
export interface ShopLocation {
  memCode: string;
  addressId: number | null;
  name: string;
  branch: string | null;
  address: string | null;
  route: RouteRef | null;
  current: { lat: number; lng: number } | null;
  proposal: { lat: number; lng: number; samples: number; spreadM: number };
  lastDeliveredAt: string | null;
  advice: LocationAdvice;
  adviceLabel: string;
  diffM: number | null;
}
export interface ShopLocations {
  summary: Record<LocationAdvice, number> & { total: number };
  shops: ShopLocation[];
}
export const fetchShopLocations = () => get<ShopLocations>("/shop-locations");
export const applyShopLocations = async (items: { memCode: string; addressId: number | null }[], overwrite: boolean) =>
  (
    await axios.post<{ applied: number; skipped: { memCode: string; addressId: number | null; reason: string }[] }>(
      `${BASE}/shop-locations/apply`,
      { items, overwrite },
      { headers: auth() },
    )
  ).data;

// ─────────────────────────── โหมดติดตามรถแบบเรียลไทม์ (MA-374) ───────────────────────────

/** ตำแหน่งล่าสุดของรถคันเดียว — backend ใช้ข้อมูลสถานะชุดเดียวกับทั้งกองรถ (อายุไม่เกิน 5 วินาที) */
export const fetchVehicleLive = (registration: string) =>
  get<{ serverTime: string; vehicle: FleetVehicle; recent?: TrackPoint[]; road?: TrackPoint[] | null }>(`/vehicles/${encodeURIComponent(registration)}/live`);

const DIRS = ["เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้", "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ"];
/** องศาเข็มทิศ (0 = เหนือ) → ชื่อทิศ 8 ทิศ */
export const compassThai = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const rad = (d: number) => (d * Math.PI) / 180;
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
/** ทิศจาก a ไป b (องศาเข็มทิศ) */
export function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface NextStopItem {
  memCode: string;
  addressId: number | null;
  name: string;
  branch: string | null;
  lat: number;
  lng: number;
  /** ระยะเส้นตรง (เมตร) */
  straightM: number;
  /** เวลาขับและระยะทางตามถนน (OSRM) — null เมื่อไม่ได้เปิด OSRM */
  durationS: number | null;
  distanceM: number | null;
  /** เวลาที่น่าจะถึง นับจากเวลาของตำแหน่งล่าสุดที่รถส่งมา */
  etaAt: string | null;
}
export interface NextStop {
  session: { shippingOutId: number; empCode: string; empName: string } | null;
  /** road = เลือกจากเวลาขับตามถนน · straight = ระยะเส้นตรง (ไม่มี OSRM) */
  method: "road" | "straight" | null;
  stop: NextStopItem | null;
  /** เส้นทางขับรถไปร้านถัดไป [lat, lng][] */
  route: [number, number][] | null;
  others: NextStopItem[];
  pendingTotal: number;
  pendingNoLocation: number;
  reason: string | null;
}
/** ร้านถัดไปของรถที่กำลังวิ่ง — ร้านที่ยังไม่ส่งซึ่งใช้เวลาขับน้อยที่สุด */
export const fetchNextStop = (registration: string) => get<NextStop>(`/vehicles/${encodeURIComponent(registration)}/next-stop`);

// ─────────────────────────── ประมาณเวลาส่งแบบต่อเนื่องของรอบออกรถ (MA-374) ───────────────────────────

export interface EtaRow {
  seq: number;
  memCode: string;
  addressId: number | null;
  name: string;
  branch: string | null;
  lat: number;
  lng: number;
  status: StopStatus;
  statusLabel: string;
  plannedArrive: string;
  plannedDepart: string;
  actualArrive: string | null;
  estimatedArrive: string | null;
  /** ช้ากว่าแผน (นาที) ติดลบ = เร็วกว่า */
  delayMin: number | null;
  waitMin: number;
  afterClose: boolean;
}
export interface RoundEta {
  shippingOutId: number;
  empName: string;
  registration: string | null;
  vehicleName: string | null;
  depot: { lat: number; lng: number; name: string };
  /** จุดเริ่มของแผน = ตำแหน่งรถตอนกดออกรถ */
  start: { lat: number; lng: number; name: string; atDepot: boolean };
  method: "road" | "straight";
  orderSource: "driver" | "route" | "optimized" | "delivered" | "delivered_then_optimized";
  orderSourceLabel: string;
  departure: { actual: string; scheduled: string | null; lateMin: number | null };
  serviceMinutes: { plan: number; live: number; observed: boolean };
  stops: EtaRow[];
  noLocation: { memCode: string; name: string; status: StopStatus }[];
  returnDepot: { planned: string; estimated: string | null; actual: string | null };
  summary: { delayMin: number | null; lastStopAt: string | null; open: boolean };
  generatedAt: string;
}
export const fetchRoundEta = (shippingOutId: number, date: string) => get<RoundEta>(`/rounds/${shippingOutId}/eta`, { date });

// ─────────────────────────── สถานะการเชื่อมต่อ (MA-374) ───────────────────────────

export interface ConnectionStatus {
  checkedAt: string;
  cartrack: {
    ok: boolean;
    lastSuccessAt: string | null;
    lastFailure: { at: string; kind: string; label: string; httpStatus: number | null; path: string } | null;
    consecutiveFailures: number;
    message: string | null;
  };
  vision: { enabled: boolean | null; message: string; checkedAt: string };
  osrm: { enabled: boolean; ok: boolean; lastOkAt: string | null; lastError: { at: string; message: string } | null };
}
export const fetchConnectionStatus = () => get<ConnectionStatus>("/status");
