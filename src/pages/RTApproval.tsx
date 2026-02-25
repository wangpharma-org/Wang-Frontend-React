import { useEffect, useState } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar";
import Modal from "../components/ModalQC";
import boxnotfound from "../assets/product-17.png";

const VITE_API_URL_ORDER = import.meta.env.VITE_API_URL_ORDER;

interface RTApprovalItem {
  ref: string;
  employee: { code: string; name: string };
  product: { code: string; name: string; image: string; floor: string };
  member: { code: string; name: string };
  so_running: string;
  sh_running: string;
  amount_item: number;
  unit_item: string;
  status: string;
  created_at: string;
}

interface GroupedItem extends RTApprovalItem {
  _count: number;
}

const STATUS_FILTERS = ["Pending", "Approved", "Duplicate", "all", "Done"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusDisplay(status: string): { label: string; color: string } {
  if (status === "Approved") return { label: "อนุมัติแล้ว", color: "text-green-600" };
  if (status === "Done") return { label: "ดำเนินการแล้ว", color: "text-blue-600" };
  if (status === "Duplicate") return { label: "ซ้ำ", color: "text-orange-500" };
  return { label: "รออนุมัติ", color: "text-yellow-600" };
}

function filterLabel(s: StatusFilter): string {
  if (s === "Pending") return "รออนุมัติ";
  if (s === "Approved") return "อนุมัติแล้ว";
  if (s === "Done") return "ดำเนินการแล้ว";
  if (s === "Duplicate") return "ซ้ำ";
  return "ทั้งหมด";
}

export default function RTApproval() {
  const [data, setData] = useState<RTApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RTApprovalItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [approvedRef, setApprovedRef] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Pending");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [featureFlag, setFeatureFlag] = useState<boolean>(true);
  const [featureFlagLoading, setFeatureFlagLoading] = useState(false);

  const filteredData = data.filter((item) => {
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.employee.code.toLowerCase().includes(q) ||
      item.employee.name.toLowerCase().includes(q) ||
      item.member.code.toLowerCase().includes(q) ||
      item.member.name.toLowerCase().includes(q) ||
      item.product.name.toLowerCase().includes(q) ||
      item.so_running.toLowerCase().includes(q) ||
      item.sh_running.toLowerCase().includes(q);
    const matchDate = !dateFilter || item.created_at.slice(0, 10) === dateFilter;
    return matchStatus && matchSearch && matchDate;
  });

  // สำหรับ view Duplicate — group by employee+member+product+so และแสดง count
  const groupedDuplicates: GroupedItem[] = (() => {
    if (statusFilter !== "Duplicate") return [];
    const groups = new Map<string, RTApprovalItem[]>();
    filteredData.forEach((item) => {
      const key = `${item.employee.code}|${item.member.code}|${item.product.code}|${item.so_running}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return Array.from(groups.values()).map((items) => ({
      ...items[0],
      amount_item: items[0].amount_item,
      _count: items.length,
    }));
  })();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${VITE_API_URL_ORDER}/api/rt-request`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch RT approval list", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkFeatureFlag();

    const interval = setInterval(() => {
      checkFeatureFlag();
      fetchData();
      // }, 5 * 60 * 1000);
    }, 20 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkFeatureFlag = async () => {
    try {
      const res = await axios.get(`${VITE_API_URL_ORDER}/api/feature-flag/check/rt-request`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });
      setFeatureFlag(res.data.status === true);
    } catch (error) {
      console.error("Failed to check feature flag", error);
      // Default to true if API fails
      setFeatureFlag(true);
    }
  };

  const toggleFeatureFlag = async () => {
    const newStatus = !featureFlag;
    const action = newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน";

    const result = await Swal.fire({
      title: `${action}ฟีเจอร์ RT Request`,
      text: "การดำเนินการนี้จะส่งผลต่อการใช้งานของระบบทั้งหมด",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: newStatus ? "#10b981" : "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `ยืนยัน${action}`,
      cancelButtonText: "ยกเลิก",
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    setFeatureFlagLoading(true);
    try {
      await axios.post(
        `${VITE_API_URL_ORDER}/api/feature-flag/send`,
        {
          module: "rt-request",
          status: newStatus,
          msg: `RT Request feature ${newStatus ? "enabled" : "disabled"} by user`
        },
        {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
        }
      );
      setFeatureFlag(newStatus);

      // แสดง success message
      Swal.fire({
        title: "สำเร็จ!",
        text: `${action}ฟีเจอร์ RT Request เรียบร้อยแล้ว`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Failed to toggle feature flag", error);
      Swal.fire({
        title: "เกิดข้อผิดพลาด!",
        text: "ไม่สามารถปรับปรุงสถานะได้ กรุณาลองใหม่อีกครั้ง",
        icon: "error",
        confirmButtonText: "ตกลง"
      });
    } finally {
      setFeatureFlagLoading(false);
    }
  };

  const handleRowClick = (item: RTApprovalItem) => {
    setSelectedItem(item);
    setNote("");
    setModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedItem || !note.trim()) return;
    setSubmitting(true);
    try {
      await axios.patch(`${VITE_API_URL_ORDER}/api/rt-request/${selectedItem.ref}`, { note }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });
      setApprovedRef(selectedItem.ref);
      setModalOpen(false);
      setQrModalOpen(true);
      fetchData();
    } catch (error) {
      console.error("Failed to approve RT", error);
    } finally {
      setSubmitting(false);
    }
  };

  const isClickable = (status: string) => status !== "Approved" && status !== "Duplicate" && status !== "Done";

  const tableData = statusFilter === "Duplicate" ? groupedDuplicates : filteredData;
  const isDuplicateView = statusFilter === "Duplicate";

  return (
    <div>
      <Navbar />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {!featureFlag && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-800 font-medium">ฟีเจอร์ RT Request ถูกปิดการใช้งานชั่วคราว</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">รายการรออนุมัติการส่ง RT</h1>
          <div className="flex ">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "กำลังโหลด..." : "โหลดใหม่"}
            </button>
            <button
              onClick={toggleFeatureFlag}
              disabled={featureFlagLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${featureFlag
                ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                : "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className={`w-2 h-2 rounded-full ${featureFlag ? "bg-green-500" : "bg-red-500"}`}></div>
              {featureFlagLoading ? "กำลังปรับปรุง..." : featureFlag ? "RT เปิด" : "RT ปิด"}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา พนักงาน / ร้าน / สินค้า / SO / SH..."
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                ล้าง
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === s
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {filterLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">กำลังโหลด...</div>
        ) : tableData.length === 0 ? (
          <div className="text-center text-gray-400 py-10">ไม่มีรายการ</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-blue-400 text-white">
                  <th className="py-3 px-3 text-left font-semibold text-sm">ที่</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">อ้างอิง</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">ข้อมูลพนักงาน</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">ข้อมูลร้าน</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">ชื่อสินค้า</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">SO</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">SH</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">จำนวน</th>
                  <th className="py-3 px-3 text-left font-semibold text-sm">หน่วย</th>
                  {isDuplicateView && (
                    <th className="py-3 px-3 text-left font-semibold text-sm">รายการซ้ำ</th>
                  )}
                  <th className="py-3 px-3 text-left font-semibold text-sm">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((item, index) => {
                  const { label, color } = statusDisplay(item.status);
                  const clickable = isClickable(item.status);
                  return (
                    <tr
                      key={item.ref}
                      onClick={() => featureFlag && clickable && handleRowClick(item)}
                      className={`transition-colors ${!featureFlag || !clickable
                        ? "opacity-50 cursor-not-allowed"
                        : `cursor-pointer hover:bg-blue-100 ${index % 2 === 0 ? "bg-blue-50" : "bg-white"}`
                        }`}
                    >
                      <td className="py-3 px-3 text-sm">{index + 1}</td>
                      <td className="py-3 px-3 text-sm font-semibold text-gray-700">{item.ref.slice(-6)}</td>
                      <td className="py-3 px-3 text-sm max-w-[100px]"><p className="line-clamp-3">{item.employee.code}/{item.employee.name}</p></td>
                      <td className="py-3 px-3 text-sm max-w-[180px]"><p className="line-clamp-3">{item.member.code}/{item.member.name}</p></td>
                      <td className="py-3 px-3 text-sm max-w-[160px]"><p className="line-clamp-3">{item.product.code}/{item.product.name}</p></td>
                      <td className="py-3 px-3 text-sm">{item.so_running}</td>
                      <td className="py-3 px-3 text-sm">{item.sh_running}</td>
                      <td className="py-3 px-3 text-sm">{item.amount_item}</td>
                      <td className="py-3 px-3 text-sm">{item.unit_item}</td>
                      {isDuplicateView && (
                        <td className="py-3 px-3 text-sm">
                          <span className="inline-block bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full text-xs">
                            {(item as GroupedItem)._count} รายการ
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-3 text-sm">
                        <span className={`font-medium ${color}`}>{label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        {selectedItem && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">รายละเอียดการส่ง RT</h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${selectedItem.status === "Approved" ? "bg-green-100 text-green-700" :
                selectedItem.status === "Done" ? "bg-blue-100 text-blue-700" :
                  selectedItem.status === "Duplicate" ? "bg-orange-100 text-orange-700" :
                    "bg-yellow-100 text-yellow-700"
                }`}>
                {statusDisplay(selectedItem.status).label}
              </span>
            </div>

            {/* Image + Info */}
            <div className="flex flex-col sm:flex-row gap-5 mb-5">
              {/* Product Image */}
              <div className="flex-shrink-0 flex justify-center">
                {selectedItem.product.image ? (
                  <img
                    src={
                      selectedItem.product.image?.startsWith("..")
                        ? `https://www.wangpharma.com${selectedItem.product.image?.slice(
                          2
                        )}`
                        : selectedItem.product.image || boxnotfound
                    }
                    alt={selectedItem.product.name}
                    className="h-44 w-44 object-contain rounded-xl border border-gray-200 bg-gray-50 p-2 shadow-sm"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs">
                    ไม่มีรูปภาพ
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: "รหัสสินค้า", value: selectedItem.product.code },
                  { label: "ชื่อสินค้า", value: selectedItem.product.name, clamp: true },
                  { label: "ชั้นวาง", value: selectedItem.product.floor || "-" },
                  { label: "จำนวน / หน่วย", value: `${selectedItem.amount_item} ${selectedItem.unit_item}` },
                  { label: "SO", value: selectedItem.so_running },
                  { label: "SH", value: selectedItem.sh_running },
                ].map(({ label, value, clamp }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                    <span className={`font-medium text-gray-800 ${clamp ? "line-clamp-2" : ""}`} title={clamp ? String(value) : undefined}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 mb-5" />

            {/* Employee & Member */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">พนักงาน</p>
                <p className="font-semibold text-gray-800 text-sm">{selectedItem.employee.code}</p>
                <p className="text-gray-600 text-sm">{selectedItem.employee.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ร้านค้า</p>
                <p className="font-semibold text-gray-800 text-sm">{selectedItem.member.code}</p>
                <p className="text-gray-600 text-sm">{selectedItem.member.name}</p>
              </div>
            </div>

            {/* Note */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                หมายเหตุ <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="กรอกหมายเหตุ..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleApprove}
                disabled={!featureFlag || submitting || !note.trim()}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "กำลังบันทึก..." : !featureFlag ? "ไม่สามารถอนุมัติได้" : "ยืนยันอนุมัติ"}
              </button>
            </div>
          </div>
        )}
      </Modal>
      <Modal isOpen={qrModalOpen} onClose={() => { setQrModalOpen(false); fetchData(); }}>
        <div className="flex flex-col items-center space-y-4 py-2">
          <h2 className="text-lg font-bold">สแกนที่ Station QC</h2>
          <div className="p-4 bg-red-100 rounded-xl">
            <QRCodeSVG value={approvedRef} size={200} />
            <div id="refKey" className="mt-2 text-center text-xs text-gray-700 font-semibold">{approvedRef}</div>
          </div>
          <button
            onClick={() => { setQrModalOpen(false); fetchData(); }}
            className="bg-gray-700 text-white px-10 py-2 rounded-md hover:bg-gray-800"
          >
            ปิด
          </button>
        </div>
      </Modal>
    </div>
  );
}
