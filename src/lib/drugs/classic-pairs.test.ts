import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog.ts";
import { analyze } from "./engine.ts";
import { ROUNDS } from "./rounds.ts";
import { SAMPLE_REGIMENS } from "./samples.ts";

const MG = /\d+\s*mg/i;

const PAIRS: { id: string; drugIds: [string, string]; roundId?: string }[] = [
  { id: "colchicine-clarithromycin", drugIds: ["colchicine", "clarithromycin"], roundId: "r-colchicine-clarithromycin" },
  { id: "colchicine-ritonavir", drugIds: ["colchicine", "ritonavir"], roundId: "r-colchicine-ritonavir" },
  { id: "sildenafil-nitroglycerin", drugIds: ["sildenafil", "nitroglycerin"], roundId: "r-icu-sildenafil-nitroglycerin-cgmp-shock" },
];

test("classic pairs resolve to samples and a teaching round", () => {
  for (const pair of PAIRS) {
    assert.ok(DRUG_BY_ID[pair.drugIds[0]], pair.drugIds[0]);
    assert.ok(DRUG_BY_ID[pair.drugIds[1]], pair.drugIds[1]);
    const sample = SAMPLE_REGIMENS.find((s) => s.id === pair.id);
    assert.ok(sample, pair.id);
    assert.deepEqual(sample.drugIds, pair.drugIds);
    assert.doesNotMatch(sample.blurb, MG, pair.id);
    const round = ROUNDS.find((r) => r.id === pair.roundId);
    assert.ok(round, pair.roundId);
    assert.deepEqual(round.drugIds, pair.drugIds);
    assert.doesNotMatch(`${round.blurb} ${round.teach}`, MG, pair.roundId);
  }
});

test("the engine already returns a finding for each new pair", () => {
  for (const pair of PAIRS) {
    const report = analyze(pair.drugIds);
    const flagged = report.findings.some(
      (f) =>
        f.severity === "contraindicated" ||
        f.severity === "major" ||
        f.severity === "moderate" ||
        pair.drugIds.every((id) => f.drugIds.includes(id)),
    );
    assert.equal(
      flagged,
      true,
      `${pair.id}: ${report.findings.map((f) => `${f.severity} ${f.headline}`).join(" | ") || "engine did not flag this pair"}`,
    );
  }
});

test("azathioprine plus allopurinol was already a sample", () => {
  const sample = SAMPLE_REGIMENS.find((s) => s.drugIds.includes("azathioprine") && s.drugIds.includes("allopurinol"));
  assert.ok(sample);
  assert.equal(sample.id, "aza-allopurinol");
  assert.doesNotMatch(sample.blurb, MG);
});
