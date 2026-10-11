import test from "node:test";
import assert from "node:assert/strict";
import { DRUGS } from "./catalog.ts";
import {
  CONTRAINDICATED_CONDITIONS,
  CONDITION_CATEGORIES,
  NON_PRESCRIPTIVE_CDS_POSTURE,
  filterContraindicatedConditions,
  findConditionById,
  getConditionById,
  findContraindicatedConditionsForDrugs,
  getConditionsForDrug,
  getContraindicatedPairsForDesk,
  isDrugContraindicatedInCondition,
  getAllContraindicatedDrugIds,
  type ConditionCategory,
} from "./contraindicated-conditions.ts";

test("contraindicated conditions catalog contains exactly 12 major clinical conditions", () => {
  assert.ok(
    CONTRAINDICATED_CONDITIONS.length >= 12,
    `Expected at least 12 conditions, got ${CONTRAINDICATED_CONDITIONS.length}`,
  );
  assert.equal(CONTRAINDICATED_CONDITIONS.length, 12);
});

test("all condition IDs are unique and well-formatted", () => {
  const ids = CONTRAINDICATED_CONDITIONS.map((c) => c.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, "Condition IDs must all be unique");
  for (const id of ids) {
    assert.match(id, /^[a-z0-9-]+$/, `Condition ID "${id}" must be kebab-case`);
  }
});

test("all conditions belong to a recognized category", () => {
  const validCategories = new Set(CONDITION_CATEGORIES.filter((c) => c !== "All"));
  for (const cond of CONTRAINDICATED_CONDITIONS) {
    assert.ok(
      validCategories.has(cond.category as ConditionCategory),
      `Condition "${cond.id}" has invalid category "${cond.category}"`,
    );
  }
});

test("each condition includes required descriptive fields and thresholds", () => {
  for (const cond of CONTRAINDICATED_CONDITIONS) {
    assert.ok(cond.name.length > 5, `${cond.id} must have a descriptive name`);
    assert.ok(cond.shortName.length > 3, `${cond.id} must have a shortName`);
    assert.ok(cond.clinicalThreshold.length > 10, `${cond.id} must have a clinicalThreshold`);
    assert.ok(cond.pathophysiology.length > 20, `${cond.id} must have detailed pathophysiology`);
    assert.ok(cond.organSystem.length > 3, `${cond.id} must have organSystem`);
    assert.ok(cond.educationalRationale.length > 15, `${cond.id} must have educationalRationale`);
    assert.ok(cond.clinicalSummary.length > 15, `${cond.id} must have clinicalSummary`);
    assert.ok(cond.contraindicatedDrugs.length > 0, `${cond.id} must have contraindicatedDrugs`);
    assert.ok(cond.contraindicatedPairs.length > 0, `${cond.id} must have contraindicatedPairs`);
  }
});

test("all referenced drug IDs exist in the FirstPass DRUGS catalog", () => {
  const catalogDrugIds = new Set(DRUGS.map((d) => d.id));
  const missingDrugs: string[] = [];

  for (const cond of CONTRAINDICATED_CONDITIONS) {
    for (const drug of cond.contraindicatedDrugs) {
      if (!catalogDrugIds.has(drug.drugId)) {
        missingDrugs.push(`[${cond.id}] single drug: ${drug.drugId} (${drug.drugName})`);
      }
    }
    for (const pair of cond.contraindicatedPairs) {
      if (!catalogDrugIds.has(pair.drug1Id)) {
        missingDrugs.push(`[${cond.id}] pair drug1: ${pair.drug1Id} (${pair.drug1Name})`);
      }
      if (!catalogDrugIds.has(pair.drug2Id)) {
        missingDrugs.push(`[${cond.id}] pair drug2: ${pair.drug2Id} (${pair.drug2Name})`);
      }
      if (pair.drug3Id && !catalogDrugIds.has(pair.drug3Id)) {
        missingDrugs.push(`[${cond.id}] pair drug3: ${pair.drug3Id} (${pair.drug3Name})`);
      }
    }
  }

  assert.deepEqual(
    missingDrugs,
    [],
    `All referenced drugs must exist in catalog. Missing: ${missingDrugs.join(", ")}`,
  );
});

