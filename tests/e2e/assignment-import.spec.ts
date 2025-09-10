import { test, expect } from '@playwright/test';

test.describe('Home Drop Assignment Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the assignments page
    await page.goto('http://localhost:3020/home-drop-assignments');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load assignments page successfully', async ({ page }) => {
    // Check page title and heading
    await expect(page).toHaveTitle(/FibreField/);
    await expect(page.locator('h1')).toContainText('Home Drop Assignments');
    
    // Check for key elements
    await expect(page.locator('p')).toContainText('Manage work assignments for field technicians');
  });

  test('should display assignment list component', async ({ page }) => {
    // Wait for assignment list to be visible
    await page.waitForTimeout(2000); // Allow time for components to render
    
    // Check for assignment list container
    const assignmentList = page.locator('[data-testid="assignment-list"], .assignment-list, [class*="assignment"]');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/assignment-page-debug.png', fullPage: true });
    
    // Check if any assignment-related elements are present
    const hasAssignments = await page.locator('text=/assignment/i').count() > 0;
    const hasCards = await page.locator('[class*="card"]').count() > 0;
    const hasFilters = await page.locator('text=/filter/i, [placeholder*="search"]').count() > 0;
    
    console.log('Assignment elements found:', { hasAssignments, hasCards, hasFilters });
    
    // Verify at least one assignment-related element exists
    expect(hasAssignments || hasCards || hasFilters).toBeTruthy();
  });

  test('should check for import functionality', async ({ page }) => {
    // Wait for components to load
    await page.waitForTimeout(3000);
    
    // Look for import-related buttons or elements
    const importButton = page.locator('button:has-text("Import"), button:has-text("Upload"), [title*="import"], [aria-label*="import"]');
    const uploadButton = page.locator('input[type="file"], button:has-text("Upload")');
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'test-results/import-functionality-debug.png', fullPage: true });
    
    // Check for any file upload or import elements
    const hasImportButton = await importButton.count() > 0;
    const hasUploadInput = await uploadButton.count() > 0;
    
    console.log('Import functionality:', { hasImportButton, hasUploadInput });
    
    // Log all visible buttons for debugging
    const allButtons = await page.locator('button').all();
    const buttonTexts = await Promise.all(
      allButtons.map(async (button) => {
        try {
          const text = await button.innerText();
          return text;
        } catch {
          return 'hidden or invalid';
        }
      })
    );
    
    console.log('All buttons found:', buttonTexts);
  });

  test('should test assignment filtering and search', async ({ page }) => {
    // Wait for components to load
    await page.waitForTimeout(3000);
    
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"], [placeholder*="Search"]');
    const filterElements = page.locator('select, [role="combobox"], button:has-text("Filter")');
    
    const hasSearch = await searchInput.count() > 0;
    const hasFilters = await filterElements.count() > 0;
    
    console.log('Search and filter elements:', { hasSearch, hasFilters });
    
    if (hasSearch) {
      // Test search functionality
      await searchInput.first().fill('test assignment');
      await page.waitForTimeout(1000);
      
      console.log('Search input filled successfully');
    }
    
    // Take screenshot of the search state
    await page.screenshot({ path: 'test-results/search-filter-test.png', fullPage: true });
  });

  test('should check for assignment actions and workflow', async ({ page }) => {
    // Wait for components to load
    await page.waitForTimeout(3000);
    
    // Look for action buttons
    const actionButtons = page.locator('button:has-text("Accept"), button:has-text("Start"), button:has-text("Complete"), button:has-text("View")');
    const modalTriggers = page.locator('[role="button"], button, [onclick]');
    
    const hasActionButtons = await actionButtons.count() > 0;
    const totalButtons = await modalTriggers.count();
    
    console.log('Action elements found:', { hasActionButtons, totalButtons });
    
    // Check for any clickable assignment cards or items
    const clickableItems = page.locator('[role="button"]:has-text(/assignment/i), .assignment-card, [class*="assignment"][class*="card"]');
    const hasClickableAssignments = await clickableItems.count() > 0;
    
    console.log('Clickable assignment items:', hasClickableAssignments);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/assignment-workflow-test.png', fullPage: true });
  });

  test('should verify page responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/mobile-assignments-view.png', fullPage: true });
    
    // Test tablet viewport  
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/tablet-assignments-view.png', fullPage: true });
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/desktop-assignments-view.png', fullPage: true });
    
    // Verify page is still functional at different sizes
    await expect(page.locator('h1')).toContainText('Home Drop Assignments');
  });
});