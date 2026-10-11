import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { UpstreamError, failurePhrase, fetchJson, mapSettled } from "./http";
import { setLogSink } from "./log";

const realFetch = globalThis.fetch;
let lines: string[] = [];

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return impl(url, init);
  }) as typeof fetch;
  return calls;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/** Never answers; rejects only when the request signal aborts. */
function hang(init: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
}

const URL_WITH_SECRET = "https://api.example.org/drug/label.json?search=warfarin&api_key=SECRET";

beforeEach(() => {
  lines = [];
  setLogSink((_level, line) => lines.push(line));
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setLogSink(null);
});

describe("fetchJson - success and empty answers", () => {
  it("parses JSON and logs host, status and duration without the path or query", async () => {
    stubFetch(async () => json({ results: [1] }));
    const value = await fetchJson(URL_WITH_SECRET, { source: "test.label" });
    assert.deepEqual(value, { results: [1] });
    assert.equal(lines.length, 1);
    const line = JSON.parse(lines[0]!);
    assert.equal(line.event, "upstream.fetch");
    assert.equal(line.source, "test.label");
    assert.equal(line.host, "api.example.org");
    assert.equal(line.status, 200);
    assert.equal(line.outcome, "ok");
    assert.equal(typeof line.durationMs, "number");
    assert.doesNotMatch(lines[0]!, /warfarin|SECRET|label\.json/);
  });

  it("resolves a 404 as null when notFoundAsEmpty is set", async () => {
    stubFetch(async () => json({ error: { code: "NOT_FOUND" } }, 404));
    assert.equal(await fetchJson(URL_WITH_SECRET, { source: "t", notFoundAsEmpty: true }), null);
    assert.equal(JSON.parse(lines[0]!).outcome, "empty");
  });

  it("treats a 404 as an HTTP failure by default", async () => {
    stubFetch(async () => json({}, 404));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t" }), (error: unknown) => {
      assert.ok(error instanceof UpstreamError);
      assert.equal(error.kind, "http");
      assert.equal(error.status, 404);
      return true;
    });
  });
});

describe("fetchJson - typed failures", () => {
  it("maps a 500 to kind http without retrying and keeps the URL out of the message", async () => {
    const calls = stubFetch(async () => json({ boom: true }, 500));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t" }), (error: unknown) => {
      assert.ok(error instanceof UpstreamError);
      assert.equal(error.kind, "http");
      assert.equal(error.status, 500);
      assert.doesNotMatch(error.message, /example|SECRET|warfarin/);
      return true;
    });
    assert.equal(calls.length, 1);
    const line = JSON.parse(lines[0]!);
    assert.equal(line.level, "warn");
    assert.equal(line.outcome, "http");
    assert.equal(line.status, 500);
  });

  it("maps an unparseable body to kind malformed", async () => {
    stubFetch(async () => new Response("<!DOCTYPE html><p>maintenance</p>", { status: 200 }));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t" }), (error: unknown) => {
      assert.ok(error instanceof UpstreamError);
      assert.equal(error.kind, "malformed");
      assert.doesNotMatch(error.message, /DOCTYPE|maintenance/);
      return true;
    });
  });

  it("maps a declared oversize body to kind malformed", async () => {
    stubFetch(async () => json({ a: 1 }, 200, { "Content-Length": "999999999" }));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t", maxBytes: 1024 }), {
      name: "UpstreamError",
      kind: "malformed",
    });
  });

  it("maps a rejected fetch to kind network", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed: getaddrinfo ENOTFOUND api.example.org");
    });
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t" }), (error: unknown) => {
      assert.ok(error instanceof UpstreamError);
      assert.equal(error.kind, "network");
      assert.doesNotMatch(error.message, /ENOTFOUND|example/);
      return true;
    });
  });

  it("times out a hung request at timeoutMs", async () => {
    stubFetch((_url, init) => hang(init));
    const started = Date.now();
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t", timeoutMs: 40 }), {
      name: "UpstreamError",
      kind: "timeout",
    });
    assert.ok(Date.now() - started < 1_000);
    assert.equal(JSON.parse(lines[0]!).outcome, "timeout");
  });

  it("times out a body that never finishes, even if the stream ignores the abort", async () => {
    stubFetch(async () => new Response(new ReadableStream({ start() {} }), { status: 200 }));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t", timeoutMs: 40 }), {
      name: "UpstreamError",
      kind: "timeout",
    });
  });

  it("times out a fetch that ignores its abort signal", async () => {
    stubFetch(() => new Promise<Response>(() => undefined));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t", timeoutMs: 40 }), {
      name: "UpstreamError",
      kind: "timeout",
    });
  });

  it("ends the call as a timeout when the caller's deadline aborts first", async () => {
    stubFetch((_url, init) => hang(init));
    const deadline = AbortSignal.timeout(30);
    await assert.rejects(
      fetchJson(URL_WITH_SECRET, { source: "t", timeoutMs: 5_000, signal: deadline }),
      { name: "UpstreamError", kind: "timeout" },
    );
  });

  it("does not call upstream when the caller's deadline already passed", async () => {
    const calls = stubFetch(async () => json({}));
    const done = new AbortController();
    done.abort();
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t", signal: done.signal }), {
      kind: "timeout",
    });
    assert.equal(calls.length, 0);
  });
});

