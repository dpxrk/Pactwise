/**
 * Test Data Helper
 *
 * Utilities for managing test data in E2E tests.
 * Currently provides mock data generation.
 *
 * Future: Can be extended to seed/cleanup Supabase test data
 * when running against a test environment.
 */

/**
 * Generate a unique test identifier
 */
export function generateTestId(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate test vendor data
 */
export function generateTestVendor() {
  const id = generateTestId();
  return {
    name: `Test Vendor ${id}`,
    category: 'technology' as const,
    status: 'active' as const,
    contactName: `Test Contact ${id}`,
    contactEmail: `test-${id}@example.com`,
    contactPhone: '555-0100',
    website: `https://test-${id}.example.com`,
    address: '123 Test Street, Test City, TC 12345',
  };
}

/**
 * Generate test contract data
 */
export function generateTestContract() {
  const id = generateTestId();
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    title: `Test Contract ${id}`,
    status: 'draft' as const,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    totalValue: Math.floor(Math.random() * 100000) + 10000,
    description: `E2E test contract created at ${new Date().toISOString()}`,
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 10000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Format date for display comparison
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

/**
 * Format currency for display comparison
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Retry a function multiple times
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
