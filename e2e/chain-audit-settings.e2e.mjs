// e2e หน้า /chain-audit-settings (ตั้งค่าแต้ม — คนหลังตรวจคนก่อน) ยิง backend จริง /api/chain-audit
//
// local (เขียนได้): backend จาก branch + ฐานทดสอบที่รัน migration chain_audit_reason แล้ว
//   E2E_ENV=local FRONTEND_URL=http://localhost:5176 E2E_USER=x E2E_PASS=x node e2e/chain-audit-settings.e2e.mjs
//   แก้แต้ม/ปิดเปิด/เพิ่มเหตุผล "E2E local …" แล้วคืนค่าเดิม · เหตุผลที่เพิ่มลบไม่ได้ (ไม่มีปุ่มลบ) จึงปิดไว้และลบด้วย SQL ท้ายรายงาน
// dev/prod (อ่านอย่างเดียว ไม่กดบันทึก):
//   E2E_ENV=prod FRONTEND_URL=https://... E2E_USER=... E2E_PASS=... node e2e/chain-audit-settings.e2e.mjs
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const ENV = process.env.E2E_ENV ?? 'local';
const BASE = (process.env.FRONTEND_URL ?? 'http://localhost:5176').replace(/\/$/, '');
const NEW_LABEL = `E2E ${ENV} เหตุผลทดสอบ ${Date.now()}`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
if (!process.env.E2E_USER || !process.env.E2E_PASS) throw new Error('ต้องตั้ง E2E_USER / E2E_PASS');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, locale: 'th-TH' });
let lastStages = null;
page.on('response', async (res) => {
  if (/\/api\/chain-audit\/reasons/.test(res.url()) && res.ok()) {
    try { lastStages = await res.json(); } catch { /* ไม่ใช่ JSON */ }
  }
});
const qcStage = () => lastStages?.find((s) => s.auditor_station === 'QC' && s.audited_station === 'PICKING');
const section = () => page.locator('section[data-stage="QC>PICKING"]');
const rowInputs = () => section().locator('li input[aria-label^="ข้อความเหตุผล"]');

