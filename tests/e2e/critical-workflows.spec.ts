import { test, expect } from '@playwright/test';

test.describe('Critical Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3020');
  });

  test('Landing page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/FibreField/);
    await expect(page.locator('h1')).toContainText('FibreField');
  });

  test('Navigation menu is accessible', async ({ page }) => {
    await page.goto('http://localhost:3020/menu');
    
    // Check for key navigation items
    await expect(page.locator('text=Pole Capture')).toBeVisible();
    await expect(page.locator('text=Home Drop')).toBeVisible();
    await expect(page.locator('text=Assignments')).toBeVisible();
    await expect(page.locator('text=Map')).toBeVisible();
  });

  test('Pole capture workflow', async ({ page }) => {
    await page.goto('http://localhost:3020/pole-capture');
    
    // Check for main elements
    await expect(page.locator('text=Pole Capture')).toBeVisible();
    
    // Click new capture button if exists
    const newCaptureBtn = page.locator('button:has-text("New Capture")');
    if (await newCaptureBtn.count() > 0) {
      await newCaptureBtn.click();
      await expect(page.url()).toContain('pole-capture');
    }
  });

  test('Home drop capture workflow loads', async ({ page }) => {
    await page.goto('http://localhost:3020/home-drop-capture');
    
    // Check for 4-step workflow
    await expect(page.locator('text=Assignment')).toBeVisible();
    await expect(page.locator('text=GPS Location')).toBeVisible();
    await expect(page.locator('text=Photos')).toBeVisible();
    await expect(page.locator('text=Review')).toBeVisible();
  });

  test('Assignments page displays data', async ({ page }) => {
    await page.goto('http://localhost:3020/assignments');
    
    await expect(page.locator('h1')).toContainText('Assignments');
    // Check for assignment cards or table
    const assignmentContent = page.locator('[class*="card"], table');
    await expect(assignmentContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('Admin review page is accessible', async ({ page }) => {
    await page.goto('http://localhost:3020/admin/home-drop-reviews');
    
    // Should have review interface
    await expect(page.locator('text=/Review|Pending|Approval/i')).toBeVisible({ timeout: 10000 });
  });

  test('Map page loads without errors', async ({ page }) => {
    await page.goto('http://localhost:3020/map');
    
    await expect(page.locator('h1')).toContainText('Map');
    // Map container should exist
    await expect(page.locator('#map, .map-container, [class*="map"]')).toBeVisible({ timeout: 10000 });
  });

  test('Analytics dashboard displays metrics', async ({ page }) => {
    await page.goto('http://localhost:3020/analytics');
    
    await expect(page.locator('h1')).toContainText('Analytics');
    // Should have metric cards
    await expect(page.locator('[class*="card"]').first()).toBeVisible();
  });

  test('Offline test page functions', async ({ page }) => {
    await page.goto('http://localhost:3020/test/offline');
    
    await expect(page.locator('h1')).toContainText('Offline Functionality Test');
    
    // Check for test controls
    await expect(page.locator('button:has-text("Run Offline Tests")')).toBeVisible();
    
    // Run offline tests
    await page.click('button:has-text("Run Offline Tests")');
    
    // Wait for some results
    await page.waitForTimeout(3000);
    
    // Check for test results
    const results = await page.locator('[class*="rounded-lg bg-muted"]').count();
    expect(results).toBeGreaterThan(0);
  });

  test('Service worker is registered', async ({ page }) => {
    await page.goto('http://localhost:3020');
    
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined;
      }
      return false;
    });
    
    expect(swRegistered).toBe(true);
  });

  test('PWA manifest is present', async ({ page }) => {
    const response = await page.goto('http://localhost:3020/manifest.json');
    expect(response?.status()).toBe(200);
    
    const manifest = await response?.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('icons');
    expect(manifest).toHaveProperty('start_url');
  });

  test('API endpoints respond', async ({ page }) => {
    // Test projects endpoint
    const projectsResponse = await page.request.get('http://localhost:3020/api/v1/projects');
    expect(projectsResponse.status()).toBe(200);
    
    // Test assignments endpoint  
    const assignmentsResponse = await page.request.get('http://localhost:3020/api/assignments');
    expect(assignmentsResponse.status()).toBe(200);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ 
    viewport: { width: 375, height: 667 },
    isMobile: true 
  });

  test('Mobile navigation works', async ({ page }) => {
    await page.goto('http://localhost:3020');
    
    // Check for mobile menu or navigation
    const mobileMenu = page.locator('[class*="mobile"], [class*="burger"], button[aria-label*="menu"]');
    if (await mobileMenu.count() > 0) {
      await mobileMenu.first().click();
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    }
  });

  test('Home drop capture is mobile-friendly', async ({ page }) => {
    await page.goto('http://localhost:3020/home-drop-capture');
    
    // All steps should be visible or accessible
    await expect(page.locator('text=Assignment')).toBeVisible();
    
    // Check for touch-friendly elements
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) { // Check first 3 buttons
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44); // Minimum touch target
      }
    }
  });
});