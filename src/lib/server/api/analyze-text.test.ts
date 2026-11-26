import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ClinicalDecisionService } from "./cds-service";

const analyze = (body: unknown) => ClinicalDecisionService.analyze(body);

describe("POST /api/cds/analyze - a pasted list as text", () => {
  it("reads the list like the desk does and analyzes what it names", async () => {
    const r = await analyze({ text: "1. Lexapro 10 mg PO daily\n- tramadol 50 mg q6h PRN\nAllergies: penicillin" });
    assert.ok(r.success, JSON.stringify(!r.success && r.problem));
    assert.deepEqual(r.data.query.requestedDrugs, ["Lexapro", "tramadol"]);
    assert.deepEqual(r.data.data.substances.map((s) => s.canonicalName), ["Escitalopram", "Tramadol"]);
    assert.ok(r.data.data.synergyAlerts.some((a) => a.category === "Serotonin Syndrome"));
  });

  it("names the lines it could not match, and never echoes a dose", async () => {
    const r = await analyze({ text: "warfarin 5 mg daily\nnotadrugxyz 10 mg" });
    assert.ok(r.success);
    assert.deepEqual(r.data.query.unresolvedDrugs, ["notadrugxyz"]);
    assert.ok(r.data.warnings.some((w) => w.code === "drugs-unresolved"));
    assert.doesNotMatch(JSON.stringify(r.data.query), /\d+\s*mg/);
  });

  it("analyzes the first 20 names and says how many were left out", async () => {
    const text = ["warfarin", ...Array.from({ length: 24 }, (_, i) => `notadrug${String.fromCharCode(97 + i)}`)].join("\n");
    const r = await analyze({ text });
    assert.ok(r.success);
    assert.equal(r.data.query.requestedDrugs.length, 20);
    const cut = r.data.warnings.find((w) => w.code === "text-truncated");
    assert.match(cut?.detail ?? "", /5 more/);
  });

  it("takes substances or text, never both or neither, and needs a name in the text", async () => {
    for (const body of [{ substances: ["warfarin"], text: "warfarin" }, {}, { text: "10 mg daily" }, { text: "" }]) {
      const r = await analyze(body);
      assert.ok(!r.success && r.problem.status === 422, JSON.stringify(body));
    }
  });
});
