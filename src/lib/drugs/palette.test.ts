import { test } from "node:test";
import assert from "node:assert/strict";
import { searchDrugs } from "./catalog";
import { DESK_VIEWS, PALETTE_PAGES, isPaletteShortcut, paletteGroups, pinnedItem, type PaletteItem } from "./palette";
import { CLINICAL_TAB_IDS, STATION_LABELS, groupStations } from "./station-groups";
import type { TraySnapshot } from "./tray-history";

const ids = (query: string, kind: PaletteItem["kind"]) =>
  paletteGroups(query).find((g) => g.kind === kind)?.items.map((i) => i.id) ?? [];

test("lists every station on the board once, with the picker's name", () => {
  const stations = paletteGroups("").find((g) => g.kind === "station")?.items ?? [];
  const seen = stations.map((s) => s.id);
  assert.equal(new Set(seen).size, seen.length);
  // CLINICAL_TAB_IDS also holds ids with no board station yet; those stay out of the palette.
  assert.deepEqual([...seen].sort(), Object.keys(STATION_LABELS).sort());
  for (const s of stations) {
    assert.ok((CLINICAL_TAB_IDS as readonly string[]).includes(s.id), s.id);
    assert.ok(s.label.trim(), s.id);
    assert.equal(s.label, STATION_LABELS[s.id as keyof typeof STATION_LABELS]);
  }
});

test("a blank query lists views, stations and pages in their usual order, and no drugs", () => {
  const stationOrder = groupStations(Object.entries(STATION_LABELS).map(([id, label]) => ({ id, label }))).flatMap(
    (g) => g.tabs.map((t) => t.id),
  );
  for (const q of ["", "   ", " & "]) {
    const groups = paletteGroups(q);
    assert.deepEqual(groups.map((g) => g.label), ["Go to", "Stations", "Pages"], q);
    assert.deepEqual(groups[0].items.map((i) => i.label), DESK_VIEWS.map(([, label]) => label));
    assert.deepEqual(groups[1].items.map((i) => i.id), stationOrder);
    assert.deepEqual(groups[2].items.map((i) => i.id), PALETTE_PAGES.map((p) => p.href));
  }
});

test("ranks an exact name first, then names that start with the query, then keyword matches", () => {
  assert.deepEqual(ids("pheno", "station").slice(0, 2), ["pheno", "phenobarbital"]);
  // "Opioid Rotation" starts with the query; the rest match on the group name or an alias.
  assert.deepEqual(ids("opioid", "station"), ["rotation", "otp", "moud", "hr", "mme", "uds", "toxicology", "apap", "reversal"]);
  assert.deepEqual(ids("learn", "view"), ["study"]);
});

test("finds stations by alias or group name, and views by their desk name", () => {
  assert.deepEqual(ids("torsades", "station"), ["qt"]);
  assert.deepEqual(ids("warfarin", "station"), ["inr"]);
  assert.deepEqual(ids("serotonin", "station"), ["hunter"]);
  assert.deepEqual(ids("heart & rhythm", "station"), ["qt", "antiarrhythmic", "digoxin", "af", "vasoactive"]);
  assert.deepEqual(ids("study", "view"), ["study"]);
  assert.deepEqual(ids("atlas", "view"), ["atlas"]);
  assert.deepEqual(ids("recall", "page"), ["/practice"]);
});

test("puts the group with the best match first", () => {
  const first = (q: string) => paletteGroups(q)[0];
  // The drug's own name beats INR's "Warfarin" alias.
  assert.equal(first("warfarin").label, "Add to tray");
  assert.equal(first("warfarin").items[0].id, "warfarin");
  // The QT station's name beats the QT drugs the desk search lists.
  assert.equal(first("qt").label, "Stations");
  // Keyword matches on both sides: stations come before drugs.
  assert.equal(first("torsades").label, "Stations");
  assert.ok(ids("torsades", "drug").length > 0);
  assert.equal(first("desk").items[0].id, "desk");
  assert.equal(first("practice").items[0].id, "/practice");
});

