import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DAILY_LANES,
  FREE_CAP,
  caseOfTheDay,
  dailyCasePool,
  localDayNumber,
} from "./case-of-the-day.ts";
import { parsePermalink } from "./permalinks.ts";
import { DRUG_BY_ID } from "./catalog.ts";
import { SAMPLE_REGIMENS, sampleNeedsPro, type SampleRegimen } from "./samples.ts";

test("every daily case works on the free desk", () => {
  const pool = dailyCasePool();
  assert.ok(pool.length >= 10, `pool too small: ${pool.length}`);
  for (const s of pool) {
    assert.ok(DAILY_LANES.includes(s.lane), `${s.id} lane ${s.lane}`);
    assert.equal(sampleNeedsPro(s), false, `${s.id} needs founding host factors`);
    assert.ok(s.drugIds.length >= 2 && s.drugIds.length <= FREE_CAP, `${s.id} size`);
    for (const id of s.drugIds) assert.ok(DRUG_BY_ID[id], `${s.id}: unknown drug ${id}`);
  }
});

test("street and entactogen cases never headline the daily slot", () => {
  const ids = new Set(dailyCasePool().map((s) => s.id));
  for (const s of SAMPLE_REGIMENS) {
    if (s.lane === "street" || s.lane === "entactogen") assert.ok(!ids.has(s.id), s.id);
  }
});

test("same local day gives the same case; the next day advances through the pool", () => {
  const morning = new Date(2026, 9, 11, 0, 5);
  const night = new Date(2026, 9, 11, 23, 55);
  assert.equal(caseOfTheDay(morning)?.id, caseOfTheDay(night)?.id);
  const pool = dailyCasePool();
  const today = caseOfTheDay(morning)!;
  const tomorrow = caseOfTheDay(new Date(2026, 9, 12, 12))!;
  const i = pool.findIndex((s) => s.id === today.id);
  assert.equal(tomorrow.id, pool[(i + 1) % pool.length].id);
});

test("rotation covers the whole pool before repeating", () => {
  const pool = dailyCasePool();
  const seen = new Set<string>();
  for (let d = 0; d < pool.length; d++) seen.add(caseOfTheDay(new Date(2026, 0, 1 + d, 12))!.id);
  assert.equal(seen.size, pool.length);
});

test("local day number ignores time of day and survives DST", () => {
  assert.equal(
    localDayNumber(new Date(2026, 2, 8, 0, 1)) + 1,
    localDayNumber(new Date(2026, 2, 9, 23, 59)),
  );
  assert.equal(
    localDayNumber(new Date(2026, 10, 1, 0, 30)) + 1,
    localDayNumber(new Date(2026, 10, 2, 0, 30)),
  );
});

test("empty pool returns null instead of throwing", () => {
  const onlyPro: SampleRegimen[] = [
    { id: "x", title: "x", blurb: "x", drugIds: ["ketamine", "alprazolam"], lane: "clinic", smoking: true },
  ];
  assert.equal(caseOfTheDay(new Date(), onlyPro), null);
});

test("?case=today resolves to the case of the day and stays free", () => {
  const now = new Date(2026, 9, 11, 9);
  const expected = caseOfTheDay(now)!;
  const resolved = parsePermalink("?case=today", now);
  assert.equal(resolved.kind, "case");
  assert.equal(resolved.caseId, expected.id);
  assert.deepEqual(resolved.ids, expected.drugIds);
  assert.equal(sampleNeedsPro(resolved.sample!), false);
});

test("?case=today inside a pack falls back to the pack's first case", () => {
  const resolved = parsePermalink("?pack=mat-cup&case=today", new Date(2026, 9, 11));
  assert.equal(resolved.kind, "pack");
  assert.equal(resolved.caseId, "xylazine-fentanyl");
});

test("desk empty state shows the case of the day with a copyable link", async () => {
  const app = await readFile(new URL("../../components/desk/app.tsx", import.meta.url), "utf8");
  assert.match(app, /caseOfTheDay\(/);
  assert.match(app, /Case of the day/);
  assert.match(app, /<CopyCaseLink sampleId=\{daily\.id\}/);
});
