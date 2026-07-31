module.exports = async function handler(req, res) {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();

  res.status(200).json({
    ok: true,
    stripeConfigured: key.length > 0,
    stripeKeyPrefix: key ? key.slice(0, 7) + "..." : null,
    nodeEnv: process.env.NODE_ENV || null,
    vercelEnv: process.env.VERCEL_ENV || null,
  });
};
