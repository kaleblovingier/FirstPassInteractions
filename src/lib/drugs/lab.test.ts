import test from "node:test";
import assert from "node:assert/strict";
import {
  LAB_ASSIGNMENTS,
  LAB_BY_ID,
  labNeedsPro,
  labReceiptCsv,
  sampleForLab,
  type LabReceipt,
} from "./lab.ts";
import { sampleNeedsPro } from "./samples.ts";

test("eight seeded lab assignments resolve to real samples", () => {
  assert.equal(LAB_ASSIGNMENTS.length, 8);
  for (const a of LAB_ASSIGNMENTS) {
    const sample = sampleForLab(a);
    assert.ok(sample, a.sampleId);
    assert.equal(LAB_BY_ID[a.id]?.id, a.id);
    assert.ok(a.prompt.length > 40);
  }
});

test("freeOk assignments do not need Pro host when sample is free", () => {
  for (const a of LAB_ASSIGNMENTS.filter((x) => x.freeOk)) {
    const sample = sampleForLab(a)!;
    assert.equal(sampleNeedsPro(sample), false, a.id);
    assert.equal(labNeedsPro(a), false, a.id);
  }
});

test("Pro-host assignments flag labNeedsPro", () => {
  assert.equal(labNeedsPro(LAB_BY_ID["dxm-2d6pm"]), true);
  assert.equal(labNeedsPro(LAB_BY_ID["smoke-clozapine"]), true);
});

test("labReceiptCsv includes disclaimer header and fields", () => {
  const receipt: LabReceipt = {
    assignmentId: "gf-oral-ketamine",
    title: "Grapefruit × oral ketamine",
    sampleId: "gf-oral-ketamine",
    drugs: ["Grapefruit", "Ketamine"],
    leadHeadline: "Grapefruit × Ketamine",
    studentText: "Line one. Line two. Line three.",
    ts: "2026-09-26T00:00:00.000Z",
    softwareVersion: "1.10.0",
    disclaimer: "educational",
  };
  const csv = labReceiptCsv(receipt);
  assert.match(csv, /educational only/i);
  assert.match(csv, /gf-oral-ketamine/);
  assert.match(csv, /Line one/);
});
