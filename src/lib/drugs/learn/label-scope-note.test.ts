import test from "node:test";
import assert from "node:assert/strict";
import { labelScopeNoteCard } from "./label-scope-note";

const BENZO = "Label names the class (benzodiazepines), not alprazolam specifically.";
const RECORLEV =
  "Table 6 row: CYP3A4 or CYP3A4 and P-gp substrates that may prolong QT. Section 4 contraindicates drugs that cause QT prolongation associated with ventricular arrhythmias.";

test("labelScopeNoteCard reads a stored scope note", () => {
  const card = labelScopeNoteCard("methadone", "alprazolam");
  assert.ok(card);
  assert.equal(card.id, "snote-alprazolam|methadone");
  assert.equal(card.correct, BENZO);
  assert.equal(card.prompt, "Methadone × Alprazolam.");
  assert.equal(String(card.prompt).includes(BENZO), false);
  assert.equal(card.choices?.length, 4);
  assert.equal(card.choices?.some((choice) => choice.id === BENZO), true);
  const qt = labelScopeNoteCard("levoketoconazole", "bosutinib");
  assert.equal(qt?.id, "snote-bosutinib|levoketoconazole");
  assert.equal(qt?.correct, RECORLEV);
  assert.equal(qt?.prompt, "Levoketoconazole × Bosutinib.");
  assert.equal(String(qt?.prompt).includes("QT"), false);
});

test("labelScopeNoteCard is null for an engineering note or no note", () => {
  assert.equal(labelScopeNoteCard("methadone", "rifampin"), null);
  assert.equal(labelScopeNoteCard("darunavir", "sildenafil-pah"), null);
  assert.equal(labelScopeNoteCard("paxlovid", "lovastatin"), null);
  assert.equal(labelScopeNoteCard("methadone", "ondansetron"), null);
  assert.equal(labelScopeNoteCard("simvastatin", "clarithromycin"), null);
  assert.equal(labelScopeNoteCard("warfarin", "clarithromycin"), null);
});
