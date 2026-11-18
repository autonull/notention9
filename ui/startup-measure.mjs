import { chromium } from "playwright-core";

const url = process.argv[2];
const clearStorage = process.argv[3] === "true";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

if (clearStorage) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

const startTime = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-ready]", { timeout: 10000 });
const loadTime = Date.now() - startTime;

console.log(`strobe:metric loadTime=${loadTime}`);

await browser.close();