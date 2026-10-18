import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  mintKeyFromNote,
  mintKeyFromPaid,
  mintProgramForOperator,
  mintProgramKey,
  verifyKey,
} from "./license.server";
import { PROGRAM_KEY_RE, PROGRAM_TIERS, PROGRAM_TIER_LETTER, type ProgramTierId } from "./programs";
import {
  defaultProgramEndMonth,
  formatEndDay,
  formatEndMonth,
  normalizeProgramGrant,
  parseEndMonth,
  programEnded,
  programEndedNote,
  programFromLicense,
  programLicenseLabel,
  programOnboardingNote,
} from "./program-license";

const PEPPER = "fp-test-pepper-program-keys";
const PIN = "test-operator-pin";
const NOW = new Date("2026-10-18T12:00:00Z");
const ORG = "Pacific Northwest School of Pharmacy";
const saved = { ...process.env };

beforeEach(() => {
  process.env.LICENSE_PEPPER = PEPPER;
  process.env.FOUNDER_PIN = PIN;
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
});
afterEach(() => {
  process.env = { ...saved };
});

/** The contract's SIG, computed here without the code under test. */
function contractSig(letter: string, yyyymm: string, body: string) {
  return createHmac("sha256", PEPPER).update(`ORG:${letter}${yyyymm}:${body}`).digest("hex").slice(0, 8).toUpperCase();
}

function swapHex(s: string, at: number) {
  const c = s[at];
  return s.slice(0, at) + (c === "0" ? "1" : "0") + s.slice(at + 1);
}

