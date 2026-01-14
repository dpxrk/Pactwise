import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Vendors page object
 *
 * Handles the vendors list view including:
 * - Search functionality
 * - Status filtering (ALL, ACTIVE, PENDING)
 * - Category filtering
 * - Vendor table with selection
 * - Analysis panel
 * - CRUD operations
 * - Keyboard navigation
 */
export class VendorsPage extends BasePage {
  // Status bar elements
  readonly systemStatus: Locator;
  readonly totalCount: Locator;
  readonly activeCount: Locator;
  readonly spendCount: Locator;

  // Metrics bar elements
  readonly metricsTotal: Locator;
  readonly metricsActive: Locator;
  readonly metricsSpend: Locator;
  readonly metricsContracts: Locator;
  readonly metricsPerformance: Locator;
  readonly metricsAtRisk: Locator;

  // Filter elements
  readonly statusAllButton: Locator;
  readonly statusActiveButton: Locator;
  readonly statusPendingButton: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;

  // Action buttons
  readonly newVendorButton: Locator;

  // Table elements
  readonly tableHeader: Locator;
  readonly vendorRows: Locator;
  readonly emptyState: Locator;
  readonly vendorCount: Locator;
  readonly keyboardHint: Locator;

  // Analysis panel
  readonly analysisPanel: Locator;
  readonly selectedVendorName: Locator;
  readonly fullAnalysisButton: Locator;
  readonly exportReportButton: Locator;
  readonly deleteVendorButton: Locator;

  // Modal elements
  readonly vendorFormModal: Locator;
  readonly detailsModal: Locator;
  readonly closeModalButton: Locator;

  constructor(page: Page) {
    super(page);

    // Status bar elements
    this.systemStatus = page.locator('text=VENDOR SYSTEM');
    this.totalCount = page.locator('.flex.items-center.gap-6').locator('text=TOTAL:').locator('..').locator('.font-semibold');
    this.activeCount = page.locator('.flex.items-center.gap-6').locator('text=ACTIVE:').locator('..').locator('.font-semibold');
    this.spendCount = page.locator('.flex.items-center.gap-6').locator('text=SPEND:').locator('..').locator('.font-semibold');

    // Metrics bar elements
    this.metricsTotal = page.locator('.grid-cols-6 >> text=TOTAL').locator('..').locator('.text-xl');
    this.metricsActive = page.locator('.grid-cols-6 >> text=ACTIVE').locator('..').locator('.text-xl');
    this.metricsSpend = page.locator('.grid-cols-6 >> text=SPEND').locator('..').locator('.text-xl');
    this.metricsContracts = page.locator('.grid-cols-6 >> text=CONTRACTS').locator('..').locator('.text-xl');
    this.metricsPerformance = page.locator('.grid-cols-6 >> text=PERFORMANCE').locator('..').locator('.text-xl');
    this.metricsAtRisk = page.locator('.grid-cols-6 >> text=AT RISK').locator('..').locator('.text-xl');

    // Filter elements
    this.statusAllButton = page.locator('button').filter({ hasText: /^ALL$/ });
    this.statusActiveButton = page.locator('button').filter({ hasText: /^ACTIVE$/ });
    this.statusPendingButton = page.locator('button').filter({ hasText: /^PENDING$/ });
    this.searchInput = page.getByPlaceholder('SEARCH VENDORS...');
    this.categoryFilter = page.locator('select').filter({ has: page.locator('text=ALL CATEGORIES') });

    // Action buttons
    this.newVendorButton = page.getByRole('button', { name: /new vendor/i });

    // Table elements
    this.tableHeader = page.locator('.bg-terminal-surface').filter({ hasText: 'NAME' });
    this.vendorRows = page.locator('button').filter({ has: page.locator('[class*="col-span-3"]') });
    this.emptyState = page.locator('text=NO VENDORS FOUND');
    this.vendorCount = page.locator('text=/\\d+ VENDORS/');
    this.keyboardHint = page.locator('text=USE ↑/↓ TO NAVIGATE');

    // Analysis panel
    this.analysisPanel = page.locator('text=Vendor Analysis').locator('..').locator('..');
    this.selectedVendorName = page.locator('.font-semibold.text-purple-900.text-sm');
    this.fullAnalysisButton = page.getByRole('button', { name: /full analysis/i });
    this.exportReportButton = page.getByRole('button', { name: /export report/i });
    this.deleteVendorButton = page.getByRole('button', { name: /delete vendor/i });

    // Modal elements
    this.vendorFormModal = page.locator('[role="dialog"]').filter({ hasText: /vendor/i });
    this.detailsModal = page.locator('.fixed.top-0.right-0').filter({ hasText: 'Vendor Details' });
    this.closeModalButton = page.locator('.fixed.top-0.right-0 button').filter({ has: page.locator('svg.lucide-x') });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/vendors');
  }

