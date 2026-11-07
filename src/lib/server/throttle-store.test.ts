import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db";
import {
  SharedWindow,
  STORE_TIMEOUT_MS,
  backoffWaitMs,
  setThrottleStore,
  sharedThrottleConfigured,
  sqlThrottleStore,
  withStore,
  type StrikeRule,
  type ThrottleStore,
} from "./throttle-store";
import { setLogSink } from "./log";

const MIGRATION = readFileSync(new URL("../../../migrations/0002_throttle.sql", import.meta.url), "utf8");
const RULE: StrikeRule = { free: 3, baseMs: 1_000, maxMs: 8_000, resetMs: 60_000 };

let pg: PGlite;
let store: ThrottleStore;
let lines: string[] = [];

/** The `.query()` half of `@/lib/db`'s Sql, over PGLite with the same int8 parser. */
function pgliteSql(db: PGlite): Sql {
  const run = async <T>(text: string, params: unknown[] = []) => (await db.query<T>(text, params)).rows;
  const sql = (() => {
    throw new Error("tagged form unused by the throttle store");
  }) as unknown as Sql;
  sql.query = run;
  return sql;
}

before(async () => {
  pg = new PGlite({ parsers: { 20: Number } });
  await pg.waitReady;
  await pg.exec(MIGRATION);
  store = sqlThrottleStore(pgliteSql(pg), "postgres://test-secret");
});
after(async () => {
  await pg.close();
});
beforeEach(async () => {
  await pg.exec("delete from throttle_hits; delete from throttle_strikes;");
  lines = [];
  setLogSink((_level, line) => lines.push(line));
});
afterEach(() => {
  setThrottleStore(undefined);
  setLogSink(null);
});

describe("migrations/0002_throttle.sql", () => {
  it("is additive and safe to run twice", async () => {
    await pg.exec(MIGRATION);
    assert.doesNotMatch(MIGRATION, /\b(drop|alter|truncate)\b/i);
  });
});

describe("sqlThrottleStore", () => {
  it("counts hits inside the window only", async () => {
    await store.hit("b", "203.0.113.1", 1_000, 10_000);
    await store.hit("b", "203.0.113.1", 1_000, 10_500);
    assert.equal(await store.count("b", "203.0.113.1", 1_000, 10_900), 2);
    assert.equal(await store.count("b", "203.0.113.1", 1_000, 11_000), 1, "the first hit left the window");
    assert.equal(await store.count("b", "198.51.100.1", 1_000, 10_900), 0, "other keys are separate");
    assert.equal(await store.count("other", "203.0.113.1", 1_000, 10_900), 0, "other buckets are separate");
  });

  it("take records until full, then records nothing", async () => {
    for (let i = 0; i < 3; i += 1) assert.equal(await store.take("t", "k", 3, 1_000, 5_000 + i), true);
    assert.equal(await store.take("t", "k", 3, 1_000, 5_010), false);
    assert.equal(await store.count("t", "k", 1_000, 5_010), 3);
    assert.equal(await store.take("t", "k", 3, 1_000, 6_001), true, "room again once the window moves");
  });

  it("never stores the caller key itself", async () => {
    await store.hit("b", "203.0.113.77", 1_000, 1);
    await store.strike("s", "203.0.113.77", RULE, 1);
    const rows = await pg.query<{ key: string }>("select key from throttle_hits union all select key from throttle_strikes");
    assert.equal(rows.rows.length, 2);
    for (const { key } of rows.rows) {
      assert.doesNotMatch(key, /203|113|77/);
      assert.match(key, /^[A-Za-z0-9_-]{32}$/);
    }
    const other = sqlThrottleStore(pgliteSql(pg), "postgres://another-secret");
    assert.equal(await other.count("b", "203.0.113.77", 1_000, 2), 0, "the hash is keyed by the server secret");
  });

  it("strike backs off exactly like the in-memory PIN rule", async () => {
    let now = 100_000;
    for (let i = 1; i <= RULE.free; i += 1) assert.deepEqual(await store.strike("s", "k", RULE, now), { allowed: true, fails: i });
    // Backing off: refused without counting, however often it is asked.
    for (let i = 0; i < 5; i += 1) {
      assert.deepEqual(await store.strike("s", "k", RULE, now + 1), { allowed: false, waitMs: RULE.baseMs - 1 });
    }
    now += RULE.baseMs;
    assert.deepEqual(await store.strike("s", "k", RULE, now), { allowed: true, fails: RULE.free + 1 });
    assert.deepEqual(await store.strike("s", "k", RULE, now), { allowed: false, waitMs: RULE.baseMs * 2 });
    assert.equal(backoffWaitMs(RULE.free + 1, now, now, RULE), RULE.baseMs * 2);
    // The wait never passes the cap.
    for (let i = 0; i < 10; i += 1) {
      now += RULE.maxMs;
      assert.equal((await store.strike("s", "k", RULE, now)).allowed, true);
    }
    const capped = await store.strike("s", "k", RULE, now);
    assert.deepEqual(capped, { allowed: false, waitMs: RULE.maxMs });
    // Idle for resetMs starts over.
    assert.deepEqual(await store.strike("s", "k", RULE, now + RULE.resetMs), { allowed: true, fails: 1 });
  });

  it("parallel strikes from one key cannot all slip past the backoff", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => store.strike("s", "p", RULE, 1_000_000)));
    assert.equal(results.filter((r) => r.allowed).length, RULE.free);
  });

  it("clears strikes and counts live ones", async () => {
    await store.strike("s", "a", RULE, 1_000);
    await store.strike("s", "b", RULE, 1_000);
    await store.strike("x", "c", RULE, 1_000);
    assert.equal(await store.liveStrikes("s", 1_001), 2);
    assert.equal(await store.liveStrikes("s", 1_000 + RULE.resetMs), 0, "expired strikes are not live");
    await store.clearStrikes("s", "a");
    assert.equal(await store.liveStrikes("s", 1_001), 1);
    assert.deepEqual(await store.strike("s", "a", RULE, 1_002), { allowed: true, fails: 1 });
  });

  it("deletes expired rows as it goes", async () => {
    await store.hit("b", "old", 1_000, 1);
    await store.strike("s", "old", RULE, 1);
    // A fresh store has never swept, so its first write sweeps.
    const fresh = sqlThrottleStore(pgliteSql(pg), "postgres://test-secret");
    await fresh.hit("b", "new", 1_000, 10 * 60 * 1000);
    const left = await pg.query<{ n: number }>(
      "select (select count(*) from throttle_hits)::int + (select count(*) from throttle_strikes)::int as n",
    );
    assert.equal(left.rows[0]!.n, 1, "only the live hit is left");
  });
});

