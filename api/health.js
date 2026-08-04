module.exports = async function handler(req, res) {
  const key = String(process.env.STRIPE_SECRET_KEY || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  const looksValid = /^sk_(test|live)_[A-Za-z0-9]+$/.test(key);

  res.status(200).json({
    ok: true,
    stripeConfigured: key.length > 0,
    stripeKeyLooksValid: looksValid,
    stripeKeyPrefix: key ? key.slice(0, 8) + "..." : null,
    stripeKeyLength: key.length,
    // Stripe secret keys are typically 100+ characters. Short length usually means a truncated paste.
    stripeKeyLengthOk: key.length >= 90,
    nodeEnv: process.env.NODE_ENV || null,
    vercelEnv: process.env.VERCEL_ENV || null,
  });
};
