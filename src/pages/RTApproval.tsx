import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar";
import Modal from "../components/ModalQC";
import boxnotfound from "../assets/product-17.png";

const VITE_API_URL_ORDER = import.meta.env.VITE_API_URL_ORDER;

// Interface สำหรับข้อมูล purchest ใหม่
interface PurchestData {
  purchest_id: number;
  product_code: string;
  pro_stock: string;
  pro_Unit1: string;
  pro_timeStock: string;
  update_at: Date;
  pur: {
    purchest_pur_id: number;
    pur_date: string;
    pur_invoice: string;
    pur_amount: string;
    pur_unit: string;
  } | null;
  bi: {
    purchest_bi_id: number;
    bi_date: string;
    bi_invoice: string;
    bi_amount: string;
    bi_unit: string;
  } | null;
  po: {
    purchest_po_id: number;
    po_date: string;
    po_invoice: string;
    po_amount: string | null;
    po_unit: string;
  } | null;
  pr: {
    purchest_pr_id: number;
    pr_date: string | null;
    pr_invoice: string | null;
    pr_amount: string | null;
    pr_unit: string | null;
  } | null;
  purchestHistory: {
    purchest_history_id: number;
    date: string;
    type: 'SAL' | 'RET' | 'PUR';
    amount: number;
    unit: string;
  }[];
  product: {
    product_stock: string;
    last_stock_date: string;
  }
}

interface RTApprovalItem {
  ref: string;
  employee: { code: string; name: string };
  product: {
    code: string;
    name: string;
    image: string;
    floor: string;
    purchest?: PurchestData; // เพิ่มข้อมูล purchest ใหม่
    purchase_entry?: {
      SO_amount: string;
      PR_amount: string;
      RT_amount: string;
      PO_amount: string;
      product_code: string;
      purchase_entry_no: string;
      purchase_entry_date: Date;
    }[]; // เก็บไว้เพื่อ backward compatibility
  };
  member: {
    code: string;
    name: string;
    sales?: { code: string; name: string };
    route?: {
      code: string;
      name: string;
    };
  };
  so_running: string;
  sh_running: string;
  amount_item: number;
  unit_item: string;
  status: string;
  note?: string | null;
  empQC_note?: string | null;
  created_at: string;
}

interface GroupedItem extends RTApprovalItem {
  _count: number;
}

