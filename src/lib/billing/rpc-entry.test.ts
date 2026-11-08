import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertNoClientInput } from "../server/empty-input";
import { setLogSink } from "../server/log";
import { handleCollectLicenses, handleDraftCollected } from "./collect";
import { handleClaimPaypalCheckout } from "./paypal";
import {
  handleMintApiKey,
  handleMintLicenseBatch,
  handleMintLicenseKey,
  handleMintProgramLicense,
  handleRedeemLicense,
} from "./license";
import { resetPinThrottle } from "./license.server";
import {
  BILLING_INPUT_REASON,
  CollectInput,
  DraftCollectedInput,
  MintApiInput,
  MintBatchInput,
  MintLicenseInput,
  MintProgramInput,
  PaypalOrderInput,
  RedeemInput,
  StripeCheckoutInput,
  StripeSessionInput,
  OperatorPinInput,
  checkBillingInput,
} from "./rpc-input";
import { handleClaimStripeCheckout, handleListPaidLicenses, handleStartStripeCheckout } from "./stripe";

const PIN = "test-operator-pin-0042";
const saved = { ...process.env };
let lines: string[] = [];

function gate<S extends Parameters<typeof checkBillingInput>[1]>(fn: string, schema: S, input: unknown) {
  return checkBillingInput(fn, schema, input);
}

beforeEach(() => {
  process.env.LICENSE_PEPPER = "fp-test-pepper-rpc-entry";
  process.env.FOUNDER_PIN = PIN;
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
  delete process.env.STRIPE_SECRET_KEY;
  resetPinThrottle();
  lines = [];
  setLogSink((_level, line) => lines.push(line));
});

afterEach(() => {
  process.env = { ...saved };
  resetPinThrottle();
  setLogSink(null);
});

