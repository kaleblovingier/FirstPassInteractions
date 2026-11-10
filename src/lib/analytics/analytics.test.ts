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
  MAX_SALT_CACHE_ENTRIES,
} from "./store.server";
import { handleGetSiteStats, handleStatsRequest, STATS_SECURITY_HEADERS } from "./stats.server";
import { STATS_RANGES, type Device, type SiteStats } from "./contract";
import { resetPinThrottle } from "../billing/license.server";
import {
  exportStatsToJson,
  exportStatsToCsv,
  generateExportFilename,
  sanitizeExportPath,
  downloadAnalyticsExport,
  escapeCsv,
  formatIsoTimestamp,
  computeExportSummary,
  type AnalyticsExportReport,
} from "./export";
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

test("aggregate export produces structured zero-PHI JSON and multi-section CSV reports with format integrity", () => {
  const mockStats: SiteStats = {
    enabled: true,
    days: 30,
    totals: { views: 4200, visitors: 1850 },
    daily: [
      { day: "2026-11-01", views: 200, visitors: 90 },
      { day: "2026-11-02", views: 250, visitors: 110 },
    ],
    pages: [
      { path: "/pairs", views: 2100, visitors: 950 },
      { path: "/catalog", views: 1500, visitors: 700 },
    ],
    referrers: [
      { host: "pubmed.ncbi.nlm.nih.gov", views: 800 },
      { host: "google.com", views: 600 },
    ],
    countries: [
      { code: "US", views: 3000 },
      { code: "CA", views: 700 },
    ],
    devices: [
      { device: "desktop", views: 2600 },
      { device: "phone", views: 1400 },
      { device: "tablet", views: 200 },
    ],
  };

  const fixedTimestamp = 1794171600000; // 2026-11-08T21:00:00.000Z
  const jsonStr = exportStatsToJson(mockStats, fixedTimestamp);
  const parsed = JSON.parse(jsonStr) as AnalyticsExportReport;

  // Verify JSON schema and structure
  assert.equal(parsed.schema, "firstpass-analytics-aggregate-v1");
  assert.equal(parsed.timeframeDays, 30);
  assert.equal(parsed.totals.views, 4200);
  assert.equal(parsed.totals.visitors, 1850);
  assert.equal(parsed.daily.length, 2);
  assert.equal(parsed.daily[0]?.day, "2026-11-01");
  assert.equal(parsed.daily[0]?.views, 200);
  assert.equal(parsed.daily[0]?.visitors, 90);
  assert.equal(parsed.pages.length, 2);
  assert.equal(parsed.pages[0]?.path, "/pairs");
  assert.equal(parsed.referrers[0]?.host, "pubmed.ncbi.nlm.nih.gov");
  assert.equal(parsed.countries[0]?.code, "US");
  assert.equal(parsed.devices[0]?.device, "desktop");

  // Verify CSV format and RFC 4180 escaping
  const csvStr = exportStatsToCsv(mockStats, fixedTimestamp);
  assert.ok(csvStr.includes("# FirstPass Analytics Aggregate Export"));
  assert.ok(csvStr.includes("[TOTALS]"));
  assert.ok(csvStr.includes("Total Page Views,4200"));
  assert.ok(csvStr.includes("Unique Daily Visitors,1850"));
  assert.ok(csvStr.includes("[DAILY BREAKDOWN]"));
  assert.ok(csvStr.includes("2026-11-01,200,90"));
  assert.ok(csvStr.includes("[TOP PAGES]"));
  assert.ok(csvStr.includes("/pairs,2100,950"));
  assert.ok(csvStr.includes("[TOP REFERRERS]"));
  assert.ok(csvStr.includes("pubmed.ncbi.nlm.nih.gov,800"));
  assert.ok(csvStr.includes("[GEOGRAPHIC REACH]"));
  assert.ok(csvStr.includes("US,3000"));
  assert.ok(csvStr.includes("[DEVICE BREAKDOWN]"));
  assert.ok(csvStr.includes("desktop,2600"));

  // Verify standard export filenames
  assert.equal(
    generateExportFilename(30, "json", fixedTimestamp),
    "firstpass-analytics-30d-2026-11-08.json",
  );
  assert.equal(
    generateExportFilename(7, "csv", fixedTimestamp),
    "firstpass-analytics-7d-2026-11-08.csv",
  );
});

