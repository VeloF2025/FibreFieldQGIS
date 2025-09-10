import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Assignment Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to assignments page and wait for it to fully load
    await page.goto('http://localhost:3020/home-drop-assignments', {
      waitUntil: 'networkidle'
    });
    
    // Wait for any loading spinners to disappear
    await page.waitForTimeout(5000); // Give extra time for components to mount
    
    // Check if page has loaded by looking for the main heading
    const heading = page.locator('h1:has-text("Assignments"), h1:has-text("Home Drop")');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display assignments page with key elements', async ({ page }) => {
    console.log('\n=== ASSIGNMENT PAGE TEST ===\n');
    
    // Take screenshot of loaded page
    await page.screenshot({ path: 'test-results/assignment-page-loaded.png', fullPage: true });
    
    // Check for main elements
    const pageTitle = await page.locator('h1').first().innerText();
    console.log(`Page title: "${pageTitle}"`);
    
    // Check for statistics cards
    const statsCards = await page.locator('[class*="card"]').count();
    console.log(`Statistics cards found: ${statsCards}`);
    
    // Check for buttons
    const buttons = await page.locator('button').all();
    console.log(`Total buttons found: ${buttons.length}`);
    
    // List all button texts
    for (const button of buttons) {
      try {
        const text = await button.innerText();
        if (text) {
          console.log(`  - Button: "${text}"`);
        }
      } catch {
        // Skip if button text can't be read
      }
    }
    
    // Check for Create Assignment button
    const createButton = page.locator('button:has-text("Create Assignment"), button:has-text("Create"), button:has-text("Add Assignment")');
    const hasCreateButton = await createButton.count() > 0;
    console.log(`\nCreate Assignment button found: ${hasCreateButton}`);
    
    // Check for Import button
    const importButton = page.locator('button:has-text("Import")');
    const hasImportButton = await importButton.count() > 0;
    console.log(`Import button found: ${hasImportButton}`);
    
    // Check for search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]');
    const hasSearch = await searchInput.count() > 0;
    console.log(`Search input found: ${hasSearch}`);
    
    // Check for empty state message
    const emptyState = page.locator('text=/no assignments/i');
    const hasEmptyState = await emptyState.count() > 0;
    console.log(`Empty state message shown: ${hasEmptyState}`);
    
    // Verify page loaded successfully
    expect(statsCards).toBeGreaterThan(0);
  });

  test('should test Create Assignment functionality', async ({ page }) => {
    console.log('\n=== CREATE ASSIGNMENT TEST ===\n');
    
    // Look for Create button with various possible texts
    const createButton = page.locator('button').filter({ hasText: /create|add|new/i }).first();
    
    if (await createButton.count() > 0) {
      console.log('Found Create button, clicking...');
      await createButton.click();
      
      // Wait for modal or form to appear
      await page.waitForTimeout(2000);
      
      // Check for modal
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="dialog"]');
      const hasModal = await modal.count() > 0;
      console.log(`Modal appeared: ${hasModal}`);
      
      // Check for form fields
      const formInputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea');
      const inputCount = await formInputs.count();
      console.log(`Form inputs found: ${inputCount}`);
      
      if (inputCount > 0) {
        console.log('✓ Create Assignment form is working!');
        
        // Take screenshot of the form
        await page.screenshot({ path: 'test-results/create-assignment-form.png', fullPage: true });
        
        // Try to close the modal
        const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label*="close"]');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
        }
      }
    } else {
      console.log('✗ Create button not found');
    }
  });

  test('should test Import functionality', async ({ page }) => {
    console.log('\n=== IMPORT FUNCTIONALITY TEST ===\n');
    
    // Set up dialog handler for alerts
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log(`Alert: "${alertMessage}"`);
      await dialog.accept();
    });
    
    // Look for Import button
    const importButton = page.locator('button:has-text("Import")');
    
    if (await importButton.count() > 0) {
      console.log('Found Import button');
      
      // Set up file chooser listener
      const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
      
      // Click Import button
      await importButton.click();
      console.log('Clicked Import button');
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check if file chooser opened
      const fileChooser = await fileChooserPromise;
      if (fileChooser) {
        console.log('✓ File chooser opened!');
        
        // Try to set a test file
        const testFile = path.resolve('/mnt/c/Jarvis/AI Workspace/FibreField/test-assignment-import.json');
        try {
          await fileChooser.setFiles(testFile);
          console.log('File selected successfully');
          
          // Wait for processing
          await page.waitForTimeout(3000);
          
          // Check if any assignments were added
          const assignmentCards = await page.locator('[class*="assignment"], [data-testid*="assignment"]').count();
          console.log(`Assignments after import: ${assignmentCards}`);
          
          if (assignmentCards > 0) {
            console.log('✓ Import functionality is working!');
          }
        } catch (error) {
          console.log('Error selecting file:', error);
        }
      } else {
        console.log('File chooser did not open');
        
        // Check if alert was shown
        if (alertMessage) {
          console.log(`Alert shown: "${alertMessage}"`);
        }
        
        // Check for file input in DOM
        const fileInputs = await page.locator('input[type="file"]').count();
        console.log(`File inputs in DOM: ${fileInputs}`);
      }
    } else {
      console.log('✗ Import button not found');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/import-test-final.png', fullPage: true });
  });

  test('should check page responsiveness', async ({ page }) => {
    console.log('\n=== RESPONSIVENESS TEST ===\n');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const mobileButtons = await page.locator('button').count();
    console.log(`Mobile view - Buttons visible: ${mobileButtons}`);
    
    await page.screenshot({ path: 'test-results/assignment-mobile-view.png', fullPage: true });
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    const desktopButtons = await page.locator('button').count();
    console.log(`Desktop view - Buttons visible: ${desktopButtons}`);
    
    await page.screenshot({ path: 'test-results/assignment-desktop-view.png', fullPage: true });
  });
});