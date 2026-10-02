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
