import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local for E2E test credentials
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  });
}

/**
 * Playwright E2E Test Configuration
 *
 * Project structure:
 * - setup: Authenticates once and saves session state
 * - chromium-authenticated: Tests requiring authentication (uses saved state)
 * - chromium-unauthenticated: Tests for public pages (sign-in, sign-up, etc.)
 *
 * Environment variables required for authenticated tests:
 * - E2E_TEST_USER_EMAIL: Test user email
 * - E2E_TEST_USER_PASSWORD: Test user password
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once locally, twice in CI
  workers: 1, // Single worker to avoid resource contention
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 30000, // 30 seconds for navigation
  },

  projects: [
    // Setup project - runs auth.setup.ts to create authenticated session
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Authenticated tests - depend on setup, use saved auth state
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /specs\/(contracts|vendors|dashboard)\/.+\.spec\.ts/,
    },

    // Unauthenticated tests - public pages like sign-in, sign-up
    {
      name: 'chromium-unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - fresh browser state
      },
      testMatch: /specs\/auth\/.+\.spec\.ts/,
    },

    // Legacy tests - existing test files at root of e2e folder
    {
      name: 'chromium-legacy',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /^e2e\/[^/]+\.spec\.ts$/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