test("verified high-risk clinical conditions cover all required clinical scenarios", () => {
  const conditionMap = new Map(CONTRAINDICATED_CONDITIONS.map((c) => [c.id, c]));

  // 1. Severe Renal Impairment
  const renal = conditionMap.get("severe-renal-impairment");
  assert.ok(renal, "Severe renal impairment must exist");
  assert.match(renal.clinicalThreshold, /CrCl < 30/i);
  const renalDrugIds = renal.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(renalDrugIds.includes("metformin"), "Renal must include metformin");
  assert.ok(renalDrugIds.includes("nitrofurantoin"), "Renal must include nitrofurantoin");
  assert.ok(
    renalDrugIds.includes("empagliflozin") || renalDrugIds.includes("dapagliflozin"),
    "Renal must include SGLT2 inhibitors",
  );
  assert.ok(renalDrugIds.includes("dabigatran"), "Renal must include dabigatran");
  const renalPairs = renal.contraindicatedPairs;
  assert.ok(
    renalPairs.some((p) => p.drug1Id === "spironolactone" && p.drug2Id === "lisinopril"),
    "Renal must include spironolactone + lisinopril hyperkalemia pair",
  );

  // 2. Severe Hepatic Impairment
  const hepatic = conditionMap.get("severe-hepatic-impairment");
  assert.ok(hepatic, "Severe hepatic impairment must exist");
  assert.match(hepatic.clinicalThreshold, /Child-Pugh Class C/i);
  const hepaticDrugIds = hepatic.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(hepaticDrugIds.includes("valproate"), "Hepatic must include valproate");
  assert.ok(hepaticDrugIds.includes("nefazodone"), "Hepatic must include nefazodone");
  assert.ok(hepaticDrugIds.includes("atorvastatin"), "Hepatic must include statin");

  // 3. Pregnancy / Teratogenicity
  const preg = conditionMap.get("pregnancy-teratogenicity");
  assert.ok(preg, "Pregnancy must exist");
  const pregDrugIds = preg.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(pregDrugIds.includes("isotretinoin"), "Pregnancy must include isotretinoin");
  assert.ok(pregDrugIds.includes("methotrexate"), "Pregnancy must include methotrexate");
  assert.ok(pregDrugIds.includes("warfarin"), "Pregnancy must include warfarin");
  assert.ok(pregDrugIds.includes("valproate"), "Pregnancy must include valproate");
  assert.ok(pregDrugIds.includes("lisinopril"), "Pregnancy must include ACEi");
  assert.ok(pregDrugIds.includes("sacubitril-valsartan"), "Pregnancy must include ARNI");

  // 4. Prolonged QTc / LQTS
  const qtc = conditionMap.get("prolonged-qtc");
  assert.ok(qtc, "Prolonged QTc must exist");
  assert.match(qtc.clinicalThreshold, /> 500 ms/i);
  const qtcPairs = qtc.contraindicatedPairs;
  assert.ok(
    qtcPairs.some((p) => p.drug1Id === "ziprasidone" && p.drug2Id === "amiodarone"),
    "QTc must include ziprasidone + amiodarone",
  );
  assert.ok(
    qtcPairs.some((p) => p.drug1Id === "methadone" && p.drug2Id === "ciprofloxacin"),
    "QTc must include methadone + ciprofloxacin",
  );
  assert.ok(
    qtcPairs.some((p) => p.drug1Id === "haloperidol" && p.drug2Id === "ondansetron"),
    "QTc must include haloperidol + ondansetron",
  );

  // 5. Recent MAOI Exposure
  const maoi = conditionMap.get("recent-maoi-exposure");
  assert.ok(maoi, "Recent MAOI exposure must exist");
  assert.match(maoi.clinicalThreshold, /14 days/i);
  const maoiPairs = maoi.contraindicatedPairs;
  assert.ok(
    maoiPairs.some((p) => p.drug1Id === "phenelzine" && p.drug2Id === "fluoxetine"),
    "MAOI must include phenelzine + SSRI",
  );
  assert.ok(
    maoiPairs.some((p) => p.drug1Id === "phenelzine" && p.drug2Id === "tramadol"),
    "MAOI must include phenelzine + tramadol",
  );
  assert.ok(
    maoiPairs.some((p) => p.drug1Id === "phenelzine" && p.drug2Id === "dextromethorphan"),
    "MAOI must include phenelzine + dextromethorphan",
  );

  // 6. Heart Failure (HFrEF)
  const hf = conditionMap.get("heart-failure-hfref");
  assert.ok(hf, "HFrEF must exist");
  const hfDrugIds = hf.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(hfDrugIds.includes("diltiazem"), "HF must include diltiazem");
  assert.ok(hfDrugIds.includes("verapamil"), "HF must include verapamil");
  assert.ok(hfDrugIds.includes("pioglitazone"), "HF must include pioglitazone");
  const hfPairs = hf.contraindicatedPairs;
  assert.ok(
    hfPairs.some((p) => p.drug1Id === "ibuprofen" && p.drug2Id === "lisinopril"),
    "HF must include NSAID + ACEi collision",
  );

  // 7. Narrow-Angle Glaucoma & Urinary Retention
  const glaucoma = conditionMap.get("narrow-angle-glaucoma-urinary-retention");
  assert.ok(glaucoma, "Glaucoma & urinary retention must exist");
  const glaucomaDrugIds = glaucoma.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(glaucomaDrugIds.includes("oxybutynin"), "Glaucoma must include oxybutynin");
  assert.ok(glaucomaDrugIds.includes("amitriptyline"), "Glaucoma must include amitriptyline");
  assert.ok(glaucomaDrugIds.includes("diphenhydramine"), "Glaucoma must include diphenhydramine");
  const glaucomaPairs = glaucoma.contraindicatedPairs;
  assert.ok(
    glaucomaPairs.some((p) => p.drug1Id === "oxybutynin" && p.drug2Id === "amitriptyline"),
    "Glaucoma must include oxybutynin + amitriptyline pair",
  );

  // 8. G6PD Deficiency
  const g6pd = conditionMap.get("g6pd-deficiency");
  assert.ok(g6pd, "G6PD deficiency must exist");
  const g6pdDrugIds = g6pd.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(g6pdDrugIds.includes("rasburicase"), "G6PD must include rasburicase");
  assert.ok(g6pdDrugIds.includes("primaquine"), "G6PD must include primaquine");
  assert.ok(g6pdDrugIds.includes("dapsone"), "G6PD must include dapsone");

  // 9. Parkinson's & Lewy Body
  const pd = conditionMap.get("parkinsons-lewy-body");
  assert.ok(pd, "Parkinson's & Lewy body must exist");
  const pdDrugIds = pd.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(pdDrugIds.includes("metoclopramide"), "PD must include metoclopramide");
  assert.ok(pdDrugIds.includes("prochlorperazine"), "PD must include prochlorperazine");
  assert.ok(pdDrugIds.includes("haloperidol"), "PD must include haloperidol");

  // 10. Myasthenia Gravis
  const mg = conditionMap.get("myasthenia-gravis");
  assert.ok(mg, "Myasthenia gravis condition must exist");
  assert.match(mg.clinicalThreshold, /Myasthenia Gravis/i);
  assert.equal(mg.category, "Neuro & Psych");
  assert.equal(mg.organSystem, "Neuromuscular");
  const mgDrugIds = mg.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(mgDrugIds.includes("ciprofloxacin"), "MG must include ciprofloxacin");
  assert.ok(mgDrugIds.includes("levofloxacin"), "MG must include levofloxacin");
  assert.ok(mgDrugIds.includes("gentamicin"), "MG must include gentamicin");
  assert.ok(mgDrugIds.includes("tobramycin"), "MG must include tobramycin");
  assert.ok(mgDrugIds.includes("azithromycin"), "MG must include azithromycin");
  assert.ok(mgDrugIds.includes("telithromycin"), "MG must include telithromycin");
  const mgPairs = mg.contraindicatedPairs;
  assert.ok(
    mgPairs.some((p) => p.drug1Id === "ciprofloxacin" && p.drug2Id === "gentamicin"),
    "MG must include ciprofloxacin + gentamicin pair",
  );
  assert.ok(
    mgPairs.some((p) => p.drug1Id === "azithromycin" && p.drug2Id === "ciprofloxacin"),
    "MG must include azithromycin + ciprofloxacin pair",
  );

  // 11. Pheochromocytoma
  const pheo = conditionMap.get("pheochromocytoma");
  assert.ok(pheo, "Pheochromocytoma condition must exist");
  assert.match(pheo.clinicalThreshold, /alpha-1 blockade/i);
  assert.equal(pheo.category, "Metabolic");
  assert.equal(pheo.organSystem, "Endocrine / Adrenal");
  const pheoDrugIds = pheo.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(pheoDrugIds.includes("propranolol"), "Pheo must include propranolol");
  assert.ok(pheoDrugIds.includes("metoprolol"), "Pheo must include metoprolol");
  assert.ok(pheoDrugIds.includes("metoclopramide"), "Pheo must include metoclopramide");
  assert.ok(pheoDrugIds.includes("glucagon"), "Pheo must include glucagon");
  const pheoPairs = pheo.contraindicatedPairs;
  assert.ok(
    pheoPairs.some((p) => p.drug1Id === "metoprolol" && p.drug2Id === "metoclopramide"),
    "Pheo must include metoprolol + metoclopramide pair",
  );
  assert.ok(
    pheoPairs.some((p) => p.drug1Id === "propranolol" && p.drug2Id === "phenylephrine"),
    "Pheo must include propranolol + phenylephrine pair",
  );

  // 12. Active Peptic Ulcer & Acute GI Hemorrhage
  const gi = conditionMap.get("active-peptic-ulcer-gi-bleed");
  assert.ok(gi, "Active peptic ulcer & GI bleed condition must exist");
  assert.match(gi.clinicalThreshold, /ulceration|GI bleeding/i);
  assert.equal(gi.category, "Organ Impairment");
  assert.equal(gi.organSystem, "Gastroenterology");
  const giDrugIds = gi.contraindicatedDrugs.map((d) => d.drugId);
  assert.ok(giDrugIds.includes("ketorolac"), "GI bleed must include ketorolac");
  assert.ok(giDrugIds.includes("aspirin"), "GI bleed must include aspirin");
  assert.ok(giDrugIds.includes("ibuprofen"), "GI bleed must include ibuprofen");
  assert.ok(giDrugIds.includes("apixaban"), "GI bleed must include apixaban");
  assert.ok(giDrugIds.includes("rivaroxaban"), "GI bleed must include rivaroxaban");
  assert.ok(giDrugIds.includes("warfarin"), "GI bleed must include warfarin");
  const giPairs = gi.contraindicatedPairs;
  assert.ok(
    giPairs.some((p) => p.drug1Id === "ketorolac" && p.drug2Id === "apixaban"),
    "GI bleed must include ketorolac + apixaban pair",
  );
  assert.ok(
    giPairs.some(
      (p) =>
        p.drug1Id === "aspirin" &&
        p.drug2Id === "ibuprofen" &&
        p.drug3Id === "sertraline",
    ),
    "GI bleed must include aspirin + ibuprofen + sertraline pair",
  );
});

