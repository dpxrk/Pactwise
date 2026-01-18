import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Billing page object
 *
 * Handles billing settings including:
 * - Current plan display
 * - Subscription management
 * - Payment method management
 * - Invoice history
 * - Stripe portal access
 */
export class BillingPage extends BasePage {
  // Page header
  readonly pageTitle: Locator;
  readonly billingSystemStatus: Locator;

  // Current plan section
  readonly currentPlanCard: Locator;
  readonly planName: Locator;
  readonly planPrice: Locator;
  readonly planStatus: Locator;
  readonly nextBillingDate: Locator;

  // Subscription actions
  readonly upgradePlanButton: Locator;
  readonly downgradePlanButton: Locator;
  readonly cancelSubscriptionButton: Locator;
  readonly manageSubscriptionButton: Locator;

  // Payment methods
  readonly paymentMethodsSection: Locator;
  readonly addPaymentMethodButton: Locator;
  readonly defaultPaymentMethod: Locator;

  // Invoice history
  readonly invoicesSection: Locator;
  readonly invoiceRows: Locator;
  readonly viewAllInvoicesButton: Locator;

  // Stripe portal
  readonly openStripePortalButton: Locator;

  // Status elements
  readonly loadingState: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Page header
    this.pageTitle = page.locator('h1, text=BILLING, text=Billing').first();
    this.billingSystemStatus = page.locator('text=BILLING SYSTEM, text=SUBSCRIPTION');

    // Current plan section
    this.currentPlanCard = page.locator('[class*="plan"], [class*="subscription"]').first();
    this.planName = page.locator('text=Starter, text=Professional, text=Business, text=Enterprise, text=Free, text=Trial').first();
    this.planPrice = page.locator('text=$').first();
    this.planStatus = page.locator('text=Active, text=Trialing, text=Canceled, text=Past Due').first();
    this.nextBillingDate = page.locator('text=Next billing, text=Renews').first();

    // Subscription actions
    this.upgradePlanButton = page.getByRole('button', { name: /upgrade/i });
    this.downgradePlanButton = page.getByRole('button', { name: /downgrade/i });
    this.cancelSubscriptionButton = page.getByRole('button', { name: /cancel subscription/i });
    this.manageSubscriptionButton = page.getByRole('button', { name: /manage subscription/i });

    // Payment methods
    this.paymentMethodsSection = page.locator('text=Payment Method, text=Payment Methods').first().locator('..');
    this.addPaymentMethodButton = page.getByRole('button', { name: /add payment|add card/i });
    this.defaultPaymentMethod = page.locator('text=•••• , text=ending in').first();

    // Invoice history
    this.invoicesSection = page.locator('text=Invoice, text=Invoices, text=Billing History').first().locator('..');
    this.invoiceRows = page.locator('[class*="invoice"], tr').filter({ has: page.locator('text=$') });
    this.viewAllInvoicesButton = page.getByRole('button', { name: /view all invoices/i }).or(page.getByRole('link', { name: /view all/i }));

    // Stripe portal
    this.openStripePortalButton = page.getByRole('button', { name: /billing portal|manage billing|stripe/i });

    // Status elements
    this.loadingState = page.locator('text=Loading..., [class*="loading"], [class*="spinner"]');
    this.errorMessage = page.locator('[class*="error"], [role="alert"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/settings/billing');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for billing content to load
    await this.page.waitForSelector('text=BILLING, text=Billing, text=Subscription, text=Plan', { timeout: 15000 });
  }

  /**
   * Get current plan name
   */
  async getCurrentPlan(): Promise<string> {
    return (await this.planName.textContent()) || '';
  }

  /**
   * Get current plan status
   */
  async getPlanStatus(): Promise<string> {
    return (await this.planStatus.textContent()) || '';
  }

  /**
   * Check if user is on trial
   */
  async isOnTrial(): Promise<boolean> {
    const status = await this.getPlanStatus();
    return status.toLowerCase().includes('trial');
  }

  /**
   * Check if subscription is active
   */
  async isSubscriptionActive(): Promise<boolean> {
    const status = await this.getPlanStatus();
    return status.toLowerCase().includes('active') || status.toLowerCase().includes('trial');
  }

  /**
   * Get visible invoice count
   */
  async getInvoiceCount(): Promise<number> {
    return this.invoiceRows.count();
  }

  /**
   * Check if payment method is configured
   */
  async hasPaymentMethod(): Promise<boolean> {
    return this.defaultPaymentMethod.isVisible();
  }

  /**
   * Click upgrade plan button
   */
  async clickUpgradePlan(): Promise<void> {
    await this.upgradePlanButton.click();
  }

  /**
   * Click manage subscription button
   */
  async clickManageSubscription(): Promise<void> {
    await this.manageSubscriptionButton.click();
  }

  /**
   * Open Stripe billing portal
   * Note: This opens in a new tab or redirects to Stripe
   */
  async openStripePortal(): Promise<void> {
    await this.openStripePortalButton.click();
  }

  /**
   * Wait for Stripe redirect
   */
  async waitForStripeRedirect(): Promise<void> {
    await this.page.waitForURL(/stripe\.com|billing\.stripe\.com/, { timeout: 15000 });
  }

  /**
   * Check for pricing modal
   */
  async isPricingModalVisible(): Promise<boolean> {
    return this.page.locator('[role="dialog"], .modal').filter({ hasText: /pricing|plans/i }).isVisible();
  }

  /**
   * Select a plan from pricing modal
   */
  async selectPlan(planName: 'Starter' | 'Professional' | 'Business' | 'Enterprise'): Promise<void> {
    const planCard = this.page.locator('[role="dialog"], .modal').locator(`text=${planName}`).locator('..');
    await planCard.getByRole('button', { name: /select|choose|subscribe/i }).click();
  }

  /**
   * Check if upgrade button is visible
   */
  async canUpgrade(): Promise<boolean> {
    return this.upgradePlanButton.isVisible();
  }

  /**
   * Check if cancel button is visible
   */
  async canCancelSubscription(): Promise<boolean> {
    return this.cancelSubscriptionButton.isVisible();
  }
}
