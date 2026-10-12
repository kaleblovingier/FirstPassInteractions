import test from "node:test";
import assert from "node:assert/strict";
import { deskLabelPlain, deskLabels, labelFor } from "./label-on-desk";
import { pairPageBySlug } from "../seo/pair-pages";

test("simvastatin and clarithromycin keep the stored Zocor line", () => {
  const row = labelFor("clarithromycin", "simvastatin");
  assert.ok(row);
  assert.equal(row.slug, "simvastatin-clarithromycin");
  assert.equal(row.labelSection, "4 CONTRAINDICATIONS");
  assert.equal(row.labelDrug, "Zocor (simvastatin)");
  assert.equal(row.labelClass, "contraindicated");
  assert.equal(row.source, "gold");
  assert.match(row.quote, /^Concomitant use of strong CYP3A4 inhibitors/);
  assert.match(row.example, /clarithromycin/);
  const page = pairPageBySlug(row.slug);
  assert.equal(page?.quote?.quote, row.quote);
  const plain = deskLabelPlain(["simvastatin", "clarithromycin"]);
  assert.match(plain, /Not a new finding/);
  assert.match(plain, /Simvastatin · Clarithromycin\./);
  assert.match(plain, /4 CONTRAINDICATIONS/);
  assert.equal(/\b\d+\s*mg\b/i.test(plain), false);
  assert.equal(deskLabels(["simvastatin", "clarithromycin", "warfarin"]).length, 1);
});

test("a pair with no stored label line is omitted", () => {
  assert.equal(labelFor("warfarin", "clarithromycin"), null);
  assert.equal(deskLabelPlain(["warfarin", "clarithromycin"]), "");
  assert.equal(deskLabels(["nope"]).length, 0);
});
