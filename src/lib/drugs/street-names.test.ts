import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRUGS,
  DRUG_BY_ID,
  matchedStreetName,
  normalizeSearchText,
  searchDrugs,
  streetNameIds,
} from "./catalog";
import { OWNER_NAMED_STREET_NAMES, STREET_NAMES } from "./street-names";

const officialStrings = DRUGS.map((drug) => ({
  id: drug.id,
  strings: [drug.name, drug.id, ...drug.brands, ...drug.aliases].map(normalizeSearchText),
}));
const ownerNamed = new Set(OWNER_NAMED_STREET_NAMES.map(normalizeSearchText));
const entries = Object.entries(STREET_NAMES).flatMap(([id, names]) =>
  names.map((raw) => ({ id, raw, key: normalizeSearchText(raw) })),
);
const firstId = (query: string) => searchDrugs(query)[0]?.id;

describe("street-names - the table", () => {
  it("keys every row by a catalog id", () => {
    for (const id of Object.keys(STREET_NAMES)) assert.ok(Object.hasOwn(DRUG_BY_ID, id), id);
  });

  it("never repeats an official name, brand or alias of any row", () => {
    for (const { raw, key } of entries) {
      const owners = officialStrings.filter((row) => row.strings.includes(key)).map((row) => row.id);
      assert.deepEqual(owners, [], `${raw} is already an official string`);
    }
  });

  it("never begins another row's official string, except the names the owner asked for", () => {
    for (const { raw, key } of entries) {
      if (ownerNamed.has(key)) continue;
      const hijacked = officialStrings
        .filter((row) => row.strings.some((value) => value.startsWith(key)))
        .map((row) => row.id);
      assert.deepEqual(hijacked, [], `${raw} begins an official string`);
    }
  });

  it("holds no name under three characters except the owner's K", () => {
    for (const { raw, key } of entries) {
      if (key === "k") continue;
      assert.ok(key.replace(/\s/g, "").length >= 3, raw);
    }
  });

  it("lists each name once", () => {
    const keys = entries.map((entry) => `${entry.id}|${entry.key}`);
    assert.equal(new Set(keys).size, keys.length);
  });
});

describe("street-names - search", () => {
  it("puts the owner's examples first", () => {
    assert.equal(firstId("Molly"), "mdma");
    assert.equal(firstId("Ecstasy"), "mdma");
    assert.equal(firstId("Booze"), "ethanol");
    assert.equal(firstId("Acid"), "lsd");
    assert.equal(firstId("K"), "ketamine");
    assert.equal(firstId("Special K"), "ketamine");
    assert.equal(firstId("shrooms"), "psilocybin");
    assert.equal(firstId("weed"), "dronabinol");
  });

  it("leaves official names where they were", () => {
    assert.equal(firstId("Zoloft"), "sertraline");
    assert.equal(firstId("Xanax"), "alprazolam");
    assert.equal(firstId("Alcohol"), "ethanol");
    assert.equal(firstId("ketamine"), "ketamine");
    assert.equal(firstId("oxy"), "oxycodone");
    assert.equal(firstId("meth"), "methamphetamine");
    assert.equal(firstId("coke"), "cocaine");
    // "pot" is left out of the table so a clinician typing it still reaches potassium.
    assert.notEqual(firstId("pot"), "dronabinol");
  });

  it("still lists the rows a bare K found before, below ketamine", () => {
    const ids = searchDrugs("K").map((drug) => drug.id);
    assert.equal(ids[0], "ketamine");
    for (const id of ["kanna", "kava", "kelp"]) assert.ok(ids.includes(id), id);
    assert.ok(ids.indexOf("kanna") < ids.indexOf("kava") && ids.indexOf("kava") < ids.indexOf("kelp"));
  });

  it("matches a street name only whole, never as a prefix", () => {
    assert.notEqual(firstId("mol"), "mdma");
    assert.notEqual(firstId("speed dial"), "amphetamine");
  });
});

describe("street-names - readers", () => {
  it("matchedStreetName names the street name a query matched", () => {
    assert.equal(matchedStreetName("mdma", "molly"), "Molly");
    assert.equal(matchedStreetName("mdma", "  MOLLY "), "Molly");
    assert.equal(matchedStreetName("mdma", "mdma"), null);
    assert.equal(matchedStreetName("ketamine", "molly"), null);
    assert.equal(matchedStreetName("constructor", "molly"), null);
  });

  it("streetNameIds returns every row a street name fits, and nothing for other words", () => {
    assert.deepEqual(streetNameIds("Molly"), ["mdma"]);
    assert.deepEqual(streetNameIds("tango and cash"), ["fentanyl"]);
    assert.deepEqual(streetNameIds("Zoloft"), []);
    assert.deepEqual(streetNameIds(""), []);
    assert.deepEqual(streetNameIds("constructor"), []);
  });
});
