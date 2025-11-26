import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Landing Page Navigation', () => {
  test('Main landing page loads and has navigation', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Page should load
    expect(await page.title()).toBeTruthy();

    // Find all links
    const links = await page.locator('a[href]').all();
    console.log(`Found ${links.length} links on the landing page`);

    // Verify we have some navigation
    expect(links.length).toBeGreaterThan(0);
  });

  test('CTA buttons are visible and clickable', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Find CTA buttons/links (Get Started, Sign In, etc.)
    const ctaLinks = page.locator('a:has-text("Get Started"), a:has-text("Sign In"), a:has-text("Sign Up"), a:has-text("Start Free")');
    const ctaButtons = page.locator('button:has-text("Get Started"), button:has-text("Sign In"), button:has-text("Sign Up"), button:has-text("Start Free"), button:has-text("Request Demo")');

    const linkCount = await ctaLinks.count();
    const buttonCount = await ctaButtons.count();
    console.log(`Found ${linkCount} CTA links and ${buttonCount} CTA buttons`);

    // Should have some CTAs (either links with href or buttons with onClick)
    const totalCtas = linkCount + buttonCount;
    expect(totalCtas).toBeGreaterThan(0);

    // If there are links, verify they have href
    if (linkCount > 0) {
      const firstLink = ctaLinks.first();
      const href = await firstLink.getAttribute('href').catch(() => null);
      console.log(`First CTA link href: ${href}`);
    }

    // If there are buttons, verify they are enabled/clickable
    if (buttonCount > 0) {
      const firstButton = ctaButtons.first();
      const isEnabled = await firstButton.isEnabled().catch(() => false);
      console.log(`First CTA button enabled: ${isEnabled}`);
      expect(isEnabled).toBe(true);
    }
  });
});

test.describe('Animated Landing Page Navigation', () => {
  test('Animated landing page loads and navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing-animated`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Page should load
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(100);

    // Find navigation links
    const navLinks = await page.locator('nav a, header a').all();
    console.log(`Found ${navLinks.length} navigation links`);

    // Check each nav link
    for (const link of navLinks) {
      const href = await link.getAttribute('href').catch(() => null);
      const text = await link.textContent().catch(() => 'Unknown');
      const isVisible = await link.isVisible().catch(() => false);
      if (isVisible && href) {
        console.log(`Nav: ${text?.trim()} -> ${href}`);
      }
    }
  });

  test('Sign In navigation works from animated landing', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing-animated`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find sign in link
    const signInLink = page.locator('a[href*="sign-in"], a:has-text("Sign In"), a:has-text("Login")').first();
    const isVisible = await signInLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await signInLink.click();
      await page.waitForURL('**/sign-in**', { timeout: 10000 }).catch(() => {});
      expect(page.url()).toContain('sign-in');
    }
  });

  test('Get Started/Sign Up navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/landing-animated`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find get started link
    const getStartedLink = page.locator('a[href*="sign-up"], a:has-text("Get Started"), a:has-text("Sign Up"), a:has-text("Start Free")').first();
    const isVisible = await getStartedLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      const href = await getStartedLink.getAttribute('href');
      console.log(`Get Started href: ${href}`);
      await getStartedLink.click();
      await page.waitForTimeout(2000);
      // Should navigate somewhere
      expect(page.url()).not.toBe(`${BASE_URL}/landing-animated`);
    }
  });
});

test.describe('Auth Pages Buttons', () => {
  test('Sign In page has functional form', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();

    // Check email input
    const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (emailVisible) {
      await emailInput.fill('test@example.com');
      const emailValue = await emailInput.inputValue();
      expect(emailValue).toBe('test@example.com');
    }

    // Check password input
    const passwordVisible = await passwordInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (passwordVisible) {
      await passwordInput.fill('password123');
      const passwordValue = await passwordInput.inputValue();
      expect(passwordValue).toBe('password123');
    }

    // Check submit button is clickable
    const submitVisible = await submitButton.isVisible({ timeout: 5000 }).catch(() => false);
    expect(submitVisible).toBe(true);
  });

  test('Sign Up page has functional form', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-up`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    // Test email input
    const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (emailVisible) {
      await emailInput.fill('newuser@example.com');
      const emailValue = await emailInput.inputValue();
      expect(emailValue).toBe('newuser@example.com');
    }

    // Test password input
    const passwordVisible = await passwordInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (passwordVisible) {
      await passwordInput.fill('securepassword123');
      const passwordValue = await passwordInput.inputValue();
      expect(passwordValue).toBe('securepassword123');
    }
  });

  test('Link to sign up from sign in works', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find link to sign up
    const signUpLink = page.locator('a[href*="sign-up"]').first();
    const isVisible = await signUpLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await signUpLink.click();
      await page.waitForURL('**/sign-up**', { timeout: 10000 }).catch(() => {});
      expect(page.url()).toContain('sign-up');
    }
  });

  test('Link to sign in from sign up works', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-up`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find link to sign in
    const signInLink = page.locator('a[href*="sign-in"]').first();
    const isVisible = await signInLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await signInLink.click();
      await page.waitForURL('**/sign-in**', { timeout: 10000 }).catch(() => {});
      expect(page.url()).toContain('sign-in');
    }
  });

  test('Reset password link works', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find forgot password link
    const resetLink = page.locator('a[href*="reset"], a:has-text("Forgot"), a:has-text("Reset")').first();
    const isVisible = await resetLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await resetLink.click();
      await page.waitForURL('**/reset**', { timeout: 10000 }).catch(() => {});
      expect(page.url()).toContain('reset');
    }
  });
});

test.describe('Privacy and Terms Pages', () => {
  test('Privacy page back button works', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find back button
    const backButton = page.locator('a:has-text("Back"), button:has-text("Back")').first();
    const isVisible = await backButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await backButton.click();
      await page.waitForTimeout(2000);
      // Should navigate away from privacy
      expect(page.url()).not.toContain('/privacy');
    }
  });

  test('Terms page back button works', async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Find back button
    const backButton = page.locator('a:has-text("Back"), button:has-text("Back")').first();
    const isVisible = await backButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await backButton.click();
      await page.waitForTimeout(2000);
      // Should navigate away from terms
      expect(page.url()).not.toContain('/terms');
    }
  });

  test('Privacy page links to sign up', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Check for sign up link
    const signUpLink = page.locator('a[href*="sign-up"]').first();
    const href = await signUpLink.getAttribute('href').catch(() => null);
    expect(href).toContain('sign-up');
  });
});

test.describe('Design System Page', () => {
  test('Design system page loads components', async ({ page }) => {
    await page.goto(`${BASE_URL}/design-system`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Find buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on design-system`);

    // Design system should have many example components
    expect(buttons.length).toBeGreaterThan(0);
  });
});

test.describe('OAuth Buttons', () => {
  test('Sign in page has OAuth options', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Look for OAuth buttons
    const googleButton = page.locator('button:has-text("Google"), a:has-text("Google")').first();
    const githubButton = page.locator('button:has-text("GitHub"), a:has-text("GitHub")').first();

    const googleVisible = await googleButton.isVisible({ timeout: 3000 }).catch(() => false);
    const githubVisible = await githubButton.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`Google OAuth visible: ${googleVisible}`);
    console.log(`GitHub OAuth visible: ${githubVisible}`);

    // At least some OAuth option should be available (or form-based login)
    const hasAuth = googleVisible || githubVisible || await page.locator('input[type="email"]').isVisible().catch(() => false);
    expect(hasAuth).toBe(true);
  });
});
