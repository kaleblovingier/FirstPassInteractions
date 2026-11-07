/**
 * Abuse throttles shared across serverless instances, kept in the app's own Postgres
 * (`getSql()` from `@/lib/db`, schema in migrations/0002_throttle.sql).
 *
 * - DATABASE_URL set: counts live in the database, so a cap holds for the whole deployment, not per
 *   instance, and survives cold starts.
 * - DATABASE_URL unset (GitHub Pages, local, preview): no store. Callers keep their in-memory limits,
 *   and `@/lib/db` is never even imported, so no PGLite instance starts for a throttle.
 * - Store slow or failing: every call gives up after STORE_TIMEOUT_MS and the caller falls back to
 *   its in-memory limit for that request. A database outage slows nobody down and locks nobody out.
 *
 * Caller keys are stored as an HMAC of the key (keyed by a hash of DATABASE_URL, a secret the server
 * already holds), never the raw IP address. Rows expire with their window and are swept as the store
 * is used.
 *
 * Limits are checked and recorded in one statement, but two instances racing at the very edge of a
 * limit can each get the last slot: the caps are soft by at most the number of concurrent requests.
 * The PIN backoff is exact, because its upsert holds the row lock.
 */

import { createHash, createHmac } from "node:crypto";
import type { Sql } from "../db";
import { errorKind, logEvent } from "./log";
import { SlidingWindow } from "./rate-limit";

/** A store call that takes longer than this is abandoned and the in-memory limit decides. */
export const STORE_TIMEOUT_MS = 1_500;
/** Expired rows are deleted at most this often per instance. */
const SWEEP_EVERY_MS = 5 * 60 * 1000;

/** Doubling backoff after `free` strikes, capped at `maxMs`; `resetMs` without a strike starts over. */
export interface StrikeRule {
  free: number;
  baseMs: number;
  maxMs: number;
  resetMs: number;
}

export type StrikeResult = { allowed: true; fails: number } | { allowed: false; waitMs: number };

export interface ThrottleStore {
  /** Hits on `key` in the last `windowMs`. */
  count(bucket: string, key: string, windowMs: number, now: number): Promise<number>;
  /** Records a hit kept for `windowMs`. */
  hit(bucket: string, key: string, windowMs: number, now: number): Promise<void>;
  /** Records a hit and returns true while `key` has fewer than `max` in the window; else records nothing. */
  take(bucket: string, key: string, max: number, windowMs: number, now: number): Promise<boolean>;
  /** Counts a strike unless `key` is still backing off, in which case it says how long is left. */
  strike(bucket: string, key: string, rule: StrikeRule, now: number): Promise<StrikeResult>;
  /** Forgets `key`'s strikes. */
  clearStrikes(bucket: string, key: string): Promise<void>;
  /** Keys in `bucket` with strikes that have not yet reset. */
  liveStrikes(bucket: string, now: number): Promise<number>;
}

/** Milliseconds left before a key with `fails` strikes, the last at `lastMs`, may try again; 0 means go ahead. */
export function backoffWaitMs(fails: number, lastMs: number, now: number, rule: StrikeRule): number {
  if (now - lastMs >= rule.resetMs || fails < rule.free) return 0;
  const wait = Math.min(rule.baseMs * 2 ** (fails - rule.free), rule.maxMs);
  return Math.max(0, lastMs + wait - now);
}

/** The Postgres store. `secret` keys the hash of every caller key. */
export function sqlThrottleStore(sql: Sql, secret: string): ThrottleStore {
  const hmacKey = createHash("sha256").update(`firstpass-throttle-v1\0${secret}`).digest();
  const hashed = (bucket: string, key: string) =>
    createHmac("sha256", hmacKey).update(`${bucket}\0${key}`).digest("base64url").slice(0, 32);
  let lastSweep = 0;

  async function sweep(now: number) {
    if (now - lastSweep < SWEEP_EVERY_MS) return;
    lastSweep = now;
    await sql.query("delete from throttle_hits where expires_ms <= $1::bigint", [now]);
    await sql.query("delete from throttle_strikes where expires_ms <= $1::bigint", [now]);
  }

  async function count(bucket: string, key: string, windowMs: number, now: number) {
    const rows = await sql.query<{ n: number }>(
      "select count(*)::int as n from throttle_hits where bucket = $1 and key = $2 and at_ms > $3::bigint - $4::bigint",
      [bucket, hashed(bucket, key), now, windowMs],
    );
    await sweep(now);
    return Number(rows[0]?.n ?? 0);
  }

  return {
    count,

    async hit(bucket, key, windowMs, now) {
      await sql.query(
        "insert into throttle_hits (bucket, key, at_ms, expires_ms) values ($1, $2, $3::bigint, $3::bigint + $4::bigint)",
        [bucket, hashed(bucket, key), now, windowMs],
      );
      await sweep(now);
    },

    async take(bucket, key, max, windowMs, now) {
      const rows = await sql.query(
        `insert into throttle_hits (bucket, key, at_ms, expires_ms)
         select $1, $2, $3::bigint, $3::bigint + $4::bigint
         where (select count(*) from throttle_hits
                where bucket = $1 and key = $2 and at_ms > $3::bigint - $4::bigint) < $5::int
         returning at_ms`,
        [bucket, hashed(bucket, key), now, windowMs, max],
      );
      await sweep(now);
      return rows.length > 0;
    },

    async strike(bucket, key, rule, now) {
      const k = hashed(bucket, key);
      // One upsert: start over after resetMs, count while under `free` or once the wait has passed,
      // otherwise leave the row alone and return nothing. The row lock makes parallel guesses queue.
      const rows = await sql.query<{ fails: number }>(
        `insert into throttle_strikes as s (bucket, key, fails, last_ms, expires_ms)
         values ($1, $2, 1, $3::bigint, $3::bigint + $4::bigint)
         on conflict (bucket, key) do update set
           fails = case when s.last_ms <= $3::bigint - $4::bigint then 1 else s.fails + 1 end,
           last_ms = $3::bigint,
           expires_ms = $3::bigint + $4::bigint
         where s.last_ms <= $3::bigint - $4::bigint
            or s.fails < $5::int
            or s.last_ms + least($6::float8 * power(2::float8, least(s.fails - $5::int, 40)), $7::float8) <= $3::bigint
         returning fails`,
        [bucket, k, now, rule.resetMs, rule.free, rule.baseMs, rule.maxMs],
      );
      await sweep(now);
      if (rows.length) return { allowed: true, fails: Number(rows[0]!.fails) };
      const held = await sql.query<{ fails: number; last_ms: number }>(
        "select fails, last_ms from throttle_strikes where bucket = $1 and key = $2",
        [bucket, k],
      );
      const row = held[0];
      const wait = row ? backoffWaitMs(Number(row.fails), Number(row.last_ms), now, rule) : 0;
      // A refusal always waits at least a moment, even if the backoff ended between the two reads.
      return { allowed: false, waitMs: Math.max(wait, 1) };
    },

    async clearStrikes(bucket, key) {
      await sql.query("delete from throttle_strikes where bucket = $1 and key = $2", [bucket, hashed(bucket, key)]);
    },

    async liveStrikes(bucket, now) {
      const rows = await sql.query<{ n: number }>(
        "select count(*)::int as n from throttle_strikes where bucket = $1 and expires_ms > $2::bigint",
        [bucket, now],
      );
      return Number(rows[0]?.n ?? 0);
    },
  };
}

