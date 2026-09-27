import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS } from "./catalog";

const copy = (d: (typeof DRUGS)[number]) => `${d.toxicityHint ?? ""} ${d.note ?? ""}`;

/** Labeled caps kept on purpose for teaching (not dose advice). */
const MG_ALLOW: Record<string, RegExp> = {
  ticagrelor: /aspirin >100 mg/,
};

test("catalog notes use plain wording: no 'hotter', no 'pan-CYP', no arrows", () => {
  for (const d of DRUGS) {
    const text = copy(d);
    assert.doesNotMatch(text, /hotter/i, `${d.id} says 'hotter'`);
    assert.doesNotMatch(text, /pan-CYP/i, `${d.id} says 'pan-CYP'`);
    assert.doesNotMatch(text, /->|→/, `${d.id} uses an arrow`);
  }
});

test("catalog notes carry no mg/g doses outside the reviewed labeled-cap allowlist", () => {
  for (const d of DRUGS) {
    let text = copy(d);
    if (MG_ALLOW[d.id]) text = text.replace(MG_ALLOW[d.id], "");
    assert.doesNotMatch(text, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i, `${d.id} carries a dose`);
  }
});

test("phenobarbital and primidone induction copy matches their graded roles", () => {
  for (const id of ["phenobarbital", "primidone"]) {
    const d = DRUG_BY_ID[id];
    const grade = (e: string) => {
      const r = d.enzymes.find((x) => x.enzyme === e && x.kind === "inducer");
      return r && r.kind !== "substrate" ? r.strength : undefined;
    };
    assert.equal(grade("CYP2C9"), "strong");
    assert.equal(grade("CYP3A4"), "moderate");
    assert.match(d.note ?? "", /Broad CYP induc\w+ .*strong 2C9, moderate 3A4/);
  }
});
