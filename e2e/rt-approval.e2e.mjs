// e2e หน้า /rt-approval: ข้อมูลการซื้อขายโหลดเอง, ประวัติเรียงวันถูก + คงเหลือสิ้นวัน, ไม่มี "Invalid Date", ต้องมีหมายเหตุก่อนกด
//
// local  (UI จริง + API จำลองในสคริปต์ ไม่แตะระบบไหน):
//   VITE_API_URL_ORDER=http://e2e-mock.invalid VITE_API_URL_AUTH=http://e2e-mock.invalid npx vite --port 5176
//   E2E_ENV=local FRONTEND_URL=http://localhost:5176 node e2e/rt-approval.e2e.mjs
//
// dev/prod  (อ่านอย่างเดียว: เปิดรายการรออนุมัติรายการแรก ตรวจ แล้วปิด ไม่กดอนุมัติ/ปฏิเสธ):
//   E2E_ENV=prod FRONTEND_URL=https://... E2E_USER=... E2E_PASS=... node e2e/rt-approval.e2e.mjs
//
// ไม่มี playwright ใน dependencies ของ repo: ใช้ `npm i --no-save playwright` หรือชี้ PLAYWRIGHT_MODULE ไปที่ playwright/index.mjs ที่มีอยู่
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const ENV = process.env.E2E_ENV ?? 'local';
const BASE = (process.env.FRONTEND_URL ?? 'http://localhost:5176').replace(/\/$/, '');
const MOCK = 'http://e2e-mock.invalid';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// ---------- ข้อมูลจำลอง (local เท่านั้น) ----------
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const item = (ref, code, status, minutes) => ({
  ref, status, created_at: ago(minutes),
  employee: { code: 'E2E', name: 'E2E local' },
  product: { code, name: `E2E local สินค้า ${code}`, image: '', floor: '3' },
  member: { code: 'E2E-001', name: 'E2E local ร้าน', route: { code: 'L9', name: 'ตรัง' } },
  so_running: `SO-${ref}`, sh_running: `E2E-${ref}`, amount_item: 2, unit_item: 'ขวด', note: null, empQC_note: null,
});
const rtItems = [item('cached', 'E2E-P1', 'Pending', 5), item('uncached', 'E2E-P2', 'Pending', 30)];
// amount เป็น string เหมือน API จริง มี RTIN ด้วย วันที่ > 12 เพื่อจับการอ่านวันสลับ
const history = [
  ['2026-10-07', 'PUR', '1200'], ['2026-10-13', 'SAL', '-80'], ['2026-10-14', 'SAL', '-96'],
  ['2026-10-14', 'RET', '2'], ['2026-10-14', 'RTIN', '-1'], ['2026-10-15', 'SAL', '-110'],
].map(([date, type, amount], i) => ({ purchest_history_id: i, date, type, amount, unit: 'ขวด' }));
const purchestOf = (code) => ({
  purchest_id: 1, product_code: code, pro_stock: '1100', pro_Unit1: 'ขวด', pro_timeStock: '', update_at: ago(10),
  pur: { purchest_pur_id: 1, pur_date: '2026-10-07', pur_invoice: 'E2E-PUR', pur_amount: '1,200', pur_unit: 'ขวด' },
  bi: null, po: null, pr: null, purchestHistory: history,
  product: { product_stock: '1100', last_stock_date: ago(10) },
});
// คงเหลือสิ้นวันที่ควรได้ (ใหม่ → เก่า): 15/10 = 1100, 14/10 = 1100+110, 13/10 = 1210+95, 07/10 = 1305+80
const EXPECTED_ROWS = [['15/10/2026', 1100], ['14/10/2026', 1210], ['13/10/2026', 1305], ['07/10/2026', 1385]];