describe("billing rpc input — mint and redeem reject bad payloads", () => {
  const secret = "pin-must-not-appear-in-logs-99";

  it("does not mint a lifetime key when the plan is not an issued plan", async () => {
    const badPlans = ["free", "nope", "LIFE", " life", "", 1, ["life"], { toString: () => "life" }, null];
    for (const plan of badPlans) {
      const checked = gate("mintLicenseKey", MintLicenseInput, { pin: PIN, plan, soldTo: "Clinic" });
      const res = await handleMintLicenseKey(checked);
      assert.deepEqual(res, { ok: false, reason: BILLING_INPUT_REASON });
      assert.equal("key" in res, false);
    }
  });

  it("rejects non-string pins, extra keys and non-objects without echoing them", async () => {
    const payloads = [
      { pin: 12345, plan: "life", soldTo: "Clinic" },
      { pin: secret, plan: "life", soldTo: { name: "Clinic" } },
      { pin: PIN, plan: "pro", soldTo: "Clinic", admin: true },
      null,
      "life",
      ["pro"],
      JSON.parse('{"pin":"x","plan":"life","soldTo":"","__proto__":{"polluted":true}}'),
    ];
    for (const input of payloads) {
      const checked = gate("mintLicenseKey", MintLicenseInput, input);
      const res = await handleMintLicenseKey(checked);
      assert.deepEqual(res, { ok: false, reason: BILLING_INPUT_REASON });
    }
    assert.equal(({} as { polluted?: boolean }).polluted, undefined);
    assert.equal(lines.some((line) => line.includes(secret) || line.includes("Clinic")), false);
    const last = JSON.parse(lines.at(-1)!);
    assert.equal(last.event, "billing.invalid");
    assert.equal(typeof last.issues === "number" || last.oversized === true, true);
  });

  it("mints the plan that was sent when the shape is valid", async () => {
    const checked = gate("mintLicenseKey", MintLicenseInput, { pin: PIN, plan: "pro", soldTo: "Clinic" });
    const res = await handleMintLicenseKey(checked);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.plan, "pro");
    assert.match(res.key, /^FP-PRO-/);
  });

  it("rejects a bad program tier before the PIN can mint", async () => {
    const checked = gate("mintProgramLicense", MintProgramInput, {
      pin: PIN,
      tier: "enterprise",
      org: "Cascade College",
      end: "2027-06",
    });
    const res = await handleMintProgramLicense(checked);
    assert.deepEqual(res, { ok: false, reason: BILLING_INPUT_REASON });
    assert.equal("key" in res, false);
  });

  it("mints a program key only from a tier, org and end month", async () => {
    const checked = gate("mintProgramLicense", MintProgramInput, {
      pin: PIN,
      tier: "program",
      org: "Cascade College",
      end: "2027-06",
    });
    const res = await handleMintProgramLicense(checked);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.match(res.key, /^FP-ORG-P202706-/);
    assert.equal(res.tier, "program");
  });

  it("rejects a program tier or a wrong PIN on the API key mint", async () => {
    const badTier = await handleMintApiKey(
      gate("mintApiLicense", MintApiInput, { pin: PIN, tier: "site", org: "Cascade College", end: "2027-06" }),
    );
    assert.deepEqual(badTier, { ok: false, reason: BILLING_INPUT_REASON });
    const wrongPin = await handleMintApiKey(
      gate("mintApiLicense", MintApiInput, { pin: "wrong", tier: "education", org: "Cascade College", end: "2027-06" }),
    );
    assert.deepEqual(wrongPin, { ok: false, reason: "Operator PIN is wrong." });
  });

  it("mints an API key only from a tier, org and end month", async () => {
    const now = new Date();
    const total = now.getUTCFullYear() * 12 + now.getUTCMonth() + 3;
    const end = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
    const res = await handleMintApiKey(
      gate("mintApiLicense", MintApiInput, { pin: PIN, tier: "education", org: "Cascade College", end }),
    );
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.match(res.key, new RegExp(`^FP-API-E${end.replace("-", "")}-`));
    assert.equal(res.tier, "education");
  });

  it("rejects a batch whose plan or name list is the wrong shape", async () => {
    const badPlan = gate("mintLicenseBatch", MintBatchInput, { pin: PIN, plan: "lifetime", names: "Ada" });
    const badNames = gate("mintLicenseBatch", MintBatchInput, { pin: PIN, plan: "life", names: ["Ada"] });
    assert.deepEqual(await handleMintLicenseBatch(badPlan), { ok: false, reason: BILLING_INPUT_REASON });
    assert.deepEqual(await handleMintLicenseBatch(badNames), { ok: false, reason: BILLING_INPUT_REASON });
  });

  it("batch-mints the sent plan", async () => {
    const checked = gate("mintLicenseBatch", MintBatchInput, { pin: PIN, plan: "lab", names: "Ada\nAda" });
    const res = await handleMintLicenseBatch(checked);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.plan, "lab");
    assert.equal(res.keys.length, 1);
    assert.match(res.keys[0]!.key, /^FP-LAB-/);
  });

  it("redeems only a string key and does not treat a number as empty", async () => {
    const numberKey = await handleRedeemLicense(gate("redeemLicense", RedeemInput, { key: 12345 }));
    assert.deepEqual(numberKey, { ok: false, reason: BILLING_INPUT_REASON });
    const broken = await handleRedeemLicense(gate("redeemLicense", RedeemInput, { key: "FP-PRO-\n" }));
    assert.deepEqual(broken, { ok: false, reason: BILLING_INPUT_REASON });
    const extra = await handleRedeemLicense(gate("redeemLicense", RedeemInput, { key: "FP-PRO-AAAAAAAA-BBBBBBBB", admin: true }));
    assert.deepEqual(extra, { ok: false, reason: BILLING_INPUT_REASON });
    const empty = await handleRedeemLicense(gate("redeemLicense", RedeemInput, { key: "" }));
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.reason, "Paste a key.");
    const typo = await handleRedeemLicense(gate("redeemLicense", RedeemInput, { key: "not-a-key" }));
    assert.equal(typo.ok, false);
    if (!typo.ok) assert.equal(typo.reason, "Not a FirstPass key.");
  });
});