describe("program keys: mint and verify", () => {
  for (const t of PROGRAM_TIERS) {
    it(`round-trips a ${t.name} key and unlocks what Founding unlocks`, () => {
      const key = mintProgramKey(t.id, ORG, 2027, 10, NOW);
      const m = PROGRAM_KEY_RE.exec(key);
      assert.ok(m, key);
      assert.equal(m[1], PROGRAM_TIER_LETTER[t.id]);
      assert.equal(`${m[2]}${m[3]}`, "202710");
      assert.equal(m[5], contractSig(m[1], "202710", m[4]));
      assert.deepEqual(verifyKey(key, NOW), {
        ok: true,
        plan: "lab",
        lifetime: false,
        license: key,
        program: { tier: t.id, endsAt: "2027-10-31T23:59:59.999Z" },
      });
    });
  }

  it("pins known program keys for a fixed pepper", () => {
    assert.equal(mintProgramKey("team", ORG, 2027, 10, NOW), "FP-ORG-T202710-73AD5D32-1406151E");
    assert.equal(mintProgramKey("program", ORG, 2027, 10, NOW), "FP-ORG-P202710-73AD5D32-AFF466E7");
    assert.equal(mintProgramKey("site", ORG, 2027, 10, NOW), "FP-ORG-S202710-73AD5D32-EE16066B");
    assert.equal(mintProgramKey("team", "Salish Ketamine Clinic", 2027, 3, NOW), "FP-ORG-T202703-AB969261-7A955C5D");
  });

  it("re-mints the same key for the same org, tier and end month", () => {
    const a = mintProgramKey("program", ORG, 2027, 10, NOW);
    const b = mintProgramKey("program", `  ${ORG.toUpperCase().replace(/ /g, "   ")}  `, 2027, 10, new Date("2027-01-02T00:00:00Z"));
    assert.equal(a, b);
    const other = mintProgramKey("program", "Another College", 2027, 10, NOW);
    assert.notEqual(other.split("-")[3], a.split("-")[3]);
    // The body follows the org only; tier and month change the signature.
    const team = mintProgramKey("team", ORG, 2027, 10, NOW);
    const later = mintProgramKey("program", ORG, 2027, 11, NOW);
    assert.equal(team.split("-")[3], a.split("-")[3]);
    assert.equal(later.split("-")[3], a.split("-")[3]);
    assert.notEqual(team, a);
    assert.notEqual(later, a);
  });

  it("verifies pasted keys with stray spaces and lower case", () => {
    const key = mintProgramKey("team", ORG, 2027, 10, NOW);
    const res = verifyKey(`  ${key.toLowerCase().replace(/-/g, " - ")} `, NOW);
    assert.equal(res.ok, true);
    assert.equal(res.license, key);
  });

  it("rejects a tampered body, signature, month or tier", () => {
    const key = mintProgramKey("program", ORG, 2027, 10, NOW);
    const [fp, org, tm, body, sig] = key.split("-");
    const tampered = [
      [fp, org, tm, swapHex(body, 0), sig],
      [fp, org, tm, body, swapHex(sig, 7)],
      [fp, org, "P202711", body, sig],
      [fp, org, "P202810", body, sig],
      [fp, org, "S202710", body, sig],
    ].map((parts) => parts.join("-"));
    for (const bad of tampered) {
      const res = verifyKey(bad, NOW);
      assert.equal(res.ok, false, bad);
      assert.equal(res.reason, "Signature does not verify.", bad);
      assert.equal(res.program, undefined);
      assert.equal(res.license, "");
    }
  });

  it("rejects malformed program keys and months that do not exist", () => {
    for (const bad of ["FP-ORG-X202710-73AD5D32-1406151E", "FP-ORG-T20271-73AD5D32-1406151E", "FP-ORG-T202710-73AD5D3-1406151E"]) {
      assert.equal(verifyKey(bad, NOW).reason, "Not a FirstPass key.");
    }
    for (const mm of ["00", "13", "99"]) {
      const res = verifyKey(`FP-ORG-T2027${mm}-73AD5D32-${contractSig("T", `2027${mm}`, "73AD5D32")}`, NOW);
      assert.equal(res.ok, false);
      assert.equal(res.reason, "That program key has an end month that does not exist.");
    }
    assert.throws(() => mintProgramKey("team", ORG, 2027, 13, NOW), /real end month/);
    assert.throws(() => mintProgramKey("team", ORG, 2027, 0, NOW), /real end month/);
  });

  it("rejects an expired key with a plain reason", () => {
    const key = mintProgramKey("team", "Salish Ketamine Clinic", 2027, 3, NOW);
    const res = verifyKey(key, new Date("2027-05-02T09:00:00Z"));
    assert.deepEqual(res, {
      ok: false,
      plan: "pro",
      lifetime: false,
      license: "",
      reason: "This program key ended on March 31, 2027. Ask your program lead for the renewed key.",
    });
  });

  it("works through the last millisecond of the end month, UTC, and not one after", () => {
    const key = mintProgramKey("team", ORG, 2027, 3, NOW);
    const lastMs = Date.UTC(2027, 3, 1) - 1;
    assert.equal(new Date(lastMs).toISOString(), "2027-03-31T23:59:59.999Z");
    assert.equal(verifyKey(key, new Date(lastMs)).ok, true);
    assert.equal(verifyKey(key, new Date(lastMs + 1)).ok, false);
    // December rolls the year over correctly.
    const dec = mintProgramKey("site", ORG, 2027, 12, NOW);
    assert.equal(verifyKey(dec, new Date("2027-12-31T23:59:59.999Z")).program?.endsAt, "2027-12-31T23:59:59.999Z");
    assert.equal(verifyKey(dec, new Date("2028-01-01T00:00:00.000Z")).ok, false);
  });

  it("refuses end months more than five years out, and months already past", () => {
    assert.match(mintProgramKey("site", ORG, 2031, 10, NOW), PROGRAM_KEY_RE);
    assert.throws(() => mintProgramKey("site", ORG, 2031, 11, NOW), /within five years/);
    assert.throws(() => mintProgramKey("site", ORG, 2026, 9, NOW), /already passed/);
    assert.match(mintProgramKey("site", ORG, 2026, 10, NOW), PROGRAM_KEY_RE);
    // A validly signed key that ends more than five years from "now" does not verify.
    const far = mintProgramKey("site", ORG, 2031, 10, NOW);
    assert.equal(verifyKey(far, NOW).ok, true);
    const early = verifyKey(far, new Date("2026-09-30T00:00:00Z"));
    assert.equal(early.ok, false);
    assert.match(early.reason ?? "", /more than five years/);
  });

  it("a program signature never passes as a personal key, or the reverse", () => {
    const key = mintProgramKey("program", ORG, 2027, 10, NOW);
    const [, , , body, sig] = key.split("-");
    for (const tag of ["LIFE", "LAB", "PRO"]) {
      assert.equal(verifyKey(`FP-${tag}-${body}-${sig}`, NOW).ok, false);
    }
    const life = mintKeyFromPaid("life", "cs_test_pinned_life");
    const [, , lb, ls] = life.split("-");
    assert.equal(verifyKey(`FP-ORG-P202710-${lb}-${ls}`, NOW).ok, false);
  });

  it("fails closed in production without a pepper", () => {
    const key = mintProgramKey("team", ORG, 2027, 10, NOW);
    process.env.NODE_ENV = "production";
    delete process.env.LICENSE_PEPPER;
    const res = verifyKey(key, NOW);
    assert.equal(res.ok, false);
    assert.match(res.reason ?? "", /LICENSE_PEPPER is unset/);
    assert.throws(() => mintProgramKey("team", ORG, 2027, 10, NOW), /LICENSE_PEPPER is unset/);
    const op = mintProgramForOperator({ pin: PIN, tier: "team", org: ORG, end: "2027-10" }, NOW);
    assert.equal(op.ok, false);
  });
});