async function mockApi(page, calls) {
  const cached = new Set(['E2E-P1']);
  await page.route(/^https?:\/\/(?!localhost)/, async (route) => {
    const req = route.request();
    const url = req.url();
    if (!url.startsWith(MOCK)) return route.abort();
    const path = url.slice(MOCK.length);
    calls.push(`${req.method()} ${path}`);
    const json = (body) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (path.startsWith('/api/feature-flag/check')) return json({ status: true });
    if (path.startsWith('/api/purchest/history/')) {
      const code = decodeURIComponent(path.split('/').pop());
      return cached.has(code) ? json(purchestOf(code)) : route.fulfill({ status: 200, body: '' });
    }
    if (path.startsWith('/api/purchest/find')) {
      cached.add(JSON.parse(req.postData() ?? '{}').product_code);
      return json([{ ok: true }]);
    }
    if (req.method() === 'PATCH' && path.startsWith('/api/rt-request/')) {
      calls.push(`BODY ${req.postData()}`);
      return json({ ok: true });
    }
    if (path.startsWith('/api/rt-request')) return json(rtItems);
    return json({});
  });
}

const modal = (page) => page.locator('div[class*="max-h-[80vh]"]');

async function readHistory(page) {
  return modal(page).locator('table tbody tr').evaluateAll((rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent.trim())),
  );
}

async function checkModal(page, label, expected) {
  await page.getByText('สต็อกปัจจุบัน').waitFor({ timeout: 15000 });
  check(`${label}: ข้อมูลการซื้อขายโหลดเองโดยไม่ต้องกดปุ่ม`, true);
  const text = await modal(page).innerText();
  check(`${label}: ไม่มี "Invalid Date"`, !text.includes('Invalid Date'));

  const rows = await readHistory(page);
  const dates = rows.map((r) => r[0]);
  const keys = dates.map((d) => d.split('/').reverse().join('-'));
  check(`${label}: ประวัติเรียงใหม่ → เก่า`, keys.every((k, i) => i === 0 || keys[i - 1] > k), dates.join(', '));
  const balance = (r) => Number(r[r.length - 1].replace(/[^\d.-]/g, ''));
  if (expected.rows) {
    const got = rows.map((r) => [r[0], balance(r)]);
    check(`${label}: คงเหลือสิ้นวันถูกทุกแถว`, JSON.stringify(got) === JSON.stringify(expected.rows), JSON.stringify(got));
    check(`${label}: RTIN แยกเป็นคอลัมน์อื่นๆ`, rows.find((r) => r[0] === '14/10/2026')?.includes('-1') ?? false);
  }
  if (expected.anchor !== undefined && rows.length > 0) {
    check(`${label}: แถวล่าสุด = สต็อกที่โหลดมา`, balance(rows[0]) === expected.anchor, `${balance(rows[0])} vs ${expected.anchor}`);
  }
}

