import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  FREE_DESK_LINE,
  FOUNDING_PATH_SHORT,
  FOUNDING_PATH_STEPS,
  FOUNDING_PRICE_LINE,
  FOUNDING_UNLOCKS_SOFT,
  foundingGateCopy,
  foundingGateFooter,
} from "./founding-gate.ts";

test("free desk and founding price are explicit", () => {
  assert.match(FREE_DESK_LINE, /up to five drugs/i);
  assert.match(FOUNDING_PRICE_LINE, /\$79 once/);
});

test("three-step path matches pay → key → redeem wording", () => {
  assert.equal(FOUNDING_PATH_SHORT, "Pay → get key → Redeem");
  assert.equal(FOUNDING_PATH_STEPS.length, 3);
  assert.equal(FOUNDING_PATH_STEPS[0].title, "Pay $79 once");
  assert.equal(FOUNDING_PATH_STEPS[1].title, "Get your key");
  assert.equal(FOUNDING_PATH_STEPS[2].title, "Redeem on this desk");
});

test("unlock note stays soft and non-clinical", () => {
  assert.match(FOUNDING_UNLOCKS_SOFT, /host factors/i);
  assert.match(FOUNDING_UNLOCKS_SOFT, /enzyme atlas/i);
  assert.match(FOUNDING_UNLOCKS_SOFT, /metabolite/i);
  assert.match(FOUNDING_UNLOCKS_SOFT, /export/i);
  assert.match(FOUNDING_UNLOCKS_SOFT, /not FDA-cleared/i);
  assert.doesNotMatch(FOUNDING_UNLOCKS_SOFT, /diagnos|treat|cure/i);
});

test("gate copy covers locked founding surfaces", () => {
  for (const kind of ["host", "atlas", "metabolites", "stacks", "export", "report"] as const) {
    const copy = foundingGateCopy(kind);
    assert.ok(copy.title.length > 0);
    assert.ok(copy.blurb.length > 0);
    assert.match(copy.reason, /\$79 once/);
    assert.match(copy.reason, /Pay → get key → Redeem/);
    assert.match(copy.reason, /five drugs/i);
    assert.doesNotMatch(copy.blurb, /diagnos|prescribe a dose|stop the drug/i);
  }
});

test("footer combines free, price, path, and soft unlocks", () => {
  const footer = foundingGateFooter();
  assert.match(footer, /five drugs/i);
  assert.match(footer, /\$79 once/);
  assert.match(footer, /Pay → get key → Redeem/);
  assert.match(footer, /not FDA-cleared/i);
});

test("step titles stay aligned with commerce MANUAL_UNLOCK_STEPS", async () => {
  const src = await readFile(new URL("./commerce.ts", import.meta.url), "utf8");
  for (const step of FOUNDING_PATH_STEPS) {
    assert.match(src, new RegExp(`title: "${step.title.replace(/\$/g, "\\$")}"`));
  }
  assert.match(src, /Pay → get key → Redeem|pay → get key → redeem/i);
  assert.match(src, /not FDA-cleared/i);
});
