/**
 * Captures browser console output while loading and scrolling the page.
 * Run: npx playwright test capture-console.spec.js --reporter=line
 * Or: node capture-console.js (uses Playwright)
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  try {
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    await page.waitForTimeout(3000);

    // Simulate wheel scroll - Locomotive intercepts this
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(3000);

    console.log('\n--- DONE ---');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
