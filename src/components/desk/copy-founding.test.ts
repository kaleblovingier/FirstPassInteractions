import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f: string) => readFileSync(`src/components/desk/${f}`, "utf8");
const jsxText = (s: string) => [...s.matchAll(/>([^<>{}]+)</g), ...s.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("\n");

describe("desk copy", () => {
  it("never says Pro in UI strings", () => {
    for (const f of ["library.tsx", "foundry.tsx", "operator.tsx"]) {
      assert.doesNotMatch(jsxText(read(f)).replace(/^pro$/gm, ""), /\bPro\b/, f);
    }
  });
  it("does not promise an unconditional lifetime", () => {
    assert.doesNotMatch(read("library.tsx"), /Lifetime desk access/);
    assert.doesNotMatch(read("operator.tsx"), /\$79 lifetime/);
  });
  it("clinical packet shows no insulin units or mg/dL thresholds", () => {
    const s = read("clinical-packet-dialog.tsx");
    assert.doesNotMatch(s, /\bunits IV\b|mg\/dL|insulinDoseUnits|primaryAgent\.dose/);
  });
});

describe("crawlable desk status line", () => {
  it("app.tsx status line has no 'free' or pricing", () => {
    assert.doesNotMatch(read("app.tsx"), /free · founding \$79|founding \$79 lifetime/);
  });
});

describe("yearly plan label", () => {
  it("is 'Desk (year)', never 'Founding (year)'", () => {
    const s = read("foundry.tsx");
    assert.doesNotMatch(s, /Founding \(year\)/);
    assert.equal(s.split('"Desk (year)"').length - 1, 2);
  });
});

describe("potassium station and EHR export show no doses", () => {
  it("clinical.tsx and clinical-packet.ts do not render insulin/albuterol/calcium doses", () => {
    const ui = read("clinical.tsx");
    const exp = readFileSync("src/lib/drugs/clinical-packet.ts", "utf8");
    for (const s of [ui, exp]) {
      assert.doesNotMatch(s, /insulinDoseUnits|primaryAgent\.dose\b|albuterolDosing\.doseMg|D50W 25 g|10–20 mg nebulized/);
    }
    assert.match(read("clinical-packet-dialog.tsx"), /Membrane Stabilization Required:/);
  });
});
