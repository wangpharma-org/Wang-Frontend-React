import React, { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { CheckCircle, XCircle, Activity, User, ShieldAlert, ShieldCheck, Search } from "lucide-react";

interface DailyIpLog {
  idx: number;
  emp_code: string;
  login_ip: string;
  sample_ip: string | null;
  is_matched: boolean;
  created_at: string;
}

const DailyIpLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<DailyIpLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/daily-ip/logs`
      );
      if (response.data?.status === "success") {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch daily IP logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const [searchMatch, setSearchMatch] = useState("");
  const [searchMismatch, setSearchMismatch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const dateFilteredLogs = selectedDate
    ? logs.filter((l) => dayjs(l.created_at).format("YYYY-MM-DD") === selectedDate)
    : logs;

  const baseMatchedLogs = dateFilteredLogs.filter((l) => l.is_matched);
  const baseMismatchedLogs = dateFilteredLogs.filter((l) => !l.is_matched);

  const matchedLogs = baseMatchedLogs.filter(
    (l) =>
      l.emp_code.toLowerCase().includes(searchMatch.toLowerCase()) ||
      l.login_ip.includes(searchMatch)
  );

  const mismatchedLogs = baseMismatchedLogs.filter(
    (l) =>
      l.emp_code.toLowerCase().includes(searchMismatch.toLowerCase()) ||
      l.login_ip.includes(searchMismatch)
  );

  const totalLogs = dateFilteredLogs.length;
  const matchCount = baseMatchedLogs.length;
  const mismatchCount = baseMismatchedLogs.length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-24 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" />
              รายงานการตรวจสอบ IP (Daily IP Logs)
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              ตรวจสอบประวัติการ Login และความถูกต้องของ IP พนักงาน
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 whitespace-nowrap">เลือกวันที่:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 cursor-pointer"
              />
            </div>
            <button 
              onClick={fetchLogs}
              className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm active:scale-95 whitespace-nowrap"
            >
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-blue-50 rounded-xl">
              <User className="text-blue-600 w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">รายการ Login ทั้งหมด</p>
              <h3 className="text-3xl font-black text-slate-800">{totalLogs}</h3>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-emerald-50 rounded-xl">
              <ShieldCheck className="text-emerald-600 w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">IP ตรงกับที่ระบุ (Match)</p>
              <h3 className="text-3xl font-black text-emerald-600">{matchCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-rose-50 rounded-xl">
              <ShieldAlert className="text-rose-600 w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">IP ไม่ตรง (Mismatch)</p>
              <h3 className="text-3xl font-black text-rose-600">{mismatchCount}</h3>
            </div>
          </div>
        </div>

        {/* Match Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden mt-6">
          <div className="p-5 border-b border-emerald-100 bg-emerald-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="text-emerald-600 w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-emerald-800">
                ประวัติที่ IP ตรง (Match) 
                <span className="text-emerald-600 text-sm ml-2 font-medium">({matchedLogs.length} รายการ)</span>
              </h2>
            </div>
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-emerald-500" />
              </div>
              <input
                type="text"
                placeholder="ค้นหารหัส หรือ IP..."
                value={searchMatch}
                onChange={(e) => setSearchMatch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-emerald-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="text-slate-500 text-sm border-b border-emerald-100">
                  <th className="py-4 px-6 font-semibold bg-white">เวลา (Date/Time)</th>
                  <th className="py-4 px-6 font-semibold bg-white">รหัสพนักงาน</th>
                  <th className="py-4 px-6 font-semibold bg-white">IP ที่ใช้ Login</th>
                  <th className="py-4 px-6 font-semibold bg-white">IP อ้างอิง (Sample)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : matchedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">ไม่มีประวัติ IP ที่ตรง</td>
                  </tr>
                ) : (
                  matchedLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-emerald-50/30 transition-colors text-sm text-slate-700">
                      <td className="py-4 px-6 whitespace-nowrap">{dayjs(log.created_at).format("DD/MM/YYYY HH:mm:ss")}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{log.emp_code}</td>
                      <td className="py-4 px-6 text-emerald-600 font-mono tracking-tight">{log.login_ip}</td>
                      <td className="py-4 px-6 font-mono text-slate-500 tracking-tight">{log.sample_ip || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mismatch Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-200 overflow-hidden mt-6">
          <div className="p-5 border-b border-rose-100 bg-rose-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <XCircle className="text-rose-600 w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-rose-800">
                ประวัติที่ IP ไม่ตรง (Mismatch)
                <span className="text-rose-600 text-sm ml-2 font-medium">({mismatchedLogs.length} รายการ)</span>
              </h2>
            </div>
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-rose-500" />
              </div>
              <input
                type="text"
                placeholder="ค้นหารหัส หรือ IP..."
                value={searchMismatch}
                onChange={(e) => setSearchMismatch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="text-slate-500 text-sm border-b border-rose-100">
                  <th className="py-4 px-6 font-semibold bg-white">เวลา (Date/Time)</th>
                  <th className="py-4 px-6 font-semibold bg-white">รหัสพนักงาน</th>
                  <th className="py-4 px-6 font-semibold bg-white">IP ที่ใช้ Login</th>
                  <th className="py-4 px-6 font-semibold bg-white">IP อ้างอิง (Sample)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : mismatchedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">ไม่มีประวัติ IP ที่ไม่ตรง</td>
                  </tr>
                ) : (
                  mismatchedLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-rose-50/30 transition-colors text-sm text-slate-700">
                      <td className="py-4 px-6 whitespace-nowrap">{dayjs(log.created_at).format("DD/MM/YYYY HH:mm:ss")}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{log.emp_code}</td>
                      <td className="py-4 px-6 text-rose-600 font-mono tracking-tight">{log.login_ip}</td>
                      <td className="py-4 px-6 font-mono text-slate-500 tracking-tight">{log.sample_ip || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DailyIpLogsPage;
