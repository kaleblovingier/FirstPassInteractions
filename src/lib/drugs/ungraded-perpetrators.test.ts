/**
 * Ungraded label perpetrators are a pair annotation, not a scored tier.
 * Teaching data. Not a dose. Not FDA-cleared.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DRUG_BY_ID } from "./catalog";
import { analyze } from "./engine";
import { perpetratorCountCard } from "./learn/perpetrator-count";
import type { Enzyme, Severity } from "./types";
import {
  UNGRADED_DISCLAIMER,
  monographRoleEmpty,
  pairBlankReason,
  unscoredPerpetratorClause,
  ungradedPairNotes,
  ungradedPerpetratorsFor,
} from "./ungraded-perpetrators";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCORED: Severity[] = ["contraindicated", "major", "moderate"];

const PROBES: Array<{ id: string; enzyme: Enzyme; substrateId: string; sentence: RegExp }> = [
  { id: "fedratinib", enzyme: "CYP2D6", substrateId: "atomoxetine", sentence: /CYP2D6 substrates/ },
  { id: "fedratinib", enzyme: "CYP2C19", substrateId: "pantoprazole", sentence: /CYP2C19 substrates/ },
  { id: "fedratinib", enzyme: "CYP3A4", substrateId: "simvastatin", sentence: /CYP3A4 substrates/ },
  { id: "mavacamten", enzyme: "CYP2C9", substrateId: "glipizide", sentence: /Mavacamten is an inducer of CYP3A4, CYP2C9, and CYP2C19/ },
  { id: "mavacamten", enzyme: "CYP2C19", substrateId: "pantoprazole", sentence: /Mavacamten is an inducer of CYP3A4, CYP2C9, and CYP2C19/ },
  { id: "mavacamten", enzyme: "CYP3A4", substrateId: "simvastatin", sentence: /Mavacamten is an inducer of CYP3A4, CYP2C9, and CYP2C19/ },
  { id: "mavorixafor", enzyme: "CYP2D6", substrateId: "atomoxetine", sentence: /Mavorixafor is a CYP2D6 inhibitor/ },
  { id: "mavorixafor", enzyme: "CYP3A4", substrateId: "simvastatin", sentence: /Mavorixafor is an inhibitor of CYP3A4/ },
  { id: "mavorixafor", enzyme: "P-gp", substrateId: "dabigatran", sentence: /Mavorixafor is an inhibitor of P-gp/ },
  {
    id: "vanzacaftor-tezacaftor-deutivacaftor",
    enzyme: "P-gp",
    substrateId: "dabigatran",
    sentence: /are P-gp inhibitors/,
  },
  {
    id: "vanzacaftor-tezacaftor-deutivacaftor",
    enzyme: "CYP2C9",
    substrateId: "glipizide",
    sentence: /inhibits CYP2C8, CYP2C9, and CYP3A4/,
  },
  {
    id: "vanzacaftor-tezacaftor-deutivacaftor",
    enzyme: "CYP2C8",
    substrateId: "pioglitazone",
    sentence: /inhibits CYP2C8, CYP2C9, and CYP3A4/,
  },
  {
    id: "vanzacaftor-tezacaftor-deutivacaftor",
    enzyme: "CYP3A4",
    substrateId: "simvastatin",
    sentence: /do not induce CYP3A4/,
  },
  { id: "etripamil", enzyme: "CYP2D6", substrateId: "atomoxetine", sentence: /Etripamil inhibits CYP2D6, CYP3A4, and CYP2C9/ },
  { id: "etripamil", enzyme: "CYP2C9", substrateId: "glipizide", sentence: /Etripamil inhibits CYP2D6, CYP3A4, and CYP2C9/ },
  { id: "etripamil", enzyme: "CYP3A4", substrateId: "simvastatin", sentence: /Etripamil inhibits CYP2D6, CYP3A4, and CYP2C9/ },
  {
    id: "tradipitant",
    enzyme: "CYP3A4",
    substrateId: "simvastatin",
    sentence: /no clinically significant differences in midazolam pharmacokinetics/,
  },
  { id: "zoliflodacin", enzyme: "CYP2C8", substrateId: "pioglitazone", sentence: /inhibited CYP2C8, CYP2C9, and CYP2C19/ },
  { id: "zoliflodacin", enzyme: "CYP2C9", substrateId: "glipizide", sentence: /inhibited CYP2C8, CYP2C9, and CYP2C19/ },
  { id: "zoliflodacin", enzyme: "CYP2C19", substrateId: "pantoprazole", sentence: /inhibited CYP2C8, CYP2C9, and CYP2C19/ },
];

test("each named enzyme shows the label sentence and a DailyMed link, with no scored tier", () => {
  for (const probe of PROBES) {
    const notes = ungradedPairNotes(probe.id, probe.substrateId);
    const hit = notes.find((note) => note.enzymes.includes(probe.enzyme) && note.sentence.match(probe.sentence));
    assert.ok(hit, `${probe.id} + ${probe.substrateId} missing ${probe.enzyme}`);
    assert.match(hit.href, /^https:\/\/dailymed\.nlm\.nih\.gov\/dailymed\/drugInfo\.cfm\?setid=/);
    assert.match(hit.line, /did not assign a strength/);
    assert.match(hit.line, /Educational reference only/);
    assert.match(hit.line, /Not FDA-cleared/);
    assert.match(hit.line, /Prescribing Information governs/);
    assert.doesNotMatch(hit.line, /Avoid together|Serious concern|Use care/);
    assert.doesNotMatch(hit.line, /\bsafe\b/i);
    assert.doesNotMatch(hit.line.replaceAll("Not FDA-cleared", ""), /\bcleared\b/i);
    assert.doesNotMatch(hit.line, /WCAG|FDA-graded|affiliat/i);

    const reason = pairBlankReason(probe.id, probe.substrateId);
    assert.match(reason, probe.sentence, reason);
    assert.match(reason, new RegExp(hit.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(reason, /No perpetrator was mapped/);

    const report = analyze([probe.id, probe.substrateId]);
    const lifted = report.findings.filter((finding) => SCORED.includes(finding.severity));
    assert.deepEqual(
      lifted.map((finding) => `${finding.severity} ${finding.mechanism}`),
      [],
      `${probe.id} + ${probe.substrateId} gained Avoid, Serious, or Use care`,
    );
    const invented = report.findings.filter(
      (finding) =>
        finding.kind === "pk" &&
        finding.drugIds[0] === probe.id &&
        finding.enzymes.includes(probe.enzyme) &&
        (finding.tags.includes("inhibitor") || finding.tags.includes("inducer")),
    );
    assert.deepEqual(
      invented.map((finding) => finding.severity),
      [],
      `${probe.id} ${probe.enzyme} entered pkSeverity: ${JSON.stringify(invented)}`,
    );
    for (const finding of report.findings) {
      assert.equal(finding.tags.includes("ungraded"), false);
      assert.doesNotMatch(finding.mechanism, /did not assign a strength/);
      assert.doesNotMatch(finding.clinical, /did not assign a strength/);
    }
  }
});

test("a quiet pair with no ungraded match keeps the old blank reason", () => {
  assert.match(
    pairBlankReason("simvastatin", "atorvastatin"),
    /Both are CYP3A4 substrates\. No perpetrator was mapped\./,
  );
  assert.equal(
    pairBlankReason("lisinopril", "metformin"),
    "No shared enzyme and no stacked-effect row on this map.",
  );
  assert.equal(ungradedPairNotes("mavorixafor", "metformin").length, 0);
  assert.match(pairBlankReason("mavorixafor", "metformin"), /No shared enzyme and no stacked-effect row/);
});

test("quiet enzyme copy does not say no perpetrator was mapped when the label named one", () => {
  assert.equal(
    unscoredPerpetratorClause(["mavorixafor", "atomoxetine"], "CYP2D6"),
    "CYP2D6, label names an unscored perpetrator",
  );
  assert.equal(unscoredPerpetratorClause(["simvastatin", "atorvastatin"], "CYP3A4"), null);
});

test("monograph empty columns do not say not mapped when the label named that direction", () => {
  assert.match(monographRoleEmpty("mavorixafor", "inhibitor"), /named an inhibitor/);
  assert.match(monographRoleEmpty("mavorixafor", "inhibitor"), /did not assign a strength/);
  assert.equal(monographRoleEmpty("mavorixafor", "inducer"), "Not a mapped inducer");
  assert.match(monographRoleEmpty("mavacamten", "inducer"), /named an inducer/);
  assert.equal(monographRoleEmpty("mavacamten", "inhibitor"), "Not a mapped inhibitor");
  assert.equal(monographRoleEmpty("simvastatin", "inhibitor"), "Not a mapped inhibitor");
  assert.match(monographRoleEmpty("tradipitant", "inhibitor"), /named an inhibitor/);
  assert.match(monographRoleEmpty("tradipitant", "inducer"), /named an inducer/);
});

test("Learn does not treat a zero stored count as the whole story", () => {
  for (const id of ["fedratinib", "mavacamten", "etripamil", "zoliflodacin", "tradipitant", "vanzacaftor-tezacaftor-deutivacaftor"]) {
    const card = perpetratorCountCard(DRUG_BY_ID[id]);
    assert.equal(card.correct, "0", id);
    assert.match(card.answer, /unscored perpetrator/, id);
    assert.match(card.answer, new RegExp(UNGRADED_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), id);
    assert.doesNotMatch(card.answer, /\bsafe\b/i, id);
  }
});

test("annotations are not read by the severity engine", () => {
  const engine = readFileSync(join(root, "src/lib/drugs/engine.ts"), "utf8");
  assert.doesNotMatch(engine, /ungraded-perpetrators|ungradedPerpetrators|UNGRADED_/);
  assert.match(engine, /function pkSeverity/);
  const check = readFileSync(join(root, "src/components/desk/check.tsx"), "utf8");
  assert.match(check, /pairBlankReason/);
  assert.match(check, /unscoredPerpetratorClause/);
  const app = readFileSync(join(root, "src/components/desk/app.tsx"), "utf8");
  assert.match(app, /monographRoleEmpty/);
  assert.match(app, /UngradedMonograph/);
});

test("a CYP2D6 pair does not claim there was no shared enzyme and no perpetrator", () => {
  const reason = pairBlankReason("mavorixafor", "atomoxetine");
  assert.match(reason, /Mavorixafor is a CYP2D6 inhibitor/);
  assert.match(reason, /dailymed\.nlm\.nih\.gov/);
  assert.doesNotMatch(reason, /No perpetrator was mapped/);
  assert.doesNotMatch(reason, /No shared enzyme and no stacked-effect row/);
});

test("annotation rows do not invent a strength word", () => {
  for (const id of ["fedratinib", "mavacamten", "mavorixafor", "etripamil", "tradipitant", "zoliflodacin"]) {
    for (const row of ungradedPerpetratorsFor(id)) {
      assert.equal(Object.hasOwn(row, "strength"), false, id);
      assert.doesNotMatch(row.sentence, /\b(strong|moderate|weak)\s+(inhibitor|inducer)\b/i, `${id} ${row.sentence}`);
    }
  }
});
