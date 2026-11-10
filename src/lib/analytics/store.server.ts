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
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_SALT_CACHE_ENTRIES = 64;

export interface SweepResult {
  swept: boolean;
  retentionPruned: number;
  saltsPruned: number;
  saltCacheEvicted: number;
}

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
  private lastRetentionPruned = 0;
  private saltCache = new Map<string, string>();

  constructor(private readonly sql: Sql) {}

  /** Current in-memory salt cache entry count (observability / test guard). */
  get saltCacheSize(): number {
    return this.saltCache.size;
  }

  /** Number of expired view rows pruned during the most recent sweep. */
  get retentionPruned(): number {
    return this.lastRetentionPruned;
  }

  /** Stores a day salt in the bounded LRU-like memory cache. */
  private cacheSalt(day: string, salt: string): void {
    if (this.saltCache.has(day)) {
      this.saltCache.delete(day);
    } else if (this.saltCache.size >= MAX_SALT_CACHE_ENTRIES) {
      const oldestKey = this.saltCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.saltCache.delete(oldestKey);
      }
    }
    this.saltCache.set(day, salt);
  }

  /** Evicts expired or malformed salt entries and enforces the memory cap. */
  private pruneSaltCache(now: number): number {
    const saltFloorMs = now - 48 * 60 * 60 * 1000;
    let evicted = 0;
    for (const [day] of this.saltCache) {
      const dayMs = Date.parse(`${day}T00:00:00.000Z`);
      if (!Number.isFinite(dayMs) || dayMs < saltFloorMs) {
        this.saltCache.delete(day);
        evicted++;
      }
    }
    while (this.saltCache.size > MAX_SALT_CACHE_ENTRIES) {
      const oldestKey = this.saltCache.keys().next().value;
      if (oldestKey === undefined) break;
      this.saltCache.delete(oldestKey);
      evicted++;
    }
    return evicted;
  }

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
      this.cacheSalt(day, rows[0].salt);
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
    this.cacheSalt(day, resolved);
    return resolved;
  }

  /**
   * Sweeps expired salts and view logs past the 90-day retention window.
   */
  async sweep(now: number): Promise<SweepResult> {
    if (this.lastSweep !== 0 && Math.abs(now - this.lastSweep) < SWEEP_EVERY_MS) {
      return {
        swept: false,
        retentionPruned: 0,
        saltsPruned: 0,
        saltCacheEvicted: 0,
      };
    }
    this.lastSweep = now;

    const retentionFloorMs = now - RETENTION_DAYS * DAY_MS;
    const saltCacheEvicted = this.pruneSaltCache(now);

    try {
      const [viewsDeletedRows, saltsDeletedRows] = await Promise.all([
        this.sql<{ cnt: string | number }>`
          WITH deleted AS (
            DELETE FROM analytics_views WHERE created_at_ms < ${retentionFloorMs} RETURNING 1
          )
          SELECT COUNT(*) as cnt FROM deleted
        `,
        this.sql<{ cnt: string | number }>`
          WITH deleted AS (
            DELETE FROM analytics_salts WHERE expires_ms < ${now} RETURNING 1
          )
          SELECT COUNT(*) as cnt FROM deleted
        `,
      ]);
      const retentionPruned = Math.max(0, Number(viewsDeletedRows[0]?.cnt ?? 0) || 0);
      const saltsPruned = Math.max(0, Number(saltsDeletedRows[0]?.cnt ?? 0) || 0);
      this.lastRetentionPruned = retentionPruned;
      return {
        swept: true,
        retentionPruned,
        saltsPruned,
        saltCacheEvicted,
      };
    } catch (err) {
      logEvent("warn", "analytics.sweep_error", { error: errorKind(err) });
      return {
        swept: true,
        retentionPruned: 0,
        saltsPruned: 0,
        saltCacheEvicted,
      };
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

    // Await sweep cleanly so tests/lambdas never leave dangling async DB queries on close.
    await this.sweep(now);
    return true;
  }

  /**
   * Reads site stats for the given range of days.
   */
  async getStats(days: StatsRange, now = Date.now()): Promise<SiteStats> {
    const safeDays = Math.max(1, Math.min(RETENTION_DAYS, Math.floor(Number(days) || 30)));

    // Build the zero-filled daily slots oldest-first and align rangeStartMs to UTC midnight
    const dailyMap = new Map<string, { views: number; visitors: number }>();
    let earliestDay = utcDayString(now);
    for (let i = safeDays - 1; i >= 0; i--) {
      const d = utcDayString(now - i * DAY_MS);
      if (i === safeDays - 1) earliestDay = d;
      dailyMap.set(d, { views: 0, visitors: 0 });
    }
    const parsedEarliest = Date.parse(`${earliestDay}T00:00:00.000Z`);
    const rangeStartMs = Number.isFinite(parsedEarliest)
      ? parsedEarliest
      : now - safeDays * DAY_MS;

    // Run parallel aggregate queries using the analytics_views_created index with deterministic tie-breakers
    const [dailyRows, pageRows, referrerRows, countryRows, deviceRows] = await Promise.all([
      // Daily views & visitors
      this.sql<{ day: string; views: string | number; visitors: string | number }>`
        SELECT day, COUNT(*) as views, COUNT(DISTINCT visitor_code) as visitors
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY day
        ORDER BY day ASC
      `,
      // Top pages (capped at 25, deterministic ordering)
      this.sql<{ path: string; views: string | number; visitors: string | number }>`
        SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_code) as visitors
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY path
        ORDER BY views DESC, visitors DESC, path ASC
        LIMIT 25
      `,
      // Top referrers (exclude empty/direct, deterministic ordering)
      this.sql<{ host: string; views: string | number }>`
        SELECT referrer_host as host, COUNT(*) as views
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs} AND referrer_host != ''
        GROUP BY referrer_host
        ORDER BY views DESC, referrer_host ASC
        LIMIT 20
      `,
      // Top countries (deterministic ordering)
      this.sql<{ code: string; views: string | number }>`
        SELECT country as code, COUNT(*) as views
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY country
        ORDER BY views DESC, country ASC
        LIMIT 20
      `,
      // Device breakdown (deterministic ordering)
      this.sql<{ device: string; views: string | number }>`
        SELECT device, COUNT(*) as views
        FROM analytics_views
        WHERE created_at_ms >= ${rangeStartMs}
        GROUP BY device
        ORDER BY views DESC, device ASC
      `,
    ]);

    let totalViews = 0;
    let totalVisitors = 0;

    for (const row of dailyRows) {
      const dayKey = String(row.day);
      if (!dailyMap.has(dayKey)) continue;
      const v = Math.max(0, Number(row.views) || 0);
      const u = Math.max(0, Number(row.visitors) || 0);
      totalViews += v;
      totalVisitors += u;
      dailyMap.set(dayKey, { views: v, visitors: u });
    }

    const daily = Array.from(dailyMap.entries()).map(([day, val]) => ({
      day,
      views: val.views,
      visitors: val.visitors,
    }));

    const pages = pageRows.map((r) => ({
      path: r.path,
      views: Math.max(0, Number(r.views) || 0),
      visitors: Math.max(0, Number(r.visitors) || 0),
    }));

    const referrers = referrerRows.map((r) => ({
      host: r.host,
      views: Math.max(0, Number(r.views) || 0),
    }));

    const countries = countryRows.map((r) => ({
      code: r.code,
      views: Math.max(0, Number(r.views) || 0),
    }));

    const devices = deviceRows.map((r) => ({
      device: (r.device === "phone" || r.device === "tablet" ? r.device : "desktop") as Device,
      views: Math.max(0, Number(r.views) || 0),
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
