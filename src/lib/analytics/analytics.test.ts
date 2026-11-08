import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  parseDevice,
  sanitizePath,
  sanitizeReferrer,
  extractCountry,
  handleCollectRequest,
  resetCollectLimiter,
  COLLECT_RATE_LIMIT,
} from "./collect.server";
import {
  computeVisitorCode,
  utcDayString,
  AnalyticsStore,
  setAnalyticsStore,
} from "./store.server";
import { handleGetSiteStats, handleStatsRequest, STATS_SECURITY_HEADERS } from "./stats.server";
import { STATS_RANGES, type Device } from "./contract";
import { resetPinThrottle } from "../billing/license.server";
import type { Sql } from "../db";

test("sanitizePath extracts pathname and strictly strips queries and hashes", () => {
  assert.equal(sanitizePath("/pairs?q=warfarin+aspirin"), "/pairs");
  assert.equal(sanitizePath("/drug/metformin#section-pk"), "/drug/metformin");
  assert.equal(sanitizePath("/for-programs/nursing?utm_source=twitter&utm_medium=cpc#pricing"), "/for-programs/nursing");
  assert.equal(sanitizePath("https://example.com/not-a-root-path"), null);
  assert.equal(sanitizePath("relative/path"), null);
  assert.equal(sanitizePath(""), null);
  assert.equal(sanitizePath(123), null);

  const longPath = "/" + "a".repeat(300);
  const sanitized = sanitizePath(longPath);
  assert.ok(sanitized);
  assert.equal(sanitized.length, 200);
});

test("sanitizeReferrer extracts domain only and strips search queries and same-host referrals", () => {
  assert.equal(sanitizeReferrer("https://www.google.com/search?q=firstpass+interactions"), "google.com");
  assert.equal(sanitizeReferrer("https://bing.com/news?item=1234"), "bing.com");
  assert.equal(sanitizeReferrer("https://firstpass.org/pairs", "firstpass.org"), "");
  assert.equal(sanitizeReferrer("http://localhost:8080/desk", "firstpass.org"), "");
  assert.equal(sanitizeReferrer("not-a-valid-url"), "");
  assert.equal(sanitizeReferrer(""), "");
});

test("parseDevice classifies desktop, phone, and tablet User-Agents accurately", () => {
  const desktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
  const androidPhone = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36";
  const ipad = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15";

  assert.equal(parseDevice(desktop), "desktop");
  assert.equal(parseDevice(iphone), "phone");
  assert.equal(parseDevice(androidPhone), "phone");
  assert.equal(parseDevice(ipad), "tablet");
});

test("extractCountry extracts valid ISO 3166-1 alpha-2 codes and rejects invalid strings", () => {
  const reqVercel = new Request("http://localhost/api/collect", {
    headers: { "x-vercel-ip-country": "US" },
  });
  assert.equal(extractCountry(reqVercel), "US");

  const reqCf = new Request("http://localhost/api/collect", {
    headers: { "cf-ipcountry": "ca" },
  });
  assert.equal(extractCountry(reqCf), "CA");

  const reqInvalid = new Request("http://localhost/api/collect", {
    headers: { "x-vercel-ip-country": "USA" },
  });
  assert.equal(extractCountry(reqInvalid), "");
});

test("computeVisitorCode rotates with daily salt, preventing cross-day user linking", () => {
  const ip = "198.51.100.42";
  const ua = "Mozilla/5.0 (Windows NT 10.0)";
  const saltDay1 = "salt-day-1-abcdef123456";
  const saltDay2 = "salt-day-2-789012fedcba";

  const code1 = computeVisitorCode(saltDay1, ip, ua);
  const code1Repeat = computeVisitorCode(saltDay1, ip, ua);
  const code2 = computeVisitorCode(saltDay2, ip, ua);

  assert.equal(code1, code1Repeat);
  assert.equal(code1.length, 32);
  assert.notEqual(code1, code2);
});

