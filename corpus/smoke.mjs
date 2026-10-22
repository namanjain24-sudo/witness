import { chromium } from 'playwright';

const BASE = 'http://localhost:5178';
const results = [];

function record(id, desc, ok, detail = '') {
  results.push({ id, desc, ok, detail });
}

const browser = await chromium.launch();

async function fresh(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  return { ctx, page, errors, consoleErrors };
}

// B08 — console.error on every load
{
  const { ctx, page, consoleErrors } = await fresh();
  await page.goto(BASE);
  await page.waitForTimeout(400);
  record('B08', 'console.error on load', consoleErrors.some((t) => t.includes('legacyCartAdapter')), consoleErrors[0] ?? '');
  await ctx.close();
}

// B04 — product page with no reviews crashes
{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/product/mustard-oil-1l`);
  await page.waitForTimeout(500);
  const good = await page.goto(`${BASE}/product/atta-5kg`).then(() => page.waitForTimeout(400)).then(() => true);
  record('B04', 'no-reviews product throws', errors.some((e) => /reviews|undefined|null/i.test(e)), errors[0] ?? 'NO ERROR');
  await ctx.close();
}

// B07 — zero-result search crashes
{
  const { ctx, page, errors } = await fresh();
  await page.goto(BASE);
  await page.getByTestId('search').fill('zzzz');
  await page.waitForTimeout(700);
  record('B07', 'empty search results throw', errors.length > 0, errors[0] ?? 'NO ERROR');
  await ctx.close();
}

// B11 — direct /checkout with empty cart crashes
{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/checkout`);
  await page.waitForTimeout(500);
  record('B11', 'empty-cart checkout throws', errors.length > 0, errors[0] ?? 'NO ERROR');
  await ctx.close();
}

// B01 — Save for later is a no-op
{
  const { ctx, page } = await fresh();
  await page.goto(BASE);
  await page.getByTestId('add-atta-5kg').click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/cart`);
  const before = await page.content();
  await page.getByTestId('save-later').click();
  await page.waitForTimeout(400);
  const after = await page.content();
  record('B01', 'save-later does nothing', before === after, before === after ? 'DOM identical' : 'DOM changed');
  await ctx.close();
}

// B05 — quantity goes negative
{
  const { ctx, page } = await fresh();
  await page.goto(BASE);
  await page.getByTestId('add-atta-5kg').click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/cart`);
  for (let i = 0; i < 3; i++) await page.getByTestId('dec-atta-5kg').click();
  const qty = await page.getByTestId('qty-atta-5kg').innerText();
  record('B05', 'qty walks negative', Number(qty) < 0, `qty=${qty}`);
  await ctx.close();
}

// B18 — coupon double-applies
{
  const { ctx, page } = await fresh();
  await page.goto(BASE);
  await page.getByTestId('add-atta-5kg').click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/cart`);
  await page.getByTestId('coupon').fill('FIRST10');
  await page.getByTestId('apply-coupon').click();
  await page.getByTestId('apply-coupon').click();
  await page.waitForTimeout(200);
  const disc = await page.getByTestId('discount').innerText();
  record('B18', 'coupon stacks on double click', disc.includes('20'), `discount=${disc}`);
  await ctx.close();
}

// B09 — promo bar covers the order button on mobile
{
  const { ctx, page } = await fresh({ width: 390, height: 720 });
  await page.goto(BASE);
  await page.getByTestId('add-atta-5kg').click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/checkout`);
  await page.waitForTimeout(400);
  // A real user scrolls to the bottom to reach the order button — that is where
  // the fixed promo bar is waiting for it.
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(300);
  // The real signal is not geometry, it is that the click cannot land. Playwright
  // retries until it times out and names the element that intercepted the pointer.
  const btn = page.getByTestId('place-order');
  try {
    await btn.click({ timeout: 3000 });
    record('B09', 'promo bar blocks order button (390px)', false, 'click landed — not occluded');
  } catch (e) {
    const msg = String(e);
    const intercepted = /intercepts pointer events|not stable|timeout/i.test(msg);
    const culprit = msg.match(/<div class="promo-bar"[^>]*>/)?.[0] ?? 'pointer interception';
    record('B09', 'promo bar blocks order button (390px)', intercepted, culprit);
  }
  await ctx.close();
}

// D03 decoy — images must NOT be blurry (inline SVG, resolution independent)
{
  const { ctx, page } = await fresh();
  await page.goto(BASE);
  const src = await page.locator('.card img').first().getAttribute('src');
  record('D03', 'decoy: images are vector (not blurry)', !!src?.startsWith('data:image/svg+xml'), src?.slice(0, 30) ?? '');
  await ctx.close();
}

await browser.close();

console.log('\n  Corpus smoke check\n');
let fails = 0;
for (const r of results) {
  if (!r.ok) fails++;
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.id}  ${r.desc.padEnd(42)} ${r.detail.slice(0, 70)}`);
}
console.log(`\n  ${results.length - fails}/${results.length} seeded bugs behave as documented\n`);
process.exit(fails > 0 ? 1 : 0);
