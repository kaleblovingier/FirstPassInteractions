import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUG_BY_ID, DRUGS, normalizeSearchText, searchDrugs } from "./catalog.ts";
import { MODERN_WAVE5_FORMULARY } from "./catalog-modern-wave5.ts";
import { analyze } from "./engine.ts";
import { labelFreshnessLine, noteLabelBasis } from "./grade-provenance.ts";

const WAVE5_IDS = ["milsaperidone", "centanafadine", "baxdrostat", "tavapadon"] as const;

const versions = JSON.parse(readFileSync("src/lib/drugs/reference/label-versions.json", "utf8")) as {
  labels: Record<string, { version: number; effective: string; checkedOn: string }>;
};

function searchKeys(drug: { id: string; name: string; brands: string[]; aliases: string[] }): string[] {
  return [...new Set([drug.id, drug.name, ...drug.brands, ...drug.aliases].map(normalizeSearchText).filter(Boolean))];
}

test("wave5 has the expected ids and each is on the shelf and searchable", () => {
  assert.deepEqual(MODERN_WAVE5_FORMULARY.map((row) => row.id), [...WAVE5_IDS]);
  for (const row of MODERN_WAVE5_FORMULARY) {
    assert.equal(DRUG_BY_ID[row.id], row, `${row.id} collided on merge`);
    assert.equal(searchDrugs(row.name)[0]?.id, row.id, row.name);
    assert.equal(searchDrugs(row.brands[0]!)[0]?.id, row.id, row.brands[0]);
  }
});

test("wave5 shares no id, name, brand, or alias with the rest of the catalog", () => {
  const wave5 = new Set(MODERN_WAVE5_FORMULARY.map((row) => row.id));
  const owner = new Map<string, string>();
  for (const drug of DRUGS) {
    if (wave5.has(drug.id)) continue;
    for (const key of searchKeys(drug)) if (!owner.has(key)) owner.set(key, drug.id);
  }
  const seen = new Map<string, string>();
  for (const row of MODERN_WAVE5_FORMULARY) {
    for (const key of searchKeys(row)) {
      assert.ok(!owner.has(key), `${row.id} key "${key}" already belongs to ${owner.get(key)}`);
      assert.ok(!seen.has(key) || seen.get(key) === row.id, `${row.id} key "${key}" repeats ${seen.get(key)}`);
      seen.set(key, row.id);
    }
  }
});

test("each wave5 note cites its DailyMed label, on file with a version and date", () => {
  const setids = new Set<string>();
  for (const row of MODERN_WAVE5_FORMULARY) {
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

test("wave5 codes a perpetrator strength only where the note quotes the label's own strength word", () => {
  for (const row of MODERN_WAVE5_FORMULARY) {
    for (const role of row.enzymes) {
      if (role.kind === "substrate") {
        assert.notEqual(role.sensitivity, "sensitive", `${row.id} ${role.enzyme}`);
        continue;
      }
      const said = new RegExp(`is a ${role.strength} ${role.kind} of ${role.enzyme}\\.`);
      assert.match(row.note ?? "", said, `${row.id} ${role.kind} ${role.enzyme} has no quoted strength`);
    }
  }
});

test("wave5 notes carry no dose amount", () => {
  for (const row of MODERN_WAVE5_FORMULARY) {
    assert.doesNotMatch(`${row.toxicityHint} ${row.note ?? ""}`, /\b\d+(\.\d+)?\s*(mg|mcg|g|units?)\b/i, row.id);
  }
});

const PK_CASES: { drug: string; partner: string; enzyme: string; kind: "inhibitor" | "inducer"; severity: string; label: string }[] = [
  { drug: "milsaperidone", partner: "fluoxetine", enzyme: "CYP2D6", kind: "inhibitor", severity: "major", label: "Bysanti 7.1 reduce the dosage with a strong CYP2D6 inhibitor" },
  { drug: "milsaperidone", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Bysanti 7.1 reduce the dosage with a strong CYP3A4 inhibitor" },
  { drug: "baxdrostat", partner: "rifampin", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Baxfendy 7.2 strong CYP3A inducers may reduce efficacy" },
  { drug: "baxdrostat", partner: "efavirenz", enzyme: "CYP3A4", kind: "inducer", severity: "moderate", label: "Baxfendy 7.2 moderate CYP3A inducers may reduce efficacy" },
  { drug: "tavapadon", partner: "itraconazole", enzyme: "CYP3A4", kind: "inhibitor", severity: "major", label: "Juvmo 7.1 reduce dosing frequency with strong CYP3A inhibitors" },
  { drug: "tavapadon", partner: "carbamazepine", enzyme: "CYP3A4", kind: "inducer", severity: "major", label: "Juvmo 7.1 strong CYP3A inducer not recommended" },
];

test("known label partners produce the finding the label describes", () => {
  for (const c of PK_CASES) {
    const hit = analyze([c.drug, c.partner]).findings.find((f) => f.id.includes(`pk-${c.enzyme}-${c.kind}-${c.partner}`));
    assert.ok(hit, `${c.label}: no finding for ${c.drug} with ${c.partner}`);
    assert.equal(hit.severity, c.severity, c.label);
  }
});

test("centanafadine raises a CYP1A2 substrate as the moderate inhibitor Simtriyo section 7 names", () => {
  const hit = analyze(["centanafadine", "tizanidine"]).findings.find((f) => f.id.includes("pk-CYP1A2-inhibitor-centanafadine"));
  assert.ok(hit, "tizanidine is a CYP1A2 substrate on this desk");
  assert.equal(DRUG_BY_ID.centanafadine!.enzymes.some((r) => r.kind === "substrate"), false, "Simtriyo 12.3: no clinically meaningful change with ciprofloxacin or quinidine");
});

test("centanafadine reads contraindicated with an MAOI, as Simtriyo section 4 states", () => {
  for (const maoi of ["phenelzine", "linezolid"]) {
    const top = analyze(["centanafadine", maoi]).findings[0];
    assert.equal(top?.severity, "contraindicated", maoi);
  }
});

test("baxdrostat does not read major with a strong CYP3A inhibitor, where Baxfendy 12.3 reports no clinically significant change", () => {
  const hit = analyze(["baxdrostat", "itraconazole"]).findings.find((f) => f.id.includes("pk-CYP3A4-inhibitor-itraconazole"));
  assert.notEqual(hit?.severity, "major");
});

test("baxdrostat reaches the hyperkalemia rule that Baxfendy 5.1 and 7.1 describe", () => {
  const hit = analyze(["baxdrostat", "lisinopril"]).findings.find((f) => f.tags.includes("potassium"));
  assert.ok(hit);
});

test("milsaperidone reads major with another QT-prolonging drug, as Bysanti 7.2 says to avoid", () => {
  const hit = analyze(["milsaperidone", "ondansetron"]).findings.find((f) => f.tags.includes("qt"));
  assert.equal(hit?.severity, "major");
});

test("tavapadon keeps its ungraded CYP3A induction and CYP2C8 inhibition in prose, not in a scored role", () => {
  const row = DRUG_BY_ID.tavapadon!;
  assert.equal(row.enzymes.some((r) => r.kind !== "substrate"), false);
  assert.match(row.note ?? "", /JUVMO is an inducer of CYP3A/);
  assert.match(row.toxicityHint, /strength ungraded and not scored here/);
});
