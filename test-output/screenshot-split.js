const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 420, height: 900 });
  
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/admin-bookings-new.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Screenshot 1: Stats + Tabs + Cards (top part)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'C:/Users/admin/Desktop/tawabeer/test-output/admin-final-part1.png',
    clip: { x: 0, y: 0, width: 420, height: 1200 }
  });
  console.log('Part 1 saved');
  
  // Screenshot 2: Working Hours + Add Slot
  await page.screenshot({
    path: 'C:/Users/admin/Desktop/tawabeer/test-output/admin-final-part2.png',
    clip: { x: 0, y: 1200, width: 420, height: 1175 }
  });
  console.log('Part 2 saved');
  
  await browser.close();
  console.log('Done!');
})();
