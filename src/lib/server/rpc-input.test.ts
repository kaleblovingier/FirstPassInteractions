import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CpicInput,
  IdsInput,
  LiveInput,
  ReaderBriefInput,
  SearchInput,
  checkInput,
  nameOnShelf,
  onShelf,
} from "./rpc-input";
import { setLogSink } from "./log";

let lines: string[] = [];

beforeEach(() => {
  lines = [];
  setLogSink((_level, line) => lines.push(line));
});

afterEach(() => {
  setLogSink(null);
});

const JUNK: unknown[] = [null, undefined, 42, "warfarin", [], [["warfarin"]], { ids: "warfarin" }, { id: 7 }];

describe("rpc-input - shelf membership", () => {
  it("accepts catalog ids and rejects inherited object keys", () => {
    assert.equal(onShelf("warfarin"), true);
    for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf", ""]) {
      assert.equal(onShelf(key), false, key);
    }
  });

  it("matches catalog names case-insensitively and nothing else", () => {
    assert.equal(nameOnShelf("Warfarin"), true);
    assert.equal(nameOnShelf(" warfarin "), true);
    assert.equal(nameOnShelf("Object"), false);
    assert.equal(nameOnShelf("warfarin; DROP TABLE"), false);
  });
});

describe("rpc-input - checkInput", () => {
  it("never throws on junk and logs only the function name and an issue count", () => {
    for (const input of JUNK) {
      for (const schema of [LiveInput, CpicInput, ReaderBriefInput]) {
        assert.doesNotThrow(() => checkInput("probe", schema, input));
      }
    }
    const result = checkInput("lookupLiveSources", LiveInput, { id: "warfarin; secret-payload" });
    assert.deepEqual(result, { ok: false });
    const last = JSON.parse(lines.at(-1)!);
    assert.equal(last.event, "rpc.invalid");
    assert.equal(last.fn, "lookupLiveSources");
    assert.equal(typeof last.issues, "number");
    assert.doesNotMatch(lines.join("\n"), /secret-payload|warfarin/);
  });
});

describe("rpc-input - LiveInput", () => {
  it("accepts a catalog id and refuses unknown, inherited, oversize or missing ids", () => {
    assert.deepEqual(checkInput("t", LiveInput, { id: "warfarin" }), { ok: true, value: { id: "warfarin" } });
    for (const input of [{ id: "not-a-drug" }, { id: "constructor" }, { id: "__proto__" }, { id: "w".repeat(65) }, {}, ...JUNK]) {
      assert.equal(checkInput("t", LiveInput, input).ok, false, JSON.stringify(input) ?? String(input));
    }
  });
});

describe("rpc-input - IdsInput", () => {
  it("keeps unique catalog ids in request order and drops unknown or inherited ones", () => {
    const result = checkInput("t", IdsInput, {
      ids: ["fluconazole", "constructor", "warfarin", "fluconazole", "gone-from-catalog"],
    });
    assert.deepEqual(result, { ok: true, value: { ids: ["fluconazole", "warfarin"] } });
  });

  it("treats a missing list as empty", () => {
    assert.deepEqual(checkInput("t", IdsInput, {}), { ok: true, value: { ids: [] } });
  });

  it("refuses oversize lists, oversize ids and non-string entries", () => {
    assert.equal(checkInput("t", IdsInput, { ids: Array.from({ length: 17 }, () => "warfarin") }).ok, false);
    assert.equal(checkInput("t", IdsInput, { ids: ["w".repeat(65)] }).ok, false);
    assert.equal(checkInput("t", IdsInput, { ids: ["warfarin", 3] }).ok, false);
    assert.equal(checkInput("t", IdsInput, { ids: "warfarin" }).ok, false);
  });
});

describe("rpc-input - SearchInput", () => {
  it("defaults the query and bounds its length", () => {
    assert.deepEqual(checkInput("t", SearchInput, { ids: ["warfarin"] }), {
      ok: true,
      value: { query: "", ids: ["warfarin"] },
    });
    assert.equal(checkInput("t", SearchInput, { query: "x".repeat(301), ids: [] }).ok, false);
    assert.equal(checkInput("t", SearchInput, { query: 5, ids: [] }).ok, false);
  });
});

describe("rpc-input - CpicInput", () => {
  it("accepts a catalog drug name and refuses free text", () => {
    assert.equal(checkInput("t", CpicInput, { name: "Clopidogrel" }).ok, true);
    assert.equal(checkInput("t", CpicInput, { name: "anything at all" }).ok, false);
    assert.equal(checkInput("t", CpicInput, { name: "x".repeat(121) }).ok, false);
    assert.equal(checkInput("t", CpicInput, {}).ok, false);
  });
});

describe("rpc-input - ReaderBriefInput", () => {
  const brief = {
    names: ["Warfarin", "Fluconazole", "Not A Drug"],
    lead: "Major: Fluconazole raises warfarin. ".repeat(20),
    clock: "Start day 3.",
    watch: "",
    source: "FDA label",
    fold: "",
    hands: "",
    rows: [{ severity: "Major", line: "Warfarin + fluconazole", why: "CYP2C9. ".repeat(60) }],
    quiet: [],
    food: [],
  };

  it("drops names that are not on the shelf and clips text to the readers' limits", () => {
    const result = checkInput("t", ReaderBriefInput, brief);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value.names, ["Warfarin", "Fluconazole"]);
    assert.ok(result.value.lead.length <= 320);
    assert.ok(result.value.rows[0]!.why.length <= 240);
  });

  it("fills missing fields and refuses wrong types or oversize payloads", () => {
    const sparse = checkInput("t", ReaderBriefInput, { names: ["Warfarin"] });
    assert.equal(sparse.ok, true);
    if (sparse.ok) assert.deepEqual(sparse.value.rows, []);
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, lead: 3 }).ok, false);
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, lead: "x".repeat(2001) }).ok, false);
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, quiet: Array.from({ length: 41 }, () => "q") }).ok, false);
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, rows: Array.from({ length: 13 }, () => ({})) }).ok, false);
  });
});
