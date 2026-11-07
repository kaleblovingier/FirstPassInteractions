import assert from "node:assert/strict";
import test from "node:test";

import { basisFor } from "./basis";
import {
  DESK_ONLY_NOTICE,
  deskOnlyNotice,
  fdaSectionHeadings,
  gradePath,
  isDeskMapOnly,
  reviewBases,
} from "./basis-review";
import { analyze } from "./engine";
import { LABEL_CONDITIONAL_LINES } from "./label-conditional";
import { LABEL_CONTRAINDICATIONS } from "./label-contraindications";
import { LABEL_GOLD_SET } from "./reference/label-gold-set";
import { PERPETRATOR_LABELS } from "./reference/label-perpetrators";
import type { Finding } from "./types";

function findingsFor(a: string, b: string): Finding[] {
  return analyze([a, b]).findings;
}

test("stored label sections map to FDA's own heading words", () => {
  assert.deepEqual(fdaSectionHeadings("4 CONTRAINDICATIONS"), ["4 Contraindications"]);
  assert.deepEqual(fdaSectionHeadings("4 CONTRAINDICATIONS (Table 6)"), ["4 Contraindications"]);
  assert.deepEqual(fdaSectionHeadings("4.1 QT Prolongation"), ["4 Contraindications, subsection 4.1"]);
  assert.deepEqual(
    fdaSectionHeadings("Boxed Warning (Risks From Concomitant Use With Benzodiazepines Or Other CNS Depressants); 5.3"),
    ["Boxed Warning", "5 Warnings and Precautions, subsection 5.3"],
  );
  assert.deepEqual(fdaSectionHeadings("7.1 Strong CYP1A2 Inhibitors (see 4 CONTRAINDICATIONS)"), [
    "7 Drug Interactions, subsection 7.1",
  ]);
  assert.deepEqual(fdaSectionHeadings("7 DRUG INTERACTIONS"), ["7 Drug Interactions"]);
  assert.deepEqual(fdaSectionHeadings("8.1 Pregnancy"), ["8.1 Pregnancy"]);
  assert.deepEqual(fdaSectionHeadings("12.3 Pharmacokinetics"), ["12.3 Pharmacokinetics"]);
  assert.deepEqual(fdaSectionHeadings("CONTRAINDICATIONS"), [
    "Contraindications (older label format, no section number)",
  ]);
  assert.deepEqual(fdaSectionHeadings("PRECAUTIONS – Drug Interactions"), [
    "Precautions, Drug Interactions (older label format, no section number)",
  ]);
  assert.deepEqual(fdaSectionHeadings(undefined), []);
  assert.deepEqual(fdaSectionHeadings("Table 6"), []);
});

test("every saved label section on file maps to at least one FDA heading", () => {
  const sections = new Set<string>();
  for (const g of LABEL_GOLD_SET) sections.add(g.labelSection);
  for (const p of LABEL_CONTRAINDICATIONS) sections.add(p.labelSection);
  for (const c of LABEL_CONDITIONAL_LINES) sections.add(c.labelSection);
  for (const l of PERPETRATOR_LABELS) {
    sections.add(l.section);
    if (l.contraindicatedWith) sections.add(l.contraindicatedWith.section);
    for (const g of l.contraindicatedGroups ?? []) sections.add(g.section);
  }
  const unmapped = [...sections].filter((s) => fdaSectionHeadings(s).length === 0);
  assert.deepEqual(unmapped, []);
});

test("a label-held row names section 4 and the retrieval day, and says the label holds the tier", () => {
  const f = findingsFor("clarithromycin", "simvastatin").find((x) => x.severity === "contraindicated");
  assert.ok(f, "clarithromycin with simvastatin has an Avoid together row");
  const saved = reviewBases(f).filter((r) => r.provenance === "saved-label");
  assert.ok(saved.length > 0);
  for (const r of saved) {
    assert.ok(r.sections.length > 0, r.basis.label);
    assert.match(r.note, /FDA label section/);
    assert.match(r.note, /retrieved from DailyMed \d{4}-\d{2}-\d{2}/);
    assert.equal(r.basis.retrieved?.length, 10);
  }
  assert.ok(saved.some((r) => r.sections.includes("4 Contraindications")));
  const path = gradePath(f);
  assert.match(path, /Label hold/);
  assert.match(path, /Avoid together/);
  assert.equal(deskOnlyNotice(f), null);
});

test("an enzyme row restates the stored strength and FDA fold, and calls the tier the desk's bin", () => {
  const f = findingsFor("ketoconazole", "midazolam").find((x) => x.id.includes("pk-CYP3A4-inhibitor"));
  assert.ok(f);
  const path = gradePath(f);
  assert.match(path, /stores Ketoconazole as a strong CYP3A4 inhibitor/);
  assert.match(path, /≥5-fold ↑ AUC/);
  assert.match(path, /desk's bin, not an FDA grade/);
});

test("a transporter row gets no CYP fold sentence", () => {
  const f = findingsFor("rifampin", "tacrolimus").find((x) => x.enzymes[0] === "P-gp" && x.kind === "pk");
  assert.ok(f);
  assert.doesNotMatch(gradePath(f), /FDA's definition/);
});

test("a desk-only row carries the notice, and a sourced row does not", () => {
  const pairs: [string, string][] = [
    ["fluoxetine", "tramadol"],
    ["sertraline", "ibuprofen"],
    ["oxycodone", "alprazolam"],
    ["rifampin", "tacrolimus"],
  ];
  const all = pairs.flatMap(([a, b]) => findingsFor(a, b));
  const deskOnly = all.filter(isDeskMapOnly);
  const sourced = all.filter((f) => !isDeskMapOnly(f));
  assert.ok(deskOnly.length > 0 && sourced.length > 0);
  for (const f of deskOnly) {
    assert.equal(deskOnlyNotice(f), DESK_ONLY_NOTICE);
    assert.match(gradePath(f), /No external source is saved for this row/);
    assert.ok(basisFor(f).every((b) => b.kind === "desk"));
  }
  for (const f of sourced) assert.equal(deskOnlyNotice(f), null);
  assert.equal(
    DESK_ONLY_NOTICE,
    "Desk map only: no FDA label or literature source is saved for this row. Check the Prescribing Information.",
  );
});

test("a paraphrased label row says no section or date is saved", () => {
  const f = findingsFor("fluoxetine", "tramadol").find((x) => x.id.endsWith("pd-sero"));
  assert.ok(f);
  const r = reviewBases(f).find((x) => x.provenance === "label-paraphrase");
  assert.ok(r);
  assert.match(r.note, /No label section or retrieval date is saved/);
});

test("review lines keep basisFor order, add no source, and stay plain", () => {
  const pairs: [string, string][] = [
    ["clarithromycin", "simvastatin"],
    ["omeprazole", "clopidogrel"],
    ["linezolid", "sertraline"],
    ["warfarin", "fluconazole"],
  ];
  for (const [a, b] of pairs) {
    for (const f of findingsFor(a, b)) {
      const before = f.severity;
      const reviews = reviewBases(f);
      assert.deepEqual(
        reviews.map((r) => r.basis),
        basisFor(f),
      );
      const copy = [gradePath(f), ...reviews.map((r) => r.note)].join(" ");
      assert.doesNotMatch(copy, /—/, "no em dashes");
      assert.doesNotMatch(copy, /\b\d+(?:\.\d+)?\s?mg\b/i, "no milligram");
      assert.doesNotMatch(copy, /FDA[- ](?:approved|cleared)/i);
      assert.equal(f.severity, before);
    }
  }
});
