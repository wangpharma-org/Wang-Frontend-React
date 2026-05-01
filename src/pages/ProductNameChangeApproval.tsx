import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar";
import boxnotfound from "../assets/product-17.png";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/th";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("th");

const VITE_API_URL_ORDER = import.meta.env.VITE_API_URL_ORDER;

interface NameChangeHistoryEntry {
  name: string;
  changed_at: string;
}

interface PendingRequest {
  id: number;
  product_code: string;
  old_name: string;
  new_name: string;
  current_image_url: string | null;
  changed_at: string;
  change_history: NameChangeHistoryEntry[];
  affected_count: number;
}

function resolveImageUrl(url: string | null): string {
  if (!url) return boxnotfound;
  if (url.startsWith("..")) return `https://www.wangpharma.com${url.slice(2)}`;
  return url;
}

const ProductNameChangeApproval = () => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});

  const authHeader = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get<PendingRequest[]>(
        `${VITE_API_URL_ORDER}/api/product-name-change`,
        { headers: authHeader() }
      );
      setRequests(res.data);
    } catch (e) {
      console.error(e);
      Swal.fire("à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”", "à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    const confirm = await Swal.fire({
      title: "à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´",
      text: "à¸Šà¸·à¹ˆà¸­à¸ªà¸´à¸™à¸„à¹‰à¸²à¹ƒà¸«à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡ â€” à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹ƒà¸«à¹‰ QC à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸•à¹ˆà¸­à¹„à¸”à¹‰",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´",
      cancelButtonText: "à¸¢à¸à¹€à¸¥à¸´à¸",
      confirmButtonColor: "#16a34a",
    });
    if (!confirm.isConfirmed) return;

    setActionLoading(id);
    try {
      await axios.patch(
        `${VITE_API_URL_ORDER}/api/product-name-change/${id}/approve`,
        { note: noteMap[id] ?? null },
        { headers: authHeader() }
      );
      Swal.fire({ title: "à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸ªà¸³à¹€à¸£à¹‡à¸ˆ", icon: "success", timer: 1500, showConfirmButton: false });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      Swal.fire("à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”", err.response?.data?.message ?? "à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceRT = async (id: number) => {
    const confirm = await Swal.fire({
      title: "à¸¢à¸·à¸™à¸¢à¸±à¸™ Force RT",
      text: "à¸ªà¸´à¸™à¸„à¹‰à¸²à¸„à¸™à¸¥à¸°à¸•à¸±à¸§ â€” à¸£à¸°à¸šà¸šà¸ˆà¸°à¸—à¸³ RT à¸£à¸²à¸¢à¸à¸²à¸£à¸—à¸µà¹ˆà¸¢à¸±à¸‡à¹„à¸¡à¹ˆ QC à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Force RT",
      cancelButtonText: "à¸¢à¸à¹€à¸¥à¸´à¸",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;

    setActionLoading(id);
    try {
      await axios.patch(
        `${VITE_API_URL_ORDER}/api/product-name-change/${id}/force-rt`,
        { note: noteMap[id] ?? null },
        { headers: authHeader() }
      );
      Swal.fire({ title: "Force RT à¸ªà¸³à¹€à¸£à¹‡à¸ˆ", icon: "success", timer: 1500, showConfirmButton: false });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      Swal.fire("à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”", err.response?.data?.message ?? "Force RT à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´à¸à¸²à¸£à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸Šà¸·à¹ˆà¸­à¸ªà¸´à¸™à¸„à¹‰à¸²</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {requests.length > 0
                  ? `à¸£à¸­à¸à¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´ ${requests.length} à¸£à¸²à¸¢à¸à¸²à¸£`
                  : "à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£à¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´"}
              </p>
            )}
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="shrink-0 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            à¸£à¸µà¹€à¸Ÿà¸£à¸Š
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-3" />
            <p className="text-sm">à¸à¸³à¸¥à¸±à¸‡à¹‚à¸«à¸¥à¸”...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-500">à¹„à¸¡à¹ˆà¸¡à¸µà¸£à¸²à¸¢à¸à¸²à¸£à¸£à¸­à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-100">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-amber-700 font-medium">à¸£à¸«à¸±à¸ªà¸ªà¸´à¸™à¸„à¹‰à¸²</span>
                    <span className="font-bold text-gray-900 text-base leading-tight">{req.product_code}</span>
                  </div>
                  <div className="ml-auto shrink-0 flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      à¸à¸£à¸°à¸—à¸š {req.affected_count} à¸£à¸²à¸¢à¸à¸²à¸£
                    </span>
                  </div>
                </div>

                <div className="p-4">

                  {/* Before / After comparison */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch mb-4">

                    {/* Old name */}
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 min-w-0">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">à¸Šà¸·à¹ˆà¸­à¹€à¸”à¸´à¸¡</span>
                      <div className="w-full max-w-[80px] aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                        <img
                          src={boxnotfound}
                          alt={req.old_name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = boxnotfound; }}
                        />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 text-center leading-snug line-clamp-3 w-full break-words">
                        {req.old_name}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center px-1">
                      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    {/* New name */}
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 min-w-0">
                      <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">à¸Šà¸·à¹ˆà¸­à¹ƒà¸«à¸¡à¹ˆ</span>
                      <div className="w-full max-w-[80px] aspect-square rounded-lg overflow-hidden border border-amber-200 bg-white flex items-center justify-center">
                        <img
                          src={resolveImageUrl(req.current_image_url)}
                          alt={req.new_name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = boxnotfound; }}
                        />
                      </div>
                      <p className="text-sm font-bold text-amber-800 text-center leading-snug line-clamp-3 w-full break-words">
                        {req.new_name}
                      </p>
                    </div>
                  </div>

                  {/* Change history */}
                  {req.change_history && req.change_history.length > 0 && (
                    <div className="mb-3 rounded-lg border border-gray-200 divide-y divide-gray-100">
                      <div className="px-3 py-2 bg-gray-50 rounded-t-lg">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">à¸Šà¸·à¹ˆà¸­à¸—à¸µà¹ˆà¸‚à¹‰à¸²à¸¡à¸¡à¸²</p>
                      </div>
                      {req.change_history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <span className="text-sm text-gray-700 font-medium">{h.name}</span>
                          <span className="text-xs text-gray-400 shrink-0 ml-2">
                            {dayjs.utc(h.changed_at).tz("Asia/Bangkok").format("DD/MM/YY HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 mb-3">
                    à¸•à¸£à¸§à¸ˆà¸žà¸šà¸à¸²à¸£à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸Šà¸·à¹ˆà¸­:{" "}
                    <span className="text-gray-600">
                      {dayjs.utc(req.changed_at).tz("Asia/Bangkok").format("DD/MM/YYYY HH:mm à¸™.")}
                    </span>
                  </p>

                  {/* Note input */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸ (à¹„à¸¡à¹ˆà¸šà¸±à¸‡à¸„à¸±à¸š)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                      placeholder="à¸£à¸°à¸šà¸¸à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸..."
                      value={noteMap[req.id] ?? ""}
                      onChange={(e) =>
                        setNoteMap((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      disabled={actionLoading === req.id}
                      onClick={() => handleApprove(req.id)}
                      className="py-3 px-4 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === req.id
                        ? "à¸à¸³à¸¥à¸±à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£..."
                        : "à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´ (à¸ªà¸´à¸™à¸„à¹‰à¸²à¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸™)"}
                    </button>
                    <button
                      disabled={actionLoading === req.id}
                      onClick={() => handleForceRT(req.id)}
                      className="py-3 px-4 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {actionLoading === req.id
                        ? "à¸à¸³à¸¥à¸±à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£..."
                        : "à¸ªà¹ˆà¸‡ RT (à¸ªà¸´à¸™à¸„à¹‰à¸²à¸„à¸™à¸¥à¸°à¸•à¸±à¸§)"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductNameChangeApproval;
