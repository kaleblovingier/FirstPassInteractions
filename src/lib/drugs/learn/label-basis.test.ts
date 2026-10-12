import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { labelFor } from "../label-on-desk";
import { labelBasisCard } from "./label-basis";

test("labelBasisCard(ranolazine, phenobarbital) stores named", () => {
  const card = labelBasisCard("ranolazine", "phenobarbital");
  assert.ok(card);
  assert.equal(String(card.correct), "named");
  const row = labelFor("ranolazine", "phenobarbital");
  assert.ok(row);
  const nameA = DRUG_BY_ID[row.drugA].name;
  const nameB = DRUG_BY_ID[row.drugB].name;
  assert.equal(card.prompt, `${nameA} × ${nameB}.`);
  assert.equal(card.prompt.includes("named"), false);
});

test("labelBasisCard(ranolazine, primidone) stores class", () => {
  const card = labelBasisCard("ranolazine", "primidone");
  assert.ok(card);
  assert.equal(String(card.correct), "class");
});

test("labelBasisCard is null when the stored basis is missing", () => {
  assert.equal(labelBasisCard("simvastatin", "clarithromycin"), null);
  assert.equal(labelBasisCard("warfarin", "clarithromycin"), null);
});