test("handleCollectRequest handles beacon POST requests and ignores non-POST", async () => {
  const getReq = new Request("http://localhost/api/collect", { method: "GET" });
  const getRes = await handleCollectRequest(getReq);
  assert.equal(getRes.status, 405);

  const postReq = new Request("http://localhost/api/collect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: "/pairs" }),
  });
  const postRes = await handleCollectRequest(postReq);
  assert.equal(postRes.status, 204);
});

test("handleGetSiteStats rejects invalid PIN and returns stats when PIN is valid", async () => {
  // Wrong PIN
  const badRes = await handleGetSiteStats({ pin: "wrong-pin-123", days: 30 });
  assert.equal(badRes.ok, false);

  // Development default PIN in test environment
  const goodRes = await handleGetSiteStats({ pin: "heme-450", days: 30 });
  assert.equal(goodRes.ok, true);
  if (goodRes.ok) {
    assert.equal(goodRes.stats.days, 30);
    assert.ok(Array.isArray(goodRes.stats.daily));
    assert.ok(Array.isArray(goodRes.stats.pages));
  }
});

test("AnalyticsStore records views and produces zero-filled aggregate stats", async () => {
  const salts: Array<{ day: string; salt: string; expires_ms: number }> = [];
  const views: Array<{
    day: string;
    visitor_code: string;
    path: string;
    referrer_host: string;
    country: string;
    device: string;
    created_at_ms: number;
  }> = [];

  const mockSql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    const raw = strings.join("?");

    if (raw.includes("SELECT salt FROM analytics_salts")) {
      const day = values[0] as string;
      const found = salts.find((s) => s.day === day);
      return (found ? [{ salt: found.salt }] : []) as T[];
    }

    if (raw.includes("INSERT INTO analytics_salts")) {
      const [day, salt, expiresMs] = values as [string, string, number];
      if (!salts.some((s) => s.day === day)) {
        salts.push({ day, salt, expires_ms: expiresMs });
      }
      return [] as T[];
    }

    if (raw.includes("INSERT INTO analytics_views")) {
      const [day, visitorCode, path, referrerHost, country, device, now] = values as [
        string,
        string,
        string,
        string,
        string,
        string,
        number,
      ];
      views.push({
        day,
        visitor_code: visitorCode,
        path,
        referrer_host: referrerHost,
        country,
        device,
        created_at_ms: now,
      });
      return [] as T[];
    }

    if (raw.includes("GROUP BY day")) {
      const byDay = new Map<string, { views: number; visitors: Set<string> }>();
      for (const v of views) {
        let entry = byDay.get(v.day);
        if (!entry) {
          entry = { views: 0, visitors: new Set() };
          byDay.set(v.day, entry);
        }
        entry.views++;
        entry.visitors.add(v.visitor_code);
      }
      return Array.from(byDay.entries()).map(([day, val]) => ({
        day,
        views: val.views,
        visitors: val.visitors.size,
      })) as T[];
    }

    if (raw.includes("GROUP BY path")) {
      const byPath = new Map<string, { views: number; visitors: Set<string> }>();
      for (const v of views) {
        let entry = byPath.get(v.path);
        if (!entry) {
          entry = { views: 0, visitors: new Set() };
          byPath.set(v.path, entry);
        }
        entry.views++;
        entry.visitors.add(v.visitor_code);
      }
      return Array.from(byPath.entries()).map(([path, val]) => ({
        path,
        views: val.views,
        visitors: val.visitors.size,
      })) as T[];
    }

    if (raw.includes("GROUP BY referrer_host")) {
      const byRef = new Map<string, number>();
      for (const v of views) {
        if (!v.referrer_host) continue;
        byRef.set(v.referrer_host, (byRef.get(v.referrer_host) || 0) + 1);
      }
      return Array.from(byRef.entries()).map(([host, count]) => ({
        host,
        views: count,
      })) as T[];
    }

    if (raw.includes("GROUP BY country")) {
      const byCountry = new Map<string, number>();
      for (const v of views) {
        byCountry.set(v.country, (byCountry.get(v.country) || 0) + 1);
      }
      return Array.from(byCountry.entries()).map(([code, count]) => ({
        code,
        views: count,
      })) as T[];
    }

    if (raw.includes("GROUP BY device")) {
      const byDev = new Map<string, number>();
      for (const v of views) {
        byDev.set(v.device, (byDev.get(v.device) || 0) + 1);
      }
      return Array.from(byDev.entries()).map(([device, count]) => ({
        device,
        views: count,
      })) as T[];
    }

    return [] as T[];
  }) as import("../db").Sql;
  mockSql.query = async <T = Record<string, unknown>>(): Promise<T[]> => [] as T[];

  const store = new AnalyticsStore(mockSql);
  const now = 1794140000000;

  await store.recordView({
    path: "/pairs",
    referrerHost: "google.com",
    country: "US",
    device: "desktop",
    ip: "192.0.2.1",
    userAgent: "Chrome",
    now,
  });

  await store.recordView({
    path: "/pairs",
    referrerHost: "google.com",
    country: "US",
    device: "desktop",
    ip: "192.0.2.1",
    userAgent: "Chrome",
    now: now + 1000,
  });

  await store.recordView({
    path: "/drug/warfarin",
    referrerHost: "",
    country: "CA",
    device: "phone",
    ip: "192.0.2.2",
    userAgent: "iPhone",
    now: now + 2000,
  });

  const stats = await store.getStats(7, now + 3000);
  assert.equal(stats.enabled, true);
  assert.equal(stats.days, 7);
  assert.equal(stats.totals.views, 3);
  assert.equal(stats.totals.visitors, 2);
  assert.equal(stats.daily.length, 7); // Exactly 7 days, zero-filled
  assert.equal(stats.pages[0]?.path, "/pairs");
  assert.equal(stats.pages[0]?.views, 2);
  assert.equal(stats.pages[0]?.visitors, 1);
  assert.equal(stats.referrers[0]?.host, "google.com");
  assert.equal(stats.referrers[0]?.views, 2);
  assert.equal(stats.countries.find((c) => c.code === "US")?.views, 2);
  assert.equal(stats.countries.find((c) => c.code === "CA")?.views, 1);
  assert.equal(stats.devices.find((d) => d.device === "desktop")?.views, 2);
  assert.equal(stats.devices.find((d) => d.device === "phone")?.views, 1);
});

