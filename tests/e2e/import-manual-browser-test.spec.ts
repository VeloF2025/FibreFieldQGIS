import { test, expect } from '@playwright/test';

test.describe('Manual Browser Import Test', () => {
  test('Open browser and wait for manual import test', async ({ page }) => {
    // Navigate to the assignments page
    await page.goto('http://localhost:3020/home-drop-assignments');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('\n=== MANUAL BROWSER TEST ===\n');
    console.log('Browser opened at: http://localhost:3020/home-drop-assignments');
    console.log('\nPLEASE MANUALLY TEST THE IMPORT BUTTON:');
    console.log('1. Click the Import button');
    console.log('2. Check if an alert appears');
    console.log('3. Check if a file dialog opens');
    console.log('4. Select the sample-assignments.json file if possible');
    console.log('\n');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/manual-test-initial.png', fullPage: true });
    
    // Listen for dialogs
    page.on('dialog', async dialog => {
      console.log(`✓ Alert detected: "${dialog.message()}"`);
      await dialog.accept();
    });
    
    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('Import')) {
        console.log(`Console: ${msg.text()}`);
      }
    });
    
    // Listen for file chooser
    page.on('filechooser', async fileChooser => {
      console.log('File chooser opened!');
    });
    
    // Keep browser open for manual testing
    await page.waitForTimeout(30000); // Wait 30 seconds
    
    console.log('Test completed. Check screenshots in test-results folder.');
  });
});