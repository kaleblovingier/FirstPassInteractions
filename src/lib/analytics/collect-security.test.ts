import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COLLECT_RATE_LIMIT,
  COLLECT_SECURITY_HEADERS,
  MAX_COLLECT_BYTES,
  handleCollectRequest,
  resetCollectLimiter,
} from "./collect.server";
import { MAX_PIN_LENGTH, validateStatsInput } from "./stats";
import { MAX_STATS_BODY_BYTES, handleGetSiteStats, handleStatsRequest } from "./stats.server";
import { AnalyticsStore, setAnalyticsStore } from "./store.server";
import { pinWaitMs, resetPinThrottle } from "../billing/license.server";
import type { Sql } from "../db";

function assertSecurityHeaders(res: Response, context: string): void {
  assert.equal(
    res.headers.get("x-content-type-options"),
    "nosniff",
    `${context}: missing X-Content-Type-Options: nosniff`,
  );
  assert.equal(
    res.headers.get("cache-control"),
    COLLECT_SECURITY_HEADERS["Cache-Control"],
    `${context}: missing no-store Cache-Control`,
  );
  assert.equal(res.headers.get("pragma"), "no-cache", `${context}: missing Pragma: no-cache`);
}

describe("validateStatsInput (getSiteStats runtime validator)", () => {
  it("accepts valid PINs and supported STATS_RANGES", () => {
    assert.deepEqual(validateStatsInput({ pin: "heme-450", days: 7 }), {
      pin: "heme-450",
      days: 7,
    });
    assert.deepEqual(validateStatsInput({ pin: "  heme-450  ", days: 30 }), {
      pin: "heme-450",
      days: 30,
    });
    assert.deepEqual(validateStatsInput({ pin: "heme-450", days: 90 }), {
      pin: "heme-450",
      days: 90,
    });
    assert.deepEqual(validateStatsInput({ pin: "heme-450" }), {
      pin: "heme-450",
      days: 30,
    });
    const exactMaxPin = "a".repeat(MAX_PIN_LENGTH);
    assert.deepEqual(validateStatsInput({ pin: exactMaxPin, days: 30 }), {
      pin: exactMaxPin,
      days: 30,
    });
  });

  it("rejects non-object inputs, arrays, and non-plain objects", () => {
    for (const bad of [null, undefined, "heme-450", 123, true, [], ["heme-450"], new Date()]) {
      assert.throws(() => validateStatsInput(bad), /Invalid stats request payload/);
    }
  });

  it("rejects missing, non-string, empty, control-char, or oversized PINs", () => {
    for (const badPin of [undefined, null, 12345, ["heme-450"], { pin: "heme-450" }]) {
      assert.throws(
        () => validateStatsInput({ pin: badPin, days: 30 }),
        /Operator PIN must be a string/,
      );
    }
    assert.throws(() => validateStatsInput({ pin: "", days: 30 }), /Operator PIN is required/);
    assert.throws(() => validateStatsInput({ pin: "   ", days: 30 }), /Operator PIN is required/);
    assert.throws(() => validateStatsInput({ pin: "heme\n450", days: 30 }), /invalid characters/i);
    assert.throws(
      () => validateStatsInput({ pin: "heme\u0000450", days: 30 }),
      /invalid characters/i,
    );
    assert.throws(
      () => validateStatsInput({ pin: "x".repeat(MAX_PIN_LENGTH + 1), days: 30 }),
      /maximum length/,
    );
    // Length limit must run before trimming so whitespace floods cannot bypass it
    assert.throws(
      () => validateStatsInput({ pin: `${" ".repeat(MAX_PIN_LENGTH)}x`, days: 30 }),
      /maximum length/,
    );
  });

  it("rejects unsupported days values and unexpected keys including __proto__", () => {
    for (const badDays of [0, 1, 14, 365, -7, 30.5, NaN, Infinity, "30", null, {}]) {
      assert.throws(
        () => validateStatsInput({ pin: "heme-450", days: badDays }),
        /Invalid stats range/,
      );
    }

    assert.throws(
      () => validateStatsInput({ pin: "heme-450", days: 30, extra: true }),
      /Unexpected field/,
    );

    const protoPayload = JSON.parse('{"pin":"heme-450","days":30,"__proto__":{"polluted":true}}');
    assert.throws(() => validateStatsInput(protoPayload), /Unexpected field/);
    assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  });
});

