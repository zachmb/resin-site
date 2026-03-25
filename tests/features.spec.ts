import { test, expect } from '@playwright/test';

/**
 * Functional Feature Coverage Tests
 * 
 * Verifies core user flows for:
 * 1. Dashboard (Profile stats, navigation)
 * 2. Notes (CRUD, activation)
 * 3. Map (Canvas rendering, node presence)
 * 4. Amber (Session management, filters)
 */

test.describe('Dashboard Performance & Stats', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('renders profile stats (stones/streak)', async ({ page }) => {
        // Stats sections
        const stones = page.getByText(/Stones/i);
        const streak = page.getByText(/Streak/i);
        
        await expect(stones).toBeVisible();
        await expect(streak).toBeVisible();
    });

    test('sidebar navigation links work', async ({ page }) => {
        const navLinks = ['Notes', 'Amber', 'Map', 'Rewards', 'Groups', 'Insights', 'Account'];
        
        for (const link of navLinks) {
            const navItem = page.locator('nav').getByRole('link', { name: new RegExp(link, 'i') }).first();
            if (await navItem.isVisible()) {
                await expect(navItem).toHaveAttribute('href');
            }
        }
    });

    test('quick focus button is present', async ({ page }) => {
        const focusBtn = page.getByRole('button', { name: /Start 1h/i });
        await expect(focusBtn).toBeVisible();
    });
});

test.describe('Notes Page Feature Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/notes');
        await page.waitForLoadState('networkidle');
        
        // Skip if not logged in (redirected to /login)
        if (page.url().includes('/login')) {
            test.skip();
        }
    });

    test('can create a new note', async ({ page }) => {
        // 1. Click New Note
        const newNoteBtn = page.getByRole('button', { name: /New Note/i });
        await newNoteBtn.click();

        // 2. Type content
        const editor = page.locator('[contenteditable="true"], textarea').first();
        await editor.focus();
        const testContent = `Feature Test Note - ${Date.now()}`;
        await editor.fill(testContent);

        // 3. Wait for autosave or click Save
        const saveBtn = page.getByRole('button', { name: /Save/i });
        await saveBtn.click();

        // 4. Verify in sidebar
        const sidebarNote = page.getByText(testContent.substring(0, 20)).first();
        await expect(sidebarNote).toBeVisible();
    });

    test('note navigation and loading', async ({ page }) => {
        const notes = page.locator('.notes-list button, [class*="notes-list"] button').first();
        if (await notes.count() > 0) {
            await notes.click();
            const editor = page.locator('[contenteditable="true"], textarea').first();
            await expect(editor).toBeVisible();
        }
    });

    test('activate note flow', async ({ page }) => {
        const newNoteBtn = page.getByRole('button', { name: /New Note/i });
        await newNoteBtn.click();

        const editor = page.locator('[contenteditable="true"], textarea').first();
        await editor.fill(`Plan to activate ${Date.now()}`);

        const activateBtn = page.getByRole('button', { name: /Activate/i });
        await expect(activateBtn).toBeVisible();
        // Not clicking to avoid triggering real AI/DB calls in generic tests 
        // unless specifically requested.
    });
});

test.describe('Map Canvas Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/map');
        await page.waitForLoadState('networkidle');
        
        if (page.url().includes('/login')) {
            test.skip();
        }
    });

    test('renders map structure', async ({ page }) => {
        // Check for SvelteFlow components
        const flow = page.locator('.svelte-flow');
        await expect(flow).toBeVisible();
        
        // Check for background and controls
        await expect(page.locator('.svelte-flow__background')).toBeVisible();
        await expect(page.locator('.svelte-flow__controls')).toBeVisible();
    });

    test('sidebar shows unmapped notes', async ({ page }) => {
        const sidebar = page.getByText(/Drag notes onto the canvas/i);
        await expect(sidebar).toBeVisible();
    });
});

test.describe('Amber Session Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/amber');
        await page.waitForLoadState('networkidle');
        
        if (page.url().includes('/login')) {
            test.skip();
        }
    });

    test('renders session list and details', async ({ page }) => {
        const sessionHeader = page.getByText(/Amber Sessions/i);
        await expect(sessionHeader).toBeVisible();

        const list = page.locator('.custom-scrollbar').first();
        await expect(list).toBeVisible();
    });

    test('view mode switching', async ({ page }) => {
        const calendarBtn = page.getByRole('button', { name: /Calendar/i });
        const listBtn = page.getByRole('button', { name: /List View/i });

        await calendarBtn.click();
        await expect(page.locator('.calendar-container, .amber-calendar')).toBeVisible();

        await listBtn.click();
        await expect(page.locator('.notes-list, .sessions-browser')).toBeVisible();
    });
});
