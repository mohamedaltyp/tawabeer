const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set mobile viewport
  await page.setViewport({ width: 420, height: 900 });
  
  // Navigate to the HTML file
  await page.goto('file:///C:/Users/admin/Desktop/tawabeer/test-output/admin-bookings-v2.html', { waitUntil: 'networkidle2' });
  
  // Wait for font to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Get all design sections
  const sections = await page.$$('.design-section');
  
  for (let i = 0; i < sections.length; i++) {
    const path = `C:/Users/admin/Desktop/tawabeer/test-output/admin-design-${i + 1}.png`;
    await sections[i].screenshot({ path });
    console.log(`Screenshot ${i + 1} saved: ${path}`);
  }
  
  await browser.close();
  console.log('Done!');
})();
