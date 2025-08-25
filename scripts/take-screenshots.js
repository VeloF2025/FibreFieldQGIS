import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function takeScreenshots() {
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  // Launch browser with mobile viewport
  const browser = await chromium.launch({ 
    headless: true // Run in headless mode for speed
  });
  
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Screenshot function
  async function captureScreen(name, urlPath = '/') {
    console.log(`Capturing ${name}...`);
    await page.goto(`http://localhost:5173${urlPath}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for animations
    await page.screenshot({ 
      path: `${screenshotsDir}/${name}.png`,
      fullPage: true 
    });
  }

  try {
    // 1. Login page
    await captureScreen('01-login', '/');
    
    // Login to access protected pages
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
    
    // 2. Dashboard
    await captureScreen('02-dashboard', '/dashboard');
    
    // 3. Project selection
    const selectProjectBtn = await page.$('text=Select Project');
    if (selectProjectBtn) {
      await selectProjectBtn.click();
      await page.waitForTimeout(500);
      await captureScreen('03-project-selection', '/dashboard');
      
      // Select a project if available
      const projectButton = await page.$('button:has-text("Select")');
      if (projectButton) {
        await projectButton.click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    // 4. Pole capture form
    await page.goto('http://localhost:5173/capture');
    await page.waitForLoadState('networkidle');
    await captureScreen('04-pole-capture-form', '/capture');
    
    // 5. Photo upload section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await captureScreen('05-photo-upload-section', '/capture');
    
    // 6. My poles list
    await page.goto('http://localhost:5173/my-poles');
    await page.waitForLoadState('networkidle');
    await captureScreen('06-my-poles-list', '/my-poles');
    
    // 7. Offline queue
    await page.goto('http://localhost:5173/offline-queue');
    await page.waitForLoadState('networkidle');
    await captureScreen('07-offline-queue', '/offline-queue');
    
    // 8. Settings
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle');
    await captureScreen('08-settings', '/settings');
    
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();