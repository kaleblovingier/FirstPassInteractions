import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readCache, readWithBots, resetReaderBudget } from "./readers.server";
import type { ReaderBrief } from "./readers";
import { setLogSink } from "../server/log";

const realFetch = globalThis.fetch;
const realKey = process.env.XAI_API_KEY;
let lines: string[] = [];

interface Call {
  url: string;
  init: RequestInit;
}

function stubFetch(reply: (body: Record<string, unknown>) => Response) {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    await new Promise((r) => setTimeout(r, 2));
    return reply(JSON.parse(String(init.body)) as Record<string, unknown>);
  }) as typeof fetch;
  return calls;
}

function chat(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function brief(lead = "Major: fluconazole raises warfarin exposure."): ReaderBrief {
  return {
    names: ["Warfarin", "Fluconazole"],
    lead,
    clock: "",
    watch: "",
    source: "FDA label",
    fold: "",
    hands: "",
    rows: [],
    quiet: [],
    food: [],
  };
}

beforeEach(() => {
  readCache.clear();
  resetReaderBudget();
  lines = [];
  setLogSink((_level, line) => lines.push(line));
  process.env.XAI_API_KEY = "test-key-should-not-leak";
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
  if (realKey === undefined) delete process.env.XAI_API_KEY;
  else process.env.XAI_API_KEY = realKey;
});

describe("readers.server - readWithBots", () => {
  it("asks for a name before calling the model", async () => {
    const calls = stubFetch(() => chat("x"));
    assert.deepEqual(await readWithBots({ names: [] }), { ok: false, error: "Add a name before asking the readers." });
    assert.equal(calls.length, 0);
  });

  it("degrades to an unavailable note without a key", async () => {
    delete process.env.XAI_API_KEY;
    const calls = stubFetch(() => chat("x"));
    const result = await readWithBots(brief());
    assert.equal(result.ok, true);
    if (result.ok) assert.ok(result.readers.every((n) => !n.ok && n.text === "Readers are unavailable on this desk right now."));
    assert.equal(calls.length, 0);
  });

  it("sends three capped calls, scrubs doses, and serves a repeat ask from cache", async () => {
    const calls = stubFetch(() => chat("Fluconazole raises warfarin; the label names 5 mg tablets."));
    const result = await readWithBots(brief());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.readers.length, 3);
    assert.ok(result.readers.every((n) => n.ok && n.text.includes("[not a dose]")));
    assert.equal(calls.length, 3);
    for (const call of calls) {
      assert.equal(call.url, "https://api.x.ai/v1/chat/completions");
      assert.equal(call.init.method, "POST");
      const body = JSON.parse(String(call.init.body)) as { model: string; max_tokens: number };
      assert.equal(body.model, "grok-4.5");
      assert.equal(body.max_tokens, 160);
      assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer test-key-should-not-leak");
    }

    await readWithBots(brief());
    assert.equal(calls.length, 3, "the same brief is not paid for twice");
    for (const line of lines) assert.doesNotMatch(line, /test-key|warfarin|fluconazole|Bearer/i);
  });

  it("marks a failed reader, never retries the paid call, and does not cache a partial read", async () => {
    let n = 0;
    const calls = stubFetch(() => (++n === 2 ? chat("", 503) : chat("A plain restatement.")));
    const result = await readWithBots(brief());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.readers.map((r) => r.ok),
      [true, false, true],
    );
    assert.equal(result.readers[1]?.text, "This reader did not answer.");
    assert.equal(calls.length, 3, "a 503 on a POST is not retried");

    await readWithBots(brief());
    assert.equal(calls.length, 6, "a partial read is asked again");
  });

  it("drops a note that steps outside the map", async () => {
    stubFetch(() => chat("Stop taking warfarin and switch to apixaban."));
    const result = await readWithBots(brief());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.readers.every((n) => n.text === "This reader stepped outside the map. The note was dropped. It is not a finding."));
    }
  });

  it("caps asks per instance so a loop cannot drain the owner's key", async () => {
    const calls = stubFetch(() => chat("A plain restatement."));
    for (let i = 0; i < 30; i++) {
      const result = await readWithBots(brief(`Lead ${i}`));
      assert.equal(result.ok, true, `ask ${i}`);
    }
    const limited = await readWithBots(brief("Lead 31"));
    assert.deepEqual(limited, { ok: false, error: "The readers are busy right now. Try again in a minute." });
    assert.equal(calls.length, 90);

    const repeat = await readWithBots(brief("Lead 3"));
    assert.equal(repeat.ok, true, "a cached read is still served while capped");
  });
});
