const Stripe = require("stripe");
const {
  priceItems,
  getFirst50SetsSold,
  getFirst50Limit,
} = require("../lib/pricing");

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) return proto + "://" + host;
  return "https://getrippedodt.com";
}

function readBody(req) {
  let body = req.body;

  if (body == null) return null;

  if (Buffer.isBuffer(body)) {
    body = body.toString("utf8");
  }

  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  }

  return body;
}

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const stripeSecret = cleanSecret(process.env.STRIPE_SECRET_KEY);

  if (!stripeSecret) {
    res.status(500).json({
      error:
        "STRIPE_SECRET_KEY is missing in this deployment. In Vercel → Settings → Environment Variables, add STRIPE_SECRET_KEY for Production, then Redeploy (without build cache).",
    });
    return;
  }

  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(stripeSecret)) {
    res.status(500).json({
      error:
        "STRIPE_SECRET_KEY looks malformed. In Stripe → Developers → API keys, copy the Secret key only (starts with sk_test_ or sk_live_), paste it into Vercel with no quotes or spaces, then Redeploy.",
    });
    return;
  }

  let body;
  try {
    body = readBody(req);
  } catch (e) {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items || items.length === 0) {
    res.status(400).json({ error: "Your cart is empty." });
    return;
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const limit = getFirst50Limit();
    let setsAvailable = limit;

    try {
      const sold = await getFirst50SetsSold(stripe);
      setsAvailable = Math.max(0, limit - sold);
    } catch (countErr) {
      console.error("First 50 count failed, allowing deal:", countErr.message);
      setsAvailable = limit;
    }

    const priced = priceItems(items, setsAvailable);
    if (priced.error) {
      res.status(400).json({ error: priced.error });
      return;
    }

    if (!priced.lineItems.length) {
      res.status(400).json({ error: "Your cart is empty." });
      return;
    }

    const shippingAmount = priced.subtotal >= 7500 ? 0 : 800;
    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: priced.lineItems,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: shippingAmount,
              currency: "usd",
            },
            display_name:
              shippingAmount === 0 ? "Free US shipping" : "US shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 15 },
              maximum: { unit: "business_day", value: 30 },
            },
          },
        },
      ],
      phone_number_collection: {
        enabled: true,
      },
      success_url: origin + "/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/?checkout=canceled",
      metadata: {
        brand: "GRODT",
        first50_sets: String(priced.setsApplied),
      },
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a checkout URL." });
      return;
    }

    res.status(200).json({
      url: session.url,
      setsApplied: priced.setsApplied,
      setsRemaining: Math.max(0, setsAvailable - priced.setsApplied),
    });
  } catch (err) {
    console.error("Stripe checkout error:", {
      type: err && err.type,
      code: err && err.code,
      message: err && err.message,
      statusCode: err && err.statusCode,
      rawType: err && err.rawType,
    });

    const message = (err && err.message) || "Unable to start checkout.";
    res.status(500).json({
      error: message,
      code: (err && err.code) || null,
      type: (err && err.type) || null,
    });
  }
};
