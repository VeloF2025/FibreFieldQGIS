import { test, expect } from '@playwright/test';

test.describe('Quick Functionality Test', () => {
  test('should load login page successfully', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Check that we're on the login page
    await expect(page).toHaveTitle(/FibreField/);
    await expect(page.locator('h1')).toContainText(/Login|Sign In|FibreField/);
    
    console.log('✅ Login page loads successfully');
  });

  test('should attempt to access main dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Check if we get redirected to login or if we can access the dashboard
    const url = page.url();
    
    if (url.includes('/auth/login')) {
      console.log('🔄 Correctly redirecting to login for unauthenticated users');
      
      // Check that login page elements are present
      await expect(page.locator('h1')).toContainText(/Login|Sign In|FibreField/);
    } else {
      console.log('🎯 Dashboard accessible (dev mode auth working)');
      
      // Check for dashboard elements
      await expect(page.locator('[data-testid="main-sidebar"], nav, .sidebar')).toBeVisible();
    }
  });

  test('should check admin pages accessibility', async ({ page }) => {
    await page.goto('/admin/home-drop-reviews');
    
    // Check if we get redirected to login or if we can access admin
    const url = page.url();
    
    if (url.includes('/auth/login')) {
      console.log('🔄 Admin correctly protected by authentication');
    } else {
      console.log('🎯 Admin accessible (checking UI elements)');
      
      // Check for admin page elements
      await expect(page.locator('[data-testid="admin-sidebar"], .admin-header, h1')).toBeVisible();
    }
  });

  test('should verify server stability', async ({ page }) => {
    // Test multiple page loads to ensure server is stable
    const pages = ['/auth/login', '/', '/admin/home-drop-reviews'];
    
    for (const path of pages) {
      await page.goto(path);
      
      // Wait for page to be stable
      await page.waitForLoadState('networkidle');
      
      // Check that we get a proper response (not error page)
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title).not.toContain('Error');
      expect(title).not.toContain('404');
      
      console.log(`✅ ${path} loads without errors`);
    }
  });
});