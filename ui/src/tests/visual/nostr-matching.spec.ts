import { test, expect } from '@playwright/test';

test('Nostr P2P Matching Flow', async ({ page, context }) => {
  // Use two different contexts to simulate two users
  const pageA = page;
  const pageB = await context.newPage();

  // Setup User A (Requestor)
  await pageA.goto('http://localhost:5173');
  await pageA.click('button:has-text("New Note")');
  await pageA.fill('.tiptap', 'I need a React Developer [role:is:React Developer] [budget < 5000]');

  // Publish Note A
  await pageA.click('button:has-text("Private")');
  await pageA.click('button:has-text("Make Public & Share")');
  await expect(pageA.locator('button:has-text("Published")')).toBeVisible();

  // Setup User B (Provider)
  await pageB.goto('http://localhost:5173');
  await pageB.click('button:has-text("New Note")');
  await pageB.fill('.tiptap', 'I am a Senior React Developer [role:is:React Developer] [salary:is:4500]');

  // Publish Note B
  await pageB.click('button:has-text("Private")');
  await pageB.click('button:has-text("Make Public & Share")');

  // Verify Matching on User A's side
  await pageA.click('#tab-network'); // Open Network tab in assistant
  await pageA.click('button:has-text("Find Matches")');

  // We expect to find the match from User B
  await pageA.waitForSelector('text=React Developer', { timeout: 10000 });
  await expect(pageA.locator('text=React Developer').first()).toBeVisible();
});
