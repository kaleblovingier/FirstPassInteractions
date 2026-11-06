/**
 * The PharmD sign-off packet is generated from the engine; keep it in sync.
 * Scans every catalog pair (~20 s). Regenerate with:
 *   npx --no-install tsx scripts/signoff-packet.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LABEL_CONTRAINDICATED_TAG } from "./label-contraindications.ts";
import { PACKET_PATH, PK_SEVERITY_LEGEND, collect, renderPacket } from "../../../scripts/signoff-packet.ts";

test("signoff packet script runs and docs/clinical-review/signoff-packet.md is in sync", () => {
  const data = collect();
  assert.ok(data.rules.length > 0);
  assert.ok(data.rules.every((r) => r.severity === "contraindicated" || r.severity === "major"));
  const md = renderPacket(data);
  assert.equal(readFileSync(PACKET_PATH, "utf8").replace(/\r\n/g, "\n"), md.replace(/\r\n/g, "\n"), "packet is stale; re-run scripts/signoff-packet.ts");
  assert.match(md, /no clinician has reviewed this content yet/);
  assert.match(md, /Known open questions/);
  assert.doesNotMatch(md, /clinical decision support/i);
  assert.doesNotMatch(md, /\b\d+(\.\d+)?\s*(mg|mcg)\b/i);

  const section2 = md.split("## 2. CYP / P-gp escalation (pkSeverity)")[1]?.split("## 3.")[0] ?? "";
  const legend = section2.split("\n| # |")[0] ?? "";
  assert.equal(legend.includes(PK_SEVERITY_LEGEND), true);
  assert.match(legend, /never returns contraindicated/);
  assert.match(legend, /strong × sensitive or narrow-index → major/);
  assert.match(legend, /strong × major substrate → major/);
  assert.match(legend, /strong × otherwise → moderate/);
  assert.match(legend, /moderate × sensitive or narrow-index → major/);
  assert.match(legend, /moderate × major substrate → moderate/);
  assert.match(legend, /moderate × otherwise → minor/);
  assert.match(legend, /weak × sensitive or narrow-index → moderate/);
  assert.match(legend, /weak × otherwise → minor/);
  assert.match(legend, /strong × any substrate, including minor → major/);
  assert.match(legend, /moderate × sensitive, narrow-index, or major → major/);
  assert.match(legend, /Inducers on a prodrug \(activation\) pathway ignore sensitivity: strong → major; moderate → moderate; weak → minor/);
  assert.doesNotMatch(legend, /→ contraindicated/);
  assert.doesNotMatch(legend, /sensitive\/NTI → contraindicated/);

  const pkContra = data.rules.filter((r) => r.section === "pk" && r.severity === "contraindicated");
  assert.ok(pkContra.length > 0);
  for (const r of pkContra) {
    assert.equal(r.labelPinned, r.findings);
    assert.match(r.trigger, new RegExp(LABEL_CONTRAINDICATED_TAG));
    assert.match(r.trigger, /only because/);
    assert.match(r.trigger, /applyLabelPins/);
    assert.doesNotMatch(r.trigger, /not from a label lookup/);
    assert.doesNotMatch(r.trigger, /Severity comes from pkSeverity/);
  }
  const pkMajor = data.rules.filter((r) => r.section === "pk" && r.severity === "major");
  assert.ok(pkMajor.length > 0);
  for (const r of pkMajor) {
    assert.equal(r.labelPinned, 0);
    assert.match(r.trigger, /Severity comes from pkSeverity\(\) in engine\.ts, not from a label lookup/);
    assert.doesNotMatch(r.trigger, new RegExp(LABEL_CONTRAINDICATED_TAG));
  }

  const washLifted = data.rules.filter((r) => r.section === "washout" && r.severity === "contraindicated");
  assert.ok(washLifted.length > 0);
  for (const r of washLifted) {
    assert.equal(r.labelPinned, r.findings);
    assert.match(r.trigger, /holdWashoutLabelPins\(\)/);
    assert.match(r.trigger, new RegExp(LABEL_CONTRAINDICATED_TAG));
    assert.doesNotMatch(r.trigger, /not from a label lookup/);
  }
  const washMajor = data.rules.filter((r) => r.section === "washout" && r.severity === "major");
  assert.ok(washMajor.every((r) => !r.trigger.includes("holdWashoutLabelPins")));

  const labelCards = data.rules.filter((r) => r.key.startsWith("label-ci"));
  assert.ok(labelCards.length > 0);
  for (const r of labelCards) {
    assert.match(r.trigger, new RegExp(LABEL_CONTRAINDICATED_TAG));
    assert.match(r.trigger, /only because/);
    assert.doesNotMatch(r.trigger, /not from a label lookup/);
  }

  assert.equal(data.pkContra.tagged, data.pkContra.findings);
  const n = data.pkContra.findings.toLocaleString("en-US");
  const cyp = (data.pkContra.findings - data.pkContra.pgp).toLocaleString("en-US");
  const pgp = data.pkContra.pgp.toLocaleString("en-US");
  const pairs = data.pkContra.pairs.toLocaleString("en-US");
  const onlyPk = data.pkContra.pairsOnlyPk.toLocaleString("en-US");
  assert.match(md, new RegExp(`On this scan \\*\\*${n} PK findings\\*\\* \\(${cyp} CYP, ${pgp} P-gp\\) across \\*\\*${pairs} drug pairs\\*`));
  assert.match(md, new RegExp(`All \\*\\*${n}\\*\\* of those findings are tagged \`${LABEL_CONTRAINDICATED_TAG}\``));
  assert.match(md, new RegExp(`On \\*\\*${onlyPk}\\*\\* of those pairs no class/PD contraindicated rule also fires`));
  assert.match(md, /`pkSeverity\(\)` never returns contraindicated/);
});