describe("legacy personal keys do not change", () => {
  const pinned: Array<[string, { ok: true; plan: "pro" | "lab"; lifetime: boolean; license: string }]> = [
    ["FP-LIFE-F0571FB9-55F3F1B2", { ok: true, plan: "lab", lifetime: true, license: "FP-LIFE-F0571FB9-55F3F1B2" }],
    ["FP-LAB-C941FCDF-5AAEA346", { ok: true, plan: "lab", lifetime: false, license: "FP-LAB-C941FCDF-5AAEA346" }],
    ["FP-PRO-73CEF708-49A01A63", { ok: true, plan: "pro", lifetime: false, license: "FP-PRO-73CEF708-49A01A63" }],
    ["FP-LIFE-EA3BBD0A-50B44D15", { ok: true, plan: "lab", lifetime: true, license: "FP-LIFE-EA3BBD0A-50B44D15" }],
  ];

  it("mints the same deterministic keys as before", () => {
    assert.equal(mintKeyFromPaid("life", "cs_test_pinned_life"), pinned[0][0]);
    assert.equal(mintKeyFromPaid("lab", "cs_test_pinned_lab"), pinned[1][0]);
    assert.equal(mintKeyFromPaid("pro", "cs_test_pinned_pro"), pinned[2][0]);
    assert.equal(mintKeyFromNote("life", "Salish Ketamine"), pinned[3][0]);
  });

  it("verifies them to exactly the same result, with no program field, at any date", () => {
    for (const [key, want] of pinned) {
      assert.deepEqual(verifyKey(key), want);
      assert.deepEqual(verifyKey(key, new Date("2099-01-01T00:00:00Z")), want);
      assert.equal("program" in verifyKey(key), false);
    }
  });

  it("keeps the old failure reasons", () => {
    assert.deepEqual(verifyKey("hello"), {
      ok: false,
      plan: "pro",
      lifetime: false,
      license: "",
      reason: "Not a FirstPass key.",
    });
    assert.deepEqual(verifyKey("FP-LIFE-F0571FB9-55F3F1B3"), {
      ok: false,
      plan: "pro",
      lifetime: false,
      license: "",
      reason: "Signature does not verify.",
    });
  });
});

describe("mintProgramForOperator (Foundry server function)", () => {
  const good = { pin: PIN, tier: "program", org: ORG, end: "2027-10" };

  it("rejects a wrong PIN before anything else", () => {
    assert.deepEqual(mintProgramForOperator({ ...good, pin: "wrong" }, NOW), {
      ok: false,
      reason: "Operator PIN is wrong.",
    });
    assert.deepEqual(mintProgramForOperator({ ...good, pin: "", tier: "gold", org: "" }, NOW), {
      ok: false,
      reason: "Operator PIN is wrong.",
    });
  });

  it("mints with the right PIN and returns the tier, org and end", () => {
    const res = mintProgramForOperator({ ...good, pin: ` ${PIN} `, org: `  ${ORG}  ` }, NOW);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.key, mintProgramKey("program", ORG, 2027, 10, NOW));
    assert.equal(res.tier, "program");
    assert.equal(res.org, ORG);
    assert.equal(res.endsAt, "2027-10-31T23:59:59.999Z");
    assert.equal(res.defaultPin, false);
    assert.equal(res.defaultPepper, false);
  });

  it("validates tier, organization and end month", () => {
    const reason = (input: Partial<typeof good>) => {
      const res = mintProgramForOperator({ ...good, ...input }, NOW);
      return res.ok ? "ok" : res.reason;
    };
    assert.equal(reason({ tier: "gold" }), "Pick a tier: Team, Program or Site.");
    assert.equal(reason({ tier: "" }), "Pick a tier: Team, Program or Site.");
    assert.equal(reason({ org: "   " }), "Add the organization name.");
    assert.equal(reason({ org: "x".repeat(121) }), "Keep the organization name to 120 characters or fewer.");
    assert.equal(reason({ org: "x".repeat(120) }), "ok");
    assert.equal(reason({ end: "" }), "Pick the last month the key should work.");
    assert.equal(reason({ end: "2027-13" }), "Pick the last month the key should work.");
    assert.equal(reason({ end: "202710" }), "Pick the last month the key should work.");
    assert.equal(reason({ end: "2026-09" }), "That end month has already passed.");
    assert.equal(reason({ end: "2031-11" }), "Pick an end month within five years.");
  });

  it("flags the development defaults", () => {
    delete process.env.FOUNDER_PIN;
    delete process.env.LICENSE_PEPPER;
    const res = mintProgramForOperator({ ...good, pin: "heme-450" }, NOW);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.defaultPin, true);
    assert.equal(res.defaultPepper, true);
  });
});

