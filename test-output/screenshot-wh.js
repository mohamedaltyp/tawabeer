const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900 });
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/add-working-hours-pro.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log('Height:', height);
  
  // Full page
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/wh-full.png', fullPage: true });
  
  // Part 1: Add new section (0 ~ 1500)
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/wh-p1.png', clip: { x: 0, y: 0, width: 420, height: Math.min(1500, height) } });
  console.log('Part 1 saved');
  
  // Part 2: Current hours (1500 ~ end)
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/wh-p2.png', clip: { x: 0, y: 1500, width: 420, height: height - 1500 } });
  console.log('Part 2 saved');
  
  await browser.close();
  console.log('Done!');
})();
