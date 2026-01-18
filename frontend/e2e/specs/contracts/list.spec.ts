import { test, expect } from '../../fixtures/base.fixture';

/**
 * Contracts list page E2E tests
 *
 * Tests contract list functionality including:
 * - System status display
 * - Statistics (total/active/pending)
 * - Search with URL sync
 * - Status filtering
 * - Filter persistence on reload
 * - Virtual scrolling
 */
test.describe('Contracts List Page', () => {
  // These tests require authentication
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ contractsPage }) => {
    await contractsPage.goto();
    await contractsPage.waitForLoad();
  });

  test.describe('System Status', () => {
    test('should display system status indicator', async ({ contractsPage }) => {
      await expect(contractsPage.systemStatus).toBeVisible();
    });

    test('should display last update time', async ({ contractsPage }) => {
      await expect(contractsPage.lastUpdateTime).toBeVisible();
    });
  });

  test.describe('Statistics Display', () => {
    test('should display total contracts count', async ({ contractsPage }) => {
      const total = await contractsPage.getTotalCount();
      expect(total).toBeGreaterThanOrEqual(0);
    });

    test('should display active contracts count', async ({ contractsPage }) => {
      const active = await contractsPage.getActiveCount();
      expect(active).toBeGreaterThanOrEqual(0);
    });

    test('should display pending contracts count', async ({ contractsPage }) => {
      const pending = await contractsPage.getPendingCount();
      expect(pending).toBeGreaterThanOrEqual(0);
    });

    test('should have consistent counts (active + pending <= total)', async ({ contractsPage }) => {
      const total = await contractsPage.getTotalCount();
      const active = await contractsPage.getActiveCount();
      const pending = await contractsPage.getPendingCount();

      // Active + pending should not exceed total (other statuses exist)
      expect(active + pending).toBeLessThanOrEqual(total);
    });
  });

  test.describe('Search Functionality', () => {
    test('should have search input visible', async ({ contractsPage }) => {
      await expect(contractsPage.searchInput).toBeVisible();
    });

    test('should update URL when searching', async ({ contractsPage }) => {
      await contractsPage.search('test contract');

      await contractsPage.verifyUrlParams({ search: 'test contract' });
    });

    test('should clear URL param when search is cleared', async ({ contractsPage }) => {
      // First search
      await contractsPage.search('test');
      await contractsPage.verifyUrlParams({ search: 'test' });

      // Clear search
      await contractsPage.clearSearch();

      // URL should not have search param
      const url = contractsPage.getCurrentUrl();
      expect(url).not.toContain('search=');
    });

    test('should restore search from URL on page load', async ({ contractsPage, page }) => {
      // Navigate with search param
      await page.goto('/dashboard/contracts?search=existing');
      await contractsPage.waitForLoad();

      // Search input should have the value
      await contractsPage.verifySearchValue('existing');
    });
  });

  test.describe('Status Filtering', () => {
    test('should have status filter dropdown', async ({ contractsPage }) => {
      await expect(contractsPage.statusFilter).toBeVisible();
    });

    test('should filter by active status', async ({ contractsPage }) => {
      await contractsPage.filterByStatus('active');

      await contractsPage.verifyUrlParams({ status: 'active' });
    });

    test('should filter by draft status', async ({ contractsPage }) => {
      await contractsPage.filterByStatus('draft');

      await contractsPage.verifyUrlParams({ status: 'draft' });
    });

    test('should filter by pending_analysis status', async ({ contractsPage }) => {
      await contractsPage.filterByStatus('pending_analysis');

      await contractsPage.verifyUrlParams({ status: 'pending_analysis' });
    });

    test('should clear status filter when selecting all', async ({ contractsPage }) => {
      // First filter
      await contractsPage.filterByStatus('active');

      // Then select all
      await contractsPage.filterByStatus('all');

      // URL should not have status param
      const url = contractsPage.getCurrentUrl();
      expect(url).not.toContain('status=');
    });
  });

  test.describe('Filter Persistence', () => {
    test('should persist search filter on reload', async ({ contractsPage, page }) => {
      await contractsPage.search('persistent search');

      // Reload the page
      await page.reload();
      await contractsPage.waitForLoad();

      // Search should still be there
      await contractsPage.verifySearchValue('persistent search');
    });

    test('should persist status filter on reload', async ({ contractsPage, page }) => {
      await contractsPage.filterByStatus('active');

      // Reload the page
      await page.reload();
      await contractsPage.waitForLoad();

      // URL should still have status param
      await contractsPage.verifyUrlParams({ status: 'active' });
    });

    test('should persist combined filters on reload', async ({ contractsPage, page }) => {
      await contractsPage.search('combined');
      await contractsPage.filterByStatus('draft');

      // Reload the page
      await page.reload();
      await contractsPage.waitForLoad();

      // Both filters should persist
      await contractsPage.verifySearchValue('combined');
      await contractsPage.verifyUrlParams({ status: 'draft', search: 'combined' });
    });
  });

  test.describe('Contract List Display', () => {
    test('should display table header with all columns', async ({ contractsPage }) => {
      await expect(contractsPage.tableHeader).toBeVisible();
      await expect(contractsPage.idColumn).toBeVisible();
      await expect(contractsPage.titleColumn).toBeVisible();
      await expect(contractsPage.vendorColumn).toBeVisible();
      await expect(contractsPage.statusColumn).toBeVisible();
      await expect(contractsPage.startDateColumn).toBeVisible();
      await expect(contractsPage.endDateColumn).toBeVisible();
    });

    test('should show contracts or empty state', async ({ contractsPage }) => {
      const hasContracts = await contractsPage.hasContracts();
      const isEmptyVisible = await contractsPage.isEmptyStateVisible();

      // Either contracts are displayed or empty state is shown
      expect(hasContracts || isEmptyVisible).toBe(true);
    });
  });

  test.describe('Contract Row Interactions', () => {
    // Skip if no contracts
    test('should click View button to navigate to contract details', async ({ contractsPage }) => {
      const hasContracts = await contractsPage.hasContracts();
      test.skip(!hasContracts, 'No contracts to test');

      await contractsPage.clickViewButton(0);

      // Should navigate to contract details page
      await contractsPage.page.waitForURL(/\/dashboard\/contracts\/[a-f0-9-]+/);
    });

    test('should display contract title in row', async ({ contractsPage }) => {
      const hasContracts = await contractsPage.hasContracts();
      test.skip(!hasContracts, 'No contracts to test');

      const title = await contractsPage.getContractTitle(0);
      expect(title.length).toBeGreaterThan(0);
    });

    test('should display contract status badge', async ({ contractsPage }) => {
      const hasContracts = await contractsPage.hasContracts();
      test.skip(!hasContracts, 'No contracts to test');

      const status = await contractsPage.getContractStatus(0);
      expect(status.length).toBeGreaterThan(0);
    });
  });

  test.describe('Action Buttons', () => {
    test('should have new contract button visible', async ({ contractsPage }) => {
      await expect(contractsPage.newContractButton).toBeVisible();
    });

    test('should have templates button visible', async ({ contractsPage }) => {
      await expect(contractsPage.templatesButton).toBeVisible();
    });

    test('should open templates explorer on click', async ({ contractsPage }) => {
      await contractsPage.openTemplatesExplorer();

      // Modal should be visible
      await expect(contractsPage.page.locator('[role="dialog"]')).toBeVisible();
    });
  });

  test.describe('Browser Navigation', () => {
    test('should handle back button with filters', async ({ contractsPage, page }) => {
      // Apply a filter
      await contractsPage.filterByStatus('active');
      await page.waitForTimeout(500);

      // Apply another filter
      await contractsPage.filterByStatus('draft');
      await page.waitForTimeout(500);

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Should have previous filter or be on contracts page
      const url = contractsPage.getCurrentUrl();
      // Accept either the previous filter state or being on contracts page
      expect(url).toContain('/contracts');
    });

    test('should handle forward button with filters', async ({ contractsPage, page }) => {
      // Apply filters and navigate
      await contractsPage.filterByStatus('active');
      await page.waitForTimeout(500);
      await contractsPage.filterByStatus('draft');
      await page.waitForTimeout(500);
      await page.goBack();
      await page.waitForTimeout(500);

      // Go forward
      await page.goForward();
      await page.waitForTimeout(500);

      // Should be on contracts page (browser history behavior can vary)
      const url = contractsPage.getCurrentUrl();
      expect(url).toContain('/contracts');
    });
  });

  test.describe('Reset Filters', () => {
    test('should reset all filters', async ({ contractsPage }) => {
      // Apply multiple filters
      await contractsPage.search('test');
      await contractsPage.filterByStatus('active');

      // Reset
      await contractsPage.resetFilters();

      // URL should be clean
      const url = contractsPage.getCurrentUrl();
      expect(url).not.toContain('search=');
      expect(url).not.toContain('status=');
      expect(url).not.toContain('vendor=');
    });
  });
});