describe("handleCollectRequest security & durability", () => {
  const savedVercel = process.env.VERCEL;

  afterEach(() => {
    resetCollectLimiter();
    setAnalyticsStore(undefined);
    if (savedVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = savedVercel;
  });

  it("enforces uniform security headers across all response statuses (405, 429, 413, 415, 400, 204)", async () => {
    // 405 Method Not Allowed
    const res405 = await handleCollectRequest(
      new Request("http://localhost/api/collect", { method: "GET" }),
    );
    assert.equal(res405.status, 405);
    assert.equal(res405.headers.get("allow"), "POST");
    assertSecurityHeaders(res405, "collect 405");

    // 413 Payload Too Large (via Content-Length)
    const res413 = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(MAX_COLLECT_BYTES + 1),
        },
        body: JSON.stringify({ path: "/pairs" }),
      }),
    );
    assert.equal(res413.status, 413);
    assertSecurityHeaders(res413, "collect 413");

    // 400 Invalid Content-Length
    const res400 = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "not-a-number",
        },
        body: JSON.stringify({ path: "/pairs" }),
      }),
    );
    assert.equal(res400.status, 400);
    assertSecurityHeaders(res400, "collect 400");

    // 415 Unsupported Media Type
    const res415 = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "path=/pairs",
      }),
    );
    assert.equal(res415.status, 415);
    assertSecurityHeaders(res415, "collect 415");

    // 204 Malformed JSON
    const res204BadJson = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ broken json",
      }),
    );
    assert.equal(res204BadJson.status, 204);
    assertSecurityHeaders(res204BadJson, "collect 204 malformed json");

    // 204 Invalid path
    const res204BadPath = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "relative-path" }),
      }),
    );
    assert.equal(res204BadPath.status, 204);
    assertSecurityHeaders(res204BadPath, "collect 204 invalid path");

    // 204 Valid request
    const res204Valid = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/pairs" }),
      }),
    );
    assert.equal(res204Valid.status, 204);
    assertSecurityHeaders(res204Valid, "collect 204 valid");
  });

  it("caps oversized streaming and multi-byte UTF-8 bodies before JSON.parse", async () => {
    // 1. Streaming body without Content-Length that exceeds MAX_COLLECT_BYTES must be aborted early
    let chunksProduced = 0;
    let streamCanceled = false;
    const hugeStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksProduced++;
        if (chunksProduced > 10) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(2048).fill(97));
      },
      cancel() {
        streamCanceled = true;
      },
    });
    const streamReq = new Request("http://localhost/api/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: hugeStream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const streamRes = await handleCollectRequest(streamReq);
    assert.equal(streamRes.status, 413);
    assert.equal(streamCanceled, true, "oversized stream must be canceled immediately");
    assert.ok(chunksProduced <= 4, `should abort early, produced ${chunksProduced} chunks`);
    assertSecurityHeaders(streamRes, "collect stream 413");

    // 2. Multi-byte UTF-8 body where JS character length <= 4096 but UTF-8 byte length > 4096
    const emojiPayload = JSON.stringify({ path: `/${"💊".repeat(1200)}` });
    assert.ok(emojiPayload.length < MAX_COLLECT_BYTES);
    assert.ok(Buffer.byteLength(emojiPayload, "utf8") > MAX_COLLECT_BYTES);

    const utf8Res = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: emojiPayload,
      }),
    );
    assert.equal(utf8Res.status, 413);
    assertSecurityHeaders(utf8Res, "collect utf8 413");

    // 3. Exact MAX_COLLECT_BYTES boundary payload succeeds with 204
    const prefix = '{"path":"/p","referrer":"https://example.com/';
    const suffix = '"}';
    const padLen = MAX_COLLECT_BYTES - Buffer.byteLength(prefix + suffix, "utf8");
    const exactPayload = `${prefix}${"a".repeat(padLen)}${suffix}`;
    assert.equal(Buffer.byteLength(exactPayload, "utf8"), MAX_COLLECT_BYTES);

    const exactRes = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: exactPayload,
      }),
    );
    assert.equal(exactRes.status, 204);
    assertSecurityHeaders(exactRes, "collect exact boundary 204");
  });

  it("drops unsupported content types and non-object JSON without polluting prototypes", async () => {
    for (const mime of ["multipart/form-data", "text/html", "application/xml"]) {
      const res = await handleCollectRequest(
        new Request("http://localhost/api/collect", {
          method: "POST",
          headers: { "content-type": mime },
          body: '{"path":"/pairs"}',
        }),
      );
      assert.equal(res.status, 415);
      assertSecurityHeaders(res, `collect ${mime}`);
    }

    // text/plain beacon (e.g., sendBeacon with string) is accepted
    const textRes = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ path: "/pairs" }),
      }),
    );
    assert.equal(textRes.status, 204);
    assertSecurityHeaders(textRes, "collect text/plain");

    // Array / primitive / __proto__ payloads cleanly return 204 without throwing
    for (const raw of [
      "[]",
      "null",
      '"string"',
      "42",
      '{"__proto__":{"polluted":true},"path":"/pairs"}',
    ]) {
      const res = await handleCollectRequest(
        new Request("http://localhost/api/collect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: raw,
        }),
      );
      assert.equal(res.status, 204);
      assertSecurityHeaders(res, `collect payload ${raw}`);
    }
    assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  });

  it("includes Retry-After and security headers on 429 rate-limited responses", async () => {
    process.env.VERCEL = "1";
    const ip = "198.51.100.200";
    const t0 = 1794200000000;

    const req = () =>
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": ip,
        },
        body: JSON.stringify({ path: "/pairs" }),
      });

    for (let i = 0; i < COLLECT_RATE_LIMIT.max; i++) {
      const res = await handleCollectRequest(req(), t0 + i);
      assert.equal(res.status, 204);
    }

    const limitedRes = await handleCollectRequest(req(), t0 + 5_000);
    assert.equal(limitedRes.status, 429);
    const retryAfter = Number(limitedRes.headers.get("retry-after"));
    assert.ok(Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 60);
    assertSecurityHeaders(limitedRes, "collect 429");
  });

  it("awaits recordPageView before returning 204 so serverless writes flush reliably", async () => {
    let inserted = false;
    const mockSql = (async <T = Record<string, unknown>>(
      strings: TemplateStringsArray,
    ): Promise<T[]> => {
      const raw = strings.join("?");
      if (raw.includes("SELECT salt FROM analytics_salts")) {
        return [{ salt: "test-salt-hex" }] as T[];
      }
      if (raw.includes("INSERT INTO analytics_views")) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        inserted = true;
        return [] as T[];
      }
      return [] as T[];
    }) as unknown as Sql;
    mockSql.query = async <T = Record<string, unknown>>(): Promise<T[]> => [] as T[];

    setAnalyticsStore(new AnalyticsStore(mockSql));

    const res = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/pairs", referrer: "https://pubmed.ncbi.nlm.nih.gov/123" }),
      }),
    );

    assert.equal(res.status, 204);
    assert.equal(
      inserted,
      true,
      "INSERT must be awaited and completed before handleCollectRequest resolves",
    );
    assertSecurityHeaders(res, "collect durable 204");
  });

  it("still returns 204 with security headers if the analytics store throws", async () => {
    const failingSql = (async (): Promise<never[]> => {
      throw new Error("simulated database connection failure");
    }) as unknown as Sql;
    failingSql.query = async (): Promise<never[]> => [];

    setAnalyticsStore(new AnalyticsStore(failingSql));

    const res = await handleCollectRequest(
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/pairs" }),
      }),
    );

    assert.equal(res.status, 204);
    assertSecurityHeaders(res, "collect store-error 204");
  });
});

