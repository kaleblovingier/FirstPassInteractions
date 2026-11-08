import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDevice,
  sanitizePath,
  sanitizeReferrer,
  extractCountry,
  handleCollectRequest,
} from "./collect.server";
import {
  computeVisitorCode,
  utcDayString,
  AnalyticsStore,
  setAnalyticsStore,
} from "./store.server";
import { handleGetSiteStats } from "./stats.server";
import { STATS_RANGES, type Device } from "./contract";

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