test("drug rows are the desk search's own rows, so brands, salts and abbreviations work", () => {
  for (const q of ["coumadin", "zofran", "metformin hcl", "apap", "torsades"]) {
    assert.deepEqual(ids(q, "drug"), searchDrugs(q).slice(0, 8).map((d) => d.id), q);
  }
  assert.equal(ids("coumadin", "drug")[0], "warfarin");
  assert.equal(ids("zofran", "drug")[0], "ondansetron");
  assert.equal(ids("metformin hcl", "drug")[0], "metformin");
  assert.equal(ids("apap", "drug")[0], "acetaminophen");
  assert.deepEqual(paletteGroups("xylophone"), []);
});

test("the shortcut is Ctrl+K or ⌘K, never with Alt or Shift or while composing", () => {
  const press = (over: Partial<Parameters<typeof isPaletteShortcut>[0]>) =>
    isPaletteShortcut({ key: "k", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, keyCode: 75, ...over });
  assert.ok(press({ ctrlKey: true }));
  assert.ok(press({ metaKey: true }));
  assert.ok(press({ ctrlKey: true, key: "K" }), "Caps Lock on");
  assert.ok(!press({}));
  assert.ok(!press({ ctrlKey: true, key: "j" }));
  assert.ok(!press({ ctrlKey: true, altKey: true }));
  assert.ok(!press({ metaKey: true, shiftKey: true }));
  assert.ok(!press({ ctrlKey: true, isComposing: true }));
  assert.ok(!press({ ctrlKey: true, keyCode: 229 }), "IME keydown");
});

test("includes the new drug classes, program licensing, and course kit pages", () => {
  const hrefs = PALETTE_PAGES.map((p) => p.href);
  assert.ok(hrefs.includes("/classes"));
  assert.ok(hrefs.includes("/for-programs"));
  assert.ok(hrefs.includes("/for-programs/course-kit"));
  assert.deepEqual(ids("drug classes", "page"), ["/classes"]);
  assert.deepEqual(ids("for programs", "page"), ["/for-programs"]);
  assert.deepEqual(ids("faculty course kit", "page"), ["/for-programs/course-kit"]);
});

test("pinned trays lead blank queries and match by drug name, brand, or alias", () => {
  const pinned: TraySnapshot[] = [
    { ids: ["warfarin", "amiodarone"], ts: 2 },
    { ids: ["simvastatin", "clarithromycin"], ts: 1 },
  ];
  const recent: TraySnapshot[] = [{ ids: ["tramadol", "sertraline"], ts: 3 }];

  const blank = paletteGroups("", recent, pinned);
  assert.deepEqual(blank.map((g) => g.label), ["Pinned trays", "Recent trays", "Go to", "Stations", "Pages"]);
  assert.deepEqual(blank[0].items.map((i) => i.id), [pinnedItem(pinned[0]).id, pinnedItem(pinned[1]).id]);

  const byName = paletteGroups("warfarin", recent, pinned).find((g) => g.kind === "pinned");
  assert.deepEqual(byName?.items.map((i) => i.id), [pinnedItem(pinned[0]).id]);

  const byBrand = paletteGroups("zocor", recent, pinned).find((g) => g.kind === "pinned");
  assert.deepEqual(byBrand?.items.map((i) => i.id), [pinnedItem(pinned[1]).id]);

  assert.equal(paletteGroups("qt", recent, pinned).find((g) => g.kind === "pinned"), undefined);
});

test("combination queries emit a Combination products group with ingredients", () => {
  const percocet = paletteGroups("Percocet");
  assert.equal(percocet[0]?.kind, "combo");
  assert.equal(percocet[0]?.label, "Combination products");
  const item = percocet[0]?.items[0] as Extract<PaletteItem, { kind: "combo" }>;
  assert.equal(item.label, "Percocet");
  assert.deepEqual(item.ids, ["oxycodone", "acetaminophen"]);
  assert.match(item.hint, /^Adds all ingredients · Oxycodone \+ Acetaminophen$/);

  const janumet = paletteGroups("Janumet").find((g) => g.kind === "combo");
  assert.ok(janumet);
  const janumetItem = janumet!.items[0] as Extract<PaletteItem, { kind: "combo" }>;
  assert.equal(janumetItem.label, "Janumet");
  assert.deepEqual(janumetItem.ids, ["sitagliptin-metformin"]);
});
