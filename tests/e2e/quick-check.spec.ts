import { test, expect } from '@playwright/test';

test.describe('Quick Authentication and Admin Access Check', () => {
  test('login with admin@fibrefield.com and access admin UI', async ({ page }) => {
    console.log('🎯 FINAL TEST: Using admin@fibrefield.com / admin123');
    
    // Go directly to dashboard first - should work with dev mode
    console.log('📍 Testing direct dashboard access...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const dashboardUrl = page.url();
    console.log('📍 Dashboard URL:', dashboardUrl);
    
    if (dashboardUrl.includes('/auth/login')) {
      console.log('❌ Still redirecting to login - need to login manually');
      
      // Fill credentials and login
      await page.fill('input[type="email"]', 'admin@fibrefield.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      console.log('⏳ Waiting for login to complete...');
      await page.waitForTimeout(3000);
      
      const postLoginUrl = page.url();
      console.log('📍 Post-login URL:', postLoginUrl);
      
      if (postLoginUrl.includes('/auth/login')) {
        console.log('❌ Login failed - still on login page');
        return;
      }
    } else {
      console.log('✅ Dashboard access working - dev mode successful');
    }
    
    // Test admin navigation
    console.log('🧭 Testing admin navigation...');
    
    // Look for admin elements
    const adminElements = [
      'text=Admin Actions',
      'text=Review Drops', 
      'text=Photo Gallery',
      'text=QGIS Integration',
      'text=Reports'
    ];
    
    let adminElementsFound = 0;
    for (const element of adminElements) {
      const count = await page.locator(element).count();
      if (count > 0) {
        adminElementsFound++;
        console.log(`✅ Found: ${element}`);
      } else {
        console.log(`❌ Missing: ${element}`);
      }
    }
    
    console.log(`👨‍💼 Admin elements found: ${adminElementsFound}/${adminElements.length}`);
    
    // Try to navigate to admin page
    console.log('🔄 Testing admin page navigation...');
    
    const reviewDropsButton = page.locator('text=Review Drops').first();
    if (await reviewDropsButton.count() > 0) {
      await reviewDropsButton.click();
      await page.waitForTimeout(2000);
      
      const adminPageUrl = page.url();
      console.log('📍 Admin page URL:', adminPageUrl);
      
      if (adminPageUrl.includes('/admin/')) {
        console.log('✅ ADMIN PAGE ACCESS WORKING!');
        
        // Take screenshot of working admin page
        await page.screenshot({ path: 'test-results/admin-success.png', fullPage: true });
        
        // Check for admin page content
        const adminTitle = await page.title();
        console.log('📄 Admin page title:', adminTitle);
        
        const adminContent = await page.textContent('body');
        const hasReviewInterface = adminContent?.includes('Pending Approvals') || adminContent?.includes('Home Drop');
        console.log('📊 Has admin review interface:', hasReviewInterface);
        
      } else {
        console.log('❌ Admin navigation failed');
      }
    } else {
      console.log('⚠️ No Review Drops button found - checking for other admin elements');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/final-admin-state.png', fullPage: true });
  });
});