const STATUS_FILTERS = ["Pending", "Approved", "Duplicate", "all", "Done", "NotActive"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusDisplay(status: string): { label: string; color: string } {
  if (status === "Approved") return { label: "อนุมัติแล้ว", color: "text-green-600" };
  if (status === "Done") return { label: "ดำเนินการแล้ว", color: "text-blue-600" };
  if (status === "Duplicate") return { label: "ซ้ำ", color: "text-orange-500" };
  if (status === "RT-Success") return { label: "จัดแล้ว", color: "text-purple-600" };
  if (status === "NotActive") return { label: "ช่วงปิดระบบ", color: "text-gray-600" };
  if (status === "Rejected") return { label: "ถูกปฏิเสธ", color: "text-red-600" };
  return { label: "รออนุมัติ", color: "text-yellow-600" }; 
}

function getStatusStyles(status: string): { bgClass: string; textClass: string; borderClass: string; dotClass: string } {
  if (status === "Approved") return { 
    bgClass: "bg-green-100", 
    textClass: "text-green-800", 
    borderClass: "border-green-200", 
    dotClass: "bg-green-500" 
  };
  if (status === "Done") return { 
    bgClass: "bg-blue-100", 
    textClass: "text-blue-800", 
    borderClass: "border-blue-200", 
    dotClass: "bg-blue-500" 
  };
  if (status === "Duplicate") return { 
    bgClass: "bg-orange-100", 
    textClass: "text-orange-800", 
    borderClass: "border-orange-200", 
    dotClass: "bg-orange-500" 
  };
  if (status === "RT-Success") return { 
    bgClass: "bg-purple-100", 
    textClass: "text-purple-800", 
    borderClass: "border-purple-200", 
    dotClass: "bg-purple-500" 
  };
  if (status === "NotActive") return { 
    bgClass: "bg-gray-100", 
    textClass: "text-gray-800", 
    borderClass: "border-gray-200", 
    dotClass: "bg-gray-500" 
  };
  if (status === "Rejected") return { 
    bgClass: "bg-red-100", 
    textClass: "text-red-800", 
    borderClass: "border-red-200", 
    dotClass: "bg-red-500" 
  };
  return { 
    bgClass: "bg-yellow-100", 
    textClass: "text-yellow-800", 
    borderClass: "border-yellow-200", 
    dotClass: "bg-yellow-500" 
  };
}

function filterLabel(s: StatusFilter): string {
  if (s === "Pending") return "รออนุมัติ";
  if (s === "Approved") return "อนุมัติแล้ว";
  if (s === "Done") return "ดำเนินการแล้ว";
  if (s === "Duplicate") return "ซ้ำ";
  if (s === "NotActive") return "ช่วงปิดระบบ";
  return "ทั้งหมด";
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} ปีที่แล้ว`;
  if (months > 0) return `${months} เดือนที่แล้ว`;
  if (days > 0) return `${days} วันที่แล้ว`;
  if (hours > 0) return `${hours} ชั่วโมงที่แล้ว`;
  if (minutes > 0) return `${minutes} นาทีที่แล้ว`;
  if (seconds > 30) return `${seconds} วินาทีที่แล้ว`;
  return "เพิ่งสร้าง";
}

export default function RTApproval() {
  const [data, setData] = useState<RTApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RTApprovalItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [, setNote] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");

  const NOTE_OPTIONS = [
    "ให้ผ่านอนุมัติ",
    "สินค้าจริงไม่มี",
    "ให้สินค้าอื่นทดแทน",
    "สินค้ามีการสลับกัน ตรวจสอบเพิ่ม",
    "อื่นๆ"
  ];

  const finalNote = selectedReason === "อื่นๆ" ? customReason : selectedReason;
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Pending");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [featureFlag, setFeatureFlag] = useState<boolean>(true);
  const [featureFlagLoading, setFeatureFlagLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<boolean>(true);
  const [purchestLoading, setPurchestLoading] = useState(false);

  const filteredData = (Array.isArray(data) ? data : []).filter((item) => {
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.employee?.code?.toLowerCase().includes(q) ||
      item.employee?.name?.toLowerCase().includes(q) ||
      item.member?.code?.toLowerCase().includes(q) ||
      item.member?.name?.toLowerCase().includes(q) ||
      item.product?.code?.toLowerCase().includes(q) ||
      item.product?.name?.toLowerCase().includes(q) ||
      (item.product?.floor || "").toLowerCase().includes(q) ||
      item.so_running?.toLowerCase().includes(q) ||
      item.sh_running?.toLowerCase().includes(q) ||
      item.ref?.toLowerCase().includes(q) ||
      item.unit_item?.toLowerCase().includes(q) ||
      (item.note || "").toLowerCase().includes(q) ||
      (item.empQC_note || "").toLowerCase().includes(q) ||
      (item.member?.sales?.code || "").toLowerCase().includes(q) ||
      (item.member?.sales?.name || "").toLowerCase().includes(q) ||
      (item.member?.route?.code || "").toLowerCase().includes(q) ||
      (item.member?.route?.name || "").toLowerCase().includes(q) ||
      item.amount_item?.toString().includes(q);
    const matchDate = !dateFilter || item.created_at?.slice(0, 10) === dateFilter;
    return matchStatus && matchSearch && matchDate;
  });

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

  const groupedPending: GroupedItem[] = (() => {
    if (statusFilter !== "Pending") return [];
    const groups = new Map<string, RTApprovalItem[]>();
    filteredData.forEach((item) => {
      const key = `${item.employee.code}|${item.member.code}|${item.product.code}|${item.so_running}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return Array.from(groups.values())
      .map((items) => {

        const sortedItems = items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const oldestItem = items.reduce((oldest, current) =>
          new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
        );
        return {
          ...sortedItems[0],
          created_at: oldestItem.created_at,
          amount_item: sortedItems[0].amount_item,
          _count: items.length,
        };
      });
  })();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${VITE_API_URL_ORDER}/api/rt-request`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });
      // Ensure data is always an array
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (error: unknown) {

      console.error("Failed to fetch RT approval list", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          setError("ไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาเข้าสู่ระบบใหม่");
        } else if (error.response?.status === 401) {
          setError("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
          sessionStorage.removeItem("access_token");
          setTimeout(() => {
            window.location.href = "/login";
          }, 3000);
        } else if (error.code === "ECONNREFUSED" || error.message.includes("Network Error")) {
          setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเตอร์เน็ต");
        } else {
          setError("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkFeatureFlag();

    const interval = setInterval(() => {
      fetchData();
      checkFeatureFlag();
    }, 5 * 60 * 1000);

    return () => { clearInterval(interval); };
  }, [active]);

  const checkFeatureFlag = async () => {
    try {
      const res = await axios.get(`${VITE_API_URL_ORDER}/api/feature-flag/check/rt-request`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });
      setFeatureFlag(res.data.status === true);
    } catch (error: unknown) {
      console.error("Failed to check feature flag", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          setFeatureFlag(false);
        } else {
          setFeatureFlag(true);
        }
      }
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
    setSelectedReason(null);
    setCustomReason("");
    setModalOpen(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({
        icon: 'success',
        title: 'คัดลอกสำเร็จ!',
        text: `คัดลอก "${text}" แล้ว`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
      Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถคัดลอกได้',
        text: 'กรุณาลองใหม่อีกครั้ง',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const fetchPurchestDataShow = async (productCode: string) => {
    setPurchestLoading(true);
    console.log("Fetching purchest data for product code:", productCode);
    try {
      const res = await axios.get(`http://localhost:3003/api/purchest/history/${productCode}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });

      if (selectedItem && res.data) {
        const updatedProduct = {
          ...selectedItem.product,
          purchest: res.data
        };
        setSelectedItem({
          ...selectedItem,
          product: updatedProduct
        });
        setData(prev => prev.map(item => item.ref === selectedItem.ref ? { ...item, product: updatedProduct } : item));
      }
    } catch (error) {
      console.error('Failed to fetch purchest data', error);
    } finally {
      setPurchestLoading(false);
    }
  };

  const fetchPurchestData = async (productCode: string) => {
    setPurchestLoading(true);
    try {
      const res = await axios.post(`http://localhost:3003/api/purchest/find`, {
        product_code: productCode
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });
      if (res.data) {
        fetchPurchestDataShow(productCode);
      }
      Swal.fire({
        icon: 'success',
        title: 'โหลดข้อมูลสำเร็จ!',
        text: 'ข้อมูลการซื้อขายได้รับการอัปเดตแล้ว',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (error: unknown) {
      console.error('Failed to fetch purchest data', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: 'ไม่สามารถโหลดข้อมูลการซื้อขายได้',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setPurchestLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    setRejecting(true);
    console.log("Rejecting with note:", finalNote);
    try {
      await axios.patch(`${VITE_API_URL_ORDER}/api/rt-request/reject/${selectedItem.ref}`, {
        pro_code: selectedItem.product.code,
        mem_code: selectedItem.member.code,
        note: finalNote?.trim() || null
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });

      setModalOpen(false);
      setSelectedItem(null);

      Swal.fire({
        icon: 'success',
        title: 'ปฏิเสธ RT สำเร็จ!',
        html: `
          <div class="text-center">
            <p class="mb-3">ปฏิเสธคำขอ RT เรียบร้อยแล้ว</p>
            <div class="bg-gray-100 rounded-lg p-3 inline-block">
              <p class="text-sm text-gray-600 mb-1">หมายเลขอ้างอิง</p>
              <p class="font-mono font-bold text-lg">${selectedItem.ref}</p>
            </div>
          </div>
        `,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#ef4444',
        showConfirmButton: true,
        allowOutsideClick: false,
        allowEscapeKey: false
      });
      fetchData();
    } catch (error) {
      console.error("Failed to reject RT", error);

      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: 'ไม่สามารถปฏิเสธคำขอ RT ได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await axios.patch(`${VITE_API_URL_ORDER}/api/rt-request/${selectedItem.ref}`, {
        pro_code: selectedItem.product.code,
        mem_code: selectedItem.member.code,
        note: finalNote?.trim() || null
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
      });

      setModalOpen(false);
      setSelectedItem(null);

      // แสดง popup สำเร็จ
      Swal.fire({
        icon: 'success',
        title: 'อนุมัติ RT สำเร็จ!',
        html: `
          <div class="text-center">
            <p class="mb-3">อนุมัติคำขอ RT เรียบร้อยแล้ว</p>
            <div class="bg-gray-100 rounded-lg p-3 inline-block">
              <p class="text-sm text-gray-600 mb-1">หมายเลขอ้างอิง</p>
              <p class="font-mono font-bold text-lg">${selectedItem.ref}</p>
            </div>
          </div>
        `,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#3b82f6',
        showConfirmButton: true,
        allowOutsideClick: false,
        allowEscapeKey: false
      });

      fetchData();
    } catch (error) {
      console.error("Failed to approve RT", error);

      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: 'ไม่สามารถอนุมัติคำขอ RT ได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isClickable = (status: string) => status === "Pending";

  const tableData = statusFilter === "Duplicate" ? groupedDuplicates :
    statusFilter === "Pending" ? groupedPending.length > 0 ? groupedPending : filteredData :
      filteredData;
  const isDuplicateView = statusFilter === "Duplicate";
  const isPendingGroupView = statusFilter === "Pending" && groupedPending.length > 0;

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              {/* Icon */}
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-800 mb-3">ไม่มีสิทธิ์เข้าถึง</h1>

              {/* Description */}
              <p className="text-gray-600 mb-2 leading-relaxed">
                คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ในขณะนี้
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setError(null);
                    fetchData();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  ลองใหม่อีกครั้ง
                </button>

                <button
                  onClick={() => window.location.href = '/login'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transform hover:scale-105 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  เข้าสู่ระบบใหม่
                </button>
              </div>

              {/* Error Details */}
              {error && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">รายละเอียดข้อผิดพลาด:</span> {error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div>
      <Navbar />
      <div className="p-4 sm:p-6 max-w-8xl mx-auto">
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">รายการรออนุมัติการส่ง RT</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setError(null);
                fetchData();
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "กำลังโหลด..." : error ? "ลองใหม่" : "โหลดใหม่"}
            </button>
            {!error && (
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
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา รหัสอ้างอิง / พนักงาน / ร้าน / รหัสสินค้า / ชื่อสินค้า / ชั้น / SO / SH / จำนวน / หน่วย / ฝ่ายขาย / เส้นทาง / หมายเหตุ..."
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
                onClick={() => {setStatusFilter(s); setActive(true)}}
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
          <div className="text-center text-gray-800 py-10">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="font-semibold mb-2">ไม่สามารถโหลดข้อมูลได้</div>
                <button
                  onClick={() => {
                    setError(null);
                    fetchData();
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          </div>
        ) : tableData.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            {statusFilter === "Pending" && groupedPending.length === 0 ?
              "ไม่พบรายการรออนุมัติที่ซ้ำกัน" : "ไม่มีรายการ"
            }
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg bg-white">
            <table className="w-full border-collapse min-w-[1500px]">
              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <th className="py-4 px-3 text-left font-semibold text-sm">ลำดับ</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">อ้างอิง</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">พนักงาน</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">รหัสร้าน</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">ชื่อร้าน</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">รหัสสินค้า</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">ชื่อสินค้า</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">SH</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">จำนวน</th>
                  {isDuplicateView && (
                    <th className="py-4 px-3 text-left font-semibold text-sm">รายการซ้ำ</th>
                  )}
                  {isPendingGroupView && (
                    <th className="py-4 px-3 text-left font-semibold text-sm">รายการรออนุมัติ</th>
                  )}
                  <th className="py-4 px-3 text-left font-semibold text-sm">สถานะ</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">หมายเหตุ</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">หมายเหตุจาก QC</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">วันที่</th>
                  <th className="py-4 px-3 text-left font-semibold text-sm">เวลาที่ผ่านมา</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((item, index) => {
                  const { label } = statusDisplay(item.status);
                  const clickable = isClickable(item.status);
                  return (
                    <tr
                      key={item.ref}
                      onClick={() => (featureFlag && clickable && handleRowClick(item))}
                      className={`transition-all duration-200 border-b border-gray-100 ${!featureFlag || !clickable
                        ? "opacity-60 cursor-not-allowed bg-gray-50 font-semibold text-gray-700"
                        : `cursor-pointer hover:bg-blue-50 hover:shadow-sm ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`
                        }`}
                    >
                      <td className="py-4 px-3 text-sm font-medium text-gray-600">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-sm">
                        <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {item.ref.slice(-6)}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[120px]">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-800">{item.employee.code}</div>
                          <div className="text-xs text-gray-600 truncate" title={item.employee.name}>{item.employee.name}</div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[150px]">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.member.code);
                          }}
                          className="group cursor-pointer p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                          title="คลิกเพื่อคัดลอกรหัสร้าน"
                        >
                          <div className="font-semibold text-gray-800 group-hover:text-blue-600 flex items-center gap-2">
                            {item.member.code}
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          {item.member.sales && (
                            <div className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                              ฝ่ายขาย: {item.member.sales.code} {item.member.sales.name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[250px]">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.member.name.trim());
                          }}
                          className="group cursor-pointer p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                          title="คลิกเพื่อคัดลอกชื่อร้าน"
                        >
                          <div className="text-sm text-gray-800 group-hover:text-green-600 truncate flex items-center gap-2" title={item.member.name.trim()}>
                            <span className="flex-1">{item.member.name.trim()}</span>
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          {item.member.route && (
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-1">
                              {item.member.route.code} - {item.member.route.name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[150px]">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.product.code);
                          }}
                          className="group cursor-pointer p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                          title="คลิกเพื่อคัดลอกรหัสสินค้า"
                        >
                          <div className="font-semibold text-gray-800 group-hover:text-blue-600 flex items-center gap-2">
                            {item.product.code}
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                              ชั้น {item.product.floor}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[250px]">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.product.name);
                          }}
                          className="group cursor-pointer p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                          title="คลิกเพื่อคัดลอกชื่อสินค้า"
                        >
                          <div className="text-sm text-gray-800 group-hover:text-green-600 line-clamp-2 flex items-start gap-2">
                            <span className="flex-1">{item.product.name}</span>
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[150px]">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.sh_running);
                          }}
                          className="group cursor-pointer p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                          title="คลิกเพื่อคัดลอก SH"
                        >
                          <div className="font-semibold text-gray-800 group-hover:text-purple-600 flex items-center gap-2">
                            {item.sh_running}
                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                              เอกสาร SH
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-center">
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-gray-800">{item.amount_item.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{item.unit_item}</div>
                        </div>
                      </td>
                      {isDuplicateView && (
                        <td className="py-4 px-3 text-sm text-center">
                          <span className="inline-flex items-center bg-orange-100 text-orange-700 font-semibold px-3 py-1.5 rounded-full text-xs">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z" clipRule="evenodd" />
                            </svg>
                            {(item as GroupedItem)._count} รายการ
                          </span>
                        </td>
                      )}
                      {isPendingGroupView && (
                        <td className="py-4 px-3 text-sm text-center">
                          <span className="inline-flex items-center bg-yellow-100 text-yellow-700 font-semibold px-3 py-1.5 rounded-full text-xs">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {(item as GroupedItem)._count} รายการรออนุมัติ
                          </span>
                        </td>
                      )}
                      <td className="py-4 px-3 text-sm text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusStyles(item.status).bgClass} ${getStatusStyles(item.status).textClass} border ${getStatusStyles(item.status).borderClass}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusStyles(item.status).dotClass}`}></div>
                          {label}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[200px]">
                        {item.note ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.note || '');
                            }}
                            className="group cursor-pointer p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                            title="คลิกเพื่อคัดลอกหมายเหตุ"
                          >
                            <div className="text-sm text-gray-800 group-hover:text-blue-600 line-clamp-2 flex items-start gap-2">
                              <span className="flex-1">{item.note}</span>
                              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 italic text-xs py-2">
                            ไม่มีหมายเหตุ
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-sm max-w-[200px]">
                        {item.empQC_note ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.empQC_note || '');
                            }}
                            className="group cursor-pointer p-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                            title="คลิกเพื่อคัดลอกหมายเหตุจาก QC"
                          >
                            <div className="text-sm text-gray-800 group-hover:text-green-600 line-clamp-2 flex items-start gap-2">
                              <span className="flex-1">{item.empQC_note}</span>
                              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 italic text-xs py-2">
                            ไม่มีหมายเหตุจาก QC
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-sm text-center text-gray-600">
                        <div className="space-y-1">
                          <div className="font-medium">{new Date(item.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}</div>
                          <div className="text-xs">{new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${timeAgo(item.created_at).includes('เพิ่งสร้าง') || timeAgo(item.created_at).includes('นาทีที่แล้ว') ? 'bg-green-100 text-green-700' :
                            timeAgo(item.created_at).includes('ชั่วโมงที่แล้ว') ? 'bg-yellow-100 text-yellow-700' :
                              timeAgo(item.created_at).includes('วันที่แล้ว') ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                          }`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          {timeAgo(item.created_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelectedItem(null); }}>
        {selectedItem && (
          <div className="overflow-y-auto max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sticky top-0 bg-white z-20 pb-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">รายละเอียดการส่ง RT</h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusStyles(selectedItem.status).bgClass} ${getStatusStyles(selectedItem.status).textClass}`}>
                {statusDisplay(selectedItem.status).label}
              </span>
            </div>

            <div className="space-y-4">

              {/* Image + Info */}
              <div className="flex flex-col sm:flex-row gap-3">
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
                      className="h-32 w-32 object-contain rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm"
                    />
                  ) : (
                    <div className="h-32 w-32 flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs">
                      ไม่มีรูปภาพ
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {[
                    { label: "รหัสสินค้า", value: selectedItem.product.code },
                    { label: "ชื่อสินค้า", value: selectedItem.product.name, clamp: true },
                    { label: "ชั้นวาง", value: selectedItem.product.floor || "-" },
                    { label: "จำนวน / หน่วย", value: `${selectedItem.amount_item} ${selectedItem.unit_item}` },
                    { label: "SH", value: selectedItem.sh_running },
                  ].map(({ label, value, clamp }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                      <span className={`font-medium text-gray-800 ${clamp ? "line-clamp-2" : ""}`} title={clamp ? String(value) : undefined}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purchase Information */}
              <div className="border-t border-gray-100" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ข้อมูลการซื้อขาย
                  </h3>
                  <div>

                    <button
                      onClick={() => fetchPurchestData(selectedItem.product.code)}
                      disabled={purchestLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className={`w-3 h-3 ${purchestLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {purchestLoading ? 'กำลังโหลด...' : 'โหลดข้อมูลล่าสุด'}
                    </button>
                    <p>
                      <span className="text-xs text-gray-500">{(new Date(selectedItem.product.purchest?.update_at || "-")).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                    </p>
                  </div>
                </div>

                {selectedItem.product.purchest ? (
                  <div className="space-y-4">
                    {/* ข้อมูลสต็อกปัจจุบัน */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">📦 สต็อกปัจจุบัน</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">สต็อก:</span>
                          <span className="ml-2 font-medium">{selectedItem.product.purchest.product.product_stock} {selectedItem.product.purchest.pro_Unit1}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">อัปเดต:</span>
                          <span className="ml-2 font-medium">
                            {new Date(selectedItem.product.purchest.product.last_stock_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ข้อมูลเอกสาร */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 ข้อมูลเอกสาร</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

                        {/* PUR */}
                        {selectedItem.product.purchest.pur && (
                          <div className="border border-green-200 rounded-lg p-3">
                            <div className="font-medium text-green-700 mb-2">การซื้อ (PUR)</div>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div>วันที่: {new Date(selectedItem.product.purchest.pur.pur_date).toLocaleDateString('th-TH')}</div>
                              <div>เลขที่: {selectedItem.product.purchest.pur.pur_invoice}</div>
                              <div>จำนวน: {selectedItem.product.purchest.pur.pur_amount} {selectedItem.product.purchest.pur.pur_unit}</div>
                            </div>
                          </div>
                        )}

                        {/* BI */}
                        {selectedItem.product.purchest.bi && (
                          <div className="border border-purple-200 rounded-lg p-3">
                            <div className="font-medium text-purple-700 mb-2">ใบวิ่ง (BI)</div>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div>วันที่: {new Date(selectedItem.product.purchest.bi.bi_date).toLocaleDateString('th-TH')}</div>
                              <div>เลขที่: {selectedItem.product.purchest.bi.bi_invoice}</div>
                              <div>จำนวน: {selectedItem.product.purchest.bi.bi_amount} {selectedItem.product.purchest.bi.bi_unit}</div>
                            </div>
                          </div>
                        )}

                        {/* PO */}
                        {selectedItem.product.purchest.po && (
                          <div className="border border-orange-200 rounded-lg p-3">
                            <div className="font-medium text-orange-700 mb-2">ใบสั่งซื้อ (PO)</div>
                            <div className="space-y-1 text-xs text-gray-600">
                              {selectedItem.product.purchest.po.po_date && (
                                <div>วันที่: {new Date(selectedItem.product.purchest.po.po_date).toLocaleDateString('th-TH')}</div>
                              )}
                              <div>เลขที่: {selectedItem.product.purchest.po.po_invoice}</div>
                              <div>จำนวน: {selectedItem.product.purchest.po.po_amount || '-'} {selectedItem.product.purchest.po.po_unit}</div>
                            </div>
                          </div>
                        )}

                        {/* PR */}
                        {selectedItem.product.purchest.pr && selectedItem.product.purchest.pr.pr_date && (
                          <div className="border border-yellow-200 rounded-lg p-3">
                            <div className="font-medium text-yellow-700 mb-2">ใบขอซื้อ (PR)</div>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div>วันที่: {new Date(selectedItem.product.purchest.pr.pr_date!).toLocaleDateString('th-TH')}</div>
                              <div>เลขที่: {selectedItem.product.purchest.pr.pr_invoice || '-'}</div>
                              <div>จำนวน: {selectedItem.product.purchest.pr.pr_amount || '-'} {selectedItem.product.purchest.pr.pr_unit || '-'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ประวัติการเคลื่อนไหว */}
                    {selectedItem.product.purchest.purchestHistory && selectedItem.product.purchest.purchestHistory.length > 0 && (() => {
                      // จัดกลุ่มข้อมูลตามวันที่
                      const groupedHistory = selectedItem.product.purchest.purchestHistory.reduce((acc, history) => {
                        const date = new Date(history.date).toLocaleDateString('th-TH');
                        if (!acc[date]) {
                          acc[date] = { SAL: 0, RET: 0, PUR: 0, unit: history.unit };
                        }
                        acc[date][history.type === 'SAL' ? 'SAL' : history.type === 'RET' ? 'RET' : 'PUR'] += history.amount;
                        return acc;
                      }, {} as Record<string, { SAL: number; RET: number; PUR: number; unit: string }>);

                      const sortedDates = Object.keys(groupedHistory).sort((a, b) =>
                        new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime()
                      );

                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 ประวัติล่าสุด (รวมตามวันที่)</h4>
                          <div className="max-h-48 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 z-10">
                                <tr className="border-b border-gray-200 bg-gray-50">
                                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-600">วันที่</th>
                                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-600">ขาย</th>
                                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-600">คืน</th>
                                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-600">ซื้อ</th>
                                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-600">สุทธิ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  // สร้าง array ของวันที่เรียงจากเก่าไปใหม่สำหรับการคำนวณ running total
                                  const datesSortedOldest = Object.keys(groupedHistory).sort((a, b) =>
                                    new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime()
                                  );

                                  // คำนวณ running total สำหรับแต่ละวัน
                                  const runningTotals: Record<string, number> = {};
                                  let accumulator = 0;

                                  datesSortedOldest.forEach(date => {
                                    const data = groupedHistory[date];
                                    const dailyNet = data.PUR + data.RET + data.SAL; // สุทธิของวันนั้น
                                    accumulator += dailyNet;
                                    runningTotals[date] = accumulator;
                                  });

                                  // แสดงผลตามลำดับวันใหม่ไปเก่า (เหมือนเดิม)
                                  return sortedDates.map((date, index) => {
                                    const data = groupedHistory[date];
                                    const dailyNet = data.PUR + data.RET + data.SAL; // สุทธิของวันนั้น
                                    const runningTotal = runningTotals[date]; // สะสมจากวันแรกถึงวันนั้น

                                    return (
                                      <tr key={date} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                        <td className="py-2 px-3 text-gray-700 font-medium">{date}</td>
                                        <td className="py-2 px-3 text-right">
                                          {data.SAL !== 0 && (
                                            <span className="text-red-600 font-medium">
                                              -{Math.abs(data.SAL).toLocaleString()}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          {data.RET !== 0 && (
                                            <span className="text-blue-600 font-medium">
                                              +{data.RET.toLocaleString()}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          {data.PUR !== 0 && (
                                            <span className="text-green-600 font-medium">
                                              +{data.PUR.toLocaleString()}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs font-medium ${dailyNet >= 0 ? 'text-green-600' : 'text-red-600'}`} title="สุทธิของวันนี้">
                                              {dailyNet > 0 ? '+' : ''}{dailyNet.toLocaleString()} {data.unit}
                                            </span>
                                            <span className={`font-semibold ${runningTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} title="สะสมจากวันเก่าถึงวันนี้">
                                              รวม: {runningTotal > 0 ? '+' : ''}{runningTotal.toLocaleString()} {data.unit}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : selectedItem.product.purchase_entry && selectedItem.product.purchase_entry.length > 0 ? (
                  // Fallback to old purchase_entry format
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedItem.product.purchase_entry.map((entry, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">เลขที่ใบสั่งซื้อ:</span>
                            <span className="font-medium text-gray-800">{entry.purchase_entry_no}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">วันที่สั่งซื้อ:</span>
                            <span className="font-medium text-gray-800">
                              {new Date(entry.purchase_entry_date).toLocaleDateString('th-TH', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">จำนวน SO:</span>
                            <span className="font-medium text-blue-600">{parseFloat(entry.SO_amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">จำนวน PR:</span>
                            <span className="font-medium text-green-600">{parseFloat(entry.PR_amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">จำนวน PO:</span>
                            <span className="font-medium text-purple-600">{parseFloat(entry.PO_amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">จำนวน RT:</span>
                            <span className="font-medium text-red-600">{parseFloat(entry.RT_amount).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-gray-500 text-sm">ไม่มีข้อมูลการซื้อขาย</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Employee & Member */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">พนักงาน</p>
                  <p className="font-semibold text-gray-800 text-sm">{selectedItem.employee.code}</p>
                  <p className="text-gray-600 text-sm">{selectedItem.employee.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ร้านค้า</p>
                  <p className="font-semibold text-gray-800 text-sm">{selectedItem.member.code}</p>
                  <p className="text-gray-600 text-sm">{selectedItem.member.name}</p>
                </div>
              </div>

            {/* Note */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                หมายเหตุ <span className="text-red-500">*</span>
              </label>

              <div className="space-y-3">
                {NOTE_OPTIONS.map((option, index) => {
                  const isSelected = selectedReason === option;

                  return (
                    <label
                      key={index}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer
                        transition-all duration-200 select-none
                        ${isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                          }
                      `}
                      >
                        <input
                          type="radio"
                          name="note-reason"
                          value={option}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedReason(option);
                            if (option !== "อื่นๆ") {
                              setNote(option);
                              setCustomReason("");
                            } else {
                              setNote("");
                            }
                          }}
                          className="hidden"
                        />

                        <div
                          className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center
                          ${isSelected ? "border-blue-500" : "border-gray-400"}
                        `}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          )}
                        </div>

                        <span
                          className={`
                          text-sm font-medium
                          ${isSelected ? "text-blue-700" : "text-gray-700"}
                        `}
                        >
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedReason === "อื่นๆ" && (
                  <div className="mt-4">
                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      rows={3}
                      value={customReason}
                      onChange={(e) => {
                        setCustomReason(e.target.value);
                        setNote(e.target.value);
                      }}
                      placeholder="กรุณาระบุหมายเหตุเพิ่มเติม..."
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons - Sticky at bottom */}
              <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200 flex justify-end gap-3 z-20">
                <button
                  onClick={handleReject}
                  disabled={!featureFlag || rejecting}
                  className="bg-red-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {rejecting ? "กำลังปฏิเสธ..." : !featureFlag ? "ไม่สามารถปฏิเสธได้" : "ปฏิเสธคำขอ"}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!featureFlag || submitting}
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "กำลังบันทึก..." : !featureFlag ? "ไม่สามารถอนุมัติได้" : "ยืนยันอนุมัติ"}
                </button>
              </div>

            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
