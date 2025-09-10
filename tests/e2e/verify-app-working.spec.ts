import { test, expect } from '@playwright/test';

test.describe('Verify Application Working', () => {
  test('should load without initialization failed error', async ({ page }) => {
    console.log('Testing application at http://localhost:3035');
    
    await page.goto('/auth/login');
    
    // Wait for page to be stable
    await page.waitForLoadState('networkidle');
    
    // Get the h1 text
    const h1 = page.locator('h1').first();
    const h1Text = await h1.textContent();
    
    console.log('H1 content found:', h1Text);
    
    // Check if we got initialization failed
    if (h1Text?.includes('Initialization Failed')) {
      // Get error details
      const errorText = await page.locator('.text-red-700').textContent();
      console.log('❌ Still getting initialization error:', errorText);
      
      // Fail with specific error details
      throw new Error(`Initialization still failing: ${errorText}`);
    } else {
      console.log('✅ No initialization failed error!');
      console.log('✅ Application loading successfully');
    }
    
    // Verify page title
    const title = await page.title();
    expect(title).toContain('FibreField');
    console.log('✅ Page title correct:', title);
  });

  test('should access main dashboard', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    const url = page.url();
    
    console.log('Dashboard URL:', url);
    console.log('Dashboard Title:', title);
    
    // Should not be an error page
    expect(title).not.toContain('Error');
    expect(title).not.toContain('404');
    
    console.log('✅ Dashboard accessible');
  });

  test('should access admin page', async ({ page }) => {
    await page.goto('/admin/home-drop-reviews');
    
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    const url = page.url();
    
    console.log('Admin URL:', url);
    console.log('Admin Title:', title);
    
    // Should not crash
    expect(title).toBeTruthy();
    expect(title).not.toContain('Error');
    
    console.log('✅ Admin page accessible');
  });
});