describe("handleStatsRequest and handleGetSiteStats security guards", () => {
  const savedVercel = process.env.VERCEL;

  afterEach(() => {
    resetPinThrottle();
    if (savedVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = savedVercel;
  });

  it("rejects oversized POST bodies (> MAX_STATS_BODY_BYTES) before JSON.parse", async () => {
    const oversizedJson = JSON.stringify({ pin: "x".repeat(MAX_STATS_BODY_BYTES), days: 30 });
    assert.ok(Buffer.byteLength(oversizedJson, "utf8") > MAX_STATS_BODY_BYTES);

    const res = await handleStatsRequest(
      new Request("http://localhost/api/stats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: oversizedJson,
      }),
    );
    assert.equal(res.status, 413);
    assertSecurityHeaders(res, "stats 413");
    const body = (await res.json()) as { ok: boolean; reason: string };
    assert.equal(body.ok, false);

    // Streaming chunked body without Content-Length
    let canceled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(600).fill(97));
      },
      cancel() {
        canceled = true;
      },
    });
    const streamRes = await handleStatsRequest(
      new Request("http://localhost/api/stats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: stream,
        duplex: "half",
      } as RequestInit & { duplex: "half" }),
    );
    assert.equal(streamRes.status, 413);
    assert.equal(canceled, true);
    assertSecurityHeaders(streamRes, "stats stream 413");
  });

  it("fails fast on oversized, missing, non-string, or control-char PINs before calling pinRefusal", async () => {
    process.env.VERCEL = "1";
    const ip = "203.0.113.199";
    resetPinThrottle();

    const oversizedPin = "x".repeat(MAX_PIN_LENGTH + 1);
    // Send 10 oversized-PIN attempts; if pinRefusal were called, strike 6+ would trigger 429 backoff
    for (let i = 0; i < 10; i++) {
      const res = await handleStatsRequest(
        new Request("http://localhost/api/stats", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-real-ip": ip,
          },
          body: JSON.stringify({ pin: oversizedPin, days: 30 }),
        }),
      );
      assert.equal(res.status, 400);
      assertSecurityHeaders(res, "stats oversized pin 400");
    }
    assert.equal(pinWaitMs(ip), 0, "oversized PIN must fail before pinRefusal/strike tracking");

    // Non-string, empty, control-char PINs also return 400 with security headers
    for (const badPayload of [
      { pin: 12345, days: 30 },
      { pin: "", days: 30 },
      { pin: "   ", days: 30 },
      { pin: "heme\n450", days: 30 },
      [],
      null,
      { pin: "heme-450", days: 30, extra: 1 },
    ]) {
      const res = await handleStatsRequest(
        new Request("http://localhost/api/stats", {
          method: "POST",
          headers: { "content-type": "application/json", "x-real-ip": ip },
          body: JSON.stringify(badPayload),
        }),
      );
      assert.equal(res.status, 400);
      assertSecurityHeaders(res, "stats bad payload 400");
    }

    // Direct handleGetSiteStats also rejects invalid PIN shapes fast
    const directOversized = await handleGetSiteStats({ pin: oversizedPin, days: 30 }, ip);
    assert.equal(directOversized.ok, false);
    assert.equal(pinWaitMs(ip), 0);
  });
});
