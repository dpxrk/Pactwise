import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test('homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('dashboard should have no accessibility violations', async ({ page }) => {
    // Login first
    await page.goto('/auth/sign-in');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Test123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*dashboard/);

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check h1 exists and is unique
    const h1Elements = await page.getByRole('heading', { level: 1 }).all();
    expect(h1Elements).toHaveLength(1);
    
    // Check heading hierarchy
    const headings = await page.evaluate(() => {
      const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headingElements.map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent,
      }));
    });
    
    // Verify no heading levels are skipped
    let previousLevel = 0;
    for (const heading of headings) {
      expect(heading.level).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = heading.level;
    }
  });

  test('all images should have alt text', async ({ page }) => {
    await page.goto('/');
    
    // Get all images
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt?.length).toBeGreaterThan(0);
    }
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Check all inputs have associated labels
    const inputs = await page.locator('input:not([type="hidden"])').all();
    
    for (const input of inputs) {
      const inputId = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Either has explicit label, aria-label, or aria-labelledby
      if (inputId) {
        const label = await page.locator(`label[for="${inputId}"]`).count();
        expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    let activeElement = await page.evaluate(() => document.activeElement?.tagName);
    const focusedElements: string[] = [];
    
    // Tab through first 10 interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          text: el?.textContent,
          visible: el ? window.getComputedStyle(el).visibility !== 'hidden' : false,
        };
      });
      
      if (activeElement.visible) {
        focusedElements.push(activeElement.tag);
      }
    }
    
    // Should have focused on interactive elements
    expect(focusedElements.length).toBeGreaterThan(0);
    expect(focusedElements.some(tag => ['A', 'BUTTON', 'INPUT'].includes(tag))).toBeTruthy();
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/');
    
    // Check contrast using axe
    await injectAxe(page);
    const results = await page.evaluate(async () => {
      // @ts-ignore
      const axeResults = await window.axe.run(document, {
        runOnly: ['color-contrast'],
      });
      return axeResults.violations;
    });
    
    expect(results).toHaveLength(0);
  });

  test('skip links should work correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Focus on skip link
    await page.keyboard.press('Tab');
    
    // Check skip link is visible when focused
    const skipLink = page.getByText(/skip to main content/i);
    await expect(skipLink).toBeVisible();
    
    // Activate skip link
    await page.keyboard.press('Enter');
    
    // Check focus moved to main content
    const focusedElement = await page.evaluate(() => document.activeElement?.id);
    expect(focusedElement).toBe('main-content');
  });

  test('ARIA landmarks should be present', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for main landmarks
    await expect(page.getByRole('banner')).toBeVisible(); // header
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible(); // footer
  });

  test('error messages should be announced', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for error messages with proper ARIA
    const errorMessages = page.getByRole('alert');
    await expect(errorMessages.first()).toBeVisible();
    
    // Check error is associated with input
    const emailInput = page.getByLabel(/email/i);
    const ariaDescribedBy = await emailInput.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toBeTruthy();
    
    const errorElement = page.locator(`#${ariaDescribedBy}`);
    await expect(errorElement).toBeVisible();
  });
});