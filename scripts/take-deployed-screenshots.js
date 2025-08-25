import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function takeScreenshots() {
  // Create screenshots directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const screenshotsDir = path.join(__dirname, '../screenshots', `mobile-${timestamp}`);
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Launch browser with mobile viewport
  const browser = await chromium.launch({ 
    headless: false // Show browser for debugging
  });
  
  // Mobile context for budget Android phone
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Base URL for deployed app
  const BASE_URL = 'https://pole-planting-app.web.app';
  
  // Screenshot function with error handling
  async function captureScreen(name, description = '') {
    console.log(`\n📸 Capturing ${name}...`);
    if (description) console.log(`   ${description}`);
    
    try {
      await page.screenshot({ 
        path: path.join(screenshotsDir, `${name}.png`),
        fullPage: true 
      });
      console.log(`   ✅ Saved: ${name}.png`);
    } catch (error) {
      console.error(`   ❌ Failed to capture ${name}:`, error.message);
    }
  }

  try {
    console.log('🚀 Starting screenshot capture for PolePlantingApp');
    console.log(`📱 Mobile viewport: 360x640 (Budget Android)`);
    console.log(`🌐 URL: ${BASE_URL}`);
    console.log(`📁 Output directory: ${screenshotsDir}\n`);

    // 1. Navigate to app
    console.log('Loading app...');
    await page.goto(BASE_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 // Shorter timeout
    });
    await page.waitForTimeout(5000); // Wait longer for Firebase to load projects
    
    // 2. Dashboard/Home screen
    await captureScreen('01-dashboard', 'Initial app view with project selector');
    
    // 3. Check for project card and click it
    const projectCard = await page.$('.project-card');
    if (projectCard) {
      console.log('Found project card, clicking to select...');
      await projectCard.click();
      await page.waitForTimeout(2000);
      await captureScreen('02-project-selected', 'After selecting a project');
      
      // Look for New Capture button after selection
      const newCaptureButton = await page.$('.btn-new-capture');
      if (newCaptureButton) {
        console.log('Found New Capture button');
        await captureScreen('03-with-new-capture-button', 'Project selected with New Capture button visible');
      }
    }
    
    // 4. Look for New Capture button
    const newCaptureButton = await page.$('button:has-text("New Capture"), button:has-text("Start New Capture"), button:has-text("Start Capture")');
    if (newCaptureButton) {
      const buttonBox = await newCaptureButton.boundingBox();
      console.log(`New Capture button size: ${buttonBox?.width}x${buttonBox?.height}px`);
      
      await newCaptureButton.click();
      await page.waitForTimeout(2000);
      await captureScreen('04-wizard-step1', 'First step of the capture wizard');
      
      // Check for photo capture areas
      const photoBoxes = await page.$$('.photo-box, .capture-box, [class*="photo"]');
      if (photoBoxes.length > 0) {
        console.log(`Found ${photoBoxes.length} photo capture areas`);
        await captureScreen('05-photo-capture-ui', 'Photo capture interface');
      }
      
      // Check form inputs
      const inputs = await page.$$('input:visible, textarea:visible');
      if (inputs.length > 0) {
        console.log(`Found ${inputs.length} form inputs`);
        
        // Scroll to show inputs
        const firstInput = inputs[0];
        await firstInput.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await captureScreen('06-form-inputs', 'Form input fields');
        
        // Check input sizes
        for (let i = 0; i < Math.min(3, inputs.length); i++) {
          const box = await inputs[i].boundingBox();
          const type = await inputs[i].getAttribute('type') || 'text';
          console.log(`   Input ${i + 1} (${type}): ${box?.height}px height`);
        }
      }
      
      // Check navigation buttons
      const navButtons = await page.$$('button:visible');
      console.log(`\nChecking button sizes (should be ≥ 48px):`);
      for (const button of navButtons.slice(0, 5)) {
        const text = await button.textContent();
        const box = await button.boundingBox();
        if (box) {
          const adequate = box.height >= 48 ? '✅' : '⚠️';
          console.log(`   ${adequate} "${text}": ${box.width}x${box.height}px`);
        }
      }
    }
    
    // 5. Check for incomplete captures or list view
    const backButton = await page.$('button:has-text("Back"), button:has-text("Cancel")');
    if (backButton) {
      await backButton.click();
      await page.waitForTimeout(1500);
    }
    
    // Look for any lists or data
    const listItems = await page.$$('.capture-item, .list-item, [class*="card"]');
    if (listItems.length > 0) {
      await captureScreen('07-list-view', `List view with ${listItems.length} items`);
    }
    
    // 6. Check console for errors
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    // 7. Performance check
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart),
        loadComplete: Math.round(perf.loadEventEnd - perf.loadEventStart),
        totalSize: Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024) || 0
      };
    });
    
    console.log('\n📊 Performance Metrics:');
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   Page Load Complete: ${metrics.loadComplete}ms`);
    if (metrics.totalSize) {
      console.log(`   Memory Usage: ${metrics.totalSize}MB`);
    }
    
    if (consoleMessages.length > 0) {
      console.log('\n⚠️  Console Errors Found:');
      consoleMessages.forEach(msg => console.log(`   - ${msg}`));
    }
    
    // Generate summary report
    const report = `# PolePlantingApp Mobile Screenshot Report
Generated: ${new Date().toLocaleString()}
URL: ${BASE_URL}
Viewport: 360x640 (Mobile)

## Screenshots Captured
${fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).map(f => `- ${f}`).join('\n')}

## Mobile Compatibility Checklist
- [ ] All touch targets ≥ 48x48px
- [ ] Text readable at mobile size
- [ ] No horizontal scrolling
- [ ] Forms easy to fill with thumb
- [ ] High contrast for outdoor visibility
- [ ] Loading states visible
- [ ] Error states clear

## Performance
- DOM Content Loaded: ${metrics.domContentLoaded}ms
- Page Load Complete: ${metrics.loadComplete}ms
${metrics.totalSize ? `- Memory Usage: ${metrics.totalSize}MB` : ''}

## Console Errors
${consoleMessages.length > 0 ? consoleMessages.map(m => `- ${m}`).join('\n') : 'No errors found ✅'}
`;
    
    fs.writeFileSync(path.join(screenshotsDir, 'report.md'), report);
    
    console.log('\n✅ Screenshot capture complete!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    console.log(`📄 Report generated: ${path.join(screenshotsDir, 'report.md')}`);
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will remain open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
takeScreenshots().catch(console.error);