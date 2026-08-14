const Stripe = require("stripe");

const ORDER_EMAIL = "mal@getrippedodt.com";

function cleanSecret(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function readBody(req) {
  let body = req.body;
  if (body == null) return null;
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  }
  return body;
}

function dollars(cents) {
  return "$" + (Number(cents || 0) / 100).toFixed(2);
}

function formatAddress(details) {
  if (!details) return "No shipping address on file";
  const addr = details.address || {};
  return [
    details.name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "),
    addr.country,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatOrderEmail(session, lineItems) {
  const customer = session.customer_details || {};
  const shipping =
    session.shipping_details ||
    (session.collected_information &&
      session.collected_information.shipping_details) ||
    null;
  const totals = session.total_details || {};

  const lines = [];
  lines.push("NEW ORDER - GET RIPPED OR DIE TRYING");
  lines.push("");
  lines.push("Order ID: " + session.id);
  lines.push("Total paid: " + dollars(session.amount_total));
  lines.push("  Tax collected: " + dollars(totals.amount_tax));
  lines.push("  Shipping charged: " + dollars(totals.amount_shipping));
  lines.push("");
  lines.push("ITEMS TO ORDER FROM SUPPLIER:");
  for (const item of lineItems) {
    const product =
      item.price && typeof item.price.product === "object"
        ? item.price.product
        : null;
    const meta = (product && product.metadata) || {};
    let sizeNote = "";
    if (meta.deal === "first50") {
      sizeNote =
        " [tee size " + meta.tee_size + ", shorts size " + meta.shorts_size + "]";
    } else if (meta.size) {
      sizeNote = " [size " + meta.size + "]";
    }
    lines.push(
      "- " +
        (item.quantity || 1) +
        "x " +
        item.description +
        sizeNote +
        " - " +
        dollars(item.amount_total)
    );
  }
  lines.push("");
  lines.push("CUSTOMER SHIP-TO ADDRESS:");
  lines.push(formatAddress(shipping));
  lines.push("");
  lines.push("CUSTOMER CONTACT:");
  lines.push("Email: " + (customer.email || "not provided"));
  lines.push("Phone: " + (customer.phone || "not provided"));
  lines.push("");
  lines.push(
    "Next steps: order these items from your supplier, then package and " +
      "ship to the customer address above once they arrive. Customer " +
      "expects delivery in 3-6 weeks."
  );

  return lines.join("\n");
}

async function sendOrderEmail(subject, message) {
  // FormSubmit rejects bare server-side posts. Origin/Referer must match the live site.
  const response = await fetch(
    "https://formsubmit.co/ajax/" + ORDER_EMAIL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://getrippedodt.com",
        Referer: "https://getrippedodt.com/",
      },
      body: JSON.stringify({
        _subject: subject,
        _template: "box",
        _captcha: "false",
        message: message,
      }),
    }
  );

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch (e) {
    payload = null;
  }

  const formSubmitFailed =
    !response.ok ||
    (payload &&
      (payload.success === false ||
        payload.success === "false" ||
        payload.error));

  if (formSubmitFailed) {
    throw new Error(
      "Order email failed with status " +
        response.status +
        (raw ? ": " + raw.slice(0, 300) : "")
    );
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const stripeSecret = cleanSecret(process.env.STRIPE_SECRET_KEY);
  if (!stripeSecret) {
    res.status(500).json({ error: "Not configured" });
    return;
  }

  let body;
  try {
    body = readBody(req);
  } catch (e) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const eventId = body && body.id;
  if (typeof eventId !== "string" || !/^evt_[A-Za-z0-9]+$/.test(eventId)) {
    res.status(400).json({ error: "Invalid event" });
    return;
  }

  try {
    const stripe = new Stripe(stripeSecret);

    // Never trust the webhook payload itself. Re-fetch the event from
    // Stripe by ID so forged requests can't inject fake order data.
    const event = await stripe.events.retrieve(eventId);

    if (event.type !== "checkout.session.completed") {
      res.status(200).json({ received: true, ignored: event.type });
      return;
    }

    const session = event.data.object;

    const lineItems = await stripe.checkout.sessions.listLineItems(
      session.id,
      { limit: 100, expand: ["data.price.product"] }
    );

    const message = formatOrderEmail(session, lineItems.data);
    const subject =
      "New GRODT order " + dollars(session.amount_total) + " - ship it";

    await sendOrderEmail(subject, message);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err && err.message);
    // Non-200 makes Stripe retry later, so a transient email
    // failure doesn't lose the order notification.
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
