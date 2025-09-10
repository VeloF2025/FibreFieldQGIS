import { test, expect } from '@playwright/test';

test('auth fix verification', async ({ page }) => {
  console.log('🔧 Testing authentication fix...');
  
  // Go to main page and wait for React to initialize
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Wait for React components to mount and auth context to initialize
  await page.waitForTimeout(3000);
  
  // Take screenshot to see current state
  await page.screenshot({ path: 'test-results/auth-fix-test.png', fullPage: true });
  
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Check if we're still on login or if we reached dashboard
  if (currentUrl.includes('/auth/login')) {
    console.log('❌ Still redirected to login - auth fix not working');
    
    // Check for authentication debug logs in console
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('Dev Mode') || msg.text().includes('Auth')) {
        logs.push(msg.text());
      }
    });
    
    // Reload to see console logs
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    console.log('Console logs:', logs);
    
  } else {
    console.log('✅ Successfully reached dashboard - checking layout');
    
    // Check if sidebar is now visible
    const hasSidebar = await page.locator('[data-testid="main-sidebar"]').count() > 0;
    console.log('Main sidebar visible:', hasSidebar);
    
    if (hasSidebar) {
      const sidebarVisible = await page.locator('[data-testid="main-sidebar"]').isVisible();
      console.log('Sidebar actually visible:', sidebarVisible);
    }
    
    // Check for navigation items
    const navLinks = await page.locator('nav a, a[href^="/"]').count();
    console.log('Navigation links found:', navLinks);
    
    // Check for dashboard content
    const hasDashboardTitle = await page.locator('h1:has-text("Dashboard")').count() > 0;
    console.log('Dashboard title found:', hasDashboardTitle);
    
    const hasQuickActions = await page.locator('text=Quick Actions').count() > 0;
    console.log('Quick Actions section found:', hasQuickActions);
    
    // Look for admin links if user is admin
    const hasAdminLinks = await page.locator('text=Admin Dashboard').count() > 0;
    console.log('Admin navigation found:', hasAdminLinks);
  }
});