test("search and filtering helpers function correctly", () => {
  // Category filtering
  const organImpairment = filterContraindicatedConditions({ category: "Organ Impairment" });
  assert.ok(organImpairment.length >= 2);
  for (const c of organImpairment) {
    assert.equal(c.category, "Organ Impairment");
  }

  const cardiac = filterContraindicatedConditions({ category: "Cardiac" });
  assert.ok(cardiac.length >= 2);
  for (const c of cardiac) {
    assert.equal(c.category, "Cardiac");
  }

  const all = filterContraindicatedConditions({ category: "All" });
  assert.equal(all.length, CONTRAINDICATED_CONDITIONS.length);

  // Query search by condition name
  const renalSearch = filterContraindicatedConditions({ query: "renal" });
  assert.ok(renalSearch.some((c) => c.id === "severe-renal-impairment"));

  // Query search by drug name
  const metforminSearch = filterContraindicatedConditions({ query: "metformin" });
  assert.ok(metforminSearch.some((c) => c.id === "severe-renal-impairment"));

  // Query search by hazard keyword
  const lacticSearch = filterContraindicatedConditions({ query: "lactic acidosis" });
  assert.ok(lacticSearch.some((c) => c.id === "severe-renal-impairment"));

  // Combined category and query
  const cardiacZipra = filterContraindicatedConditions({ category: "Cardiac", query: "ziprasidone" });
  assert.equal(cardiacZipra.length, 1);
  assert.equal(cardiacZipra[0].id, "prolonged-qtc");
});

