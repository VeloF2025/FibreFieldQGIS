import { test, expect } from '@playwright/test';

test.describe('Layout Debugging', () => {
  test('debug main app rendering', async ({ page }) => {
    // Go to main page and wait for loading
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait a bit for React components to mount
    await page.waitForTimeout(3000);
    
    // Take full screenshot
    await page.screenshot({ path: 'test-results/debug-main-app.png', fullPage: true });
    
    // Check if we're on login page
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/auth/login')) {
      console.log('🔍 On login page - checking authentication flow');
      
      // Check login form elements
      const hasLoginForm = await page.locator('form').count() > 0;
      console.log('Login form present:', hasLoginForm);
      
      if (hasLoginForm) {
        // Try to bypass authentication temporarily by directly going to dashboard
        await page.evaluate(() => {
          // Set mock auth in localStorage if possible
          try {
            localStorage.setItem('dev-auth-user', JSON.stringify({
              uid: 'admin-user-001',
              email: 'admin@fibrefield.com',
              role: 'admin'
            }));
          } catch (e) {
            console.log('Could not set localStorage auth');
          }
        });
        
        // Try to go to dashboard again
        await page.goto('/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/debug-after-auth-bypass.png', fullPage: true });
      }
    } else {
      console.log('🔍 On main dashboard - checking layout structure');
      
      // Check for main layout elements
      const bodyContent = await page.locator('body').innerHTML();
      console.log('Page has content:', bodyContent.length > 1000);
      
      // Look for specific layout components
      const hasAppLayout = await page.locator('[data-testid="main-sidebar"], div[class*="sidebar"], aside').count() > 0;
      console.log('AppLayout sidebar found:', hasAppLayout);
      
      // Check for common layout patterns
      const layoutElements = await page.locator('div[class*="flex"], div[class*="grid"], nav, aside, header, main').count();
      console.log('Layout elements found:', layoutElements);
      
      // Check if AuthGuard is blocking rendering
      const hasLoadingState = await page.locator('text=Loading').count() > 0;
      console.log('Loading state visible:', hasLoadingState);
      
      const hasAuthError = await page.locator('text=Access Denied, text=permission').count() > 0;
      console.log('Auth error visible:', hasAuthError);
      
      // Check for specific FibreField content
      const hasDashboard = await page.locator('h1:has-text("Dashboard")').count() > 0;
      console.log('Dashboard title found:', hasDashboard);
      
      const hasQuickActions = await page.locator('text=Quick Actions').count() > 0;
      console.log('Quick Actions section found:', hasQuickActions);
      
      // Look for navigation items
      const navLinks = await page.locator('a').all();
      console.log('Total links found:', navLinks.length);
      
      const navigationTexts = [];
      for (const link of navLinks.slice(0, 10)) {
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        if (text && text.trim() && href) {
          navigationTexts.push(`"${text.trim()}" -> ${href}`);
        }
      }
      console.log('Navigation links:', navigationTexts);
      
      // Check DOM structure
      const allElements = await page.locator('*').count();
      console.log('Total DOM elements:', allElements);
      
      // Look for hidden elements
      const hiddenElements = await page.locator('[style*="display: none"], [style*="visibility: hidden"], .hidden').count();
      console.log('Hidden elements:', hiddenElements);
    }
  });
  
  test('debug admin layout rendering', async ({ page }) => {
    // Try to access admin page directly
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('Admin URL:', currentUrl);
    
    await page.screenshot({ path: 'test-results/debug-admin-access.png', fullPage: true });
    
    if (currentUrl.includes('/auth/login')) {
      console.log('🔍 Admin redirected to login - expected behavior');
      
      // Check if we can see admin-specific redirect message or state
      const pageContent = await page.locator('body').textContent();
      const hasAdminRedirect = pageContent?.includes('admin') || currentUrl.includes('redirect');
      console.log('Admin redirect context found:', hasAdminRedirect);
    } else {
      console.log('🔍 Admin page accessed directly - checking layout');
      
      // Check admin layout structure
      const hasAdminSidebar = await page.locator('[data-testid="admin-sidebar"]').count() > 0;
      console.log('Admin sidebar found:', hasAdminSidebar);
      
      const hasAdminTitle = await page.locator('h1:has-text("Admin Dashboard")').count() > 0;
      console.log('Admin dashboard title found:', hasAdminTitle);
      
      const adminNavItems = await page.locator('nav a, aside a').all();
      console.log('Admin navigation items:', adminNavItems.length);
      
      for (const item of adminNavItems.slice(0, 8)) {
        const text = await item.textContent();
        const href = await item.getAttribute('href');
        console.log(`Admin nav: "${text}" -> ${href}`);
      }
    }
  });
});