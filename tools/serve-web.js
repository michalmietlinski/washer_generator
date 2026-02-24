import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = 5173;

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".stl": "model/stl",
  ".txt": "text/plain; charset=utf-8"
};

function resolveSafePath(urlPathname) {
  const cleanPath = decodeURIComponent(urlPathname.split("?")[0]);
  const target = cleanPath === "/" ? "/web/index.html" : cleanPath;
  const absolute = path.resolve(projectRoot, `.${target}`);
  if (!absolute.startsWith(projectRoot)) {
    return null;
  }
  return absolute;
}

const server = http.createServer(async (req, res) => {
  const absolutePath = resolveSafePath(req.url || "/");
  if (!absolutePath) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(absolutePath);
    if (stat.isDirectory()) {
      res.writeHead(302, { location: "/web/index.html" });
      res.end();
      return;
    }

    const data = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    res.writeHead(200, {
      "content-type": mimeByExt[ext] || "application/octet-stream"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Web UI available at http://${host}:${port}/web/index.html`);
});
