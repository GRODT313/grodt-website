const Stripe = require("stripe");

const PRODUCTS = {
  "cutoff-hoodie": {
    name: "GRODT Cut-Off Hoodie",
    price: 7500,
  },
  "oversized-tee": {
    name: "GRODT Oversized T-Shirt",
    price: 6000,
  },
  "oversized-cutoff-tee": {
    name: "GRODT Oversized Cut-Off T-Shirt",
    price: 6000,
  },
  shorts: {
    name: "GRODT Shorts",
    price: 6500,
  },
};

const SIZES = new Set(["S", "M", "L", "XL", "2XL"]);

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

  const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim();

  if (!stripeSecret) {
    res.status(500).json({
      error:
        "STRIPE_SECRET_KEY is missing in this deployment. In Vercel → Settings → Environment Variables, add STRIPE_SECRET_KEY for Production, then Redeploy (without build cache).",
    });
    return;
  }

  if (!/^sk_(test|live)_/.test(stripeSecret)) {
    res.status(500).json({
      error:
        "STRIPE_SECRET_KEY does not look like a Stripe secret key. Use the Secret key from Stripe Dashboard → Developers → API keys (starts with sk_test_ or sk_live_).",
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

  const lineItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = PRODUCTS[item.id];
    if (!product) {
      res.status(400).json({ error: "Unknown product in cart." });
      return;
    }

    const size = String(item.size || "").toUpperCase();
    if (!SIZES.has(size)) {
      res.status(400).json({ error: "Pick a valid size for every item." });
      return;
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      res.status(400).json({ error: "Invalid quantity." });
      return;
    }

    subtotal += product.price * qty;

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: product.price,
        product_data: {
          name: product.name + " - Size " + size,
          metadata: {
            product_id: String(item.id),
            size: String(size),
          },
        },
      },
    });
  }

  const shippingAmount = subtotal >= 7500 ? 0 : 800;
  const origin = getOrigin(req);

  try {
    const stripe = new Stripe(stripeSecret);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
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
      },
    });

    if (!session.url) {
      res.status(500).json({ error: "Stripe did not return a checkout URL." });
      return;
    }

    res.status(200).json({ url: session.url });
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
