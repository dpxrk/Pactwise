import { test, expect, Page } from '@playwright/test';

// Helper to login before tests
async function login(page: Page) {
  await page.goto('/auth/sign-in');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('Test123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/.*dashboard/);
}

test.describe('Contract Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display contracts list', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    
    // Check for main elements
    await expect(page.getByRole('heading', { name: /contracts/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search contracts/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create contract/i })).toBeVisible();
    
    // Check for table or list
    const contractsList = page.getByRole('table') || page.getByRole('list');
    await expect(contractsList).toBeVisible();
  });

  test('should filter contracts by search', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    
    // Type in search box
    const searchBox = page.getByPlaceholder(/search contracts/i);
    await searchBox.fill('Software License');
    
    // Wait for filtered results
    await page.waitForTimeout(500); // Debounce delay
    
    // Check that results are filtered
    const results = page.getByText('Software License');
    await expect(results.first()).toBeVisible();
  });

  test('should handle bulk selection', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    
    // Select all checkbox
    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
    await selectAllCheckbox.check();
    
    // Bulk actions should appear
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should navigate to contract details', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    
    // Click on first contract
    const firstContract = page.getByRole('row').nth(1);
    await firstContract.click();
    
    // Should navigate to detail page
    await expect(page).toHaveURL(/.*contracts\/[a-zA-Z0-9]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should create new contract', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    
    // Click create button
    await page.getByRole('button', { name: /create contract/i }).click();
    
    // Fill form
    await page.getByLabel(/title/i).fill('Test Contract');
    await page.getByLabel(/vendor/i).selectOption({ index: 1 });
    await page.getByLabel(/type/i).selectOption('saas');
    await page.getByLabel(/value/i).fill('50000');
    
    // Upload file
    const fileInput = page.getByLabel(/upload/i);
    await fileInput.setInputFiles('./test-fixtures/sample-contract.pdf');
    
    // Submit
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should redirect to new contract
    await expect(page).toHaveURL(/.*contracts\/[a-zA-Z0-9]+$/);
    await expect(page.getByText('Test Contract')).toBeVisible();
  });

  test('should handle contract analysis', async ({ page }) => {
    await page.goto('/dashboard/contracts/sample-id');
    
    // Click analyze button
    await page.getByRole('button', { name: /analyze/i }).click();
    
    // Should show progress
    await expect(page.getByText(/analyzing/i)).toBeVisible();
    
    // Wait for completion (mock)
    await page.waitForTimeout(2000);
    
    // Should show results
    await expect(page.getByText(/analysis complete/i)).toBeVisible();
    await expect(page.getByRole('tab', { name: /clauses/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /risks/i })).toBeVisible();
  });
});

test.describe('Mobile Contract Management', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show mobile-optimized contract list', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    
    // Should show cards instead of table
    await expect(page.getByRole('table')).not.toBeVisible();
    
    // Check for touch-friendly elements
    const contractCards = page.locator('[role="button"]').filter({ hasText: /contract/i });
    const firstCard = contractCards.first();
    
    // Check minimum touch target size (44px)
    const box = await firstCard.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle swipe gestures', async ({ page }) => {
    await page.goto('/dashboard/contracts');
    
    const firstCard = page.locator('[role="button"]').first();
    
    // Simulate swipe left
    await firstCard.dispatchEvent('touchstart', { touches: [{ clientX: 300, clientY: 100 }] });
    await firstCard.dispatchEvent('touchend', { changedTouches: [{ clientX: 100, clientY: 100 }] });
    
    // Actions menu should appear
    await expect(page.getByRole('menu')).toBeVisible();
  });
});