test("findConditionById and getConditionsForDrug helpers work accurately", () => {
  const cond = findConditionById("severe-renal-impairment");
  assert.ok(cond);
  assert.equal(cond?.shortName, "Severe Renal Impairment");

  const missing = findConditionById("non-existent-condition");
  assert.equal(missing, undefined);

  // Metformin should appear in renal impairment
  const metforminConds = getConditionsForDrug("metformin");
  assert.ok(metforminConds.some((c) => c.id === "severe-renal-impairment"));

  // Valproate should appear in both hepatic and pregnancy
  const valproateConds = getConditionsForDrug("valproate");
  assert.ok(valproateConds.some((c) => c.id === "severe-hepatic-impairment"));
  assert.ok(valproateConds.some((c) => c.id === "pregnancy-teratogenicity"));

  // Test isDrugContraindicatedInCondition
  assert.equal(isDrugContraindicatedInCondition("severe-renal-impairment", "metformin"), true);
  assert.equal(isDrugContraindicatedInCondition("severe-renal-impairment", "valproate"), false);
  assert.equal(isDrugContraindicatedInCondition("pregnancy-teratogenicity", "isotretinoin"), true);
});

test("getContraindicatedPairsForDesk identifies collisions on user desk", () => {
  // Test pair that collides in renal impairment: spironolactone + lisinopril
  const collidingDesk = ["spironolactone", "lisinopril", "atorvastatin"];
  const pairs = getContraindicatedPairsForDesk(collidingDesk);
  assert.ok(pairs.length >= 1);
  assert.equal(pairs[0].condition.id, "severe-renal-impairment");
  assert.equal(pairs[0].pair.drug1Id, "spironolactone");
  assert.equal(pairs[0].pair.drug2Id, "lisinopril");

  // Test pair that collides in prolonged QTc: ziprasidone + amiodarone
  const qtcDesk = ["ziprasidone", "amiodarone"];
  const qtcPairs = getContraindicatedPairsForDesk(qtcDesk);
  assert.ok(qtcPairs.some((p) => p.condition.id === "prolonged-qtc"));

  // Safe non-colliding desk
  const safeDesk = ["amoxicillin", "atorvastatin"];
  const safePairs = getContraindicatedPairsForDesk(safeDesk);
  assert.equal(safePairs.length, 0);
});

