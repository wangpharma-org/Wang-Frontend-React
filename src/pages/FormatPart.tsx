import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
// import styles from "../printcss/Vat.css";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

const maxRows = 15;

const bahtText = (amount: number): string => {
  const thaiNum = [
    "ศูนย์",
    "หนึ่ง",
    "สอง",
    "สาม",
    "สี่",
    "ห้า",
    "หก",
    "เจ็ด",
    "แปด",
    "เก้า",
  ];
  const unitPos = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function convertNumber(num: number): string {
    if (num === 0) return "ศูนย์";

    let result = "";
    let position = 0;
    let isMillion = false;

    while (num > 0) {
      const n = num % 10;

      let word = "";
      if (position === 0 && n === 1 && num > 9) {
        word = "เอ็ด";
      } else if (position === 1 && n === 2) {
        word = "ยี่";
      } else if (position === 1 && n === 1) {
        word = "";
      } else if (n !== 0) {
        word = thaiNum[n];
      }

      const unit = n !== 0 ? unitPos[position] : "";

      result = word + unit + result;

      num = Math.floor(num / 10);
      position++;

      if (position === 6 && num > 0) {
        result = "ล้าน" + result;
        position = 0;
        isMillion = true;
      }
    }

    return result;
  }

  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);

  const bahtPart = baht > 0 ? convertNumber(baht) + "บาท" : "";
  const satangPart = satang === 0 ? "ถ้วน" : convertNumber(satang) + "สตางค์";

  return bahtPart + satangPart;
}


