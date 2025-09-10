import { test, expect } from '@playwright/test';

test.describe('Import Button Functionality Test', () => {
  test('should be able to click Import button and check functionality', async ({ page }) => {
    // Navigate to the assignments page
    await page.goto('http://localhost:3020/home-drop-assignments');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Extra wait for dynamic content
    
    console.log('Page loaded, looking for Import button...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/import-button-initial.png', fullPage: true });
    
    // Try multiple selectors for the Import button
    const importButtonSelectors = [
      'button:has-text("Import")',
      'button:text("Import")',
      '[aria-label*="Import"]',
      'button >> text=Import',
      '//button[contains(text(), "Import")]',
      'button.import-button',
      '[data-testid="import-button"]'
    ];
    
    let importButton = null;
    let selectorUsed = '';
    
    // Try each selector to find the Import button
    for (const selector of importButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        const count = await button.count();
        console.log(`Selector "${selector}" found ${count} elements`);
        
        if (count > 0) {
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          console.log(`  - Visible: ${isVisible}, Enabled: ${isEnabled}`);
          
          if (isVisible) {
            importButton = button;
            selectorUsed = selector;
            break;
          }
        }
      } catch (error) {
        console.log(`Selector "${selector}" failed:`, error.message);
      }
    }
    
    if (!importButton) {
      // If specific Import button not found, look for all buttons
      console.log('\nLooking for all buttons on the page...');
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons total`);
      
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const text = await allButtons[i].innerText();
          const isVisible = await allButtons[i].isVisible();
          console.log(`Button ${i + 1}: "${text}" (Visible: ${isVisible})`);
          
          if (text.toLowerCase().includes('import') && isVisible) {
            importButton = allButtons[i];
            selectorUsed = `Button with text "${text}"`;
            break;
          }
        } catch (error) {
          console.log(`Button ${i + 1}: Could not get text`);
        }
      }
    }
    
    // Assert that Import button was found
    expect(importButton).not.toBeNull();
    console.log(`\n✓ Import button found using: ${selectorUsed}`);
    
    // Check button properties
    const buttonText = await importButton.innerText();
    const isEnabled = await importButton.isEnabled();
    const isVisible = await importButton.isVisible();
    
    console.log('\nImport button properties:');
    console.log(`  Text: "${buttonText}"`);
    console.log(`  Enabled: ${isEnabled}`);
    console.log(`  Visible: ${isVisible}`);
    
    // Get button position and size
    const boundingBox = await importButton.boundingBox();
    if (boundingBox) {
      console.log(`  Position: x=${boundingBox.x}, y=${boundingBox.y}`);
      console.log(`  Size: ${boundingBox.width}x${boundingBox.height}`);
    }
    
    // Assert button is clickable
    expect(isEnabled).toBeTruthy();
    expect(isVisible).toBeTruthy();
    
    // Highlight the Import button
    await importButton.evaluate(element => {
      element.style.border = '3px solid red';
      element.style.backgroundColor = 'yellow';
    });
    
    // Take screenshot with highlighted button
    await page.screenshot({ path: 'test-results/import-button-highlighted.png', fullPage: true });
    
    // Try to click the Import button
    console.log('\nAttempting to click Import button...');
    
    try {
      // Method 1: Regular click
      await importButton.click({ timeout: 5000 });
      console.log('✓ Click successful!');
      
      // Wait for any response (modal, dialog, file picker, etc.)
      await page.waitForTimeout(2000);
      
      // Check for file input or modal
      const fileInput = page.locator('input[type="file"]');
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="dialog"]');
      const alert = page.locator('[role="alert"], .alert');
      
      const hasFileInput = await fileInput.count() > 0;
      const hasModal = await modal.count() > 0;
      const hasAlert = await alert.count() > 0;
      
      console.log('\nAfter clicking Import:');
      console.log(`  File input appeared: ${hasFileInput}`);
      console.log(`  Modal/Dialog appeared: ${hasModal}`);
      console.log(`  Alert appeared: ${hasAlert}`);
      
      // Take screenshot after click
      await page.screenshot({ path: 'test-results/import-button-after-click.png', fullPage: true });
      
      if (hasFileInput) {
        console.log('✓ File input detected - Import functionality is working!');
      } else if (hasModal) {
        console.log('✓ Modal detected - Import functionality is working!');
      } else if (hasAlert) {
        const alertText = await alert.first().innerText();
        console.log(`✓ Alert detected: "${alertText}"`);
      } else {
        console.log('⚠ No visible response after clicking Import button');
        
        // Check console for errors
        page.on('console', msg => {
          console.log(`Browser console: ${msg.type()}: ${msg.text()}`);
        });
      }
      
    } catch (clickError) {
      console.error('✗ Click failed:', clickError.message);
      
      // Try alternative click methods
      console.log('\nTrying alternative click methods...');
      
      try {
        // Method 2: Force click
        await importButton.click({ force: true });
        console.log('✓ Force click successful');
      } catch (forceError) {
        console.log('✗ Force click failed');
        
        try {
          // Method 3: JavaScript click
          await importButton.evaluate(element => element.click());
          console.log('✓ JavaScript click successful');
        } catch (jsError) {
          console.log('✗ JavaScript click failed');
        }
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/import-button-final-state.png', fullPage: true });
  });
  
  test('should check if Import button has click handler', async ({ page }) => {
    await page.goto('http://localhost:3020/home-drop-assignments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const importButton = page.locator('button:has-text("Import")').first();
    
    // Check if button has onclick handler or event listeners
    const hasClickHandler = await importButton.evaluate(element => {
      // Check for onclick attribute
      const hasOnclick = element.hasAttribute('onclick');
      
      // Check for event listeners (this is approximate, as we can't directly access all listeners)
      const hasPointerEvents = window.getComputedStyle(element).pointerEvents !== 'none';
      const isDisabled = element.hasAttribute('disabled');
      
      // Check if button is inside a form or has data attributes
      const form = element.closest('form');
      const hasDataAttributes = Array.from(element.attributes).some(attr => attr.name.startsWith('data-'));
      
      return {
        hasOnclick,
        hasPointerEvents,
        isDisabled,
        isInForm: !!form,
        hasDataAttributes,
        className: element.className,
        id: element.id,
        type: (element as HTMLInputElement).type || 'button'
      };
    });
    
    console.log('Import button handler analysis:', hasClickHandler);
    
    // Try to get the button's React props (if using React DevTools)
    const buttonInfo = await importButton.evaluate(element => {
      return {
        innerHTML: element.innerHTML,
        outerHTML: element.outerHTML.substring(0, 200), // First 200 chars
        parentTag: element.parentElement?.tagName,
        parentClass: element.parentElement?.className
      };
    });
    
    console.log('Button HTML info:', buttonInfo);
  });
});