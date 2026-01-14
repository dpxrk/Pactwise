import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Sign-in page object
 *
 * Handles authentication form interactions including:
 * - Email/password input
 * - Password visibility toggle
 * - Stay logged in checkbox
 * - Form submission and validation
 * - Navigation to related pages
 */
export class SignInPage extends BasePage {
  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly showPasswordButton: Locator;
  readonly stayLoggedInCheckbox: Locator;

  // Error elements
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly sessionExpiredMessage: Locator;

  // Navigation links
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly termsLink: Locator;
  readonly privacyLink: Locator;

  // Terminal elements
  readonly terminalHeader: Locator;
  readonly connectionStatus: Locator;

  constructor(page: Page) {
    super(page);

    // Form elements
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.showPasswordButton = page.locator('button').filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') });
    this.stayLoggedInCheckbox = page.locator('#stay-logged-in');

    // Error elements
    this.errorMessage = page.locator('.text-error-300, .text-red-600').first();
    this.emailError = page.locator('text=Please enter a valid email address');
    this.passwordError = page.locator('text=Password must be at least 6 characters');
    this.sessionExpiredMessage = page.locator('text=Session expired');

    // Navigation links
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot/i });
    this.signUpLink = page.getByRole('link', { name: /create an account/i });
    this.termsLink = page.getByRole('link', { name: /terms/i });
    this.privacyLink = page.getByRole('link', { name: /privacy/i });

    // Terminal elements
    this.terminalHeader = page.locator('text=pactwise-auth — sign-in');
    this.connectionStatus = page.locator('text=Connection established');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/sign-in');
  }

  async waitForLoad(): Promise<void> {
    // Wait for terminal boot animation to complete
    await this.connectionStatus.waitFor({ state: 'visible', timeout: 10000 });
    // Wait for form to be ready
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string, stayLoggedIn = false): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (stayLoggedIn) {
      await this.stayLoggedInCheckbox.check();
    }

    await this.submitButton.click();
  }

  /**
   * Sign in and wait for redirect to dashboard
   */
  async signInAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.signIn(email, password);
    await this.page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }

  /**
   * Fill email field only
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field only
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.showPasswordButton.click();
  }

  /**
   * Check if password is visible
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }

  /**
   * Get the current error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    const emailErrorVisible = await this.emailError.isVisible().catch(() => false);
    const passwordErrorVisible = await this.passwordError.isVisible().catch(() => false);
    return emailErrorVisible || passwordErrorVisible;
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL(/\/auth\/reset-password/);
  }

  /**
   * Navigate to sign up page
   */
  async goToSignUp(): Promise<void> {
    await this.signUpLink.click();
    await this.page.waitForURL(/\/auth\/sign-up/);
  }

  /**
   * Check if submit button is disabled (during loading)
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }

  /**
   * Check if form is in loading state
   */
  async isLoading(): Promise<boolean> {
    const buttonText = await this.submitButton.textContent();
    return buttonText?.includes('Authenticating') || false;
  }

  /**
   * Verify the terminal UI elements are displayed
   */
  async verifyTerminalUI(): Promise<void> {
    await expect(this.terminalHeader).toBeVisible();
    await expect(this.connectionStatus).toBeVisible();
  }

  /**
   * Submit form by pressing Enter
   */
  async submitWithEnter(): Promise<void> {
    await this.passwordInput.press('Enter');
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }
}
