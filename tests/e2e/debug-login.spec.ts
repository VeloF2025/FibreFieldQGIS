import { test, expect } from '@playwright/test';

test.describe('Debug Login Process', () => {
  test('attempt login with admin@fibrefield.com', async ({ page }) => {
    console.log('🔍 Starting login debug test...');
    
    // Go to login page
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot before login attempt
    await page.screenshot({ path: 'test-results/login-before.png', fullPage: true });
    
    // Check what's on the page
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    const bodyText = await page.textContent('body');
    console.log('🔍 Checking for errors...');
    
    if (bodyText?.includes('log is not defined')) {
      console.log('❌ ERROR: Still getting "log is not defined" error');
      console.log('📝 Full error context:', bodyText.substring(bodyText.indexOf('log is not defined') - 50, bodyText.indexOf('log is not defined') + 100));
    } else {
      console.log('✅ No "log is not defined" errors detected');
    }
    
    // Look for form elements
    const emailInput = page.locator('input[type="email"], input#email');
    const passwordInput = page.locator('input[type="password"], input#password');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('🔍 Form elements check:');
    console.log('  Email input found:', await emailInput.count());
    console.log('  Password input found:', await passwordInput.count());
    console.log('  Submit button found:', await submitButton.count());
    
    // Fill in the login form
    console.log('🔐 Attempting login with admin@fibrefield.com / admin123');
    
    if (await emailInput.count() > 0) {
      await emailInput.fill('admin@fibrefield.com');
      console.log('✅ Email entered');
    } else {
      console.log('❌ Email input not found');
      return;
    }
    
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('admin123');
      console.log('✅ Password entered');
    } else {
      console.log('❌ Password input not found');
      return;
    }
    
    // Take screenshot before clicking submit
    await page.screenshot({ path: 'test-results/login-filled.png', fullPage: true });
    
    // Click submit button
    console.log('🚀 Clicking submit button...');
    
    if (await submitButton.count() > 0) {
      // Set up response monitoring
      let responseReceived = false;
      page.on('response', response => {
        console.log(`📡 Response: ${response.status()} ${response.url()}`);
        responseReceived = true;
      });
      
      // Set up console monitoring
      page.on('console', msg => {
        console.log(`🖥️ Browser console: ${msg.type()}: ${msg.text()}`);
      });
      
      // Set up error monitoring  
      page.on('pageerror', error => {
        console.log(`❌ Page error: ${error.message}`);
      });
      
      await submitButton.click();
      console.log('✅ Submit button clicked');
      
      // Wait a bit to see what happens
      await page.waitForTimeout(2000);
      
      // Check current URL
      const currentUrl = page.url();
      console.log('📍 Current URL after submit:', currentUrl);
      
      // Take screenshot after submit
      await page.screenshot({ path: 'test-results/login-after-submit.png', fullPage: true });
      
      // Check if we're still on login page or redirected
      if (currentUrl.includes('/auth/login')) {
        console.log('⚠️ Still on login page - checking for error messages');
        
        // Look for error messages
        const errorElements = page.locator('.text-red-600, .text-red-500, [role="alert"]');
        const errorCount = await errorElements.count();
        
        if (errorCount > 0) {
          for (let i = 0; i < errorCount; i++) {
            const errorText = await errorElements.nth(i).textContent();
            console.log(`❌ Error message ${i + 1}: ${errorText}`);
          }
        } else {
          console.log('🔍 No visible error messages found');
        }
        
        // Check browser console for JavaScript errors
        console.log('🔍 Waiting for any async operations...');
        await page.waitForTimeout(3000);
        
      } else {
        console.log('✅ LOGIN SUCCESS! Redirected to:', currentUrl);
        
        // Take screenshot of successful redirect
        await page.screenshot({ path: 'test-results/login-success.png', fullPage: true });
        
        // Check what page we're on
        const newTitle = await page.title();
        console.log('📄 New page title:', newTitle);
        
        // Look for dashboard content
        const dashboardElement = page.locator('h1:has-text("Dashboard")');
        const dashboardFound = await dashboardElement.count() > 0;
        console.log('🏠 Dashboard found:', dashboardFound);
        
        // Look for navigation elements
        const navElements = await page.locator('nav a, aside a').all();
        console.log(`🧭 Navigation items found: ${navElements.length}`);
        
        // Check for admin elements
        const adminElements = page.locator('text=Admin');
        const adminCount = await adminElements.count();
        console.log(`👨‍💼 Admin elements found: ${adminCount}`);
      }
      
    } else {
      console.log('❌ Submit button not found - cannot proceed with login');
    }
  });
});