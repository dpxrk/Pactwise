import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * New Contract page object
 *
 * Handles the contract creation flow including:
 * - Initial view with template/upload options
 * - Template selection
 * - Contract form filling
 * - Vendor selection
 * - Contract submission
 */
export class NewContractPage extends BasePage {
  // Page header
  readonly pageTitle: Locator;

  // Initial view - option cards
  readonly useTemplateCard: Locator;
  readonly uploadContractCard: Locator;

  // Template selection
  readonly templateSelect: Locator;
  readonly templatePreview: Locator;
  readonly templateCards: Locator;

  // Contract form fields
  readonly contractTitleInput: Locator;
  readonly vendorSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly valueInput: Locator;
  readonly descriptionInput: Locator;

  // Action buttons
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly saveDraftButton: Locator;
  readonly backButton: Locator;

  // Status elements
  readonly loadingState: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Page header - matches both initial and form views
    this.pageTitle = page.locator('h1').first();

    // Initial view - option cards
    this.useTemplateCard = page.locator('text=Use a Template').locator('..');
    this.uploadContractCard = page.locator('text=Upload Contract').locator('..');

    // Template selection
    this.templateSelect = page.locator('select, [role="combobox"]').filter({ has: page.locator('option, [role="option"]') }).first();
    this.templatePreview = page.locator('[class*="template-preview"], [class*="preview"]');
    this.templateCards = page.locator('[class*="cursor-pointer"]').filter({ has: page.locator('text=Used') });

    // Contract form fields - using id="title" as defined in the actual component
    this.contractTitleInput = page.locator('#title').or(page.getByLabel(/Contract Title/i)).or(page.getByPlaceholder(/Website Development/i));
    this.vendorSelect = page.locator('[role="combobox"]').filter({ has: page.locator('text=Select a vendor') }).or(page.getByLabel(/vendor/i));
    this.startDateInput = page.getByLabel(/start date/i).or(page.locator('button:has-text("Pick date")').first());
    this.endDateInput = page.getByLabel(/end date/i).or(page.locator('button:has-text("Pick date")').last());
    this.valueInput = page.locator('#value').or(page.getByLabel(/Contract Value/i));
    this.descriptionInput = page.locator('#notes').or(page.getByLabel(/Additional Notes/i));

    // Action buttons
    this.submitButton = page.getByRole('button', { name: /Generate Contract|Create|Submit/i });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.saveDraftButton = page.getByRole('button', { name: /draft/i });
    this.backButton = page.locator('button').filter({ has: page.locator('svg') }).first();

    // Status elements
    this.loadingState = page.locator('text=Loading..., text=Generating..., [class*="loading"], [class*="spinner"], [class*="animate-spin"]');
    this.successMessage = page.locator('text=successfully, text=generated successfully, [class*="success"]');
    this.errorMessage = page.locator('[class*="error"], [role="alert"], text=Failed');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/contracts/new');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for page to be ready - either h1, cards, form, or loading state
    await Promise.race([
      this.page.waitForSelector('h1', { timeout: 30000 }),
      this.page.waitForSelector('text=Use a Template', { timeout: 30000 }),
      this.page.waitForSelector('text=Create New Contract', { timeout: 30000 }),
      this.page.waitForSelector('text=Create Contract', { timeout: 30000 }),
      this.page.waitForSelector('input', { timeout: 30000 }),
      this.page.waitForSelector('[class*="skeleton"]', { timeout: 30000 }),
    ]).catch(() => {
      // If none found, page might still be loading - continue anyway
    });
    // Small wait for any animations
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if we're on the initial selection view
   */
  async isOnInitialView(): Promise<boolean> {
    return this.useTemplateCard.isVisible().catch(() => false);
  }

  /**
   * Check if we're on the contract form view
   */
  async isOnFormView(): Promise<boolean> {
    return this.contractTitleInput.isVisible().catch(() => false);
  }

  /**
   * Select the "Use a Template" option to proceed to template selection
   */
  async selectUseTemplate(): Promise<void> {
    await this.useTemplateCard.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select a template card by index
   */
  async selectTemplateByIndex(index: number = 0): Promise<void> {
    await this.templateCards.nth(index).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to form view (if not already there)
   */
  async navigateToForm(): Promise<void> {
    // If on initial view, click Use Template
    if (await this.isOnInitialView()) {
      await this.selectUseTemplate();
      // Wait for templates to load
      await this.page.waitForTimeout(1000);
      // Select first template if available
      const templateCount = await this.templateCards.count();
      if (templateCount > 0) {
        await this.selectTemplateByIndex(0);
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Select a template by name or value
   */
  async selectTemplate(templateNameOrId: string): Promise<void> {
    await this.templateSelect.waitFor({ state: 'visible', timeout: 5000 });
    await this.templateSelect.selectOption({ label: templateNameOrId }).catch(() => {
      // Try by value if label didn't work
      return this.templateSelect.selectOption(templateNameOrId);
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill contract title
   */
  async fillTitle(title: string): Promise<void> {
    await this.contractTitleInput.fill(title);
  }

  /**
   * Select vendor by name or ID
   */
  async selectVendor(vendorNameOrId: string): Promise<void> {
    await this.vendorSelect.waitFor({ state: 'visible', timeout: 5000 });
    await this.vendorSelect.selectOption({ label: vendorNameOrId }).catch(() => {
      return this.vendorSelect.selectOption(vendorNameOrId);
    });
  }

  /**
   * Fill start date
   */
  async fillStartDate(date: string): Promise<void> {
    await this.startDateInput.fill(date);
  }

  /**
   * Fill end date
   */
  async fillEndDate(date: string): Promise<void> {
    await this.endDateInput.fill(date);
  }

  /**
   * Fill contract value
   */
  async fillValue(value: string): Promise<void> {
    await this.valueInput.fill(value);
  }

  /**
   * Fill description
   */
  async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  /**
   * Fill complete contract form
   */
  async fillContractForm(data: {
    title: string;
    vendor?: string;
    startDate?: string;
    endDate?: string;
    value?: string;
    description?: string;
  }): Promise<void> {
    await this.fillTitle(data.title);

    if (data.vendor) {
      await this.selectVendor(data.vendor);
    }

    if (data.startDate) {
      await this.fillStartDate(data.startDate);
    }

    if (data.endDate) {
      await this.fillEndDate(data.endDate);
    }

    if (data.value) {
      await this.fillValue(data.value);
    }

    if (data.description) {
      await this.fillDescription(data.description);
    }
  }

  /**
   * Submit the contract form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Save as draft
   */
  async saveAsDraft(): Promise<void> {
    await this.saveDraftButton.click();
  }

  /**
   * Cancel creation
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Wait for success message
   */
  async waitForSuccess(): Promise<void> {
    await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Check if there's an error message
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * Check if form validation errors are shown
   */
  async hasValidationErrors(): Promise<boolean> {
    const errors = this.page.locator('[class*="error"], [aria-invalid="true"]');
    return (await errors.count()) > 0;
  }
}
