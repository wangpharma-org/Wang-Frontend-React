import { useCallback, useEffect, useState } from "react";
import {
  errorMessage,
  fetchLive,
  fetchOverview,
  LiveDashboard,
  OverviewDashboard,
  STATUS_META,
  STATUS_ORDER,
} from "../components/fleet-map/api";
import FleetLayout, { Card, LoadState, Stat } from "../components/fleet-map/FleetLayout";
import DateRange from "../components/fleet-map/DateRange";
import DataTable from "../components/fleet-map/DataTable";
import { Bars, HBars, StackedBars } from "../components/fleet-map/charts";
import { duration, todayBkk } from "../components/fleet-map/format";

/** แดชบอร์ดระบบติดตามรถ (MA-373) — เทียบหน้า Dashboard › Live และ Overview ของเว็บ Cartrack */
type Tab = "live" | "overview";

const hours = (sec: number) => `${(sec / 3600).toLocaleString("th-TH", { maximumFractionDigits: 1 })} ชม.`;
const km = (n: number) => `${n.toLocaleString("th-TH", { maximumFractionDigits: 1 })} กม.`;
const shortDate = (d: string) => {
  const x = new Date(`${d}T00:00:00`);
  return `${x.getDate()}/${x.getMonth() + 1}`;
};
const shift = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export default function FleetDashboard() {
  const [tab, setTab] = useState<Tab>("live");
  return (
    <FleetLayout
      title="แดชบอร์ด"
      actions={
        <div className="flex rounded-lg border border-gray-300 p-0.5 text-sm">
          {([["live", "วันนี้"], ["overview", "ภาพรวมตามช่วงวันที่"]] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1 ${tab === k ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {tab === "live" ? <Live /> : <Overview />}
    </FleetLayout>
  );
}

function Live() {
  const [data, setData] = useState<LiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchLive());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => !document.hidden && load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) return <LoadState loading={loading} error={error} onRetry={load} />;
  const t = data.totals;
  const statusCounts = STATUS_ORDER.map((s) => ({ s, n: data.vehicles.filter((v) => v.status === s).length })).filter((x) => x.n > 0);

  return (
    <>
      <p className="text-sm text-gray-500">
        ข้อมูลวันที่ {new Date(`${data.date}T00:00:00`).toLocaleDateString("th-TH", { dateStyle: "long" })} ปรับปรุงล่าสุดเวลา{" "}
        {new Date(data.generatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. ระบบปรับปรุงข้อมูลทุก 1 นาที
        {error && <span className="ml-2 text-amber-700">(ไม่สามารถปรับปรุงข้อมูลครั้งล่าสุดได้: {error})</span>}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="รถที่ใช้งานวันนี้" value={`${t.activeVehicles} / ${t.fleetSize} คัน`} />
        <Stat label="เวลาขับขี่รวม" value={hours(t.drivingSeconds)} />
        <Stat label="เวลาจอดติดเครื่องยนต์รวม" value={hours(t.idleSeconds)} hint={`คิดเป็น ${t.idlingRatePercent}% ของเวลาติดเครื่อง`} />
        <Stat label="เที่ยวที่สิ้นสุดแล้ว" value={`${t.tripsCompleted.toLocaleString("th-TH")} เที่ยว`} />
        <Stat label="ระยะทางรวม" value={km(t.distanceKm)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="การใช้งานรถรายชั่วโมง (ร้อยละของเวลาที่รถเดินทาง)">
            <Bars
              data={data.utilisationByHour.map((h) => ({ label: `${String(h.hour).padStart(2, "0")}`, value: h.percent }))}
              format={(n) => `${n}%`}
              color="#0891b2"
            />
          </Card>
        </div>
        <Card title="สถานะรถขณะนี้">
          <div className="space-y-2">
            {statusCounts.map(({ s, n }) => (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
                <span className="flex-1">{STATUS_META[s].label}</span>
                <span className="font-semibold tabular-nums">{n} คัน</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="รายละเอียดรถวันนี้">
        <DataTable
          exportName={`กิจกรรมรถ-${data.date}`}
          columns={[
            { key: "name", label: "รถ", kind: "text" },
            { key: "drivers", label: "คนขับ", kind: "text" },
            { key: "statusLabel", label: "สถานะ", kind: "text" },
            { key: "firstIgnitionOn", label: "ติดเครื่องยนต์ครั้งแรก", kind: "datetime" },
            { key: "lastIgnitionOff", label: "ดับเครื่องยนต์ครั้งล่าสุด", kind: "datetime" },
            { key: "drivingSeconds", label: "เวลาขับขี่", kind: "duration" },
            { key: "idleSeconds", label: "จอดติดเครื่องยนต์", kind: "duration" },
            { key: "trips", label: "จำนวนเที่ยว", kind: "number" },
            { key: "distanceKm", label: "ระยะทาง", kind: "km" },
          ]}
          rows={data.vehicles}
        />
      </Card>
    </>
  );
}

function Overview() {
  const today = todayBkk();
  const [range, setRange] = useState({ from: shift(today, -29), to: today });
  const [data, setData] = useState<OverviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchOverview(range.from, range.to));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const every = data && data.daily.length > 16 ? Math.ceil(data.daily.length / 12) : 1;
  return (
    <>
      <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} maxDays={31} />
      {loading || error || !data ? (
        <LoadState
          loading={loading}
          error={error}
          onRetry={load}
          message="กำลังรวบรวมข้อมูลการเดินทางจากระบบ Cartrack การเปิดช่วงวันที่ใหม่ครั้งแรกอาจใช้เวลาประมาณ 15 วินาที"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="รถที่ใช้งานในช่วงนี้" value={`${data.totals.activeVehicles} / ${data.totals.fleetSize} คัน`} />
            <Stat label="ระยะทางรวม" value={km(data.totals.distanceKm)} hint={`${data.totals.trips.toLocaleString("th-TH")} เที่ยว`} />
            <Stat
              label="ระยะทางเฉลี่ยต่อคันต่อวัน"
              value={km(data.totals.avgKmPerVehicleDay)}
              hint={`รถที่เดินทางน้อยกว่าค่าเฉลี่ย ${data.totals.belowAverageVehicles} คัน`}
            />
            <Stat label="เวลาขับขี่รวม" value={hours(data.totals.drivingSeconds)} hint={`จอดติดเครื่องยนต์ ${hours(data.totals.idleSeconds)}`} />
            <Stat label="เบรก เร่ง หรือเลี้ยวรุนแรง" value={`${data.totals.harshEvents.toLocaleString("th-TH")} ครั้ง`} />
          </div>

          <Card title="จำนวนรถที่ใช้งานรายวัน">
            <StackedBars
              labelEvery={every}
              segments={[
                { key: "activeVehicles", label: "ใช้งาน", color: "#16a34a" },
                { key: "inactiveOnDay", label: "ไม่ได้ใช้งานในวันนั้น", color: "#f59e0b" },
                { key: "inactiveWholePeriod", label: "ไม่ได้ใช้งานตลอดช่วง", color: "#d1d5db" },
              ]}
              data={data.daily.map((d) => ({
                label: shortDate(d.date),
                activeVehicles: d.activeVehicles,
                inactiveOnDay: d.inactiveOnDay,
                inactiveWholePeriod: d.inactiveWholePeriod,
              }))}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="ระยะทางรายวัน">
              <Bars labelEvery={every} data={data.daily.map((d) => ({ label: shortDate(d.date), value: d.distanceKm }))} format={km} />
            </Card>
            <Card title="จำนวนเที่ยวรายวัน">
              <Bars labelEvery={every} data={data.daily.map((d) => ({ label: shortDate(d.date), value: d.trips }))} color="#7c3aed" />
            </Card>
            <Card title="อัตราการจอดติดเครื่องยนต์รายวัน (ร้อยละของเวลาติดเครื่อง)">
              <Bars labelEvery={every} data={data.daily.map((d) => ({ label: shortDate(d.date), value: d.idleRatePercent }))} format={(n) => `${n}%`} color="#f59e0b" />
            </Card>
            <Card title="จำนวนครั้งที่เบรก เร่ง หรือเลี้ยวรุนแรงรายวัน">
              <Bars labelEvery={every} data={data.daily.map((d) => ({ label: shortDate(d.date), value: d.harshEvents }))} color="#dc2626" />
            </Card>
            <Card title="ช่วงเวลาที่รถเดินทาง (ชั่วโมงขับขี่รวมในแต่ละช่วงเวลา)">
              <Bars data={data.operatingByHour.map((h) => ({ label: String(h.hour).padStart(2, "0"), value: h.seconds / 3600 }))} format={(n) => `${n.toFixed(1)} ชม.`} color="#0891b2" />
            </Card>
            <Card title="เวลาออกเดินทางของเที่ยวที่ไกลกว่า 50 กม.">
              <Bars data={data.longTripStartsByHour.map((h) => ({ label: String(h.hour).padStart(2, "0"), value: h.count }))} format={(n) => `${n} เที่ยว`} color="#0f766e" />
            </Card>
            <Card title="รถที่เดินทางระยะทางมากที่สุด">
              <HBars rows={data.vehicles.slice(0, 10).map((v) => ({ label: v.name, value: v.distanceKm }))} format={km} />
            </Card>
            <Card title="เวลาขับขี่เทียบกับเวลาจอดติดเครื่องยนต์ (รถที่จอดติดเครื่องยนต์นานที่สุด)">
              <HBars
                rows={[...data.vehicles]
                  .sort((a, b) => b.idleSeconds - a.idleSeconds)
                  .slice(0, 10)
                  .map((v) => ({ label: v.name, value: v.drivingSeconds, secondaryValue: v.idleSeconds }))}
                format={(n) => duration(n)}
                color="#16a34a"
                secondary={{ color: "#f59e0b", label: "จอดติดเครื่องยนต์", primaryLabel: "ขับขี่" }}
              />
            </Card>
          </div>

          <Card title="สรุปรายคัน">
            <DataTable
              exportName={`สรุปรายคัน-${data.from}-ถึง-${data.to}`}
              columns={[
                { key: "name", label: "รถ", kind: "text" },
                { key: "activeDays", label: "วันที่มีการเดินทาง", kind: "number" },
                { key: "trips", label: "จำนวนเที่ยว", kind: "number" },
                { key: "distanceKm", label: "ระยะทาง", kind: "km" },
                { key: "drivingSeconds", label: "เวลาขับขี่", kind: "duration" },
                { key: "idleSeconds", label: "จอดติดเครื่องยนต์", kind: "duration" },
                { key: "harshEvents", label: "เบรก เร่ง หรือเลี้ยวรุนแรง", kind: "number" },
                { key: "speedingEvents", label: "ขับขี่เกินความเร็วที่กำหนด", kind: "number" },
                { key: "maxSpeed", label: "ความเร็วสูงสุด", kind: "speed" },
              ]}
              rows={data.vehicles}
            />
          </Card>
        </>
      )}
    </>
  );
}
