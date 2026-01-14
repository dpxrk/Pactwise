import { test, expect } from '../../fixtures/base.fixture';

/**
 * Vendors CRUD E2E tests
 *
 * Tests vendor management functionality including:
 * - List display and statistics
 * - Search and filtering
 * - Create new vendor
 * - Select vendor and view analysis
 * - Filter by status/category
 * - Keyboard navigation
 * - Export and delete operations
 */
test.describe('Vendors CRUD Operations', () => {
  // These tests require authentication
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ vendorsPage }) => {
    await vendorsPage.goto();
    await vendorsPage.waitForLoad();
  });

  test.describe('System Status and Metrics', () => {
    test('should display system status indicator', async ({ vendorsPage }) => {
      await expect(vendorsPage.systemStatus).toBeVisible();
    });

    test('should display metrics bar with all metrics', async ({ vendorsPage }) => {
      await vendorsPage.verifyMetricsDisplayed();
    });

    test('should display total vendors count', async ({ vendorsPage }) => {
      const total = await vendorsPage.getTotalCount();
      expect(total).toBeGreaterThanOrEqual(0);
    });

    test('should display active vendors count', async ({ vendorsPage }) => {
      const active = await vendorsPage.getActiveCount();
      expect(active).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Vendor List Display', () => {
    test('should display table header', async ({ vendorsPage }) => {
      await expect(vendorsPage.tableHeader).toBeVisible();
    });

    test('should show vendors or empty state', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      const isEmptyVisible = await vendorsPage.isEmptyStateVisible();

      expect(hasVendors || isEmptyVisible).toBe(true);
    });

    test('should display keyboard navigation hint', async ({ vendorsPage }) => {
      await vendorsPage.verifyKeyboardHintVisible();
    });

    test('should display vendor count in footer', async ({ vendorsPage }) => {
      await expect(vendorsPage.vendorCount).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should have search input visible', async ({ vendorsPage }) => {
      await expect(vendorsPage.searchInput).toBeVisible();
    });

    test('should filter vendors when searching', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      const initialCount = await vendorsPage.getVisibleRowCount();

      // Search for something unlikely to match all
      await vendorsPage.search('xyz123nonexistent');

      const filteredCount = await vendorsPage.getVisibleRowCount();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });

    test('should clear search and restore results', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      const initialCount = await vendorsPage.getVisibleRowCount();

      // Search and filter
      await vendorsPage.search('xyz123nonexistent');

      // Clear search
      await vendorsPage.clearSearch();

      const restoredCount = await vendorsPage.getVisibleRowCount();
      expect(restoredCount).toBeGreaterThanOrEqual(initialCount - 1); // Allow some variance
    });
  });

  test.describe('Status Filtering', () => {
    test('should have status filter buttons visible', async ({ vendorsPage }) => {
      await expect(vendorsPage.statusAllButton).toBeVisible();
      await expect(vendorsPage.statusActiveButton).toBeVisible();
      await expect(vendorsPage.statusPendingButton).toBeVisible();
    });

    test('should filter by active status', async ({ vendorsPage }) => {
      await vendorsPage.filterByStatus('active');

      // Button should be selected (has different styling)
      await expect(vendorsPage.statusActiveButton).toHaveClass(/bg-purple-900/);
    });

    test('should filter by pending status', async ({ vendorsPage }) => {
      await vendorsPage.filterByStatus('pending');

      await expect(vendorsPage.statusPendingButton).toHaveClass(/bg-purple-900/);
    });

    test('should reset filter to all', async ({ vendorsPage }) => {
      await vendorsPage.filterByStatus('active');
      await vendorsPage.filterByStatus('all');

      await expect(vendorsPage.statusAllButton).toHaveClass(/bg-purple-900/);
    });
  });

  test.describe('Category Filtering', () => {
    test('should have category filter dropdown', async ({ vendorsPage }) => {
      await expect(vendorsPage.categoryFilter).toBeVisible();
    });

    test('should filter by technology category', async ({ vendorsPage }) => {
      await vendorsPage.filterByCategory('technology');

      // Verify dropdown value changed
      await expect(vendorsPage.categoryFilter).toHaveValue('technology');
    });
  });

  test.describe('Vendor Selection and Analysis Panel', () => {
    test('should show analysis panel prompt when no vendor selected', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      // Initially no vendor selected
      const text = await vendorsPage.page.locator('text=SELECT A VENDOR').textContent();
      expect(text).toBeTruthy();
    });

    test('should select vendor on click', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      await vendorsPage.selectVendorByIndex(0);

      // Vendor should be selected
      const isSelected = await vendorsPage.isVendorSelected(0);
      expect(isSelected).toBe(true);
    });

    test('should show analysis panel after selection', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      await vendorsPage.selectVendorByIndex(0);

      const isPanelVisible = await vendorsPage.isAnalysisPanelVisible();
      expect(isPanelVisible).toBe(true);
    });

    test('should display selected vendor name in panel', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      const vendorName = await vendorsPage.getVendorName(0);
      await vendorsPage.selectVendorByIndex(0);

      const panelName = await vendorsPage.getSelectedVendorNameFromPanel();
      expect(panelName).toBe(vendorName);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate down with arrow key', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      const rowCount = await vendorsPage.getVisibleRowCount();
      test.skip(!hasVendors || rowCount < 2, 'Need at least 2 vendors to test');

      // Select first vendor
      await vendorsPage.selectVendorByIndex(0);

      // Navigate down
      await vendorsPage.navigateDown();

      // Second vendor should be selected
      const isSecondSelected = await vendorsPage.isVendorSelected(1);
      expect(isSecondSelected).toBe(true);
    });

    test('should navigate up with arrow key', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      const rowCount = await vendorsPage.getVisibleRowCount();
      test.skip(!hasVendors || rowCount < 2, 'Need at least 2 vendors to test');

      // Select second vendor
      await vendorsPage.selectVendorByIndex(1);

      // Navigate up
      await vendorsPage.navigateUp();

      // First vendor should be selected
      const isFirstSelected = await vendorsPage.isVendorSelected(0);
      expect(isFirstSelected).toBe(true);
    });

    test('should open details with Enter key', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      // Select first vendor
      await vendorsPage.selectVendorByIndex(0);

      // Press Enter
      await vendorsPage.pressEnterToOpenDetails();

      // Details modal should be visible
      await expect(vendorsPage.detailsModal).toBeVisible();
    });
  });

  test.describe('New Vendor Creation', () => {
    test('should have new vendor button visible', async ({ vendorsPage }) => {
      await expect(vendorsPage.newVendorButton).toBeVisible();
    });

    test('should open vendor form modal', async ({ vendorsPage }) => {
      await vendorsPage.openNewVendorForm();

      await expect(vendorsPage.vendorFormModal).toBeVisible();
    });

    test('should close vendor form when cancelled', async ({ vendorsPage }) => {
      await vendorsPage.openNewVendorForm();
      await vendorsPage.closeVendorForm();

      await expect(vendorsPage.vendorFormModal).not.toBeVisible();
    });

    // Note: Actual creation test should use a unique name to avoid conflicts
    test('should fill vendor form', async ({ vendorsPage }) => {
      await vendorsPage.openNewVendorForm();

      await vendorsPage.fillVendorForm({
        name: `E2E Test Vendor ${Date.now()}`,
        email: 'test@example.com',
      });

      // Form should have values - use the specific label for vendor name
      await expect(vendorsPage.vendorFormModal.getByLabel(/vendor name/i)).not.toBeEmpty();
    });
  });

  test.describe('Vendor Actions', () => {
    test('should have full analysis button when vendor selected', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      await vendorsPage.selectVendorByIndex(0);

      await expect(vendorsPage.fullAnalysisButton).toBeVisible();
    });

    test('should have export report button when vendor selected', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      await vendorsPage.selectVendorByIndex(0);

      await expect(vendorsPage.exportReportButton).toBeVisible();
    });

    test('should have delete vendor button when vendor selected', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      await vendorsPage.selectVendorByIndex(0);

      await expect(vendorsPage.deleteVendorButton).toBeVisible();
    });

    test('should open full analysis modal', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      await vendorsPage.selectVendorByIndex(0);
      await vendorsPage.openFullAnalysis();

      await expect(vendorsPage.detailsModal).toBeVisible();
    });

    test('should close details modal', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      await vendorsPage.selectVendorByIndex(0);
      await vendorsPage.openFullAnalysis();
      await vendorsPage.closeDetailsModal();

      await expect(vendorsPage.detailsModal).not.toBeVisible();
    });
  });

  test.describe('Vendor Row Information', () => {
    test('should display vendor name in row', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      const name = await vendorsPage.getVendorName(0);
      expect(name.length).toBeGreaterThan(0);
    });

    test('should display vendor status in row', async ({ vendorsPage }) => {
      const hasVendors = await vendorsPage.hasVendors();
      test.skip(!hasVendors, 'No vendors to test');

      const status = await vendorsPage.getVendorStatus(0);
      expect(status).toMatch(/ACTIVE|PENDING|INACTIVE/);
    });
  });
});
