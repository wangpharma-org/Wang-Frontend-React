import { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";

const UploadStock = () => {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [isUploading, setUploading] = useState(false);
    const [logText, setLogText] = useState("");

    const cleanAmount = (value: string): number | null => {
        if (value == null) return null;

        const str = String(value).trim();

        if (/^\d+\+\d+$/.test(str)) {
            const [a, b] = str.split("+").map(Number);
            return a + b;
        }

        const match = str.match(/\d+/g);
        if (match) {
            return Number(match.join(""));
        }

        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        } else {
            setFile(null);
        }
    };

    const appendLog = (text: string) => {
        setLogText((prev) => prev + text + "\n");
    };

    const handleUpload = async () => {
        if (!file) return alert("กรุณาเลือกไฟล์ก่อน");

        setUploading(true);
        setProgress(0);
        setLogText("");

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer);
            const sheetName = workbook.SheetNames[0];

            const sheetRaw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

            const sheet = sheetRaw.map((row: any) => ({
                product_code: row["รหัสสินค้า"],
                amount: row["จำนวนคงเหลือ"],
            }));

            const total = sheet.length;
            appendLog(`จำนวนรายการทั้งหมด: ${total}`);

            const batchSize = 200;
            let completed = 0;

            for (let i = 0; i < sheet.length; i += batchSize) {
                const batch = sheet.slice(i, i + batchSize).map((row) => {
                    const amount = cleanAmount(row.amount);

                    if (!row.product_code || row.product_code === "") {
                        appendLog(`❌ ข้ามรายการ (ไม่มีรหัสสินค้า) amount=${row.amount}`);
                        return null;
                    }

                    if (amount === null) {
                        appendLog(`❌ ข้าม ${row.product_code} (จำนวนคงเหลือไม่ใช่ตัวเลข: ${row.amount})`);
                        return null;
                    }

                    return {
                        product_code: row.product_code.trim(),
                        amount,
                    };
                }).filter(Boolean);

                if (batch.length === 0) {
                    appendLog(`⚠ Batch ${i / batchSize + 1} ไม่มีข้อมูลที่ใช้ได้`);
                    continue;
                }

                try {
                    await axios.post(
                        `${import.meta.env.VITE_API_URL_ORDER}/api/product/update-amount`,
                        batch,
                        {
                            headers: {
                                Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
                            },
                        }
                    );

                    appendLog(`✅ Batch ${i / batchSize + 1} อัปเดตสำเร็จ (${batch.length} รายการ)`);

                } catch {
                    appendLog(`❌ Batch ${i / batchSize + 1} ล้มเหลว`);
                }

                completed += batch.length;
                setProgress(Math.round((completed / total) * 100));
            }

            appendLog("🎉 อัปโหลดเสร็จสมบูรณ์!");

        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
        }

        setUploading(false);
    };

    return (
        <div className="max-w-lg mx-auto bg-white shadow-lg rounded-xl p-8 border border-gray-200 mt-50">
            <h2 className="text-2xl font-bold text-black mb-6 text-center">
                อัปโหลดไฟล์สต็อกสินค้า (Excel)
            </h2>

            <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกไฟล์ Excel (.xls / .xlsx)
            </label>

            <input
                type="file"
                accept=".xls, .xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 
                file:rounded-md file:border-0 file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white hover:file:bg-blue-700
                border border-gray-300 rounded-lg shadow-sm focus:ring-2
                focus:ring-blue-500 focus:border-blue-500 transition"
                />

            <button
                onClick={handleUpload}
                disabled={isUploading}
                className={`mt-6 w-full py-3 rounded-lg text-white font-semibold text-center 
                    shadow-md transition duration-200
                    ${isUploading
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 cursor-pointer"}`}
            >
                {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}
            </button>

            {isUploading && (
                <div className="mt-6">
                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm mt-2 text-blue-700 font-medium text-center">
                        {progress}% เสร็จสมบูรณ์
                    </p>
                </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mt-8 mb-2">
                รายการดำเนินการ
            </label>

            <textarea
                value={logText}
                readOnly
                className="w-full h-48 p-4 border border-gray-300 rounded-lg bg-gray-50 
                text-gray-800 text-sm shadow-inner resize-none focus:ring-1 
                focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
        </div>

    );
};

export default UploadStock;
