import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  
  const page = await context.newPage();
  
  console.log('Loading app...');
  await page.goto('https://pole-planting-app.web.app');
  await page.waitForTimeout(3000);
  
  // Click project card
  const projectCard = await page.$('.project-card');
  if (projectCard) {
    console.log('Clicking project card...');
    await projectCard.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, '../screenshots/improved-layout-full.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true
    });
    console.log(`Screenshot saved to: ${screenshotPath}`);
  }
  
  await page.waitForTimeout(5000);
  await browser.close();
})();