async function checkNoteGate(page, label) {
  const approve = page.getByRole('button', { name: 'ยืนยันอนุมัติ' });
  const reject = page.getByRole('button', { name: 'ปฏิเสธคำขอ' });
  check(`${label}: ยังไม่เลือกหมายเหตุ → ปุ่มกดไม่ได้`, (await approve.isDisabled()) && (await reject.isDisabled()));
  await modal(page).locator('label', { hasText: 'อื่นๆ' }).click();
  check(`${label}: เลือก "อื่นๆ" แต่ยังไม่พิมพ์ → ปุ่มกดไม่ได้`, await approve.isDisabled());
  await modal(page).locator('textarea').fill('E2E ตรวจหมายเหตุ');
  check(`${label}: พิมพ์หมายเหตุแล้ว → ปุ่มกดได้`, await approve.isEnabled());
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, locale: 'th-TH' });
try {
  if (ENV === 'local') {
    const calls = [];
    await page.addInitScript(() => {
      sessionStorage.setItem('access_token', 'e2e');
      sessionStorage.setItem('user_info', JSON.stringify({ user_id: 0, username: 'E2E local', emp_code: 'E2E', allowUsed: true }));
    });
    await mockApi(page, calls);
    await page.goto(`${BASE}/rt-approval`);
    await page.locator('tbody tr').first().waitFor();

    const openRow = (code) => page.locator('tbody tr', { hasText: code }).locator('td').nth(1).click();

    await openRow('E2E-P1');
    await checkModal(page, 'มีข้อมูลในระบบแล้ว', { rows: EXPECTED_ROWS, anchor: 1100 });
    check('มีข้อมูลในระบบแล้ว: ไม่ยิง /purchest/find', !calls.some((c) => c.includes('/api/purchest/find')));
    await checkNoteGate(page, 'มีข้อมูลในระบบแล้ว');
    await page.getByRole('button', { name: 'ยืนยันอนุมัติ' }).click();
    await page.getByText('อนุมัติ RT สำเร็จ!').waitFor();
    const body = JSON.parse(calls.find((c) => c.startsWith('BODY ')).slice(5));
    check('อนุมัติส่งหมายเหตุที่พิมพ์ไป', body.note === 'E2E ตรวจหมายเหตุ', JSON.stringify(body));
    await page.getByRole('button', { name: 'ตกลง' }).click();

    calls.length = 0;
    await openRow('E2E-P2');
    await checkModal(page, 'ยังไม่มีข้อมูลในระบบ', { rows: EXPECTED_ROWS, anchor: 1100 });
    const order = calls.filter((c) => c.includes('/api/purchest/'));
    check('ยังไม่มีข้อมูลในระบบ: ลองที่เก็บไว้ก่อน แล้วดึงใหม่ครั้งเดียว',
      order[0]?.startsWith('GET /api/purchest/history/') && order.filter((c) => c.includes('/find')).length === 1, order.join(' | '));
    check('ดึงอัตโนมัติไม่ขึ้นป๊อปอัป', !(await page.getByText('โหลดข้อมูลสำเร็จ!').isVisible()));
    await page.waitForTimeout(800); // รอแอนิเมชันหน้าต่างจบ ภาพจะได้ไม่ซ้อน
    await page.screenshot({ path: process.env.E2E_SCREENSHOT ?? 'rt-approval-e2e.png' });
  } else {
    if (!process.env.E2E_USER || !process.env.E2E_PASS) throw new Error('ต้องตั้ง E2E_USER / E2E_PASS');
    let historyResp = null;
    page.on('response', async (res) => {
      if (res.url().includes('/api/purchest/history/') && res.ok()) {
        try { historyResp = await res.json(); } catch { /* body ว่าง = ยังไม่มีในระบบ */ }
      }
    });
    await page.goto(`${BASE}/login`);
    const inputs = page.locator('input');
    await inputs.nth(0).fill(process.env.E2E_USER);
    await inputs.nth(1).fill(process.env.E2E_PASS);
    await page.keyboard.press('Enter');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
    await page.goto(`${BASE}/rt-approval`);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('tbody tr');
    if ((await rows.count()) === 0) {
      check('มีรายการรออนุมัติให้ตรวจ', false, 'ไม่มีรายการรออนุมัติตอนนี้ — รันใหม่ตอนมีรายการ');
    } else {
      await rows.first().locator('td').nth(1).click();
      await page.getByText('สต็อกปัจจุบัน').waitFor({ timeout: 30000 });
      const anchor = historyResp?.pro_stock ? Number(String(historyResp.pro_stock).replace(/,/g, '')) : undefined;
      await checkModal(page, 'รายการรออนุมัติแรก', { anchor });
      await checkNoteGate(page, 'รายการรออนุมัติแรก');
      await page.waitForTimeout(800); // รอแอนิเมชันหน้าต่างจบ ภาพจะได้ไม่ซ้อน
      await page.screenshot({ path: process.env.E2E_SCREENSHOT ?? 'rt-approval-e2e.png' });
      await page.keyboard.press('Escape'); // ปิดโดยไม่อนุมัติ/ปฏิเสธ
    }
  }
} catch (error) {
  check('สคริปต์รันจนจบ', false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${ENV}: ${results.length - failed}/${results.length} ผ่าน`);
process.exit(failed ? 1 : 0);
