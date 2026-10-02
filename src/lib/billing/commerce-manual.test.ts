import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/** Assert buyer-facing manual-pay copy without importing Vite-bound commerce.ts. */
const src = await readFile(new URL("./commerce.ts", import.meta.url), "utf8");

test("manual unlock is three clear buyer steps in commerce source", () => {
  assert.match(src, /MANUAL_UNLOCK_STEPS/);
  assert.match(src, /Pay \$79 once/);
  assert.match(src, /Get your key/);
  assert.match(src, /Redeem on this desk/);
  assert.match(src, /n: "1"/);
  assert.match(src, /n: "2"/);
  assert.match(src, /n: "3"/);
});

test("founding unlock note stays soft and non-clinical", () => {
  const start = src.indexOf("FOUNDING_UNLOCKS");
  assert.ok(start >= 0);
  const snippet = src.slice(start, start + 400);
  assert.match(snippet, /host factors/i);
  assert.match(snippet, /enzyme atlas/i);
  assert.match(snippet, /\$79 once/);
  assert.match(snippet, /not FDA-cleared/i);
  assert.doesNotMatch(snippet, /diagnos|treat|cure/i);
});

test("payClose names rails, redeem, and three-step path", () => {
  assert.match(src, /pay → get key → redeem/i);
  assert.match(src, /Venmo/);
  assert.match(src, /Cash App/);
  assert.match(src, /PayPal/);
  assert.match(src, /Plans → Redeem/);
});

test("PAY_RAILS still lists three written rails", () => {
  assert.match(src, /id: "venmo"/);
  assert.match(src, /id: "cashapp"/);
  assert.match(src, /id: "paypal"/);
});
