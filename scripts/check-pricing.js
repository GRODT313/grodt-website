#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  priceItems,
  FIRST50_LIMIT,
  APPAREL_TAX_CODE,
} = require("../lib/pricing");

function run() {
  const set = priceItems(
    [
      { id: "oversized-tee", size: "L", qty: 1 },
      { id: "shorts", size: "M", qty: 1 },
    ],
    50
  );
  assert.strictEqual(set.setsApplied, 1);
  assert.strictEqual(set.subtotal, 10000);
  assert.strictEqual(set.savings, 2500);

  // Every line item must carry the apparel tax code for Stripe Tax
  for (const li of set.lineItems) {
    assert.strictEqual(li.price_data.tax_behavior, "exclusive");
    assert.strictEqual(li.price_data.product_data.tax_code, APPAREL_TAX_CODE);
  }

  const cutoff = priceItems(
    [
      { id: "oversized-cutoff-tee", size: "XL", qty: 1 },
      { id: "shorts", size: "L", qty: 1 },
    ],
    50
  );
  assert.strictEqual(cutoff.setsApplied, 1);
  assert.strictEqual(cutoff.subtotal, 10000);

  const hoodie = priceItems(
    [
      { id: "cutoff-hoodie", size: "L", qty: 1 },
      { id: "shorts", size: "M", qty: 1 },
    ],
    50
  );
  assert.strictEqual(hoodie.setsApplied, 0);
  assert.strictEqual(hoodie.subtotal, 7500 + 6500);

  const mixed = priceItems(
    [
      { id: "oversized-tee", size: "L", qty: 1 },
      { id: "shorts", size: "M", qty: 1 },
      { id: "cutoff-hoodie", size: "XL", qty: 1 },
    ],
    50
  );
  assert.strictEqual(mixed.setsApplied, 1);
  assert.strictEqual(mixed.subtotal, 10000 + 7500);

  const exhausted = priceItems(
    [
      { id: "oversized-tee", size: "L", qty: 1 },
      { id: "shorts", size: "M", qty: 1 },
    ],
    0
  );
  assert.strictEqual(exhausted.setsApplied, 0);
  assert.strictEqual(exhausted.subtotal, 6000 + 6500);

  const bad = priceItems([{ id: "nope", size: "L", qty: 1 }], 50);
  assert.ok(bad.error);

  assert.strictEqual(FIRST50_LIMIT, 50);

  console.log("Pricing checks passed.");
}

run();
