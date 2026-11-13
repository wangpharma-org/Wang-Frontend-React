import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, errorMessage, fetchAlerts } from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";
import DateRange from "../components/fleet-map/DateRange";
import { todayBkk } from "../components/fleet-map/format";

/** การแจ้งเตือนจาก Cartrack (MA-373) — เทียบหน้า Alerts › Feed */
const shift = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

export default function FleetAlerts() {
  const today = todayBkk();
  const [range, setRange] = useState({ from: shift(today, -6), to: today });
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("all");
  const [vehicle, setVehicle] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAlerts((await fetchAlerts(range.from, range.to)).alerts);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const types = useMemo(() => [...new Map((alerts ?? []).map((a) => [a.type, a.typeLabel])).entries()], [alerts]);
  const vehicles = useMemo(() => [...new Set((alerts ?? []).map((a) => a.vehicleName))].sort((a, b) => a.localeCompare(b, "th")), [alerts]);
  const rows = (alerts ?? []).filter((a) => (type === "all" || a.type === type) && (vehicle === "all" || a.vehicleName === vehicle));

  return (
    <FleetLayout title="การแจ้งเตือน" actions={<DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} maxDays={31} />}>
      {loading || error || !alerts ? (
        <LoadState loading={loading} error={error} onRetry={load} />
      ) : (
        <Card
          title={`การแจ้งเตือน ${rows.length.toLocaleString("th-TH")} รายการ`}
          right={
            <div className="flex gap-2">
              <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
                <option value="all">ทุกประเภท</option>
                {types.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
                <option value="all">ทุกคัน</option>
                {vehicles.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          }
        >
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">ไม่พบการแจ้งเตือนในช่วงวันที่ที่เลือก</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((a, i) => (
                <li key={i} className="flex flex-wrap items-start gap-3 py-3 text-sm">
                  <span className="w-28 flex-none tabular-nums text-gray-500">{dt(a.at)}</span>
                  <span className="w-32 flex-none font-semibold">{a.vehicleName}</span>
                  <span className="flex-none rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{a.typeLabel}</span>
                  <span className="min-w-[200px] flex-1 text-gray-800">{a.message}</span>
                  {a.lat != null && a.lng != null && (
                    <a
                      href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-none text-blue-600 hover:underline"
                    >
                      แสดงตำแหน่ง
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </FleetLayout>
  );
}
