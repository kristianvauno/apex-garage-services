const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const zlib = require("zlib");

const root = __dirname;
const leads = path.join(process.env.TEMP || "C:/Users/ADMIN/AppData/Local/Temp", "apex-leads.jsonl");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const COMPRESSIBLE = new Set([".html", ".css", ".js", ".svg", ".xml", ".txt", ".json"]);

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function cacheControl(file, pathname) {
  const ext = path.extname(file);
  if (ext === ".html") return "no-cache";
  if (pathname.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  return "public, max-age=86400";
}

function send(res, code, body, type) {
  res.writeHead(code, Object.assign({ "Content-Type": type || "application/json; charset=utf-8" }, SECURITY_HEADERS));
  res.end(body);
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || "/";
  const parsed = new URL(rawUrl, "http://127.0.0.1:8091");
  let pathname = decodeURIComponent(parsed.pathname);

  if (req.method === "POST" && pathname === "/api/estimate") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) req.destroy();
    });
    req.on("end", () => {
      let data;
      try { data = JSON.parse(body); }
      catch (err) { send(res, 400, '{"error":"bad json"}'); return; }
      if (data.company) { send(res, 200, '{"ok":true}'); return; }
      if (!data.name || !data.phone || !data.vehicle || !data.service || data.consent !== "yes") {
        send(res, 422, '{"error":"missing fields"}');
        return;
      }
      const row = {
        at: new Date().toISOString(),
        name: String(data.name).slice(0, 200),
        phone: String(data.phone).slice(0, 40),
        email: String(data.email || "").slice(0, 200),
        vehicle: String(data.vehicle).slice(0, 120),
        service: String(data.service).slice(0, 40),
        day: String(data.day || "").slice(0, 40),
        area: String(data.area || "").slice(0, 40),
        message: String(data.message || "").slice(0, 2000),
      };
      fs.appendFile(leads, JSON.stringify(row) + "\n", () => {
        send(res, 200, '{"ok":true}');
      });
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed", "text/plain; charset=utf-8");
    return;
  }

  // 301 /path/index.html -> /path/ (and /index.html -> /)
  if (/\/index\.html$/i.test(pathname)) {
    const clean = pathname.replace(/\/index\.html$/i, "/") || "/";
    const target = clean + (parsed.search || "");
    res.writeHead(301, Object.assign({ Location: target }, SECURITY_HEADERS));
    res.end();
    return;
  }

  if (/^\/(src\/|node_modules\/|server\.js$|build\.js$|package(-lock)?\.json$)/i.test(pathname)) {
    send(res, 404, "Not found " + pathname, "text/plain; charset=utf-8");
    return;
  }

  let servePath = pathname;
  if (servePath.endsWith("/")) servePath += "index.html";
  const file = path.normalize(path.join(root, servePath));
  if (!file.startsWith(path.normalize(root))) {
    send(res, 403, "no", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { send(res, 404, "Not found " + pathname, "text/plain; charset=utf-8"); return; }
    const ext = path.extname(file);
    const type = mime[ext] || "application/octet-stream";
    const headers = Object.assign({ "Content-Type": type, "Cache-Control": cacheControl(file, pathname) }, SECURITY_HEADERS);
    const accepts = String(req.headers["accept-encoding"] || "");
    let body = data;
    if (COMPRESSIBLE.has(ext)) {
      headers["Vary"] = "Accept-Encoding";
      if (/\bbr\b/.test(accepts)) {
        body = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
        headers["Content-Encoding"] = "br";
      } else if (/\bgzip\b/.test(accepts)) {
        body = zlib.gzipSync(data, { level: 6 });
        headers["Content-Encoding"] = "gzip";
      }
    }
    headers["Content-Length"] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  });
});

server.listen(8091, "127.0.0.1", () => {
  console.log("listening 8091");
});