test("handleCollectRequest enforces sliding window rate limit per client key and guards against flood attacks", async () => {
  resetCollectLimiter();
  const vercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const ipA = "203.0.113.50";
    const ipB = "203.0.113.51";
    const t0 = 1794150000000;

    const makeReq = (ip: string, path = "/pairs") =>
      new Request("http://localhost/api/collect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": ip,
        },
        body: JSON.stringify({ path }),
      });

    // Client A sends exactly COLLECT_RATE_LIMIT.max (120) requests at t0
    for (let i = 0; i < COLLECT_RATE_LIMIT.max; i++) {
      const res = await handleCollectRequest(makeReq(ipA), t0 + i * 10);
      assert.equal(res.status, 204, `request ${i + 1} should succeed`);
    }

    // Client A sends 121st request at t0 + 2000ms: must return 429
    const floodRes = await handleCollectRequest(makeReq(ipA), t0 + 2000);
    assert.equal(floodRes.status, 429, "121st request must be rate limited");
    assert.ok(floodRes.headers.get("retry-after"), "must provide Retry-After header");
    assert.match(floodRes.headers.get("cache-control") ?? "", /no-store/);

    // Client B from another IP is independent and must NOT be blocked
    const clientBRes = await handleCollectRequest(makeReq(ipB), t0 + 2050);
    assert.equal(clientBRes.status, 204, "client B must succeed independently");

    // Once window advances past 60s, client A's oldest slots free up
    const futureRes = await handleCollectRequest(
      makeReq(ipA),
      t0 + COLLECT_RATE_LIMIT.windowMs + 500,
    );
    assert.equal(futureRes.status, 204, "request after window moves should succeed");
  } finally {
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
    resetCollectLimiter();
  }
});

