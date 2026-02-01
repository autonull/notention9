import { test, expect } from '@playwright/test';

test('dashboard loads and renders stats', async ({ page }) => {
  // Navigate to app (assuming localhost:3000 or similar based on setup)
  // For verification instructions, we usually serve the build.
  // Assuming the verification tool handles serving, we just navigate to /.
  await page.goto('/');

  // Wait for dashboard to be visible
  await expect(page.locator('text=Welcome back, Agent')).toBeVisible();

  // Verify Stat Cards
  await expect(page.locator('text=Total Notes')).toBeVisible();
  await expect(page.locator('text=Public Shared')).toBeVisible();
  await expect(page.locator('text=Skill Actions')).toBeVisible();

  // Verify Activity Feed or Empty State
  const feedVisible = await page.isVisible('text=Recent Activity');
  const emptyStateVisible = await page.isVisible('text=No recent activity');
  expect(feedVisible || emptyStateVisible).toBeTruthy();

  // Take screenshot
  await page.screenshot({ path: 'dashboard-verification.png' });
});