describe("billing rpc input — checkout, collect and draft", () => {
  it("refuses a checkout plan or interval that used to be coerced", async () => {
    const lifePlan = gate("startStripeCheckout", StripeCheckoutInput, {
      plan: "life",
      interval: "life",
      email: "",
    });
    const weekly = gate("startStripeCheckout", StripeCheckoutInput, {
      plan: "lab",
      interval: "weekly",
      email: "buyer@example.com",
    });
    const emailNumber = gate("startStripeCheckout", StripeCheckoutInput, {
      plan: "lab",
      interval: "life",
      email: 1,
    });
    const emailBreak = gate("startStripeCheckout", StripeCheckoutInput, {
      plan: "lab",
      interval: "life",
      email: "buyer@example.com\nBcc: evil@example.com",
    });
    assert.deepEqual(await handleStartStripeCheckout(lifePlan), { ok: false, reason: BILLING_INPUT_REASON });
    assert.deepEqual(await handleStartStripeCheckout(weekly), { ok: false, reason: BILLING_INPUT_REASON });
    assert.deepEqual(await handleStartStripeCheckout(emailNumber), { ok: false, reason: BILLING_INPUT_REASON });
    assert.deepEqual(await handleStartStripeCheckout(emailBreak), { ok: false, reason: BILLING_INPUT_REASON });
  });

  it("lets a real checkout shape through to the stripe guard", async () => {
    const checked = gate("startStripeCheckout", StripeCheckoutInput, {
      plan: "lab",
      interval: "life",
      email: "",
    });
    const res = await handleStartStripeCheckout(checked);
    assert.equal(res.ok, false);
    if (!res.ok) assert.notEqual(res.reason, BILLING_INPUT_REASON);
  });

  it("rejects a non-string session id and still explains a string that is not a session", async () => {
    const bad = await handleClaimStripeCheckout(gate("claimStripeCheckout", StripeSessionInput, { sessionId: 12 }));
    assert.deepEqual(bad, { ok: false, reason: BILLING_INPUT_REASON });
    const miss = await handleClaimStripeCheckout(
      gate("claimStripeCheckout", StripeSessionInput, { sessionId: "not-a-session" }),
    );
    assert.equal(miss.ok, false);
    if (!miss.ok) assert.equal(miss.reason, "Not a Stripe session.");
  });

  it("rejects a non-string operator pin before the pin checker", async () => {
    const res = await handleListPaidLicenses(gate("listPaidLicenses", OperatorPinInput, { pin: { length: 4 } }));
    assert.deepEqual(res, { ok: false, reason: BILLING_INPUT_REASON });
  });

  it("rejects a non-string PayPal order id and still explains a bad string", async () => {
    const bad = await handleClaimPaypalCheckout(gate("claimPaypalCheckout", PaypalOrderInput, { orderId: ["ABC12345"] }));
    assert.deepEqual(bad, { ok: false, reason: BILLING_INPUT_REASON });
    const miss = await handleClaimPaypalCheckout(gate("claimPaypalCheckout", PaypalOrderInput, { orderId: "not an order" }));
    assert.equal(miss.ok, false);
    if (!miss.ok) assert.equal(miss.reason, "Not a PayPal order.");
  });

  it("does not collect lifetime keys for an unknown plan", async () => {
    const checked = gate("collectLicenses", CollectInput, {
      pin: PIN,
      plan: "free",
      names: "Ada Lovelace",
      hunt: "",
    });
    const res = await handleCollectLicenses(checked);
    assert.deepEqual(res, { ok: false, reason: BILLING_INPUT_REASON });
    assert.equal("rows" in res, false);
  });

  it("collects the sent plan for a pasted name", async () => {
    const checked = gate("collectLicenses", CollectInput, {
      pin: PIN,
      plan: "pro",
      names: "Ada Lovelace",
      hunt: "",
    });
    const res = await handleCollectLicenses(checked);
    assert.equal(res.ok, true);
    if (!res.ok) return;
    const row = res.rows.find((r) => r.soldTo === "Ada Lovelace");
    assert.ok(row);
    assert.equal(row.plan, "pro");
    assert.match(row.key, /^FP-PRO-/);
  });

  it("rejects a draft whose rows are the wrong shape instead of dropping them", async () => {
    const notAnArray = gate("draftCollected", DraftCollectedInput, { pin: PIN, rows: "Ada" });
    assert.deepEqual(await handleDraftCollected(notAnArray), { ok: false, reason: BILLING_INPUT_REASON });
    const injected = gate("draftCollected", DraftCollectedInput, {
      pin: PIN,
      rows: [
        {
          source: "manual",
          soldTo: "Ada",
          email: "ada@example.com\nBcc: evil@example.com",
          key: "FP-PRO-AAAAAAAA-BBBBBBBB",
          plan: "pro",
          amount: 0,
          at: "2026-11-05T00:00:00.000Z",
          mailed: false,
        },
      ],
    });
    assert.deepEqual(await handleDraftCollected(injected), { ok: false, reason: BILLING_INPUT_REASON });
  });

  it("refuses an oversized row list before walking every element", () => {
    const huge = { pin: PIN, rows: Array.from({ length: 20_000 }, () => ({ key: "x" })) };
    const started = Date.now();
    assert.equal(gate("draftCollected", DraftCollectedInput, huge).ok, false);
    assert.ok(Date.now() - started < 500);
    const last = JSON.parse(lines.at(-1)!);
    assert.equal(last.oversized, true);
    assert.equal(lines.at(-1)!.includes(PIN), false);
  });
});

describe("server functions with no client fields", () => {
  it("accepts an empty body and refuses a body that carries fields", () => {
    assert.doesNotThrow(() => assertNoClientInput(undefined));
    assert.doesNotThrow(() => assertNoClientInput(null));
    assert.doesNotThrow(() => assertNoClientInput({}));
    assert.throws(() => assertNoClientInput({ plan: "life" }), /Invalid input\./);
    assert.throws(() => assertNoClientInput("life"), /Invalid input\./);
  });
});
