import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Contracts page object
 *
 * Handles the contracts list view including:
 * - Search functionality with URL sync
 * - Status filtering
 * - Vendor filtering
 * - Virtual scrolling list
 * - Statistics display
 * - New contract creation
 */
export class ContractsPage extends BasePage {
  // Status bar elements
  readonly systemStatus: Locator;
  readonly lastUpdateTime: Locator;
  readonly totalCount: Locator;
  readonly activeCount: Locator;
  readonly pendingCount: Locator;

  // Filter elements
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly vendorFilter: Locator;

  // Action buttons
  readonly newContractButton: Locator;
  readonly templatesButton: Locator;

  // Table elements
  readonly tableHeader: Locator;
  readonly contractRows: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;

  // Table header columns
  readonly idColumn: Locator;
  readonly titleColumn: Locator;
  readonly vendorColumn: Locator;
  readonly statusColumn: Locator;
  readonly startDateColumn: Locator;
  readonly endDateColumn: Locator;

  constructor(page: Page) {
    super(page);

    // Status bar elements
    this.systemStatus = page.locator('text=CONTRACTS SYSTEM');
    this.lastUpdateTime = page.locator('text=LAST UPDATE:');
    this.totalCount = page.locator('text=TOTAL:').locator('..').locator('.font-semibold');
    this.activeCount = page.locator('text=ACTIVE:').locator('..').locator('.font-semibold');
    this.pendingCount = page.locator('text=PENDING:').locator('..').locator('.font-semibold');

    // Filter elements
    this.searchInput = page.getByPlaceholder('SEARCH CONTRACTS...');
    this.statusFilter = page.locator('select').filter({ has: page.locator('option:has-text("ALL STATUSES")') });
    this.vendorFilter = page.locator('select').filter({ has: page.locator('option:has-text("ALL VENDORS")') });

    // Action buttons
    this.newContractButton = page.locator('button, a').filter({ hasText: /new contract/i });
    this.templatesButton = page.getByRole('button', { name: /templates/i });

    // Table elements
    this.tableHeader = page.locator('.bg-ghost-700').filter({ hasText: 'ID' });
    this.contractRows = page.locator('[class*="border-b"][class*="border-ghost-200"]').filter({ has: page.locator('button:has-text("VIEW")') });
    this.emptyState = page.locator('text=NO CONTRACTS');
    this.loadingSpinner = page.locator('text=Loading contracts..., text=LOADING...');

    // Table header columns
    this.idColumn = this.tableHeader.locator('text=ID');
    this.titleColumn = this.tableHeader.locator('text=TITLE');
    this.vendorColumn = this.tableHeader.locator('text=VENDOR');
    this.statusColumn = this.tableHeader.locator('text=STATUS');
    this.startDateColumn = this.tableHeader.locator('text=START');
    this.endDateColumn = this.tableHeader.locator('text=END');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/contracts');
  }

