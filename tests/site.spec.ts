import { test, expect } from '@playwright/test';

const ROUTES = [
	'/',
	'/notes',
	'/amber',
	'/groups',
	'/insights'
];

test.describe('Site Reliability Tests', () => {
	ROUTES.forEach((route) => {
		test(`Should load page successfully without breaking: ${route}`, async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (err) => {
				errors.push(err.message);
			});

			page.on('console', (msg) => {
				if (msg.type() === 'error') {
					const text = msg.text();
					// Ignore expected network errors for missing auth and Vite dev mode service worker warnings
					if (!text.includes('Failed to load resource') && 
					    !text.includes('periodicSync') && 
						!text.includes('ServiceWorker script evaluation failed')) {
						errors.push(text);
					}
				}
			});

			const response = await page.goto(route);
			expect(response?.ok()).toBeTruthy();

			// Ensure Svelte has hydrated and rendered actual content
			await page.waitForLoadState('networkidle');

			// Basic check for Svelte runtime crashes
			expect(errors).toHaveLength(0);
		});
	});
});