test("getAllContraindicatedDrugIds returns deduplicated sorted list", () => {
  const ids = getAllContraindicatedDrugIds();
  assert.ok(ids.length > 20);
  const set = new Set(ids);
  assert.equal(ids.length, set.size, "Must not contain duplicates");
  const sorted = [...ids].sort();
  assert.deepEqual(ids, sorted, "Must be sorted");
});

test("getConditionById helper retrieves conditions accurately", () => {
  const mg = getConditionById("myasthenia-gravis");
  assert.ok(mg);
  assert.equal(mg?.shortName, "Myasthenia Gravis");
  assert.equal(mg?.category, "Neuro & Psych");

  const pheo = getConditionById("pheochromocytoma");
  assert.ok(pheo);
  assert.equal(pheo?.shortName, "Pheochromocytoma");
  assert.equal(pheo?.category, "Metabolic");

  const gi = getConditionById("active-peptic-ulcer-gi-bleed");
  assert.ok(gi);
  assert.equal(gi?.shortName, "Active Peptic Ulcer & GI Bleed");
  assert.equal(gi?.category, "Organ Impairment");

  const missing = getConditionById("non-existent-condition-id");
  assert.equal(missing, undefined);
});

test("FDA Boxed Warnings are present on high-risk drugs across clinical conditions", () => {
  const conditionsWithBoxed = CONTRAINDICATED_CONDITIONS.filter((c) =>
    c.contraindicatedDrugs.some((d) => d.fdaBoxedWarning === true),
  );
  assert.ok(
    conditionsWithBoxed.length >= 9,
    `Expected at least 9 conditions with Boxed Warning drugs, got ${conditionsWithBoxed.length}`,
  );

  // Check specific Boxed Warnings in new conditions
  const mg = findConditionById("myasthenia-gravis");
  assert.ok(mg);
  const cipro = mg?.contraindicatedDrugs.find((d) => d.drugId === "ciprofloxacin");
  assert.equal(cipro?.fdaBoxedWarning, true, "Ciprofloxacin must have Boxed Warning in MG");
  const levo = mg?.contraindicatedDrugs.find((d) => d.drugId === "levofloxacin");
  assert.equal(levo?.fdaBoxedWarning, true, "Levofloxacin must have Boxed Warning in MG");
  const teli = mg?.contraindicatedDrugs.find((d) => d.drugId === "telithromycin");
  assert.equal(teli?.fdaBoxedWarning, true, "Telithromycin must have Boxed Warning in MG");

  const pheo = findConditionById("pheochromocytoma");
  assert.ok(pheo);
  const metoc = pheo?.contraindicatedDrugs.find((d) => d.drugId === "metoclopramide");
  assert.equal(metoc?.fdaBoxedWarning, true, "Metoclopramide must carry Boxed Warning in pheochromocytoma");

  const gi = findConditionById("active-peptic-ulcer-gi-bleed");
  assert.ok(gi);
  const keto = gi?.contraindicatedDrugs.find((d) => d.drugId === "ketorolac");
  assert.equal(keto?.fdaBoxedWarning, true, "Ketorolac must carry Boxed Warning for peptic ulcer / GI bleeding");
  const warf = gi?.contraindicatedDrugs.find((d) => d.drugId === "warfarin");
  assert.equal(warf?.fdaBoxedWarning, true, "Warfarin must carry Boxed Warning for major or fatal bleeding");
});

