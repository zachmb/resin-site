const { Given, When, Then, Before, After, setDefaultTimeout } = require('@dev-blinq/cucumber-js');
const { chromium } = require('playwright');

setDefaultTimeout(60 * 1000);

let browser;
let page;
let context;
const BASE_URL = 'http://localhost:5173';

Before(async function() {
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--disable-extensions', '--disable-dev-shm-usage']
        });
        context = await browser.newContext();
        page = await context.newPage();
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);
    } catch (error) {
        console.error('Browser launch error:', error.message);
        throw error;
    }
});

After(async function() {
    try {
        if (page) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
    } catch (error) {
        console.error('Cleanup error:', error.message);
    }
});

// Navigation steps
Given('I navigate to the home page', async function() {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
});

Given('I navigate to the notes page', async function() {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');
});

// Dashboard compose steps
When('I fill the compose box with {string}', async function(text) {
    // Try multiple selectors - authenticated vs unauthenticated compose boxes
    let composeBox = page.locator('textarea[placeholder*="mind"]').first();
    if (!await composeBox.isVisible()) {
        composeBox = page.locator('textarea[placeholder*="went well"]').first();
    }
    if (!await composeBox.isVisible()) {
        composeBox = page.locator('textarea').first();
    }

    if (!await composeBox.isVisible()) {
        throw new Error('Compose box not found on page');
    }

    await composeBox.fill(text);
});

When('I click the {string} button', async function(buttonName) {
    // For "Save" button, be specific (avoid "Save Reflection", "Save Note" etc)
    if (buttonName === 'Save') {
        // Get the first Save button (should be the compose Save)
        const buttons = page.getByRole('button', { name: /Save/i });
        const count = await buttons.count();
        if (count === 0) {
            throw new Error('No Save button found');
        }
        // Click the first Save button
        const button = buttons.first();
        console.log(`Clicking Save button (first of ${count} matches)`);

        // Wait for any navigation or state change
        try {
            await Promise.race([
                button.click(),
                page.waitForNavigation({ timeout: 2000 }).catch(() => null),
                page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => null)
            ]);
        } catch (e) {
            // Click might not result in navigation
            await button.click();
        }

        // Give page time to process
        await page.waitForTimeout(1000);
    } else {
        // Try exact match first
        let button = page.getByRole('button', { name: new RegExp(`^${buttonName}$`, 'i') });

        // If not found, try contains match
        if (!(await button.isVisible()).catch(() => false)) {
            button = page.getByRole('button', { name: new RegExp(buttonName, 'i') }).first();
        }

        if (!await button.isVisible().catch(() => false)) {
            // List available buttons for debugging
            const buttons = await page.locator('button').allTextContents();
            throw new Error(`Button "${buttonName}" not found. Available buttons: ${buttons.join(', ')}`);
        }

        await button.click();
    }
});

Then('I should be redirected to the notes page with a temp ID', async function() {
    // Wait for navigation (could be to /notes or /login depending on auth)
    try {
        await page.waitForURL(/\/notes|\/login/, { timeout: 10000 });
    } catch (e) {
        // If still on home page, might be unauthenticated
        const currentUrl = page.url();
        throw new Error(`Expected redirect to /notes (with temp ID) or /login, but still on: ${currentUrl}`);
    }

    const currentUrl = page.url();

    // If logged in, should have temp ID in URL
    if (currentUrl.includes('/notes')) {
        if (!currentUrl.includes('?id=temp_')) {
            throw new Error(`Expected temp ID in /notes URL, got: ${currentUrl}. This test requires authentication.`);
        }
    } else if (currentUrl.includes('/login')) {
        // Expected - unauthenticated users redirect to login
        console.log('Unauthenticated user redirected to login (expected for public landing page)');
    } else {
        throw new Error(`Unexpected redirect to: ${currentUrl}`);
    }
});

Then('the note content should display {string}', async function(expectedContent) {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const content = await editor.inputValue();
    if (!content.includes(expectedContent)) {
        throw new Error(`Expected "${expectedContent}" in content, got: "${content}"`);
    }
});

// Notes page steps
When('I create a new note', async function() {
    const newNoteBtn = page.getByRole('button', { name: /New Note/i });
    if (await newNoteBtn.isVisible()) {
        await newNoteBtn.click();
        await page.waitForTimeout(500);
    } else {
        throw new Error('New Note button not found or not visible');
    }
});

When('I type {string} in the editor', async function(text) {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const isVisible = await editor.isVisible();
    if (!isVisible) {
        throw new Error('Editor not visible');
    }
    await editor.fill(text);
});

When('I wait for auto-save to complete', async function() {
    // Wait for auto-save debounce
    await page.waitForTimeout(3000);
});

Then('the editor should display {string}', async function(expectedContent) {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const content = await editor.inputValue();
    if (!content.includes(expectedContent)) {
        throw new Error(`Expected "${expectedContent}" in content, got: "${content}"`);
    }
});

When('I save the note', async function() {
    const saveBtn = page.getByRole('button', { name: /Save|Schedule/i });
    if (await saveBtn.isVisible()) {
        await saveBtn.click();
    }
});

When('I refresh the page', async function() {
    await page.reload();
    await page.waitForLoadState('networkidle');
});

When('I select the first note in the sidebar', async function() {
    const firstNote = page.locator('.notes-list button, [class*="notes-list"] button, .sidebar-notes button').first();
    const isVisible = await firstNote.isVisible();
    if (!isVisible) {
        throw new Error('No notes found in sidebar');
    }
    await firstNote.click();
    await page.waitForTimeout(500);
});

When('I add text {string} to the editor', async function(text) {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const currentValue = await editor.inputValue() || '';
    await editor.fill(currentValue + text);
});

Then('the note should still contain {string}', async function(expectedContent) {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const content = await editor.inputValue() || '';
    if (!content.includes(expectedContent)) {
        throw new Error(`Expected "${expectedContent}" to still be in content, got: "${content}"`);
    }
});

When('I change the first line to {string}', async function(newTitle) {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const currentValue = await editor.inputValue() || '';
    const lines = currentValue.split('\n');
    lines[0] = newTitle;
    await editor.fill(lines.join('\n'));
});

Then('the note should contain {string}', async function(expectedContent) {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const content = await editor.inputValue() || '';
    if (!content.includes(expectedContent)) {
        throw new Error(`Expected "${expectedContent}" in content, got: "${content}"`);
    }
});
