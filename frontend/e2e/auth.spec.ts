import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to sign-in page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('should show sign-in form with correct elements', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Check for form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Check for sign-up link
    await expect(page.getByText(/don't have an account/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Enter invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for error message
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should handle successful login', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Fill in valid credentials
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Test123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    // Assume user is logged in
    await page.goto('/dashboard');
    
    // Click user menu
    await page.getByRole('button', { name: /user menu/i }).click();
    await page.getByRole('menuitem', { name: /log out/i }).click();
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
  });
});