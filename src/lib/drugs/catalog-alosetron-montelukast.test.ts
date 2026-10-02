import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, familyOf, searchDrugs } from "./catalog";

function row(id: string) {
  const d = DRUG_BY_ID[id];
  assert.ok(d, `${id} is on the shelf`);
  return d;
}

function sens(id: string, enzyme: string) {
  return row(id)
    .enzymes.filter((r) => r.enzyme === enzyme && r.kind === "substrate")
    .map((r) => (r.kind === "substrate" ? r.sensitivity : undefined));
}

test("alosetron is a 5-HT3 antagonist for IBS-D, not a laxative/PAMORA", () => {
  const a = row("alosetron");
  assert.match(a.cls, /^5-HT3 antagonist/);
  assert.match(a.cls, /IBS-D/);
  assert.doesNotMatch(a.cls, /Laxative|PAMORA|secretagogue/);
  assert.equal(a.cls.split(" (")[0], row("granisetron").cls);
  assert.equal(familyOf(a), familyOf(row("granisetron")));
  assert.equal(familyOf(a), "other");
  const hint = a.toxicityHint ?? "";
  assert.match(hint, /ischemic colitis/i);
  assert.match(hint, /constipation/i);
  assert.match(hint, /fluvoxamine/i);
  assert.doesNotMatch(hint, /PAMORA|\d+\s*(mg|mcg)\b/i);
  assert.equal(searchDrugs("Lotronex")[0]?.id, "alosetron");
});

test("alosetron CYP map: CYP1A2 primary, minor 3A4 and 2C9", () => {
  assert.deepEqual(sens("alosetron", "CYP1A2"), ["sensitive"]);
  assert.deepEqual(sens("alosetron", "CYP3A4"), ["minor"]);
  assert.deepEqual(sens("alosetron", "CYP2C9"), ["minor"]);
});

test("montelukast is a moderately sensitive CYP2C8 substrate (catalog 'major')", () => {
  assert.deepEqual(sens("montelukast", "CYP2C8"), ["major"]);
  assert.deepEqual(sens("montelukast", "CYP3A4"), ["minor"]);
});