  async waitForLoad(): Promise<void> {
    // Wait for loading to complete
    await this.page.waitForSelector('text=CONTRACTS SYSTEM', { timeout: 30000 });
    // Wait for either contracts to load or empty state
    await Promise.race([
      this.contractRows.first().waitFor({ state: 'visible', timeout: 15000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {
      // Acceptable if still loading
    });
  }

  /**
   * Get total contracts count from stats bar
   */
  async getTotalCount(): Promise<number> {
    const text = await this.totalCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get active contracts count from stats bar
   */
  async getActiveCount(): Promise<number> {
    const text = await this.activeCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Get pending contracts count from stats bar
   */
  async getPendingCount(): Promise<number> {
    const text = await this.pendingCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * Search for contracts by text
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for debounce (300ms) and URL update
    await this.page.waitForTimeout(400);
    await this.waitForLoadingComplete();
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(400);
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: 'all' | 'active' | 'draft' | 'pending_analysis' | 'expired' | 'terminated' | 'archived'): Promise<void> {
    // Wait for select to be visible and interactable
    await this.statusFilter.waitFor({ state: 'visible', timeout: 5000 });

    // Select the option
    await this.statusFilter.selectOption(status);

    // Wait for React/Next.js to process the state change
    await this.page.waitForTimeout(500);

    // Wait for URL to update (router.push is async)
    if (status !== 'all') {
      // Wait for URL to contain the status parameter
      await this.page.waitForFunction(
        (expectedStatus) => window.location.search.includes(`status=${expectedStatus}`),
        status,
        { timeout: 5000 }
      ).catch(() => {
        // Log for debugging but don't fail - URL might update differently
        console.log(`Note: URL did not update to include status=${status}`);
      });
    }

    await this.waitForLoadingComplete();
  }

  /**
   * Filter by vendor
   */
  async filterByVendor(vendorId: string): Promise<void> {
    await this.vendorFilter.selectOption(vendorId);
    await this.waitForLoadingComplete();
  }

  /**
   * Reset all filters
   */
  async resetFilters(): Promise<void> {
    await this.clearSearch();
    await this.filterByStatus('all');
    // Go directly to clean URL
    await this.page.goto('/dashboard/contracts');
    await this.waitForLoad();
  }

  /**
   * Get number of visible contract rows
   */
  async getVisibleRowCount(): Promise<number> {
    return this.contractRows.count();
  }

  /**
   * Click on a contract row by index
   */
  async clickContractRow(index: number): Promise<void> {
    await this.contractRows.nth(index).click();
  }

  /**
   * Click View button on a contract row
   */
  async clickViewButton(index: number): Promise<void> {
    const row = this.contractRows.nth(index);
    await row.getByRole('button', { name: /view/i }).click();
  }

  /**
   * Get contract title from row
   */
  async getContractTitle(index: number): Promise<string> {
    const row = this.contractRows.nth(index);
    // Title is in the second column (flex-1)
    const titleCell = row.locator('.flex-1 .truncate, .flex-1 > div');
    return (await titleCell.textContent()) || '';
  }

  /**
   * Get contract status from row
   */
  async getContractStatus(index: number): Promise<string> {
    const row = this.contractRows.nth(index);
    const statusBadge = row.locator('span[class*="uppercase"]').first();
    return (await statusBadge.textContent()) || '';
  }

  /**
   * Open new contract modal
   */
  async openNewContractModal(): Promise<void> {
    await this.newContractButton.click();
    // Wait for modal to appear
    await this.page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
  }

  /**
   * Open templates explorer
   */
  async openTemplatesExplorer(): Promise<void> {
    await this.templatesButton.click();
    // Wait for modal to appear
    await this.page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
  }

  /**
   * Check if contracts are displayed
   */
  async hasContracts(): Promise<boolean> {
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
   * Verify URL contains expected filter params
   */
  async verifyUrlParams(expected: { status?: string; search?: string; vendor?: string }): Promise<void> {
    const url = this.getCurrentUrl();
    const searchParams = new URL(url).searchParams;

    if (expected.status) {
      expect(searchParams.get('status')).toBe(expected.status);
    }
    if (expected.search) {
      expect(searchParams.get('search')).toBe(expected.search);
    }
    if (expected.vendor) {
      expect(searchParams.get('vendor')).toBe(expected.vendor);
    }
  }

  /**
   * Verify search input value
   */
  async verifySearchValue(expected: string): Promise<void> {
    await expect(this.searchInput).toHaveValue(expected);
  }

  /**
   * Navigate to contract details page
   */
  async goToContractDetails(contractId: string): Promise<void> {
    await this.page.goto(`/dashboard/contracts/${contractId}`);
  }

  /**
   * Scroll down to load more contracts (infinite scroll)
   */
  async scrollToLoadMore(): Promise<void> {
    // Scroll to bottom of virtual list
    const container = this.page.locator('[class*="h-[600px]"]');
    await container.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for virtual list to render
   */
  async waitForVirtualList(): Promise<void> {
    await this.page.waitForSelector('[class*="h-[600px]"]', { timeout: 10000 });
  }
}
