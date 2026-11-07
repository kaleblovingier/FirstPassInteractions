import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db";
import { setThrottleStore, sqlThrottleStore } from "../server/throttle-store";
import {
  PIN_THROTTLE,
  pinOk,
  pinRefusal,
  pinSlowed,
  pinWaitMessage,
  pinWaitMs,
  resetPinThrottle,
  setPinPause,
} from "./license.server";
import { collectLicenses } from "./collect.server";
import { setLogSink } from "../server/log";
import { SHARED_CLIENT } from "../server/rate-limit";

const PIN = "test-operator-pin-0042";
const saved = { ...process.env };
let lines: string[] = [];
let pauses: number[] = [];

beforeEach(() => {
  process.env.LICENSE_PEPPER = "fp-test-pepper-throttle";
  process.env.FOUNDER_PIN = PIN;
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
  resetPinThrottle();
  lines = [];
  pauses = [];
  setLogSink((_level, line) => lines.push(line));
  setPinPause(async (ms) => {
    pauses.push(ms);
  });
});
afterEach(() => {
  process.env = { ...saved };
  resetPinThrottle();
  setLogSink(null);
  setPinPause((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
});

/** Wrong PINs from `key`, each sent the moment its backoff allows. Returns the time after the last one. */
async function guess(key: string, count: number, start: number): Promise<number> {
  let now = start;
  for (let i = 0; i < count; i += 1) {
    now += pinWaitMs(key, now);
    assert.equal(await pinOk("guess", key, now), false);
  }
  return now;
}

describe("operator PIN check", () => {
  it("accepts the PIN and refuses others, whatever their length", async () => {
    assert.equal(await pinOk(PIN, "203.0.113.1"), true);
    assert.equal(await pinOk(` ${PIN} `, "203.0.113.1"), true);
    assert.equal(await pinOk("test-operator-pin-0043", "203.0.113.1"), false);
    assert.equal(await pinOk("x", "203.0.113.1"), false);
    assert.equal(await pinOk(`${PIN}0`, "203.0.113.1"), false);
  });

  it("never lets one client's wrong PINs lock out another client's right PIN", async () => {
    const end = await guess("203.0.113.66", 200, 1_000_000);
    assert.ok(pinWaitMs("203.0.113.66", end) > 0, "the guesser is backing off");
    assert.equal(await pinOk(PIN, "198.51.100.7", end), true);
    assert.equal(await pinOk("typo", "198.51.100.7", end), false, "the operator's own typo is just a wrong PIN");
    assert.equal(await pinOk(PIN, "198.51.100.7", end), true);
  });

  it("backs one client off: free tries, then doubling waits up to the cap", async () => {
    const key = "203.0.113.2";
    const end = await guess(key, PIN_THROTTLE.free, 2_000_000);
    assert.equal(pinWaitMs(key, end), PIN_THROTTLE.baseMs);
    await assert.rejects(pinOk(PIN, key, end), { message: pinWaitMessage(PIN_THROTTLE.baseMs) });
    assert.equal(await pinOk("guess", key, end + PIN_THROTTLE.baseMs), false);
    assert.equal(pinWaitMs(key, end + PIN_THROTTLE.baseMs), PIN_THROTTLE.baseMs * 2);
    const later = await guess(key, 30, end + PIN_THROTTLE.baseMs);
    assert.equal(pinWaitMs(key, later), PIN_THROTTLE.maxMs, "the wait never passes the cap");
  });

  it("does not count or test checks refused while a client waits", async () => {
    const key = "203.0.113.3";
    const end = await guess(key, PIN_THROTTLE.free, 3_000_000);
    for (let i = 0; i < 50; i += 1) await assert.rejects(pinOk("guess", key, end + 1));
    assert.equal(pinWaitMs(key, end), PIN_THROTTLE.baseMs);
  });

  it("starts a client over after a right PIN, or after an hour without wrong ones", async () => {
    const key = "203.0.113.4";
    let end = await guess(key, PIN_THROTTLE.free + 3, 4_000_000);
    end += pinWaitMs(key, end);
    assert.equal(await pinOk(PIN, key, end), true);
    assert.equal(await pinOk("guess", key, end), false);
    assert.equal(pinWaitMs(key, end), 0, "one wrong PIN after a right one costs nothing");

    end = await guess(key, PIN_THROTTLE.free + 3, end);
    const idle = end + PIN_THROTTLE.resetMs;
    assert.equal(pinWaitMs(key, idle), 0);
    assert.equal(await pinOk("guess", key, idle), false);
    assert.equal(pinWaitMs(key, idle), 0, "the count started over");
  });

  it("keeps a client's penalty when the table fills, and slows untracked clients instead of refusing them", async () => {
    const t0 = 5_000_000;
    const end = await guess("203.0.113.9", PIN_THROTTLE.free + 2, t0);
    const penalty = pinWaitMs("203.0.113.9", end);
    assert.ok(penalty > 0);
    for (let i = 0; i < PIN_THROTTLE.maxClients; i += 1) {
      assert.equal(await pinOk("guess", `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`, end), false);
    }
    assert.equal(pinWaitMs("203.0.113.9", end), penalty, "filling the table did not reset the penalty");
    const fresh = "2001:db8:ffff:1::/64";
    for (let i = 0; i < PIN_THROTTLE.free + 5; i += 1) assert.equal(await pinOk("guess", fresh, end), false);
    assert.equal(pinWaitMs(fresh, end), 0, "an untracked client is never refused");
    assert.equal(pinSlowed(end), true, "but every check now waits");
    pauses = [];
    assert.equal(await pinOk(PIN, "198.51.100.8", end), true);
    assert.deepEqual(pauses, [PIN_THROTTLE.slowMs]);
  });

  it("slows every check after many wrong PINs anywhere, but never refuses one", async () => {
    const t0 = 6_000_000;
    for (let i = 0; i < PIN_THROTTLE.globalFree - 1; i += 1) await pinOk("guess", `192.0.2.${i}`, t0);
    assert.equal(pinSlowed(t0), false);
    assert.deepEqual(pauses, []);
    await pinOk("guess", "192.0.2.250", t0);
    assert.equal(pinSlowed(t0), true);
    assert.equal(await pinOk(PIN, "198.51.100.9", t0 + 1), true);
    assert.deepEqual(pauses, [PIN_THROTTLE.slowMs]);
    assert.equal(pinSlowed(t0 + PIN_THROTTLE.globalWindowMs), false, "the slow-down lifts with the window");
  });

  it("counts parallel guesses from one client before the slow-down, so only the free ones get tested", async () => {
    const t0 = 8_000_000;
    for (let i = 0; i < PIN_THROTTLE.globalFree; i += 1) await pinOk("guess", `192.0.2.${i}`, t0);
    assert.equal(pinSlowed(t0), true);
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => pinOk("guess", "203.0.113.7", t0)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, PIN_THROTTLE.free);
  });

  it("never refuses the shared key used when callers cannot be told apart", async () => {
    for (let i = 0; i < 100; i += 1) assert.equal(await pinOk("guess", SHARED_CLIENT, 7_000_000 + i), false);
    assert.equal(pinWaitMs(SHARED_CLIENT, 7_000_100), 0);
    assert.equal(await pinOk(PIN, SHARED_CLIENT, 7_000_100), true);
  });

  it("logs counts for each wrong PIN, never the client or the guess", async () => {
    await pinOk("hunter2-guess", "203.0.113.5");
    await pinOk("hunter2-guess", "203.0.113.5");
    const wrong = lines.filter((l) => l.includes('"pin.wrong"'));
    assert.equal(wrong.length, 2);
    assert.match(wrong[1]!, /"fails":2/);
    for (const line of lines) assert.doesNotMatch(line, /203\.0\.113|hunter2|test-operator-pin/);
  });
});

describe("pinRefusal and the operator server functions", () => {
  it("names the reason instead of throwing", async () => {
    const key = "203.0.113.20";
    assert.equal(await pinRefusal(PIN, key), null);
    assert.equal(await pinRefusal("guess", key), "Operator PIN is wrong.");
    for (let i = 1; i < PIN_THROTTLE.free; i += 1) await pinRefusal("guess", key);
    assert.match((await pinRefusal(PIN, key)) ?? "", /^Too many wrong PINs from here\. Try again in \d+ seconds?\.$/);
  });

  it("answers an unset production PIN with a reason, not a thrown error", async () => {
    delete process.env.FOUNDER_PIN;
    process.env.NODE_ENV = "production";
    assert.match((await pinRefusal(PIN)) ?? "", /FOUNDER_PIN is unset/);
    const res = await collectLicenses({ pin: PIN, plan: "life", names: "", hunt: "" });
    assert.equal(res.ok, false);
    assert.match(res.ok ? "" : res.reason, /FOUNDER_PIN is unset/);
  });

  it("words long waits in minutes", () => {
    assert.equal(pinWaitMessage(1_000), "Too many wrong PINs from here. Try again in 1 second.");
    assert.equal(pinWaitMessage(4_200), "Too many wrong PINs from here. Try again in 5 seconds.");
    assert.equal(pinWaitMessage(PIN_THROTTLE.maxMs), "Too many wrong PINs from here. Try again in 15 minutes.");
  });
});

describe("operator PIN check with the shared throttle store", () => {
  let db: PGlite;
  before(async () => {
    db = new PGlite({ parsers: { 20: Number } });
    await db.exec(readFileSync(new URL("../../../migrations/0002_throttle.sql", import.meta.url), "utf8"));
  });
  after(async () => {
    setThrottleStore(undefined);
    await db.close();
  });
  beforeEach(async () => {
    await db.exec("delete from throttle_hits; delete from throttle_strikes;");
    const sql = (() => {
      throw new Error("unused");
    }) as unknown as Sql;
    sql.query = async <T,>(text: string, params: unknown[] = []) => (await db.query<T>(text, params)).rows;
    setThrottleStore(sqlThrottleStore(sql, "postgres://pin-test"));
  });
  afterEach(() => setThrottleStore(undefined));

  /** A cold start or another instance: this instance's own counts are gone. */
  const otherInstance = () => resetPinThrottle();

  it("keeps a guesser's backoff across instances", async () => {
    const key = "203.0.113.40";
    const t0 = 9_000_000;
    for (let i = 0; i < PIN_THROTTLE.free; i += 1) {
      otherInstance();
      assert.equal(await pinOk("guess", key, t0), false);
    }
    otherInstance();
    await assert.rejects(pinOk(PIN, key, t0), { message: pinWaitMessage(PIN_THROTTLE.baseMs) });
    assert.equal(pinWaitMs(key, t0), 0, "the refusal came from the store, not this instance");
    otherInstance();
    assert.equal(await pinOk(PIN, key, t0 + PIN_THROTTLE.baseMs), true, "the operator gets in once the wait passes");
    otherInstance();
    assert.equal(await pinOk("typo", key, t0 + PIN_THROTTLE.baseMs), false);
    otherInstance();
    assert.equal(await pinOk(PIN, key, t0 + PIN_THROTTLE.baseMs), true, "a right PIN cleared the count everywhere");
  });

  it("slows every instance after many wrong PINs anywhere", async () => {
    const t0 = 9_500_000;
    for (let i = 0; i < PIN_THROTTLE.globalFree; i += 1) {
      otherInstance();
      await pinOk("guess", `192.0.2.${i}`, t0);
    }
    otherInstance();
    pauses = [];
    assert.equal(await pinOk(PIN, "198.51.100.30", t0 + 1), true);
    assert.deepEqual(pauses, [PIN_THROTTLE.slowMs]);
    pauses = [];
    assert.equal(await pinOk(PIN, "198.51.100.30", t0 + PIN_THROTTLE.globalWindowMs), true);
    assert.deepEqual(pauses, [], "the slow-down lifts with the window");
  });

  it("only lets the free guesses through when one client sends them in parallel", async () => {
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => pinOk("guess", "203.0.113.41", 9_800_000)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, PIN_THROTTLE.free);
  });

  it("never refuses the shared key", async () => {
    for (let i = 0; i < 20; i += 1) assert.equal(await pinOk("guess", SHARED_CLIENT, 9_900_000 + i), false);
    assert.equal(await pinOk(PIN, SHARED_CLIENT, 9_900_100), true);
  });

  it("falls back to this instance's throttle when the store is down", async () => {
    const down = () => Promise.reject(new Error("down"));
    setThrottleStore({ count: down, hit: down, take: down, strike: down, clearStrikes: down, liveStrikes: down });
    const key = "203.0.113.42";
    const end = await guess(key, PIN_THROTTLE.free, 9_950_000);
    await assert.rejects(pinOk(PIN, key, end), { message: pinWaitMessage(PIN_THROTTLE.baseMs) });
    assert.equal(await pinOk(PIN, key, end + PIN_THROTTLE.baseMs), true);
  });
});
