import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, Map, Polygon, useMap } from "@vis.gl/react-google-maps";
import {
  errorMessage,
  fetchGeofences,
  fetchVisits,
  Geofence,
  Poi,
  VisitsResponse,
} from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";
import DateRange from "../components/fleet-map/DateRange";
import DataTable from "../components/fleet-map/DataTable";
import MapShell from "../components/fleet-map/MapShell";
import { duration, todayBkk } from "../components/fleet-map/format";

/** พื้นที่ (geofence) และจุดสนใจ (POI) + ประวัติการเข้า-ออกพื้นที่ — MA-373 */
const DEFAULT_COLOR = "#2563eb";

function FitAll({ geofences, pois, focus }: { geofences: Geofence[]; pois: Poi[]; focus: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const b = new google.maps.LatLngBounds();
    let n = 0;
    for (const g of geofences) {
      if (focus && g.id !== focus) continue;
      g.polygon.forEach(([lat, lng]) => { b.extend({ lat, lng }); n++; });
    }
    for (const p of pois) {
      if (focus && p.id !== focus) continue;
      if (p.lat != null && p.lng != null) { b.extend({ lat: p.lat, lng: p.lng }); n++; }
    }
    if (n) map.fitBounds(b, 80);
  }, [map, geofences, pois, focus]);
  return null;
}

export default function FleetGeofences() {
  const today = todayBkk();
  const [areas, setAreas] = useState<{ geofences: Geofence[]; pois: Poi[] } | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [range, setRange] = useState({ from: today, to: today });
  const [visits, setVisits] = useState<VisitsResponse | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [geofenceFilter, setGeofenceFilter] = useState("all");

  const loadAreas = useCallback(async () => {
    setAreasError(null);
    try {
      setAreas(await fetchGeofences());
    } catch (e) {
      setAreasError(errorMessage(e));
    }
  }, []);

  const loadVisits = useCallback(async () => {
    setVisitsLoading(true);
    setVisitsError(null);
    try {
      setVisits(await fetchVisits(range.from, range.to));
    } catch (e) {
      setVisitsError(errorMessage(e));
    } finally {
      setVisitsLoading(false);
    }
  }, [range]);

  useEffect(() => { loadAreas(); }, [loadAreas]);
  useEffect(() => { loadVisits(); }, [loadVisits]);

  const rows = useMemo(
    () => (visits?.visits ?? []).filter((v) => geofenceFilter === "all" || v.geofenceId === geofenceFilter),
    [visits, geofenceFilter],
  );

  return (
    <FleetLayout title="พื้นที่และจุดสนใจ">
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card title="พื้นที่ที่กำหนด (Geofence)">
            {!areas ? (
              <LoadState loading={!areasError} error={areasError} onRetry={loadAreas} />
            ) : areas.geofences.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีพื้นที่ที่กำหนดในระบบ Cartrack</p>
            ) : (
              <div className="space-y-2">
                {areas.geofences.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setFocus(focus === g.id ? null : g.id)}
                    className={`block w-full rounded-lg border p-3 text-left text-sm ${focus === g.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <div className="font-semibold">{g.name}</div>
                    {g.positionDescription && <div className="text-xs text-gray-500">{g.positionDescription}</div>}
                    <div className="mt-1 text-xs text-gray-700">
                      รถที่อยู่ในพื้นที่ขณะนี้ {g.vehiclesInside.length} คัน
                      {g.vehiclesInside.length > 0 && `: ${g.vehiclesInside.join(", ")}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <Card title="จุดสนใจ (POI)">
            {!areas ? null : areas.pois.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีจุดสนใจในระบบ Cartrack</p>
            ) : (
              <div className="space-y-2">
                {areas.pois.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFocus(focus === p.id ? null : p.id)}
                    className={`block w-full rounded-lg border p-3 text-left text-sm ${focus === p.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <div className="font-semibold">{p.name}</div>
                    {p.description && <div className="text-xs text-gray-600">{p.description}</div>}
                    <div className="text-xs text-gray-500">
                      {p.positionDescription}
                      {p.radiusMeters ? ` (รัศมี ${p.radiusMeters} ม.)` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <MapShell className="h-[420px] overflow-hidden rounded-xl border border-gray-200 lg:h-auto lg:min-h-[480px]">
          <Map defaultCenter={{ lat: 7.03, lng: 100.48 }} defaultZoom={14} gestureHandling="cooperative" streetViewControl={false} style={{ width: "100%", height: "100%" }}>
            {areas && <FitAll geofences={areas.geofences} pois={areas.pois} focus={focus} />}
            {areas?.geofences.map((g) => (
              <Polygon
                key={g.id}
                paths={[g.polygon.map(([lat, lng]) => ({ lat, lng }))]}
                strokeColor={g.colour ?? DEFAULT_COLOR}
                strokeWeight={2}
                fillColor={g.colour ?? DEFAULT_COLOR}
                fillOpacity={0.2}
                onClick={() => setFocus(g.id)}
              />
            ))}
            {areas?.pois.filter((p) => p.lat != null && p.lng != null).map((p) => (
              <Circle
                key={p.id}
                center={{ lat: p.lat!, lng: p.lng! }}
                radius={p.radiusMeters ?? 100}
                strokeColor={p.colour ?? "#16a34a"}
                strokeWeight={2}
                fillColor={p.colour ?? "#16a34a"}
                fillOpacity={0.15}
                onClick={() => setFocus(p.id)}
              />
            ))}
          </Map>
        </MapShell>
      </div>

      <Card
        title="การเข้าและออกพื้นที่"
        right={<DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} maxDays={31} />}
      >
        {visitsLoading || visitsError || !visits ? (
          <LoadState loading={visitsLoading} error={visitsError} onRetry={loadVisits} />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {visits.summary.map((s) => (
                <div key={s.geofenceId} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="font-semibold">{s.geofenceName}</span>: เข้า {s.visits.toLocaleString("th-TH")} ครั้ง จากรถ {s.vehicles} คัน
                  เฉลี่ยอยู่ในพื้นที่ครั้งละ {duration(s.avgDurationSeconds)}
                </div>
              ))}
              {visits.summary.length > 1 && (
                <select value={geofenceFilter} onChange={(e) => setGeofenceFilter(e.target.value)} className="ml-auto rounded-lg border border-gray-300 px-2 py-1 text-sm">
                  <option value="all">ทุกพื้นที่</option>
                  {visits.summary.map((s) => <option key={s.geofenceId} value={s.geofenceId}>{s.geofenceName}</option>)}
                </select>
              )}
            </div>
            <DataTable
              exportName={`การเข้าออกพื้นที่-${visits.from}-ถึง-${visits.to}`}
              emptyText="ไม่พบการเข้าและออกพื้นที่ในช่วงวันที่ที่เลือก"
              columns={[
                { key: "vehicleName", label: "รถ", kind: "text" },
                { key: "geofenceName", label: "พื้นที่", kind: "text" },
                { key: "enter", label: "เวลาเข้า", kind: "datetime" },
                { key: "leave", label: "เวลาออก", kind: "datetime" },
                { key: "durationSeconds", label: "ระยะเวลาในพื้นที่", kind: "duration" },
              ]}
              rows={rows}
            />
          </>
        )}
      </Card>
    </FleetLayout>
  );
}
