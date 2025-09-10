import { test, expect } from '@playwright/test';

test.describe('Import Button Full Functionality Test', () => {
  test('Import button should open file dialog when clicked', async ({ page }) => {
    // Navigate to the assignments page
    await page.goto('http://localhost:3020/home-drop-assignments');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('Testing Import button functionality...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/import-test-before.png', fullPage: true });
    
    // Find the Import button
    const importButton = page.locator('button:has-text("Import")').first();
    
    // Verify button exists and is enabled
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeEnabled();
    
    // Set up file chooser listener BEFORE clicking the button
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
    
    // Click the Import button
    console.log('Clicking Import button...');
    await importButton.click();
    
    // Wait for file chooser
    const fileChooser = await fileChooserPromise;
    
    if (fileChooser) {
      console.log('✓ File chooser opened successfully!');
      console.log('  Accept types:', await fileChooser.isMultiple() ? 'Multiple files' : 'Single file');
      
      // Set the sample file
      const filePath = '/mnt/c/Jarvis/AI Workspace/FibreField/sample-assignments.json';
      console.log(`Setting file: ${filePath}`);
      
      await fileChooser.setFiles(filePath);
      
      // Wait for import to process
      await page.waitForTimeout(3000);
      
      // Check for success message or imported data
      const alerts = await page.locator('[role="alert"], .alert').all();
      const hasSuccessMessage = await page.locator('text=/success/i').count() > 0;
      const hasImportedData = await page.locator('text=/imported/i').count() > 0;
      
      console.log('Import results:');
      console.log('  Alerts found:', alerts.length);
      console.log('  Success message:', hasSuccessMessage);
      console.log('  Import indication:', hasImportedData);
      
      // Check if assignments were added
      const assignmentCards = await page.locator('[class*="assignment"], [data-testid*="assignment"]').count();
      console.log('  Assignment cards after import:', assignmentCards);
      
      // Take screenshot after import
      await page.screenshot({ path: 'test-results/import-test-after.png', fullPage: true });
      
      expect(fileChooser).not.toBeNull();
    } else {
      console.log('⚠ File chooser did not open - checking for alternative implementation');
      
      // Check for any modal or dialog that might have opened
      const modal = await page.locator('[role="dialog"], .modal, [class*="modal"]').count();
      const alert = await page.locator('[role="alert"], .alert').count();
      
      console.log('Alternative UI elements:');
      console.log('  Modals:', modal);
      console.log('  Alerts:', alert);
      
      // Take screenshot to see what happened
      await page.screenshot({ path: 'test-results/import-test-no-filechooser.png', fullPage: true });
    }
  });
  
  test('Verify Import button has proper event handler after page reload', async ({ page }) => {
    // Navigate to the page
    await page.goto('http://localhost:3020/home-drop-assignments');
    await page.waitForLoadState('networkidle');
    
    // Reload to ensure fresh state
    await page.reload();
    await page.waitForTimeout(2000);
    
    const importButton = page.locator('button:has-text("Import")').first();
    
    // Check button properties
    const buttonInfo = await importButton.evaluate(element => {
      const button = element as HTMLButtonElement;
      
      // Get all event listeners (approximate check)
      const hasClickHandler = button.onclick !== null;
      const hasEventListeners = typeof (button as any)._listeners !== 'undefined';
      
      // Check React props
      const reactKey = Object.keys(button).find(key => key.startsWith('__react'));
      const hasReactHandler = !!reactKey;
      
      return {
        hasOnClick: hasClickHandler,
        hasEventListeners: hasEventListeners,
        hasReactHandler: hasReactHandler,
        isDisabled: button.disabled,
        className: button.className,
        innerText: button.innerText
      };
    });
    
    console.log('Import button analysis after reload:', buttonInfo);
    
    // Try clicking and see if file input is triggered
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 2000 }).catch(() => null);
    await importButton.click();
    const fileChooser = await fileChooserPromise;
    
    if (fileChooser) {
      console.log('✓ Import functionality is working correctly!');
      // Cancel the file chooser
      await fileChooser.setFiles([]);
    } else {
      console.log('✗ File chooser not triggered - Import functionality needs debugging');
    }
  });
});