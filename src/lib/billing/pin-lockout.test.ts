import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { PIN_LOCKED, PIN_LOCKOUT, pinOk, pinRefusal, resetPinLockout } from "./license.server";
import { collectLicenses } from "./collect.server";

const PIN = "test-operator-pin-0042";
const saved = { ...process.env };

beforeEach(() => {
  process.env.LICENSE_PEPPER = "fp-test-pepper-lockout";
  process.env.FOUNDER_PIN = PIN;
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
  resetPinLockout();
});
afterEach(() => {
  process.env = { ...saved };
  resetPinLockout();
});

describe("operator PIN check", () => {
  it("accepts the PIN and refuses others, whatever their length", () => {
    assert.equal(pinOk(PIN, "203.0.113.1"), true);
    assert.equal(pinOk(` ${PIN} `, "203.0.113.1"), true);
    assert.equal(pinOk("test-operator-pin-0043", "203.0.113.1"), false);
    assert.equal(pinOk("x", "203.0.113.1"), false);
    assert.equal(pinOk(`${PIN}0`, "203.0.113.1"), false);
  });

  it("locks one address after five wrong PINs, even for the right PIN, until the window passes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < PIN_LOCKOUT.perIp; i += 1) assert.equal(pinOk("guess", "203.0.113.2", t0 + i), false);
    assert.throws(() => pinOk(PIN, "203.0.113.2", t0 + 10), { message: PIN_LOCKED });
    assert.equal(pinOk(PIN, "198.51.100.7", t0 + 10), true, "other addresses are not locked");
    assert.equal(pinOk(PIN, "203.0.113.2", t0 + PIN_LOCKOUT.windowMs + 5), true);
  });

  it("does not count right PINs or checks made while locked", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 20; i += 1) assert.equal(pinOk(PIN, "203.0.113.3", t0 + i), true);
    for (let i = 0; i < PIN_LOCKOUT.perIp; i += 1) pinOk("guess", "203.0.113.3", t0 + 100);
    for (let i = 0; i < 50; i += 1) assert.throws(() => pinOk("guess", "203.0.113.3", t0 + 200));
    assert.equal(pinOk(PIN, "203.0.113.3", t0 + 100 + PIN_LOCKOUT.windowMs), true);
  });

  it("locks the whole instance when wrong PINs come from many addresses", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < PIN_LOCKOUT.perInstance; i += 1) assert.equal(pinOk("guess", `192.0.2.${i}`, t0), false);
    assert.throws(() => pinOk(PIN, "192.0.2.250", t0 + 1), { message: PIN_LOCKED });
  });
});

describe("pinRefusal and the operator server functions", () => {
  it("names the reason instead of throwing", () => {
    assert.equal(pinRefusal(PIN), null);
    assert.equal(pinRefusal("guess"), "Operator PIN is wrong.");
    for (let i = 0; i < PIN_LOCKOUT.perIp; i += 1) pinRefusal("guess");
    assert.equal(pinRefusal(PIN), PIN_LOCKED);
  });

  it("answers an unset production PIN with a reason, not a thrown error", async () => {
    delete process.env.FOUNDER_PIN;
    process.env.NODE_ENV = "production";
    assert.match(pinRefusal(PIN) ?? "", /FOUNDER_PIN is unset/);
    const res = await collectLicenses({ pin: PIN, plan: "life", names: "", hunt: "" });
    assert.equal(res.ok, false);
    assert.match(res.ok ? "" : res.reason, /FOUNDER_PIN is unset/);
  });

  it("collectLicenses refuses a locked-out caller before any lookup", async () => {
    for (let i = 0; i < PIN_LOCKOUT.perIp; i += 1) pinRefusal("guess");
    assert.deepEqual(await collectLicenses({ pin: PIN, plan: "life", names: "Ada", hunt: "" }), {
      ok: false,
      reason: PIN_LOCKED,
    });
  });
});
