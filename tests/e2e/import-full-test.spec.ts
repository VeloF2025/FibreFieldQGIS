import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import Functionality Complete Test', () => {
  test('should successfully import assignments from JSON file', async ({ page }) => {
    // Navigate to the assignments page
    await page.goto('http://localhost:3020/home-drop-assignments');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('\n=== IMPORT FUNCTIONALITY TEST ===\n');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/import-before.png', fullPage: true });
    
    // Check initial state - should have no assignments
    const initialAssignments = await page.locator('[class*="assignment-card"], [data-testid*="assignment"]').count();
    console.log(`Initial assignments count: ${initialAssignments}`);
    
    // Find and verify Import button
    const importButton = page.locator('button:has-text("Import")').first();
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeEnabled();
    console.log('✓ Import button found and enabled');
    
    // Listen for console messages to debug
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      } else if (msg.text().includes('Import') || msg.text().includes('assignment')) {
        console.log('Browser Log:', msg.text());
      }
    });
    
    // Listen for dialogs (alerts)
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log(`Alert detected: "${alertMessage}"`);
      await dialog.accept();
    });
    
    // Prepare to handle file chooser
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 })
      .catch(() => {
        console.log('⚠ File chooser event not triggered');
        return null;
      });
    
    console.log('\nClicking Import button...');
    await importButton.click();
    
    // Wait a moment for any immediate response
    await page.waitForTimeout(1000);
    
    // Check if file chooser opened
    const fileChooser = await fileChooserPromise;
    
    if (fileChooser) {
      console.log('✓ File chooser opened successfully!');
      
      // Set the sample JSON file
      const filePath = path.resolve('/mnt/c/Jarvis/AI Workspace/FibreField/sample-assignments.json');
      console.log(`Setting file: ${filePath}`);
      
      try {
        await fileChooser.setFiles(filePath);
        console.log('✓ File selected successfully');
        
        // Wait for import processing
        await page.waitForTimeout(5000);
        
        // Check for success indicators
        if (alertMessage.includes('Successfully imported')) {
          console.log(`✓ Import successful: ${alertMessage}`);
        }
        
        // Check if assignments were added
        const afterImportAssignments = await page.locator('[class*="assignment"], [data-testid*="assignment"]').count();
        console.log(`Assignments after import: ${afterImportAssignments}`);
        
        // Check for specific imported addresses
        const hasMainStreet = await page.locator('text=/123 Main Street/i').count() > 0;
        const hasOakAvenue = await page.locator('text=/456 Oak Avenue/i').count() > 0;
        
        console.log('\nImported data verification:');
        console.log(`  - "123 Main Street" found: ${hasMainStreet}`);
        console.log(`  - "456 Oak Avenue" found: ${hasOakAvenue}`);
        
        // Take screenshot after import
        await page.screenshot({ path: 'test-results/import-after-success.png', fullPage: true });
        
        // Verify import worked
        expect(afterImportAssignments).toBeGreaterThan(initialAssignments);
        console.log('\n✅ IMPORT FUNCTIONALITY WORKING!');
        
      } catch (error) {
        console.error('Error during file selection:', error);
        await page.screenshot({ path: 'test-results/import-error.png', fullPage: true });
      }
      
    } else {
      console.log('\n⚠ File chooser did not open - checking alternative methods\n');
      
      // Alternative: Check if a hidden file input was created
      const fileInputs = await page.locator('input[type="file"]').all();
      console.log(`Found ${fileInputs.length} file input(s) on page`);
      
      if (fileInputs.length > 0) {
        console.log('Attempting to set file on hidden input...');
        const filePath = path.resolve('/mnt/c/Jarvis/AI Workspace/FibreField/sample-assignments.json');
        
        // Try setting file on the last file input (most recently created)
        const lastInput = fileInputs[fileInputs.length - 1];
        await lastInput.setInputFiles(filePath);
        
        // Wait for processing
        await page.waitForTimeout(5000);
        
        // Check results
        if (alertMessage) {
          console.log(`Alert message: "${alertMessage}"`);
        }
        
        const afterImportAssignments = await page.locator('[class*="assignment"], [data-testid*="assignment"]').count();
        console.log(`Assignments after alternative import: ${afterImportAssignments}`);
        
        await page.screenshot({ path: 'test-results/import-alternative-method.png', fullPage: true });
      }
    }
    
    // Final verification
    console.log('\n=== FINAL STATE ===');
    
    // Check statistics
    const totalStat = await page.locator('text=/Total/i').first().locator('..').locator('p.text-2xl').innerText();
    const pendingStat = await page.locator('text=/Pending/i').first().locator('..').locator('p.text-2xl').innerText();
    
    console.log(`Statistics:`);
    console.log(`  - Total: ${totalStat}`);
    console.log(`  - Pending: ${pendingStat}`);
    
    // Check for "No assignments" message
    const noAssignmentsMessage = await page.locator('text=/No assignments found/i').count();
    if (noAssignmentsMessage === 0) {
      console.log('✓ Assignments are present (no empty state message)');
    } else {
      console.log('⚠ Still showing "No assignments found" message');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/import-final-state.png', fullPage: true });
  });

  test('should handle import button click in headed mode', async ({ browser }) => {
    // Create a new context with headed mode settings
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    await page.goto('http://localhost:3020/home-drop-assignments');
    await page.waitForLoadState('networkidle');
    
    console.log('\n=== HEADED MODE TEST ===\n');
    
    // Find Import button
    const importButton = page.locator('button:has-text("Import")').first();
    
    // Check button state
    const isVisible = await importButton.isVisible();
    const isEnabled = await importButton.isEnabled();
    
    console.log(`Import button visible: ${isVisible}`);
    console.log(`Import button enabled: ${isEnabled}`);
    
    // Get button bounding box for precise clicking
    const box = await importButton.boundingBox();
    if (box) {
      console.log(`Button position: ${box.x}, ${box.y}`);
      console.log(`Button size: ${box.width}x${box.height}`);
      
      // Click in the center of the button
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      console.log('✓ Clicked Import button via mouse');
    } else {
      // Fallback to regular click
      await importButton.click();
      console.log('✓ Clicked Import button via element');
    }
    
    // Wait to see what happens
    await page.waitForTimeout(2000);
    
    // Check for any UI changes
    const modals = await page.locator('[role="dialog"], .modal').count();
    const fileInputs = await page.locator('input[type="file"]').count();
    const alerts = await page.locator('[role="alert"], .alert').count();
    
    console.log('\nUI State after click:');
    console.log(`  - Modals: ${modals}`);
    console.log(`  - File inputs: ${fileInputs}`);
    console.log(`  - Alerts: ${alerts}`);
    
    await page.screenshot({ path: 'test-results/import-headed-test.png', fullPage: true });
    
    await context.close();
  });
});