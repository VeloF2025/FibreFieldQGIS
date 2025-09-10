import { test, expect } from '@playwright/test';

test.describe('Authenticated Admin UI/UX Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Perform login with admin credentials
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit login form and wait for redirect
    await page.click('button:has-text("Sign In")');
    
    // Wait for successful authentication and redirect away from login
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 10000 });
  });

  test('should display admin dashboard with working navigation', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Check that we're actually on admin page (not redirected to login)
    expect(page.url()).toContain('/admin');
    
    // Test 1: Check for sidebar/navigation elements
    const sidebarElements = await page.locator('[data-testid="admin-sidebar"], [data-testid="main-sidebar"], .sidebar, nav').count();
    expect(sidebarElements).toBeGreaterThan(0);
    
    // Test 2: Check that navigation menu is visible and not "blanked out"
    const navItems = await page.locator('nav a, .sidebar a, [role="navigation"] a').count();
    expect(navItems).toBeGreaterThan(0);
    
    // Test 3: Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/admin-dashboard-authenticated.png', fullPage: true });
  });

  test('should have responsive buttons in admin interface', async ({ page }) => {
    // Navigate to admin home drop reviews page (known to have button issues)
    await page.goto('/admin/home-drop-reviews');
    await page.waitForLoadState('networkidle');
    
    // Check that buttons are present and clickable
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Test button responsiveness by checking if they have proper hover/click handlers
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const isEnabled = await button.isEnabled();
      expect(isEnabled).toBe(true);
      
      // Check if button responds to hover (has hover styles)
      await button.hover();
      await page.waitForTimeout(100); // Small delay for hover effects
    }
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/admin-buttons-responsive.png', fullPage: true });
  });

  test('should maintain navigation when switching between admin pages', async ({ page }) => {
    // Start at admin dashboard
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Get initial navigation count
    const initialNavCount = await page.locator('nav a, .sidebar a, [role="navigation"] a').count();
    expect(initialNavCount).toBeGreaterThan(0);
    
    // Navigate to different admin pages and verify navigation persists
    const adminPages = [
      '/admin/home-drop-reviews', 
      '/admin/photo-gallery',
      '/admin/qgis-integration'
    ];
    
    for (const adminPage of adminPages) {
      await page.goto(adminPage);
      await page.waitForLoadState('networkidle');
      
      // Verify navigation is still present (not disappeared)
      const currentNavCount = await page.locator('nav a, .sidebar a, [role="navigation"] a').count();
      expect(currentNavCount).toBeGreaterThan(0);
      
      // Verify we're actually on the admin page (not redirected)
      expect(page.url()).toContain('/admin');
      
      console.log(`✅ Navigation persisted on ${adminPage}: ${currentNavCount} nav items`);
    }
  });

  test('should display admin page content without blank menus', async ({ page }) => {
    await page.goto('/admin/home-drop-reviews');
    await page.waitForLoadState('networkidle');
    
    // Check for content elements (should not be blank)
    const contentElements = await page.locator('main, .content, [role="main"], .page-content').count();
    expect(contentElements).toBeGreaterThan(0);
    
    // Check that text content is visible (not blank)
    const textContent = await page.textContent('body');
    expect(textContent?.trim().length || 0).toBeGreaterThan(50); // Should have substantial content
    
    // Check for specific admin elements
    const adminHeaders = await page.locator('h1, h2, h3').count();
    expect(adminHeaders).toBeGreaterThan(0);
    
    // Take screenshot to verify content is visible
    await page.screenshot({ path: 'test-results/admin-content-visible.png', fullPage: true });
  });
  
});