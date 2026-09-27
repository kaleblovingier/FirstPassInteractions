import test from "node:test";
import assert from "node:assert/strict";
import {
  PACKS,
  applyPermalink,
  buildBriefUrl,
  buildCaseUrl,
  buildLabPermalink,
  buildPackUrl,
  flipKetamineRoute,
  parseBriefIds,
  parsePermalink,
} from "./permalinks.ts";
import { LAB_ASSIGNMENTS, labNeedsPro } from "./lab.ts";
import { sampleNeedsPro } from "./samples.ts";

test("parses case permalink and resolves sample load payload", () => {
  const resolved = parsePermalink("?case=gf-oral-ketamine");
  assert.equal(resolved.kind, "case");
  assert.equal(resolved.caseId, "gf-oral-ketamine");
  assert.deepEqual(resolved.ids, ["grapefruit", "ketamine"]);
  assert.equal(resolved.extras.ketamineRoute, "oral");
});

test("legacy sample= alias still resolves", () => {
  const resolved = parsePermalink("sample=ketamine-benzo");
  assert.equal(resolved.kind, "case");
  assert.equal(resolved.caseId, "ketamine-benzo");
});

test("pack loads first case and keeps pack id", () => {
  const resolved = parsePermalink("?pack=clinic-onboard");
  assert.equal(resolved.kind, "pack");
  assert.equal(resolved.packId, "clinic-onboard");
  assert.equal(resolved.caseId, PACKS["clinic-onboard"].caseIds[0]);
  assert.ok(resolved.ids.length >= 2);
});

test("pack + case picks that case inside the pack", () => {
  const resolved = parsePermalink("?pack=mat-cup&case=naltrexone-opioid");
  assert.equal(resolved.caseId, "naltrexone-opioid");
  assert.equal(resolved.packId, "mat-cup");
});

test("flip=1 inverts ketamine route", () => {
  const resolved = parsePermalink("?case=gf-oral-ketamine&flip=1");
  assert.equal(resolved.extras.ketamineRoute, "iv");
  assert.equal(flipKetamineRoute("iv"), "oral");
  assert.equal(flipKetamineRoute("in"), "iv");
});

test("buildCaseUrl and buildPackUrl use case/pack params", () => {
  const caseUrl = buildCaseUrl("gf-oral-ketamine", { base: "https://example.test/" });
  assert.equal(caseUrl, "https://example.test/?case=gf-oral-ketamine");
  const packUrl = buildPackUrl("mat-cup", { base: "https://example.test", caseId: "bromazolam-oxy" });
  assert.match(packUrl, /pack=mat-cup/);
  assert.match(packUrl, /case=bromazolam-oxy/);
});

test("teaching packs stay free-friendly", () => {
  for (const pack of Object.values(PACKS)) {
    for (const id of pack.caseIds) {
      const sample = parsePermalink(`?case=${id}`).sample;
      assert.ok(sample, id);
      assert.equal(sampleNeedsPro(sample!), false, `${id} should not require Pro host extras`);
    }
  }
});

test("applyPermalink calls load once", () => {
  let calls = 0;
  const resolved = applyPermalink((ids, extras) => {
    calls += 1;
    assert.ok(ids.length > 0);
    assert.ok(extras);
    return true;
  }, "?pack=clinic-onboard");
  assert.equal(calls, 1);
  assert.equal(resolved.kind, "pack");
});

test("lab permalink loads sample and marks study intent", () => {
  const resolved = parsePermalink("?lab=gf-oral-ketamine");
  assert.equal(resolved.kind, "lab");
  assert.equal(resolved.labId, "gf-oral-ketamine");
  assert.equal(resolved.caseId, "gf-oral-ketamine");
  assert.deepEqual(resolved.ids, ["grapefruit", "ketamine"]);
  assert.equal(resolved.extras.ketamineRoute, "oral");
  assert.ok(resolved.assignment);
});

test("lab Beers assignment maps to clinic sample", () => {
  const resolved = parsePermalink("?lab=beers-lorazepam");
  assert.equal(resolved.kind, "lab");
  assert.equal(resolved.labId, "beers-lorazepam");
  assert.equal(resolved.caseId, "safety-clozapine-lorazepam");
  assert.deepEqual(resolved.ids, ["clozapine", "lorazepam"]);
});

test("buildLabPermalink sets lab param", () => {
  const url = buildLabPermalink("tacrolimus-gf", { base: "https://example.test/" });
  assert.equal(url, "https://example.test/?lab=tacrolimus-gf");
});

test("lab seed mixes free and Pro-host assignments", () => {
  assert.equal(LAB_ASSIGNMENTS.length, 8);
  const free = LAB_ASSIGNMENTS.filter((a) => a.freeOk && !labNeedsPro(a));
  const pro = LAB_ASSIGNMENTS.filter((a) => labNeedsPro(a));
  assert.ok(free.length >= 4, "enough free assignments");
  assert.ok(pro.length >= 2, "enough Pro-host assignments");
});

test("brief permalink loads catalog ids and stays kind brief", () => {
  const resolved = parsePermalink("?brief=ketamine,alprazolam");
  assert.equal(resolved.kind, "brief");
  assert.deepEqual(resolved.ids, ["ketamine", "alprazolam"]);
  assert.equal(resolved.sample, null);
  assert.equal(resolved.caseId, null);
});

test("brief ignores unknown and virtual ids", () => {
  assert.deepEqual(parseBriefIds("ketamine,__smoke,not-a-drug,alprazolam"), ["ketamine", "alprazolam"]);
});

test("lab beats brief when both present", () => {
  const resolved = parsePermalink("?lab=gf-oral-ketamine&brief=ketamine,alprazolam");
  assert.equal(resolved.kind, "lab");
});

test("case beats brief when both present", () => {
  const resolved = parsePermalink("?case=ketamine-benzo&brief=ketamine");
  assert.equal(resolved.kind, "case");
});

test("buildBriefUrl sets brief param", () => {
  const url = buildBriefUrl(["ketamine", "alprazolam"], { base: "https://example.test/" });
  assert.equal(url, "https://example.test/?brief=ketamine%2Calprazolam");
});

test("applyPermalink loads brief ids", () => {
  let loaded: string[] = [];
  const resolved = applyPermalink((ids) => {
    loaded = ids;
    return true;
  }, "?brief=ketamine,alprazolam");
  assert.equal(resolved.kind, "brief");
  assert.deepEqual(loaded, ["ketamine", "alprazolam"]);
});

test("pharmd pack loads first free teaching case", () => {
  const resolved = parsePermalink("?pack=pharmd");
  assert.equal(resolved.kind, "pack");
  assert.equal(resolved.packId, "pharmd");
  assert.equal(resolved.caseId, PACKS.pharmd.caseIds[0]);
  assert.equal(resolved.caseId, "gf-oral-ketamine");
  assert.ok(resolved.ids.length >= 2);
});

test("pharmd pack cases stay free-friendly", () => {
  assert.equal(PACKS.pharmd.title, "PharmD lab");
  for (const id of PACKS.pharmd.caseIds) {
    const sample = parsePermalink(`?case=${id}`).sample;
    assert.ok(sample, id);
    assert.equal(sampleNeedsPro(sample!), false, `${id} should not require Pro host extras`);
  }
});
