import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    // Wait for login page to load properly
    await page.waitForSelector('h1:has-text("Welcome to FibreField")', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Welcome to FibreField');
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access pole capture directly
    await page.goto('/pole-capture');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.locator('h1')).toContainText('Welcome to FibreField');
  });

  test('should redirect unauthenticated users from admin routes', async ({ page }) => {
    // Try to access admin page directly
    await page.goto('/admin/home-drop-reviews');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.locator('h1')).toContainText('Welcome to FibreField');
  });

  test('should display login form correctly', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Wait for login page to load (skip loading screen)
    await page.waitForSelector('h1:has-text("Welcome to FibreField")', { timeout: 10000 });
    
    // Check page elements
    await expect(page.locator('h1')).toContainText('Welcome to FibreField');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
    
    // Check navigation links
    await expect(page.locator('text=Register here')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toBeVisible();
  });

  test('should display register form correctly', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Check page elements
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('input[name="displayName"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').last()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
    
    // Check role selector
    await expect(page.locator('[data-testid="role-select"], button:has-text("Technician")').first()).toBeVisible();
    
    // Check navigation link
    await expect(page.locator('text=Sign in')).toBeVisible();
  });

  test('should display forgot password form correctly', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    // Wait for page to load and check for reset password form
    await page.waitForSelector('h1:has-text("Reset Password")', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Reset Password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Send Reset Email');
  });

  test('should validate required fields on login', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try to submit empty form
    await page.locator('button[type="submit"]').click();
    
    // Should show validation (HTML5 validation will prevent submission)
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Check that inputs are still focused/invalid
    await expect(emailInput).toBeFocused();
  });

  test('should validate required fields on register', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Try to submit empty form
    await page.locator('button[type="submit"]').click();
    
    // Should show validation (HTML5 validation will prevent submission)
    const displayNameInput = page.locator('input[name="displayName"]');
    await expect(displayNameInput).toBeFocused();
  });

  test('should validate password confirmation on register', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill in form with mismatched passwords
    await page.fill('input[name="displayName"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.locator('input[type="password"]').last().fill('different123');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Should show error message
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should handle navigation between auth pages', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login');
    await expect(page.locator('h1')).toContainText('Welcome to FibreField');
    
    // Go to register
    await page.locator('text=Register here').click();
    await expect(page.locator('h1')).toContainText('Create Account');
    
    // Go back to login
    await page.locator('text=Sign in').click();
    await expect(page.locator('h1')).toContainText('Welcome to FibreField');
    
    // Go to forgot password
    await page.locator('text=Forgot password?').click();
    await expect(page.locator('h1, h2, text=Forgot Password, text=Reset Password').first()).toBeVisible();
  });

  test('should prevent access to protected routes via direct URL', async ({ page }) => {
    const protectedRoutes = [
      '/pole-capture',
      '/home-drop-capture',
      '/assignments', 
      '/admin/home-drop-reviews',
      '/analytics',
      '/map'
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // All should redirect to login
      await expect(page).toHaveURL(/.*\/auth\/login/);
      await expect(page.locator('h1')).toContainText('Welcome to FibreField');
    }
  });

});