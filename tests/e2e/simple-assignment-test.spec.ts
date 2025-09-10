import { test, expect } from '@playwright/test';

test.describe('Simple Assignment Test', () => {
  test('Test import and create buttons after page loads', async ({ page }) => {
    console.log('\n=== SIMPLE ASSIGNMENT TEST ===\n');
    
    // Navigate to the assignments page
    await page.goto('http://localhost:3020/home-drop-assignments');
    
    // Wait for initialization (max 10 seconds)
    console.log('Waiting for page to initialize...');
    await page.waitForTimeout(6000); // Wait for the 5 second timeout + 1 second buffer
    
    // Check if the page has loaded by looking for any button
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on the page`);
    
    // Take a screenshot to see current state
    await page.screenshot({ path: 'test-results/simple-test-after-wait.png', fullPage: true });
    
    // Look for the main heading
    const headings = await page.locator('h1').all();
    for (const heading of headings) {
      const text = await heading.innerText();
      console.log(`Found heading: "${text}"`);
    }
    
    // Check for Import button
    const importButton = page.locator('button:has-text("Import")');
    const hasImport = await importButton.count() > 0;
    console.log(`Import button found: ${hasImport}`);
    
    if (hasImport) {
      // Test Import button click
      console.log('Testing Import button...');
      
      // Set up dialog listener
      let alertShown = false;
      page.on('dialog', async dialog => {
        console.log(`Alert shown: "${dialog.message()}"`);
        alertShown = true;
        await dialog.accept();
      });
      
      // Click Import button
      await importButton.click();
      await page.waitForTimeout(2000);
      
      if (alertShown) {
        console.log('✅ Import button triggers alert');
      }
      
      // Check for file input
      const fileInputs = await page.locator('input[type="file"]').count();
      console.log(`File inputs in DOM: ${fileInputs}`);
      
      if (fileInputs > 0) {
        console.log('✅ Import button creates file input');
      }
    }
    
    // Check for Create button
    const createButton = page.locator('button').filter({ hasText: /create|add|new/i }).first();
    const hasCreate = await createButton.count() > 0;
    console.log(`Create button found: ${hasCreate}`);
    
    if (hasCreate) {
      // Test Create button click
      console.log('Testing Create button...');
      await createButton.click();
      await page.waitForTimeout(2000);
      
      // Check for modal or form
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
      const hasModal = await modal.count() > 0;
      console.log(`Modal appeared: ${hasModal}`);
      
      if (hasModal) {
        console.log('✅ Create button opens modal');
        
        // Check for form fields
        const inputs = await page.locator('input[type="text"], input[type="email"], textarea').count();
        console.log(`Form inputs found: ${inputs}`);
        
        if (inputs > 0) {
          console.log('✅ Create form has input fields');
        }
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/simple-test-final.png', fullPage: true });
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Page loaded: ${headings.length > 0 ? '✅' : '❌'}`);
    console.log(`Import button: ${hasImport ? '✅' : '❌'}`);
    console.log(`Create button: ${hasCreate ? '✅' : '❌'}`);
    
    // Assert at least one functionality exists
    expect(hasImport || hasCreate).toBeTruthy();
  });
});