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
  assert.match(src, /pay, get your key, redeem/i);
  assert.match(src, /Venmo/);
  assert.match(src, /Cash App/);
  assert.match(src, /PayPal/);
  assert.match(src, /Redeem on the Plans page/);
  assert.doesNotMatch(src, /→/);
});

test("PAY_RAILS still lists three written rails", () => {
  assert.match(src, /id: "venmo"/);
  assert.match(src, /id: "cashapp"/);
  assert.match(src, /id: "paypal"/);
});

test("plans FAQ answers subscription, card, lost key, and medical advice", () => {
  const start = src.indexOf("PLANS_FAQ");
  assert.ok(start >= 0);
  const faq = src.slice(start, src.indexOf("] as const;", start));
  assert.match(faq, /Is it a subscription\?/);
  assert.match(faq, /No\. Founding is \$79 once/);
  assert.match(faq, /need a card/i);
  assert.match(faq, /lost my key/i);
  // Lost-key answer reuses existing operator contact — no new handles.
  assert.match(faq, /\$\{OPERATOR\.email\}/);
  assert.match(faq, /\$\{OPERATOR\.phone\}/);
  assert.match(faq, /medical advice/i);
  assert.match(faq, /not FDA-cleared/i);
  assert.match(faq, /Prescribing Information governs/);
  assert.match(faq, /not proof a combination is safe/i);
  assert.doesNotMatch(faq, /diagnos|treat|cure/i);
});

test("who-it's-for line names the three buyer groups", () => {
  const m = src.match(/WHO_FOR = "([^"]+)"/);
  assert.ok(m);
  assert.match(m[1], /ketamine clinics/i);
  assert.match(m[1], /MAT and harm-reduction/i);
  assert.match(m[1], /pharmacy students/i);
});

test("pitch no longer repeats a second free-tier line", () => {
  const start = src.indexOf("pitch:");
  const line = src.slice(start, src.indexOf("\n", start));
  assert.doesNotMatch(line, /free|five/i);
});
