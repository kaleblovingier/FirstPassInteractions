import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS, normalizeSearchText } from "./catalog";
import { COMBINATIONS, findCombination, planCombination } from "./combos";
import { ClinicalDecisionService, resolveDrugQuery } from "../server/api/cds-service";

function hit(query: string) {
  const c = findCombination(query);
  assert.ok(c, `${query} should name a combination`);
  return c;
}

test("every combination lists cataloged rows, a label, and names no other entry or row uses", () => {
  const rowKeys = new Set(DRUGS.flatMap((d) => [normalizeSearchText(d.id), normalizeSearchText(d.name)]));
  const seen = new Map<string, string>();
  for (const c of COMBINATIONS) {
    assert.ok(c.source.length > 10, `${c.names[0]} needs its label title`);
    assert.equal(new Set(c.ids).size, c.ids.length, `${c.names[0]} repeats an ingredient`);
    for (const id of c.ids) assert.ok(DRUG_BY_ID[id], `${c.names[0]}: ${id} is not a catalog row`);
    for (const name of c.names) {
      const key = normalizeSearchText(name);
      assert.ok(!rowKeys.has(key), `${name} is a catalog id or generic name, so it must not be a combination name`);
      assert.equal(seen.get(key) ?? c.names[0], c.names[0], `${name} names two combinations`);
      seen.set(key, c.names[0]);
    }
  }
});

test("combination brands and generic pairs add every ingredient and keep the typed name", () => {
  assert.deepEqual(hit("Percocet").ids, ["oxycodone", "acetaminophen"]);
  assert.deepEqual(hit("oxycodone/APAP").ids, ["oxycodone", "acetaminophen"]);
  assert.equal(hit("Percocet 5/325").name, "Percocet");
  assert.deepEqual(hit("Vicodin").ids, ["hydrocodone", "acetaminophen"]);
  assert.equal(hit("Vicodin").name, "Vicodin");
  assert.deepEqual(hit("Tylenol #3").ids, ["acetaminophen", "codeine"]);
  assert.deepEqual(hit("NyQuil").ids, ["acetaminophen", "dextromethorphan", "doxylamine"]);
  assert.deepEqual(hit("Claritin-D 24 hour").ids, ["loratadine", "pseudoephedrine"]);
  assert.deepEqual(hit("Nuedexta").ids, ["dextromethorphan", "quinidine"]);
  // A product the catalog already keeps as one row resolves to that row, not to a lone ingredient.
  assert.deepEqual(hit("Augmentin").ids, ["amox-clav"]);
  assert.deepEqual(hit("Contrave").ids, ["naltrexone-bupropion"]);
  assert.equal(findCombination("Tylenol"), undefined);
  assert.equal(findCombination("oxycodone"), undefined);
});

test("products with an uncataloged ingredient, or a row of their own, are not split", () => {
  // Fioricet and Fiorinal carry butalbital, which has no row; a partial split would hide the barbiturate.
  assert.equal(DRUG_BY_ID.butalbital, undefined);
  assert.equal(findCombination("Fioricet"), undefined);
  assert.equal(findCombination("Fiorinal"), undefined);
  // Suboxone stays the buprenorphine row: its note says sublingual naloxone is not a second opioid.
  assert.equal(findCombination("Suboxone"), undefined);
  assert.equal(findCombination("Bactrim"), undefined);
  assert.equal(findCombination("Paxlovid"), undefined);
});

test("a combination is added whole or not at all under the desk cap", () => {
  const percocet = hit("Percocet");
  assert.deepEqual(planCombination(percocet, ["warfarin", "sertraline", "metformin"], 5).add, [
    "oxycodone",
    "acetaminophen",
  ]);
  assert.equal(planCombination(percocet, [], 5).message, "Percocet → Oxycodone + Acetaminophen.");

  const full = planCombination(percocet, ["warfarin", "sertraline", "metformin", "lisinopril"], 5);
  assert.deepEqual(full.add, []);
  assert.match(full.message, /^Percocet is 2 items \(Oxycodone \+ Acetaminophen\) and the desk has room for 1\./);
  assert.match(full.message, /nothing was added/);

  // An ingredient already on the desk takes no second slot.
  const half = planCombination(percocet, ["oxycodone", "warfarin", "sertraline", "metformin"], 5);
  assert.deepEqual(half.add, ["acetaminophen"]);
  assert.deepEqual(planCombination(percocet, ["oxycodone", "acetaminophen"], 5).add, []);
  assert.equal(planCombination(hit("NyQuil"), ["a", "b", "c", "d", "e"], 8).add.length, 3);
});

test("the API resolves a combination name to every ingredient and analyzes them all", async () => {
  assert.deepEqual(resolveDrugQuery("Percocet"), {
    query: "Percocet",
    status: "resolved",
    drugId: "oxycodone",
    matchedBy: "combination",
    drugIds: ["oxycodone", "acetaminophen"],
    source: "PERCOCET (OXYCODONE HYDROCHLORIDE AND ACETAMINOPHEN) TABLET",
  });
  const augmentin = resolveDrugQuery("Augmentin");
  assert.ok(augmentin.status === "resolved" && augmentin.drugId === "amox-clav");
  // A catalog id or generic name still reads as itself.
  const amoxClav = resolveDrugQuery("amoxicillin clavulanate");
  assert.ok(amoxClav.status === "resolved" && amoxClav.matchedBy === "name");

  ClinicalDecisionService.clearCaches();
  const res = await ClinicalDecisionService.checkInteractions({ drugs: ["Norco", "warfarin"] });
  assert.ok(res.success);
  assert.deepEqual(res.data.query.resolvedDrugs.map((d) => d.id).sort(), ["acetaminophen", "hydrocodone", "warfarin"]);
  assert.deepEqual(res.data.query.unresolvedDrugs, []);
});
