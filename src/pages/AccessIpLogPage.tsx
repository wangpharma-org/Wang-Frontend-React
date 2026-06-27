import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  ChevronLeft,
  ChevronRight,
  Users,
  Globe,
  AlertTriangle,
  Building2,
  Ban,
  X,
} from "lucide-react";

const VITE_API_URL_ORDER = import.meta.env.VITE_API_URL_ORDER as string;

interface AccessIp {
  id: number;
  ip_address: string;
  status: string;
  remark: string;
  emp_code: string;
  emp_nickname: string;
  full_name: string;
  emp_mobile1: string;
  created_at: string;
}

interface AccessIpGroup {
  ip_address: string;
  user_count: number;
  login_count: number;
  is_company_ip: boolean | null;
  employees: {
    emp_code: string;
    emp_nickname: string;
    full_name: string;
  }[];
}

interface AccessIpResponse {
  data: AccessIp[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  ipSummary: AccessIpGroup[];
}

const LIMIT = 20;

const AccessIpLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AccessIp[]>([]);
  const [ipSummary, setIpSummary] = useState<AccessIpGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pinningIp, setPinningIp] = useState<string | null>(null);

  const fetchData = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("access_token");
      const response = await axios.get<AccessIpResponse>(
        `${VITE_API_URL_ORDER}/api/access-ip`,
        {
          params: { page: targetPage, limit: LIMIT },
          headers: { Authorization: `Bearer ${token ?? ""}` },
        }
      );
      setLogs(response.data.data);
      setIpSummary(response.data.ipSummary || []);
      setTotalPages(response.data.totalPages || 1);
      setTotal(response.data.total || 0);
      setPage(response.data.currentPage || targetPage);
    } catch (error) {
      console.error("Failed to fetch access IP data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return;
    fetchData(targetPage);
  };

  const pinIp = async (ip_address: string, is_company: boolean) => {
    setPinningIp(ip_address);
    try {
      const token = sessionStorage.getItem("access_token");
      await axios.post(
        `${VITE_API_URL_ORDER}/api/access-ip/pin`,
        { ip_address, is_company },
        { headers: { Authorization: `Bearer ${token ?? ""}` } }
      );
      setIpSummary((prev) =>
        prev.map((g) => (g.ip_address === ip_address ? { ...g, is_company_ip: is_company } : g))
      );
    } catch (error) {
      console.error("Failed to pin ip:", error);
    } finally {
      setPinningIp(null);
    }
  };

  const unpinIp = async (ip_address: string) => {
    setPinningIp(ip_address);
    try {
      const token = sessionStorage.getItem("access_token");
      await axios.delete(`${VITE_API_URL_ORDER}/api/access-ip/pin/${ip_address}`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      setIpSummary((prev) =>
        prev.map((g) => (g.ip_address === ip_address ? { ...g, is_company_ip: null } : g))
      );
    } catch (error) {
      console.error("Failed to unpin ip:", error);
    } finally {
      setPinningIp(null);
    }
  };

  const sharedIps = ipSummary.filter((g) => g.user_count > 1);
  const uniqueIpCount = ipSummary.length;
  const maxLoginCount = ipSummary[0]?.login_count || 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-24 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" />
              ประวัติการเข้าถึง IP (Access IP Log)
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              ตรวจสอบว่าพนักงานคนไหน Login จาก IP ไหน และปักหมุดได้ว่า IP ใดเป็น IP บริษัท
            </p>
          </div>
          <button
            onClick={() => fetchData(page)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm active:scale-95 whitespace-nowrap"
          >
            รีเฟรชข้อมูล
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Activity className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">รายการ Log ทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-800">{total}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Globe className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">IP ที่ไม่ซ้ำกัน</p>
              <h3 className="text-2xl font-bold text-slate-800">{uniqueIpCount}</h3>
            </div>
          </div>

          <div
            className={`rounded-2xl p-5 shadow-sm border flex items-center gap-4 ${
              sharedIps.length > 0 ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"
            }`}
          >
            <div className={`p-3 rounded-xl ${sharedIps.length > 0 ? "bg-rose-100" : "bg-slate-50"}`}>
              <AlertTriangle className={`w-6 h-6 ${sharedIps.length > 0 ? "text-rose-600" : "text-slate-400"}`} />
            </div>
            <div>
              <p className={`text-sm ${sharedIps.length > 0 ? "text-rose-700" : "text-slate-500"}`}>
                IP ที่ถูกใช้ร่วมกันหลายคน
              </p>
              <h3 className={`text-2xl font-bold ${sharedIps.length > 0 ? "text-rose-700" : "text-slate-800"}`}>
                {sharedIps.length}
              </h3>
            </div>
          </div>
        </div>

        {/* IP summary + pin section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">สรุปตาม IP ทั้งหมด</h2>
            <p className="text-sm text-slate-500 mt-1">
              เรียงตามความถี่ที่ถูกใช้งานมากไปน้อย — ปักหมุดเพื่อระบุว่า IP ไหนเป็นของบริษัท
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-sm border-b border-slate-100 bg-slate-50">
                  <th className="py-3 px-6 font-semibold">IP Address</th>
                  <th className="py-3 px-6 font-semibold">ความถี่การใช้งาน</th>
                  <th className="py-3 px-6 font-semibold">จำนวนคนใช้</th>
                  <th className="py-3 px-6 font-semibold">พนักงานที่ใช้</th>
                  <th className="py-3 px-6 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ipSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      {loading ? "กำลังโหลดข้อมูล..." : "ไม่มีข้อมูล"}
                    </td>
                  </tr>
                ) : (
                  ipSummary.map((group) => (
                    <tr key={group.ip_address} className="text-sm text-slate-700 align-top">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {group.ip_address}
                      </td>
                      <td className="py-4 px-6 w-48">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {group.login_count} ครั้ง
                          </span>
                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(group.login_count / maxLoginCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            group.user_count > 1 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          {group.user_count} คน
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {group.employees.map((emp) => (
                            <span
                              key={emp.emp_code}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                            >
                              <span className="font-bold">{emp.emp_code}</span>{" "}
                              {emp.full_name || emp.emp_nickname || "-"}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {group.is_company_ip === true && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 mb-1">
                            <Building2 className="w-3.5 h-3.5" />
                            IP บริษัท
                          </span>
                        )}
                        {group.is_company_ip === false && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 mb-1">
                            <Ban className="w-3.5 h-3.5" />
                            ไม่ใช่ IP บริษัท
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => pinIp(group.ip_address, true)}
                            disabled={pinningIp === group.ip_address || group.is_company_ip === true}
                            title="ปักหมุดว่าเป็น IP บริษัท"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => pinIp(group.ip_address, false)}
                            disabled={pinningIp === group.ip_address || group.is_company_ip === false}
                            title="ปักหมุดว่าไม่ใช่ IP บริษัท"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                          {group.is_company_ip !== null && (
                            <button
                              onClick={() => unpinIp(group.ip_address)}
                              disabled={pinningIp === group.ip_address}
                              title="ยกเลิกการปักหมุด"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <X className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">รายการ Log ทั้งหมด</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-sm border-b border-slate-100 bg-slate-50">
                  <th className="py-4 px-6 font-semibold">เวลา (Date/Time)</th>
                  <th className="py-4 px-6 font-semibold">รหัสพนักงาน</th>
                  <th className="py-4 px-6 font-semibold">ชื่อ</th>
                  <th className="py-4 px-6 font-semibold">IP Address</th>
                  <th className="py-4 px-6 font-semibold">สถานะ</th>
                  <th className="py-4 px-6 font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isOk = log.status?.toLowerCase() === "ok" || log.status?.toLowerCase() === "success";
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors text-sm text-slate-700">
                        <td className="py-4 px-6 whitespace-nowrap">
                          {log.created_at ? dayjs(log.created_at).format("DD/MM/YYYY HH:mm:ss") : "-"}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900">{log.emp_code || "-"}</td>
                        <td className="py-4 px-6">{log.full_name || log.emp_nickname || "-"}</td>
                        <td className="py-4 px-6 font-mono tracking-tight">{log.ip_address || "-"}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              isOk ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {isOk ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                            {log.status || "-"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">{log.remark || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">
              หน้า {page} จาก {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessIpLogPage;
