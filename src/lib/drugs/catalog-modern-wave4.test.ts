import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUG_BY_ID, DRUGS, normalizeSearchText, searchDrugs } from "./catalog.ts";
import { MODERN_WAVE4_FORMULARY } from "./catalog-modern-wave4.ts";
import { analyze } from "./engine.ts";
import { labelFreshnessLine, noteLabelBasis } from "./grade-provenance.ts";

const WAVE4_IDS = [
  "vorasidenib",
  "inavolisib",
  "ensartinib",
  "atrasentan",
  "sebetralstat",
  "zongertinib",
  "remibrutinib",
  "paltusotine",
  "imlunestrant",
  "vimseltinib",
  "mirdametinib",
  "sunvozertinib",
  "dordaviprone",
  "ziftomenib",
  "revumenib",
  "acoramidis",
  "crinecerfont",
  "tovorafenib",
  "seladelpar",
  "deuruxolitinib",
  "momelotinib",
  "nirogacestat",
  "elacestrant",
] as const;

const versions = JSON.parse(readFileSync("src/lib/drugs/reference/label-versions.json", "utf8")) as {
  labels: Record<string, { version: number; effective: string; checkedOn: string }>;
};

function searchKeys(drug: { id: string; name: string; brands: string[]; aliases: string[] }): string[] {
  return [...new Set([drug.id, drug.name, ...drug.brands, ...drug.aliases].map(normalizeSearchText).filter(Boolean))];
}

test("wave4 has the expected ids and each is on the shelf and searchable", () => {
  assert.deepEqual(MODERN_WAVE4_FORMULARY.map((row) => row.id), [...WAVE4_IDS]);
  for (const row of MODERN_WAVE4_FORMULARY) {
    assert.equal(DRUG_BY_ID[row.id], row, `${row.id} collided on merge`);
    assert.equal(searchDrugs(row.name)[0]?.id, row.id, row.name);
    assert.equal(searchDrugs(row.brands[0]!)[0]?.id, row.id, row.brands[0]);
  }
});

test("wave4 shares no id, name, brand, or alias with the rest of the catalog", () => {
  const wave4 = new Set(MODERN_WAVE4_FORMULARY.map((row) => row.id));
  const owner = new Map<string, string>();
  for (const drug of DRUGS) {
    if (wave4.has(drug.id)) continue;
    for (const key of searchKeys(drug)) if (!owner.has(key)) owner.set(key, drug.id);
  }
  const seen = new Map<string, string>();
  for (const row of MODERN_WAVE4_FORMULARY) {
    for (const key of searchKeys(row)) {
      assert.ok(!owner.has(key), `${row.id} key "${key}" already belongs to ${owner.get(key)}`);
      assert.ok(!seen.has(key) || seen.get(key) === row.id, `${row.id} key "${key}" repeats ${seen.get(key)}`);
      seen.set(key, row.id);
    }
  }
});

test("each wave4 note cites its DailyMed label, on file with a version and date", () => {
  const setids = new Set<string>();
  for (const row of MODERN_WAVE4_FORMULARY) {
    const setid = row.note?.match(/setid=([0-9a-f-]+)/)?.[1];
    assert.ok(setid, `${row.id} cites no DailyMed setid`);
    assert.ok(!setids.has(setid), `${row.id} repeats a setid`);
    setids.add(setid);
    assert.ok(versions.labels[setid], `${row.id} setid missing from label-versions.json`);
    const basis = noteLabelBasis(row.note!);
    assert.ok(basis);
    assert.match(labelFreshnessLine(basis) ?? "", /^Label version dated \d{4}-\d{2}-\d{2}\. Last checked \d{4}-\d{2}-\d{2}\.$/, row.id);
  }
});

test("wave4 codes no perpetrator strength and no sensitive grade, because no label here states one", () => {
  for (const row of MODERN_WAVE4_FORMULARY) {
    for (const role of row.enzymes) {
      assert.equal(role.kind, "substrate", `${row.id} ${role.enzyme}: no label gives a clinical perpetrator strength`);
      if (role.kind === "substrate") assert.notEqual(role.sensitivity, "sensitive", `${row.id} ${role.enzyme}`);
    }
  }
});

