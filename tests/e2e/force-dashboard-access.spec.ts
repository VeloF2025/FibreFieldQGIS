import { test, expect } from '@playwright/test';

test.describe('Force Dashboard Access', () => {
  test('bypass login completely and access dashboard', async ({ page }) => {
    console.log('🚀 Testing direct dashboard access (bypassing login)...');
    
    // Go directly to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for auth to initialize
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    const title = await page.title();
    
    console.log('📍 Dashboard URL:', currentUrl);
    console.log('📄 Dashboard Title:', title);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard-direct.png', fullPage: true });
    
    if (currentUrl.includes('/auth/login')) {
      console.log('❌ Still redirecting to login - auth not working properly');
      
      // Check what's on the login page
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('log is not defined')) {
        console.log('❌ Still has logger errors');
      }
      
    } else {
      console.log('✅ DASHBOARD ACCESS WORKS!');
      
      // Check for dashboard content
      const dashboardElements = [
        'text=Dashboard',
        'text=Welcome back',
        'text=Quick Actions',
        'text=Capture Pole',
        'text=Capture Home Drop'
      ];
      
      let foundElements = 0;
      for (const element of dashboardElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundElements++;
          console.log(`✅ Found: ${element}`);
        } else {
          console.log(`❌ Missing: ${element}`);
        }
      }
      
      console.log(`📊 Dashboard elements found: ${foundElements}/${dashboardElements.length}`);
      
      // Check navigation elements
      const navElements = [
        'text=Dashboard',
        'text=Navigation', 
        'text=Sync',
        'text=Settings'
      ];
      
      let foundNavElements = 0;
      for (const navElement of navElements) {
        const count = await page.locator(navElement).count();
        if (count > 0) {
          foundNavElements++;
          console.log(`✅ Nav: ${navElement}`);
        }
      }
      
      console.log(`🧭 Navigation elements found: ${foundNavElements}/${navElements.length}`);
      
      // Test admin elements (should be visible for admin user)
      const adminElements = [
        'text=Admin Actions',
        'text=Review Drops',
        'text=Photo Gallery',
        'text=QGIS Integration'
      ];
      
      let foundAdminElements = 0;
      for (const adminElement of adminElements) {
        const count = await page.locator(adminElement).count();
        if (count > 0) {
          foundAdminElements++;
          console.log(`✅ Admin: ${adminElement}`);
        }
      }
      
      console.log(`👨‍💼 Admin elements found: ${foundAdminElements}/${adminElements.length}`);
      
      // Test navigation to admin pages
      console.log('🔄 Testing admin page navigation...');
      
      if (foundAdminElements > 0) {
        // Try clicking on "Review Drops" if it exists
        const reviewDropsButton = page.locator('text=Review Drops');
        if (await reviewDropsButton.count() > 0) {
          console.log('🖱️ Clicking "Review Drops"...');
          await reviewDropsButton.click();
          
          // Wait for navigation
          await page.waitForTimeout(2000);
          
          const adminUrl = page.url();
          console.log('📍 Admin URL after click:', adminUrl);
          
          if (adminUrl.includes('/admin/')) {
            console.log('✅ ADMIN NAVIGATION WORKS!');
            
            // Take screenshot of admin page
            await page.screenshot({ path: 'test-results/admin-page-working.png', fullPage: true });
            
            // Check admin page content
            const adminTitle = await page.title();
            console.log('📄 Admin page title:', adminTitle);
            
          } else {
            console.log('❌ Admin navigation failed');
          }
        }
      }
    }
  });

  test('test button responsiveness on dashboard', async ({ page }) => {
    console.log('🔘 Testing button responsiveness...');
    
    // Go to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/auth/login')) {
      console.log('❌ Can\'t test buttons - still on login page');
      return;
    }
    
    // Find all buttons
    const buttons = await page.locator('button, [role="button"], a').all();
    console.log(`Found ${buttons.length} interactive elements`);
    
    let responsiveButtons = 0;
    const maxButtons = Math.min(buttons.length, 10);
    
    for (let i = 0; i < maxButtons; i++) {
      const button = buttons[i];
      const text = (await button.textContent() || '').trim();
      
      if (text && text !== '') {
        console.log(`Testing: "${text.substring(0, 30)}"`);
        
        try {
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          
          if (isVisible && isEnabled) {
            // Test hover
            await button.hover();
            
            // Get cursor style
            const cursor = await button.evaluate(el => {
              return window.getComputedStyle(el).cursor;
            });
            
            if (cursor === 'pointer' || cursor === 'default') {
              responsiveButtons++;
              console.log(`✅ "${text.substring(0, 20)}" - Responsive (${cursor})`);
            } else {
              console.log(`⚠️ "${text.substring(0, 20)}" - Cursor: ${cursor}`);
            }
          } else {
            console.log(`⚠️ "${text.substring(0, 20)}" - Not visible or disabled`);
          }
        } catch (error) {
          console.log(`❌ "${text.substring(0, 20)}" - Error: ${error.message}`);
        }
      }
    }
    
    const percentage = maxButtons > 0 ? Math.round((responsiveButtons / maxButtons) * 100) : 0;
    console.log(`📊 Button responsiveness: ${responsiveButtons}/${maxButtons} (${percentage}%)`);
  });
});