test("aggregate export strictly guarantees zero-PHI, zero IPs, and zero drug query patterns", () => {
  const secretIpV4 = "192.0.2.146";
  const secretIpV6 = "2001:db8::8a2e:370:7334";
  const secretSalt = "daily-salt-secret-alpha99";
  const secretVisitorHash = "a3f5b7c9e1d2f4a6b8c0d2e4f6a8b0c2";
  const sensitiveQuery1 = "warfarin+aspirin";
  const sensitiveQuery2 = "metformin+contrast";

  const dirtyStats: SiteStats = {
    enabled: true,
    days: 7,
    totals: { views: 50, visitors: 20 },
    daily: [{ day: "2026-11-08", views: 50, visitors: 20 }],
    pages: [
      { path: `/pairs?q=${sensitiveQuery1}&patient_mrn=98765#results`, views: 30, visitors: 15 },
      { path: `/search?drug=${sensitiveQuery2}`, views: 20, visitors: 10 },
      { path: "relative/path/without/slash", views: 5, visitors: 3 },
    ],
    referrers: [{ host: "external.com", views: 10 }],
    countries: [{ code: "US", views: 50 }],
    devices: [{ device: "desktop", views: 50 }],
  };

  const jsonOutput = exportStatsToJson(dirtyStats);
  const csvOutput = exportStatsToCsv(dirtyStats);

  for (const output of [jsonOutput, csvOutput]) {
    // Assert zero IPv4 addresses
    assert.doesNotMatch(
      output,
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
    );
    assert.doesNotMatch(output, new RegExp(secretIpV4));
    assert.doesNotMatch(output, new RegExp(secretIpV6));

    // Assert zero visitor hashes or salts
    assert.doesNotMatch(output, new RegExp(secretSalt));
    assert.doesNotMatch(output, new RegExp(secretVisitorHash));
    assert.doesNotMatch(output, /"salt"/i);
    assert.doesNotMatch(output, /"visitor_code"/i);
    assert.doesNotMatch(output, /"ip"/i);

    // Assert zero drug query strings or clinical search queries
    assert.doesNotMatch(output, new RegExp(sensitiveQuery1.replace(/\+/g, "\\+")));
    assert.doesNotMatch(output, new RegExp(sensitiveQuery2.replace(/\+/g, "\\+")));
    assert.doesNotMatch(output, /patient_mrn/i);
    assert.doesNotMatch(output, /\?q=/i);
    assert.doesNotMatch(output, /\?drug=/i);
  }

  // Verify paths are strictly normalized
  const parsedJson = JSON.parse(jsonOutput) as AnalyticsExportReport;
  assert.equal(parsedJson.pages[0]?.path, "/pairs");
  assert.equal(parsedJson.pages[1]?.path, "/search");
  assert.equal(parsedJson.pages[2]?.path, "/relative/path/without/slash");

  // Verify sanitizeExportPath edge cases
  assert.equal(sanitizeExportPath("/pairs?q=amiodarone"), "/pairs");
  assert.equal(sanitizeExportPath("/drug/metformin#section-dosing"), "/drug/metformin");
  assert.equal(sanitizeExportPath(""), "/");
  assert.equal(sanitizeExportPath(null), "/");
  assert.equal(sanitizeExportPath(123), "/");
});

test("aggregate export handles empty datasets idempotently without throwing", () => {
  const emptyStats: SiteStats = {
    enabled: true,
    days: 90,
    totals: { views: 0, visitors: 0 },
    daily: [],
    pages: [],
    referrers: [],
    countries: [],
    devices: [],
  };

  const fixedTime = 1794171600000;
  const json1 = exportStatsToJson(emptyStats, fixedTime);
  const json2 = exportStatsToJson(emptyStats, fixedTime);
  assert.equal(json1, json2);

  const parsed = JSON.parse(json1) as AnalyticsExportReport;
  assert.equal(parsed.totals.views, 0);
  assert.equal(parsed.totals.visitors, 0);
  assert.deepEqual(parsed.daily, []);
  assert.deepEqual(parsed.pages, []);

  const csv1 = exportStatsToCsv(emptyStats, fixedTime);
  const csv2 = exportStatsToCsv(emptyStats, fixedTime);
  assert.equal(csv1, csv2);
  assert.ok(csv1.includes("Total Page Views,0"));

  // Verify downloadAnalyticsExport is safe in non-DOM (Node.js) environments
  assert.doesNotThrow(() => {
    downloadAnalyticsExport(emptyStats, "json");
    downloadAnalyticsExport(emptyStats, "csv");
  });
});

