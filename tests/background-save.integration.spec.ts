import { test, expect } from '@playwright/test';

/**
 * Background Save Integration Test
 * Tests that the dashboard quick note save feature correctly persists to the real database
 * Requires Supabase authentication
 */

test.describe('Dashboard Background Save Integration - Real Database', () => {
	let testNoteId: string;
	let testTimestamp: number;

	test.beforeEach(async ({ page }) => {
		testTimestamp = Date.now();

		// Try to navigate to dashboard
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Check if authenticated (if redirected to login, we'll handle it)
		if (page.url().includes('/login')) {
			test.skip();
		}
	});

	test('save note via dashboard immediately creates temp note and background-saves to database', async ({
		page,
		context,
	}) => {
		// Skip if not authenticated
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		if (page.url().includes('/login')) {
			test.skip();
		}

		// 1. Fill in compose box with unique content
		const testContent = `Integration Test - Dashboard Save - ${testTimestamp}`;
		const composeBox = page.locator('textarea[placeholder*="What\'s on your mind"]');

		if (!(await composeBox.isVisible())) {
			test.skip();
		}

		await composeBox.fill(testContent);

		// 2. Click Save Note button
		const saveBtn = page.getByRole('button', { name: /Save Note/i });
		await saveBtn.click();

		// 3. Verify immediate navigation to /notes with temp ID
		await page.waitForURL(/\/notes\?id=temp_/, { timeout: 5000 });
		const initialUrl = page.url();
		expect(initialUrl).toContain('?id=temp_');
		const tempId = new URL(initialUrl).searchParams.get('id');
		expect(tempId).toMatch(/^temp_\d+$/);

		// 4. Verify content is displayed immediately in editor
		const editor = page.locator('[contenteditable="true"], textarea').first();
		await expect(editor).toBeVisible();
		const displayedContent = await editor.inputValue();
		expect(displayedContent).toContain(testContent);

		// 5. Wait for background save (check network activity)
		await page.waitForTimeout(2000);

		// 6. Refresh page - should replace temp ID with real ID
		const beforeRefreshUrl = page.url();
		await page.reload();
		await page.waitForLoadState('networkidle');
		const afterRefreshUrl = page.url();

		// After refresh, either temp ID persists in URL or has been replaced with real ID
		// Both are acceptable states - the important thing is the data is in the database
		const noteIdAfterRefresh = new URL(afterRefreshUrl).searchParams.get('id');
		testNoteId = noteIdAfterRefresh || tempId;

		// Verify content still shows
		const editorAfterRefresh = page.locator('[contenteditable="true"], textarea').first();
		const contentAfterRefresh = await editorAfterRefresh.inputValue();
		expect(contentAfterRefresh).toContain(testContent);

		// 7. Navigate completely away and back to verify database persistence
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// 8. Go to notes page to check if note appears in list
		await page.goto('/notes');
		await page.waitForLoadState('networkidle');

		// 9. Verify the note appears in the sidebar/list
		const noteInList = page.getByText(testContent.substring(0, 30));
		await expect(noteInList).toBeVisible({ timeout: 10000 });

		// 10. Click on the note to load it
		await noteInList.click();
		await page.waitForLoadState('networkidle');

		// 11. Verify content matches what we saved
		const finalEditor = page.locator('[contenteditable="true"], textarea').first();
		const finalContent = await finalEditor.inputValue();
		expect(finalContent).toContain(testContent);

		console.log(`✅ Background save test PASSED - Note created and persisted: ${testNoteId}`);
	});

	test('rapid successive notes are all saved correctly', async ({ page }) => {
		// Skip if not authenticated
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		if (page.url().includes('/login')) {
			test.skip();
		}

		const notes = [];

		// Create 3 notes rapidly
		for (let i = 0; i < 3; i++) {
			const content = `Rapid Test ${i} - ${testTimestamp}`;
			const composeBox = page.locator('textarea[placeholder*="What\'s on your mind"]');

			await composeBox.fill(content);
			const saveBtn = page.getByRole('button', { name: /Save Note/i });
			await saveBtn.click();

			// Wait for navigation
			await page.waitForURL(/\/notes\?id=temp_/, { timeout: 5000 });
			notes.push(content);

			// Go back to home to create next note
			if (i < 2) {
				await page.goto('/');
				await page.waitForLoadState('networkidle');
				await page.waitForTimeout(500);
			}
		}

		// Verify all notes are in database
		await page.goto('/notes');
		await page.waitForLoadState('networkidle');

		for (const content of notes) {
			const noteInList = page.getByText(content.substring(0, 20));
			await expect(noteInList).toBeVisible({ timeout: 10000 });
		}

		console.log(`✅ Rapid save test PASSED - All ${notes.length} notes persisted correctly`);
	});

	test('autosave persists edits to database', async ({ page }) => {
		// Skip if not authenticated
		await page.goto('/notes');
		await page.waitForLoadState('networkidle');
		if (page.url().includes('/login')) {
			test.skip();
		}

		// Get first note
		const firstNote = page.locator('.notes-list button, [class*="notes-list"] button, .sidebar-notes button').first();
		if (!(await firstNote.isVisible())) {
			test.skip();
		}

		await firstNote.click();
		await page.waitForLoadState('networkidle');

		// Edit the note
		const editor = page.locator('[contenteditable="true"], textarea').first();
		const originalContent = await editor.inputValue();
		const editText = ` - Autosave Edit ${testTimestamp}`;
		await editor.fill((originalContent || '') + editText);

		// Wait for autosave (typically 2-3 seconds debounce)
		await page.waitForTimeout(3000);

		// Refresh page
		await page.reload();
		await page.waitForLoadState('networkidle');

		// Verify edit persisted
		const editorAfterRefresh = page.locator('[contenteditable="true"], textarea').first();
		const contentAfterRefresh = await editorAfterRefresh.inputValue();
		expect(contentAfterRefresh).toContain(editText);

		console.log(`✅ Autosave test PASSED - Edits persisted to database`);
	});
});
