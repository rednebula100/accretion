import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);
if (!fs.existsSync(path.join(root, "index.html")))
  throw Error("Run npm run build first.");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const port = Number(process.env.PORT || 4174);
http
  .createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const relative =
        decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      const file = path.resolve(root, relative);
      if (
        !file.startsWith(root + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      ) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(400);
      res.end("Bad request");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`ACCRETION is ready at http://127.0.0.1:${port}`),
  );