test("findContraindicatedConditionsForDrugs identifies single drugs and high-risk pairs", () => {
  // 1. Single drug: metformin -> severe-renal-impairment
  const metforminRes = findContraindicatedConditionsForDrugs(["metformin"]);
  assert.ok(metforminRes.conditions.some((c) => c.id === "severe-renal-impairment"));
  assert.ok(
    metforminRes.findings.some(
      (f) =>
        f.conditionId === "severe-renal-impairment" &&
        f.type === "single" &&
        f.drugIds.includes("metformin") &&
        f.fdaBoxedWarning === true,
    ),
  );

  // 2. Single drug: ciprofloxacin -> myasthenia-gravis and prolonged-qtc
  const ciproRes = findContraindicatedConditionsForDrugs(["ciprofloxacin"]);
  assert.ok(ciproRes.conditions.some((c) => c.id === "myasthenia-gravis"));
  assert.ok(ciproRes.conditions.some((c) => c.id === "prolonged-qtc"));
  assert.ok(
    ciproRes.findings.some(
      (f) =>
        f.conditionId === "myasthenia-gravis" &&
        f.type === "single" &&
        f.drugIds.includes("ciprofloxacin") &&
        f.fdaBoxedWarning === true,
    ),
  );

  // 3. Single drug: ketorolac -> active-peptic-ulcer-gi-bleed
  const ketoRes = findContraindicatedConditionsForDrugs(["ketorolac"]);
  assert.ok(ketoRes.conditions.some((c) => c.id === "active-peptic-ulcer-gi-bleed"));
  assert.ok(
    ketoRes.findings.some(
      (f) =>
        f.conditionId === "active-peptic-ulcer-gi-bleed" &&
        f.type === "single" &&
        f.drugIds.includes("ketorolac") &&
        f.fdaBoxedWarning === true,
    ),
  );

  // 4. Pair: ketorolac + apixaban -> active-peptic-ulcer-gi-bleed
  const ketoApixRes = findContraindicatedConditionsForDrugs(["ketorolac", "apixaban"]);
  assert.ok(ketoApixRes.conditions.some((c) => c.id === "active-peptic-ulcer-gi-bleed"));
  const ketoApixPairFinding = ketoApixRes.findings.find(
    (f) =>
      f.conditionId === "active-peptic-ulcer-gi-bleed" &&
      f.type === "pair" &&
      f.drugIds.includes("ketorolac") &&
      f.drugIds.includes("apixaban"),
  );
  assert.ok(ketoApixPairFinding, "Must return pair finding for ketorolac + apixaban");
  assert.equal(ketoApixPairFinding?.severity, "contraindicated");

  // 5. Pair: metoprolol + metoclopramide -> pheochromocytoma
  const metoMetocRes = findContraindicatedConditionsForDrugs(["metoprolol", "metoclopramide"]);
  assert.ok(metoMetocRes.conditions.some((c) => c.id === "pheochromocytoma"));
  const pheoPairFinding = metoMetocRes.findings.find(
    (f) =>
      f.conditionId === "pheochromocytoma" &&
      f.type === "pair" &&
      f.drugIds.includes("metoprolol") &&
      f.drugIds.includes("metoclopramide"),
  );
  assert.ok(pheoPairFinding, "Must return pair finding for metoprolol + metoclopramide");
  assert.equal(pheoPairFinding?.severity, "contraindicated");

  // 6. Pair: ciprofloxacin + gentamicin -> myasthenia-gravis
  const ciproGentRes = findContraindicatedConditionsForDrugs(["ciprofloxacin", "gentamicin"]);
  assert.ok(ciproGentRes.conditions.some((c) => c.id === "myasthenia-gravis"));
  const mgPairFinding = ciproGentRes.findings.find(
    (f) =>
      f.conditionId === "myasthenia-gravis" &&
      f.type === "pair" &&
      f.drugIds.includes("ciprofloxacin") &&
      f.drugIds.includes("gentamicin"),
  );
  assert.ok(mgPairFinding, "Must return pair finding for ciprofloxacin + gentamicin");
  assert.equal(mgPairFinding?.severity, "contraindicated");

  // 7. Triplet: aspirin + ibuprofen + sertraline -> active-peptic-ulcer-gi-bleed
  const tripletRes = findContraindicatedConditionsForDrugs([
    "aspirin",
    "ibuprofen",
    "sertraline",
  ]);
  assert.ok(tripletRes.conditions.some((c) => c.id === "active-peptic-ulcer-gi-bleed"));
  const tripletFinding = tripletRes.findings.find(
    (f) =>
      f.conditionId === "active-peptic-ulcer-gi-bleed" &&
      f.type === "pair" &&
      f.drugIds.includes("aspirin") &&
      f.drugIds.includes("ibuprofen") &&
      f.drugIds.includes("sertraline"),
  );
  assert.ok(tripletFinding, "Must return pair finding for aspirin + ibuprofen + sertraline");

  // 8. Safe non-colliding pair
  const safeRes = findContraindicatedConditionsForDrugs(["amoxicillin", "atorvastatin"]);
  const mgPairs = safeRes.findings.filter(
    (f) => f.conditionId === "myasthenia-gravis" && f.type === "pair",
  );
  assert.equal(mgPairs.length, 0);

  // 9. Object and array destructuring compatibility
  const { conditions, findings } = ciproGentRes;
  assert.ok(Array.isArray(conditions));
  assert.ok(Array.isArray(findings));
  assert.ok(Array.isArray(ciproGentRes));
  assert.equal(ciproGentRes.length, conditions.length);
});

