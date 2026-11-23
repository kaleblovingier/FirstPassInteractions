import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUG_BY_ID } from "./catalog.ts";
import {
  NPS_DESIGNER_BENZO_IDS,
  NPS_FAMILIES,
  NPS_HHC_IDS,
  NPS_NITAZENE_IDS,
  NPS_ORPHINE_IDS,
  NPS_STREET_OPIOID_IDS,
  NPS_WATCH,
  NPS_WATCH_BY_ID,
  npsByFamily,
  npsWatchOnDesk,
} from "./nps-watch.ts";
import { findDoses } from "../guards/dose-rule.ts";

test("NPS_WATCH contains all 27 emerging forensic surveillance compounds and every ID exists in DRUG_BY_ID", () => {
  assert.equal(NPS_WATCH.length, 27);
  const seen = new Set<string>();
  for (const entry of NPS_WATCH) {
    assert.equal(seen.has(entry.id), false, `duplicate NPS_WATCH id: ${entry.id}`);
    seen.add(entry.id);
    assert.equal(Object.hasOwn(DRUG_BY_ID, entry.id), true, `missing ${entry.id} in DRUG_BY_ID`);
    assert.ok(entry.agencies.length >= 1, `missing agencies on ${entry.id}`);
    assert.ok(entry.assayBlindSpot.length > 20, `assayBlindSpot too short on ${entry.id}`);
    assert.ok(entry.naloxoneNote.length > 20, `naloxoneNote too short on ${entry.id}`);
    assert.ok(entry.watchNote.length > 20, `watchNote too short on ${entry.id}`);
  }
  assert.equal(Object.keys(NPS_WATCH_BY_ID).length, 27);
});

test("NPS family counts and ID sets match the 2025-2026 forensic breakdown", () => {
  assert.equal(npsByFamily("all").length, 27);
  assert.equal(npsByFamily("orphine").length, 7);
  assert.equal(npsByFamily("nitazene").length, 8);
  assert.equal(npsByFamily("designer-benzo").length, 4);
  assert.equal(npsByFamily("hhc").length, 4);
  assert.equal(npsByFamily("alpha2").length, 1);
  assert.equal(npsByFamily("kratom-alkaloid").length, 1);
  assert.equal(npsByFamily("dissociative").length, 2);

  const sumByFamily = NPS_FAMILIES.reduce((acc, f) => acc + npsByFamily(f.id).length, 0);
  assert.equal(sumByFamily, 27);

  assert.equal(NPS_ORPHINE_IDS.size, 7);
  assert.equal(NPS_NITAZENE_IDS.size, 13);
  assert.equal(NPS_DESIGNER_BENZO_IDS.size, 10);
  assert.equal(NPS_HHC_IDS.size, 4);
  assert.equal(NPS_STREET_OPIOID_IDS.size, 21);

  for (const id of [
    ...NPS_ORPHINE_IDS,
    ...NPS_NITAZENE_IDS,
    ...NPS_DESIGNER_BENZO_IDS,
    ...NPS_HHC_IDS,
    ...NPS_STREET_OPIOID_IDS,
  ]) {
    assert.equal(Object.hasOwn(DRUG_BY_ID, id), true, `set member ${id} missing from DRUG_BY_ID`);
  }
});

test("npsWatchOnDesk preserves desk order and ignores non-watch or duplicate ids", () => {
  const found = npsWatchOnDesk(["sertraline", "cychlorphine", "medetomidine", "cychlorphine", "hhc-o"]);
  assert.deepEqual(
    found.map((e) => e.id),
    ["cychlorphine", "medetomidine", "hhc-o"],
  );
});

test("nps-watch.ts contains zero administered dose patterns", () => {
  const src = readFileSync(new URL("./nps-watch.ts", import.meta.url), "utf8");
  assert.deepEqual(findDoses(src), []);
});
