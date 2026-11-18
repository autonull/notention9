import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, "dist");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  const url = req.url || "/";
  let filePath = join(distDir, url === "/" ? "index.html" : url);
  const ext = extname(filePath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

const port = 4173;
const clearStorage = process.argv[2] === "true";

server.listen(port, async () => {
  process.stderr.write(`Server ready on http://localhost:${port}\n`);
  
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const startTime = Date.now();
    await page.goto(`http://localhost:${port}`, { waitUntil: "domcontentloaded" });
    
    if (clearStorage) {
      // Clear storage for cold start after page loads
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
    
    await page.waitForSelector("[data-ready]", { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    console.log(`strobe:metric loadTime=${loadTime}`);

    await browser.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
});

function dirname(path) {
  return path.split("/").slice(0, -1).join("/") || "/";
}