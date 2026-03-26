import { test, expect } from '@playwright/test';

test.describe('VirtualRouter & Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should navigate between sandbox pages', async ({ page }) => {
        // Since we don't have a navbar in the sandbox.ts yet, 
        // we can test navigation via window.history or by clicking a link if we add one.
        // Let's verify we are on counter first
        await expect(page.locator('h1')).toHaveText('Counter Sandbox');
        
        // Manually trigger navigation via console (VirtualRouter.push)
        await page.evaluate(() => {
            (window as any).MeshUI.router.push('/accordion');
        });
        
        // Check new page title
        await expect(page.locator('h1')).toHaveText('Accordion');
        await expect(page).toHaveURL(/\/accordion/);
        
        // Check content changed
        await expect(page.locator('.accordion')).toBeVisible();
    });

    test('should handle browser back/forward buttons', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).MeshUI.router.push('/sandbox/accordion');
        });
        await expect(page).toHaveURL(/\/sandbox\/accordion/);

        await page.goBack();
        await expect(page).toHaveURL(/\/sandbox\/counter/);
        await expect(page.locator('h1')).toHaveText('Counter Sandbox');

        await page.goForward();
        await expect(page).toHaveURL(/\/sandbox\/accordion/);
    });
});