try {
  await page.goto(`${BASE}/login`);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(process.env.E2E_USER);
  await inputs.nth(1).fill(process.env.E2E_PASS);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

  await page.goto(`${BASE}/`);
  // เมนูเริ่มซ่อนไว้จนโหลดสถานะปุ่มเสร็จ → รอให้ขึ้น (isVisible ไม่รอ)
  const menuShown = await page.getByText('ตั้งค่าแต้ม (คนหลังตรวจคนก่อน)').first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  check('เมนูหน้าแรกมี "ตั้งค่าแต้ม (คนหลังตรวจคนก่อน)"', menuShown);

  await page.goto(`${BASE}/chain-audit-settings`);
  await section().waitFor({ timeout: 15000 });
  check('แสดงครบ 3 ขั้นของสาย', (await page.locator('section[data-stage]').count()) === 3);
  const before = JSON.parse(JSON.stringify(qcStage()?.reasons ?? []));
  const labelsOnPage = await rowInputs().evaluateAll((els) => els.map((e) => e.value));
  check('QC → หยิบ แสดงเหตุผลตรงกับ API ตามลำดับ', JSON.stringify(labelsOnPage) === JSON.stringify(before.map((r) => r.label)), `${labelsOnPage.length} ข้อ`);

  if (ENV === 'local') {
    const codes = before.map((r) => r.code);
    check('ค่าเริ่มต้นจาก migration: 6 ข้อตามลำดับ', JSON.stringify(codes.slice(0, 6)) === JSON.stringify(['SKIPPED_ON_SHELF', 'WRONG_ITEM', 'FOUND_LATER', 'COUNT_MISMATCH', 'SWAPPED', 'IGNORED_CUSTOMER_NOTE']));
    check('ค่าเริ่มต้น: ข้อละ 1 แต้ม ข้อ 6 ปิด', before.slice(0, 6).every((r) => r.points === 1) && before[5]?.is_active === false && before.slice(0, 5).every((r) => r.is_active));

    // แก้: ข้อ 2 = 3 แต้ม, ปิดข้อ 1, เพิ่มเหตุผลใหม่ 2 แต้ม
    const pts = section().locator('input[aria-label="แต้มข้อ 2"]');
    await pts.fill('3');
    await section().getByRole('switch', { name: 'เปิดใช้ข้อ 1' }).click();
    await section().getByRole('button', { name: 'เพิ่มเหตุผล' }).click();
    const n = before.length + 1;
    await section().locator(`input[aria-label="ข้อความเหตุผลข้อ ${n}"]`).fill(NEW_LABEL);
    await section().locator(`input[aria-label="แต้มข้อ ${n}"]`).fill('2');
    check('แก้แล้วขึ้น "ยังไม่ได้บันทึก"', await section().getByText('ยังไม่ได้บันทึก').isVisible());
    await section().getByRole('button', { name: 'บันทึก' }).click();
    await page.getByText('บันทึกแล้ว').waitFor({ timeout: 10000 });
    const saved = qcStage().reasons;
    const added = saved.find((r) => r.label === NEW_LABEL);
    check('บันทึกแล้ว API คืนค่าใหม่', saved[1].points === 3 && saved[0].is_active === false && added?.points === 2 && added?.code.startsWith('CUSTOM_'), JSON.stringify(saved.map((r) => [r.code, r.points, r.is_active])));
    check('บันทึกคนแก้ล่าสุด', saved[1].updated_by_emp_code === 'E2E01');

    await page.reload();
    await section().waitFor();
    check('รีโหลดแล้วค่าที่บันทึกยังอยู่', (await section().locator('input[aria-label="แต้มข้อ 2"]').inputValue()) === '3');

    // ข้อความซ้ำ → ไม่ส่งไป backend
    await section().locator('input[aria-label="ข้อความเหตุผลข้อ 3"]').fill(saved[1].label);
    await section().getByRole('button', { name: 'บันทึก' }).click();
    check('ข้อความซ้ำถูกเตือนก่อนบันทึก', await page.getByText('ข้อความเหตุผลซ้ำกัน').isVisible({ timeout: 5000 }).catch(() => false));
    await page.getByRole('button', { name: 'ตกลง' }).click();
    await section().getByRole('button', { name: 'ยกเลิก' }).click();

    // คืนค่าเดิม + ปิดเหตุผลที่เพิ่ม (ลบไม่ได้)
    await section().locator('input[aria-label="แต้มข้อ 2"]').fill(String(before[1].points));
    await section().getByRole('switch', { name: 'เปิดใช้ข้อ 1' }).click();
    await section().getByRole('switch', { name: `เปิดใช้ข้อ ${n}` }).click();
    await section().getByRole('button', { name: 'บันทึก' }).click();
    await page.getByText('บันทึกแล้ว').waitFor({ timeout: 10000 });
    const restored = qcStage().reasons;
    check('คืนค่าเดิมแล้ว (เหตุผลที่เพิ่มถูกปิด)', JSON.stringify(restored.slice(0, before.length).map((r) => [r.code, r.points, r.is_active])) === JSON.stringify(before.map((r) => [r.code, r.points, r.is_active])) && restored.find((r) => r.label === NEW_LABEL)?.is_active === false);
    await page.screenshot({ path: process.env.E2E_SCREENSHOT ?? 'chain-audit-settings.png', fullPage: true });

    // คนที่ไม่มีสิทธิ์จัดการสินค้า: อ่านอย่างเดียว
    await page.evaluate(() => {
      const u = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      sessionStorage.setItem('user_info', JSON.stringify({ ...u, manage_product: 'No' }));
    });
    await page.reload();
    await section().waitFor();
    check('ไม่มีสิทธิ์: ช่องแก้ถูกล็อกและไม่มีปุ่มบันทึก', (await rowInputs().first().isDisabled()) && (await section().getByRole('button', { name: 'บันทึก' }).count()) === 0);
  } else {
    await page.screenshot({ path: process.env.E2E_SCREENSHOT ?? 'chain-audit-settings.png', fullPage: true });
  }
} catch (error) {
  check('สคริปต์รันจนจบ', false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${ENV}: ${results.length - failed}/${results.length} ผ่าน${ENV === 'local' ? ` · ลบเหตุผลทดสอบ: DELETE FROM chain_audit_reason WHERE label LIKE 'E2E local %';` : ''}`);
process.exit(failed ? 1 : 0);