test("wave4 rows with no enzyme role say that is not a clearance", () => {
  for (const row of MODERN_WAVE4_FORMULARY.filter((r) => r.enzymes.length === 0)) {
    assert.match(row.note ?? "", /not that the drug is free of interactions/, row.id);
    assert.match(row.toxicityHint, /not a clearance/, row.id);
  }
});

const PK_CASES: { drug: string; partner: string; enzyme: string; kind: "inhibitor" | "inducer"; severity: string; label: string }[] = [
  { drug: "vorasidenib", partner: "fluvoxamine", enzyme: "CYP1A2", kind: "inhibitor", severity: "major", label: "Voranigo 7.1 avoid strong CYP1A2 inhibitors" },
  { drug: "ensartinib", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Ensacove 7.1 avoid strong CYP3A inhibitors" },
  { drug: "ensartinib", partner: "quinidine", enzyme: "P-gp", kind: "inhibitor", severity: "major", label: "Ensacove 7.1 avoid P-gp inhibitors" },
  { drug: "atrasentan", partner: "rifampin", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Vanrafia 7.1 avoid strong CYP3A inducers" },
  { drug: "sebetralstat", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Ekterly 7.1 avoid strong CYP3A4 inhibitors" },
  { drug: "sebetralstat", partner: "verapamil", enzyme: "CYP3A4", kind: "inhibitor", severity: "moderate", label: "Ekterly 7.1 dose reduction with moderate CYP3A4 inhibitors" },
  { drug: "zongertinib", partner: "carbamazepine", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Hernexeos 7.1 avoid strong CYP3A inducers" },
  { drug: "remibrutinib", partner: "ritonavir", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Rhapsido 7.1 avoid strong CYP3A4 inhibitors" },
  { drug: "remibrutinib", partner: "carbamazepine", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Rhapsido 7.1 avoid strong CYP3A4 inducers" },
  { drug: "paltusotine", partner: "carbamazepine", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Palsonify 7.1 strong CYP3A4 inducer may need an increased dosage" },
  { drug: "imlunestrant", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Inluriyo 7.1 avoid strong CYP3A inhibitors" },
  { drug: "imlunestrant", partner: "carbamazepine", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Inluriyo 7.1 avoid strong CYP3A inducers" },
  { drug: "sunvozertinib", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Zegfrovy 7.1 avoid strong CYP3A inhibitors" },
  { drug: "sunvozertinib", partner: "efavirenz", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Zegfrovy 7.1 avoid moderate CYP3A inducers" },
  { drug: "dordaviprone", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Modeyso 7.1 avoid strong CYP3A4 inhibitors" },
  { drug: "dordaviprone", partner: "rifampin", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Modeyso 7.1 avoid strong CYP3A4 inducers" },
  { drug: "ziftomenib", partner: "rifampin", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Komzifti 7.1 avoid strong CYP3A4 inducers" },
  { drug: "ziftomenib", partner: "efavirenz", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Komzifti 7.1 avoid moderate CYP3A4 inducers" },
  { drug: "revumenib", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Revuforj 7.1 reduce the dose with strong CYP3A4 inhibitors" },
  { drug: "revumenib", partner: "rifampin", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Revuforj 7.1 avoid strong CYP3A4 inducers" },
  { drug: "crinecerfont", partner: "rifampin", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Crenessity 7.1 dose increase with strong CYP3A4 inducers" },
  { drug: "crinecerfont", partner: "efavirenz", enzyme: "CYP3A4", kind: "inducer", severity: "moderate", label: "Crenessity 7.1 dose increase with moderate CYP3A4 inducers" },
  { drug: "tovorafenib", partner: "gemfibrozil", enzyme: "CYP2C8", kind: "inhibitor", severity: "major", label: "Ojemda 7.1 avoid strong CYP2C8 inhibitors" },
  { drug: "seladelpar", partner: "fluconazole", enzyme: "CYP2C9", kind: "inhibitor", severity: "moderate", label: "Livdelzi 7.1 monitor with dual inhibitors such as fluconazole" },
  { drug: "deuruxolitinib", partner: "rifampin", enzyme: "CYP2C9", kind: "inducer", severity: "major", label: "Leqselvi 7 avoid strong CYP3A and moderate CYP2C9 inducers" },
  { drug: "nirogacestat", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Ogsiveo 7.1 avoid strong CYP3A inhibitors" },
  { drug: "nirogacestat", partner: "rifampin", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Ogsiveo 7.1 avoid strong CYP3A inducers" },
  { drug: "elacestrant", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Orserdu 7.1 avoid strong CYP3A inhibitors" },
  { drug: "elacestrant", partner: "efavirenz", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Orserdu 7.1 avoid moderate CYP3A inducers" },
];

test("known label partners produce the finding the label describes", () => {
  for (const c of PK_CASES) {
    const hit = analyze([c.drug, c.partner]).findings.find((f) => f.id.includes(`pk-${c.enzyme}-${c.kind}-${c.partner}`));
    assert.ok(hit, `${c.label}: no finding for ${c.drug} with ${c.partner}`);
    assert.equal(hit.severity, c.severity, c.label);
  }
});

test("zongertinib does not read major with a strong CYP3A inhibitor, where Hernexeos 12.3 reports no clinically significant change", () => {
  const hit = analyze(["zongertinib", "itraconazole"]).findings.find((f) => f.id.includes("pk-CYP3A4-inhibitor-itraconazole"));
  assert.notEqual(hit?.severity, "major");
});

test("deuruxolitinib keeps its class-stated contraindication in prose and unpinned, and the hint says so plainly", () => {
  const hit = analyze(["deuruxolitinib", "fluconazole"]).findings.find((f) => f.id.includes("pk-CYP2C9-inhibitor-fluconazole"));
  assert.ok(hit, "fluconazole is the moderate CYP2C9 inhibitor Leqselvi 12.3 studied");
  assert.notEqual(hit.severity, "contraindicated", "section 4 names a class, not fluconazole, so no pin holds the tier there");
  assert.match(DRUG_BY_ID.deuruxolitinib!.toxicityHint, /contraindicated in CYP2C9 poor metabolizers and with moderate or strong CYP2C9 inhibitors/);
});

test("deuruxolitinib and momelotinib do not read as CYP3A4 victims, where their labels report a negative study", () => {
  for (const [id, partner] of [["deuruxolitinib", "itraconazole"], ["momelotinib", "ritonavir"]] as const) {
    const hit = analyze([id, partner]).findings.find((f) => f.enzymes.includes("CYP3A4"));
    assert.equal(hit, undefined, `${id} with ${partner}`);
  }
});

test("remibrutinib reaches the additive bleeding rule, which Rhapsido 5.1 and 7.2 describe for antithrombotics", () => {
  const hit = analyze(["remibrutinib", "warfarin"]).findings.find((f) => f.tags.includes("bleeding"));
  assert.equal(hit?.severity, "major");
});

test("paltusotine and ensartinib reach the nodal rule, which their labels describe for drugs that slow the heart", () => {
  for (const id of ["paltusotine", "ensartinib"]) {
    const hit = analyze([id, "verapamil"]).findings.find((f) => f.tags.includes("bradycardia"));
    assert.equal(hit?.severity, "major", id);
  }
});

test("dordaviprone, ziftomenib, and revumenib read major with another QT-prolonging drug, as their labels warn", () => {
  for (const id of ["dordaviprone", "ziftomenib", "revumenib"]) {
    const hit = analyze([id, "ondansetron"]).findings.find((f) => f.tags.includes("qt"));
    assert.equal(hit?.severity, "major", id);
  }
});

test("sebetralstat stacks on the QT desk through its qt-possible chip", () => {
  const hit = analyze(["sebetralstat", "ondansetron"]).findings.find((f) => f.tags.includes("qt"));
  assert.ok(hit, "sebetralstat with ondansetron should reach the QT stack");
});
