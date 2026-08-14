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

const TEE_IDS = new Set(["oversized-tee", "oversized-cutoff-tee"]);
const SET_PRICE_CENTS = 10000;
const FIRST50_LIMIT = 50;
const SIZES = new Set(["S", "M", "L", "XL", "2XL"]);

// Stripe product tax codes (https://docs.stripe.com/tax/tax-codes)
const APPAREL_TAX_CODE = "txcd_30011000"; // Clothing & Footwear
const SHIPPING_TAX_CODE = "txcd_92010001"; // Shipping

/**
 * Price a cart with the First 50 deal:
 * one sleeved or sleeveless tee + shorts = $100.
 * Hoodies are never part of the deal.
 */
function priceItems(rawItems, setsAvailable) {
  const available = Math.max(0, Number(setsAvailable) || 0);
  const units = [];

  for (const item of rawItems) {
    const product = PRODUCTS[item.id];
    if (!product) {
      return { error: "Unknown product in cart." };
    }

    const size = String(item.size || "").toUpperCase();
    if (!SIZES.has(size)) {
      return { error: "Pick a valid size for every item." };
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return { error: "Invalid quantity." };
    }

    for (let i = 0; i < qty; i += 1) {
      units.push({
        id: item.id,
        size: size,
        name: product.name,
        price: product.price,
      });
    }
  }

  const tees = units.filter(function (unit) {
    return TEE_IDS.has(unit.id);
  });
  const shorts = units.filter(function (unit) {
    return unit.id === "shorts";
  });
  const others = units.filter(function (unit) {
    return !TEE_IDS.has(unit.id) && unit.id !== "shorts";
  });

  const setsApplied = Math.min(tees.length, shorts.length, available);
  const lineItems = [];
  let subtotal = 0;

  for (let i = 0; i < setsApplied; i += 1) {
    const tee = tees[i];
    const short = shorts[i];
    const label =
      "First 50 Set: " +
      tee.name +
      " (" +
      tee.size +
      ") + Shorts (" +
      short.size +
      ")";

    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: SET_PRICE_CENTS,
        tax_behavior: "exclusive",
        product_data: {
          name: label,
          tax_code: APPAREL_TAX_CODE,
          metadata: {
            deal: "first50",
            tee_id: tee.id,
            tee_size: tee.size,
            shorts_size: short.size,
          },
        },
      },
    });
    subtotal += SET_PRICE_CENTS;
  }

  function addFullPrice(unit) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: unit.price,
        tax_behavior: "exclusive",
        product_data: {
          name: unit.name + " - Size " + unit.size,
          tax_code: APPAREL_TAX_CODE,
          metadata: {
            product_id: unit.id,
            size: unit.size,
          },
        },
      },
    });
    subtotal += unit.price;
  }

  tees.slice(setsApplied).forEach(addFullPrice);
  shorts.slice(setsApplied).forEach(addFullPrice);
  others.forEach(addFullPrice);

  const regularTotal = units.reduce(function (sum, unit) {
    return sum + unit.price;
  }, 0);

  return {
    lineItems: lineItems,
    subtotal: subtotal,
    setsApplied: setsApplied,
    savings: Math.max(0, regularTotal - subtotal),
    regularTotal: regularTotal,
  };
}

// Test checkouts that should not consume First 50 inventory.
const FIRST50_EXCLUDED_SESSIONS = new Set([
  "cs_live_a1jFGcFlnO00IKroPnLJ8R21eqbUlKfZi5BKbp7if6CalhUlwcEyYbAGtX",
]);

async function getFirst50SetsSold(stripe) {
  let sold = 0;
  let startingAfter;

  for (let page = 0; page < 10; page += 1) {
    const params = {
      limit: 100,
      status: "complete",
    };
    if (startingAfter) params.starting_after = startingAfter;

    const list = await stripe.checkout.sessions.list(params);

    for (const session of list.data) {
      if (FIRST50_EXCLUDED_SESSIONS.has(session.id)) continue;
      if (session.metadata && session.metadata.test_order === "true") continue;

      const count = Number(
        (session.metadata && session.metadata.first50_sets) || 0
      );
      if (count > 0) sold += count;
    }

    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1].id;
  }

  return sold;
}

function getFirst50Limit() {
  const fromEnv = Number(process.env.FIRST50_LIMIT);
  if (Number.isInteger(fromEnv) && fromEnv >= 0) return fromEnv;
  return FIRST50_LIMIT;
}

module.exports = {
  PRODUCTS,
  TEE_IDS,
  SET_PRICE_CENTS,
  FIRST50_LIMIT,
  SIZES,
  APPAREL_TAX_CODE,
  SHIPPING_TAX_CODE,
  priceItems,
  getFirst50SetsSold,
  getFirst50Limit,
};
