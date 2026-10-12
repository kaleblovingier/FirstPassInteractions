import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import { alsoOnLabel, deskLabelPlain, deskLabels, labelFor, otherLineCount } from "./label-on-desk";
import { pairPageBySlug } from "../seo/pair-pages";

test("simvastatin and clarithromycin keep the stored Zocor line", () => {
  const row = labelFor("clarithromycin", "simvastatin");
  assert.ok(row);
  assert.equal(row.slug, "simvastatin-clarithromycin");
  assert.equal(row.labelSection, "4 CONTRAINDICATIONS");
  assert.equal(row.labelDrug, "Zocor (simvastatin)");
  assert.equal(row.labelClass, "contraindicated");
  assert.equal(row.mechanism, "PK");
  assert.equal(row.domain, "statins");
  assert.equal(row.basis, null);
  assert.equal(row.pinEnzyme, "CYP3A4");
  assert.equal(row.pinKind, "inhibitor");
  assert.equal(row.source, "gold");
  assert.equal(otherLineCount("simvastatin", "clarithromycin"), 2);
  assert.match(row.quote, /^Concomitant use of strong CYP3A4 inhibitors/);
  assert.match(row.example, /clarithromycin/);
  const page = pairPageBySlug(row.slug);
  assert.equal(page?.quote?.quote, row.quote);
  const plain = deskLabelPlain(["simvastatin", "clarithromycin"]);
  assert.match(plain, /Not a new finding/);
  assert.match(plain, /Simvastatin · Clarithromycin\./);
  assert.match(plain, /4 CONTRAINDICATIONS/);
  assert.match(plain, /Also stored on Zocor \(simvastatin\), not on this desk: /);
  assert.match(plain, new RegExp(DRUG_BY_ID.itraconazole.name));
  assert.match(plain, new RegExp(DRUG_BY_ID.ritonavir.name));
  assert.match(plain, /Not a suggestion to add them/);
  assert.match(plain, /Stored mechanism: PK\./);
  assert.match(plain, /Stored domain: statins\./);
  assert.match(plain, /The pin stores CYP3A4 as an inhibitor\. That enzyme is not a new finding\./);
  assert.equal(/\b\d+\s*mg\b/i.test(plain), false);
  assert.equal(deskLabels(["simvastatin", "clarithromycin", "warfarin"]).length, 1);
  const others = alsoOnLabel(["simvastatin", "clarithromycin"]);
  assert.deepEqual(others, [
    {
      labelDrug: "Zocor (simvastatin)",
      names: [DRUG_BY_ID.itraconazole.name, DRUG_BY_ID.ritonavir.name].sort((a, b) => a.localeCompare(b)),
    },
  ]);
  assert.equal(alsoOnLabel(["simvastatin", "clarithromycin", "itraconazole", "ritonavir"]).length, 0);
});

test("a pair with no stored label line is omitted", () => {
  assert.equal(labelFor("warfarin", "clarithromycin"), null);
  assert.equal(otherLineCount("warfarin", "clarithromycin"), null);
  assert.equal(deskLabelPlain(["warfarin", "clarithromycin"]), "");
  assert.equal(deskLabels(["nope"]).length, 0);
});

test("a pin-only line keeps its stored basis and no gold mechanism", () => {
  const named = labelFor("ranolazine", "phenobarbital");
  assert.ok(named);
  assert.equal(named.basis, "named");
  assert.equal(named.mechanism, null);
  assert.equal(named.domain, null);
  assert.equal(named.pinEnzyme, "CYP3A4");
  assert.equal(named.pinKind, "inducer");
  const klass = labelFor("ranolazine", "primidone");
  assert.ok(klass);
  assert.equal(klass.basis, "class");
  const bare = labelFor("darunavir", "grazoprevir-elbasvir");
  assert.ok(bare);
  assert.equal(bare.pinEnzyme, null);
  assert.equal(bare.pinKind, null);
});
