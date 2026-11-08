/**
 * Database storage and aggregation for cookieless visitor analytics.
 * Schema in migrations/0003_analytics.sql.
 *
 * Privacy invariants:
 * - No IP address, raw user agent, cookie, session ID, or drug regimen is ever stored.
 * - Visitor codes are generated using HMAC-SHA256 with a daily random salt.
 * - Salts expire and are swept after their UTC day, ensuring cross-day tracking is mathematically impossible.
 * - All page views are retained for RETENTION_DAYS (90 days) and automatically swept.
 */

import { createHmac, randomBytes } from "node:crypto";
import type { Sql } from "../db";
import {
  type Device,
  type SiteStats,
  type StatsRange,
  RETENTION_DAYS,
} from "./contract";
import { errorKind, logEvent } from "../server/log";

export const ANALYTICS_STORE_TIMEOUT_MS = 2_000;
const SWEEP_EVERY_MS = 60 * 60 * 1000; // 1 hour

export interface PageViewInput {
  path: string;
  referrerHost: string;
  country: string;
  device: Device;
  ip: string;
  userAgent: string;
  now?: number;
}

function timeout<T>(work: Promise<T>, ms = ANALYTICS_STORE_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(new Error("analytics store timed out"), { name: "TimeoutError" })),
      ms,
    );
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

function isDbConfigured(): boolean {
  const url = typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
  return Boolean(url && url.trim());
}

