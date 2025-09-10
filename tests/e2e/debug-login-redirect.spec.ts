import { test, expect } from '@playwright/test';

test.describe('Debug Login Redirect', () => {
  test('detailed login flow analysis', async ({ page }) => {
    console.log('🔍 Starting detailed login redirect analysis...');
    
    // Monitor all console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log(`🖥️ ${message}`);
    });
    
    // Monitor all page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      const errorMsg = `PAGE ERROR: ${error.message}`;
      pageErrors.push(errorMsg);
      console.log(`❌ ${errorMsg}`);
    });
    
    // Monitor navigation events
    page.on('framenavigated', frame => {
      console.log(`🧭 Navigation: ${frame.url()}`);
    });
    
    // Go to login
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Starting URL:', page.url());
    
    // Fill and submit login form
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'admin123');
    
    console.log('🚀 Submitting login form...');
    
    // Click submit and wait a bit
    await page.click('button[type="submit"]');
    
    // Wait for auth to complete (we saw it takes ~2 seconds)
    console.log('⏳ Waiting for authentication to complete...');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('📍 URL after 3 seconds:', currentUrl);
    
    // Wait a bit more to see if redirect happens later
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    console.log('📍 Final URL after 5 seconds:', finalUrl);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/login-final-state.png', fullPage: true });
    
    // Check if we're on dashboard or still on login
    if (finalUrl.includes('/auth/login')) {
      console.log('❌ LOGIN FAILED - Still on login page');
      
      // Look for any error messages
      const errorText = await page.textContent('body');
      if (errorText?.includes('log is not defined')) {
        console.log('❌ Still has "log is not defined" error');
      }
      
      // Check form state
      const submitButton = page.locator('button[type="submit"]');
      const buttonText = await submitButton.textContent();
      const isDisabled = await submitButton.isDisabled();
      console.log(`🔘 Submit button: "${buttonText}", disabled: ${isDisabled}`);
      
      // Print all console messages and errors
      console.log('\n📜 ALL CONSOLE MESSAGES:');
      consoleMessages.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
      
      console.log('\n❌ ALL PAGE ERRORS:');
      pageErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
      
    } else {
      console.log('✅ LOGIN SUCCESS - Redirected to:', finalUrl);
      
      // Check what's on the new page
      const title = await page.title();
      console.log('📄 New page title:', title);
      
      // Look for dashboard elements
      const dashboardText = await page.textContent('body');
      const hasDashboard = dashboardText?.includes('Dashboard');
      const hasNavigation = dashboardText?.includes('Navigation') || dashboardText?.includes('nav');
      
      console.log('🏠 Has Dashboard content:', hasDashboard);
      console.log('🧭 Has Navigation:', hasNavigation);
    }
    
    // Manual check: try navigating directly to dashboard
    console.log('\n🔄 Testing direct navigation to dashboard...');
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const dashboardUrl = page.url();
    const dashboardTitle = await page.title();
    
    console.log('📍 Dashboard direct navigation URL:', dashboardUrl);
    console.log('📄 Dashboard direct navigation title:', dashboardTitle);
    
    if (dashboardUrl.includes('/auth/login')) {
      console.log('❌ Direct dashboard access also redirects to login');
    } else {
      console.log('✅ Direct dashboard access works');
    }
  });
});