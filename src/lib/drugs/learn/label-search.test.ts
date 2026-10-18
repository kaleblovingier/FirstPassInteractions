import test from "node:test";
import assert from "node:assert/strict";
import { labelSearchCard } from "./label-search";

test("labelSearchCard reads a stored search that is not the catalog name", () => {
  const card = labelSearchCard("methadone", "ethanol");
  assert.ok(card);
  assert.equal(card.id, "qry-ethanol|methadone");
  assert.equal(card.correct, "methadone · alcohol");
  assert.equal(card.prompt, "Methadone × Ethanol.");
  assert.equal(String(card.prompt).toLowerCase().includes("alcohol"), false);
  assert.equal(card.choices?.length, 4);
  assert.equal(card.choices?.some((choice) => choice.id === "methadone · alcohol"), true);
  const brand = labelSearchCard("buprenorphine", "alprazolam");
  assert.equal(brand?.id, "qry-alprazolam|buprenorphine");
  assert.equal(brand?.correct, "suboxone · alprazolam");
  assert.equal(String(brand?.prompt).toLowerCase().includes("suboxone"), false);
});

test("labelSearchCard is null when the search is only the stored names", () => {
  assert.equal(labelSearchCard("simvastatin", "clarithromycin"), null);
  assert.equal(labelSearchCard("sodium-oxybate", "zolpidem"), null);
  assert.equal(labelSearchCard("warfarin", "clarithromycin"), null);
});
