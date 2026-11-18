import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "node:url";

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
server.listen(port, () => {
  const msg = `Server ready on http://localhost:${port}\n`;
  process.stderr.write(msg);
  process.stdout.write(msg);
});

function dirname(path) {
  return path.split("/").slice(0, -1).join("/") || "/";
}