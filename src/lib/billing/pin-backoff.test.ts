import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { PIN_BACKOFF, pinOk, pinRefusal, pinWaitMessage, pinWaitMs, resetPinBackoff } from "./license.server";
import { collectLicenses } from "./collect.server";
import { setLogSink } from "../server/log";

const PIN = "test-operator-pin-0042";
const saved = { ...process.env };
let lines: string[] = [];

beforeEach(() => {
  process.env.LICENSE_PEPPER = "fp-test-pepper-backoff";
  process.env.FOUNDER_PIN = PIN;
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
  resetPinBackoff();
  lines = [];
  setLogSink((_level, line) => lines.push(line));
});
afterEach(() => {
  process.env = { ...saved };
  resetPinBackoff();
  setLogSink(null);
});

/** Wrong PINs from `ip`, each sent the moment its backoff allows. Returns the time after the last one. */
function guess(ip: string, count: number, start: number): number {
  let now = start;
  for (let i = 0; i < count; i += 1) {
    now += pinWaitMs(ip, now);
    assert.equal(pinOk("guess", ip, now), false);
  }
  return now;
}

describe("operator PIN check", () => {
  it("accepts the PIN and refuses others, whatever their length", () => {
    assert.equal(pinOk(PIN, "203.0.113.1"), true);
    assert.equal(pinOk(` ${PIN} `, "203.0.113.1"), true);
    assert.equal(pinOk("test-operator-pin-0043", "203.0.113.1"), false);
    assert.equal(pinOk("x", "203.0.113.1"), false);
    assert.equal(pinOk(`${PIN}0`, "203.0.113.1"), false);
  });

  it("never lets wrong PINs from one client lock out the right PIN from another", () => {
    const end = guess("203.0.113.66", 200, 1_000_000);
    assert.ok(pinWaitMs("203.0.113.66", end) > 0, "the guesser is backing off");
    assert.equal(pinOk(PIN, "198.51.100.7", end), true);
    assert.equal(pinOk("typo", "198.51.100.7", end), false, "the operator's own typo is just a wrong PIN");
    assert.equal(pinOk(PIN, "198.51.100.7", end), true);
  });

  it("lets the first wrong PINs through, then doubles the wait up to the cap", () => {
    const ip = "203.0.113.2";
    const t0 = 2_000_000;
    const end = guess(ip, PIN_BACKOFF.free - 1, t0);
    assert.equal(pinWaitMs(ip, end), 0);
    assert.equal(pinOk("guess", ip, end), false);
    assert.equal(pinWaitMs(ip, end), PIN_BACKOFF.baseMs);
    assert.throws(() => pinOk(PIN, ip, end), { message: pinWaitMessage(PIN_BACKOFF.baseMs) });
    assert.equal(pinOk("guess", ip, end + PIN_BACKOFF.baseMs), false);
    assert.equal(pinWaitMs(ip, end + PIN_BACKOFF.baseMs), PIN_BACKOFF.baseMs * 2);
    const later = guess(ip, 30, end + PIN_BACKOFF.baseMs);
    assert.equal(pinWaitMs(ip, later), PIN_BACKOFF.maxMs, "the wait never passes the cap");
  });

  it("does not count checks refused while waiting", () => {
    const ip = "203.0.113.3";
    const end = guess(ip, PIN_BACKOFF.free, 3_000_000);
    for (let i = 0; i < 50; i += 1) assert.throws(() => pinOk("guess", ip, end + 1));
    assert.equal(pinWaitMs(ip, end), PIN_BACKOFF.baseMs);
  });

  it("starts an address over after a right PIN, or after an hour without wrong ones", () => {
    const ip = "203.0.113.4";
    let end = guess(ip, PIN_BACKOFF.free + 3, 4_000_000);
    end += pinWaitMs(ip, end);
    assert.equal(pinOk(PIN, ip, end), true);
    assert.equal(pinOk("guess", ip, end), false);
    assert.equal(pinWaitMs(ip, end), 0, "one wrong PIN after a right one costs nothing");

    end = guess(ip, PIN_BACKOFF.free + 3, end);
    assert.equal(pinWaitMs(ip, end + PIN_BACKOFF.resetMs), 0);
    assert.equal(pinOk("guess", ip, end + PIN_BACKOFF.resetMs), false);
    assert.equal(pinWaitMs(ip, end + PIN_BACKOFF.resetMs), 0, "the count started over");
  });

  it("logs a count for each wrong PIN, never the address or the guess", () => {
    pinOk("hunter2-guess", "203.0.113.5");
    pinOk("hunter2-guess", "203.0.113.5");
    const wrong = lines.filter((l) => l.includes('"pin.wrong"'));
    assert.equal(wrong.length, 2);
    assert.match(wrong[1]!, /"fails":2/);
    for (const line of lines) assert.doesNotMatch(line, /203\.0\.113|hunter2|test-operator-pin/);
  });
});

describe("pinRefusal and the operator server functions", () => {
  it("names the reason instead of throwing", () => {
    assert.equal(pinRefusal(PIN), null);
    assert.equal(pinRefusal("guess"), "Operator PIN is wrong.");
    for (let i = 1; i < PIN_BACKOFF.free; i += 1) pinRefusal("guess");
    assert.match(pinRefusal(PIN) ?? "", /^Too many wrong PINs from here\. Try again in \d+ seconds?\.$/);
  });

  it("answers an unset production PIN with a reason, not a thrown error", async () => {
    delete process.env.FOUNDER_PIN;
    process.env.NODE_ENV = "production";
    assert.match(pinRefusal(PIN) ?? "", /FOUNDER_PIN is unset/);
    const res = await collectLicenses({ pin: PIN, plan: "life", names: "", hunt: "" });
    assert.equal(res.ok, false);
    assert.match(res.ok ? "" : res.reason, /FOUNDER_PIN is unset/);
  });

  it("collectLicenses refuses a caller that is backing off, before any lookup", async () => {
    for (let i = 0; i < PIN_BACKOFF.free; i += 1) pinRefusal("guess");
    const res = await collectLicenses({ pin: PIN, plan: "life", names: "Ada", hunt: "" });
    assert.equal(res.ok, false);
    assert.match(res.ok ? "" : res.reason, /^Too many wrong PINs from here/);
  });

  it("words long waits in minutes", () => {
    assert.equal(pinWaitMessage(1_000), "Too many wrong PINs from here. Try again in 1 second.");
    assert.equal(pinWaitMessage(4_200), "Too many wrong PINs from here. Try again in 5 seconds.");
    assert.equal(pinWaitMessage(PIN_BACKOFF.maxMs), "Too many wrong PINs from here. Try again in 15 minutes.");
  });
});
