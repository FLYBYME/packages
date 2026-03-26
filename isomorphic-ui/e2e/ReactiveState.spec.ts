import { test, expect } from '@playwright/test';

test.describe('ReactiveState & BrokerComponent DOM Updates', () => {
    test.beforeEach(async ({ page }) => {
        // Assume this route mounts a simple counter component tied to $state.counter
        await page.goto('/');
        // Wait for sandbox initialization
        await expect(page.locator('h1')).toHaveText('Counter Sandbox');
    });

    test('should update DOM text when state changes', async ({ page }) => {
        const counterDisplay = page.locator('#counter-display');
        const incrementBtn = page.locator('button', { hasText: 'Increment' });

        // Verify initial state
        await expect(counterDisplay).toHaveText('0');

        // Click to trigger a state update
        await incrementBtn.click();

        // Verify the BrokerComponent patched the DOM correctly
        await expect(counterDisplay).toHaveText('1');
        
        // Multiple clicks
        await incrementBtn.click();
        await incrementBtn.click();
        await expect(counterDisplay).toHaveText('3');
    });

    test('should apply dynamic classes via state', async ({ page }) => {
        const box = page.locator('#color-box');
        const toggleBtn = page.locator('button', { hasText: 'Toggle Color' });

        // Initial state (btn-primary)
        await expect(box).toHaveClass(/btn-primary/);
        await expect(box).not.toHaveClass(/btn-danger/);

        // Toggle state
        await toggleBtn.click();
        await expect(box).toHaveClass(/btn-danger/);
        await expect(box).not.toHaveClass(/btn-primary/);
        
        // Toggle back
        await toggleBtn.click();
        await expect(box).toHaveClass(/btn-primary/);
    });
});
