import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_BASE_URL,
  WHO_FOR,
  classifyRedeem,
  detectTiers,
  disallowedDecisionSupport,
  exitCodeFor,
  findPhrase,
  formatResult,
  hasEducationalReference,
  hasExact,
  hasFiveDrugLimit,
  hasFoundingPrice,
  hasNotFdaCleared,
  missingPayRails,
  parseSaleSmokeArgs,
  serverFnOk,
  statusFor,
} from "./sale-smoke-checks.mjs";

test("detectTiers: Free + Founding only (current main layout)", () => {
  const text = "Plans\nFREE VS FOUNDING\nFREE\n$0 forever\nFOUNDING\n$79 once · lifetime\n";
  assert.deepEqual(detectTiers(text), { tiers: ["free", "founding"], extras: [] });
});

test("detectTiers: flags Pro card and interval toggles (older live layout)", () => {
  const text = "Lifetime\nYearly\nMonthly\nFREE DESK\nPRO\n$79 once\nFOUNDING\n";
  const { tiers, extras } = detectTiers(text);
  assert.deepEqual(tiers, ["free", "pro", "founding"]);
  assert.deepEqual(extras, ["Yearly (billing interval)", "Monthly (billing interval)", "PRO"]);
});

test("detectTiers: flags subscription prices and ignores tier words inside sentences", () => {
  assert.deepEqual(detectTiers("FREE\nFOUNDING\nPro tools plus export").extras, []);
  assert.match(detectTiers("FREE\nFOUNDING\n$9/mo").extras[0], /subscription price/);
});

test("price, limit, rails, FDA line", () => {
  assert.equal(hasFoundingPrice("Founding is $79 once."), true);
  assert.equal(hasFoundingPrice("Founding · $79 lifetime"), true);
  assert.equal(hasFoundingPrice("$790 once"), false);
  assert.equal(hasFoundingPrice("$79"), false);
  assert.equal(hasFiveDrugLimit("Five drugs free."), true);
  assert.equal(hasFiveDrugLimit("Up to five medicines"), true);
  assert.equal(hasFiveDrugLimit("Five-drug checks stay free"), true);
  assert.equal(hasFiveDrugLimit("Up to eight medicines"), false);
  assert.deepEqual(missingPayRails("Venmo · Cash App · PayPal"), []);
  assert.deepEqual(missingPayRails("Venmo only"), ["Cash App", "PayPal"]);
  assert.equal(hasNotFdaCleared("CYP450 · NOT FDA-CLEARED"), true);
  assert.equal(hasNotFdaCleared("FDA-cleared"), false);
});

test("post-merge copy helpers", () => {
  assert.equal(hasExact(`intro\n${WHO_FOR.replace(", and", ",\nand")}`, WHO_FOR), true);
  assert.equal(hasExact("For licensed healthcare professionals.", WHO_FOR), false);
  assert.equal(
    hasEducationalReference("EDUCATIONAL INTERACTION REFERENCE, not a substitute"),
    true,
  );
  assert.equal(findPhrase("for HCPs and Trained Safety Staff.", "trained safety staff").length, 1);
});

test("decision support: allowed only inside an FDA guidance citation", () => {
  const cite =
    "See FDA, Clinical Decision Support Software: Guidance for Industry and FDA Staff (2022).";
  assert.deepEqual(disallowedDecisionSupport(cite), []);
  const claim =
    "FirstPass is clinical decision support software intended for licensed professionals.";
  assert.equal(disallowedDecisionSupport(claim).length, 1);
  assert.equal(disallowedDecisionSupport(`${cite} ${"x ".repeat(80)}${claim}`).length, 1);
});

test("serverFnOk reads seroval ok flag", () => {
  const body = (s) =>
    JSON.stringify({
      t: 10,
      i: 0,
      p: {
        k: ["result", "error", "context"],
        v: [
          {
            t: 10,
            i: 1,
            p: {
              k: ["ok", "reason"],
              v: [
                { t: 2, s },
                { t: 1, s: "x" },
              ],
            },
          },
        ],
      },
    });
  assert.equal(serverFnOk(body(3)), false);
  assert.equal(serverFnOk(body(2)), true);
  assert.equal(serverFnOk("not json"), null);
  assert.equal(serverFnOk(JSON.stringify({ p: { v: [{ p: { k: ["mode"], v: [] } }] } })), null);
});

test("classifyRedeem", () => {
  assert.equal(classifyRedeem({ alertText: "Not a FirstPass key.", serverOk: false }).pass, true);
  assert.equal(classifyRedeem({ alertText: "Not a FirstPass key.", serverOk: true }).pass, false);
  assert.equal(classifyRedeem({ statusText: "Founding lifetime unlocked." }).pass, false);
  assert.equal(classifyRedeem({ alertText: "" }).pass, false);
});

test("status, exit code, formatting", () => {
  assert.equal(statusFor(true), "pass");
  assert.equal(statusFor(false), "fail");
  assert.equal(statusFor(false, { postMergeOnly: true }), "warn");
  assert.equal(statusFor(false, { postMergeOnly: true, postMerge: true }), "fail");
  assert.equal(exitCodeFor([{ status: "pass" }, { status: "warn" }]), 0);
  assert.equal(exitCodeFor([{ status: "pass" }, { status: "fail" }]), 1);
  assert.equal(formatResult({ status: "warn", label: "X", detail: "y" }), "[WARN] X — y");
});

test("parseSaleSmokeArgs", () => {
  assert.deepEqual(parseSaleSmokeArgs([]), {
    baseUrl: DEFAULT_BASE_URL,
    postMerge: false,
    json: false,
    help: false,
  });
  const a = parseSaleSmokeArgs(["https://x.vercel.app/", "--post-merge", "--json"]);
  assert.equal(a.baseUrl, "https://x.vercel.app");
  assert.equal(a.postMerge, true);
  assert.equal(a.json, true);
  assert.equal(
    parseSaleSmokeArgs(["--url=http://localhost:8080"]).baseUrl,
    "http://localhost:8080",
  );
  assert.equal(
    parseSaleSmokeArgs([], { SALE_SMOKE_URL: "https://y.app" }).baseUrl,
    "https://y.app",
  );
  assert.match(parseSaleSmokeArgs(["file:///etc/passwd"]).error, /http\/https/);
  assert.match(parseSaleSmokeArgs(["--nope"]).error, /unknown flag/);
});
