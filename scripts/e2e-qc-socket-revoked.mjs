/**
 * E2E (browser) — หน้า QC ส่ง token ตอนต่อ socket และ logout เองเมื่อถูกตัดสิทธิ์
 *
 * ใช้กับ service local เท่านั้น: auth (Wang-AuthService #27) + order-picking (#288, WS_AUTH_ON_CONNECT=enforce)
 * + หน้าเว็บนี้ (vite) ชี้ไปที่ทั้งสอง
 *   FE_URL=http://127.0.0.1:5181 AUTH_API=http://127.0.0.1:3997/api  PLAYWRIGHT=<path ของ node_modules/playwright> MYSQL2=<path ของ node_modules/mysql2/promise> \
 *   DB_HOST=127.0.0.1 DB_PORT=3437 DB_USERNAME=root DB_PASSWORD=... AUTH_DB=auth_e2e OP_DB=op_e2e OUT_DIR=<โฟลเดอร์รูป> \
 *     node scripts/e2e-qc-socket-revoked.mjs
 * ข้อมูลทดสอบ: พนักงาน E2E910 + บัญชี SERVICE e2e-hr-svc4 (ชื่อ "E2E local") ลบตอนจบ
 */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const FE = process.env.FE_URL || 'http://127.0.0.1:5181';
const AUTH = process.env.AUTH_API || 'http://127.0.0.1:3997/api';
for (const url of [FE, AUTH]) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url)) {
    console.error(`ปฏิเสธการรันกับ ${url} — ใช้กับ service local เท่านั้น`);
    process.exit(2);
  }
}
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
// repo หน้าเว็บไม่มี mysql2 — ชี้ไปที่ของ repo อื่นด้วย MYSQL2=<path ของ node_modules/mysql2/promise>
const mysql = require(process.env.MYSQL2 || 'mysql2/promise');
const OUT = process.env.OUT_DIR || '.';
const HEADED = process.env.HEADED === '1';

