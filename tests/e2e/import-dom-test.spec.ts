import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import DOM Test', () => {
  test('should create file input in DOM when Import is clicked', async ({ page }) => {
    // Navigate to the assignments page
    await page.goto('http://localhost:3020/home-drop-assignments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('\n=== DOM FILE INPUT TEST ===\n');
    
    // Count file inputs before clicking
    const fileInputsBefore = await page.evaluate(() => {
      return document.querySelectorAll('input[type="file"]').length;
    });
    console.log(`File inputs before click: ${fileInputsBefore}`);
    
    // Find and click Import button
    const importButton = page.locator('button:has-text("Import")').first();
    await expect(importButton).toBeVisible();
    
    console.log('Clicking Import button...');
    await importButton.click();
    
    // Wait a moment for DOM update
    await page.waitForTimeout(500);
    
    // Count file inputs after clicking
    const fileInputsAfter = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="file"]');
      console.log('File inputs found:', inputs.length);
      inputs.forEach((input, index) => {
        console.log(`Input ${index}:`, {
          id: input.id,
          className: input.className,
          accept: (input as HTMLInputElement).accept,
          display: (input as HTMLElement).style.display,
          parent: input.parentElement?.tagName
        });
      });
      return inputs.length;
    });
    
    console.log(`File inputs after click: ${fileInputsAfter}`);
    
    // Check if a file input was created
    if (fileInputsAfter > fileInputsBefore) {
      console.log('✓ File input was created in the DOM!');
      
      // Try to interact with the file input
      const fileInput = page.locator('input[type="file"]').last();
      const filePath = path.resolve('/mnt/c/Jarvis/AI Workspace/FibreField/sample-assignments.json');
      
      try {
        await fileInput.setInputFiles(filePath);
        console.log('✓ File set successfully on input');
        
        // Wait for processing
        await page.waitForTimeout(3000);
        
        // Check for any changes
        const totalAssignments = await page.locator('text=/Total/i').first()
          .locator('..')
          .locator('p.text-2xl')
          .innerText();
        
        console.log(`Total assignments after import: ${totalAssignments}`);
        
        if (parseInt(totalAssignments) > 0) {
          console.log('✅ IMPORT SUCCESSFUL! Assignments were imported.');
        }
        
      } catch (error) {
        console.error('Error setting file:', error);
      }
      
    } else {
      console.log('✗ No file input created in DOM');
      
      // Check for console errors
      const consoleErrors = await page.evaluate(() => {
        return (window as any).__consoleErrors || [];
      });
      
      if (consoleErrors.length > 0) {
        console.log('Console errors found:', consoleErrors);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/import-dom-test.png', fullPage: true });
  });

  test('should manually trigger file input creation and selection', async ({ page }) => {
    await page.goto('http://localhost:3020/home-drop-assignments');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('\n=== MANUAL FILE INPUT TEST ===\n');
    
    // Inject and trigger file input directly
    const result = await page.evaluate(() => {
      // Create file input manually
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,.csv';
      fileInput.style.display = 'none';
      fileInput.id = 'test-file-input';
      document.body.appendChild(fileInput);
      
      // Check if it was added
      const added = document.getElementById('test-file-input') !== null;
      
      return {
        added,
        totalInputs: document.querySelectorAll('input[type="file"]').length
      };
    });
    
    console.log('Manual file input creation:', result);
    
    if (result.added) {
      // Now try to set file on the manually created input
      const fileInput = page.locator('#test-file-input');
      const filePath = path.resolve('/mnt/c/Jarvis/AI Workspace/FibreField/sample-assignments.json');
      
      try {
        await fileInput.setInputFiles(filePath);
        console.log('✓ File set on manual input');
        
        // Trigger change event manually
        await page.evaluate(() => {
          const input = document.getElementById('test-file-input') as HTMLInputElement;
          if (input && input.files && input.files.length > 0) {
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
            return true;
          }
          return false;
        });
        
        console.log('Change event dispatched');
        
      } catch (error) {
        console.error('Error with manual input:', error);
      }
    }
    
    await page.screenshot({ path: 'test-results/import-manual-test.png', fullPage: true });
  });
});