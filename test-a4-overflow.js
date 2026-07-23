const puppeteer = require('puppeteer');

const A4_HEIGHT_PX = 1160;
const PAGES = [
  { label: 'FR', url: 'http://localhost:3456/' },
  { label: 'EN', url: 'http://localhost:3456/english/' },
];

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1280, height: 1600 });

  let failed = false;

  for (const { label, url } of PAGES) {
    await tab.goto(url, { waitUntil: 'networkidle0' });

    const result = await tab.evaluate((a4Height) => {
      const pageEl = document.querySelector('.page');
      const mainEl = document.querySelector('.main');
      if (!pageEl || !mainEl) return { error: 'Elements .page or .main not found' };

      const pageRect = pageEl.getBoundingClientRect();
      const mainRect = mainEl.getBoundingClientRect();

      const contentBottom = mainRect.bottom - pageRect.top;
      const overflow = Math.round(contentBottom - a4Height);

      return {
        a4Height,
        contentBottom: Math.round(contentBottom),
        overflow,
        overflows: overflow > 0,
      };
    }, A4_HEIGHT_PX);

    if (result.error) {
      console.error(`[${label}] ERROR:`, result.error);
      failed = true;
      continue;
    }

    console.log(`[${label}] A4 height   : ${result.a4Height}px`);
    console.log(`[${label}] Content ends: ${result.contentBottom}px`);

    if (result.overflows) {
      console.log(`[${label}] FAIL — content overflows by ${result.overflow}px`);
      failed = true;
    } else {
      console.log(`[${label}] PASS — content fits within A4 (${-result.overflow}px to spare)`);
    }
  }

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
