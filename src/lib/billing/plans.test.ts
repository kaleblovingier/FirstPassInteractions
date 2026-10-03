import test from "node:test";
import assert from "node:assert/strict";
import { maxDrugs, priceFor } from "./plans.ts";

test("free desk allows up to five drugs", () => {
  assert.equal(maxDrugs("free"), 5);
});

test("pro desk still allows eight drugs", () => {
  assert.equal(maxDrugs("pro"), 8);
});

test("founding lifetime is $79 once for pro and lab", () => {
  assert.equal(priceFor("pro", "life"), 79);
  assert.equal(priceFor("lab", "life"), 79);
});

test("plans page sells exactly Free and Founding", async () => {
  const { PLAN_BY_ID, PLAN_TIERS } = await import("./plans.ts");
  assert.deepEqual([...PLAN_TIERS], ["free", "lab"]);
  assert.equal(PLAN_BY_ID.free.name, "Free");
  assert.equal(PLAN_BY_ID.lab.name, "Founding");
  assert.match(PLAN_BY_ID.free.tagline, /five drugs/i);
  assert.match(PLAN_BY_ID.free.tagline, /no card/i);
  assert.match(PLAN_BY_ID.lab.tagline, /\$79 once/);
});

test("founding card lists the canon unlocks and no leftover naming", async () => {
  const { PLAN_BY_ID } = await import("./plans.ts");
  const text = PLAN_BY_ID.lab.features.join(" | ");
  for (const re of [/host factors/i, /enzyme atlas/i, /metabolite maps/i, /full .*report/i, /JSON \+ CSV export/i]) {
    assert.match(text, re);
  }
  assert.match(text, /no subscription/i);
  const free = PLAN_BY_ID.free.features.join(" | ");
  assert.match(free, /liver enzymes/i);
  assert.match(free, /Drug identity cards \(DrugBank\)/);
  assert.doesNotMatch(free, /occupancy heatmap/i);
  for (const p of Object.values(PLAN_BY_ID)) {
    assert.doesNotMatch(`${p.tagline} ${p.features.join(" ")}`, /\boften\b|founding \/ lab|Everything in Pro/i);
  }
});
