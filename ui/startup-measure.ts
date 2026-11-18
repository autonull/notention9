import { chromium } from "playwright-core";

interface MeasureArgs {
  url: string;
  clearStorage: boolean;
}

export async function measure(args: MeasureArgs): Promise<{ loadTime: number }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  if (args.clearStorage) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  const startTime = Date.now();
  await page.goto(args.url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-ready]", { timeout: 10000 });
  const loadTime = Date.now() - startTime;

  await browser.close();

  return { loadTime };
}