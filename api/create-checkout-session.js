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
  return "http://localhost:3000";
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

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({
      error:
        "Checkout is not configured yet. Add STRIPE_SECRET_KEY in your Vercel environment variables.",
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
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
          name: product.name + " — Size " + size,
          metadata: {
            product_id: item.id,
            size: size,
          },
        },
      },
    });
  }

  const shippingAmount = subtotal >= 7500 ? 0 : 800;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = getOrigin(req);

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
              shippingAmount === 0
                ? "Free US shipping"
                : "US shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 7 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      success_url: origin + "/success.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/?checkout=canceled",
      metadata: {
        brand: "GRODT",
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({
      error: "Unable to start checkout. Please try again in a moment.",
    });
  }
};
