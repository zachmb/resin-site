import { test, expect } from '@playwright/test';

test.describe('Landing funnel', () => {
    test('presents truthful primary actions without fake interactive controls', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('heading', { level: 1 })).toHaveText(/You know what matters.*Now start it/s);
        await expect(page.getByRole('link', { name: 'Make my first plan' }).first()).toHaveAttribute('href', '/login?mode=start&next=/');
        await expect(page.getByRole('link', { name: 'Join the iPhone beta' }).first()).toHaveAttribute('href', /testflight\.apple\.com/);
        await expect(page.getByText('Unlimited local planning on iPhone').first()).toBeVisible();

        const preview = page.getByRole('img', { name: /captured thought.*protected iPhone focus session/i });
        await expect(preview).toBeVisible();
        await expect(preview.getByRole('button')).toHaveCount(0);

        const manifestResponse = await page.request.get('/manifest.json');
        expect(manifestResponse.ok()).toBeTruthy();
        await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f3eee6');
    });

    test('supports keyboard navigation through the workflow', async ({ page }) => {
        await page.goto('/');

        const captureTab = page.getByRole('tab', { name: 'Capture' });
        const planTab = page.getByRole('tab', { name: 'Make a plan' });
        const followThroughTab = page.getByRole('tab', { name: 'Follow through' });

        await captureTab.focus();
        await page.keyboard.press('ArrowRight');
        await expect(planTab).toBeFocused();
        await expect(planTab).toHaveAttribute('aria-selected', 'true');

        await page.keyboard.press('End');
        await expect(followThroughTab).toBeFocused();
        await expect(followThroughTab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tabpanel')).toContainText('Give the work a protected start.');
    });

    test('keeps the mobile funnel inside the viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');

        const widths = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth
        }));

        expect(widths.content).toBe(widths.viewport);
        await expect(page.getByRole('link', { name: 'Make my first plan' }).first()).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Follow through' })).toBeVisible();
    });

    test('publishes the canonical API host for extension requests', async ({ request }) => {
        const response = await request.get('/api/config');
        expect(response.ok()).toBeTruthy();

        const config = await response.json();
        expect(config.api.baseUrl).toBe('https://www.noteresin.com');
    });

    test('preserves extension recovery intent through sign-in', async ({ page }) => {
        await page.goto('/focus?recovery=make-smaller');

        expect(new URL(page.url()).pathname).toBe('/login');
        expect(new URL(page.url()).searchParams.get('next')).toBe('/focus?recovery=make-smaller');
    });
});
