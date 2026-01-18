import { test as base } from '@playwright/test';
import { SignInPage } from '../page-objects/auth/sign-in.page';
import { ContractsPage } from '../page-objects/dashboard/contracts.page';
import { NewContractPage } from '../page-objects/dashboard/new-contract.page';
import { BillingPage } from '../page-objects/dashboard/billing.page';
import { VendorsPage } from '../page-objects/dashboard/vendors.page';

/**
 * Extended test fixtures with page objects
 *
 * Usage:
 * import { test, expect } from '../fixtures/base.fixture';
 *
 * test('my test', async ({ signInPage, contractsPage, vendorsPage }) => {
 *   // Use page objects
 * });
 */
type PageObjectFixtures = {
  signInPage: SignInPage;
  contractsPage: ContractsPage;
  newContractPage: NewContractPage;
  billingPage: BillingPage;
  vendorsPage: VendorsPage;
};

export const test = base.extend<PageObjectFixtures>({
  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await use(signInPage);
  },

  contractsPage: async ({ page }, use) => {
    const contractsPage = new ContractsPage(page);
    await use(contractsPage);
  },

  newContractPage: async ({ page }, use) => {
    const newContractPage = new NewContractPage(page);
    await use(newContractPage);
  },

  billingPage: async ({ page }, use) => {
    const billingPage = new BillingPage(page);
    await use(billingPage);
  },

  vendorsPage: async ({ page }, use) => {
    const vendorsPage = new VendorsPage(page);
    await use(vendorsPage);
  },
});

export { expect } from '@playwright/test';
