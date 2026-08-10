const ALLOWED_EXACT = new Set([
  "https://getrippedodt.com",
  "https://www.getrippedodt.com",
  "http://localhost:3000",
  "http://localhost:8080",
]);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_EXACT.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".vercel.app");
  } catch (e) {
    return false;
  }
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = { applyCors, isAllowedOrigin };
