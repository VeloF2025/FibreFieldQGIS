import { test, expect } from '@playwright/test';

test.describe('Admin UI Direct Audit (Bypass Login)', () => {
  test('admin layout and navigation issues audit', async ({ page }) => {
    // Try to navigate directly to admin pages to bypass login issues
    await page.goto('/admin', { waitUntil: 'networkidle' });
    
    // Take screenshot of current state
    await page.screenshot({ path: 'test-results/admin-direct-access.png', fullPage: true });
    
    // Check if redirected to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/auth/login')) {
      console.log('✗ Redirected to login - authentication required');
      
      // Check login form structure
      const emailInput = page.locator('input[type="email"], input#email');
      const passwordInput = page.locator('input[type="password"], input#password');
      const submitButton = page.locator('button[type="submit"]');
      
      console.log('Email input found:', await emailInput.count());
      console.log('Password input found:', await passwordInput.count());
      console.log('Submit button found:', await submitButton.count());
      
      // Try to examine the form structure
      const formElements = await page.locator('form input, form button').all();
      for (const element of formElements) {
        const tagName = await element.evaluate(el => el.tagName);
        const type = await element.evaluate(el => el.type || el.getAttribute('type'));
        const id = await element.evaluate(el => el.id);
        const className = await element.evaluate(el => el.className);
        console.log(`Form element: ${tagName}, type: ${type}, id: ${id}, class: ${className}`);
      }
      
    } else {
      console.log('✓ Accessed admin page directly');
      
      // Audit the admin page layout
      await this.auditAdminLayout(page);
    }
  });

  test('inspect admin layout structure', async ({ page }) => {
    // First go to main app
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-results/main-app-layout.png', fullPage: true });
    
    // Check main app navigation structure
    const mainNavItems = await page.locator('nav a, aside a').all();
    console.log('Main app navigation items found:', mainNavItems.length);
    
    for (const navItem of mainNavItems.slice(0, 10)) { // Limit to first 10
      const text = await navItem.textContent();
      const href = await navItem.getAttribute('href');
      const isVisible = await navItem.isVisible();
      console.log(`Nav item: "${text}" -> ${href} (visible: ${isVisible})`);
    }
    
    // Try to access admin via URL manipulation
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();
    console.log('Final URL after admin navigation:', finalUrl);
    
    if (!finalUrl.includes('/auth/login')) {
      console.log('✓ Successfully accessed admin area');
      await this.auditAdminLayout(page);
    }
  });

  test('check sidebar persistence issues', async ({ page }) => {
    // Check if there are multiple layouts interfering with each other
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Look for sidebar elements
    const sidebars = await page.locator('[data-testid*="sidebar"], aside, nav[class*="sidebar"], div[class*="sidebar"]').all();
    console.log('Sidebar elements found:', sidebars.length);
    
    for (const sidebar of sidebars) {
      const classes = await sidebar.getAttribute('class');
      const testId = await sidebar.getAttribute('data-testid');
      const isVisible = await sidebar.isVisible();
      const boundingBox = await sidebar.boundingBox();
      
      console.log(`Sidebar: testId="${testId}", classes="${classes}", visible=${isVisible}`);
      if (boundingBox) {
        console.log(`  Position: x=${boundingBox.x}, y=${boundingBox.y}, w=${boundingBox.width}, h=${boundingBox.height}`);
      }
    }
    
    // Look for navigation that might be conflicting
    const navElements = await page.locator('nav').all();
    console.log('Navigation elements found:', navElements.length);
    
    for (let i = 0; i < navElements.length; i++) {
      const nav = navElements[i];
      const classes = await nav.getAttribute('class');
      const isVisible = await nav.isVisible();
      const textContent = (await nav.textContent() || '').substring(0, 100);
      
      console.log(`Nav ${i}: classes="${classes}", visible=${isVisible}`);
      console.log(`  Content preview: "${textContent}..."`);
    }
  });

  test('button responsiveness inspection', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Find all buttons and links
    const interactiveElements = await page.locator('button, a[role="button"], [role="button"]').all();
    console.log('Interactive elements found:', interactiveElements.length);
    
    for (let i = 0; i < Math.min(interactiveElements.length, 20); i++) { // Limit to first 20
      const element = interactiveElements[i];
      const text = (await element.textContent() || '').trim();
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      
      if (text && isVisible) {
        // Check CSS properties that might affect responsiveness
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            pointerEvents: computed.pointerEvents,
            cursor: computed.cursor,
            opacity: computed.opacity,
            display: computed.display,
            transform: computed.transform
          };
        });
        
        console.log(`Button "${text}": enabled=${isEnabled}, styles=`, styles);
        
        // Test hover effect
        try {
          await element.hover({ timeout: 1000 });
          const hoverStyles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              cursor: computed.cursor,
              backgroundColor: computed.backgroundColor,
              transform: computed.transform
            };
          });
          console.log(`  Hover styles:`, hoverStyles);
        } catch (error) {
          console.log(`  Hover failed: ${error.message}`);
        }
      }
    }
  });
});

// Helper function to audit admin layout
async function auditAdminLayout(page) {
  await page.screenshot({ path: 'test-results/admin-layout-audit.png', fullPage: true });
  
  // Check for admin-specific elements
  const adminElements = [
    'h1:has-text("Admin Dashboard")',
    'text=Home Drop Reviews',
    'text=Geographic View', 
    'text=Technicians',
    'text=Reports',
    'text=Data Export'
  ];
  
  for (const selector of adminElements) {
    const element = page.locator(selector);
    const count = await element.count();
    const visible = count > 0 ? await element.first().isVisible() : false;
    console.log(`Admin element "${selector}": found=${count}, visible=${visible}`);
  }
  
  // Check for layout conflicts
  const layouts = await page.locator('div[class*="layout"], div[class*="container"], main').all();
  console.log('Layout containers found:', layouts.length);
  
  for (let i = 0; i < layouts.length; i++) {
    const layout = layouts[i];
    const classes = await layout.getAttribute('class');
    const boundingBox = await layout.boundingBox();
    
    if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
      console.log(`Layout ${i}: classes="${classes}"`);
      console.log(`  Size: ${boundingBox.width}x${boundingBox.height}`);
    }
  }
}