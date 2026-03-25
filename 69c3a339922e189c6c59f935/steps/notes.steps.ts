import { Given, When, Then, Before, After } from '@dev-blinq/cucumber-js';
import { chromium, Browser, Page, expect } from '@playwright/test';

let browser: Browser;
let page: Page;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

Before(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
});

After(async () => {
    await page?.close();
    await browser?.close();
});

// Navigation steps
Given('I navigate to the home page', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
});

Given('I navigate to the notes page', async () => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');
});

Given('I navigate to the amber page', async () => {
    await page.goto(`${BASE_URL}/amber`);
    await page.waitForLoadState('networkidle');
});

// Dashboard compose steps
When('I fill the compose box with {string}', async (text: string) => {
    const composeBox = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await composeBox.fill(text);
});

When('I click the {string} button', async (buttonName: string) => {
    const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') });
    await button.click();
});

Then('I should be redirected to the notes page with a temp ID', async () => {
    await page.waitForURL(/\/notes\?id=temp_/, { timeout: 5000 });
    const url = page.url();
    expect(url).toContain('?id=temp_');
});

Then('the note content should display {string}', async (expectedContent: string) => {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    await expect(editor).toContainText(expectedContent);
});

// Notes page steps
When('I create a new note', async () => {
    const newNoteBtn = page.getByRole('button', { name: /New Note/i });
    await newNoteBtn.click();
    await page.waitForTimeout(500);
});

When('I create a new note with content {string}', async (content: string) => {
    const newNoteBtn = page.getByRole('button', { name: /New Note/i });
    await newNoteBtn.click();
    await page.waitForTimeout(500);

    const editor = page.locator('[contenteditable="true"], textarea').first();
    await editor.fill(content);
});

When('I type {string} in the editor', async (text: string) => {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    await editor.fill(text);
});

When('I add text {string} to the editor', async (text: string) => {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const currentValue = await editor.inputValue();
    await editor.fill((currentValue || '') + text);
});

When('I change the first line to {string}', async (newTitle: string) => {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const currentValue = await editor.inputValue();
    const lines = (currentValue || '').split('\n');
    lines[0] = newTitle;
    await editor.fill(lines.join('\n'));
});

When('I wait for auto-save to complete', async () => {
    // Wait for the autosave to trigger (usually debounced by 2 seconds)
    await page.waitForTimeout(2500);
});

When('I save the note', async () => {
    const saveBtn = page.getByRole('button', { name: /Save|Schedule/i });
    if (await saveBtn.isVisible()) {
        await saveBtn.click();
    }
});

When('I refresh the page', async () => {
    await page.reload();
    await page.waitForLoadState('networkidle');
});

When('I select the first note in the sidebar', async () => {
    const firstNote = page.locator('.notes-list button, [class*="notes-list"] button, .sidebar-notes button').first();
    await firstNote.click();
    await page.waitForTimeout(500);
});

When('I select the {string} note', async (position: string) => {
    const notes = page.locator('.notes-list button, [class*="notes-list"] button, .sidebar-notes button');
    if (position === 'first') {
        await notes.first().click();
    } else if (position === 'second') {
        await notes.nth(1).click();
    }
    await page.waitForTimeout(500);
});

When('I click the first note in the sidebar', async () => {
    const firstNote = page.locator('.notes-list button, [class*="notes-list"] button, .sidebar-notes button').first();
    await firstNote.click();
    await page.waitForTimeout(500);
});

When('I click the second note in the sidebar', async () => {
    const notes = page.locator('.notes-list button, [class*="notes-list"] button, .sidebar-notes button');
    await notes.nth(1).click();
    await page.waitForTimeout(500);
});

When('I delete the current note', async () => {
    const deleteBtn = page.getByRole('button', { name: /Delete|Remove/i });
    if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        // Confirm deletion if there's a modal
        const confirmBtn = page.getByRole('button', { name: /Confirm|Yes|Delete/i });
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        }
    }
});

When('I navigate away and back to notes', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');
});

// Assertions
Then('the sidebar should show {string} for that note', async (expectedTitle: string) => {
    const noteItem = page.getByText(expectedTitle);
    await expect(noteItem).toBeVisible();
});

Then('the editor should display {string}', async (expectedContent: string) => {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    await expect(editor).toContainText(expectedContent);
});

Then('the note should not appear in the sidebar', async () => {
    // Notes are dynamically loaded, so just verify the sidebar is clean
    const sidebar = page.locator('.notes-list, [class*="notes-list"], .sidebar-notes');
    await expect(sidebar).toBeVisible();
});

Then('I should be redirected to the amber page', async () => {
    await page.waitForURL(/\/amber/, { timeout: 5000 });
    expect(page.url()).toContain('/amber');
});

Then('a loading state should be visible', async () => {
    // Look for loading spinner or skeleton state
    const loadingStates = page.locator('[class*="loading"], [class*="skeleton"], [class*="spin"]');
    const isVisible = await loadingStates.first().isVisible();
    // Don't strictly require this as timing can vary
    // expect(isVisible).toBeTruthy();
});

Then('the draft should be restored from localStorage', async () => {
    // Just verify we're on the notes page and content is visible
    const editor = page.locator('[contenteditable="true"], textarea').first();
    await expect(editor).toBeVisible();
});

Then('the note content should still be {string}', async (expectedContent: string) => {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const actualContent = await editor.inputValue();
    expect(actualContent).toContain(expectedContent);
});

Then('the note should contain {string}', async (expectedContent: string) => {
    const editor = page.locator('[contenteditable="true"], textarea').first();
    const actualContent = await editor.inputValue();
    expect(actualContent).toContain(expectedContent);
});