describe("fetchJson - retry policy", () => {
  it("retries a GET once on 503 and returns the second answer", async () => {
    let n = 0;
    const calls = stubFetch(async () => (++n === 1 ? json({}, 503) : json({ ok: true })));
    assert.deepEqual(await fetchJson(URL_WITH_SECRET, { source: "t" }), { ok: true });
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(lines[0]!).attempts, 2);
  });

  it("retries a 429 at most once", async () => {
    const calls = stubFetch(async () => json({}, 429));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t" }), (error: unknown) => {
      assert.ok(error instanceof UpstreamError);
      assert.equal(error.status, 429);
      return true;
    });
    assert.equal(calls.length, 2);
  });

  it("never retries a POST", async () => {
    const calls = stubFetch(async () => json({}, 503));
    await assert.rejects(
      fetchJson(URL_WITH_SECRET, { source: "t", method: "POST", body: "{}" }),
      { kind: "http" },
    );
    assert.equal(calls.length, 1);
  });

  it("skips the retry when the remaining budget is too small", async () => {
    const calls = stubFetch(async () => json({}, 503));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t", timeoutMs: 500 }), {
      kind: "http",
    });
    assert.equal(calls.length, 1);
  });

  it("does not retry other 5xx statuses", async () => {
    const calls = stubFetch(async () => json({}, 502));
    await assert.rejects(fetchJson(URL_WITH_SECRET, { source: "t" }), { kind: "http" });
    assert.equal(calls.length, 1);
  });
});

describe("failurePhrase", () => {
  it("distinguishes timeout, HTTP error, rate limit, unreadable payload and unreachable", () => {
    assert.equal(failurePhrase(new UpstreamError("s", "timeout")), "didn't answer in time");
    assert.equal(failurePhrase(new UpstreamError("s", "http", 500)), "answered with an error");
    assert.equal(failurePhrase(new UpstreamError("s", "http", 429)), "hit a rate limit");
    assert.equal(failurePhrase(new UpstreamError("s", "malformed")), "sent an answer we couldn't read");
    assert.equal(failurePhrase(new UpstreamError("s", "network")), "couldn't be reached");
    assert.equal(failurePhrase(new Error("x")), "didn't answer");
  });
});

describe("mapSettled", () => {
  it("keeps input order, captures rejections and never exceeds the concurrency cap", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapSettled([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5 + (n % 3) * 5));
      running--;
      if (n === 4) throw new Error("four");
      return n * 10;
    });
    assert.equal(peak, 3);
    assert.deepEqual(
      results.map((r) => (r.status === "fulfilled" ? r.value : "rejected")),
      [10, 20, 30, "rejected", 50, 60, 70],
    );
  });

  it("handles an empty list", async () => {
    assert.deepEqual(await mapSettled([], 4, async () => 1), []);
  });
});
