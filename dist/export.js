const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  await page.pdf({
    path: 'resume-cv-IgorDescayrac.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
  });
  await browser.close();
})();
