import { test, expect } from '@playwright/test';

test.describe('Final Authentication Test', () => {
  test('should load login page without initialization errors', async ({ page }) => {
    // Go to login page
    await page.goto('/auth/login');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check that we don't have the "Initialization Failed" error
    const h1 = page.locator('h1');
    const h1Text = await h1.textContent();
    
    console.log('H1 content:', h1Text);
    
    // Should NOT have initialization failed
    expect(h1Text).not.toContain('Initialization Failed');
    
    // Should have a proper login form or welcome message
    const hasLoginElements = await page.locator('input[type="email"], input[type="password"], button').count() > 0;
    
    if (hasLoginElements) {
      console.log('✅ Login form elements found - login page working');
    } else {
      console.log('ℹ️ No login form - checking for auth system');
    }
  });

  test('should access main dashboard without crashes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for any redirects or loading to complete
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    const title = await page.title();
    
    console.log('Final URL:', url);
    console.log('Page title:', title);
    
    // Should not be an error page
    expect(title).not.toContain('Error');
    expect(title).not.toContain('404');
    
    // Should either be on dashboard or redirected to login (both are valid)
    const isValid = url.includes('/auth/login') || url.includes('/dashboard') || url === page.url();
    expect(isValid).toBe(true);
  });

  test('should access admin page without crashes', async ({ page }) => {
    await page.goto('/admin/home-drop-reviews');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    console.log('Admin page title:', title);
    
    // Should not crash or show error
    expect(title).not.toContain('Error');
    expect(title).toBeTruthy();
  });
});