// Playwright — OPHMBC-339 ยืนยันตัวตน 2 ชั้น ผ่านหน้าเว็บ Order Picking จริง (ไม่ mock endpoint ของเรา)
//
// local ทั้งหมด:
//   auth (feature/OPHMBC-339) :3339 — TWO_FACTOR_ENABLED=on, HRSOFT_ACCESS_BASE / HRSOFT_LOGIN_OTP_URL ชี้ :4339
//   FE dev server :5339 — VITE_API_URL_AUTH=http://localhost:3339
//   HRSoft จำลองในสคริปต์นี้ :4339 (verify-credential + TOTP ของ HRSoft แบบกันรหัสซ้ำ, attendance-today, verifyLoginOtp)
//   MySQL docker ของ auth (ห้ามชี้ production)
//
//   DB_HOST=127.0.0.1 DB_PORT=3325 DB_USERNAME=root DB_PASSWORD=... DB_NAME=auth_e2e \
//   node e2e/two-factor.pw.mjs            # headless
//   HEADED=1 E2E_SLOWMO=600 node e2e/two-factor.pw.mjs
//
// ข้อมูลทดสอบ: พนักงาน E2E395–E2E398 — ลบตอนจบ
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(process.env.PLAYWRIGHT_FROM || 'D:/WP/Wang-E-commerce/Ecommerce-Frontend/package.json');
const { chromium } = require('playwright');
const mysql = createRequire(process.env.MYSQL_FROM || 'D:/WP/Wang_PrintBill_Project/ERP/Wang-AuthService-NestJS/package.json')('mysql2/promise');

const DIR = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const SHOTS = process.env.SHOTS_DIR || path.join(DIR, 'shots-two-factor');
fs.mkdirSync(SHOTS, { recursive: true });
const HEADED = process.env.HEADED === '1';
const SLOWMO = Number(process.env.E2E_SLOWMO || 0);
const FE = process.env.FE_URL || 'http://localhost:5339';
const AUTH = process.env.AUTH_URL || 'http://localhost:3339/api';
const MOCK_PORT = Number(process.env.MOCK_PORT || 4339);
const PW = 'hrsoft-pass-e2e';
const HR_OTP = '246810';
const EMP_SELF = 'E2E395'; // สมัคร TOTP เองที่หน้า /two-factor
const EMP_BOTH = 'E2E396'; // TOTP ของ HRSoft + ถูกเลือกให้ใช้ 2FA ของ auth → สมัครที่หน้า login (รหัสจาก LINE)
const EMP_ADMIN = 'E2E397'; // manage_qc = Yes
const EMP_OTHER = 'E2E398'; // ให้แอดมินเลือก
const ALL = [EMP_SELF, EMP_BOTH, EMP_ADMIN, EMP_OTHER];

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`  ${cond ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); };
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

// ── TOTP ฝั่งเทส (แทนแอป Authenticator) ──
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32 = (s) => { let bits = 0, v = 0; const o = []; for (const ch of s.replace(/\s/g, '')) { v = (v << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { o.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(o); };
const totp = (secret, off = 0) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + off)); const h = createHmac('sha1', b32(secret)).update(c).digest(); const i = h[h.length - 1] & 15; return String((((h[i] & 127) << 24) | (h[i + 1] << 16) | (h[i + 2] << 8) | h[i + 3]) % 1e6).padStart(6, '0'); };

// ── HRSoft จำลอง ──
const hrTotpUsed = new Set(); // TOTP ของ HRSoft ใช้รหัสเดิมซ้ำไม่ได้ (เหมือนของจริง)
const hrTotpCalls = [];
const mock = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    const json = (s, d) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
    if (req.url === '/verifyLoginOtp') {
      if (req.headers['x-api-key'] !== 'otp-key') return json(401, { valid: false, error: 'API key ไม่ถูกต้อง' });
      return body.otp === HR_OTP ? json(200, { valid: true }) : json(401, { valid: false, error: 'OTP ไม่ถูกต้อง' });
    }
    if (req.headers['x-api-key'] !== 'e2e-key') return json(401, {});
    if (req.url === '/employee/verify-credential') {
      const deny = (code, error) => json(200, { success: true, data: { verified: false, code, error } });
      if (!ALL.includes(body.employeeCode) || body.password !== PW) return deny('INVALID_CREDENTIALS', 'รหัสผ่านไม่ถูกต้อง');
      if (body.employeeCode === EMP_BOTH) {
        hrTotpCalls.push(body.totpCode ?? null);
        if (!body.totpCode) return deny('TOTP_REQUIRED', 'กรุณากรอกรหัส 6 หลัก');
        if (!/^\d{6}$/.test(body.totpCode) || body.totpCode === '000000') return deny('TOTP_REQUIRED', 'รหัส 6 หลักไม่ถูกต้อง');
        if (hrTotpUsed.has(body.totpCode)) return deny('TOTP_REQUIRED', 'รหัสนี้ถูกใช้ไปแล้ว');
        hrTotpUsed.add(body.totpCode);
      }
      return json(200, { success: true, data: { verified: true, hasAccess: true } });
    }
    if (/attendance-today$/.test(req.url)) return json(200, { success: true, data: { checkedIn: true } });
    json(404, {});
  });
});

const api = async (method, p, body, token) => {
  const r = await fetch(`${AUTH}${p}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

