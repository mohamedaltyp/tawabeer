const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 420, height: 900 });
  
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/add-slot-designs.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Get full page height
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log('Total height:', height);
  
  // Take full page screenshot
  await page.screenshot({
    path: 'C:/Users/admin/Desktop/tawabeer/test-output/add-slot-full.png',
    fullPage: true
  });
  console.log('Full page saved');
  
  // Split into 3 parts
  const partHeight = Math.ceil(height / 3);
  
  await page.screenshot({
    path: 'C:/Users/admin/Desktop/tawabeer/test-output/add-slot-p1.png',
    clip: { x: 0, y: 0, width: 420, height: Math.min(partHeight + 100, height) }
  });
  console.log('Part 1 saved');
  
  await page.screenshot({
    path: 'C:/Users/admin/Desktop/tawabeer/test-output/add-slot-p2.png',
    clip: { x: 0, y: partHeight + 100, width: 420, height: Math.min(partHeight, height) }
  });
  console.log('Part 2 saved');
  
  await page.screenshot({
    path: 'C:/Users/admin/Desktop/tawabeer/test-output/add-slot-p3.png',
    clip: { x: 0, y: (partHeight + 100) * 2, width: 420, height: height - (partHeight + 100) * 2 }
  });
  console.log('Part 3 saved');
  
  await browser.close();
  console.log('Done!');
})();
