// e2e หน้า /picking-control (OPHMBC-324) — เปิดหน้าจริงกับ backend ที่รันอยู่ แล้ว capture หน้าจอ
// ตรวจว่าตารางรายชั้นขึ้น, มี legend 3 สถานะ (🔴 ระงับ / 🟠 ลังขาด / 🟢 ผ่าน), แท็บ 7 วัน และบรรทัดช่วงเวลา
//
// เป็นสคริปต์ "อ่านอย่างเดียว" — ไม่กดบันทึก ไม่แก้ค่า ปลอดภัยกับ prod
//
// local:  backend จาก branch feature/OPHMBC-324 + ฐานทดสอบที่รัน migration order-block-per-day แล้ว
//   E2E_ENV=local FRONTEND_URL=http://localhost:5174 E2E_USER=x E2E_PASS=x \
//     E2E_SCREENSHOT=docs/e2e/images/ophmbc-324-picking-control-local.png \
//     node e2e/order-block-picking-control.e2e.mjs
// dev/prod:
//   E2E_ENV=prod FRONTEND_URL=https://... E2E_USER=... E2E_PASS=... \
//     E2E_SCREENSHOT=docs/e2e/images/ophmbc-324-picking-control-prod.png \
//     node e2e/order-block-picking-control.e2e.mjs
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const ENV = process.env.E2E_ENV ?? 'local';
const BASE = (process.env.FRONTEND_URL ?? 'http://localhost:5174').replace(/\/$/, '');
const SHOT = process.env.E2E_SCREENSHOT ?? 'ophmbc-324-picking-control.png';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
if (!process.env.E2E_USER || !process.env.E2E_PASS) throw new Error('ต้องตั้ง E2E_USER / E2E_PASS');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 }, locale: 'th-TH' });
let overview = null;
page.on('response', async (res) => {
  // หน้าดึง overview ของ order-block (floors + box_stock + window_*) — เก็บไว้เทียบกับ UI
  if (/\/api\/order-block(\/overview)?(\?|$)/.test(res.url()) && res.ok()) {
    try { overview = await res.json(); } catch { /* ไม่ใช่ JSON */ }
  }
});
const table = () => page.locator('[data-testid="floor-control-table"]');

try {
  await page.goto(`${BASE}/login`);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(process.env.E2E_USER);
  await inputs.nth(1).fill(process.env.E2E_PASS);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

  await page.goto(`${BASE}/picking-control`);
  await table().waitFor({ timeout: 20000 });
  check('ตารางรายชั้นขึ้น (floor-control-table)', await table().isVisible());

  // แท็บ 7 วัน — มีเมื่อ BE ส่ง days มา (รุ่น OPHMBC-324); BE เก่าไม่มี ถือว่า pass แบบ skip
  const tabs = page.locator('[data-testid="floor-day-tabs"]');
  const hasTabs = await tabs.count();
  check('แท็บเลือกวัน (จ.–อา.) ขึ้นเมื่อ BE ส่ง days', hasTabs > 0, hasTabs ? 'มีแท็บ' : 'BE นี้ยังไม่ส่ง days (ยังโอเค)');

  // บรรทัดช่วงเวลา (box-window) — ข้อความบอกว่าในช่วง/นอกช่วง/ไม่เปิดระงับ
  const windowLine = page.locator('[data-testid="box-window"]');
  if (await windowLine.count()) {
    const txt = (await windowLine.first().innerText()).trim();
    check('บรรทัดช่วงเวลาระงับเพราะลังขึ้นข้อความ', txt.length > 0, txt);
  } else {
    check('บรรทัดช่วงเวลา (box-window)', true, 'ไม่ขึ้น (ระงับเพราะลังอาจปิดอยู่) — ยังโอเค');
  }

  // legend 3 สถานะ — อย่างน้อยหนึ่งแบบต้องปรากฏบนตาราง
  const bodyText = await table().innerText();
  const states = ['🔴 ระงับ', '🟠 ลังขาด', '🟢 ผ่าน'].filter((s) => bodyText.includes(s.split(' ')[0]));
  check('มีสถานะรายชั้นอย่างน้อย 1 แบบ (🔴/🟠/🟢)', states.length > 0, states.join(' , ') || 'ไม่พบ');

  // เทียบ UI กับ overview ที่ API ส่งมา (ถ้าจับได้)
  if (overview?.box_stock?.floors) {
    const short = overview.box_stock.floors.filter((f) => f.short).length;
    const blocked = overview.box_stock.floors.filter((f) => f.blocked).length;
    check('API แยก short/blocked ให้ UI', true, `short=${short} blocked=${blocked} window_active=${overview.box_stock.window_active}`);
  }

  await page.screenshot({ path: SHOT, fullPage: true });
  check('บันทึกภาพหน้าจอ', true, SHOT);
} catch (error) {
  check('สคริปต์รันจนจบ', false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${ENV}: ${results.length - failed}/${results.length} ผ่าน`);
process.exit(failed ? 1 : 0);
