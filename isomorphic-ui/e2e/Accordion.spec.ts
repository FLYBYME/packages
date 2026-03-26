import { test, expect } from '@playwright/test';

test.describe('Accordion Component', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/accordion');
    });

    test('should toggle accordion items', async ({ page }) => {
        const button = page.locator('.accordion-button').first();
        const collapse = page.locator('.accordion-collapse').first();

        // Initial state (assuming defaultOpen is false)
        await expect(button).toHaveClass(/collapsed/);
        await expect(button).toHaveAttribute('aria-expanded', 'false');
        await expect(collapse).not.toHaveClass(/show/);

        // Click to expand
        await button.click();

        // Verify expanded state (Bootstrap handled this via JS)
        // Wait for transition if needed, but Playwright auto-waits for properties
        await expect(button).not.toHaveClass(/collapsed/);
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        await expect(collapse).toHaveClass(/show/);
        
        // Click to collapse
        await button.click();
        await expect(button).toHaveClass(/collapsed/);
        await expect(button).toHaveAttribute('aria-expanded', 'false');
        await expect(collapse).not.toHaveClass(/show/);
    });
});
