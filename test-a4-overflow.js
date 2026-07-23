const puppeteer = require('puppeteer');

const A4_HEIGHT_PX = 1160;
const URL = 'http://localhost:3456/';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1600 });
  await page.goto(URL, { waitUntil: 'networkidle0' });

  const result = await page.evaluate((a4Height) => {
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

  await browser.close();

  if (result.error) {
    console.error('ERROR:', result.error);
    process.exit(1);
  }

  console.log(`A4 height   : ${result.a4Height}px`);
  console.log(`Content ends: ${result.contentBottom}px`);

  if (result.overflows) {
    console.log(`FAIL — content overflows by ${result.overflow}px`);
    process.exit(1);
  } else {
    console.log(`PASS — content fits within A4 (${-result.overflow}px to spare)`);
    process.exit(0);
  }
})();
