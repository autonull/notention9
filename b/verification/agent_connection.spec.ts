import { test, expect } from '@playwright/test';

test('Verify Agent Connection and Status Query', async ({ page }) => {
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');

  // Wait for sidebar
  const sidebar = page.locator('.bg-gray-900').first();
  await sidebar.waitFor({ state: 'visible' });
  console.log('Sidebar loaded.');

  // Find the CPU Chip Icon button
  const indicator = page.locator('[title^="Agent "]');

  // Wait for connection (title becomes "Agent Connected")
  await expect(indicator).toHaveAttribute('title', 'Agent Connected', { timeout: 10000 });
  console.log('Agent is connected.');

  // Click the indicator to open the modal
  await indicator.click();
  console.log('Clicked Agent Indicator.');

  // Wait for Modal
  const modal = page.locator('div[role="dialog"]');
  await modal.waitFor({ state: 'visible' });
  await expect(modal).toContainText('Agent Status');
  console.log('Agent Status Modal opened.');

  // Click "Refresh Status"
  const refreshBtn = modal.locator('button', { hasText: 'Refresh Status' });
  await refreshBtn.click();
  console.log('Clicked Refresh Status.');

  // Wait for Status Response
  // Find the "Status:" label
  const statusLabel = modal.locator('span', { hasText: /^Status:$/ });
  await statusLabel.waitFor({ state: 'visible', timeout: 5000 });

  // Get the value next to it (sibling)
  // Structure: <div> <span>Status:</span> <span class="text-green-400">running</span> </div>
  const statusValue = statusLabel.locator('..').locator('span').nth(1);

  await expect(statusValue).toBeVisible();
  const statusText = await statusValue.textContent();
  console.log(`Agent returned status: "${statusText}"`);

  // It should be 'running'
  expect(statusText).toBe('running');

  // Take screenshot
  await page.screenshot({ path: 'verification/agent_status_interaction.png' });
});
