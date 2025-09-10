import { test, expect } from '@playwright/test';

test.describe('Final Login Demonstration', () => {
  test('Login with admin@fibrefield.com and show what I see', async ({ page }) => {
    console.log('🎯 FINAL LOGIN TEST: Using admin@fibrefield.com / admin123');
    
    // Go to login page
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Starting at:', page.url());
    
    // Fill in credentials exactly as you specified
    await page.fill('input[type="email"]', 'admin@fibrefield.com');
    await page.fill('input[type="password"]', 'admin123');
    
    console.log('✅ Filled credentials: admin@fibrefield.com / admin123');
    
    // Take screenshot before submitting
    await page.screenshot({ path: 'test-results/before-submit.png', fullPage: true });
    
    // Submit
    await page.click('button[type="submit"]');
    console.log('🚀 Clicked submit button');
    
    // Wait 5 seconds to see what happens
    console.log('⏳ Waiting 5 seconds to see result...');
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    const finalTitle = await page.title();
    
    console.log('📍 FINAL URL:', finalUrl);
    console.log('📄 FINAL TITLE:', finalTitle);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-result.png', fullPage: true });
    
    if (finalUrl.includes('/auth/login')) {
      console.log('❌ RESULT: Still on login page');
      
      // Check what's visible
      const buttonText = await page.locator('button[type="submit"]').textContent();
      const isDisabled = await page.locator('button[type="submit"]').isDisabled();
      
      console.log(`🔘 Submit button: "${buttonText}", disabled: ${isDisabled}`);
      
      // Check for any error messages
      const errors = await page.locator('.text-red-600, .text-red-500, [role="alert"]').allTextContents();
      if (errors.length > 0) {
        console.log('❌ Error messages found:');
        errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
      } else {
        console.log('ℹ️ No error messages visible');
      }
      
    } else {
      console.log('✅ RESULT: Successfully redirected to', finalUrl);
      
      // Check what's on the new page
      const bodyText = await page.textContent('body');
      const hasDashboard = bodyText?.includes('Dashboard');
      const hasNavigation = bodyText?.includes('Navigation');
      const hasAdmin = bodyText?.includes('Admin');
      
      console.log('🏠 Has Dashboard content:', hasDashboard);
      console.log('🧭 Has Navigation:', hasNavigation);
      console.log('👨‍💼 Has Admin content:', hasAdmin);
    }
  });
});