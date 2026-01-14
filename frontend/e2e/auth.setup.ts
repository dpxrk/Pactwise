import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Auth setup - runs once before all tests to create authenticated session
 *
 * Prerequisites:
 * 1. Create a test user in Supabase:
 *    - Email: e2e-test@pactwise.com (or value of E2E_TEST_USER_EMAIL)
 *    - Complete onboarding flow
 * 2. Set environment variables:
 *    - E2E_TEST_USER_EMAIL
 *    - E2E_TEST_USER_PASSWORD
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD must be set.\n' +
      'Add these to your .env.local or CI environment variables.'
    );
  }

  // Navigate to sign-in page
  await page.goto('/auth/sign-in');

  // Wait for the form to be ready (terminal boot animation)
  await page.waitForSelector('form', { timeout: 10000 });

  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  // This confirms authentication was successful
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });

  // Verify we're authenticated by checking for dashboard content
  await expect(page.locator('[data-testid="dashboard-header"], header, nav')).toBeVisible({ timeout: 10000 });

  // Handle onboarding if this is first login
  const currentUrl = page.url();
  if (currentUrl.includes('/onboarding')) {
    console.log('Test user needs onboarding - please complete onboarding manually first');
    throw new Error(
      'Test user has not completed onboarding.\n' +
      'Please sign in manually and complete the onboarding flow first.'
    );
  }

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log('✓ Authentication state saved to:', authFile);
});