const EMP = 'E2E910';
const SVC_EMP = 'E2ESV4';
const SVC_USER = 'e2e-hr-svc4';
const PW = crypto.randomBytes(9).toString('hex');
const SVC_PW = crypto.randomBytes(9).toString('hex');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, body, token) => {
  const res = await fetch(`${AUTH}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
};
const conn = (database) => mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database,
});
const authDb = await conn(process.env.AUTH_DB);
const opDb = await conn(process.env.OP_DB);
async function cleanup() {
  await authDb.query('DELETE rt FROM refresh_tokens rt JOIN users u ON u.user_id = rt.user_id WHERE u.emp_code IN (?, ?)', [EMP, SVC_EMP]);
  await authDb.query('DELETE FROM users WHERE emp_code IN (?, ?)', [EMP, SVC_EMP]);
  await authDb.query('DELETE FROM employees WHERE emp_code IN (?, ?)', [EMP, SVC_EMP]);
  await opDb.query('DELETE FROM employees WHERE emp_code = ?', [EMP]);
}
async function waitOpAllowUsed(expected) {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const [[row]] = await opDb.query('SELECT allowUsed FROM employees WHERE emp_code = ?', [EMP]);
    if (row && row.allowUsed === expected) return Date.now() - start;
    await sleep(250);
  }
  return null;
}

/** จด websocket ของหน้า: url → ปิดแล้วหรือยัง */
function trackSockets(page) {
  const list = [];
  page.on('websocket', (ws) => {
    const item = { url: ws.url(), closed: false };
    list.push(item);
    ws.on('close', () => { item.closed = true; });
  });
  return list;
}

console.log(`[e2e browser หน้า QC + จอ KPI] fe ${FE} · auth ${AUTH}`);
const browser = await chromium.launch({ headless: !HEADED });
try {
  await cleanup();
  await authDb.query("INSERT INTO employees (emp_code, emp_firstTH, emp_lastTH, emp_nickTH, manage_qc) VALUES (?, 'E2E local', 'พนักงานทดสอบ', 'E2E', 'Yes'), (?, 'E2E local', 'บัญชีระบบ', 'SVC', 'No')", [EMP, SVC_EMP]);
  await authDb.query("INSERT INTO users (emp_code, user_username, user_password, refresh_token, user_role) VALUES (?, ?, ?, '', 'USER'), (?, ?, ?, '', 'SERVICE')", [EMP, EMP, PW, SVC_EMP, SVC_USER, SVC_PW]);
  await opDb.query("INSERT INTO employees (emp_code, emp_name, emp_nickname, emp_tel, allowUsed, manage_qc) VALUES (?, 'E2E local พนักงานทดสอบ', 'E2E', '-', 1, 'Yes')", [EMP]);

  const login = await call('POST', '/auth/login', { username: EMP, password: PW });
  ok('login ที่ auth ได้ token', login.status === 201, `HTTP ${login.status}`);
  const payload = JSON.parse(Buffer.from(login.json.access_token.split('.')[1], 'base64url').toString());

  // 1. หน้า QC (ต้อง login) — ใส่ session แบบที่หน้า login เก็บไว้
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(([at, rt, info]) => {
    if (!sessionStorage.getItem('e2e_seeded')) {
      sessionStorage.setItem('access_token', at);
      sessionStorage.setItem('refresh_token', rt);
      sessionStorage.setItem('user_info', info);
      sessionStorage.setItem('e2e_seeded', '1');
    }
  }, [login.json.access_token, login.json.refresh_token, JSON.stringify(payload)]);
  const page = await ctx.newPage();
  const sockets = trackSockets(page);
  await page.goto(`${FE}/dashboard-qc`);
  await sleep(4000);
  const qcSocket = sockets.find((s) => s.url.includes('/socket/qc'));
  ok('หน้า QC เปิด socket /socket/qc และต่อค้างได้ (enforce ยอมรับ token ที่ส่งไป)', !!qcSocket && !qcSocket.closed, JSON.stringify(sockets.map((s) => `${new URL(s.url).pathname}${s.closed ? ' (ปิด)' : ''}`)));
  await page.screenshot({ path: `${OUT}/1-qc-connected.png` });

  // 2. ตัดสิทธิ์ → หน้า QC logout เอง
  const svc = await call('POST', '/auth/login', { username: SVC_USER, password: SVC_PW });
  const rp = await call('PUT', '/auth/remove-privilege', { emp_code: EMP, allowUsed: true }, svc.json.access_token);
  ok('บัญชี SERVICE สั่งตัดสิทธิ์สำเร็จ', rp.status === 200, `HTTP ${rp.status}`);
  const ms = await waitOpAllowUsed(0);
  ok('Kafka ถึง order-picking', ms !== null, ms === null ? 'ไม่ถึงใน 30 วิ' : `${ms} ms`);
  const shown = await page.getByText('กรุณาเข้าสู่ระบบใหม่').waitFor({ timeout: 10_000 }).then(() => true, () => false);
  ok('หน้า QC ขึ้น "กรุณาเข้าสู่ระบบใหม่" เอง (ไม่ต้องกดอะไร)', shown);
  const token = await page.evaluate(() => sessionStorage.getItem('access_token'));
  ok('token ใน sessionStorage ถูกลบ (logout แล้ว)', token === null);
  ok('socket QC ถูกปิด', !!qcSocket?.closed);
  await page.screenshot({ path: `${OUT}/2-qc-revoked-logout.png` });
  await ctx.close();

  // 3. จอ KPI (ไม่มีหน้า login) ยังต่อได้โดยไม่มี token แม้ enforce
  const kctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const kpage = await kctx.newPage();
  const ksockets = trackSockets(kpage);
  await kpage.goto(`${FE}/dashboard-kpi`);
  await sleep(4000);
  const kpi = ksockets.find((s) => s.url.includes('/socket/kpi'));
  ok('จอ KPI ไม่ login ยังต่อ /socket/kpi ได้', !!kpi && !kpi.closed, JSON.stringify(ksockets.map((s) => `${new URL(s.url).pathname}${s.closed ? ' (ปิด)' : ''}`)));
  await kpage.screenshot({ path: `${OUT}/3-kpi-public.png` });
  await kctx.close();
} catch (e) {
  fail++;
  console.log(`  ✗ สคริปต์ล้ม — ${e.message}`);
} finally {
  await browser.close();
  await cleanup();
  const [[a]] = await authDb.query('SELECT COUNT(*) AS n FROM users WHERE emp_code IN (?, ?)', [EMP, SVC_EMP]);
  console.log(`[cleanup] เหลือค้าง auth ${a.n} (ต้องเป็น 0)`);
  await authDb.end();
  await opDb.end();
}
console.log(`\nผล: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
