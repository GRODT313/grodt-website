module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = String(process.env.STRIPE_SECRET_KEY || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  // Public health check: never expose key material.
  res.status(200).json({
    ok: true,
    stripeConfigured: Boolean(key) && /^sk_(test|live)_/.test(key),
    vercelEnv: process.env.VERCEL_ENV || null,
  });
};
