import { test, expect } from '@playwright/test';

test.describe('Admin UI/UX Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
  });

  test('admin login and navigation audit', async ({ page }) => {
    // Login as admin user
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for authentication to complete
    await page.waitForURL('/');
    
    // Check if admin navigation items are visible in main sidebar
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    
    // Click on Admin Dashboard
    await page.click('text=Admin Dashboard');
    
    // Wait for admin page to load
    await page.waitForURL('/admin');
    
    // Check if admin layout is properly loaded
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
    
    // Audit: Check if main navigation disappears (issue reported)
    const mainSidebar = page.locator('[data-testid="main-sidebar"]');
    const adminSidebar = page.locator('[data-testid="admin-sidebar"]');
    
    console.log('Main sidebar visible:', await mainSidebar.isVisible().catch(() => false));
    console.log('Admin sidebar visible:', await adminSidebar.isVisible().catch(() => false));
  });

  test('admin buttons responsiveness audit', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to admin dashboard
    await page.click('text=Admin Dashboard');
    await page.waitForURL('/admin');
    
    // Test button responsiveness
    const buttons = [
      'Export Report',
      'Review Captures',
      'Manage Technicians', 
      'Geographic View',
      'Performance Reports'
    ];
    
    for (const buttonText of buttons) {
      const button = page.locator(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`);
      if (await button.count() > 0) {
        // Check if button is clickable
        await expect(button.first()).toBeVisible();
        
        // Test hover state
        await button.first().hover();
        
        // Take screenshot of button state
        await button.first().screenshot({ path: `test-results/button-${buttonText.replace(/\s+/g, '-').toLowerCase()}.png` });
        
        console.log(`Button "${buttonText}": Visible = ${await button.first().isVisible()}, Enabled = ${await button.first().isEnabled()}`);
      } else {
        console.log(`Button "${buttonText}": Not found`);
      }
    }
  });

  test('admin sidebar navigation audit', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to admin dashboard
    await page.click('text=Admin Dashboard');
    await page.waitForURL('/admin');
    
    // Test admin sidebar navigation items
    const adminNavItems = [
      { text: 'Dashboard', href: '/admin' },
      { text: 'Home Drop Reviews', href: '/admin/home-drop-reviews' },
      { text: 'Geographic View', href: '/admin/map-review' },
      { text: 'Technicians', href: '/admin/technicians' },
      { text: 'Reports', href: '/admin/reports' },
      { text: 'Data Export', href: '/admin/exports' },
      { text: 'Admin Settings', href: '/admin/settings' }
    ];
    
    for (const navItem of adminNavItems) {
      const navLink = page.locator(`a:has-text("${navItem.text}")`);
      if (await navLink.count() > 0) {
        console.log(`Navigation "${navItem.text}": Found, visible = ${await navLink.first().isVisible()}`);
        
        // Check if navigation item appears "blanked out" (disabled styling)
        const isDisabled = await navLink.first().evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.opacity < 1 || style.pointerEvents === 'none' || el.classList.contains('disabled');
        });
        
        console.log(`Navigation "${navItem.text}": Disabled styling = ${isDisabled}`);
        
        if (!isDisabled) {
          // Try clicking if not disabled
          await navLink.first().click();
          await page.waitForTimeout(1000); // Wait for navigation
          
          // Check if URL changed
          const currentUrl = page.url();
          console.log(`Navigation "${navItem.text}": Current URL after click = ${currentUrl}`);
        }
      } else {
        console.log(`Navigation "${navItem.text}": Not found`);
      }
    }
  });

  test('mobile responsiveness audit', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login as admin
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to admin dashboard
    await page.click('text=Admin Dashboard');
    await page.waitForURL('/admin');
    
    // Check mobile menu button
    const mobileMenuButton = page.locator('button[aria-label="Open menu"], button:has([data-testid="menu-icon"])');
    console.log('Mobile menu button visible:', await mobileMenuButton.isVisible().catch(() => false));
    
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);
      
      // Check if mobile navigation opens
      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      console.log('Mobile navigation visible after click:', await mobileNav.isVisible().catch(() => false));
    }
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/admin-mobile-view.png', fullPage: true });
  });

  test('visual layout audit', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to admin dashboard
    await page.click('text=Admin Dashboard');
    await page.waitForURL('/admin');
    
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/admin-dashboard-full.png', fullPage: true });
    
    // Check for overlapping elements or layout issues
    const header = page.locator('header');
    const sidebar = page.locator('aside');
    const mainContent = page.locator('main');
    
    if (await header.count() > 0) {
      const headerBox = await header.boundingBox();
      console.log('Header position and size:', headerBox);
    }
    
    if (await sidebar.count() > 0) {
      const sidebarBox = await sidebar.boundingBox();
      console.log('Sidebar position and size:', sidebarBox);
    }
    
    if (await mainContent.count() > 0) {
      const mainBox = await mainContent.boundingBox();
      console.log('Main content position and size:', mainBox);
    }
    
    // Check for elements with zero dimensions (potentially broken)
    const allElements = page.locator('*');
    const count = await allElements.count();
    console.log(`Checking ${count} elements for layout issues...`);
    
    for (let i = 0; i < Math.min(count, 50); i++) {
      const element = allElements.nth(i);
      const box = await element.boundingBox().catch(() => null);
      
      if (box && (box.width === 0 || box.height === 0)) {
        const tagName = await element.evaluate(el => el.tagName);
        const className = await element.evaluate(el => el.className);
        console.log(`Zero-dimension element: ${tagName}.${className}`);
      }
    }
  });

  test('admin page transitions audit', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Test navigation between main app and admin area
    console.log('Starting from main dashboard');
    await expect(page.locator('h1, h2')).toContainText(['Dashboard', 'FibreField']);
    
    // Go to admin
    await page.click('text=Admin Dashboard');
    await page.waitForURL('/admin');
    console.log('Navigated to admin dashboard');
    
    // Check if we can get back to main dashboard
    const backToMainLink = page.locator('a[href="/"], a:has-text("Dashboard"):not(:has-text("Admin"))');
    if (await backToMainLink.count() > 0) {
      await backToMainLink.first().click();
      await page.waitForTimeout(1000);
      console.log('Attempted to go back to main dashboard, current URL:', page.url());
    } else {
      console.log('No back to main dashboard link found');
    }
    
    // Test admin sub-pages
    await page.goto('/admin');
    const subPages = ['/admin/home-drop-reviews', '/admin/photo-gallery'];
    
    for (const subPage of subPages) {
      await page.goto(subPage);
      await page.waitForTimeout(1000);
      
      console.log(`Visited ${subPage}, page loaded:`, await page.locator('body').isVisible());
      
      // Check if admin sidebar is still visible
      const adminSidebar = page.locator('nav, aside').filter({ hasText: 'Home Drop Reviews' });
      console.log(`Admin sidebar visible on ${subPage}:`, await adminSidebar.isVisible().catch(() => false));
    }
  });
});