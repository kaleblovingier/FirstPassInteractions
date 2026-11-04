import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUGS, searchDrugs } from "./catalog";
import { COMBINATIONS, findCombination } from "./combos";
import { editDistance, suggestSpellings } from "./spelling";

const target = (q: string) => suggestSpellings(q).map((s) => s.drug?.id ?? s.combo?.ids.join("+"));

test("edit distance counts an adjacent swap as one edit and stops past the cap", () => {
  assert.equal(editDistance("flouxetine", "fluoxetine"), 1);
  assert.equal(editDistance("ibuprophen", "ibuprofen"), 2);
  assert.equal(editDistance("metropolol", "metoprolol"), 2);
  assert.equal(editDistance("", "abc"), 3);
  assert.equal(editDistance("zzqxnotadrug", "amoxicillin", 2), 3);
});

test("look-alike names come back together, closest first, each with its own class", () => {
  const s = suggestSpellings("hydroxazine");
  assert.deepEqual(target("hydroxazine"), ["hydroxyzine", "hydralazine"]);
  assert.notEqual(s[0].drug?.cls, s[1].drug?.cls);
  assert.ok(suggestSpellings("amoxacillin 500 mg").length <= 3);
  assert.equal(target("metropolol succinate 50 mg")[0], "metoprolol");
});

test("a misspelled combination name suggests the combination, not one ingredient", () => {
  assert.equal(target("Percoset")[0], "oxycodone+acetaminophen");
  assert.equal(suggestSpellings("Percoset")[0].combo?.name, "Percocet");
});

test("an exact catalog or combination name gets no suggestions and always finds a row", () => {
  for (const q of ["amoxicillin", "Xanax", "Percocet", "metoprolol succinate"]) assert.deepEqual(suggestSpellings(q), [], q);
  // The no-match panel is the only place suggestions show, so it must never open for a real name.
  const labels = [...DRUGS.flatMap((d) => [d.name, ...d.brands, ...d.aliases]), ...COMBINATIONS.flatMap((c) => c.names)];
  const unfound = labels.filter((l) => !findCombination(l) && searchDrugs(l).length === 0);
  assert.deepEqual(unfound, []);
});

test("nonsense and short queries get nothing", () => {
  assert.deepEqual(suggestSpellings("zzqxnotadrug"), []);
  assert.deepEqual(suggestSpellings("xyz"), []);
});

test("the desk keeps suggestions out of the listbox and out of the Enter key", () => {
  const s = readFileSync("src/components/desk/search.tsx", "utf8");
  const enter = s.slice(s.indexOf('e.key === "Enter"'), s.indexOf('e.key === "Escape"'));
  assert.ok(enter.length > 0);
  assert.doesNotMatch(enter, /suggest/i);
  const panel = s.slice(s.indexOf("{suggestions.length ? ("), s.indexOf("Browse the full library"));
  assert.match(panel, /<button\s+type="button"/);
  assert.doesNotMatch(panel, /role="option"|role="listbox"/);
});
