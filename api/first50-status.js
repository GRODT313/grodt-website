const Stripe = require("stripe");
const { getFirst50SetsSold, getFirst50Limit } = require("../lib/pricing");

function cleanSecret(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const limit = getFirst50Limit();
  const stripeSecret = cleanSecret(process.env.STRIPE_SECRET_KEY);

  if (!stripeSecret) {
    res.status(200).json({
      active: true,
      limit: limit,
      sold: 0,
      remaining: limit,
      setPrice: 100,
      includes: "Oversized T-Shirt or Oversized Cut-Off T-Shirt + Shorts",
      excludes: "Cut-Off Hoodie",
    });
    return;
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const sold = await getFirst50SetsSold(stripe);
    const remaining = Math.max(0, limit - sold);

    res.status(200).json({
      active: remaining > 0,
      limit: limit,
      sold: sold,
      remaining: remaining,
      setPrice: 100,
      includes: "Oversized T-Shirt or Oversized Cut-Off T-Shirt + Shorts",
      excludes: "Cut-Off Hoodie",
    });
  } catch (err) {
    console.error("first50-status error:", err.message);
    res.status(200).json({
      active: true,
      limit: limit,
      sold: 0,
      remaining: limit,
      setPrice: 100,
      includes: "Oversized T-Shirt or Oversized Cut-Off T-Shirt + Shorts",
      excludes: "Cut-Off Hoodie",
    });
  }
};