test("escapeCsv safely disarms spreadsheet formula injection triggers (=, +, -, @, \\t, \\r) per RFC 4180", () => {
  // Test direct neutralization of all 6 formula injection trigger characters
  assert.equal(escapeCsv("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
  assert.equal(
    escapeCsv('=HYPERLINK("http://evil.com","Click")'),
    `"'=HYPERLINK(""http://evil.com"",""Click"")"`,
  );
  assert.equal(escapeCsv("+1+1"), "'+1+1");
  assert.equal(escapeCsv("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
  assert.equal(escapeCsv("-10+20*cmd"), "'-10+20*cmd");
  assert.equal(escapeCsv("@SUM(A1:B5)"), "'@SUM(A1:B5)");
  assert.equal(escapeCsv("\t=DDE"), "'\t=DDE");
  assert.equal(
    escapeCsv("\t=DDE(server,topic,item)"),
    `"'\t=DDE(server,topic,item)"`,
  );
  assert.equal(escapeCsv("\r=ALERT(1)"), `"'\r=ALERT(1)"`);

  // Verify non-formula cells are NOT prepended with a quote
  assert.equal(escapeCsv(""), "");
  assert.equal(escapeCsv(null), "");
  assert.equal(escapeCsv(undefined), "");
  assert.equal(escapeCsv(4200), "4200");
  assert.equal(escapeCsv("desktop"), "desktop");
  assert.equal(escapeCsv("US"), "US");
  assert.equal(escapeCsv("/pairs"), "/pairs");
  assert.equal(escapeCsv("2026-11-08"), "2026-11-08");
  assert.equal(escapeCsv("google.com"), "google.com");
  assert.equal(escapeCsv("A, B"), '"A, B"');
  assert.equal(escapeCsv('Quote "Here"'), '"Quote ""Here"""');

  // Integration test with adversarial formula payloads in SiteStats fields
  const formulaStats: SiteStats = {
    enabled: true,
    days: 30,
    totals: { views: 100, visitors: 50 },
    daily: [{ day: "2026-11-08", views: 100, visitors: 50 }],
    pages: [
      { path: "/=calc", views: 60, visitors: 30 },
      { path: "/+cmd", views: 40, visitors: 20 },
    ],
    referrers: [
      { host: "=HYPERLINK(\"http://phish.org\",\"Verify\")", views: 40 },
      { host: "@attacker.com", views: 30 },
      { host: "+partner.org", views: 20 },
      { host: "-evil.org", views: 10 },
      { host: "\tbadhost.com", views: 5 },
    ],
    countries: [{ code: "@U", views: 100 }],
    devices: [{ device: "desktop", views: 100 }],
  };

  const csv = exportStatsToCsv(formulaStats, 1794171600000);
  const lines = csv.split("\r\n");

  // Every line that isn't a comment (#) or section header ([...]) or header line must be neutralized
  for (const line of lines) {
    if (!line || line.startsWith("#") || line.startsWith("[")) continue;
    // Split columns (taking into account quoted strings)
    const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    for (const col of columns) {
      const trimmed = col.trim();
      // If cell begins with a quote, inspect the unquoted content
      const unquoted = trimmed.startsWith('"') && trimmed.endsWith('"')
        ? trimmed.slice(1, -1).replace(/""/g, '"')
        : trimmed;

      // Assert that no cell raw content starts with executable formula triggers
      assert.ok(
        !/^[=+\-@\t\r]/.test(unquoted),
        `Cell "${unquoted}" in line "${line}" starts with an unneutralized formula trigger!`,
      );
    }
  }

  // Specifically assert the presence of neutralized quotes
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes("'@attacker.com"));
  assert.ok(csv.includes("'+partner.org"));
  assert.ok(csv.includes("'-evil.org"));
  assert.ok(csv.includes("'\tbadhost.com"));
  assert.ok(csv.includes("'@U"));
});

test("aggregate CSV export strictly adheres to RFC 4180 and zero-PHI Safe Harbor invariants", () => {
  // Test formatIsoTimestamp normalization
  const fixedIso = "2026-11-08T21:00:00.000Z";
  assert.equal(formatIsoTimestamp(new Date(fixedIso)), fixedIso);
  assert.equal(formatIsoTimestamp(1794171600000), fixedIso);
  assert.equal(formatIsoTimestamp(fixedIso), fixedIso);
  // Fallback on invalid input returns a valid ISO string
  const fallback = formatIsoTimestamp("not-a-date");
  assert.match(fallback, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const testStats: SiteStats = {
    enabled: true,
    days: 30,
    totals: { views: 5000, visitors: 2200 },
    daily: [
      { day: "2026-11-01", views: 2500, visitors: 1100 },
      { day: "2026-11-02", views: 2500, visitors: 1100 },
    ],
    pages: [
      { path: "/pairs", views: 3000, visitors: 1400 },
      { path: "/catalog", views: 1500, visitors: 600 },
      { path: "/legal/terms", views: 500, visitors: 200 },
    ],
    referrers: [
      { host: "pubmed.ncbi.nlm.nih.gov", views: 1800 },
      { host: "cdc.gov", views: 1200 },
    ],
    countries: [
      { code: "US", views: 4000 },
      { code: "CA", views: 1000 },
    ],
    devices: [
      { device: "desktop", views: 3500 },
      { device: "phone", views: 1200 },
      { device: "tablet", views: 300 },
    ],
  };

  const csv = exportStatsToCsv(testStats, fixedIso);

  // 1. RFC 4180 line endings: all lines terminated by \r\n
  assert.ok(csv.includes("\r\n"), "CSV must use RFC 4180 CRLF line endings");
  assert.doesNotMatch(csv, /(?<!\r)\n/, "No bare LF line breaks allowed");
  assert.doesNotMatch(csv, /\r(?!\n)/, "No bare CR line breaks allowed");

  // 2. Sections verification
  assert.ok(csv.includes("[TOTALS]"));
  assert.ok(csv.includes("[DAILY BREAKDOWN]"));
  assert.ok(csv.includes("[TOP PAGES]"));
  assert.ok(csv.includes("[TOP REFERRERS]"));
  assert.ok(csv.includes("[GEOGRAPHIC REACH]"));
  assert.ok(csv.includes("[DEVICE BREAKDOWN]"));

  // 3. Zero-PHI Safe Harbor Invariants Audit
  // Zero IPv4 or IPv6 addresses anywhere in the CSV
  assert.doesNotMatch(
    csv,
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
  );
  assert.doesNotMatch(csv, /(?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}/i);

  // Zero visitor codes, daily salts, or session tokens in the data payload
  const dataSection = csv.slice(csv.indexOf("[TOTALS]"));
  assert.doesNotMatch(dataSection, /salt|visitor_code|token|session|cookie/i);
  assert.doesNotMatch(csv, /"visitor_code"/i);
  assert.doesNotMatch(csv, /"ip"/i);

  // Zero patient or query-string identifiers
  assert.doesNotMatch(csv, /\?q=/i);
  assert.doesNotMatch(csv, /mrn|ssn|patient|dob/i);

  // Check JSON export also adheres to identical zero-PHI invariants
  const json = exportStatsToJson(testStats, fixedIso);
  assert.doesNotMatch(
    json,
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
  );
  assert.doesNotMatch(json, /"salt"/i);
  assert.doesNotMatch(json, /"visitor_code"/i);
  assert.doesNotMatch(json, /mrn|ssn|patient|session|token/i);
});

test("escapeCsv neutralizes leading-whitespace, control-char, and embedded-newline formula payloads", () => {
  // Leading spaces before formula triggers
  assert.equal(escapeCsv(" =1+1"), "' =1+1");
  assert.equal(escapeCsv("  @SUM(A1)"), "'  @SUM(A1)");
  assert.equal(escapeCsv("   +cmd|' /C calc'!A0"), "'   +cmd|' /C calc'!A0");
  assert.equal(escapeCsv("  -2+3"), "'  -2+3");

  // Leading control chars and newlines
  assert.equal(escapeCsv("\u0000-100"), "'\u0000-100");
  assert.equal(escapeCsv("\u000b=1+1"), "'\u000b=1+1");
  assert.equal(escapeCsv("\n=CMD"), `"'\n=CMD"`);
  assert.equal(escapeCsv("  \n@IMPORTXML()"), `"'  \n'@IMPORTXML()"`);

  // Embedded newlines followed by formula triggers in multi-line text
  assert.equal(escapeCsv("note\n=HYPERLINK()"), `"note\n'=HYPERLINK()"`);
  assert.equal(escapeCsv("note\r\n +1"), `"note\r\n' +1"`);
  assert.equal(escapeCsv("a\n=\n+1"), `"a\n'=\n'+1"`);

  // Ordinary text and numbers remain untouched (no spurious leading single quotes)
  assert.equal(escapeCsv("   hello"), "   hello");
  assert.equal(escapeCsv("desktop"), "desktop");
  assert.equal(escapeCsv("US"), "US");
  assert.equal(escapeCsv("/pairs"), "/pairs");
  assert.equal(escapeCsv(4200), "4200");
  assert.equal(escapeCsv("line1\nline2"), `"line1\nline2"`);
});

test("computeExportSummary enriches JSON and CSV with accurate zero-PHI insights and zero-division safety", () => {
  const richStats: SiteStats = {
    enabled: true,
    days: 7,
    totals: { views: 355, visitors: 200 },
    daily: [
      { day: "2026-11-01", views: 0, visitors: 0 },
      { day: "2026-11-02", views: 100, visitors: 60 },
      { day: "2026-11-03", views: 150, visitors: 80 },
      { day: "2026-11-04", views: 0, visitors: 0 },
      { day: "2026-11-05", views: 105, visitors: 60 },
    ],
    pages: [{ path: "/pairs", views: 355, visitors: 200 }],
    referrers: [],
    countries: [{ code: "US", views: 355 }],
    devices: [
      { device: "desktop", views: 255 },
      { device: "phone", views: 100 },
    ],
  };

  const fixedIso = "2026-11-06T00:00:00.000Z";
  const summary = computeExportSummary(richStats);
  assert.equal(summary.averageDailyViews, 50.7); // 355 / 7 = 50.714 -> 50.7
  assert.equal(summary.activeDays, 3);
  assert.deepEqual(summary.peakDay, { day: "2026-11-03", views: 150 });

  // Verify JSON report embeds summary backward-compatibly
  const jsonParsed = JSON.parse(exportStatsToJson(richStats, fixedIso)) as AnalyticsExportReport;
  assert.equal(jsonParsed.schema, "firstpass-analytics-aggregate-v1");
  assert.equal(jsonParsed.totals.views, 355);
  assert.deepEqual(jsonParsed.summary, summary);

  // Verify CSV report embeds [SUMMARY METRICS] and [DEVICE BREAKDOWN] % share
  const csv = exportStatsToCsv(richStats, fixedIso);
  assert.ok(csv.includes("[SUMMARY METRICS]"));
  assert.ok(csv.includes("Average Daily Views,50.7"));
  assert.ok(csv.includes("Active Days,3"));
  assert.ok(csv.includes("Peak Day,2026-11-03"));
  assert.ok(csv.includes("Peak Day Views,150"));
  assert.ok(csv.includes("Device,Page Views,Share"));
  assert.ok(csv.includes("desktop,255,71.8%"));
  assert.ok(csv.includes("phone,100,28.2%"));

  // Zero-division & empty-day safety
  const zeroStats: SiteStats = {
    enabled: true,
    days: 0 as unknown as SiteStats["days"],
    totals: { views: 0, visitors: 0 },
    daily: [],
    pages: [],
    referrers: [],
    countries: [],
    devices: [{ device: "desktop", views: 0 }],
  };
  const zeroSummary = computeExportSummary(zeroStats);
  assert.equal(zeroSummary.averageDailyViews, 0);
  assert.equal(zeroSummary.activeDays, 0);
  assert.equal(zeroSummary.peakDay, null);

  const zeroCsv = exportStatsToCsv(zeroStats, fixedIso);
  assert.ok(zeroCsv.includes("Average Daily Views,0"));
  assert.ok(zeroCsv.includes("Peak Day,None"));
  assert.ok(zeroCsv.includes("desktop,0,0.0%"));
  assert.doesNotMatch(zeroCsv, /NaN|Infinity/);

  // Zero-filled daily array with 0 views also yields peakDay: null
  const zeroFilledDaily: SiteStats = {
    ...richStats,
    totals: { views: 0, visitors: 0 },
    daily: [
      { day: "2026-11-01", views: 0, visitors: 0 },
      { day: "2026-11-02", views: 0, visitors: 0 },
    ],
  };
  assert.equal(computeExportSummary(zeroFilledDaily).peakDay, null);
  assert.equal(computeExportSummary(zeroFilledDaily).activeDays, 0);
});

test("AnalyticsStore recordView awaits sweep deterministically on PGlite, bounds saltCache, and sorts ties cleanly", async () => {
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
    const now = 1794160000000;
    const oldViewTs = now - 95 * 24 * 60 * 60 * 1000;

    // Seed expired views and expired salts BEFORE recordView runs
    await pg.query(
      `INSERT INTO analytics_views (day, visitor_code, path, referrer_host, country, device, created_at_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7), ($1, $2, $3, $4, $5, $6, $7)`,
      [utcDayString(oldViewTs), "expired-visitor", "/stale", "", "US", "desktop", oldViewTs],
    );
    await pg.query(
      `INSERT INTO analytics_salts (day, salt, expires_ms) VALUES ($1, $2, $3)`,
      ["2026-07-01", "expired-salt", now - 5000],
    );

    // Populate > MAX_SALT_CACHE_ENTRIES synthetic days to verify bounded saltCache eviction
    for (let i = 0; i < MAX_SALT_CACHE_ENTRIES + 8; i++) {
      const syntheticTs = now - i * 24 * 60 * 60 * 1000;
      await store.getDaySalt(utcDayString(syntheticTs), now);
    }
    assert.ok(
      store.saltCacheSize <= MAX_SALT_CACHE_ENTRIES,
      `saltCacheSize (${store.saltCacheSize}) must not exceed ${MAX_SALT_CACHE_ENTRIES}`,
    );

    // recordView awaits sweep(now) inline: immediately after resolving, expired rows must be gone
    await store.recordView({
      path: "/zeta",
      referrerHost: "z-ref.org",
      country: "US",
      device: "desktop",
      ip: "203.0.113.10",
      userAgent: "TestBrowser/1",
      now,
    });
    assert.equal(store.retentionPruned, 2, "retentionPruned must reflect awaited sweep count");

    const remainingViews = await pg.query<{ cnt: number | string }>(
      "SELECT COUNT(*) as cnt FROM analytics_views",
    );
    assert.equal(Number(remainingViews.rows[0]?.cnt), 1, "expired views must be pruned before recordView returns");

    const remainingOldSalts = await pg.query<{ cnt: number | string }>(
      "SELECT COUNT(*) as cnt FROM analytics_salts WHERE day = '2026-07-01'",
    );
    assert.equal(Number(remainingOldSalts.rows[0]?.cnt), 0, "expired salt must be pruned before recordView returns");

    // Verify deterministic alphabetical tie-breaking on equal view counts
    await store.recordView({
      path: "/alpha",
      referrerHost: "a-ref.org",
      country: "CA",
      device: "phone",
      ip: "203.0.113.11",
      userAgent: "TestBrowser/2",
      now: now + 1000,
    });

    const stats = await store.getStats(7, now + 2000);
    assert.equal(stats.pages[0]?.path, "/alpha");
    assert.equal(stats.pages[1]?.path, "/zeta");
    assert.equal(stats.referrers[0]?.host, "a-ref.org");
    assert.equal(stats.referrers[1]?.host, "z-ref.org");
    assert.equal(stats.countries[0]?.code, "CA");
    assert.equal(stats.countries[1]?.code, "US");
  } finally {
    // Immediate close right after recordView / getStats must not trigger unhandled rejection
    await pg.close();
  }
});

