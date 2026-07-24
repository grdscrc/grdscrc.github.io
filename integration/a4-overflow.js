const puppeteer = require('puppeteer');

const A4_HEIGHT_PX = 1160;
const PAGES = [
  { label: 'FR', url: 'http://localhost:3456/' },
  { label: 'EN', url: 'http://localhost:3456/english/' },
];

const SCENARIOS = [
  {
    label: 'desktop (1280px)',
    viewport: { width: 1280, height: 1600 },
    // Height constraint active: content must fit within A4
    check: (contentBottom) => ({
      pass: contentBottom <= A4_HEIGHT_PX,
      message: (pass, overflow) =>
        pass
          ? `PASS — fits within A4 (${-overflow}px to spare)`
          : `FAIL — overflows by ${overflow}px`,
    }),
  },
  {
    label: 'narrow (792px)',
    viewport: { width: 792, height: 2000 },
    // Height constraint must be inactive: overflow must not be hidden
    check: (contentBottom, overflowStyle) => ({
      pass: overflowStyle !== 'hidden',
      message: (pass) =>
        pass
          ? `PASS — overflow not hidden, content not clipped (${contentBottom}px)`
          : `FAIL — height constraint still active at narrow viewport`,
    }),
  },
];

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  let failed = false;

  for (const scenario of SCENARIOS) {
    const tab = await browser.newPage();
    await tab.setViewport(scenario.viewport);

    console.log(`\n── ${scenario.label} ──`);

    for (const { label, url } of PAGES) {
      await tab.goto(url, { waitUntil: 'networkidle0' });

      const result = await tab.evaluate((a4Height) => {
        const pageEl = document.querySelector('.page');
        const mainEl = document.querySelector('.main');
        if (!pageEl || !mainEl) return { error: 'Elements .page or .main not found' };

        const pageRect = pageEl.getBoundingClientRect();
        const mainRect = mainEl.getBoundingClientRect();
        const contentBottom = Math.round(mainRect.bottom - pageRect.top);
        const overflow = contentBottom - a4Height;
        const overflowStyle = window.getComputedStyle(pageEl).overflow;

        return { contentBottom, overflow, overflowStyle };
      }, A4_HEIGHT_PX);

      if (result.error) {
        console.error(`  [${label}] ERROR: ${result.error}`);
        failed = true;
        continue;
      }

      const { pass, message } = scenario.check(result.contentBottom, result.overflowStyle);
      console.log(`  [${label}] content ends at ${result.contentBottom}px — ${message(pass, result.overflow)}`);
      if (!pass) failed = true;
    }

    await tab.close();
  }

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
