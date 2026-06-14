const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900 });
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/multi-slot-design.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log('Height:', height);
  
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/multi-slot-full.png', fullPage: true });
  
  // Part 1: Header + Templates + First Days
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/multi-slot-p1.png', clip: { x: 0, y: 0, width: 420, height: Math.min(1400, height) } });
  console.log('Part 1 saved');
  
  // Part 2: Rest of days + Summary + Save
  await page.screenshot({ path: 'C:/Users/admin/Desktop/tawabeer/test-output/multi-slot-p2.png', clip: { x: 0, y: 1400, width: 420, height: height - 1400 } });
  console.log('Part 2 saved');
  
  await browser.close();
  console.log('Done!');
})();