test("migrations/0003_analytics.sql executes cleanly and idempotently multiple times on PGlite", async () => {
  const migration = readFileSync(
    new URL("../../../migrations/0003_analytics.sql", import.meta.url),
    "utf8",
  );
  // Guarantee no non-idempotent or destructive statements
  assert.doesNotMatch(migration, /\b(drop|alter|truncate)\b/i);

  const pg = new PGlite();
  await pg.waitReady;

  try {
    // Run 1: initial table & index creation
    await pg.exec(migration);

    // Run 2: idempotent re-execution (simulating redeploy or restart)
    await pg.exec(migration);

    // Run 3: third execution to assert stability
    await pg.exec(migration);

    // Assert tables exist and are queryable
    const saltsRes = await pg.query<{ cnt: number | string }>("SELECT COUNT(*) as cnt FROM analytics_salts");
    assert.equal(Number(saltsRes.rows[0]?.cnt), 0);

    const viewsRes = await pg.query<{ cnt: number | string }>("SELECT COUNT(*) as cnt FROM analytics_views");
    assert.equal(Number(viewsRes.rows[0]?.cnt), 0);

    // Assert all 5 expected indexes exist in pg_indexes
    const indexesRes = await pg.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE tablename IN ('analytics_salts', 'analytics_views')",
    );
    const indexNames = indexesRes.rows.map((r) => r.indexname);
    assert.ok(indexNames.includes("analytics_salts_pkey"), "analytics_salts_pkey must exist");
    assert.ok(indexNames.includes("analytics_salts_expires"), "analytics_salts_expires must exist");
    assert.ok(indexNames.includes("analytics_views_day"), "analytics_views_day must exist");
    assert.ok(indexNames.includes("analytics_views_path"), "analytics_views_path must exist");
    assert.ok(indexNames.includes("analytics_views_created"), "analytics_views_created must exist");
  } finally {
    await pg.close();
  }
});

