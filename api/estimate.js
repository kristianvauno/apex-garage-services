const fs = require("fs");

function json(res, code, body) {
  res.status(code).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return null;
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (err) {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "method" });
    return;
  }
  const data = await readBody(req);
  if (!data) {
    json(res, 400, { error: "bad json" });
    return;
  }
  if (data.company) {
    json(res, 200, { ok: true });
    return;
  }
  if (!data.name || !data.phone || !data.vehicle || !data.service || data.consent !== "yes") {
    json(res, 422, { error: "missing fields" });
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
  try {
    fs.appendFileSync("/tmp/apex-leads.jsonl", JSON.stringify(row) + "\n");
  } catch (err) {
    json(res, 500, { error: "store" });
    return;
  }
  json(res, 200, { ok: true });
};
