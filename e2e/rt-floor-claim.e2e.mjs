// e2e หน้า /rt-approval: คอลัมน์ "ชั้นแจ้ง" (คนหยิบกดอะไร ใคร ชั้นไหน) + เตือนเมื่อชั้นบอกไม่มีของแต่สต็อกในระบบยังมี
// ยิง backend จริง (GET /api/rt-request) — ไม่มี API จำลอง · อ่านอย่างเดียว ไม่กดอนุมัติ/ปฏิเสธ
//
// local  (backend จาก branch + ฐานทดสอบที่ seed ข้อมูล "E2E local" ไว้ ดู docs/e2e/rt-floor-claim-local-*.md):
//   E2E_ENV=local FRONTEND_URL=http://localhost:5176 E2E_USER=x E2E_PASS=x node e2e/rt-floor-claim.e2e.mjs
// dev/prod (อ่านอย่างเดียว ตรวจว่าทุกแถวแสดงตรงกับที่ API ส่งมา):
//   E2E_ENV=prod FRONTEND_URL=https://... E2E_USER=... E2E_PASS=... node e2e/rt-floor-claim.e2e.mjs
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const ENV = process.env.E2E_ENV ?? 'local';
const BASE = (process.env.FRONTEND_URL ?? 'http://localhost:5176').replace(/\/$/, '');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
if (!process.env.E2E_USER || !process.env.E2E_PASS) throw new Error('ต้องตั้ง E2E_USER / E2E_PASS');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: 'th-TH' });
let apiItems = null;
page.on('response', async (res) => {
  if (/\/api\/rt-request(\?|$)/.test(res.url()) && res.request().method() === 'GET' && res.ok()) {
    try { apiItems = await res.json(); } catch { /* ไม่ใช่ JSON */ }
  }
});

try {
  await page.goto(`${BASE}/login`);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(process.env.E2E_USER);
  await inputs.nth(1).fill(process.env.E2E_PASS);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  await page.goto(`${BASE}/rt-approval`);
  await page.getByRole('button', { name: 'ทั้งหมด', exact: true }).click();
  await page.waitForLoadState('networkidle');

  check('API ส่ง floor_claim และ product.stock มาทุกรายการ',
    Array.isArray(apiItems) && apiItems.every((i) => 'floor_claim' in i && i.product && 'stock' in i.product),
    Array.isArray(apiItems) ? `${apiItems.length} รายการ` : 'ไม่ได้รับรายการ');
  check('ตารางมีคอลัมน์ "ชั้นแจ้ง"', (await page.locator('thead th', { hasText: 'ชั้นแจ้ง' }).count()) === 1);

  // แต่ละแถวต้องแสดงตรงกับ API: ใครแจ้ง สถานะอะไร และเตือนเฉพาะเมื่อชั้นบอกไม่มีของแต่สต็อกมี
  const rows = await page.locator('tbody tr').evaluateAll((trs) =>
    trs.map((tr) => {
      const th = [...tr.closest('table').querySelectorAll('thead th')].map((t) => t.textContent.trim());
      const td = [...tr.querySelectorAll('td')].map((t) => t.textContent.trim());
      return { code: td[th.indexOf('รหัสสินค้า')], claim: td[th.indexOf('ชั้นแจ้ง')] ?? '' };
    }),
  );
  const shouldWarn = (i) => !!i.floor_claim?.claims_no_stock && (i.product.stock?.amount ?? 0) > 0;
  const mismatches = [];
  for (const item of apiItems ?? []) {
    // จับแถวด้วยรหัสสินค้า (หลายรายการอยู่ใน SH เดียวกันได้)
    const row = rows.find((r) => r.code?.startsWith(item.product.code));
    if (!row) continue;
    const c = item.floor_claim;
    const shown = c ? row.claim.includes(c.emp_code ?? '') && (c.status === 'picking' || row.claim.includes(c.status)) : row.claim.includes('ชั้นยังไม่ได้แจ้ง');
    const warned = row.claim.includes('ตรวจที่ชั้นก่อนอนุมัติ');
    if (!shown || warned !== shouldWarn(item)) mismatches.push(`${item.so_running}: shown=${shown} warned=${warned}`);
  }
  check('ทุกแถวแสดงคำแจ้งจากชั้นและคำเตือนตรงกับ API', mismatches.length === 0, mismatches.join(' | ') || `${rows.length} แถว`);

  if (ENV === 'local') {
    // ข้อมูล seed: SO1 หมด+สต็อก 317 (เตือน) · SO2 ไม่เจอ+สต็อก 0 (ไม่เตือน) · SO3 เสีย (ไม่เตือน) · SO4 ยังไม่ได้กด
    const byShSo = (so) => apiItems.find((i) => i.so_running === so);
    check('seed SO1: หมด โดย E2E02 ชั้น 3 + เตือน', shouldWarn(byShSo('E2EL-SO1')) && byShSo('E2EL-SO1').floor_claim.emp_floor === '3');
    check('seed SO2: ไม่เจอ แต่สต็อก 0 → ไม่เตือน', byShSo('E2EL-SO2').floor_claim.claims_no_stock && !shouldWarn(byShSo('E2EL-SO2')));
    check('seed SO3: เสีย → แสดงแต่ไม่นับว่าไม่มีของ', byShSo('E2EL-SO3').floor_claim.status === 'เสีย' && !byShSo('E2EL-SO3').floor_claim.claims_no_stock);
    check('seed SO4: ชั้นยังไม่ได้กด → null', byShSo('E2EL-SO4').floor_claim === null);
  }

  // เปิดรายการรออนุมัติที่มีคำเตือน (ถ้ามี) ดูแผง "ชั้นแจ้ง" ในหน้าต่าง แล้วปิดโดยไม่กดอะไร
  await page.getByRole('button', { name: 'รออนุมัติ', exact: true }).click();
  await page.waitForTimeout(300);
  const warnRow = page.locator('tbody tr', { hasText: 'ตรวจที่ชั้นก่อนอนุมัติ' }).first();
  if ((await warnRow.count()) > 0) {
    await warnRow.locator('td').nth(1).click();
    const panel = page.locator('div[class*="max-h-[80vh]"]');
    await panel.getByText('สต็อกในระบบ', { exact: true }).waitFor();
    check('หน้าต่างแสดงแผงชั้นแจ้ง + สต็อกในระบบ + คำเตือน', (await panel.getByText('ตรวจที่ชั้นก่อนอนุมัติ').count()) > 0);
    await page.waitForTimeout(800);
    await page.screenshot({ path: process.env.E2E_SCREENSHOT_MODAL ?? 'rt-floor-claim-modal.png' });
    await page.keyboard.press('Escape');
  } else {
    check('มีรายการรออนุมัติที่ต้องเตือนให้เปิดดู', ENV !== 'local', 'ไม่มีตอนนี้');
  }
  await page.getByRole('button', { name: 'ทั้งหมด', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.env.E2E_SCREENSHOT ?? 'rt-floor-claim.png', fullPage: true });
} catch (error) {
  check('สคริปต์รันจนจบ', false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${ENV}: ${results.length - failed}/${results.length} ผ่าน`);
process.exit(failed ? 1 : 0);
