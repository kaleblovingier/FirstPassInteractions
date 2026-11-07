import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

/* The store persists to window.localStorage; give node an in-memory one before it loads. */
const mem = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true, writable: true });

const { handleRecheckLicense } = await import("./license");
const { mintKey, mintProgramKey } = await import("./license.server");
const { RedeemInput, checkBillingInput } = await import("./rpc-input");
const { KEY_NOT_VERIFIED_NOTE } = await import("./license-verdict");
const { licenseCheckOutcome, useDesk } = await import("../drugs/store");
const { setLogSink } = await import("../server/log");

const saved = { ...process.env };
const recheck = (input: unknown) => handleRecheckLicense(checkBillingInput("recheckLicense", RedeemInput, input));

beforeEach(() => {
  process.env.LICENSE_PEPPER = "fp-test-pepper-recheck";
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
  setLogSink(() => {});
});

afterEach(() => {
  process.env = { ...saved };
  setLogSink(null);
});

describe("recheckLicense — server verdict on a saved key", () => {
  it("says valid for a key this server signed, with the plan the key carries", async () => {
    const life = mintKey("life");
    assert.deepEqual(await recheck({ key: life }), {
      status: "valid",
      plan: "lab",
      lifetime: true,
      license: life,
      program: null,
    });
    const pro = await recheck({ key: mintKey("pro") });
    assert.equal(pro.status, "valid");
    if (pro.status === "valid") assert.equal(pro.plan, "pro");
  });

  it("returns the program term from the key, not from anything the browser saved", async () => {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear() + 1, 5, 1));
    const key = mintProgramKey("team", "Recheck University", end.getUTCFullYear(), 6);
    const res = await recheck({ key });
    assert.equal(res.status, "valid");
    if (res.status === "valid") {
      assert.equal(res.plan, "lab");
      assert.equal(res.program?.tier, "team");
      assert.match(res.program?.endsAt ?? "", new RegExp(`^${end.getUTCFullYear()}-06-30T23:59:59`));
    }
  });

  it("says invalid for a forged, re-signed or malformed key, and gives no reason", async () => {
    const real = mintKey("lab");
    const forged = real.slice(0, -1) + (real.endsWith("A") ? "B" : "A");
    for (const key of [forged, "FP-LIFE-00000000-00000000", "not-a-key", "", "   "]) {
      assert.deepEqual(await recheck({ key }), { status: "invalid" }, key);
    }
    assert.deepEqual(await recheck({ key: 42 }), { status: "invalid" });
    assert.deepEqual(await recheck({ key: real, plan: "lab" }), { status: "invalid" });
    process.env.LICENSE_PEPPER = "a-different-pepper";
    assert.deepEqual(await recheck({ key: real }), { status: "invalid" });
  });

  it("says unavailable, not invalid, when production has no pepper to check with", async () => {
    const key = mintKey("life");
    delete process.env.LICENSE_PEPPER;
    process.env.NODE_ENV = "production";
    assert.deepEqual(await recheck({ key }), { status: "unavailable" });
  });
});

describe("licenseCheckOutcome — what the desk does with the verdict", () => {
  const LIFE = "FP-LIFE-F0571FB9-55F3F1B2";
  const base = {
    plan: "lab" as const,
    license: LIFE,
    lifetime: true,
    program: null,
    programNote: null,
    selected: ["ketamine", "alprazolam", "grapefruit", "midazolam", "fentanyl", "propofol"],
    doses: { ketamine: "50 mg", propofol: "100 mg" },
    phenotypes: { CYP2D6: "PM" as const, CYP2C19: "NM" as const, CYP2C9: "NM" as const, CYP2B6: "IM" as const },
    smoking: true,
    cannabisRoute: "oral" as const,
    alcohol: "chronic" as const,
    age: "geriatric" as const,
    kidney: "ckd" as const,
    preg: "off" as const,
  };

  it("leaves the desk alone when the server could not check", () => {
    assert.equal(licenseCheckOutcome(base, LIFE, { status: "unavailable" }), null);
  });

  it("leaves a matching valid key alone", () => {
    const verdict = { status: "valid" as const, plan: "lab" as const, lifetime: true, license: LIFE, program: null };
    assert.equal(licenseCheckOutcome(base, LIFE, verdict), null);
  });

  it("takes plan and lifetime from the key when the saved flags disagree", () => {
    const verdict = { status: "valid" as const, plan: "pro" as const, lifetime: false, license: LIFE, program: null };
    assert.deepEqual(licenseCheckOutcome(base, LIFE, verdict), { plan: "pro", lifetime: false, program: null });
  });

  it("returns the free desk, with a note, for a key that did not verify", () => {
    const next = licenseCheckOutcome(base, LIFE, { status: "invalid" });
    assert.ok(next);
    assert.equal(next.plan, "free");
    assert.equal(next.license, null);
    assert.equal(next.lifetime, false);
    assert.equal(next.programNote, KEY_NOT_VERIFIED_NOTE);
    assert.deepEqual(next.selected, base.selected.slice(0, 5));
    assert.deepEqual(next.doses, { ketamine: "50 mg" });
    assert.equal(next.smoking, false);
    assert.equal(next.kidney, "ok");
  });

  it("ignores a verdict for a key the desk no longer holds", () => {
    assert.equal(licenseCheckOutcome(base, "FP-PRO-AAAAAAAA-BBBBBBBB", { status: "invalid" }), null);
    assert.equal(licenseCheckOutcome({ ...base, plan: "free" }, LIFE, { status: "invalid" }), null);
  });

  it("drops a paid plan that has no key to check", () => {
    const next = licenseCheckOutcome({ ...base, license: null }, null, { status: "invalid" });
    assert.equal(next?.plan, "free");
  });

  it("applyLicenseCheck writes the free desk to the store", () => {
    useDesk.setState({ ...base });
    assert.equal(useDesk.getState().applyLicenseCheck(LIFE, { status: "invalid" }), true);
    assert.equal(useDesk.getState().plan, "free");
    assert.equal(useDesk.getState().license, null);
    assert.equal(useDesk.getState().applyLicenseCheck(LIFE, { status: "invalid" }), false);
  });
});
