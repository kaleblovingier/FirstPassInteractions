import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleCdsRequest } from "./cds-handler.server";
import { presentedKey, resetApiMeters } from "./api-access.server";
import type { ProblemDetails } from "./problem";
import { API_LIMITS, API_KEY_RE } from "../../billing/api-tiers";
import { mintApiKey, mintApiKeyForOperator, verifyApiKey } from "../../billing/api-keys.server";
import { mintProgramKey, verifyKey } from "../../billing/license.server";
import { setThrottleStore } from "../throttle-store";

const PEPPER = "fp-test-pepper-api-keys";
const PIN = "test-operator-pin";
const ORG = "Cascade College Pharmacy Tech Program";
const saved = { ...process.env };

/** A key that works until two months from today, whenever the test runs. */
function liveKey(tier: "developer" | "education", org = ORG): string {
  const now = new Date();
  const total = now.getUTCFullYear() * 12 + now.getUTCMonth() + 2;
  return mintApiKey(tier, org, Math.floor(total / 12), (total % 12) + 1, now);
}

function search(headers: Record<string, string> = {}, ip = "203.0.113.7"): Request {
  return new Request("http://localhost/api/cds/search?q=warfarin&limit=1", {
    headers: { "x-real-ip": ip, ...headers },
  });
}

beforeEach(() => {
  process.env.LICENSE_PEPPER = PEPPER;
  process.env.FOUNDER_PIN = PIN;
  process.env.VERCEL = "1"; // clientKey trusts x-real-ip only on Vercel
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
  setThrottleStore(null); // per-instance counts only
  resetApiMeters();
});
afterEach(() => {
  process.env = { ...saved };
  setThrottleStore(undefined);
  resetApiMeters();
});

describe("API keys: mint and verify", () => {
  it("mints a deterministic FP-API key that verifies with its tier", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const a = mintApiKey("education", ORG, 2027, 12, now);
    const b = mintApiKey("education", `  ${ORG.toUpperCase()} `, 2027, 12, now);
    assert.equal(a, b);
    assert.match(a, API_KEY_RE);
    assert.ok(a.startsWith("FP-API-E202712-"));
    const v = verifyApiKey(a.toLowerCase(), now);
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.tier, "education");
      assert.ok(!v.keyId.includes(a.slice(-8)), "the key id carries no signature");
    }
    assert.notEqual(mintApiKey("developer", ORG, 2027, 6, now).slice(15, 23), mintProgramKey("team", ORG, 2027, 6, now).slice(15, 23));
  });

  it("refuses tampered, foreign and ended keys", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const key = mintApiKey("developer", ORG, 2027, 3, now);
    const last = key.at(-1) === "0" ? "1" : "0";
    assert.deepEqual(verifyApiKey(`${key.slice(0, -1)}${last}`, now).ok, false);
    const upgraded = key.replace("FP-API-D", "FP-API-E");
    const u = verifyApiKey(upgraded, now);
    assert.equal(u.ok, false);
    if (!u.ok) assert.equal(u.reason, "signature");
    const ended = verifyApiKey(key, new Date("2027-04-01T00:00:00Z"));
    assert.equal(ended.ok, false);
    if (!ended.ok) {
      assert.equal(ended.reason, "expired");
      assert.match(ended.detail, /ended on March 31, 2027/);
    }
    // Families never cross: a program key is not an API key, and an API key does not redeem on the desk.
    const program = mintProgramKey("site", ORG, 2027, 3, now);
    assert.equal(verifyApiKey(program, now).ok, false);
    assert.equal(verifyKey(key, now).ok, false);
  });

  it("caps the end month by tier", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    assert.throws(() => mintApiKey("developer", ORG, 2027, 12, now), /within 12 months/);
    assert.ok(mintApiKey("education", ORG, 2029, 11, now));
    assert.throws(() => mintApiKey("education", ORG, 2029, 12, now), /within 36 months/);
    assert.throws(() => mintApiKey("education", ORG, 2026, 10, now), /already passed/);
    assert.throws(() => mintApiKey("education", " ", 2027, 1, now), /organization/);
  });

  it("the operator mint needs the PIN", async () => {
    const now = new Date("2026-11-08T12:00:00Z");
    const wrong = await mintApiKeyForOperator({ pin: "nope", tier: "education", org: ORG, end: "2027-06" }, now);
    assert.deepEqual(wrong, { ok: false, reason: "Operator PIN is wrong." });
    const right = await mintApiKeyForOperator({ pin: PIN, tier: "education", org: ORG, end: "2027-06" }, now);
    assert.equal(right.ok, true);
    if (right.ok) {
      assert.equal(right.key, mintApiKey("education", ORG, 2027, 6, now));
      assert.equal(right.endsAt, "2027-06-30T23:59:59.999Z");
    }
    const tier = await mintApiKeyForOperator({ pin: PIN, tier: "site", org: ORG, end: "2027-06" }, now);
    assert.equal(tier.ok, false);
  });

  it("will not verify with the default pepper in production", () => {
    const key = liveKey("education");
    delete process.env.LICENSE_PEPPER;
    process.env.NODE_ENV = "production";
    const v = verifyApiKey(key);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "unavailable");
  });
});