const FormatPart = () => {
  const [invoices, setInvoices] = useState<any>(null);
  const [pages, setPages] = useState(0);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sh_running = queryParams.get("sh_running");
  const token = sessionStorage.getItem("access_token");

  useEffect(() => {
    if (!invoices) return;
    const printTimeout = setTimeout(() => {
      window.print();
    }, 1000); 
    window.onafterprint = () => {
      localStorage.setItem('print_status', 'done')
      window.close();
    };
    return () => {
      clearTimeout(printTimeout);
      window.onafterprint = null;
    };
  }, [invoices]);

  useEffect(() => {
    let retryCount = 0;
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${
            import.meta.env.VITE_API_URL_INVOICE
          }/api/invoice/print/${sh_running}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setInvoices(response.data);
        const invoiceData = response.data;
        console.log(invoiceData);
        setPages(Math.ceil(invoiceData.shopping_order?.length / maxRows))
        console.log(Math.ceil(invoiceData.shopping_order?.length / maxRows))
      } catch (error) {
        if (retryCount < 3) {
          retryCount++;
          setTimeout(fetchData, 1000);
        }
      }
    };
    fetchData();
  }, [sh_running]);

  const formatNumber = (num: number) => {
    return num?.toLocaleString("en-US", { minimumFractionDigits: 2 })
  };

  if (!invoices) return <div>Loading...</div>
  return (
    <div className="min-h-screen bg-white">
      <style>
        {`
          .quotation-container {
                font-family: 'Fahkwang', sans-serif;
                max-width: 800px;
                margin: 0 auto;
                background: white;
                color: #000
            }
            
            @media print {
                .page-break {
                page-break-before: always;
                }
            }
            
            .header,
            .title,
            .invoice-info,
            .totals,
            .footer {
                margin-bottom: 5px;
            }
            
            .title h1 {
                margin: 0;
                font-size: 28px;
                text-align: center;
            }
            
            .title h3 {
                margin: 0;
                font-size: 18px;
                text-align: center;
                font-weight: normal;
            }
            
            .product-table {
            
                border-collapse: collapse;
            }
            
            .product-table th,
            .product-table td {
                border: 1px solid #000;
                padding: 3px;
                font-size: 14px;
            }
            
            .product-table th {
                background-color: #f0f0f0;
            }
            
            .totals p {
                text-align: right;
                font-size: 14px;
                margin: 0;
            }
            
            .signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }
            
            .signatures div {
                width: 30%;
                text-align: center;
                font-size: 14px;
            }
            
            .parent {
                display: grid;
                grid-template-columns: repeat(12, 0.5fr);
                grid-template-rows: auto;
                gap: 8px;
                font-size: small;
            }
            
            .invoice-info {
                grid-column: span 8 / span 8;
                grid-row: span 2 / span 2;
                border: #000 solid 1px;
                padding: 4px;
            }
            
            .invoice-info2 {
                grid-column: span 4 / span 4;
                grid-row: span x;
                grid-column-start: 9;
                border: #000 solid 1px;
                padding: 8px;
            }
            
            .footer {
                display: grid;
                grid-template-columns: repeat(12, 1fr);
                grid-template-rows: auto auto auto auto auto;
                gap: 8px;
                border: #000;
                padding-top: 4px;
            }
            
            .TotalText {
                grid-column: span 8 / span 8;
                grid-row: 1;
            }
            
            .TotalNumTax {
                grid-column: span 4 / span 4;
                grid-row: span x;
                grid-column-start: 9;
            }
            
            .TotalNum {
                grid-column: span 4 / span 4;
                grid-row:span x;
                grid-column-start: 9;
                grid-row-start: auto;
            }
            
            .CountPage {
                grid-column: span 4 / span 4;
                grid-column-start: 9;
                grid-row-start: 4;
            }
            
            .AccDep {
                grid-column: span 2 / span 2;
                grid-column-start: 6;
                grid-row-start: 5;
            }
            
            .CheckItems {
                grid-column: span 3 / span 3;
                grid-column-start: 8;
                grid-row-start: 5;
            }
            
            .Courier {
                grid-column: span 2 / span 2;
                grid-column-start: 11;
                grid-row-start: 5;
            }
            
            .Note {
                grid-column: span 5 / span 5;
                grid-row: span 2 / span 2;
                grid-column-start: 1;
                grid-row-start: 2;
            }
            
            .Contact {
                grid-column: span 5 / span 5;
                grid-row: span 2 / span 2;
                grid-column-start: 1;
                grid-row-start: 4;
            }
            
            .Payment {
                grid-column: 7 / span 2;
                grid-row: 2;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                font-family: 'Fahkwang';
                font-size: 12px;
            }
            
            th {
            
                /* บน-ล่าง 6px | ซ้าย-ขวา 10px */
                border: 1px solid #000;
                padding: 2px 5px;
                vertical-align: top;
            }
            
            
            
            tbody td {
                border-right: 1px solid #000;
                border-left: 1px solid #000;
                padding: 2px 5px;
                vertical-align: top;
            }
            
            th {
                background-color: #f2f2f2;
                font-weight: bold;
            }
            
            .text-right {
                text-align: right;
            }
            
            .product-name {
                display: -webkit-box;
                -webkit-line-clamp: 1;
                /* จำกัดแค่ 1 บรรทัด */
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: normal;
                font-weight: bold;
                line-height: 1em;
                max-height: 1em;
            }
            
            .lot-exp {
                font-size: 0.85em;
                color: #666;
                min-height: 1.2em;
                /* ล็อกความสูงให้พอดีบรรทัด */
            }
        `}
      </style>
      <div className="page-break"></div>
      {Array.from({ length: pages }, (_, pageIndex) => {
        const page = pageIndex + 1;
        return (
          <div className="quotation-container" key={page}>
            <div className="flex justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  บริษัท วังเภสัชฟาร์มาซูติคอล จำกัด (สำนักงานใหญ่)
                </h2>
                <p className="text-sm">
                  เลขที่ 23 ซ.พัฒโน ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110
                </p>
                <p className="text-sm">โทร. 074-366681-4 แฟกซ์ 074-238629</p>
                <p className="text-sm">เลขประจำตัวผู้เสียภาษี 0905538001557</p>
              </div>
              <div className="center">
                <p className="flex justify-center font-bold">ต้นฉบับ</p>
                <p className="flex justify-center font-bold">ORIGINAL</p>
                <p className="flex justify-center text-xs">เอกสารออกเป็นชุด</p>
              </div>
            </div>

            <div className="meta flex justify-evenly">
              <div className="pl-8 text-sm font-normal">
                <QRCodeSVG
                  value={`${invoices.sh_running || ""}/${
                    invoices.sh_sumprice || ""
                  }`}
                  size={45}
                />
                <p className="flex justify-center">Checking No.</p>
              </div>
              <div className="justify-center text-base font-bold text-center">
                <p>ใบเสนอราคา</p>
                <p>Quotation</p>
              </div>
              {invoices.sh_running && (
                <div className="pr-8 text-sm font-normal">
                  <Barcode
                    value={invoices.sh_running}
                    format="CODE128"
                    width={1}
                    height={25}
                    displayValue={false}
                  />
                  <p className="flex justify-center">Invoice No.</p>
                </div>
              )}
            </div>

            <div className="parent">
              <div className="invoice-info">
                <div className="flex justify-between">
                  <p>รหัสลูกค้า: {invoices.name_code}</p>
                  <p>เลขประจำตัวผู้เสียภาษี: </p>
                  <div>
                    <input type="checkbox" /> สาขา
                  </div>
                </div>
                <div className="flex justify-between">
                  <p>ชื่อร้าน: {invoices.mem_name}</p>
                  <p>ผู้ดูแล: {invoices.shop_keeper}</p>
                </div>
                <p>
                  ที่อยู่:{" "}
                  {[
                    invoices.mem_address,
                    invoices.mem_village,
                    invoices.mem_alley,
                    invoices.mem_road,
                    invoices.subdistrict_id,
                    invoices.district_id,
                    invoices.province_id,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <div>&nbsp;</div>
                <div className="flex justify-between">
                  <p>หมายเหตุ | |</p>
                  <p>QC |Pack </p>
                </div>
              </div>

              <div className="invoice-info2">
                <div className="flex justify-stretch">
                  <p>
                    วันที่:{" "}
                    {new Date(invoices.sh_datetime).toLocaleDateString(
                      "th-TH",
                      { year: "numeric", month: "2-digit", day: "2-digit" }
                    )}
                  </p>
                </div>
                <div className="flex justify-stretch">
                  <p>เลขที่ใบกำกับ: {invoices.sh_running}</p>
                </div>
                <div className="flex justify-stretch">
                  <p>พนักงานขาย: {invoices.emp_code}</p>
                </div>
                <div className="flex justify-stretch">
                  <p>กำหนดการชำระ: </p>
                </div>
                <div className="flex justify-stretch">
                  <p>
                    ครบกำหนด:{" "}
                    {new Date(invoices.sh_datetime).toLocaleDateString(
                      "th-TH",
                      { year: "numeric", month: "2-digit", day: "2-digit" }
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ตารางสินค้า */}
            <table>
              <thead>
                <tr className="text-xs">
                  <th>ที่</th>
                  <th>รหัสสินค้า</th>
                  <th>รายละเอียดสินค้า</th>
                  <th>จำนวน</th>
                  <th>หน่วย</th>
                  <th>ราคา/หน่วย</th>
                  <th>ส่วนลด</th>
                  <th>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }, (_, rowIdx) => {
                  const index = (page - 1) * maxRows + rowIdx;
                  const item = invoices.shopping_order[index];
                  return (
                    <tr key={rowIdx}>
                      <td>{item ? index + 1 : "\u00A0"}</td>
                      <td className="w-32">{item?.product_code || "\u00A0"}</td>
                      <td className="w-64">
                        <div className="product-name">
                          {item?.product_name || "\u00A0"}
                        </div>
                        <div className="text-[11px]">
                          {item?.detail?.[0]?.product_lot ? (
                            <>
                              Lot: {item.detail[0].product_lot} &nbsp; Exp:{" "}
                              {item.detail[0].product_exp}
                            </>
                          ) : (
                            "\u00A0"
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        {item?.so_amount || "\u00A0"}
                      </td>
                      <td>{item?.so_unit || "\u00A0"}</td>
                      <td className="text-right">
                        {formatNumber(item?.so_priceU)}
                      </td>
                      <td className="text-right">
                        {formatNumber(item?.so_discount)}
                      </td>
                      <td className="text-right">
                        {formatNumber(item?.so_sumprice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="footer">
              <div className="TotalText border text-sm font-bold">
                {page === pages
                  ? `ยอดเงินสุทธิ: ${bahtText(Number(invoices.sh_sumprice))}`
                  : `ยอดเงินสุทธิ:`}
              </div>

              <div className="TotalNumTax border p-1 text-sm">
                <div className="flex justify-between">
                  <p>รวมเป็น: </p>
                  {page === pages && (
                    <p className="font-bold">
                      {(
                        Number(invoices.sh_sumprice) -
                        Number(invoices.sh_sumprice) * 0.07
                      ).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex justify-between">
                  <p>ภาษีมูลค่าเพิ่ม 7%:</p>
                  {page === pages && (
                    <p className="text-sm font-bold">
                      {(Number(invoices.sh_sumprice) * 0.07).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="TotalNum flex justify-between border p-1 text-sm">
                <p>ยอดเงินสุทธิ:</p>
                {page === pages && (
                  <p className="text-sm font-bold">
                    {Number(invoices.sh_sumprice).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="CountPage text-xs">
                <p className="flex justify-center">
                  สำหรับลูกค้า [{page}/{pages}]
                </p>
              </div>

              <div className="AccDep text-sm border p-1">
                <div className="flex justify-center">
                  <p>ฝ่ายบัญชี</p>
                </div>
                <hr />
                <div className="flex justify-between pt-2 px-1">
                  <p>(</p>
                  <p>)</p>
                </div>
                <div className="flex justify-center text-xs">
                  <p>
                    วันที่{" "}
                    {new Date(invoices.sh_datetime).toLocaleDateString(
                      "th-TH",
                      {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>

              <div className="CheckItems text-sm border p-1">
                <div className="flex justify-center">
                  <p>ผู้ตรวจสอบรายการ</p>
                </div>
                <hr />
                <div className="flex justify-between pt-2 px-1">
                  <p>(</p>
                  <p>)</p>
                </div>
                <div className="flex justify-center text-xs">
                  <p>วันที่ ___/___/___</p>
                </div>
              </div>

              <div className="Courier text-sm border p-1">
                <div className="flex justify-center">
                  <p>ผู้ส่งของ</p>
                </div>
                <hr />
                <div className="flex justify-between pt-2 px-1">
                  <p>(</p>
                  <p>)</p>
                </div>
                <div className="flex justify-center text-xs">
                  <p>วันที่ ___/___/___</p>
                </div>
              </div>

              <div className="Note text-xs">
                <p className="font-bold">หมายเหตุ:</p>
                <ul className="font-bold text-[8px]">
                  <li>
                    ยืนยันราคาภายใน 7 วันหลังจากวันที่เสนอราคา
                  </li>
                  <li>
                    ราคารวมภาษีมูลค่าเพิ่ม 7% แล้ว
                  </li>
                  <li>
                    ราคาสินค้าเป็นราคาที่ทางบริษัทเป็นผู้จัดส่งเท่านั้น
                  </li>
                </ul>
              </div>

              <div className="Contact text-xs">
                <div className="flex justify-between">
                  <p>ติดต่อ 08:00-18:00</p>
                  <p>K.จั๊บ:094-819-3666</p>
                </div>
                <div className="flex justify-between">
                  <p>086-491-5414</p>
                  <p>086-491-5416</p>
                </div>
                <div className="flex justify-between">
                  <p>063-525-2927</p>
                  <p>063-525-2239</p>
                </div>
                <div className="flex justify-between">
                  <p>063-525-2234</p>
                  <p>063-525-2235</p>
                </div>
              </div>

              <div className="Payment text-sm mt-4 flex flex-col items-center mr-10">
                <Barcode
                  value={invoices.sh_sumprice}
                  format="CODE128"
                  width={1}
                  height={25}
                  displayValue={false}
                />
                <p className="text-center">Payment</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default FormatPart;