test("AnalyticsStore retention pruning and aggregate queries on live PGlite database", async () => {
  const migration = readFileSync(
    new URL("../../../migrations/0003_analytics.sql", import.meta.url),
    "utf8",
  );
  const pg = new PGlite({ parsers: { 20: Number } });
  await pg.waitReady;
  await pg.exec(migration);

  try {
    // Construct Sql tagged-template adapter over PGlite
    const pgliteSql = (async <T = Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T[]> => {
      let query = strings[0]!;
      for (let i = 0; i < values.length; i++) {
        query += `$${i + 1}${strings[i + 1]}`;
      }
      const res = await pg.query<T>(query, values);
      return res.rows;
    }) as unknown as Sql;
    pgliteSql.query = async <T = Record<string, unknown>>(
      text: string,
      params: unknown[] = [],
    ): Promise<T[]> => (await pg.query<T>(text, params)).rows;

    const store = new AnalyticsStore(pgliteSql);
    const now = 1794160000000;
    const day = utcDayString(now);

    // Record legitimate page views
    await store.recordView({
      path: "/pairs",
      referrerHost: "google.com",
      country: "US",
      device: "desktop",
      ip: "203.0.113.1",
      userAgent: "Mozilla/5.0 Chrome",
      now,
    });

    await store.recordView({
      path: "/pairs",
      referrerHost: "google.com",
      country: "US",
      device: "desktop",
      ip: "203.0.113.2",
      userAgent: "Mozilla/5.0 Firefox",
      now: now + 1000,
    });

    await store.recordView({
      path: "/drug/metformin",
      referrerHost: "bing.com",
      country: "CA",
      device: "phone",
      ip: "203.0.113.3",
      userAgent: "Mozilla/5.0 Mobile",
      now: now + 2000,
    });

    // Manually insert an expired view (> 90 days old)
    const ninetyFiveDaysAgo = now - 95 * 24 * 60 * 60 * 1000;
    await pg.query(
      `INSERT INTO analytics_views (day, visitor_code, path, referrer_host, country, device, created_at_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [utcDayString(ninetyFiveDaysAgo), "old-code", "/old-path", "", "US", "desktop", ninetyFiveDaysAgo],
    );

    // Manually insert an expired salt (> 48h expired)
    await pg.query(
      `INSERT INTO analytics_salts (day, salt, expires_ms)
       VALUES ($1, $2, $3)`,
      ["2026-08-01", "old-salt-value", now - 1000],
    );

    // Verify initial count includes the expired records
    const preViews = await pg.query<{ cnt: number | string }>("SELECT COUNT(*) as cnt FROM analytics_views");
    assert.equal(Number(preViews.rows[0]?.cnt), 4);
    const preSalts = await pg.query<{ cnt: number | string }>("SELECT COUNT(*) as cnt FROM analytics_salts");
    assert.equal(Number(preSalts.rows[0]?.cnt), 2);

    // Trigger sweep after SWEEP_EVERY_MS (1 hour) has passed
    const oneHourLater = now + 60 * 60 * 1000 + 1000;
    await store.sweep(oneHourLater);

    // Verify expired records were pruned
    const postViews = await pg.query<{ cnt: number | string }>("SELECT COUNT(*) as cnt FROM analytics_views");
    assert.equal(Number(postViews.rows[0]?.cnt), 3, "expired view (> 90d) must be pruned");

    const postSalts = await pg.query<{ cnt: number | string }>("SELECT COUNT(*) as cnt FROM analytics_salts");
    assert.equal(Number(postSalts.rows[0]?.cnt), 1, "expired salt (> 48h) must be pruned");

    // Verify aggregate statistics on live PGlite
    const stats = await store.getStats(7, now + 5000);
    assert.equal(stats.enabled, true);
    assert.equal(stats.totals.views, 3);
    assert.equal(stats.totals.visitors, 3);
    assert.equal(stats.pages[0]?.path, "/pairs");
    assert.equal(stats.pages[0]?.views, 2);
    assert.equal(stats.pages[1]?.path, "/drug/metformin");
    assert.equal(stats.pages[1]?.views, 1);
    assert.equal(stats.referrers.find((r) => r.host === "google.com")?.views, 2);
    assert.equal(stats.referrers.find((r) => r.host === "bing.com")?.views, 1);
  } finally {
    await pg.close();
  }
});

test("handleStatsRequest enforces HTTP method, security headers, and JSON structure", async () => {
  // Method other than POST returns 405
  const getReq = new Request("http://localhost/api/stats", { method: "GET" });
  const getRes = await handleStatsRequest(getReq);
  assert.equal(getRes.status, 405);
  assert.equal(getRes.headers.get("allow"), "POST");
  assert.match(getRes.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(getRes.headers.get("x-content-type-options"), "nosniff");

  // Invalid JSON returns 400 with security headers
  const badJsonReq = new Request("http://localhost/api/stats", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ malformed json",
  });
  const badJsonRes = await handleStatsRequest(badJsonReq);
  assert.equal(badJsonRes.status, 400);
  assert.match(badJsonRes.headers.get("cache-control") ?? "", /no-store/);
});

test("handleStatsRequest and handleGetSiteStats enforce brute-force backoff and 429 refusal on repeated invalid PINs", async () => {
  resetPinThrottle();
  const vercel = process.env.VERCEL;
  process.env.VERCEL = "1";

  try {
    const ip = "203.0.113.88";
    const postPin = (pin: string) =>
      new Request("http://localhost/api/stats", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": ip,
        },
        body: JSON.stringify({ pin, days: 30 }),
      });

    // First 5 invalid guesses consume free strikes and return 401 Unauthorized
    for (let i = 0; i < 5; i++) {
      const res = await handleStatsRequest(postPin(`wrong-pin-${i}`));
      assert.equal(res.status, 401, `attempt ${i + 1} should return 401`);
      const body = (await res.json()) as { ok: boolean; reason: string };
      assert.equal(body.ok, false);
      assert.equal(body.reason, "Operator PIN is wrong.");
      assert.match(res.headers.get("cache-control") ?? "", /no-store/);
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    }

    // 6th invalid guess trips the rate limiter and returns 429 Too Many Requests
    const floodRes = await handleStatsRequest(postPin("wrong-pin-flood"));
    assert.equal(floodRes.status, 429, "6th failed attempt must return 429");
    assert.ok(floodRes.headers.get("retry-after"), "must include Retry-After header");
    assert.match(floodRes.headers.get("cache-control") ?? "", /no-store/);
    const floodBody = (await floodRes.json()) as { ok: boolean; reason: string };
    assert.equal(floodBody.ok, false);
    assert.match(floodBody.reason, /^Too many wrong PINs from here/);

    // Direct call to handleGetSiteStats from same IP is also refused
    const directRes = await handleGetSiteStats({ pin: "wrong-pin-direct", days: 30 }, ip);
    assert.equal(directRes.ok, false);
    assert.match(directRes.reason, /^Too many wrong PINs from here/);
  } finally {
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
    resetPinThrottle();
  }
});

test("handleStatsRequest retrieves aggregate stats with zero leakage of salt or visitor IP data", async () => {
  resetPinThrottle();
  const migration = readFileSync(
    new URL("../../../migrations/0003_analytics.sql", import.meta.url),
    "utf8",
  );
  const pg = new PGlite({ parsers: { 20: Number } });
  await pg.waitReady;
  await pg.exec(migration);

  try {
    const pgliteSql = (async <T = Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T[]> => {
      let query = strings[0]!;
      for (let i = 0; i < values.length; i++) {
        query += `$${i + 1}${strings[i + 1]}`;
      }
      return (await pg.query<T>(query, values)).rows;
    }) as unknown as Sql;
    pgliteSql.query = async <T = Record<string, unknown>>(
      text: string,
      params: unknown[] = [],
    ): Promise<T[]> => (await pg.query<T>(text, params)).rows;

    const store = new AnalyticsStore(pgliteSql);
    setAnalyticsStore(store);

    const secretIp = "198.51.100.77";
    const secretUa = "ConfidentialBrowser/9.9";
    const now = 1794170000000;

    await store.recordView({
      path: "/pairs",
      referrerHost: "partner.org",
      country: "US",
      device: "desktop",
      ip: secretIp,
      userAgent: secretUa,
      now,
    });

    const validPinReq = new Request("http://localhost/api/stats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: "heme-450", days: 7 }),
    });

    const res = await handleStatsRequest(validPinReq);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");

    const text = await res.text();
    const json = JSON.parse(text) as { ok: boolean; stats: Record<string, unknown> };

    assert.equal(json.ok, true);
    assert.ok(json.stats);

    // Strict privacy invariant assertion: zero leakage of raw IP, user agent, or salts
    assert.doesNotMatch(text, new RegExp(secretIp));
    assert.doesNotMatch(text, new RegExp(secretUa));
    assert.doesNotMatch(text, /"salt"/i);
    assert.doesNotMatch(text, /"visitor_code"/i);
  } finally {
    setAnalyticsStore(undefined);
    await pg.close();
    resetPinThrottle();
  }
});

test("handleStatsRequest maintains stability and idempotency under high concurrent volume", async () => {
  resetPinThrottle();
  const requests = Array.from({ length: 50 }, () =>
    new Request("http://localhost/api/stats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: "heme-450", days: 30 }),
    }),
  );

  const responses = await Promise.all(requests.map((r) => handleStatsRequest(r)));
  assert.equal(responses.length, 50);

  for (const res of responses) {
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  }
  resetPinThrottle();
});

