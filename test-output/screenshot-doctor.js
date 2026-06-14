const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900 });
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/doctor-bookings-full.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log('Total height:', height);
  
  // Full page
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/doctor-full.png', fullPage: true });
  console.log('Full page saved');
  
  // Part 1: Header + Stats + Tabs + Bookings (0 ~ 1600)
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/doctor-p1.png', clip: { x: 0, y: 0, width: 420, height: Math.min(1600, height) } });
  console.log('Part 1 saved');
  
  // Part 2: Working Hours + Add Slot Clock (1600 ~ 3200)
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/doctor-p2.png', clip: { x: 0, y: 1600, width: 420, height: Math.min(1600, height - 1600) } });
  console.log('Part 2 saved');
  
  await browser.close();
  console.log('Done!');
})();
