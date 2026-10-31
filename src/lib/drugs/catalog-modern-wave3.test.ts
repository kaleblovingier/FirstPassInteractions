import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS, normalizeSearchText } from "./catalog.ts";
import { MODERN_WAVE3_FORMULARY } from "./catalog-modern-wave3.ts";
import { ENZYMES } from "./types.ts";
import type { PdFlag } from "./types.ts";

// Wave3 is not wired into catalog.ts yet (a separate step merges it into the
// main DRUGS export), so this file does not assert anything that depends on
// that merge — e.g. it never calls searchDrugs() expecting a wave3 hit. It
// validates the wave3 array on its own terms and checks it for collisions
// against the catalog as it exists today.

const WAVE3_IDS = [
  "lecanemab",
  "donanemab",
  "aficamten",
  "etripamil",
  "lerodalcibep",
  "zoliflodacin",
  "tradipitant",
] as const;

/**
 * xanomeline-trospium (Cobenfy) was researched and dropped: the catalog
 * already carries it twice under catalog-clinic.ts (ids "xanomeline-trospium"
 * and "cobenfy"), invisible to a `d("...")`-pattern grep because that file
 * uses a plain array-literal row format. Earlier row wins — see the
 * collision test below, which caught this live.
 */

/** Mirrors the PdFlag union in ./types.ts — kept in sync by hand. */
const VALID_PD_FLAGS: readonly PdFlag[] = [
  "serotonergic", "maoi", "cns-depressant", "opioid", "partial-opioid", "benzo-zdrug",
  "qt-known", "qt-possible", "anticoagulant", "antiplatelet", "nsaid", "ssri-snri",
  "hypoglycemic", "insulin-secretagogue", "acei-arb", "k-sparing", "loop-thiazide",
  "anticholinergic", "bradycardic", "ndhp-ccb", "beta-blocker", "nitrate", "pde5",
  "alpha-blocker", "statin", "fibrate", "nephrotoxic", "seizure-lowering", "hepatotoxic",
  "immunosuppressant", "dissociative", "psychedelic", "stimulant", "cannabinoid",
  "opioid-antagonist", "alcohol", "ghb", "tyramine", "fat-meal", "sodium-load",
  "sodium-restriction", "urinary-acid", "urinary-alkaline", "tryptophan", "alpha2-agonist",
  "hypokalemic", "oatp-block", "protein-load", "polyphenol-drink", "histamine", "enteral",
  "vitk-food", "k-food", "fed-boost", "empty-stomach",
];

const VALID_SENSITIVITY = ["sensitive", "major", "minor"];
const VALID_STRENGTH = ["strong", "moderate", "weak"];
const VALID_KIND = ["drug", "food", "herb", "research-peptide"];

function searchKeys(drug: { id: string; name: string; brands: string[]; aliases: string[] }): string[] {
  return [...new Set([drug.id, drug.name, ...drug.brands, ...drug.aliases].map(normalizeSearchText).filter(Boolean))];
}

test("wave3 formulary has exactly the expected ids, one row each", () => {
  assert.equal(MODERN_WAVE3_FORMULARY.length, WAVE3_IDS.length);
  const ids = MODERN_WAVE3_FORMULARY.map((row) => row.id);
  assert.deepEqual([...ids].sort(), [...WAVE3_IDS].sort());
  assert.equal(new Set(ids).size, ids.length, "duplicate id within wave3 itself");
});

test("wave3 rows satisfy the Drug / EnzymeRole / PdFlag schema", () => {
  for (const row of MODERN_WAVE3_FORMULARY) {
    assert.ok(/^[a-z0-9-]+$/.test(row.id), `${row.id} is not a clean lowercase id`);
    assert.ok(row.name.length > 0, `${row.id} missing name`);
    assert.ok(Array.isArray(row.brands), `${row.id} brands not an array`);
    assert.ok(Array.isArray(row.aliases), `${row.id} aliases not an array`);
    assert.ok(row.cls.length > 0, `${row.id} missing class`);
    assert.ok(row.toxicityHint.length > 0, `${row.id} missing toxicityHint`);
    assert.ok(VALID_KIND.includes(row.kind), `${row.id} invalid kind ${row.kind}`);

    for (const role of row.enzymes) {
      assert.ok((ENZYMES as readonly string[]).includes(role.enzyme), `${row.id} invalid enzyme ${role.enzyme}`);
      if (role.kind === "substrate") {
        assert.ok(VALID_SENSITIVITY.includes(role.sensitivity), `${row.id} invalid sensitivity for ${role.enzyme}`);
        assert.ok(role.pathway === "clearance" || role.pathway === "activation", `${row.id} invalid pathway for ${role.enzyme}`);
      } else if (role.kind === "inhibitor" || role.kind === "inducer") {
        assert.ok(VALID_STRENGTH.includes(role.strength), `${row.id} invalid strength for ${role.enzyme}`);
      } else {
        assert.fail(`${row.id} has an unrecognized enzyme role kind`);
      }
    }

    for (const flag of row.pd) {
      assert.ok(VALID_PD_FLAGS.includes(flag), `${row.id} invalid pd flag ${flag}`);
    }
  }
});