/** `undefined`: decide from DATABASE_URL. `null`: no store. A store: use it (tests). */
let override: ThrottleStore | null | undefined;
let dbStore: Promise<ThrottleStore> | undefined;
let lastFailureLog = 0;

function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

/** Test hook: use `store` (or no store with `null`); `undefined` goes back to DATABASE_URL. */
export function setThrottleStore(store: ThrottleStore | null | undefined) {
  override = store;
}

/** True when limits should consult the shared store. Synchronous, so local-only callers never yield. */
export function sharedThrottleConfigured(): boolean {
  return override !== undefined ? override !== null : Boolean(databaseUrl());
}

async function resolveStore(): Promise<ThrottleStore | null> {
  if (override !== undefined) return override;
  const url = databaseUrl();
  if (!url) return null;
  dbStore ??= import("../db")
    .then(({ getSql }) => getSql())
    .then((sql) => sqlThrottleStore(sql, url))
    .catch((err) => {
      dbStore = undefined;
      throw err;
    });
  return dbStore;
}

function timeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("throttle store timed out"), { name: "TimeoutError" })), STORE_TIMEOUT_MS);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

/**
 * Runs `work` against the shared store. Resolves `undefined` when there is no store or the store
 * failed or was slow, so the caller uses its in-memory limit instead. Never throws.
 */
export async function withStore<T>(work: (store: ThrottleStore) => Promise<T>): Promise<T | undefined> {
  if (!sharedThrottleConfigured()) return undefined;
  try {
    const store = await timeout(resolveStore());
    if (!store) return undefined;
    return await timeout(work(store));
  } catch (err) {
    const now = Date.now();
    if (now - lastFailureLog >= 60_000) {
      lastFailureLog = now;
      // Error class only: a pg message can carry the connection host.
      logEvent("warn", "throttle.store", { fallback: "memory", error: errorKind(err) });
    }
    return undefined;
  }
}

/**
 * A SlidingWindow that also counts in the shared store. The in-memory window always records too,
 * so it stays a floor on this instance and takes over at once if the store goes away.
 */
export class SharedWindow {
  readonly local: SlidingWindow;

  constructor(
    readonly bucket: string,
    readonly max: number,
    readonly windowMs: number,
    maxKeys = 10_000,
  ) {
    this.local = new SlidingWindow(max, windowMs, maxKeys);
  }

  /** True once `key` has used all `max` hits in the window, here or across instances. */
  async full(key: string, now = Date.now()): Promise<boolean> {
    if (this.local.full(key, now)) return true;
    const shared = await withStore((s) => s.count(this.bucket, key, this.windowMs, now));
    return shared !== undefined && shared >= this.max;
  }

  async hit(key: string, now = Date.now()): Promise<void> {
    this.local.hit(key, now);
    await withStore((s) => s.hit(this.bucket, key, this.windowMs, now));
  }

  /** Records a hit and returns true while `key` is under its limit; once full, records nothing and returns false. */
  async take(key: string, now = Date.now()): Promise<boolean> {
    if (!sharedThrottleConfigured()) return this.local.take(key, now);
    if (this.local.full(key, now)) return false;
    const shared = await withStore((s) => s.take(this.bucket, key, this.max, this.windowMs, now));
    if (shared === false) return false;
    if (shared === undefined) return this.local.take(key, now);
    this.local.hit(key, now);
    return true;
  }

  /** Forgets this instance's counts (the shared store keeps its own). */
  reset(): void {
    this.local.reset();
  }
}
