import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import { storedNamePlain, storedNames } from "./name-card";

test("stored name card restates kind, watch, and note without inventing a dose", () => {
  const names = storedNames(["warfarin", "clarithromycin", "nope", "warfarin"]);
  assert.deepEqual(
    names.map((row) => row.id),
    ["warfarin", "clarithromycin"],
  );
  assert.equal(names[0]?.kindLabel, "Medicine");
  assert.equal(names[0]?.cls, "Vitamin K antagonist");
  assert.equal(names[0]?.watch, "Bleeding / high INR");
  assert.match(names[0]?.note ?? "", /sensitive CYP2C9 substrate/);
  assert.equal(names[1]?.note, "");

  const plain = storedNamePlain(["warfarin", "clarithromycin", "nope"]);
  assert.match(plain, /Warfarin\. Medicine\. Vitamin K antagonist\./);
  assert.match(plain, /Watch: Bleeding \/ high INR/);
  assert.match(plain, /Note: S-warfarin/);
  assert.match(plain, /Clarithromycin\. Medicine\. Macrolide antibiotic\./);
  assert.match(plain, /Watch: QT prolongation, CYP3A4 perpetrator toxicity/);
  assert.equal(plain.split("Note:").length, 2);
  assert.equal(plain.includes("nope"), false);
  assert.equal(/\b\d+\s*mg\b/i.test(plain), false);
  assert.match(plain, /Not a diagnosis and not a milligram/);
});

test("a food keeps its stored kind label", () => {
  const row = storedNames(["grapefruit"])[0];
  assert.ok(row);
  assert.equal(row.kind, "food");
  assert.equal(row.kindLabel, "Food");
  assert.equal(row.name, DRUG_BY_ID.grapefruit.name);
  assert.match(storedNamePlain(["grapefruit"]), /Food\./);
  assert.equal(storedNames(["missing-name"]).length, 0);
});
