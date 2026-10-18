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
  assert.equal(row.pinSentence, null);
  assert.equal(row.pinBasis, "named");
  assert.equal(row.retrieved, "2026-09-27");
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
  assert.equal(plain.includes("contraindications sentence"), false);
  assert.match(plain, /The pin stores this pair as named\. The label names the drug\. Not a new finding\./);
  assert.match(plain, /Retrieved 2026-09-27\. That date is not a new finding\./);
  assert.equal(row.scopeNote, null);
  assert.equal(plain.includes("Stored note:"), false);
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
  assert.equal(named.pinBasis, "named");
  assert.equal(
    named.pinSentence,
    "RANEXA is contraindicated in patients: … Taking inducers of CYP3A",
  );
  const namedPlain = deskLabelPlain(["ranolazine", "phenobarbital"]);
  assert.match(
    namedPlain,
    /The pin also stores this contraindications sentence: RANEXA is contraindicated in patients: … Taking inducers of CYP3A\. That sentence is not a new finding\./,
  );
  assert.equal(/\b\d+\s*mg\b/i.test(namedPlain), false);
  const klass = labelFor("ranolazine", "primidone");
  assert.ok(klass);
  assert.equal(klass.basis, "class");
  assert.equal(klass.pinBasis, "class");
  const bare = labelFor("darunavir", "grazoprevir-elbasvir");
  assert.ok(bare);
  assert.equal(bare.pinEnzyme, null);
  assert.equal(bare.pinKind, null);
  assert.equal(bare.pinSentence, null);
});

test("a gold line keeps a different pin contraindications sentence", () => {
  const row = labelFor("tizanidine", "fluvoxamine");
  assert.ok(row);
  assert.equal(row.source, "gold");
  assert.equal(row.mechanism, "PK");
  assert.equal(row.domain, "muscle-relaxant");
  assert.equal(row.basis, null);
  assert.equal(row.pinSentence, "Zanaflex is contraindicated in patients taking strong CYP1A2 inhibitors");
  assert.notEqual(row.pinSentence, row.quote);
  const plain = deskLabelPlain(["tizanidine", "fluvoxamine"]);
  assert.match(plain, /Concomitant use of Zanaflex/);
  assert.match(
    plain,
    /The pin also stores this contraindications sentence: Zanaflex is contraindicated in patients taking strong CYP1A2 inhibitors\. That sentence is not a new finding\./,
  );
  assert.match(plain, /Stored mechanism: PK\./);
  assert.match(plain, /Stored domain: muscle-relaxant\./);
  assert.equal(/\b\d+\s*mg\b/i.test(plain), false);
});

test("a scope note is shown and an engineering note stays off the check", () => {
  const shown = labelFor("methadone", "alprazolam");
  assert.ok(shown);
  assert.equal(shown.scopeNote, "Label names the class (benzodiazepines), not alprazolam specifically.");
  const plain = deskLabelPlain(["methadone", "alprazolam"]);
  assert.match(
    plain,
    /Stored note: Label names the class \(benzodiazepines\), not alprazolam specifically\. That note is not a new finding and not an instruction\./,
  );
  assert.equal(/\b\d+\s*mg\b/i.test(plain), false);
  const hidden = labelFor("methadone", "rifampin");
  assert.ok(hidden);
  assert.equal(hidden.scopeNote, null);
  assert.equal(deskLabelPlain(["methadone", "rifampin"]).includes("supported floor"), false);
  const pah = labelFor("darunavir", "sildenafil-pah");
  assert.ok(pah);
  assert.equal(pah.scopeNote, null);
  assert.equal(deskLabelPlain(["darunavir", "sildenafil-pah"]).includes("erectile"), false);
  assert.equal(labelFor("paxlovid", "lovastatin")?.scopeNote, null);
  assert.equal(deskLabelPlain(["paxlovid", "lovastatin"]).includes("paused"), false);
  assert.equal(labelFor("methadone", "ondansetron")?.scopeNote, null);
  assert.equal(deskLabelPlain(["methadone", "ondansetron"]).includes("evaluate-and-monitor"), false);
  const qt = labelFor("levoketoconazole", "bosutinib");
  assert.equal(
    qt?.scopeNote,
    "Table 6 row: CYP3A4 or CYP3A4 and P-gp substrates that may prolong QT. Section 4 contraindicates drugs that cause QT prolongation associated with ventricular arrhythmias.",
  );
});
