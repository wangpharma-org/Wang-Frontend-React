# e2e (สคริปต์ยิงระบบจริงบนเครื่อง)

| ไฟล์ | งาน | วิธีรัน |
|-----|-----|--------|
| `rt-approval.e2e.mjs`, `rt-floor-claim.e2e.mjs` | OPHMBC-323 | ดูหัวไฟล์ |
| `two-factor.pw.mjs` | OPHMBC-339 ยืนยันตัวตน 2 ชั้น (Playwright) | ดูด้านล่าง |

## two-factor.pw.mjs

ต้องรัน (ทั้งหมดบนเครื่อง ห้ามชี้ DB production):

1. MySQL docker ของ auth (เช่น `auth-e2e-mysql` :3325)
2. auth branch `feature/OPHMBC-339` :3339 ด้วย env
   `TWO_FACTOR_ENABLED=on TWO_FACTOR_ENC_KEY=<hex 64> TWO_FACTOR_REQUIRED_ROLES=MANAGER`
   `HRSOFT_EMPLOYEE_ACCESS_KEY=e2e-key HRSOFT_ACCESS_BASE=http://localhost:4339`
   `HRSOFT_LOGIN_OTP_KEY=otp-key HRSOFT_LOGIN_OTP_URL=http://localhost:4339/verifyLoginOtp`
3. FE: `VITE_API_URL_AUTH=http://localhost:3339 npx vite --port 5339`

```bash
DB_HOST=127.0.0.1 DB_PORT=3325 DB_USERNAME=root DB_PASSWORD=... DB_NAME=auth_e2e node e2e/two-factor.pw.mjs
HEADED=1 E2E_SLOWMO=600 ... node e2e/two-factor.pw.mjs   # ดูบนจอ
```

HRSoft จำลองอยู่ในสคริปต์ (:4339) · Playwright ใช้จาก `D:/WP/Wang-E-commerce/Ecommerce-Frontend` (`PLAYWRIGHT_FROM` เปลี่ยนได้)
ข้อมูลทดสอบ E2E395–E2E398 ลบตอนจบ