test("regulatory posture conforms strictly to non-prescriptive FDA 520(o)(1)(E) requirements", () => {
  assert.match(NON_PRESCRIPTIVE_CDS_POSTURE, /520\(o\)\(1\)\(E\)/);
  assert.match(NON_PRESCRIPTIVE_CDS_POSTURE, /non-prescriptive/i);
  assert.match(NON_PRESCRIPTIVE_CDS_POSTURE, /independent review/i);
  assert.match(NON_PRESCRIPTIVE_CDS_POSTURE, /learning aids/i);
  assert.match(NON_PRESCRIPTIVE_CDS_POSTURE, /Prescribing Information/i);

  // Confirm no prescriptive or diagnostic directives in catalog text
  for (const cond of CONTRAINDICATED_CONDITIONS) {
    assert.doesNotMatch(
      cond.educationalRationale,
      /you must prescribe|stop therapy immediately|diagnostic order/i,
      `Condition ${cond.id} educationalRationale must remain non-prescriptive`,
    );
    assert.doesNotMatch(
      cond.clinicalSummary,
      /you must prescribe|diagnostic order/i,
      `Condition ${cond.id} clinicalSummary must remain non-prescriptive`,
    );
    for (const pair of cond.contraindicatedPairs) {
      assert.doesNotMatch(
        pair.clinicalManagement,
        /you must prescribe|diagnostic order/i,
        `Pair in ${cond.id} (${pair.drug1Id} + ${pair.drug2Id}) must remain non-prescriptive`,
      );
    }
  }
});
