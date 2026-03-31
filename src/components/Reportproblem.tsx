import { useState } from "react";
import axios from "axios";
import Icon from "../assets/LOGOmini.png"
import Modal from "./ModalQC";
import Swal from "sweetalert2";

interface Bill {
    running: string;
    count_list: number;
    count_rt: number;
    status: string;
}

interface OrderGroup {
    date: string;
    emp_prepare: string;
    emp_qc: string;
    emp_packed: string;
    shipping: number;
    sh_running: Bill[];
}

interface ApiResponse {
    mem_code: string;
    orders: OrderGroup[];
}

const Reportproblem = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memCode, setMemCode] = useState("");
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedBills, setSelectedBills] = useState<string[]>([]);
    const [selectedGroupIdx, setSelectedGroupIdx] = useState<number | null>(null);
    const [searchBill, setSearchBill] = useState("");
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const token = sessionStorage.getItem("access_token");

    const handleSearch = async () => {
        if (!memCode) return;
        setLoading(true);
        setError("");
        setData(null);
        setSelectedBills([]);
        setSelectedGroupIdx(null);
        setSearchBill("");

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL_ORDER}/api/findOrderFromMemCode`, {
                mem_code: memCode
            });
            setData(response.data);
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการค้นหาข้อมูล กรุณาตรวจสอบรหัสลูกค้าอีกครั้ง");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSubmit = async () => {
        if (!data || selectedGroupIdx === null) return;
        setIsSubmitting(true);

        const selectedGroup = data.orders[selectedGroupIdx];

        const payload = {
            amount: { sum: selectedGroup.shipping },
            sh_running: selectedBills,
            emp_qc: selectedGroup.emp_qc,
            emp_packed: selectedGroup.emp_packed,
            emp_prepare: selectedGroup.emp_prepare,
            mem_code: data.mem_code
        };

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL_ORDER}/api/sendHeaderBillToOldSystem`, payload, { headers: { Authorization: `Bearer ${token}` } });
            const { status, message, invoice } = response.data;

            Swal.fire({
                icon: status ? 'success' : 'info',
                title: message || 'แจ้งเตือน',
                html: invoice && invoice.length > 0 ? invoice.join('<br/>') : '',
            });

            setIsConfirmModalOpen(false);
            setSelectedBills([]);
            setSelectedGroupIdx(null);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถส่งข้อมูลเข้าระบบเก่าได้',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleBillSelection = (running: string, groupIdx: number) => {
        const isSelected = selectedBills.includes(running);
        let nextSelected;

        if (isSelected) {
            nextSelected = selectedBills.filter(b => b !== running);
        } else {
            nextSelected = [...selectedBills, running];
        }

        setSelectedBills(nextSelected);
        if (nextSelected.length === 0) {
            setSelectedGroupIdx(null);
        } else {
            setSelectedGroupIdx(groupIdx);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setMemCode("");
        setData(null);
        setError("");
        setSelectedBills([]);
        setSelectedGroupIdx(null);
        setSearchBill("");
    };

    const formatTime = (dateString: string) => {
    const Time = new Date(dateString).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return Time;
  };

    return (
        <>
            <div className="fixed bottom-4 right-4 z-50">
                <img
                    src={Icon}
                    alt="Report Problem"
                    className="w-18 h-18 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setIsModalOpen(true)}
                />
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="ค้นหาและจัดการบิลลูกค้า">
                <div className="p-4">
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            className="border border-gray-300 rounded-lg p-2 flex-1 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="กรอกรหัสลูกค้า (เช่น 00262)"
                            value={memCode}
                            onChange={(e) => setMemCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium cursor-pointer disabled:opacity-50"
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            {loading ? "กำลังค้นหา..." : "ค้นหา"}
                        </button>
                    </div>

                    {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}

                    {data && (
                        <div className="mt-4">
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 text-sm flex flex-wrap gap-x-6 gap-y-2">
                                <p><span className="font-bold text-gray-700">รหัสลูกค้า:</span> <span className="text-blue-700 font-medium">{data.mem_code}</span></p>
                            </div>

                            <div className="mb-4">
                                <input
                                    type="text"
                                    className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="🔍 ค้นหาเลขที่บิล..."
                                    value={searchBill}
                                    onChange={(e) => setSearchBill(e.target.value)}
                                />
                            </div>

                            <div className="max-h-[50vh] overflow-y-auto pr-2">
                                {data.orders.map((orderGroup, idx) => {
                                    if (searchBill && !orderGroup.sh_running.some(bill => bill.running.toLowerCase().includes(searchBill.toLowerCase()))) {
                                        return (
                                            <div key={idx} className="mb-4 p-4 text-center text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                                                ไม่มีข้อมูลที่ตรงกับคำค้น "{searchBill}" ในกลุ่มวันที่ {formatTime(orderGroup.date)}
                                            </div>
                                        );
                                    }

                                    const isDisabledGroup = selectedGroupIdx !== null && selectedGroupIdx !== idx;
                                    return (
                                        <div key={idx} className={`mb-4 border rounded-lg overflow-hidden shadow-sm transition-opacity ${isDisabledGroup ? 'border-gray-200 opacity-50 bg-gray-50' : 'border-gray-200'}`}>
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-col gap-1">
                                                <div className="font-bold text-gray-700">วันที่: {formatTime(orderGroup.date)}</div>
                                                <div className="text-xs text-gray-600 flex gap-4">
                                                    <span>เตรียม: <span className="font-medium">{orderGroup.emp_prepare}</span></span>
                                                    <span>QC: <span className="font-medium">{orderGroup.emp_qc}</span></span>
                                                    <span>แพ็ค: <span className="font-medium">{orderGroup.emp_packed}</span></span>
                                                    <span>จำนวนลัง: <span className="font-medium">{orderGroup.shipping}</span></span>
                                                </div>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {orderGroup.sh_running.map((bill, bIdx) => {
                                                    const isRT = bill.status === 'RT';
                                                    const isDisabled = isDisabledGroup || isRT;

                                                    return (
                                                        <label
                                                            key={bIdx}
                                                            className={`flex items-center gap-4 p-3 rounded-md transition-colors border border-transparent ${isDisabled ? 'cursor-not-allowed opacity-60 bg-gray-50' : 'hover:bg-blue-50 cursor-pointer hover:border-blue-200'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className={`w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                                checked={selectedBills.includes(bill.running)}
                                                                onChange={() => toggleBillSelection(bill.running, idx)}
                                                                disabled={isDisabled}
                                                            />
                                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm items-center">
                                                                <div className="font-bold text-gray-800 text-base">{bill.running}</div>
                                                                <div className="text-gray-600">รายการ: <span className="font-medium text-gray-900">{bill.count_list}</span></div>
                                                                <div className="text-gray-600">RT: <span className="font-medium text-gray-900">{bill.count_rt}</span></div>
                                                                <div className="flex justify-start sm:justify-end">
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${bill.status === 'Qc-checked'
                                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                                        : bill.status === 'RT'
                                                                            ? 'bg-red-100 text-red-700 border border-red-200'
                                                                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                                        }`}>
                                                                        {bill.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedBills.length > 0 && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <p className="font-bold text-green-800">เลือกแล้ว {selectedBills.length} บิล:</p>
                                        <p className="text-sm text-green-700 mt-1 break-words">{selectedBills.join(', ')}</p>
                                    </div>
                                    <button
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
                                        onClick={() => {
                                            setIsConfirmModalOpen(true);
                                        }}
                                    >
                                        ดำเนินการต่อ
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="ยืนยันการส่งข้อมูล">
                {data && selectedGroupIdx !== null && (
                    <div className="p-4">
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6 space-y-2 text-base text-gray-800">
                            <p><span className="font-bold text-gray-600">รหัสลูกค้า:</span> {data.mem_code}</p>
                            <p><span className="font-bold text-gray-600">พนักงานเตรียม:</span> {data.orders[selectedGroupIdx].emp_prepare}</p>
                            <p><span className="font-bold text-gray-600">พนักงาน QC:</span> {data.orders[selectedGroupIdx].emp_qc}</p>
                            <p><span className="font-bold text-gray-600">พนักงานแพ็ค:</span> {data.orders[selectedGroupIdx].emp_packed}</p>
                            <p><span className="font-bold text-gray-600">จำนวนลัง:</span> {data.orders[selectedGroupIdx].shipping}</p>
                            <p><span className="font-bold text-gray-600">บิลที่เลือก ({selectedBills.length}):</span> <span className="text-blue-600 font-medium">{selectedBills.join(', ')}</span></p>
                        </div>
                        <div className="flex gap-4 justify-end mt-6">
                            <button
                                className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors font-medium cursor-pointer disabled:opacity-50"
                                onClick={() => setIsConfirmModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                ยกเลิก
                            </button>
                            <button
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium cursor-pointer flex items-center disabled:opacity-50"
                                onClick={handleConfirmSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "กำลังส่งข้อมูล..." : "ยืนยันการส่งข้อมูล"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    )
}

export default Reportproblem