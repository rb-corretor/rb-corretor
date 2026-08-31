import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import compare from "../api/compare.js";
import health from "../api/health.js";
import network from "../api/network.js";
import operators from "../api/operators.js";
import products from "../api/products.js";

for (const envFile of [".env.local", ".env"]) {
  try { for (const line of (await readFile(envFile, "utf8")).split(/\r?\n/)) { const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, ""); } } catch { /* arquivo opcional */ }
}
const root = resolve("."); const port = Number(process.env.PORT || 3000);
const routes = { "/api/compare": compare, "/api/health": health, "/api/network": network, "/api/operators": operators, "/api/products": products };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".css": "text/css" };
createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`), handler = routes[url.pathname];
  if (handler) { const query = Object.fromEntries(url.searchParams); const response = { status(code) { res.statusCode = code; return this; }, json(body) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(body)); return this; } }; return handler({ query }, response); }
  const requested = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, ""); const path = resolve(root, requested);
  if (!path.startsWith(root)) { res.statusCode = 403; return res.end("Forbidden"); }
  try { await stat(path); res.setHeader("Content-Type", types[extname(path)] || "application/octet-stream"); createReadStream(path).pipe(res); } catch { res.statusCode = 404; res.end("Not found"); }
}).listen(port, () => console.log(`Minha Rede Saúde local: http://localhost:${port}`));
