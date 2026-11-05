import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CpicInput,
  IdsInput,
  LiveInput,
  MAX_INPUT_NODES,
  ReaderBriefInput,
  SearchInput,
  checkInput,
  nameOnShelf,
  onShelf,
  withinNodeBudget,
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

describe("rpc-input - size budget", () => {
  const fullBrief = {
    names: Array(16).fill("Warfarin"),
    lead: "a",
    clock: "b",
    watch: "c",
    source: "d",
    fold: "e",
    hands: "f",
    rows: Array.from({ length: 12 }, () => ({ severity: "Major", line: "x", why: "y" })),
    quiet: Array(40).fill("q"),
    food: Array(12).fill("f"),
  };

  it("passes the largest real input and refuses wide, deep or cyclic ones", () => {
    assert.equal(withinNodeBudget(fullBrief), true);
    assert.equal(withinNodeBudget({ ids: Array(MAX_INPUT_NODES - 1).fill("x") }), true);
    assert.equal(withinNodeBudget({ ids: Array(MAX_INPUT_NODES).fill("x") }), false);
    assert.equal(withinNodeBudget(Object.fromEntries(Array.from({ length: 2_000 }, (_, i) => [`k${i}`, 1]))), false);
    let deep: unknown = "leaf";
    for (let i = 0; i < 2_000; i += 1) deep = [deep];
    assert.equal(withinNodeBudget(deep), false);
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    assert.equal(withinNodeBudget(loop), false, "a cycle runs out of budget instead of spinning");
    for (const v of [null, undefined, 0, "", "text", true]) assert.equal(withinNodeBudget(v), true);
  });

  it("refuses an oversized list before zod walks it, and logs no contents", () => {
    const huge = { ids: Array<number>(2_000_000).fill(1) };
    const started = Date.now();
    assert.deepEqual(checkInput("lookupRxnavInteractions", IdsInput, huge), { ok: false });
    assert.ok(Date.now() - started < 500, "refused without validating each element");
    const last = JSON.parse(lines.at(-1)!);
    assert.equal(last.event, "rpc.invalid");
    assert.equal(last.oversized, true);
    assert.equal(lines.at(-1)!.length < 200, true);
    assert.equal(checkInput("readRegimen", ReaderBriefInput, fullBrief).ok, true);
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
    assert.equal(checkInput("t", LiveInput, { id: "warfarin", note: "extra" }).ok, false);
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

  it("refuses oversize lists, oversize ids, non-string entries and unknown keys", () => {
    assert.equal(checkInput("t", IdsInput, { ids: Array.from({ length: 17 }, () => "warfarin") }).ok, false);
    assert.equal(checkInput("t", IdsInput, { ids: ["w".repeat(65)] }).ok, false);
    assert.equal(checkInput("t", IdsInput, { ids: ["warfarin", 3] }).ok, false);
    assert.equal(checkInput("t", IdsInput, { ids: "warfarin" }).ok, false);
    assert.equal(checkInput("t", IdsInput, { ids: ["warfarin"], extra: true }).ok, false);
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
    assert.equal(checkInput("t", SearchInput, { query: "warfarin", ids: [], limit: 99 }).ok, false);
  });
});

describe("rpc-input - CpicInput", () => {
  it("accepts a catalog drug name and refuses free text", () => {
    assert.equal(checkInput("t", CpicInput, { name: "Clopidogrel" }).ok, true);
    assert.equal(checkInput("t", CpicInput, { name: "Clopidogrel", extra: 1 }).ok, false);
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
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, extra: "nope" }).ok, false);
    assert.equal(
      checkInput("t", ReaderBriefInput, {
        ...brief,
        rows: [{ severity: "Major", line: "x", why: "y", dose: "10mg" }],
      }).ok,
      false,
    );
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, lead: 3 }).ok, false);
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, lead: "x".repeat(2001) }).ok, false);
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, quiet: Array.from({ length: 41 }, () => "q") }).ok, false);
    assert.equal(checkInput("t", ReaderBriefInput, { ...brief, rows: Array.from({ length: 13 }, () => ({})) }).ok, false);
  });
});
