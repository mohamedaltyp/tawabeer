const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 430, height: 900 });
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/add-slot-pro.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log('Height:', height);
  
  // Find each card's position
  const cards = await page.evaluate(() => {
    const elements = document.querySelectorAll('.card');
    return Array.from(elements).map(el => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height };
    });
  });
  console.log('Cards:', JSON.stringify(cards));
  
  // Screenshot each design
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const pad = 40; // extra padding above
    const clipY = Math.max(0, c.top - pad);
    const clipH = c.height + pad + 20;
    
    await page.screenshot({
      path: `C:/Users/admin/Desktop/tawabeer/test-output/add-slot-pro-${i+1}.png`,
      clip: { x: 0, y: clipY, width: 430, height: clipH }
    });
    console.log(`Design ${i+1} saved (${clipH}px tall)`);
  }
  
  await browser.close();
  console.log('Done!');
})();
