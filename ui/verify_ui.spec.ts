import { test, expect } from '@playwright/test';

test('verify ui loads and is responsive', async ({ page }) => {
  await page.goto('http://localhost:5174/');

  // Wait for loading to complete - adjust selector as needed
  await page.waitForLoadState('networkidle');

  // Check if sidebar is visible (assuming desktop view)
  const sidebar = page.locator('aside, .sidebar');
  if (await sidebar.isVisible()) {
    console.log('Sidebar is visible on desktop');
  }

  // Take screenshot of desktop view
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: 'desktop_view.png' });

  // Take screenshot of mobile view
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000); // Wait for potential layout shifts
  await page.screenshot({ path: 'mobile_view.png' });

  console.log('Screenshots saved: desktop_view.png, mobile_view.png');
});