describe("API keys: reading the request", () => {
  it("takes Bearer or x-api-key, and refuses other schemes and two different keys", () => {
    const h = (headers: Record<string, string>) => presentedKey(new Request("http://localhost/", { headers }));
    assert.deepEqual(h({}), { kind: "none" });
    assert.deepEqual(h({ authorization: "Bearer FP-API-X" }), { kind: "key", key: "FP-API-X" });
    assert.deepEqual(h({ authorization: "bearer  FP-API-X " }), { kind: "key", key: "FP-API-X" });
    assert.deepEqual(h({ "x-api-key": "FP-API-Y" }), { kind: "key", key: "FP-API-Y" });
    assert.equal(h({ authorization: "Basic dXNlcjpwYXNz" }).kind, "unreadable");
    assert.equal(h({ authorization: "Bearer A", "x-api-key": "B" }).kind, "unreadable");
    assert.deepEqual(h({ authorization: "Bearer a", "x-api-key": "A" }), { kind: "key", key: "a" });
  });
});

describe("/api/cds: keys and rate limits", () => {
  it("health stays open: no key, no meter, and a bad key is ignored", async () => {
    for (let i = 0; i < API_LIMITS.anonymous.max + 3; i++) {
      const res = await handleCdsRequest(
        new Request("http://localhost/api/cds/health", { headers: { "x-real-ip": "203.0.113.9", authorization: "Bearer junk" } }),
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("ratelimit-limit"), null);
    }
  });

  it("anonymous calls work, are counted per address, then get a 429 with Retry-After", async () => {
    const max = API_LIMITS.anonymous.max;
    for (let i = 0; i < max; i++) {
      const res = await handleCdsRequest(search());
      assert.equal(res.status, 200, `call ${i + 1}`);
      assert.equal(res.headers.get("ratelimit-limit"), String(max));
      assert.equal(res.headers.get("ratelimit-remaining"), String(max - i - 1));
      assert.equal(res.headers.get("x-firstpass-api-tier"), "anonymous");
      assert.equal(res.headers.get("ratelimit-policy"), `${max};w=60`);
      assert.ok(Number(res.headers.get("ratelimit-reset")) >= 1);
    }
    const limited = await handleCdsRequest(search());
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get("content-type")?.includes("application/problem+json"));
    const retry = Number(limited.headers.get("retry-after"));
    assert.ok(retry >= 1 && retry <= 60, `Retry-After ${retry}`);
    assert.equal(limited.headers.get("ratelimit-remaining"), "0");
    const problem = (await limited.json()) as ProblemDetails;
    assert.equal(problem.status, 429);
    assert.equal(problem.title, "Too Many Requests");
    assert.equal(problem.instance, "/api/cds/search");
    assert.match(problem.detail, /send an API key/);

    // POST endpoints share the same per-address meter.
    const check = await handleCdsRequest(
      new Request("http://localhost/api/cds/check", {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.7", "content-type": "application/json" },
        body: JSON.stringify({ drugs: ["warfarin", "fluconazole"] }),
      }),
    );
    assert.equal(check.status, 429);

    // Another address has its own count.
    assert.equal((await handleCdsRequest(search({}, "198.51.100.4"))).status, 200);
  });

  it("a valid key is accepted with its tier's higher limit, by Bearer or x-api-key", async () => {
    const key = liveKey("education");
    const max = API_LIMITS.education.max;
    assert.ok(max > API_LIMITS.anonymous.max);
    for (let i = 0; i < API_LIMITS.anonymous.max + 5; i++) {
      const headers: Record<string, string> = i % 2 ? { authorization: `Bearer ${key}` } : { "x-api-key": key };
      const res = await handleCdsRequest(search(headers));
      assert.equal(res.status, 200, `call ${i + 1}`);
      assert.equal(res.headers.get("x-firstpass-api-tier"), "education");
      assert.equal(res.headers.get("ratelimit-limit"), String(max));
      assert.equal(res.headers.get("ratelimit-remaining"), String(max - i - 1));
    }
    // The key's meter is not the address's meter.
    const anon = await handleCdsRequest(search());
    assert.equal(anon.status, 200);
    assert.equal(anon.headers.get("ratelimit-remaining"), String(API_LIMITS.anonymous.max - 1));
  });

  it("a developer key gets its own limit, then a 429", async () => {
    const key = liveKey("developer", "Study App Prototype");
    const max = API_LIMITS.developer.max;
    for (let i = 0; i < max; i++) {
      const res = await handleCdsRequest(search({ authorization: `Bearer ${key}` }, `192.0.2.${(i % 200) + 1}`));
      assert.equal(res.status, 200, `call ${i + 1}`);
    }
    const limited = await handleCdsRequest(search({ authorization: `Bearer ${key}` }, "192.0.2.250"));
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) >= 1);
    assert.match(((await limited.json()) as ProblemDetails).detail, /Developer key is limited to 60/);
  });

  it("a tampered key is a 401 problem, not an anonymous call", async () => {
    const key = liveKey("education");
    const tampered = `${key.slice(0, -1)}${key.at(-1) === "A" ? "B" : "A"}`;
    const res = await handleCdsRequest(search({ authorization: `Bearer ${tampered}` }));
    assert.equal(res.status, 401);
    assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
    assert.match(res.headers.get("www-authenticate") ?? "", /^Bearer realm=/);
    const problem = (await res.json()) as ProblemDetails;
    assert.equal(problem.status, 401);
    assert.equal(problem.type, "https://firstpass.app/errors/invalid-api-key");
    assert.match(problem.detail, /does not verify/);

    const refused: Record<string, string>[] = [{ "x-api-key": "not-a-key" }, { authorization: "Basic abc" }];
    for (const headers of refused) {
      assert.equal((await handleCdsRequest(search(headers))).status, 401);
    }
  });

  it("an ended key is a 401 that says when it ended", async () => {
    const ended = mintApiKey("education", ORG, 2025, 6, new Date("2025-01-15T00:00:00Z"));
    const res = await handleCdsRequest(search({ "x-api-key": ended }));
    assert.equal(res.status, 401);
    assert.match(((await res.json()) as ProblemDetails).detail, /ended on June 30, 2025/);
  });

  it("with no pepper in production a key is a 503, and anonymous calls still work", async () => {
    const key = liveKey("education");
    delete process.env.LICENSE_PEPPER;
    process.env.NODE_ENV = "production";
    assert.equal((await handleCdsRequest(search({ "x-api-key": key }))).status, 503);
    assert.equal((await handleCdsRequest(search())).status, 200);
  });

  it("off Vercel, callers that cannot be told apart are never refused for the anonymous limit", async () => {
    delete process.env.VERCEL;
    for (let i = 0; i < API_LIMITS.anonymous.max + 3; i++) {
      const res = await handleCdsRequest(search());
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("ratelimit-policy"), `${API_LIMITS.anonymous.max};w=60`);
    }
  });
});