test("wave3 rows each cite real label sourcing in their note", () => {
  for (const row of MODERN_WAVE3_FORMULARY) {
    assert.ok(row.note && row.note.length > 40, `${row.id} missing a sourced note`);
    assert.match(row.note ?? "", /label|prescribing information|medical affairs/i, `${row.id} note doesn't point to a source`);
  }
});

test("wave3 rows share no id, name, brand, or alias with the existing catalog", () => {
  // By the time this runs, the integration step has wired MODERN_WAVE3_FORMULARY
  // into DRUGS/DRUG_BY_ID itself, so comparing a wave3 row directly against
  // DRUGS would just find its own merged copy. Rebuild the pre-merge baseline
  // by excluding wave3's own ids/objects, so this still catches a REAL
  // collision against anything else in the catalog (and a dropped-on-merge
  // row, via the object-identity check below), the way it did before wiring.
  const wave3Ids = new Set(MODERN_WAVE3_FORMULARY.map((d) => d.id));
  const owner = new Map<string, string>();
  for (const drug of DRUGS) {
    if (wave3Ids.has(drug.id)) continue;
    for (const key of searchKeys(drug)) {
      if (!owner.has(key)) owner.set(key, drug.id);
    }
  }
  const seen = new Map<string, string>();
  for (const row of MODERN_WAVE3_FORMULARY) {
    assert.equal(DRUG_BY_ID[row.id], row, `${row.id} collided on merge — something else already owns this id`);
    for (const key of searchKeys(row)) {
      assert.ok(!owner.has(key), `${row.id} key "${key}" already belongs to ${owner.get(key)}`);
      assert.ok(!seen.has(key) || seen.get(key) === row.id, `${row.id} key "${key}" repeats ${seen.get(key)}`);
      seen.set(key, row.id);
    }
  }
});

test("label-sourced specifics hold for the antibodies, aficamten, zoliflodacin, and lerodalcibep", () => {
  const byId = new Map(MODERN_WAVE3_FORMULARY.map((row) => [row.id, row] as const));

  const lecanemab = byId.get("lecanemab")!;
  assert.equal(lecanemab.enzymes.length, 0, "lecanemab is degraded by proteolysis, not CYP-metabolized");

  const donanemab = byId.get("donanemab")!;
  assert.equal(donanemab.enzymes.length, 0, "donanemab is degraded by proteolysis, not CYP-metabolized");

  const aficamten = byId.get("aficamten")!;
  assert.ok(aficamten.enzymes.some((r) => r.kind === "substrate" && r.enzyme === "CYP2C9"), "Myqorzo 12.3: primary pathway is CYP2C9");
  assert.ok(
    aficamten.enzymes.every((r) => r.kind === "substrate"),
    "Myqorzo label: aficamten does not inhibit or induce CYP at clinically relevant concentrations",
  );

  const zoliflodacin = byId.get("zoliflodacin")!;
  assert.ok(
    zoliflodacin.enzymes.some((r) => r.kind === "substrate" && r.enzyme === "CYP3A4" && r.sensitivity === "major"),
    "Nuzolvence 12.3: CYP3A4 carries 68% of clearance",
  );
  assert.ok(
    zoliflodacin.enzymes.every((r) => r.enzyme !== "P-gp"),
    "Nuzolvence names P-gp and BCRP with no potency word, so no P-gp grade is stored",
  );
  assert.match(zoliflodacin.note ?? "", /unlikely to translate to a clinically significant safety risk/);
  assert.doesNotMatch(zoliflodacin.note ?? "", /well above anticipated unbound plasma levels/);

  const aficamtenNote = byId.get("aficamten")!.note ?? "";
  assert.match(aficamtenNote, /not expected to induce CYP1A2, CYP2B6, or CYP3A4/);
  assert.match(aficamtenNote, /does not say it is not expected to induce CYP2C8, CYP2C19, or CYP2D6/);
  assert.doesNotMatch(aficamtenNote, /built around CYP3A/);
  assert.doesNotMatch(aficamtenNote, /induce CYP1A2\/2B6\/2C8/);

  const lerodalcibep = byId.get("lerodalcibep")!;
  assert.equal(lerodalcibep.enzymes.length, 0, "Lerochol 12.3: degrades to peptides, no CYP role, no formal DDI studies");
});
