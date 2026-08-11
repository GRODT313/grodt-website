const Stripe = require("stripe");
const {
  priceItems,
  getFirst50SetsSold,
  getFirst50Limit,
  SHIPPING_TAX_CODE,
} = require("../lib/pricing");
const { applyCors } = require("../lib/cors");

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
    if (trimmed.length > 20000) {
      const err = new Error("Payload too large");
      err.code = "PAYLOAD_TOO_LARGE";
      throw err;
    }
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

function publicCheckoutError(err) {
  const type = err && err.type;
  const code = err && err.code;

  if (type === "StripeAuthenticationError" || code === "api_key_expired") {
    return "Checkout is temporarily unavailable. Please try again later.";
  }
  if (code === "PAYLOAD_TOO_LARGE") {
    return "Cart payload is too large.";
  }
  if (type === "StripeInvalidRequestError") {
    return "Unable to start checkout. Please refresh and try again.";
  }
  return "Unable to start checkout. Please try again in a moment.";
}

module.exports = async function handler(req, res) {
  applyCors(req, res);
  res.setHeader("Cache-Control", "no-store");

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
        "Checkout is not configured yet. Please try again later.",
    });
    return;
  }

  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(stripeSecret)) {
    res.status(500).json({
      error: "Checkout is temporarily unavailable. Please try again later.",
    });
    return;
  }

  let body;
  try {
    body = readBody(req);
  } catch (e) {
    if (e && e.code === "PAYLOAD_TOO_LARGE") {
      res.status(413).json({ error: publicCheckoutError(e) });
      return;
    }
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items || items.length === 0) {
    res.status(400).json({ error: "Your cart is empty." });
    return;
  }
  if (items.length > 50) {
    res.status(400).json({ error: "Too many items in cart." });
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

    const sessionParams = {
      mode: "payment",
      line_items: priced.lineItems,
      automatic_tax: {
        enabled: true,
      },
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
            tax_behavior: "exclusive",
            tax_code: SHIPPING_TAX_CODE,
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
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (taxErr) {
      // If Stripe Tax is not activated on the account yet, retry without
      // automatic tax so checkout keeps working. Tax collection starts
      // once Stripe Tax is set up in the Dashboard.
      const msg = String((taxErr && taxErr.message) || "");
      const isTaxSetupError =
        taxErr &&
        taxErr.type === "StripeInvalidRequestError" &&
        /automatic_tax|stripe tax/i.test(msg);

      if (!isTaxSetupError) throw taxErr;

      console.error("Stripe Tax not active, retrying without tax:", msg);
      const fallbackParams = { ...sessionParams };
      delete fallbackParams.automatic_tax;
      session = await stripe.checkout.sessions.create(fallbackParams);
    }

    if (!session.url) {
      res.status(500).json({ error: "Unable to start checkout. Please try again in a moment." });
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
    });

    res.status(500).json({
      error: publicCheckoutError(err),
    });
  }
};
