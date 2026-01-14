/**
 * Test user configuration for E2E tests
 *
 * The test user should be created in Supabase before running tests:
 * 1. Sign up with the email below
 * 2. Complete the onboarding flow
 * 3. Create a test enterprise with sample data
 *
 * For CI, set these as environment secrets:
 * - E2E_TEST_USER_EMAIL
 * - E2E_TEST_USER_PASSWORD
 */

export const testUser = {
  email: process.env.E2E_TEST_USER_EMAIL || 'e2e-test@pactwise.com',
  password: process.env.E2E_TEST_USER_PASSWORD || '',
};

/**
 * Auth file path for storing session state
 */
export const AUTH_FILE = 'e2e/.auth/user.json';

/**
 * Test data expectations (adjust based on your test user's data)
 */
export const testData = {
  // Minimum expected counts (test user should have at least this much data)
  minContracts: 0,
  minVendors: 0,

  // Known test entity names (if you create specific test data)
  testVendorName: 'E2E Test Vendor',
  testContractName: 'E2E Test Contract',
};
