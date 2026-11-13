import { useEffect, useState } from "react";
import {
  errorMessage,
  fetchReport,
  fetchReportTypes,
  fetchVehicles,
  FleetVehicle,
  Report,
  ReportTypeInfo,
} from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState } from "../components/fleet-map/FleetLayout";
import DateRange from "../components/fleet-map/DateRange";
import DataTable from "../components/fleet-map/DataTable";
import { todayBkk } from "../components/fleet-map/format";

/** รายงานระบบติดตามรถ (MA-373) — เทียบหน้า Reports ของเว็บ Cartrack · ส่งออก Excel ได้ทุกรายงาน */
const shift = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

const thDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

export default function FleetReports() {
  const today = todayBkk();
  const [types, setTypes] = useState<ReportTypeInfo[] | null>(null);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [type, setType] = useState("trip-summary");
  const [registration, setRegistration] = useState("");
  const [range, setRange] = useState({ from: shift(today, -6), to: today });
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTypes = () => {
    setTypesError(null);
    fetchReportTypes().then(setTypes).catch((e) => setTypesError(errorMessage(e)));
  };
  useEffect(() => {
    loadTypes();
    fetchVehicles().then((s) => setVehicles(s.vehicles)).catch(() => setVehicles([]));
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchReport(type, range.from, range.to, registration || undefined));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const vehicleName = vehicles.find((v) => v.registration === registration)?.name;
  return (
    <FleetLayout title="รายงาน">
      {!types ? (
        <LoadState loading={!typesError} error={typesError} onRetry={loadTypes} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((t) => (
              <button
                key={t.type}
                onClick={() => { setType(t.type); setReport(null); }}
                className={`rounded-xl border p-4 text-left ${type === t.type ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}`}
              >
                <div className="font-semibold text-gray-900">{t.title}</div>
                <div className="mt-1 text-sm text-gray-500">{t.description}</div>
              </button>
            ))}
          </div>
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-0 max-w-full text-sm">
                <span className="mb-1 block text-gray-600">รถ</span>
                <select value={registration} onChange={(e) => setRegistration(e.target.value)} className="max-w-full rounded-lg border border-gray-300 px-2 py-1">
                  <option value="">ทุกคัน</option>
                  {vehicles.map((v) => <option key={v.registration} value={v.registration}>{v.name}</option>)}
                </select>
              </label>
              <div className="text-sm">
                <span className="mb-1 block text-gray-600">ช่วงวันที่ (ไม่เกิน 31 วัน)</span>
                <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} maxDays={31} />
              </div>
              <button onClick={run} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                {loading ? "กำลังสร้างรายงาน" : "สร้างรายงาน"}
              </button>
            </div>
          </Card>
          {error && <LoadState loading={false} error={error} onRetry={run} />}
          {report && !loading && (
            <Card title={`${report.title} ${report.from === report.to ? `วันที่ ${thDate(report.from)}` : `ระหว่างวันที่ ${thDate(report.from)} ถึง ${thDate(report.to)}`}${vehicleName ? ` รถ ${vehicleName}` : ""}`}>
              <DataTable
                exportName={`${report.title}-${report.from}-ถึง-${report.to}${vehicleName ? `-${vehicleName}` : ""}`}
                columns={report.columns}
                rows={report.rows}
                emptyText="ไม่พบข้อมูลในช่วงวันที่และรถที่เลือก"
              />
            </Card>
          )}
        </>
      )}
    </FleetLayout>
  );
}
