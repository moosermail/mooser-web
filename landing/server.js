import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const DIR  = fileURLToPath(new URL(".", import.meta.url));
const PORT = parseInt(process.env.PORT ?? "4000");

const MIME = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

createServer(async (req, res) => {
  let pathname = req.url?.split("?")[0] ?? "/";
  if (pathname === "/") pathname = "/index.html";

  const file = join(DIR, pathname);
  const ext  = extname(file);

  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`moosermail-landing  →  127.0.0.1:${PORT}`);
});
