import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALWAYS_ON_STATIONS,
  CLINICAL_TAB_IDS,
  MORE_GROUP_ID,
  STATION_ALIASES,
  STATION_GROUPS,
  filterStationGroups,
  groupStations,
  stationMatches,
  trayStations,
} from "./station-groups";

type T = { id: string; label: string; on: boolean };

const tab = (id: string, label: string, on = false): T => ({ id, label, on });

describe("station groups map", () => {
  it("has no duplicate tab ids", () => {
    assert.equal(new Set(CLINICAL_TAB_IDS).size, CLINICAL_TAB_IDS.length);
  });

  it("assigns every tab id to exactly one group", () => {
    const seen = new Map<string, string[]>();
    for (const g of STATION_GROUPS) {
      for (const id of g.tabs) seen.set(id, [...(seen.get(id) ?? []), g.id]);
    }
    const missing = CLINICAL_TAB_IDS.filter((id) => !seen.has(id));
    const twice = [...seen].filter(([, gs]) => gs.length !== 1).map(([id, gs]) => `${id}: ${gs.join(", ")}`);
    const unknown = [...seen.keys()].filter((id) => !(CLINICAL_TAB_IDS as readonly string[]).includes(id));
    assert.deepEqual(missing, [], "tab ids with no group");
    assert.deepEqual(twice, [], "tab ids in more than one group");
    assert.deepEqual(unknown, [], "group entries that are not tab ids");
  });

  it("has unique group ids and labels, none named More", () => {
    const ids = STATION_GROUPS.map((g) => g.id);
    const labels = STATION_GROUPS.map((g) => g.label.toLowerCase());
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(labels).size, labels.length);
    assert.ok(!ids.includes(MORE_GROUP_ID));
    for (const g of STATION_GROUPS) assert.ok(g.tabs.length > 0, `${g.id} is empty`);
  });

  it("pre-assigns the upcoming stations", () => {
    const groupOf = (id: string) => STATION_GROUPS.find((g) => g.tabs.some((t) => t === id))?.id;
    assert.equal(groupOf("hivart"), "infection");
    assert.equal(groupOf("contraception"), "pregnancy");
    assert.equal(groupOf("statin"), "heart");
    assert.equal(groupOf("thyroid"), "endocrine");
    assert.equal(groupOf("falls"), "older");
  });

  it("keeps aliases and always-on ids inside the tab list", () => {
    const all = new Set<string>(CLINICAL_TAB_IDS);
    for (const id of Object.keys(STATION_ALIASES)) assert.ok(all.has(id), id);
    for (const id of ALWAYS_ON_STATIONS) assert.ok(all.has(id), id);
  });
});

describe("groupStations", () => {
  it("returns groups in map order with tabs in map order, and drops empty groups", () => {
    const groups = groupStations([
      tab("inr", "INR"),
      tab("digoxin", "Digoxin"),
      tab("qt", "QT"),
      tab("doac", "DOAC"),
    ]);
    assert.deepEqual(
      groups.map((g) => [g.id, g.tabs.map((t) => t.id)]),
      [
        ["heart", ["qt", "digoxin"]],
        ["blood", ["doac", "inr"]],
      ],
    );
  });

  it("puts unknown ids in a final More group, in input order", () => {
    const groups = groupStations([tab("zeta", "Zeta"), tab("qt", "QT"), tab("alpha", "Alpha")]);
    const last = groups[groups.length - 1];
    assert.equal(last.id, MORE_GROUP_ID);
    assert.equal(last.label, "More");
    assert.deepEqual(last.tabs.map((t) => t.id), ["zeta", "alpha"]);
    assert.deepEqual(groups[0].tabs.map((t) => t.id), ["qt"]);
  });

  it("keeps every tab exactly once for the full id list", () => {
    const tabs = CLINICAL_TAB_IDS.map((id) => tab(id, id));
    const flat = groupStations(tabs).flatMap((g) => g.tabs.map((t) => t.id));
    assert.equal(flat.length, tabs.length);
    assert.deepEqual([...flat].sort(), [...CLINICAL_TAB_IDS].sort());
    assert.ok(!groupStations(tabs).some((g) => g.id === MORE_GROUP_ID));
  });

  it("returns nothing for no tabs", () => {
    assert.deepEqual(groupStations([]), []);
  });
});

describe("trayStations", () => {
  it("keeps open tabs only, in group order, with always-on stations last", () => {
    const row = trayStations([
      tab("bedside", "Bedside", true),
      tab("resources", "Resources", true),
      tab("inr", "INR", true),
      tab("qt", "QT", true),
      tab("digoxin", "Digoxin", false),
      tab("wards", "Wards", true),
      tab("newthing", "New", true),
    ]);
    assert.deepEqual(
      row.map((t) => t.id),
      ["wards", "qt", "inr", "newthing", "resources", "bedside"],
    );
  });
});

describe("filtering", () => {
  const groups = groupStations([
    tab("qt", "QT"),
    tab("digoxin", "Digoxin"),
    tab("acidbase", "Acid-Base"),
    tab("potassium", "Potassium"),
    tab("hunter", "Hunter"),
    tab("anesthesia", "Anesthesia & NMB"),
    tab("allergy", "Allergy & ADR"),
    tab("zeta", "Zeta"),
  ]);
  const ids = (q: string) => filterStationGroups(groups, q).flatMap((g) => g.tabs.map((t) => t.id));

  it("keeps everything for a blank query", () => {
    assert.equal(ids("").length, 8);
    assert.equal(ids("   ").length, 8);
    assert.equal(ids(" & ").length, 8);
  });

  it("matches labels without regard to case", () => {
    assert.deepEqual(ids("DIGOX"), ["digoxin"]);
    assert.deepEqual(ids("qt"), ["qt"]);
  });

  it("matches a group name and keeps the whole group", () => {
    assert.deepEqual(ids("heart"), ["qt", "digoxin"]);
    assert.deepEqual(ids("Heart & Rhythm"), ["qt", "digoxin"]);
    assert.deepEqual(ids("heart and rhythm"), ["qt", "digoxin"]);
    assert.deepEqual(ids("electrolytes"), ["potassium", "acidbase"]);
  });

  it("needs every word to match", () => {
    assert.deepEqual(ids("heart digoxin"), ["digoxin"]);
    assert.deepEqual(ids("heart potassium"), []);
  });

  it("ignores spaces and punctuation inside a label", () => {
    assert.deepEqual(ids("acid base"), ["acidbase"]);
    assert.deepEqual(ids("acidbase"), ["acidbase"]);
    assert.deepEqual(ids("acid-base"), ["acidbase"]);
  });

  it("matches the search aliases", () => {
    assert.deepEqual(ids("serotonin"), ["hunter"]);
    assert.deepEqual(ids("torsades"), ["qt"]);
  });

  it("matches the More group by name", () => {
    assert.deepEqual(ids("more"), ["zeta"]);
  });

  it("drops groups left empty", () => {
    const out = filterStationGroups(groups, "allergy");
    assert.deepEqual(out.map((g) => g.id), ["periop"]);
    assert.deepEqual(out[0].tabs.map((t) => t.id), ["anesthesia", "allergy"]);
  });

  it("returns no groups when nothing matches", () => {
    assert.deepEqual(filterStationGroups(groups, "xylophone"), []);
  });

  it("stationMatches works on one tab", () => {
    assert.ok(stationMatches({ id: "qt", label: "QT" }, "Heart & rhythm", "rhythm"));
    assert.ok(!stationMatches({ id: "qt", label: "QT" }, "Heart & rhythm", "kidney"));
  });
});
