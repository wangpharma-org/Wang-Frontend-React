import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Driver,
  errorMessage,
  fetchDrivers,
  fetchGeofences,
  fetchVehicles,
  FleetVehicle,
  Geofence,
  Poi,
} from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";
import DataTable from "../components/fleet-map/DataTable";
import { todayBkk } from "../components/fleet-map/format";

/** รายการรถ คนขับ และสถานที่ (MA-373) — เทียบหน้า List ของเว็บ Cartrack */
type Tab = "vehicles" | "drivers" | "places";
const TABS: [Tab, string][] = [
  ["vehicles", "รถ"],
  ["drivers", "คนขับ"],
  ["places", "พื้นที่และจุดสนใจ"],
];

export default function FleetLists() {
  const [tab, setTab] = useState<Tab>("vehicles");
  const [query, setQuery] = useState("");
  return (
    <FleetLayout
      title="รายการรถและคนขับ"
      actions={
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาข้อมูล"
          className="w-56 rounded-lg border border-gray-300 px-3 py-1 text-sm"
        />
      }
    >
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`border-b-2 px-4 py-2 text-sm ${tab === k ? "border-orange-500 font-semibold text-orange-600" : "border-transparent text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "vehicles" && <Vehicles query={query} />}
      {tab === "drivers" && <Drivers query={query} />}
      {tab === "places" && <Places query={query} />}
    </FleetLayout>
  );
}

const match = (q: string, ...fields: (string | null | undefined)[]) => {
  const s = q.trim().toLowerCase();
  return !s || fields.some((f) => (f ?? "").toLowerCase().includes(s));
};

function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [fn]);
  useEffect(() => { load(); }, [load]);
  return { data, error, load };
}

function Vehicles({ query }: { query: string }) {
  const { data, error, load } = useLoad(fetchVehicles);
  const rows = useMemo(
    () =>
      (data?.vehicles ?? [])
        .filter((v: FleetVehicle) => match(query, v.name, v.registration, v.make, v.model))
        .map((v) => ({ ...v, model: [v.make, v.model].filter(Boolean).join(" ") || null })),
    [data, query],
  );
  if (!data) return <LoadState loading={!error} error={error} onRetry={load} />;
  return (
    <Card>
      <DataTable
        exportName={`รายการรถ-${todayBkk()}`}
        columns={[
          { key: "name", label: "ชื่อรถ", kind: "text" },
          { key: "registration", label: "ทะเบียน", kind: "text" },
          { key: "model", label: "ยี่ห้อและรุ่น", kind: "text" },
          { key: "year", label: "ปี", kind: "text" },
          { key: "colour", label: "สี", kind: "text" },
          { key: "statusLabel", label: "สถานะ", kind: "text" },
          { key: "speed", label: "ความเร็ว", kind: "speed" },
          { key: "lastEventAt", label: "ข้อมูลล่าสุด", kind: "datetime" },
          { key: "odometerKm", label: "เลขไมล์", kind: "km" },
          { key: "positionDescription", label: "ตำแหน่งล่าสุด", kind: "text" },
        ]}
        rows={rows}
      />
    </Card>
  );
}

function Drivers({ query }: { query: string }) {
  const { data, error, load } = useLoad(fetchDrivers);
  const rows = useMemo(
    () =>
      (data?.drivers ?? [])
        .filter((d: Driver) => match(query, d.name, d.employeeNumber, d.phone))
        .map((d) => ({ ...d, licenseStatus: d.licenseValidEnd ? (d.licenseExpired ? "หมดอายุแล้ว" : "ใช้งานได้") : "-" })),
    [data, query],
  );
  if (!data) return <LoadState loading={!error} error={error} onRetry={load} />;
  return (
    <Card>
      <p className="mb-3 text-sm text-gray-500">
        รายชื่อคนขับที่ลงทะเบียนในระบบ Cartrack ไม่แสดงเลขบัตรประชาชนและเลขใบอนุญาตขับขี่
      </p>
      <DataTable
        exportName={`รายชื่อคนขับ-${todayBkk()}`}
        columns={[
          { key: "name", label: "ชื่อ", kind: "text" },
          { key: "employeeNumber", label: "รหัสพนักงาน", kind: "text" },
          { key: "phone", label: "โทรศัพท์", kind: "text" },
          { key: "email", label: "อีเมล", kind: "text" },
          { key: "licenseValidEnd", label: "ใบขับขี่หมดอายุ", kind: "text" },
          { key: "licenseStatus", label: "สถานะใบขับขี่", kind: "text" },
          { key: "status", label: "สถานะ", kind: "text" },
        ]}
        rows={rows}
      />
    </Card>
  );
}

function Places({ query }: { query: string }) {
  const { data, error, load } = useLoad(fetchGeofences);
  const rows = useMemo(() => {
    if (!data) return [];
    const g = data.geofences.map((x: Geofence) => ({
      kind: "พื้นที่ (Geofence)",
      name: x.name,
      description: x.description,
      address: x.positionDescription,
      size: `${x.polygon.length} จุดมุม`,
      inside: x.vehiclesInside.length,
    }));
    const p = data.pois.map((x: Poi) => ({
      kind: "จุดสนใจ (POI)",
      name: x.name,
      description: x.description,
      address: x.positionDescription,
      size: x.radiusMeters ? `รัศมี ${x.radiusMeters} ม.` : "-",
      inside: null,
    }));
    return [...g, ...p].filter((r) => match(query, r.name, r.description, r.address));
  }, [data, query]);
  if (!data) return <LoadState loading={!error} error={error} onRetry={load} />;
  return (
    <Card>
      <DataTable
        exportName={`พื้นที่และจุดสนใจ-${todayBkk()}`}
        columns={[
          { key: "kind", label: "ประเภท", kind: "text" },
          { key: "name", label: "ชื่อ", kind: "text" },
          { key: "description", label: "รายละเอียด", kind: "text" },
          { key: "address", label: "ที่ตั้ง", kind: "text" },
          { key: "size", label: "ขอบเขต", kind: "text" },
          { key: "inside", label: "รถที่อยู่ในพื้นที่ขณะนี้", kind: "number" },
        ]}
        rows={rows}
      />
    </Card>
  );
}
