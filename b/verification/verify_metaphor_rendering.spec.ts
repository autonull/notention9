import { test, expect } from '@playwright/test';

test('Metaphor Rendering Verification', async ({ page }) => {
  // 1. Navigate to the app
  await page.goto('http://localhost:5173');

  // 2. Create a new note with intent-heavy text
  // Assuming there is a "New Note" button or similar interaction pattern.
  // Based on common UI patterns or previous knowledge (e.g. EditorManager.tsx), let's try to type in the main editor.

  // Wait for editor to be ready
  await page.waitForSelector('.ProseMirror');

  // Clear existing content (ctrl+a, backspace) if any, or just type
  await page.click('.ProseMirror');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');

  // Type a text that triggers the 'reminder' intent
  await page.keyboard.type('Remind me to submit the report');

  // Wait for the metaphor system to process (it might be debounced)
  await page.waitForTimeout(2000);

  // 3. Verify that the Metaphor Component appears
  // Looking for text "Reminder Intent" or similar based on our DefaultPatterns
  // The MetaphorRenderer renders the metaphor name.
  // DEFAULT_PATTERNS map 'reminder' intent -> 'Reminder Intent' (actually, DEFAULT_PATTERNS are for PatternRecognition).
  // MetaphorMapper maps properties to UIMetaphors.
  // Wait, the flow is: Text -> PropertyExtractor -> Properties (intent: reminder) -> MetaphorMapper -> UIMetaphor.
  // Does 'reminder' intent map to a specific UIMetaphor in `MetaphorMapper.ts`?
  // Checking `MetaphorMapper.ts` refactor:
  // It checks for 'condition' -> 'if'/'condition', 'action' -> 'then'/'do'/'action'.
  // It maps to 'conditional-automation' if 'if' and 'then' exist.
  // 'reminder' intent might not trigger a DEFAULT UIMetaphor unless we added one or properties match.
  // Let's use the text "If I finish, then I submit" to trigger 'conditional-automation' which we KNOW works.

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('If verification is done, then submit the changes.');

  await page.waitForTimeout(2000);

  // Expect "Conditional Automation" to be visible
  await expect(page.locator('text=Conditional Automation')).toBeVisible();

  // 4. Take a screenshot
  await page.screenshot({ path: 'b/verification/metaphor_rendering.png' });
});