async function login(page, emp) {
  await page.goto(`${FE}/login`);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${FE}/login`);
  await page.locator('#username').fill(emp);
  await page.locator('#password').fill(PW);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
}
const session = (page) => page.evaluate(() => sessionStorage.getItem('access_token'));
const waitSession = async (page) => { for (let i = 0; i < 40; i++) { if (await session(page)) return true; await page.waitForTimeout(250); } return false; };
const toastText = async (page) => { const t = page.locator('.Toastify__toast').last(); await t.waitFor({ timeout: 5000 }).catch(() => {}); return (await t.isVisible().catch(() => false)) ? await t.innerText() : ''; };

await new Promise((r) => mock.listen(MOCK_PORT, r));
const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
const cleanup = async () => {
  for (const c of ALL) {
    await db.query('DELETE t FROM user_two_factor t JOIN users u ON u.user_id = t.user_id WHERE u.emp_code = ?', [c]).catch(() => {});
    await db.query('DELETE rt FROM refresh_tokens rt JOIN users u ON u.user_id = rt.user_id WHERE u.emp_code = ?', [c]).catch(() => {});
    await db.query('DELETE FROM users WHERE emp_code = ?', [c]);
    await db.query('DELETE FROM employees WHERE emp_code = ?', [c]);
  }
};

const browser = await chromium.launch({ headless: !HEADED, slowMo: SLOWMO, channel: process.env.PW_CHANNEL || undefined });
const started = Date.now();
try {
  await cleanup();
  for (const c of ALL) await api('POST', '/auth/signup', { user_username: c, user_password: c, emp_code: c, emp_firstTH: 'E2E local', emp_lastTH: `OPHMBC-339 ${c}`, emp_nickTH: c.slice(-3) });
  await db.query("UPDATE employees SET manage_qc = 'Yes' WHERE emp_code = ?", [EMP_ADMIN]);
  await db.query("INSERT INTO user_two_factor (user_id, emp_code, required, required_by) SELECT user_id, emp_code, 1, ? FROM users WHERE emp_code = ?", [EMP_ADMIN, EMP_BOTH]);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  // FE เรียก service อื่นที่ไม่ได้รันในเครื่อง (เช็คปุ่มเมนู ฯลฯ) — ตอบว่างให้เร็ว ไม่ยุ่งกับ auth ของเรา
  await ctx.route((url) => !url.href.startsWith(FE) && !url.href.startsWith('http://localhost:3339'), (r) => r.fulfill({ status: 503, body: '{}' }));
  const page = await ctx.newPage();

  console.log('\n[A] สมัคร TOTP เองที่หน้า /two-factor');
  await login(page, EMP_SELF);
  ok('ไม่ได้สมัคร = เข้าระบบได้ทันที', await waitSession(page));
  await page.waitForURL(`${FE}/`, { timeout: 10000 }).catch(() => {});
  const tile = page.locator('[id="ยืนยันตัวตน 2 ชั้น"]');
  await tile.waitFor({ timeout: 10000 }).catch(() => {});
  ok('เมนู "ยืนยันตัวตน 2 ชั้น" แสดงเมื่อ auth เปิดฟีเจอร์', await tile.isVisible());
  await shot(page, '01-home-menu');
  await tile.click();
  await page.waitForURL(/\/two-factor$/);
  await page.getByText('ยังไม่ได้ตั้งค่า').waitFor();
  ok('สถานะ "ยังไม่ได้ตั้งค่า"', true);
  ok('ไม่มีส่วนจัดการพนักงาน (ไม่มีสิทธิ์ manage_qc)', (await page.locator('[data-admin-two-factor]').count()) === 0);
  await page.locator('[data-start-setup]').click();
  await page.locator('[data-method="totp"]').click();
  await page.locator('[data-totp-qr] svg').waitFor();
  const secret = (await page.locator('[data-totp-secret]').innerText()).replace(/\s/g, '');
  ok('เลือกแอป Authenticator = ขึ้น QR + รหัสให้พิมพ์', /^[A-Z2-7]{32}$/.test(secret));
  await shot(page, '02-setup-totp-qr');
  await page.locator('#new-code').fill('000000');
  await page.getByRole('button', { name: 'ยืนยันและเปิดใช้' }).click();
  await page.locator('[data-setup-error]').waitFor();
  ok('รหัสผิด = แจ้งข้อความ ไม่เปิดใช้', /ไม่ถูกต้อง/.test(await page.locator('[data-setup-error]').innerText()));
  await page.locator('#new-code').fill(totp(secret, -1));
  await page.getByRole('button', { name: 'ยืนยันและเปิดใช้' }).click();
  await page.locator('[data-backup-codes]').waitFor();
  const backupCodes = await page.locator('[data-backup-codes] .font-mono > div').allInnerTexts();
  ok('รหัสถูก = เปิดใช้ + โชว์รหัสสำรอง 8 ชุด', backupCodes.length === 8, backupCodes.length);
  await shot(page, '03-backup-codes');
  await page.locator('[data-backup-done]').click();
  await page.getByText('เปิดใช้: แอป Authenticator').waitFor();
  ok('สถานะเปลี่ยนเป็น "เปิดใช้: แอป Authenticator"', true);

  console.log('\n[B] login ด้วยรหัสจากแอป');
  await login(page, EMP_SELF);
  await page.locator('[data-step="two-factor"]').waitFor();
  ok('หลังรหัสผ่าน ถามรหัส 6 หลัก (ยังไม่ได้ session)', !(await session(page)));
  await shot(page, '04-login-two-factor');
  await page.locator('#two-factor-code').fill('111111');
  await page.getByRole('button', { name: 'ยืนยัน' }).click();
  ok('รหัสผิด = toast แจ้ง', /ไม่ถูกต้อง/.test(await toastText(page)));
  await page.locator('#two-factor-code').fill(totp(secret, 0));
  await page.getByRole('button', { name: 'ยืนยัน' }).click();
  ok('รหัสถูก = เข้าระบบ', await waitSession(page));
  await login(page, EMP_SELF);
  await page.locator('[data-step="two-factor"]').waitFor();
  await page.locator('#two-factor-code').fill(backupCodes[0]);
  await page.getByRole('button', { name: 'ยืนยัน' }).click();
  ok('รหัสสำรองใช้เข้าระบบได้', await waitSession(page));

  console.log('\n[C] TOTP ของ HRSoft + ถูกบังคับ → สมัครที่หน้า login ด้วยรหัสจาก LINE');
  await login(page, EMP_BOTH);
  await page.locator('[data-step="hrsoft-totp"]').waitFor();
  ok('HRSoft ขอรหัส = ขั้น "ระบบ HR"', true);
  await shot(page, '05-login-hrsoft-totp');
  await page.locator('#hrsoft-totp').fill('135791');
  await page.getByRole('button', { name: 'ยืนยัน' }).click();
  await page.locator('[data-step="enroll"]').waitFor();
  ok('ถูกบังคับแต่ยังไม่สมัคร = หน้าตั้งค่า 2 ชั้นในหน้า login', !(await session(page)));
  await page.locator('[data-method="hrsoft_otp"]').click();
  await page.waitForTimeout(300); // รอ transition ของการ์ดที่เลือก
  await shot(page, '06-login-enroll');
  await page.locator('#new-code').fill(HR_OTP);
  await page.getByRole('button', { name: 'ยืนยันและเปิดใช้' }).click();
  await page.locator('[data-backup-codes]').waitFor();
  await page.locator('[data-backup-done]').click();
  ok('สมัครเสร็จ = เข้าระบบเลย', await waitSession(page));

  await login(page, EMP_BOTH);
  await page.locator('[data-step="hrsoft-totp"]').waitFor();
  await page.locator('#hrsoft-totp').fill('246802');
  await page.getByRole('button', { name: 'ยืนยัน' }).click();
  await page.locator('[data-step="two-factor"]').waitFor();
  ok('รอบถัดไป: รหัส HRSoft แล้วถามรหัสจาก LINE', /LINE/.test(await page.locator('[data-step="two-factor"]').innerText()));
  await page.locator('#two-factor-code').fill(HR_OTP);
  await page.getByRole('button', { name: 'ยืนยัน' }).click();
  ok('เข้าระบบได้ (ไม่ส่งรหัส HRSoft ซ้ำ — ใช้ challenge_ticket)', await waitSession(page));
  ok('HRSoft ได้รหัสแต่ละตัวครั้งเดียว', hrTotpCalls.filter((c) => c === '246802').length === 1, hrTotpCalls.join(','));

  console.log('\n[D] แอดมิน (manage_qc) — เลือกรายคน');
  await login(page, EMP_ADMIN);
  await waitSession(page);
  await page.goto(`${FE}/two-factor`);
  await page.locator('[data-admin-two-factor]').waitFor();
  await page.getByPlaceholder('ค้นหารหัส / ชื่อ / ชื่อเล่น').fill('E2E39');
  const row = page.locator(`tr[data-emp="${EMP_OTHER}"]`);
  await row.waitFor();
  ok('เห็นส่วนจัดการพนักงาน + สถานะแต่ละคน', /แอป Authenticator/.test(await page.locator(`tr[data-emp="${EMP_SELF}"]`).innerText()) && /LINE/.test(await page.locator(`tr[data-emp="${EMP_BOTH}"]`).innerText()));
  await row.locator('[data-required-toggle]').check();
  await page.waitForTimeout(800);
  const [[sel]] = await db.query('SELECT t.required FROM user_two_factor t JOIN users u ON u.user_id = t.user_id WHERE u.emp_code = ?', [EMP_OTHER]);
  ok(`ติ๊ก "เลือกให้ต้องใช้" = บันทึกลง DB (${EMP_OTHER})`, Number(sel?.required) === 1);
  await shot(page, '07-admin-desktop');
  await page.locator(`tr[data-emp="${EMP_SELF}"]`).getByRole('button', { name: 'รีเซ็ต' }).click();
  await page.locator('.swal2-confirm').click();
  await page.waitForTimeout(800);
  ok('รีเซ็ต = กลับเป็น "ยังไม่ตั้ง"', /ยังไม่ตั้ง/.test(await page.locator(`tr[data-emp="${EMP_SELF}"]`).innerText()));
  await login(page, EMP_OTHER);
  await page.locator('[data-step="enroll"]').waitFor();
  ok(`${EMP_OTHER} ที่ถูกเลือก login แล้วต้องสมัคร`, !(await session(page)));

  console.log('\n[M] มือถือ 390px');
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mctx.route((url) => !url.href.startsWith(FE) && !url.href.startsWith('http://localhost:3339'), (r) => r.fulfill({ status: 503, body: '{}' }));
  const mp = await mctx.newPage();
  await login(mp, EMP_OTHER);
  await mp.locator('[data-step="enroll"]').waitFor();
  await mp.locator('[data-method="totp"]').click();
  await mp.locator('[data-totp-qr] svg').waitFor();
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok('หน้าสมัคร (QR) บนมือถือไม่ล้นจอ', !overflow);
  await shot(mp, '08-mobile-enroll');
  await login(mp, EMP_ADMIN);
  await waitSession(mp);
  await mp.goto(`${FE}/two-factor`);
  await mp.locator(`[data-emp-card="${EMP_OTHER}"]`).waitFor();
  ok('หน้าแอดมินบนมือถือเป็นการ์ด ไม่ล้นจอ', !(await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await shot(mp, '09-mobile-admin');
} catch (e) {
  fail++;
  console.log('  ✗ หยุดกลางทาง —', e.message.split('\n')[0]);
} finally {
  await browser.close();
  await cleanup();
  await db.end();
  mock.close();
  console.log(`\nผล: ผ่าน ${pass} / ไม่ผ่าน ${fail} · ${((Date.now() - started) / 1000).toFixed(1)} วิ · ภาพ: ${SHOTS}`);
  process.exitCode = fail ? 1 : 0;
}
