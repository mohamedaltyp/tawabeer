const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 420, height: 900 });
  
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/admin-bookings-new.html', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Take full page screenshot
  await page.screenshot({
    path: 'C:/Users/admin/Desktop/tawabeer/test-output/admin-final.png',
    fullPage: true
  });
  console.log('Full page screenshot saved');
  
  await browser.close();
  console.log('Done!');
})();