describe("withStore and SharedWindow", () => {
  it("is off without DATABASE_URL and never loads the database", async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      assert.equal(sharedThrottleConfigured(), false);
      assert.equal(await withStore(async () => 1), undefined);
      const w = new SharedWindow("w", 2, 1_000);
      assert.equal(await w.take("k", 1), true);
      assert.equal(await w.take("k", 2), true);
      assert.equal(await w.take("k", 3), false);
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });

  it("shares a cap across instances", async () => {
    setThrottleStore(store);
    const a = new SharedWindow("w", 3, 60_000);
    const b = new SharedWindow("w", 3, 60_000);
    assert.equal(await a.take("k", 1), true);
    assert.equal(await b.take("k", 2), true);
    assert.equal(await a.take("k", 3), true);
    assert.equal(await b.take("k", 4), false, "instance b sees a's hits");
    assert.equal(await b.full("k", 5), true);
    b.reset();
    assert.equal(await b.full("k", 5), true, "a cold start does not reset the shared count");
    await a.hit("other", 6);
    assert.equal(await store.count("w", "other", 60_000, 7), 1);
  });

  it("falls back to the in-memory window when the store fails", async () => {
    const broken: ThrottleStore = {
      count: async () => Promise.reject(new Error("connection refused to db.example.internal")),
      hit: async () => Promise.reject(new Error("down")),
      take: async () => Promise.reject(new Error("down")),
      strike: async () => Promise.reject(new Error("down")),
      clearStrikes: async () => Promise.reject(new Error("down")),
      liveStrikes: async () => Promise.reject(new Error("down")),
    };
    setThrottleStore(broken);
    const w = new SharedWindow("w", 2, 1_000);
    assert.equal(await w.take("k", 1), true);
    assert.equal(await w.take("k", 2), true);
    assert.equal(await w.take("k", 3), false, "the in-memory cap still holds");
    assert.equal(await w.full("other", 3), false);
    assert.equal(lines.length, 1, "one warning, not one per call");
    assert.doesNotMatch(lines[0]!, /example\.internal|refused/, "the log carries the error class only");
    assert.match(lines[0]!, /"event":"throttle.store"/);
  });

  it("gives up on a store that does not answer", async () => {
    const stuck: ThrottleStore = {
      count: () => new Promise(() => {}),
      hit: () => new Promise(() => {}),
      take: () => new Promise(() => {}),
      strike: () => new Promise(() => {}),
      clearStrikes: () => new Promise(() => {}),
      liveStrikes: () => new Promise(() => {}),
    };
    setThrottleStore(stuck);
    const started = Date.now();
    assert.equal(await withStore((s) => s.count("w", "k", 1_000, 1)), undefined);
    const took = Date.now() - started;
    assert.ok(took >= STORE_TIMEOUT_MS - 50 && took < STORE_TIMEOUT_MS + 1_000, `took ${took} ms`);
  });
});
