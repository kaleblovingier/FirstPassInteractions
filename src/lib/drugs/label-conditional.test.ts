import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyze } from "./engine";
import { basisFor } from "./basis";
import { DRUG_BY_ID } from "./catalog";
import { DEFAULT_HOST, SEVERITY_RANK, type Finding, type Severity } from "./types";
import { labelContraindicationFor } from "./label-contraindications";
import {
  LABEL_CONDITIONAL_LINES,
  LABEL_CONDITIONAL_TAG,
  isInspraPotassiumPair,
  labelConditionalFor,
  labelConditionalSentence,
} from "./label-conditional";
import { checkQuote, setidOf, type DriftFixture } from "./reference/label-drift";

function pairFindings(a: string, b: string, host?: typeof DEFAULT_HOST): Finding[] {
  return analyze([a, b], host).findings.filter((f) => f.drugIds.includes(a) && f.drugIds.includes(b));
}

function pairSeverity(a: string, b: string, host?: typeof DEFAULT_HOST): Severity | "none" {
  let best: Severity | "none" = "none";
  for (const f of pairFindings(a, b, host)) if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[best]) best = f.severity;
  return best;
}

const FIXTURE: DriftFixture = JSON.parse(
  readFileSync(new URL("../../../scripts/fixtures/label-drift-spl.json", import.meta.url), "utf8"),
);

test("wave 18 conditional lines are exactly the reviewed set", () => {
  assert.deepEqual(
    LABEL_CONDITIONAL_LINES.map((r) => r.id),
    [
      "voriconazole+efavirenz",
      "voriconazole+ritonavir",
      "voriconazole+venetoclax",
      "itraconazole+venetoclax",
      "posaconazole+venetoclax",
      "eplerenone+spironolactone",
      "eplerenone+spironolactone-derm",
      "eplerenone+spironolactone-hctz",
      "eplerenone+amiloride",
      "eplerenone+triamterene",
      "eplerenone+hydrochlorothiazide-triamterene",
      "eplerenone+potassium",
      "eplerenone+potassium-chloride",
    ],
  );
});

test("each conditional quote is verbatim saved section text, dose-free, and on a catalog pair", () => {
  for (const r of LABEL_CONDITIONAL_LINES) {
    assert.equal(r.id, `${r.labelDrugId}+${r.otherId}`);
    assert.ok(DRUG_BY_ID[r.labelDrugId], `${r.labelDrugId} in catalog`);
    assert.ok(DRUG_BY_ID[r.otherId], `${r.otherId} in catalog`);
    assert.equal(r.retrieved, FIXTURE.retrieved, `${r.id}: retrieved matches the fixture`);
    const setid = setidOf(r.url);
    assert.ok(setid, r.id);
    const label = FIXTURE.labels[setid];
    assert.ok(label && "sections" in label, `${r.id}: label in fixture`);
    const result = checkQuote(
      { pairs: [r.id], labelDrug: r.labelDrug, labelSection: r.labelSection, quote: r.quote, url: r.url, setid },
      label.sections,
      "",
    );
    assert.equal(result.status, "pass", `${r.id}: quote is in the cited fixture section`);
    assert.ok(r.quote.toLowerCase().includes(r.labelExample.toLowerCase()), `${r.id}: quote names ${r.labelExample}`);
    for (const text of [r.quote, r.scope, labelConditionalSentence(r, { severity: "major" })]) {
      assert.doesNotMatch(text, /\bmg\b|\d/, `${r.id}: no dose`);
    }
    const words = r.quote.split(/\s+/).filter((w) => w && w !== "…" && w !== "(…").length;
    assert.ok(words <= 35, `${r.id}: quote is ${words} words`);
    // A conditional line never sits on a pinned pair.
    assert.equal(labelContraindicationFor(r.labelDrugId, r.otherId), undefined, `${r.id}: not pinned`);
    assert.equal(labelConditionalFor(r.otherId, r.labelDrugId), r, `${r.id}: unordered lookup`);
  }
});

test("each conditional line rides on one card, keeps Serious concern, and cites its label", () => {
  for (const r of LABEL_CONDITIONAL_LINES) {
    for (const host of [undefined, DEFAULT_HOST]) {
      const tagged = pairFindings(r.labelDrugId, r.otherId, host).filter((f) => f.tags.includes(LABEL_CONDITIONAL_TAG));
      assert.equal(tagged.length, 1, `${r.id}: one card carries the line`);
      const f = tagged[0];
      assert.equal(f.severity, "major", `${r.id}: card grade`);
      assert.ok(f.clinical.endsWith(labelConditionalSentence(r, f)), `${r.id}: sentence appended`);
      assert.match(f.clinical, /is not shown as Avoid together\.$/);
      assert.equal(pairSeverity(r.labelDrugId, r.otherId, host), "major", `${r.id}: pair stays below Avoid together`);
      const b = basisFor(f)[0];
      assert.equal(b.kind, "fda-pi", r.id);
      assert.equal(b.href, r.url, r.id);
      assert.ok(b.detail.includes(`"${r.quote}"`), `${r.id}: basis quotes the label`);
      assert.match(b.detail, /Retrieved from DailyMed 2026-10-28\.$/);
    }
  }
});

