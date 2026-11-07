import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RECENT_TRAY_ROWS, paletteGroups, trayItem, type PaletteItem } from "./palette";
import type { TraySnapshot } from "./tray-history";

const snap = (ids: string[], ts = 1): TraySnapshot => ({ ids, ts });
const RECENT = [
  snap(["simvastatin", "clarithromycin"], 3),
  snap(["warfarin", "fluconazole", "sertraline", "amlodipine"], 2),
  snap(["tramadol"], 1),
];

test("a blank query leads with recent trays, newest first, then the usual groups", () => {
  const groups = paletteGroups("", RECENT);
  assert.deepEqual(groups.map((g) => g.label), ["Recent trays", "Go to", "Stations", "Pages"]);
  const trays = groups[0].items as Extract<PaletteItem, { kind: "tray" }>[];
  assert.deepEqual(trays.map((t) => t.ids), RECENT.map((r) => r.ids));
  assert.equal(trays[0].label, "Simvastatin · Clarithromycin");
  assert.match(trays[1].label, /\+2$/);
  assert.match(trays[2].hint, /^1 item · /);
});

test("no saved trays leaves the blank palette as it was", () => {
  assert.deepEqual(paletteGroups("", []).map((g) => g.label), ["Go to", "Stations", "Pages"]);
  assert.deepEqual(paletteGroups("", [snap([])]).map((g) => g.label), ["Go to", "Stations", "Pages"]);
});

test("a blank query caps the recent rows", () => {
  const many = Array.from({ length: 8 }, (_, i) => snap(["tramadol", ["sertraline", "warfarin", "amlodipine", "fluconazole", "paroxetine", "simvastatin", "clarithromycin", "pravastatin"][i]], i));
  assert.equal(paletteGroups("", many)[0].items.length, RECENT_TRAY_ROWS);
});

test("a query shows only trays with a matching item, by name or brand", () => {
  const byName = paletteGroups("warfarin", RECENT).find((g) => g.kind === "tray");
  assert.deepEqual(byName?.items.map((i) => i.id), [trayItem(RECENT[1]).id]);
  const byBrand = paletteGroups("zocor", RECENT).find((g) => g.kind === "tray");
  assert.deepEqual(byBrand?.items.map((i) => i.id), [trayItem(RECENT[0]).id]);
  assert.equal(paletteGroups("qt", RECENT).find((g) => g.kind === "tray"), undefined);
});

test("tray rows have unique, stable ids and say they load with default person factors", () => {
  const ids = RECENT.map((r) => trayItem(r).id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(trayItem(snap(["tramadol"], 1)).id, trayItem(snap(["tramadol"], 99)).id);
  for (const r of RECENT) assert.match(trayItem(r).hint, /default person factors · saved on this browser only/);
});

test("the palette reads recent trays on open and loads them through the store", () => {
  const src = readFileSync(new URL("../../components/desk/command-palette.tsx", import.meta.url), "utf8");
  assert.match(src, /setRecent\(readHistory\(\)\.recent\)/);
  assert.match(src, /desk\.load\(item\.ids/);
});