  async waitForLoad(): Promise<void> {
    // Wait for system status to appear
    await this.page.waitForSelector('text=VENDOR SYSTEM', { timeout: 30000 });
    // Wait for either vendors to load or empty state
    await Promise.race([
      this.vendorRows.first().waitFor({ state: 'visible', timeout: 15000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {
      // Acceptable if still loading
    });
  }

  /**
   * Get total vendors count from metrics
   */
  async getTotalCount(): Promise<number> {
    const text = await this.metricsTotal.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get active vendors count from metrics
   */
  async getActiveCount(): Promise<number> {
    const text = await this.metricsActive.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get at-risk vendors count from metrics
   */
  async getAtRiskCount(): Promise<number> {
    const text = await this.metricsAtRisk.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Search for vendors by text
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.waitForLoadingComplete();
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by status using button
   */
  async filterByStatus(status: 'all' | 'active' | 'pending'): Promise<void> {
    switch (status) {
      case 'all':
        await this.statusAllButton.click();
        break;
      case 'active':
        await this.statusActiveButton.click();
        break;
      case 'pending':
        await this.statusPendingButton.click();
        break;
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by category
   */
  async filterByCategory(category: string): Promise<void> {
    await this.categoryFilter.selectOption(category);
    await this.waitForLoadingComplete();
  }

  /**
   * Get number of visible vendor rows
   */
  async getVisibleRowCount(): Promise<number> {
    return this.vendorRows.count();
  }

  /**
   * Click on a vendor row by index
   */
  async selectVendorByIndex(index: number): Promise<void> {
    await this.vendorRows.nth(index).click();
  }

  /**
   * Get vendor name from row
   */
  async getVendorName(index: number): Promise<string> {
    const row = this.vendorRows.nth(index);
    const nameCell = row.locator('.col-span-3.text-purple-900');
    return (await nameCell.textContent()) || '';
  }

  /**
   * Get vendor status from row
   */
  async getVendorStatus(index: number): Promise<string> {
    const row = this.vendorRows.nth(index);
    const statusCell = row.locator('.col-span-2 >> text=/ACTIVE|PENDING|INACTIVE/');
    return (await statusCell.textContent()) || '';
  }

  /**
   * Check if vendor is selected (has selection styling)
   */
  async isVendorSelected(index: number): Promise<boolean> {
    const row = this.vendorRows.nth(index);
    const classes = await row.getAttribute('class');
    return classes?.includes('bg-terminal-hover') || false;
  }

  /**
   * Open new vendor form
   */
  async openNewVendorForm(): Promise<void> {
    await this.newVendorButton.click();
    await this.vendorFormModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Check if analysis panel shows vendor info
   */
  async isAnalysisPanelVisible(): Promise<boolean> {
    return this.selectedVendorName.isVisible();
  }

  /**
   * Get selected vendor name from analysis panel
   */
  async getSelectedVendorNameFromPanel(): Promise<string> {
    return (await this.selectedVendorName.textContent()) || '';
  }

  /**
   * Open full analysis for selected vendor
   */
  async openFullAnalysis(): Promise<void> {
    await this.fullAnalysisButton.click();
    await this.detailsModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Close details modal
   */
  async closeDetailsModal(): Promise<void> {
    await this.closeModalButton.click();
    await this.detailsModal.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /**
   * Export report for selected vendor
   */
  async exportReport(): Promise<void> {
    // Set up download handler before clicking
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportReportButton.click();
    await downloadPromise;
  }

  /**
   * Delete selected vendor (will show confirmation dialog)
   */
  async deleteVendor(): Promise<void> {
    // Set up dialog handler
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.deleteVendorButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Use keyboard to navigate up
   */
  async navigateUp(): Promise<void> {
    await this.page.keyboard.press('ArrowUp');
  }

  /**
   * Use keyboard to navigate down
   */
  async navigateDown(): Promise<void> {
    await this.page.keyboard.press('ArrowDown');
  }

  /**
   * Use keyboard to open details (Enter)
   */
  async pressEnterToOpenDetails(): Promise<void> {
    await this.page.keyboard.press('Enter');
    await this.detailsModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Fill vendor form
   * The VendorForm component has these fields:
   * - Vendor Name (required)
   * - Category (select)
   * - Status (select)
   * - Email
   * - Phone
   * - Website
   * - Address
   * - Notes
   */
  async fillVendorForm(data: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    notes?: string;
  }): Promise<void> {
    const modal = this.vendorFormModal;

    // Name field - matches "Vendor Name" label
    await modal.getByLabel(/vendor name/i).fill(data.name);

    if (data.email) {
      // Email field - label is just "Email"
      await modal.getByLabel(/^email$/i).fill(data.email);
    }

    if (data.phone) {
      // Phone field - label is just "Phone"
      await modal.getByLabel(/^phone$/i).fill(data.phone);
    }

    if (data.website) {
      await modal.getByLabel(/website/i).fill(data.website);
    }

    if (data.address) {
      await modal.getByLabel(/address/i).fill(data.address);
    }

    if (data.notes) {
      await modal.getByLabel(/notes/i).fill(data.notes);
    }
  }

  /**
   * Submit vendor form
   */
  async submitVendorForm(): Promise<void> {
    const modal = this.vendorFormModal;
    await modal.getByRole('button', { name: /save|create|submit/i }).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Close vendor form without saving
   */
  async closeVendorForm(): Promise<void> {
    // Use the Cancel button which is more reliable than the X icon
    const cancelButton = this.vendorFormModal.getByRole('button', { name: /cancel/i });
    await cancelButton.click();
    // Wait for modal to close
    await this.vendorFormModal.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /**
   * Check if vendors are displayed
   */
  async hasVendors(): Promise<boolean> {
    const count = await this.getVisibleRowCount();
    return count > 0;
  }

  /**
   * Check if empty state is shown
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Verify metrics are displayed
   */
  async verifyMetricsDisplayed(): Promise<void> {
    await expect(this.metricsTotal).toBeVisible();
    await expect(this.metricsActive).toBeVisible();
    await expect(this.metricsSpend).toBeVisible();
    await expect(this.metricsContracts).toBeVisible();
    await expect(this.metricsPerformance).toBeVisible();
    await expect(this.metricsAtRisk).toBeVisible();
  }

  /**
   * Verify keyboard navigation hint is visible
   */
  async verifyKeyboardHintVisible(): Promise<void> {
    await expect(this.keyboardHint).toBeVisible();
  }
}
