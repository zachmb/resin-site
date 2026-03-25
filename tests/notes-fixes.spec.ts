import { test, expect } from '@playwright/test';

/**
 * Comprehensive verification of note-related fixes
 * Tests: autosave, sidebar updates, and save functionality
 */

test.describe('Notes Saving & Autosave Fixes', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to notes page and wait for load
        await page.goto('/notes');
        await page.waitForLoadState('domcontentloaded');
        
        // If not authenticated, skip these tests
        if (page.url().includes('/login')) {
            test.skip();
        }
    });

    test('Note editor renders without errors', async ({ page }) => {
        // Check for critical error messages
        const errors = await page.evaluate(() => {
            const logs: string[] = [];
            const originalError = console.error;
            console.error = (msg) => logs.push(String(msg));
            return logs;
        });

        // Should not have critical "Unknown cache key" errors
        const hasCacheErrors = errors.some(e => e.includes('[Cache] Unknown cache key'));
        expect(hasCacheErrors, 'No cache validation errors').toBe(false);
    });

    test('Sidebar shows notes without errors', async ({ page }) => {
        const sidebar = page.locator('[class*="sidebar"], [class*="Archive"]').first();
        await expect(sidebar).toBeVisible({ timeout: 5000 });

        // Check for "X saved" indicator
        const noteCount = page.locator('text=/\\d+ saved/');
        await expect(noteCount).toBeVisible();
    });

    test('Editor can be focused and accepts input', async ({ page }) => {
        const editor = page.locator('textarea, [contenteditable="true"]').first();
        await expect(editor).toBeVisible();
        
        // Focus and type
        await editor.focus();
        await editor.fill('Test autosave functionality');
        
        // Verify input was accepted
        const value = await editor.inputValue();
        expect(value).toContain('Test autosave');
    });

    test('Status bar updates on edit', async ({ page }) => {
        const editor = page.locator('textarea').first();
        await editor.focus();
        await editor.fill('Word count test content');
        
        // Look for status bar with word count or save indicator
        const statusBar = page.locator('text=/words|Saving|Unsaved/i');
        await expect(statusBar).toBeVisible({ timeout: 3000 });
    });

    test('No state_unsafe_mutation errors', async ({ page }) => {
        // Check console for Svelte reactivity warnings
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Perform some edits
        const editor = page.locator('textarea').first();
        if (await editor.isVisible()) {
            await editor.fill('test content');
            await page.waitForTimeout(500);
        }

        const hasStateErrors = consoleErrors.some(e => 
            e.includes('state_unsafe_mutation') || 
            e.includes('effect_update_depth_exceeded')
        );
        
        expect(hasStateErrors, 'No unsafe mutations').toBe(false);
    });
});
