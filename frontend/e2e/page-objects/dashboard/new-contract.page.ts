import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * New Contract page object
 *
 * Handles the contract creation flow including:
 * - Template selection
 * - Contract form filling
 * - Vendor selection
 * - Contract submission
 */
export class NewContractPage extends BasePage {
  // Page header
  readonly pageTitle: Locator;

  // Template selection
  readonly templateSelect: Locator;
  readonly templatePreview: Locator;

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

  // Status elements
  readonly loadingState: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Page header
    this.pageTitle = page.locator('h1, text=NEW CONTRACT, text=Create Contract').first();

    // Template selection
    this.templateSelect = page.locator('select, [role="combobox"]').filter({ has: page.locator('option, [role="option"]') }).first();
    this.templatePreview = page.locator('[class*="template-preview"], [class*="preview"]');

    // Contract form fields
    this.contractTitleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/contract title/i)).or(page.locator('input[name="title"]'));
    this.vendorSelect = page.getByLabel(/vendor/i).or(page.locator('select[name="vendor_id"]'));
    this.startDateInput = page.getByLabel(/start date/i).or(page.locator('input[name="start_date"]'));
    this.endDateInput = page.getByLabel(/end date/i).or(page.locator('input[name="end_date"]'));
    this.valueInput = page.getByLabel(/value|amount/i).or(page.locator('input[name="value"]'));
    this.descriptionInput = page.getByLabel(/description/i).or(page.locator('textarea[name="description"]'));

    // Action buttons
    this.submitButton = page.getByRole('button', { name: /create|submit|save/i }).filter({ hasNotText: /draft/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.saveDraftButton = page.getByRole('button', { name: /draft/i });

    // Status elements
    this.loadingState = page.locator('text=Loading..., text=Creating..., [class*="loading"], [class*="spinner"]');
    this.successMessage = page.locator('text=successfully created, text=Contract created, [class*="success"]');
    this.errorMessage = page.locator('[class*="error"], [role="alert"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/contracts/new');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for form to be ready
    await this.page.waitForSelector('form, input, button', { timeout: 15000 });
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
