// e2e หน้า /admin-submit-shipping (MA-358) — เปิดหน้าจริง + ทดสอบด่านฝั่ง UI แล้ว capture หน้าจอ
// ตรวจ: หน้าโหลดสำหรับ MANAGER/ADMIN, ด่าน validation (shipping_id/emp_code บังคับ, ยกเลิกต้องแนบรูป),
//        และ user ที่ไม่ใช่ MANAGER/ADMIN เห็น "ไม่มีสิทธิ์"
//
// *** ไม่กดส่งจริง *** — หยุดที่ด่าน validation ก่อนยิง API ทุกเคส จึงไม่แตะ shipping จริง ปลอดภัยกับ prod
// (การบังคับสิทธิ์จริงอยู่ที่ BE MA-355: ตรวจ role + emp_code + shipping เป็นของคนขับคนนั้น — e2e นี้เช็คเฉพาะด่าน UI)
//
// local:  FE ชี้ VITE_API_URL_LOGISTIC ไป logistics-backend branch MA-355
//   E2E_ENV=local FRONTEND_URL=http://localhost:5174 E2E_USER=<manager> E2E_PASS=x \
//     E2E_SCREENSHOT=docs/e2e/images/ma-358-admin-submit-local.png \
//     node e2e/admin-submit-shipping.e2e.mjs
// dev/prod: เหมือนกัน เปลี่ยน FRONTEND_URL + creds (ยังไม่กดส่ง อ่าน/ตรวจด่าน UI อย่างเดียว)
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const ENV = process.env.E2E_ENV ?? 'local';
const BASE = (process.env.FRONTEND_URL ?? 'http://localhost:5174').replace(/\/$/, '');
const SHOT = process.env.E2E_SCREENSHOT ?? 'ma-358-admin-submit.png';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
if (!process.env.E2E_USER || !process.env.E2E_PASS) throw new Error('ต้องตั้ง E2E_USER / E2E_PASS (ต้องเป็น MANAGER/ADMIN)');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 1200 }, locale: 'th-TH' });
const heading = () => page.getByRole('heading', { name: 'ยืนยันส่งสำเร็จแทนคนขับ' });
const submitBtn = () => page.getByRole('button', { name: 'ยืนยันส่งสำเร็จแทนคนขับ' });
const swal = (title) => page.getByText(title, { exact: false });
const dismissSwal = async () => {
  const ok = page.getByRole('button', { name: 'OK' });
  if (await ok.isVisible().catch(() => false)) await ok.click();
};

try {
  await page.goto(`${BASE}/login`);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(process.env.E2E_USER);
  await inputs.nth(1).fill(process.env.E2E_PASS);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

  await page.goto(`${BASE}/admin-submit-shipping`);
  const loaded = await heading().waitFor({ timeout: 15000 }).then(() => true, () => false);
  check('MANAGER/ADMIN เห็นหน้า (ไม่ใช่ "ไม่มีสิทธิ์")', loaded && !(await swal('คุณไม่มีสิทธิ์เข้าถึงหน้านี้').isVisible().catch(() => false)));

  // ด่าน 1: กดส่งทั้งที่ว่าง → เตือน shipping_id
  await submitBtn().click();
  check('ว่าง → เตือนให้ระบุ shipping_id', await swal('กรุณาระบุ shipping_id').isVisible({ timeout: 5000 }).catch(() => false));
  await dismissSwal();

  // ด่าน 2: ใส่ shipping_id แต่ไม่ใส่ emp_code → เตือน emp_code
  await page.getByPlaceholder('เช่น 101 หรือ 101,102,103').fill('999999');
  await submitBtn().click();
  check('มี shipping_id แต่ไม่มี emp_code → เตือนรหัสคนขับ', await swal('กรุณาระบุรหัสคนขับ').isVisible({ timeout: 5000 }).catch(() => false));
  await dismissSwal();

  // ด่าน 3: เลือก "ลูกค้ายกเลิก" + ใส่ emp_code แต่ไม่แนบรูปยกเลิก → เตือนต้องแนบรูป (หยุดก่อนยิง API)
  await page.getByPlaceholder('เช่น 0745').fill('000000');
  await page.locator('select').first().selectOption('ลูกค้ายกเลิก');
  await submitBtn().click();
  check('ลูกค้ายกเลิก ไม่มีรูป → บังคับแนบรูปยกเลิก', await swal('ต้องแนบรูปหลักฐานยกเลิก').isVisible({ timeout: 5000 }).catch(() => false));
  await dismissSwal();

  await page.screenshot({ path: SHOT, fullPage: true });
  check('บันทึกภาพหน้าจอ', true, SHOT);

  // ด่านสิทธิ์: จำลอง user ที่ไม่ใช่ MANAGER/ADMIN → ต้องเห็น "ไม่มีสิทธิ์"
  await page.evaluate(() => {
    const u = JSON.parse(sessionStorage.getItem('user_info') || '{}');
    sessionStorage.setItem('user_info', JSON.stringify({ ...u, user_role: 'USER' }));
  });
  await page.reload();
  check('role USER → เห็น "ไม่มีสิทธิ์เข้าถึงหน้านี้"', await swal('คุณไม่มีสิทธิ์เข้าถึงหน้านี้').isVisible({ timeout: 10000 }).catch(() => false));
} catch (error) {
  check('สคริปต์รันจนจบ', false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${ENV}: ${results.length - failed}/${results.length} ผ่าน · (ด่านสิทธิ์จริงอยู่ที่ BE MA-355 — e2e นี้ไม่กดส่งจริง)`);
process.exit(failed ? 1 : 0);
