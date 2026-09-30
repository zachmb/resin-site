import { test, expect } from '@playwright/test';

test.describe('Landing funnel', () => {
    test('presents truthful primary actions without fake interactive controls', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('heading', { level: 1 })).toHaveText(/You know what matters.*Now start it/s);
        await expect(page.getByRole('link', { name: 'Make my first plan' }).first()).toHaveAttribute('href', '/login?mode=start&next=/');
        await expect(page.getByRole('link', { name: 'Join the iPhone beta' }).first()).toHaveAttribute('href', /testflight\.apple\.com/);
        await expect(page.getByText('Unlimited local planning on iPhone').first()).toBeVisible();

        // The core loop renders as real content, and the closing CTA is a real link.
        await expect(page.getByRole('heading', { name: 'Catch the thought before it runs.' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Do more with Resin.' })).toBeVisible();

        const manifestResponse = await page.request.get('/manifest.json');
        expect(manifestResponse.ok()).toBeTruthy();
        await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f3eee6');
    });

    test('decorative hero imagery is not announced as a control', async ({ page }) => {
        await page.goto('/');
        // The full-bleed hero photo is decorative (aria-hidden), not a fake button/link.
        const heroImg = page.locator('.hero-bg');
        await expect(heroImg).toHaveAttribute('aria-hidden', 'true');
        await expect(heroImg.getByRole('button')).toHaveCount(0);
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