test("Vfend dose lines and the azole venetoclax lines leave the enzyme card's own text and grade in place", () => {
  const card = (a: string, b: string, id: string) => {
    const f = pairFindings(a, b).find((x) => x.id === id);
    assert.ok(f, id);
    return f;
  };
  const efv = card("voriconazole", "efavirenz", "efavirenz__voriconazole__pk-CYP2C19-inducer-efavirenz");
  assert.match(efv.clinical, /^Efavirenz is a moderate CYP2C19 inducer\. Voriconazole is a major CYP2C19 substrate\./);
  assert.match(efv.clinical, /only at or above the efavirenz dosage the label states\. Lower efavirenz dosages are not on that line\. This desk does not know the dose,/);
  // The second inducer card on the pair is unchanged.
  const efv3a4 = card("voriconazole", "efavirenz", "efavirenz__voriconazole__pk-CYP3A4-inducer-efavirenz");
  assert.equal(efv3a4.severity, "major");
  assert.equal(efv3a4.tags.includes(LABEL_CONDITIONAL_TAG), false);
  const rtv = card("voriconazole", "ritonavir", "ritonavir__voriconazole__pk-CYP3A4-inhibitor-voriconazole");
  assert.match(rtv.clinical, /only with high-dose ritonavir, among drugs that lower voriconazole levels\. With low-dose ritonavir it says to avoid the combination unless the benefit and risk to the patient justify Vfend\./);
  for (const [azole, label] of [
    ["voriconazole", "Vfend"],
    ["itraconazole", "Sporanox"],
    ["posaconazole", "Noxafil"],
  ] as const) {
    const f = card(azole, "venetoclax", [azole, "venetoclax"].sort().join("__") + `__pk-CYP3A4-inhibitor-${azole}`);
    assert.match(f.clinical, new RegExp(`The ${label} \\(${azole}\\) label lists this combination under Contraindications only at venetoclax initiation and during the ramp-up phase`));
    assert.match(f.clinical, /This desk does not know the treatment phase/);
  }
});

test("Inspra hypertension line: a new eplerenone hyperkalemia card for the named partners only", () => {
  const named = [
    "spironolactone",
    "spironolactone-derm",
    "spironolactone-hctz",
    "amiloride",
    "triamterene",
    "hydrochlorothiazide-triamterene",
    "potassium",
    "potassium-chloride",
  ];
  for (const other of named) {
    assert.ok(isInspraPotassiumPair("eplerenone", other), other);
    assert.ok(isInspraPotassiumPair(other, "eplerenone"), other);
    for (const host of [undefined, DEFAULT_HOST]) {
      const cards = pairFindings("eplerenone", other, host).filter((f) => f.id.endsWith("__pd-mra-k"));
      assert.equal(cards.length, 1, other);
      assert.equal(cards[0].severity, "major", other);
      assert.equal(cards[0].kind, "pd");
      assert.deepEqual(cards[0].tags, ["potassium", LABEL_CONDITIONAL_TAG]);
      assert.match(cards[0].clinical, /only when Inspra is used to treat hypertension\. This desk does not know the indication/);
    }
  }
  // Not a potassium-sparing diuretic or a potassium supplement the line names, or not eplerenone.
  for (const [a, b] of [
    ["eplerenone", "finerenone"],
    ["eplerenone", "tmp-smx"],
    ["eplerenone", "potassium-citrate"],
    ["eplerenone", "potassium-chloride-iv"],
    ["eplerenone", "potassium-phosphate"],
    ["spironolactone", "amiloride"],
    ["spironolactone", "triamterene"],
    ["spironolactone", "potassium"],
    ["spironolactone", "tmp-smx"],
    ["finerenone", "potassium"],
  ] as const) {
    assert.equal(isInspraPotassiumPair(a, b), false, `${a}+${b}`);
    assert.equal(pairFindings(a, b).some((f) => f.id.endsWith("__pd-mra-k")), false, `${a}+${b}`);
    assert.equal(pairFindings(a, b).some((f) => f.tags.includes(LABEL_CONDITIONAL_TAG)), false, `${a}+${b}`);
  }
});

test("ACEI/ARB × potassium-sparing hyperkalemia card is unchanged", () => {
  const CLINICAL =
    "ACEI/ARB plus a potassium-sparing agent (spironolactone, TMP-SMX) can produce life-threatening hyperkalemia. Check potassium and creatinine, especially in CKD.";
  for (const raas of ["lisinopril", "losartan"]) {
    for (const other of ["spironolactone", "eplerenone", "finerenone", "amiloride", "triamterene", "tmp-smx", "potassium"]) {
      const cards = pairFindings(raas, other).filter((f) => f.id.endsWith("__pd-hyperk"));
      assert.equal(cards.length, 1, `${raas}+${other}`);
      assert.equal(cards[0].severity, "major");
      assert.equal(cards[0].clinical, CLINICAL);
      assert.deepEqual(cards[0].tags, ["potassium"]);
      assert.equal(pairFindings(raas, other).some((f) => f.id.endsWith("__pd-mra-k")), false);
    }
  }
  // Potassium chloride (catalog clinic row) still has no ACEI card. Out of this wave's scope.
  assert.equal(pairSeverity("lisinopril", "potassium-chloride"), "none");
});

test("pairs without a saved conditional line keep their cards as they were", () => {
  for (const [a, b] of [
    ["voriconazole", "efavirenz-ftc-tdf"],
    ["clarithromycin", "venetoclax"],
    ["ketoconazole", "venetoclax"],
    ["ritonavir", "venetoclax"],
    ["simvastatin", "indinavir"],
    ["simvastatin", "saquinavir"],
    ["simvastatin", "tipranavir"],
    ["lopinavir", "voriconazole"],
  ] as const) {
    assert.equal(labelConditionalFor(a, b), undefined, `${a}+${b}`);
    assert.equal(pairFindings(a, b).some((f) => f.tags.includes(LABEL_CONDITIONAL_TAG)), false, `${a}+${b}`);
  }
  assert.equal(pairSeverity("voriconazole", "efavirenz-ftc-tdf"), "none");
});
