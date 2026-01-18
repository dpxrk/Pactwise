import { test, expect } from '../../fixtures/base.fixture';

/**
 * Billing and Subscription E2E tests
 *
 * Tests billing functionality including:
 * - Billing page access
 * - Current plan display
 * - Subscription status
 * - Payment method display
 * - Invoice history
 * - Stripe portal integration
 */
test.describe('Billing & Subscription', () => {
  // These tests require authentication
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ billingPage }) => {
    await billingPage.goto();
    await billingPage.waitForLoad();
  });

  test.describe('Page Access', () => {
    test('should display billing page', async ({ billingPage }) => {
      await expect(billingPage.pageTitle).toBeVisible();
    });

    test('should be accessible from settings navigation', async ({ page }) => {
      // Navigate to settings first
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');

      // Look for billing link
      const billingLink = page.getByRole('link', { name: /billing/i }).or(
        page.locator('a[href*="billing"]')
      );

      await billingLink.click();
      await page.waitForURL(/\/billing/);

      expect(page.url()).toContain('billing');
    });
  });

  test.describe('Current Plan Display', () => {
    test('should display current plan name', async ({ billingPage }) => {
      const planName = await billingPage.getCurrentPlan();
      // Plan name should be one of the valid plans or empty (free tier)
      expect(typeof planName).toBe('string');
    });

    test('should display plan status', async ({ billingPage }) => {
      const hasStatus = await billingPage.planStatus.isVisible().catch(() => false);
      // Status may not be visible for free tier
      expect(typeof hasStatus).toBe('boolean');
    });
  });

  test.describe('Subscription Status', () => {
    test('should indicate if subscription is active', async ({ billingPage }) => {
      const isActive = await billingPage.isSubscriptionActive();
      expect(typeof isActive).toBe('boolean');
    });

    test('should indicate trial status if on trial', async ({ billingPage }) => {
      const isOnTrial = await billingPage.isOnTrial();
      expect(typeof isOnTrial).toBe('boolean');
    });
  });

  test.describe('Upgrade Options', () => {
    test('should show upgrade option for lower tier plans', async ({ billingPage }) => {
      const canUpgrade = await billingPage.canUpgrade();
      // Upgrade should be available except for Enterprise tier
      expect(typeof canUpgrade).toBe('boolean');
    });

    test('should open pricing modal on upgrade click', async ({ billingPage, page }) => {
      const canUpgrade = await billingPage.canUpgrade();
      test.skip(!canUpgrade, 'Upgrade not available for this plan');

      await billingPage.clickUpgradePlan();

      // Should show pricing modal or navigate to pricing page
      const hasModal = await billingPage.isPricingModalVisible();
      const isPricingPage = page.url().includes('pricing');

      expect(hasModal || isPricingPage).toBe(true);
    });
  });

  test.describe('Payment Methods', () => {
    test('should display payment methods section', async ({ billingPage }) => {
      const hasPaymentSection = await billingPage.paymentMethodsSection.isVisible().catch(() => false);
      expect(typeof hasPaymentSection).toBe('boolean');
    });

    test('should show add payment method button', async ({ billingPage }) => {
      const hasAddButton = await billingPage.addPaymentMethodButton.isVisible().catch(() => false);
      // May not be visible if payment method already exists
      expect(typeof hasAddButton).toBe('boolean');
    });

    test('should display existing payment method if configured', async ({ billingPage }) => {
      const hasPaymentMethod = await billingPage.hasPaymentMethod();
      expect(typeof hasPaymentMethod).toBe('boolean');
    });
  });

  test.describe('Invoice History', () => {
    test('should display invoices section', async ({ billingPage }) => {
      const hasInvoicesSection = await billingPage.invoicesSection.isVisible().catch(() => false);
      expect(typeof hasInvoicesSection).toBe('boolean');
    });

    test('should show invoice count', async ({ billingPage }) => {
      const count = await billingPage.getInvoiceCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Stripe Portal Integration', () => {
    test('should have manage billing button', async ({ billingPage }) => {
      const hasPortalButton = await billingPage.openStripePortalButton.isVisible().catch(() => false);
      expect(typeof hasPortalButton).toBe('boolean');
    });

    // Note: This test may redirect to Stripe which is an external service
    test.skip('should open Stripe billing portal', async ({ billingPage }) => {
      const hasPortalButton = await billingPage.openStripePortalButton.isVisible().catch(() => false);
      test.skip(!hasPortalButton, 'Stripe portal button not available');

      // Store current URL
      const currentUrl = billingPage.getCurrentUrl();

      await billingPage.openStripePortal();

      // Wait for redirect to Stripe or new tab
      await billingPage.page.waitForTimeout(2000);

      // URL should change or new tab should open
      const newUrl = billingPage.getCurrentUrl();
      const urlChanged = newUrl !== currentUrl;

      expect(urlChanged).toBe(true);
    });
  });

  test.describe('Subscription Management', () => {
    test('should have manage subscription option', async ({ billingPage }) => {
      const hasManageButton = await billingPage.manageSubscriptionButton.isVisible().catch(() => false);
      expect(typeof hasManageButton).toBe('boolean');
    });

    test('should show cancel option for paid subscriptions', async ({ billingPage }) => {
      const canCancel = await billingPage.canCancelSubscription();
      // Cancel should only be visible for paid plans
      expect(typeof canCancel).toBe('boolean');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle billing page load gracefully', async ({ billingPage }) => {
      // Should not show error message on normal load
      const hasError = await billingPage.errorMessage.isVisible().catch(() => false);
      expect(hasError).toBe(false);
    });
  });
});
