import { Page, Locator, expect } from '@playwright/test';

/**
 * Base page object with common methods for all pages
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the page
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for page to be fully loaded
   */
  abstract waitForLoad(): Promise<void>;

  /**
   * Get the system status indicator (green dot = online)
   */
  get statusIndicator(): Locator {
    return this.page.locator('[data-testid="status-indicator"], .bg-success.animate-pulse');
  }

  /**
   * Check if system is online (status indicator visible)
   */
  async isSystemOnline(): Promise<boolean> {
    try {
      await this.statusIndicator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for any loading spinners to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.animate-spin',
      '[role="progressbar"]',
      '.skeleton',
    ];

    for (const selector of loadingSelectors) {
      const elements = this.page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        await elements.first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {
          // Ignore if element doesn't exist or takes too long
        });
      }
    }
  }

  /**
   * Get the page title
   */
  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Navigate using browser back button
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  /**
   * Navigate using browser forward button
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url: string | RegExp): Promise<void> {
    await this.page.waitForURL(url, { timeout: 30000 });
  }

  /**
   * Click element and wait for navigation
   */
  async clickAndNavigate(locator: Locator, expectedUrl: string | RegExp): Promise<void> {
    await Promise.all([
      this.page.waitForURL(expectedUrl),
      locator.click(),
    ]);
  }

  /**
   * Fill input field with value
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(locator: Locator, value: string): Promise<void> {
    await locator.selectOption(value);
  }

  /**
   * Get text content of element
   */
  async getText(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Wait for toast notification and get its text
   */
  async getToastMessage(): Promise<string> {
    const toast = this.page.locator('[data-sonner-toast], [role="alert"]').first();
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    return (await toast.textContent()) || '';
  }

  /**
   * Dismiss toast notification
   */
  async dismissToast(): Promise<void> {
    const dismissButton = this.page.locator('[data-sonner-toast] button, [role="alert"] button').first();
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
    }
  }

  /**
   * Press keyboard key
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Type text with keyboard
   */
  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }
}
