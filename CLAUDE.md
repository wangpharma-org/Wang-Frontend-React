# CLAUDE.md — Wang-Frontend-React

Frontend สำหรับพนักงานคลังสินค้าของระบบ WangERP

**Backend คู่กัน:** `../Wang-OrderPickingService-NestJS` (port 3003)

---

## Tech Stack

| รายการ | ค่า |
|--------|-----|
| Framework | React 19, Vite 6 |
| Language | TypeScript |
| Styling | TailwindCSS v4 |
| HTTP | Axios |
| WebSocket | socket.io-client |
| Dev Port | **5174** (แก้ใน `vite.config.ts` แล้ว) |

---

## คำสั่งพัฒนา

```bash
npm run dev        # รัน dev server (port 5174)
npm run build      # build production
npm run lint       # ESLint
```

---

## โครงสร้างไฟล์

```
src/
├── pages/          ← หน้าต่างๆ ทั้งหมด (1 ไฟล์ = 1 หน้า)
├── components/     ← Shared components (Navbar, ProductBox ฯลฯ)
├── context/        ← RequireAuth (guard route ที่ต้อง login)
├── assets/         ← รูปภาพ / icons
└── App.tsx         ← Router หลัก + WebSocket reload
```

---

## Pattern การเพิ่มหน้าใหม่

### 1. สร้างไฟล์ใน `src/pages/NewPage.tsx`

### 2. เพิ่ม Route ใน `App.tsx`
```tsx
import NewPage from "./pages/NewPage";

// ใน <Routes>:
<Route
  path="/new-page"
  element={
    <RequireAuth>
      <NewPage />
    </RequireAuth>
  }
/>
```

### 3. เพิ่ม Menu ใน `Home.tsx`
```tsx
import newIcon from "../assets/icon.png";

// ใน listMenu array:
{
  id: 15,          // ต้องไม่ซ้ำกับ id อื่น
  name: "ชื่อเมนู",
  href: "/new-page",
  imageSrc: newIcon,
  admin: false,    // true = เฉพาะ admin เท่านั้น
}
```

> **หมายเหตุ:** `admin: true` จะแสดงเฉพาะ user ที่มี `manage_product === "Yes"` และ visibility ถูก fetch จาก `/api/hide-button/{id}` ด้วย — ถ้าเพิ่ม menu ใหม่ให้ใช้ id ที่ยังไม่มีใน list

---

## Auth Pattern

```tsx
// อ่าน token
const token = sessionStorage.getItem("access_token");

// อ่านข้อมูล user
const userInfo = JSON.parse(sessionStorage.getItem("user_info") || "{}");
// มี field: emp_code, nickname, floor_picking, manage_product, manage_qc ฯลฯ

// ส่ง request พร้อม Auth header
axios.get(url, {
  headers: { Authorization: `Bearer ${token}` }
})
```

---

## WebSocket

App.tsx เชื่อมต่อ `/socket/reload-page` อัตโนมัติ — รับ event `reload` แล้ว `window.location.reload()`

Pages อื่นที่ใช้ WebSocket:
- `OrderList.tsx` → `/socket/picking/listorder`
- `ProductList.tsx` → `/socket/picking/listproducts`
- `QC-Dashboard.tsx` → `/socket/kpi/dashboard`

---

## Environment Variables

```env
VITE_API_URL_ORDER=http://localhost:3003      # Wang-OrderPickingService
VITE_API_URL_AUTH=https://...                 # Wang-AuthService
VITE_API_URL_ECOMMERCE=http://localhost:3021
VITE_API_URL_VERIFY_ORDER=...                 # ใช้สำหรับ hide-button API ใน Home.tsx
```

---

## QR Code บนสติกเกอร์ลัง

Format ที่ `BoxSticker.tsx` generate:
```
WP|{mem_code}|{sh_running1,sh_running2,...}|{box_no}|{total_boxes}
```

- `sh_running` = เลข SO คั่นด้วย comma (หลาย SO ต่อลัง)
- `box_no` = ลังที่เท่าไหร่ (เริ่มจาก 1)
- `total_boxes` = จำนวนลังทั้งหมดของ shipment นี้

ตัวอย่าง: `WP|001234|005-0000001,005-0000002|1|3`

---

## Pattern สำหรับ Physical Barcode Scanner (หน้า Mobile)

เครื่องสแกนส่ง input เหมือน keyboard พิมพ์เร็ว → ต้องใช้ hidden input รับ

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const [value, setValue] = useState("");

// Focus on mount
useEffect(() => { inputRef.current?.focus(); }, []);

// Hidden input — inputMode="none" ป้องกัน virtual keyboard บน mobile
<input
  ref={inputRef}
  inputMode="none"
  className="absolute opacity-0 w-0 h-0 pointer-events-none"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && value.trim()) {
      handleScan(value);
      setValue("");
    }
  }}
/>

// Re-focus เมื่อ click ที่หน้าจอ
<div onClick={() => inputRef.current?.focus()}>
  ...
</div>
```

> **สำคัญ:** `inputMode="none"` ป้องกัน virtual keyboard ขึ้นบน Android/iOS
> `pointer-events-none` ป้องกัน user click ที่ตัว input โดยตรง

---

## Pages สำคัญ

| Path | ไฟล์ | หน้าที่ |
|------|------|--------|
| `/` | `Home.tsx` | เมนูหลัก |
| `/order-list` | `OrderList.tsx` | จัดออเดอร์ real-time |
| `/product-list` | `ProductList.tsx` | รายการสินค้าหยิบ |
| `/dashboard-qc` | `QC-Dashboard.tsx` | ระบบ QC |
| `/scan-box` | `ScanBox.tsx` | สแกนสติกเกอร์บนลัง |
| `/box-sticker` | `BoxSticker.tsx` | พิมพ์สติกเกอร์ลัง |
| `/report` | `ReportEmployee.tsx` | รายงานพนักงาน |
| `/route-manage` | `RouteManage.tsx` | จัดการ route |
| `/rt-approval` | `RTApproval.tsx` | อนุมัติ RT |

---

## การพิมพ์สติกเกอร์

สติกเกอร์ลังถูก navigate โดยใช้ query params:
```
/box-sticker?print={จำนวนลัง}&mem_code={รหัสลูกค้า}&sh_running={SO1,SO2,...}
/box-sticker-a?...    ← รูปแบบ A
/box-sticker-block?...emp_qc={emp_code}  ← รูปแบบ Block (มีชื่อ QC)
```

`shRunningArray` เป็น `string[]` เมื่อใส่ใน template literal จะ join ด้วย comma อัตโนมัติ
