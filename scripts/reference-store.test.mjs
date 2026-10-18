// Run with node --test scripts/reference-store.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  filterProducts,
  restoreCart,
  cartTotals,
  bundlePrice,
} from "../static/store/assets/model.mjs";
const catalog = JSON.parse(
  fs.readFileSync(
    new URL("../static/store/assets/catalog.json", import.meta.url),
  ),
);
const products = catalog.products;
test("Reference inventory has all 125 entries and replacement slots", () => {
  assert.equal(products.length, 125);
  assert.equal(new Set(products.map((p) => p.replacementKey)).size, 125);
  assert.ok(
    products.every(
      (p) => p.referenceOnly && p.images.length && p.variants.length,
    ),
  );
  assert.equal(
    products.reduce((s, p) => s + p.images.length, 0),
    605,
  );
});
test("Core collection feeds preserve researched category counts", () => {
  for (const [collection, count] of Object.entries({
    pendants: 54,
    chains: 14,
    bracelets: 20,
    rings: 9,
    sets: 18,
    "custom-dogtag": 10,
  })) {
    assert.equal(filterProducts(products, { collection }).length, count);
  }
});
test("Filters combine search, finish and price, with numeric sort", () => {
  const result = filterProducts(products, {
    query: "ring",
    color: "gold",
    sort: "low",
    max: 80,
  });
  assert.ok(result.length);
  assert.ok(
    result.every(
      (p) =>
        p.color === "gold" &&
        p.title.toLowerCase().includes("ring") &&
        p.variants[0].price <= 80,
    ),
  );
  assert.ok(
    result.every(
      (p, i) => !i || p.variants[0].price >= result[i - 1].variants[0].price,
    ),
  );
  assert.equal(
    filterProducts(products, { query: "neverexistent abcxyz" }).length,
    0,
  );
});
test("Cart ignores malformed, removed and unavailable variants", () => {
  assert.deepEqual(restoreCart("not-json", products), []);
  assert.deepEqual(restoreCart("{}", products), []);
  assert.deepEqual(
    restoreCart('[{"handle":"missing","quantity":1}]', products),
    [],
  );
  const p = products[0],
    v = p.variants[0];
  const raw = JSON.stringify([
    { handle: p.handle, variant: v.id, quantity: 2 },
    { handle: p.handle, variant: v.id, quantity: -1 },
  ]);
  const cart = restoreCart(raw, products);
  assert.equal(cart.length, 1);
  assert.equal(cartTotals(cart, products).subtotal, v.price * 2);
});
test("Offer calculator only returns complete available selections", () => {
  assert.equal(bundlePrice([], 2), null);
  assert.equal(
    bundlePrice(
      [{ variant: { available: true } }, { variant: { available: true } }],
      2,
    ),
    99,
  );
  assert.equal(
    bundlePrice(
      [{ variant: { available: true } }, { variant: { available: false } }],
      2,
    ),
    null,
  );
  assert.equal(
    bundlePrice(
      [{ variant: { available: true } }, { variant: { available: true } }],
      3,
    ),
    null,
  );
});
test("Complete bundles receive a preview discount, changed bundles do not", () => {
  const p = products
    .filter((p) => p.type === "pendants" && p.variants[0].available)
    .slice(0, 2);
  const lines = p.map((p) => ({
    handle: p.handle,
    variant: p.variants[0].id,
    quantity: 1,
    bundle: "test-set",
    bundleSize: 2,
  }));
  const result = cartTotals(lines, products);
  assert.equal(result.subtotal, 99);
  assert.equal(
    cartTotals(restoreCart(JSON.stringify(lines), products), products).subtotal,
    99,
  );
  assert.equal(cartTotals(lines.slice(0, 1), products).discount, 0);
  lines[0].quantity = 2;
  assert.equal(cartTotals(lines, products).discount, 0);
});
