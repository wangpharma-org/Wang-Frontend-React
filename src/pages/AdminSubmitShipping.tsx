/// <reference types="vite/client" />
import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_URL_LOGISTIC ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecieverType = "เภสัชกร" | "เจ้าของ" | "ฝากส่ง" | "ลูกค้ายกเลิก";

const RECIEVER_TYPES: RecieverType[] = ["เภสัชกร", "เจ้าของ", "ฝากส่ง", "ลูกค้ายกเลิก"];

interface FileState {
  file_store_img: File | null;
  file_product_img: File | null;
  file_sign_img: File | null;
  file_slip_img: File | null;
  file_employee_sign: File | null;
  file_cancel_img: File | null;
}

const EMPTY_FILES: FileState = {
  file_store_img: null,
  file_product_img: null,
  file_sign_img: null,
  file_slip_img: null,
  file_employee_sign: null,
  file_cancel_img: null,
};

const FILE_FIELDS: { key: keyof FileState; label: string }[] = [
  { key: "file_store_img", label: "รูปหน้าร้าน" },
  { key: "file_product_img", label: "รูปสินค้า" },
  { key: "file_sign_img", label: "รูปลายเซ็นลูกค้า" },
  { key: "file_slip_img", label: "รูปสลิป (เฉพาะฝากส่ง)" },
  { key: "file_employee_sign", label: "รูปลายเซ็นพนักงาน" },
  { key: "file_cancel_img", label: "รูปหลักฐานยกเลิก (บังคับเมื่อลูกค้ายกเลิก)" },
];

const authHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
});

// ─── Component ────────────────────────────────────────────────────────────────

const AdminSubmitShipping = () => {
  const userAuth = sessionStorage.getItem("user_info");
  const role = userAuth ? JSON.parse(userAuth).user_role : null;
  const isManager = role?.toUpperCase() === "MANAGER" || role?.toUpperCase() === "ADMIN";

  const [shippingId, setShippingId] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [recieverType, setRecieverType] = useState<RecieverType>("เภสัชกร");
  const [note, setNote] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [forwardingFee, setForwardingFee] = useState("");
  const [forwardingEta, setForwardingEta] = useState("");
  const [files, setFiles] = useState<FileState>(EMPTY_FILES);
  const [submitting, setSubmitting] = useState(false);

  if (!isManager) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <div className="text-2xl font-semibold">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>
        </div>
      </div>
    );
  }

  const handleFileChange = (key: keyof FileState, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({ icon: "error", title: "เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => {
        Swal.fire({ icon: "error", title: "ดึงตำแหน่งปัจจุบันไม่สำเร็จ" });
      }
    );
  };

  const resetForm = () => {
    setShippingId("");
    setEmpCode("");
    setRecieverType("เภสัชกร");
    setNote("");
    setLat("");
    setLng("");
    setForwardingFee("");
    setForwardingEta("");
    setFiles(EMPTY_FILES);
  };

  const handleSubmit = async () => {
    if (!shippingId.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุ shipping_id" });
      return;
    }
    if (!empCode.trim()) {
      Swal.fire({ icon: "warning", title: "กรุณาระบุรหัสคนขับ (emp_code)" });
      return;
    }
    if (recieverType === "ลูกค้ายกเลิก" && !files.file_cancel_img) {
      Swal.fire({ icon: "warning", title: "กรณีลูกค้ายกเลิก ต้องแนบรูปหลักฐานยกเลิก" });
      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "ยืนยันส่งสำเร็จแทนคนขับ?",
      html: `shipping_id: <b>${shippingId}</b><br/>รหัสคนขับ: <b>${empCode}</b><br/>ประเภทผู้รับ: <b>${recieverType}</b>`,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("shipping_id", shippingId.trim());
      formData.append("emp_code", empCode.trim());
      formData.append("reciever_type", recieverType);
      if (note.trim()) formData.append("note", note.trim());
      if (lat.trim()) formData.append("lat", lat.trim());
      if (lng.trim()) formData.append("lng", lng.trim());
      if (recieverType === "ฝากส่ง") {
        if (forwardingFee.trim()) formData.append("forwarding_fee", forwardingFee.trim());
        if (forwardingEta.trim()) formData.append("forwarding_estimated_arrival", forwardingEta.trim());
      }
      FILE_FIELDS.forEach(({ key }) => {
        if (files[key]) formData.append(key, files[key] as File);
      });

      const res = await axios.post(`${API}/api/logistic/shipping/admin/submit-shipping`, formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });

      await Swal.fire({
        icon: "success",
        title: "ยืนยันส่งสำเร็จแทนคนขับเรียบร้อย",
        text: `shipping_finish_id: ${res.data?.shipping_finish_id ?? "-"}`,
      });
      resetForm();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : "เกิดข้อผิดพลาดที่ไม่คาดคิด";
      Swal.fire({
        icon: "error",
        title: "ยืนยันไม่สำเร็จ",
        text: Array.isArray(message) ? message.join(", ") : String(message),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">ยืนยันส่งสำเร็จแทนคนขับ</h1>
      <p className="text-sm text-gray-500 mb-6">
        ใช้เฉพาะกรณีคนขับกดยืนยันในแอปไม่ได้เพราะระบบขัดข้อง — รูปหลักฐานเป็นทางเลือก
        ไม่บังคับเหมือนที่คนขับกดเอง
      </p>

      <div className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              shipping_id <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={shippingId}
              onChange={(e) => setShippingId(e.target.value)}
              placeholder="เช่น 101 หรือ 101,102,103"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">หลายรายการคั่นด้วย , (ร้านเดียวกันหลายบิล)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              รหัสคนขับ (emp_code) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              placeholder="เช่น 0745"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ประเภทผู้รับ</label>
          <select
            value={recieverType}
            onChange={(e) => setRecieverType(e.target.value as RecieverType)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {RECIEVER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {recieverType === "ฝากส่ง" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ค่าฝากส่ง (บาท)</label>
              <input
                type="number"
                value={forwardingFee}
                onChange={(e) => setForwardingFee(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">กำหนดถึงโดยประมาณ</label>
              <input
                type="date"
                value={forwardingEta}
                onChange={(e) => setForwardingEta(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">หมายเหตุ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="เช่น ตอนส่งจริงระบบเกิดขัดข้อง เลยต้องยืนยันส่งทีหลังผ่านแอดมิน"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">พิกัด GPS (ไม่บังคับ)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="latitude"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="longitude"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="whitespace-nowrap px-3 py-2 text-sm rounded-lg border bg-gray-50 hover:bg-gray-100"
            >
              ใช้ตำแหน่งปัจจุบัน
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">รูปหลักฐาน (ไม่บังคับ)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FILE_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(key, e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "ยืนยันส่งสำเร็จแทนคนขับ"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSubmitShipping;
