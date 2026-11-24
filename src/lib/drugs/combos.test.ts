import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUG_BY_ID, DRUGS, normalizeSearchText } from "./catalog";
import { COMBINATIONS, findCombination, planCombination } from "./combos";
import { ClinicalDecisionService, resolveDrugQuery } from "../server/api/cds-service";
import { findDoses } from "../guards/dose-rule";

function hit(query: string) {
  const c = findCombination(query);
  assert.ok(c, `${query} should name a combination`);
  return c;
}

test("every combination lists cataloged rows, a label, and names no other entry or row uses", () => {
  assert.ok(COMBINATIONS.length >= 60, `expected 60+ combinations, got ${COMBINATIONS.length}`);
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
  assert.deepEqual(findDoses(readFileSync("src/lib/drugs/combos.ts", "utf8")), []);
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

test("expanded combination formulary resolves multi-ingredient brands, slash generics, and single-row products", async () => {
  const multiIngredientCases: Array<[string, string[]]> = [
    ["Avalide", ["irbesartan", "hctz"]],
    ["irbesartan/HCTZ", ["irbesartan", "hctz"]],
    ["Vaseretic", ["enalapril", "hctz"]],
    ["enalapril/HCTZ", ["enalapril", "hctz"]],
    ["Atacand HCT", ["candesartan", "hctz"]],
    ["Micardis HCT", ["telmisartan", "hctz"]],
    ["Accuretic", ["quinapril", "hctz"]],
    ["Capozide", ["captopril", "hctz"]],
    ["Tarka", ["trandolapril", "verapamil"]],
    ["Twynsta", ["telmisartan", "amlodipine"]],
    ["Moduretic", ["amiloride", "hctz"]],
    ["BiDil", ["hydralazine", "isosorbide-dinitrate"]],
    ["Edarbyclor", ["azilsartan", "chlorthalidone"]],
    ["Tekturna HCT", ["aliskiren", "hctz"]],
    ["Metaglip", ["glipizide", "metformin"]],
    ["Duetact", ["pioglitazone", "glimepiride"]],
    ["Segluromet", ["ertugliflozin", "metformin"]],
    ["Steglujan", ["ertugliflozin", "sitagliptin"]],
    ["Qtern", ["dapagliflozin", "saxagliptin"]],
    ["Trijardy XR", ["empagliflozin", "linagliptin", "metformin"]],
    ["empagliflozin/linagliptin/metformin", ["empagliflozin", "linagliptin", "metformin"]],
    ["Xultophy", ["insulin-degludec", "liraglutide"]],
    ["Soliqua", ["insulin-glargine", "lixisenatide"]],
    ["Airsupra", ["albuterol", "budesonide"]],
    ["albuterol/budesonide", ["albuterol", "budesonide"]],
    ["Stiolto Respimat", ["tiotropium", "olodaterol"]],
    ["Bevespi Aerosphere", ["glycopyrrolate", "formoterol"]],
    ["Namzaric", ["memantine", "donepezil"]],
    ["memantine/donepezil", ["memantine", "donepezil"]],
    ["Duexis", ["ibuprofen", "famotidine"]],
    ["Percodan", ["oxycodone", "aspirin"]],
    ["EMLA", ["lidocaine", "prilocaine"]],
    ["Mucinex D", ["guaifenesin", "pseudoephedrine"]],
    ["Clarinex-D", ["desloratadine", "pseudoephedrine"]],
    ["Symfi Lo", ["efavirenz", "lamivudine", "tenofovir-df"]],
    ["Combivir", ["zidovudine", "lamivudine"]],
    ["Epzicom", ["abacavir", "lamivudine"]],
    ["Trizivir", ["abacavir", "lamivudine", "zidovudine"]],
    ["Talicia", ["omeprazole", "amoxicillin", "rifabutin"]],
    ["Omeclamox-Pak", ["omeprazole", "amoxicillin", "clarithromycin"]],
    ["Prevpac", ["lansoprazole", "amoxicillin", "clarithromycin"]],
    ["Voquezna Dual Pak", ["vonoprazan", "amoxicillin"]],
    ["Voquezna Triple Pak", ["vonoprazan", "amoxicillin", "clarithromycin"]],
    ["Prempro", ["conjugated-estrogens", "medroxyprogesterone"]],
    ["Stalevo", ["carbidopa-levodopa", "entacapone"]],
  ];

  for (const [query, expectedIds] of multiIngredientCases) {
    assert.deepEqual(hit(query).ids, expectedIds, query);
    const resolved = resolveDrugQuery(query);
    assert.equal(resolved.status, "resolved", query);
    if (resolved.status === "resolved") {
      assert.equal(resolved.matchedBy, "combination", query);
      assert.deepEqual(resolved.drugIds, expectedIds, query);
    }
  }

  const singleRowCases: Array<[string, string]> = [
    ["Hyzaar", "losartan-hctz"],
    ["Diovan HCT", "valsartan-hctz"],
    ["Zestoretic", "lisinopril-hctz"],
    ["Prinivil HCT", "lisinopril-hctz"],
    ["Aldactazide", "spironolactone-hctz"],
    ["Azor", "olmesartan-amlodipine"],
    ["Caduet", "atorvastatin-amlodipine"],
    ["amlodipine/atorvastatin", "atorvastatin-amlodipine"],
    ["Vytorin", "simvastatin-ezetimibe"],
    ["ezetimibe/simvastatin", "simvastatin-ezetimibe"],
    ["Dyazide", "hydrochlorothiazide-triamterene"],
    ["Maxzide", "hydrochlorothiazide-triamterene"],
    ["triamterene/HCTZ", "hydrochlorothiazide-triamterene"],
    ["Synjardy", "empagliflozin-metformin"],
    ["Synjardy XR", "empagliflozin-metformin"],
    ["Xigduo XR", "dapagliflozin-metformin"],
    ["Glyxambi", "empagliflozin-linagliptin"],
    ["Janumet", "sitagliptin-metformin"],
    ["Janumet XR", "sitagliptin-metformin"],
    ["Sinemet", "carbidopa-levodopa"],
    ["Rytary", "carbidopa-levodopa"],
    ["Qsymia", "phentermine-topiramate"],
    ["Malarone", "atovaquone-proguanil"],
  ];

  for (const [query, expectedId] of singleRowCases) {
    assert.deepEqual(hit(query).ids, [expectedId], query);
    const resolved = resolveDrugQuery(query);
    assert.equal(resolved.status, "resolved", query);
    if (resolved.status === "resolved") {
      assert.equal(resolved.drugId, expectedId, query);
      assert.deepEqual(resolved.drugIds, [expectedId], query);
    }
  }

  ClinicalDecisionService.clearCaches();
  const comboCheck = await ClinicalDecisionService.checkInteractions({ drugs: ["Omeclamox-Pak", "simvastatin"] });
  assert.ok(comboCheck.success);
  assert.deepEqual(
    comboCheck.data.query.resolvedDrugs.map((d) => d.id).sort(),
    ["amoxicillin", "clarithromycin", "omeprazole", "simvastatin"],
  );
  assert.ok(comboCheck.data.summary.totalFindings > 0, "clarithromycin in Omeclamox-Pak should collide with simvastatin");
});

test("Round 13 OTC and clinical Rx multi-ingredient brand combinations expand to cataloged rows", async () => {
  assert.ok(COMBINATIONS.length >= 120, `expected 120+ combinations, got ${COMBINATIONS.length}`);

  const r13Cases: Array<[string, string[]]> = [
    ["Advil Cold & Sinus", ["ibuprofen", "pseudoephedrine"]],
    ["Advil Dual Action", ["ibuprofen", "acetaminophen"]],
    ["Combogesic", ["ibuprofen", "acetaminophen"]],
    ["Excedrin Tension Headache", ["acetaminophen", "caffeine"]],
    ["BC Powder", ["aspirin", "caffeine"]],
    ["Anacin", ["aspirin", "caffeine"]],
    ["Excedrin Back & Body", ["acetaminophen", "aspirin"]],
    ["Theraflu Severe Cold", ["acetaminophen", "dextromethorphan", "phenylephrine"]],
    ["DayQuil Severe", ["acetaminophen", "dextromethorphan", "guaifenesin", "phenylephrine"]],
    ["Mucinex Fast-Max", ["acetaminophen", "dextromethorphan", "guaifenesin", "phenylephrine"]],
    ["NyQuil Severe", ["acetaminophen", "dextromethorphan", "doxylamine", "phenylephrine"]],
    ["Coricidin HBP Cough & Cold", ["chlorpheniramine", "dextromethorphan"]],
    ["Alka-Seltzer Plus Cold", ["aspirin", "chlorpheniramine", "phenylephrine"]],
    ["Sudafed PE Pressure + Pain", ["acetaminophen", "phenylephrine"]],
    ["Tylenol Sinus + Headache", ["acetaminophen", "phenylephrine"]],
    ["Advil Sinus Congestion & Pain", ["ibuprofen", "phenylephrine"]],
    ["Benadryl Allergy Plus Congestion", ["diphenhydramine", "phenylephrine"]],
    ["Imodium Multi-Symptom Relief", ["loperamide", "simethicone"]],
    ["Robitussin CF", ["dextromethorphan", "guaifenesin", "phenylephrine"]],
    ["Mucinex Sinus-Max", ["acetaminophen", "guaifenesin", "phenylephrine"]],
    ["Diclegis", ["doxylamine", "pyridoxine"]],
    ["Bonjesta", ["doxylamine", "pyridoxine"]],
    ["Nexlizet", ["bempedoic-acid", "ezetimibe"]],
    ["Rifamate", ["isoniazid", "rifampin"]],
    ["Promethazine DM", ["promethazine", "dextromethorphan"]],
    ["Promethazine with Codeine", ["promethazine", "codeine"]],
    ["Cheratussin AC", ["guaifenesin", "codeine"]],
    ["Seglentis", ["celecoxib", "tramadol"]],
    ["Symbravo", ["meloxicam", "rizatriptan"]],
    ["Kazano", ["alogliptin", "metformin"]],
    ["Oseni", ["alogliptin", "pioglitazone"]],
    ["Byvalson", ["nebivolol", "valsartan"]],
    ["Prestalia", ["perindopril", "amlodipine"]],
  ];

  for (const [query, expectedIds] of r13Cases) {
    assert.deepEqual(hit(query).ids, expectedIds, query);
    for (const id of expectedIds) {
      assert.ok(DRUG_BY_ID[id], `${query}: ${id} must exist in DRUG_BY_ID`);
    }
    const resolved = resolveDrugQuery(query);
    assert.equal(resolved.status, "resolved", query);
    if (resolved.status === "resolved") {
      assert.equal(resolved.matchedBy, "combination", query);
      assert.deepEqual(resolved.drugIds, expectedIds, query);
    }
  }

  ClinicalDecisionService.clearCaches();
  const otcSerotoninCheck = await ClinicalDecisionService.checkInteractions({
    drugs: ["Coricidin HBP Cough & Cold", "phenelzine"],
  });
  assert.ok(otcSerotoninCheck.success);
  assert.deepEqual(
    otcSerotoninCheck.data.query.resolvedDrugs.map((d) => d.id).sort(),
    ["chlorpheniramine", "dextromethorphan", "phenelzine"],
  );
  assert.ok(
    otcSerotoninCheck.data.summary.totalFindings > 0,
    "dextromethorphan in Coricidin HBP should trigger MAOI serotonin collision with phenelzine",
  );
});