/** Formats a timestamp as UTC YYYY-MM-DD. */
export function utcDayString(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** Computes visitor code for a given day salt, IP and user agent. */
export function computeVisitorCode(salt: string, ip: string, userAgent: string): string {
  return createHmac("sha256", salt)
    .update(`${ip}\0${userAgent}`)
    .digest("base64url")
    .slice(0, 32);
}

export class AnalyticsStore {
  private lastSweep = 0;
  private saltCache = new Map<string, string>();

  constructor(private readonly sql: Sql) {}

  /**
   * Retrieves or creates the salt for the given UTC day.
   */
  async getDaySalt(day: string, now: number): Promise<string> {
    const cached = this.saltCache.get(day);
    if (cached) return cached;

    // Look up in database
    const rows = await this.sql<{ salt: string }>`
      SELECT salt FROM analytics_salts WHERE day = ${day} LIMIT 1
    `;
    if (rows.length && rows[0]?.salt) {
      this.saltCache.set(day, rows[0].salt);
      return rows[0].salt;
    }

    // Generate new random salt
    const newSalt = randomBytes(32).toString("hex");
    // Salts expire 48 hours after generation to safely cover timezone shifts & UTC boundaries
    const expiresMs = now + 48 * 60 * 60 * 1000;

    await this.sql`
      INSERT INTO analytics_salts (day, salt, expires_ms)
      VALUES (${day}, ${newSalt}, ${expiresMs})
      ON CONFLICT (day) DO NOTHING
    `;

    // Re-query in case of race condition
    const fresh = await this.sql<{ salt: string }>`
      SELECT salt FROM analytics_salts WHERE day = ${day} LIMIT 1
    `;
    const resolved = fresh[0]?.salt || newSalt;
    this.saltCache.set(day, resolved);
    return resolved;
  }

  /**
   * Sweeps expired salts and view logs past the 90-day retention window.
   */
  async sweep(now: number): Promise<void> {
    if (now - this.lastSweep < SWEEP_EVERY_MS) return;
    this.lastSweep = now;

    const retentionFloorMs = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Prune old salt cache in memory
    for (const [day] of this.saltCache) {
      if (new Date(day).getTime() < retentionFloorMs) {
        this.saltCache.delete(day);
      }
    }

    try {
      await Promise.all([
        this.sql`DELETE FROM analytics_views WHERE created_at_ms < ${retentionFloorMs}`,
        this.sql`DELETE FROM analytics_salts WHERE expires_ms < ${now}`,
      ]);
    } catch (err) {
      logEvent("warn", "analytics.sweep_error", { error: errorKind(err) });
    }
  }

  /**
   * Records a single page view.
   */
  async recordView(input: PageViewInput): Promise<boolean> {
    const now = input.now ?? Date.now();
    const day = utcDayString(now);
    const salt = await this.getDaySalt(day, now);
    const visitorCode = computeVisitorCode(salt, input.ip, input.userAgent);

    await this.sql`
      INSERT INTO analytics_views (
        day, visitor_code, path, referrer_host, country, device, created_at_ms
      ) VALUES (
        ${day}, ${visitorCode}, ${input.path}, ${input.referrerHost}, ${input.country}, ${input.device}, ${now}
      )
    `;

    void this.sweep(now);
    return true;
  }

  /**
   * Reads site stats for the given range of days.
   */
  async getStats(days: StatsRange, now = Date.now()): Promise<SiteStats> {
    const rangeStartMs = now - days * 24 * 60 * 60 * 1000;

    // Build the zero-filled daily slots
    const dailyMap = new Map<string, { views: number; visitors: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = utcDayString(now - i * 24 * 60 * 60 * 1000);
      dailyMap.set(d, { views: 0, visitors: 0 });
    }

    // Run parallel queries
    const [dailyRows, pageRows, referrerRows, countryRows, deviceRows] = await Promise.all([
      // Daily views & visitors
      this.sql<{ day: string; views: string | number; visitors: string | number }>`
        SELECT day, COUNT(*) as views, COUNT(DISTINCT visitor_code) as visitors
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY day
        ORDER BY day ASC
      `,
      // Top pages (capped at 25)
      this.sql<{ path: string; views: string | number; visitors: string | number }>`
        SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_code) as visitors
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY path
        ORDER BY views DESC
        LIMIT 25
      `,
      // Top referrers (exclude empty/direct)
      this.sql<{ host: string; views: string | number }>`
        SELECT referrer_host as host, COUNT(*) as views
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs} AND referrer_host != ''
        GROUP BY referrer_host
        ORDER BY views DESC
        LIMIT 20
      `,
      // Top countries
      this.sql<{ code: string; views: string | number }>`
        SELECT country as code, COUNT(*) as views
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY country
        ORDER BY views DESC
        LIMIT 20
      `,
      // Device breakdown
      this.sql<{ device: string; views: string | number }>`
        SELECT device, COUNT(*) as views
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY device
        ORDER BY views DESC
      `,
    ]);

    let totalViews = 0;
    let totalVisitors = 0;

    for (const row of dailyRows) {
      const v = Number(row.views) || 0;
      const u = Number(row.visitors) || 0;
      totalViews += v;
      totalVisitors += u;
      if (dailyMap.has(row.day)) {
        dailyMap.set(row.day, { views: v, visitors: u });
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([day, val]) => ({
      day,
      views: val.views,
      visitors: val.visitors,
    }));

    const pages = pageRows.map((r) => ({
      path: r.path,
      views: Number(r.views) || 0,
      visitors: Number(r.visitors) || 0,
    }));

    const referrers = referrerRows.map((r) => ({
      host: r.host,
      views: Number(r.views) || 0,
    }));

    const countries = countryRows.map((r) => ({
      code: r.code,
      views: Number(r.views) || 0,
    }));

    const devices = deviceRows.map((r) => ({
      device: (r.device === "phone" || r.device === "tablet" ? r.device : "desktop") as Device,
      views: Number(r.views) || 0,
    }));

    return {
      enabled: true,
      days,
      totals: {
        views: totalViews,
        visitors: totalVisitors,
      },
      daily,
      pages,
      referrers,
      countries,
      devices,
    };
  }
}

let storeInstance: AnalyticsStore | null = null;
let storeOverride: AnalyticsStore | null | undefined = undefined;

/** Test hook: override store instance */
export function setAnalyticsStore(store: AnalyticsStore | null | undefined) {
  storeOverride = store;
}

export async function resolveAnalyticsStore(): Promise<AnalyticsStore | null> {
  if (storeOverride !== undefined) return storeOverride;
  if (!isDbConfigured()) return null;
  if (!storeInstance) {
    const { getSql } = await import("../db");
    const sql = await getSql();
    storeInstance = new AnalyticsStore(sql);
  }
  return storeInstance;
}

/**
 * High-level helper to record a page view. Fails gracefully if store is unavailable.
 */
export async function recordPageView(input: PageViewInput): Promise<boolean> {
  try {
    const store = await timeout(resolveAnalyticsStore());
    if (!store) return false;
    return await timeout(store.recordView(input));
  } catch (err) {
    logEvent("warn", "analytics.record_error", { error: errorKind(err) });
    return false;
  }
}

/**
 * High-level helper to query site stats. Returns enabled: false if DB is not set.
 */
export async function getSiteStatsFromStore(days: StatsRange, now?: number): Promise<SiteStats> {
  const emptyStats: SiteStats = {
    enabled: false,
    days,
    totals: { views: 0, visitors: 0 },
    daily: [],
    pages: [],
    referrers: [],
    countries: [],
    devices: [],
  };

  try {
    const store = await timeout(resolveAnalyticsStore());
    if (!store) return emptyStats;
    return await timeout(store.getStats(days, now));
  } catch (err) {
    logEvent("warn", "analytics.get_stats_error", { error: errorKind(err) });
    return emptyStats;
  }
}