describe("program license helpers", () => {
  const grant = { tier: "team" as ProgramTierId, endsAt: "2027-03-31T23:59:59.999Z" };

  it("labels the license the way the desk shows it", () => {
    assert.equal(programLicenseLabel(grant), "Program license (Team) · through Mar 2027");
    assert.equal(formatEndMonth(grant.endsAt, "long"), "March 2027");
    assert.equal(formatEndDay(grant.endsAt), "March 31, 2027");
    assert.match(programEndedNote(grant), /ended on March 31, 2027/);
    assert.match(programEndedNote(grant), /Ask your program lead for the renewed key/);
  });

  it("defaults the end month to 12 months from now", () => {
    assert.equal(defaultProgramEndMonth(NOW), "2027-10");
    assert.equal(defaultProgramEndMonth(new Date("2026-12-31T23:00:00Z")), "2027-12");
    assert.equal(defaultProgramEndMonth(new Date("2026-01-01T00:00:00Z")), "2027-01");
  });

  it("parses month input and reads a grant back from a key", () => {
    assert.deepEqual(parseEndMonth("2027-03"), { year: 2027, month: 3 });
    assert.equal(parseEndMonth("2027-3"), null);
    assert.equal(parseEndMonth("1999-03"), null);
    assert.deepEqual(programFromLicense("FP-ORG-T202703-AB969261-7A955C5D"), grant);
    assert.equal(programFromLicense("FP-LIFE-F0571FB9-55F3F1B2"), null);
    assert.equal(programFromLicense(null), null);
  });

  it("knows when a grant has ended, and fails closed on a bad date", () => {
    const end = Date.parse(grant.endsAt);
    assert.equal(programEnded(grant, end), false);
    assert.equal(programEnded(grant, end + 1), true);
    assert.equal(programEnded({ tier: "team", endsAt: "soon" }, 0), true);
    assert.deepEqual(normalizeProgramGrant(grant), grant);
    assert.equal(normalizeProgramGrant({ tier: "gold", endsAt: grant.endsAt }), null);
    assert.equal(normalizeProgramGrant({ tier: "team", endsAt: "soon" }), null);
    assert.equal(normalizeProgramGrant(undefined), null);
  });

  it("writes an onboarding note with redeem steps, privacy and the educational disclaimer", () => {
    const key = "FP-ORG-P202710-73AD5D32-AFF466E7";
    const note = programOnboardingNote({
      key,
      org: `  ${ORG} `,
      tier: "program",
      endsAt: "2027-10-31T23:59:59.999Z",
      siteUrl: "https://firstpass-desk.vercel.app",
      contact: "FirstPassInteractions@gmail.com",
    });
    assert.ok(note.startsWith(`FirstPass program key for ${ORG}\n`));
    assert.ok(note.includes(`\n${key}\n`));
    assert.match(note, /works through October 31, 2027/);
    assert.match(note, /Go to Plans, then Redeem\./);
    assert.match(note, /Paste the key and tap Redeem\./);
    assert.match(note, /There are no accounts\. Nothing about learners is stored\./);
    assert.match(note, /up to 100 people/);
    assert.match(note, /not FDA-cleared/);
    assert.match(note, /The Prescribing Information governs\./);
    assert.match(note, /Founding/);
    assert.doesNotMatch(note, /\bPro\b/);
    assert.doesNotMatch(note, /patient/i);
    const site = programOnboardingNote({
      key,
      org: ORG,
      tier: "site",
      endsAt: "2027-10-31T23:59:59.999Z",
      siteUrl: "https://firstpass-desk.vercel.app",
      contact: "FirstPassInteractions@gmail.com",
    });
    assert.match(site, new RegExp(`anyone at ${ORG} may use this key`));
  });
});
