import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, familyOf, searchDrugs } from "./catalog";
import { SAMPLE_REGIMENS } from "./samples";

function row(id: string) {
  const drug = DRUG_BY_ID[id];
  assert.ok(drug, `${id} is on the shelf`);
  return drug;
}

test("zavegepant is a gepant, not a serotonergic triptan", () => {
  const z = row("zavegepant");
  assert.equal(z.cls, row("rimegepant").cls.replace(/^Oral/, "Nasal"));
  assert.match(z.cls, /CGRP antagonist/);
  assert.doesNotMatch(z.cls, /triptan/i);
  assert.ok(!z.pd.includes("serotonergic"), "zavegepant should not carry the serotonergic flag");
  assert.doesNotMatch(z.toxicityHint ?? "", /vasoconstriction \(triptans\)/);
  assert.ok(z.enzymes.some((r) => r.enzyme === "CYP3A4" && r.kind === "substrate"));
});

test("ibrexafungerp is a triterpenoid glucan synthase inhibitor, not an azole or echinocandin", () => {
  const ib = row("ibrexafungerp");
  assert.match(ib.cls, /triterpenoid/i);
  assert.match(ib.cls, /glucan synthase/i);
  assert.doesNotMatch(ib.cls, /azole|echinocandin/i);
  assert.equal(familyOf(ib), "id");
});

test("tecovirimat and brincidofovir drop the copied acyclovir-family renal note", () => {
  for (const id of ["tecovirimat", "brincidofovir"]) {
    const hint = row(id).toxicityHint ?? "";
    assert.doesNotMatch(hint, /Renal \(acyclovir family\)/, `${id} still carries the acyclovir renal note`);
    assert.doesNotMatch(hint, /\bmg\b|\d+\s*(mg|mcg|g)\b/i, `${id} hint should not carry a dose`);
  }
  assert.match(row("brincidofovir").toxicityHint ?? "", /cidofovir/i);
});

test("acrylfentanyl text uses non-dosing naloxone framing", () => {
  const a = row("acrylfentanyl");
  const text = `${a.toxicityHint ?? ""} ${a.note ?? ""}`;
  assert.doesNotMatch(text, /repeat doses?/i);
  assert.doesNotMatch(text, /\bdoses?\b|\bmg\b|\bmcg\b/i);
  assert.match(a.toxicityHint ?? "", /more than one naloxone administration/);
});

test("flunitrazepam is on the shelf as a 3A4/2C19 benzodiazepine and searchable", () => {
  const f = row("flunitrazepam");
  assert.equal(f.cls, "Benzodiazepine");
  assert.ok(f.pd.includes("cns-depressant"));
  assert.ok(f.pd.includes("benzo-zdrug"));
  assert.ok(f.enzymes.some((r) => r.enzyme === "CYP3A4" && r.kind === "substrate"));
  assert.ok(f.enzymes.some((r) => r.enzyme === "CYP2C19" && r.kind === "substrate"));
  assert.equal(searchDrugs("flunitrazepam")[0]?.id, "flunitrazepam");
  assert.equal(searchDrugs("Rohypnol")[0]?.id, "flunitrazepam");
  assert.ok(searchDrugs("flunitraz").some((d) => d.id === "flunitrazepam"));
});

test("alfentanil + ritonavir sample pair is back and points at 3A4-mapped rows", () => {
  const s = SAMPLE_REGIMENS.find((x) => x.id === "alfentanil-ritonavir");
  assert.ok(s, "alfentanil-ritonavir sample missing");
  assert.deepEqual(s.drugIds, ["alfentanil", "ritonavir"]);
  assert.ok(row("alfentanil").enzymes.some((r) => r.enzyme === "CYP3A4" && r.kind === "substrate"));
});

test("CGRP monoclonal antibodies are not serotonergic triptans and keep their library family", () => {
  const targets: Record<string, RegExp> = {
    erenumab: /CGRP receptor/,
    fremanezumab: /CGRP ligand/,
    galcanezumab: /CGRP ligand/,
    eptinezumab: /CGRP ligand/,
  };
  for (const [id, target] of Object.entries(targets)) {
    const m = row(id);
    assert.equal(m.cls, "CGRP monoclonal antibody", `${id} class`);
    assert.doesNotMatch(m.cls, /triptan/i);
    assert.ok(!m.pd.includes("serotonergic"), `${id} should not carry the serotonergic flag`);
    assert.equal(m.enzymes.length, 0, `${id} is not CYP-metabolized`);
    const hint = m.toxicityHint ?? "";
    assert.match(hint, target, `${id} note names its target`);
    assert.match(hint, /not CYP-metabolized/);
    assert.doesNotMatch(hint, /vasoconstriction \(triptans\)|serotonin stack/i);
    assert.doesNotMatch(hint, /\bdoses?\b|\bmg\b|\bmcg\b/i);
    assert.equal(familyOf(m), "other", `${id} family unchanged`);
    assert.equal(searchDrugs(m.brands[0])[0]?.id, id, `${id} brand search`);
  }
  assert.ok(!searchDrugs("serotonin syndrome").some((d) => d.id in targets));
});
