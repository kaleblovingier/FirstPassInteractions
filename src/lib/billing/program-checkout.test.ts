import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { setLogSink } from "../server/log";
import { verifyKey } from "./license.server";
import { defaultProgramEndMonth, parseEndMonth } from "./program-license";
import { PROGRAM_TIER_BY_ID } from "./programs";
import { handleStartProgramCheckout } from "./program-checkout";
import {
  PROGRAM_CHECKOUT_OFF_REASON,
  PROGRAM_PRODUCT,
  PROGRAM_SITE_REASON,
  PROGRAM_STRIPE_OFF_REASON,
  claimProgramSession,
  createProgramCheckout,
  fulfillProgramSession,
  programCheckoutStatus,
  programListCents,
  validateProgramSession,
  type ProgramStripe,
} from "./program-checkout.server";
import { BILLING_INPUT_REASON, ProgramCheckoutInput, checkBillingInput } from "./rpc-input";
import { handleStripeWebhook } from "./stripe.server";

const saved = { ...process.env };
const HOOK_SECRET = "whsec_test_program_checkout";

beforeEach(() => {
  process.env.LICENSE_PEPPER = "fp-test-pepper-program-checkout";
  process.env.FOUNDER_PIN = "test-pin-program-checkout";
  delete process.env.GROK_PROJECT_ID;
  delete process.env.NODE_ENV;
  delete process.env.PROGRAM_CHECKOUT;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.RESEND_API_KEY;
  setLogSink(() => {});
});

afterEach(() => {
  process.env = { ...saved };
  setLogSink(null);
});

function liveEnv() {
  process.env.PROGRAM_CHECKOUT = "on";
  process.env.STRIPE_SECRET_KEY = "sk_test_program_checkout_dummy";
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function paidSession(over: Record<string, any> = {}, metaOver: Record<string, any> = {}) {
  return {
    id: "cs_test_program_paid_001",
    object: "checkout.session",
    payment_status: "paid",
    status: "complete",
    currency: "usd",
    amount_total: programListCents("team"),
    amount_subtotal: programListCents("team"),
    created: nowSeconds(),
    customer_details: { email: "lead@clinic.example", name: "Program Lead" },
    payment_intent: "pi_test_program_001",
    metadata: { product: PROGRAM_PRODUCT, tier: "team", org: "Riverside Ketamine Clinic", seats: "12", years: "1", ...metaOver },
    ...over,
  };
}

/** In-memory Stripe double: sessions persist metadata updates, so repeat deliveries see earlier stamps. */
function fakeStripe(sessions: Record<string, any> = {}) {
  const calls = { create: [] as any[], update: [] as any[], pi: [] as any[], retrieve: 0 };
  const stripe = {
    checkout: {
      sessions: {
        create: async (params: any) => {
          calls.create.push(params);
          return { id: "cs_test_new", url: "https://checkout.stripe.com/c/pay/cs_test_new" };
        },
        retrieve: async (id: string) => {
          calls.retrieve += 1;
          const s = sessions[id];
          if (!s) throw new Error("No such session");
          return structuredClone(s);
        },
        update: async (id: string, params: any) => {
          calls.update.push({ id, params });
          sessions[id] = { ...sessions[id], metadata: params.metadata };
          return sessions[id];
        },
      },
    },
    paymentIntents: {
      update: async (id: string, params: any) => {
        calls.pi.push({ id, params });
        return {};
      },
    },
    webhooks: new Stripe("sk_test_dummy_for_webhooks").webhooks,
  };
  return { stripe: stripe as unknown as Stripe & ProgramStripe, calls, sessions };
}

const goodRequest = { tier: "team", org: "Riverside Ketamine Clinic", email: "lead@clinic.example", seats: 12, years: 1 };

describe("program card checkout — off by default", () => {
  it("refuses with a plain reason when PROGRAM_CHECKOUT is not on, even with Stripe set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_program_checkout_dummy";
    const { stripe, calls } = fakeStripe();
    for (const flag of [undefined, "", "off", "true", "1"]) {
      if (flag === undefined) delete process.env.PROGRAM_CHECKOUT;
      else process.env.PROGRAM_CHECKOUT = flag;
      const res = await createProgramCheckout(goodRequest, { stripe, origin: "https://desk.example" });
      assert.deepEqual(res, { ok: false, reason: PROGRAM_CHECKOUT_OFF_REASON });
      assert.equal(programCheckoutStatus().live, false);
    }
    assert.equal(calls.create.length, 0);
  });

  it("refuses when Stripe is not configured, even with the flag on", async () => {
    process.env.PROGRAM_CHECKOUT = "on";
    const { stripe, calls } = fakeStripe();
    const res = await createProgramCheckout(goodRequest, { stripe, origin: "https://desk.example" });
    assert.deepEqual(res, { ok: false, reason: PROGRAM_STRIPE_OFF_REASON });
    process.env.STRIPE_SECRET_KEY = "not-a-stripe-key";
    const res2 = await createProgramCheckout(goodRequest, { stripe, origin: "https://desk.example" });
    assert.deepEqual(res2, { ok: false, reason: PROGRAM_STRIPE_OFF_REASON });
    assert.equal(programCheckoutStatus().live, false);
    assert.equal(calls.create.length, 0);
  });

  it("reports live only with the flag on and a real Stripe key", () => {
    liveEnv();
    assert.deepEqual(programCheckoutStatus(), { live: true, mode: "test" });
  });
});

describe("program card checkout — opening a session", () => {
  it("prices from programs.ts and tags the session as a program license", async () => {
    liveEnv();
    const { stripe, calls } = fakeStripe();
    const res = await createProgramCheckout({ ...goodRequest, org: "  Riverside   Ketamine Clinic " }, { stripe, origin: "https://desk.example" });
    assert.equal(res.ok, true);
    assert.equal(calls.create.length, 1);
    const p = calls.create[0];
    assert.equal(p.mode, "payment");
    assert.equal(p.allow_promotion_codes, false);
    assert.equal(p.line_items.length, 1);
    assert.equal(p.line_items[0].quantity, 1);
    assert.equal(p.line_items[0].price_data.currency, "usd");
    assert.equal(p.line_items[0].price_data.unit_amount, PROGRAM_TIER_BY_ID.team.annual * 100);
    assert.match(p.line_items[0].price_data.product_data.description, /Not FDA-cleared/);
    assert.deepEqual(p.metadata, {
      product: PROGRAM_PRODUCT,
      tier: "team",
      org: "Riverside Ketamine Clinic",
      seats: "12",
      years: "1",
    });
    assert.equal(p.customer_email, "lead@clinic.example");
    assert.match(p.success_url, /^https:\/\/desk\.example\/for-programs\?fp_program=\{CHECKOUT_SESSION_ID\}/);
  });

  it("Program tier uses its own list price", async () => {
    liveEnv();
    const { stripe, calls } = fakeStripe();
    const res = await createProgramCheckout({ ...goodRequest, tier: "program", seats: 100 }, { stripe, origin: "https://desk.example" });
    assert.equal(res.ok, true);
    assert.equal(calls.create[0].line_items[0].price_data.unit_amount, PROGRAM_TIER_BY_ID.program.annual * 100);
  });

  it("does not let the client send a price, amount or currency", async () => {
    liveEnv();
    for (const extra of [{ price: 1 }, { amount: 100 }, { unit_amount: 100 }, { currency: "usd" }, { annual: 1 }]) {
      const checked = checkBillingInput("startProgramCheckout", ProgramCheckoutInput, { ...goodRequest, ...extra });
      assert.equal(checked.ok, false);
      assert.deepEqual(await handleStartProgramCheckout(checked as any), { ok: false, reason: BILLING_INPUT_REASON });
    }
  });

  it("rejects malformed payloads at the gate", () => {
    const bad = [
      { ...goodRequest, seats: "12" },
      { ...goodRequest, seats: 2.5 },
      { ...goodRequest, seats: 0 },
      { ...goodRequest, years: 2 },
      { ...goodRequest, tier: "enterprise" },
      { ...goodRequest, org: "Line\nbreak" },
      null,
      [],
    ];
    for (const input of bad) {
      assert.equal(checkBillingInput("startProgramCheckout", ProgramCheckoutInput, input).ok, false, JSON.stringify(input));
    }
    assert.equal(checkBillingInput("startProgramCheckout", ProgramCheckoutInput, goodRequest).ok, true);
  });

  it("refuses Site: it stays quote and invoice", async () => {
    liveEnv();
    const { stripe, calls } = fakeStripe();
    const res = await createProgramCheckout({ ...goodRequest, tier: "site", seats: 300 }, { stripe, origin: "https://desk.example" });
    assert.deepEqual(res, { ok: false, reason: PROGRAM_SITE_REASON });
    assert.equal(calls.create.length, 0);
  });

  it("refuses seats over the tier cap", async () => {
    liveEnv();
    const { stripe, calls } = fakeStripe();
    const team = await createProgramCheckout({ ...goodRequest, seats: 26 }, { stripe, origin: "https://desk.example" });
    assert.equal(team.ok, false);
    assert.match(team.ok ? "" : team.reason, /up to 25 people/);
    const program = await createProgramCheckout({ ...goodRequest, tier: "program", seats: 101 }, { stripe, origin: "https://desk.example" });
    assert.equal(program.ok, false);
    assert.match(program.ok ? "" : program.reason, /up to 100 people/);
    assert.equal(calls.create.length, 0);
  });

  it("refuses a missing organization or a bad email", async () => {
    liveEnv();
    const { stripe, calls } = fakeStripe();
    assert.equal((await createProgramCheckout({ ...goodRequest, org: "   " }, { stripe, origin: "https://d.example" })).ok, false);
    assert.equal((await createProgramCheckout({ ...goodRequest, email: "nope" }, { stripe, origin: "https://d.example" })).ok, false);
    assert.equal(calls.create.length, 0);
  });
});

describe("program card checkout — validating a paid session", () => {
  it("accepts a paid Team session at list price", () => {
    const v = validateProgramSession(paidSession());
    assert.deepEqual(v, { ok: true, tier: "team", org: "Riverside Ketamine Clinic", seats: 12 });
  });

  it("refuses the wrong amount", () => {
    for (const s of [
      paidSession({ amount_total: 100, amount_subtotal: 100 }),
      paidSession({ amount_total: programListCents("team") - 1 }),
      paidSession({ amount_subtotal: 100 }),
      // Team price on a session tagged Program.
      paidSession({}, { tier: "program" }),
    ]) {
      const v = validateProgramSession(s);
      assert.equal(v.ok, false);
      assert.match(v.ok ? "" : v.reason, /Amount mismatch/);
    }
  });

  it("refuses the wrong currency", () => {
    for (const currency of ["eur", "", null, undefined]) {
      const v = validateProgramSession(paidSession({ currency }));
      assert.equal(v.ok, false);
      assert.match(v.ok ? "" : v.reason, /USD/);
    }
  });

  it("refuses another product, including individual FirstPass licenses", () => {
    for (const product of ["firstpass", "other", undefined]) {
      const v = validateProgramSession(paidSession({}, { product }));
      assert.equal(v.ok, false);
      assert.match(v.ok ? "" : v.reason, /not a FirstPass program license/);
    }
  });

  it("refuses unpaid, Site, over-cap seats and a bad term", () => {
    assert.equal(validateProgramSession(paidSession({ payment_status: "unpaid" })).ok, false);
    assert.equal(validateProgramSession(paidSession({ amount_total: 590000, amount_subtotal: 590000 }, { tier: "site" })).ok, false);
    assert.equal(validateProgramSession(paidSession({}, { seats: "26" })).ok, false);
    assert.equal(validateProgramSession(paidSession({}, { seats: "abc" })).ok, false);
    assert.equal(validateProgramSession(paidSession({}, { years: "2" })).ok, false);
    assert.equal(validateProgramSession(paidSession({}, { org: "" })).ok, false);
    assert.equal(validateProgramSession(null).ok, false);
  });
});

describe("program card checkout — fulfilment", () => {
  it("mints the same program key for the same session, ending 12 months after it was created", async () => {
    const session = paidSession();
    const { stripe, calls } = fakeStripe({ [session.id]: session });
    const mails: any[] = [];
    const mail = async (opts: any) => {
      mails.push(opts);
      return true;
    };
    const first = await fulfillProgramSession(stripe, structuredClone(session) as any, { mail });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.match(first.key, /^FP-ORG-T\d{6}-[0-9A-F]{8}-[0-9A-F]{8}$/);
    const end = parseEndMonth(defaultProgramEndMonth(new Date(session.created * 1000)))!;
    assert.ok(first.key.startsWith(`FP-ORG-T${end.year}${String(end.month).padStart(2, "0")}-`));
    const verified = verifyKey(first.key);
    assert.equal(verified.ok, true);
    assert.equal(verified.program?.tier, "team");
    assert.equal(first.mailed, true);
    assert.equal(mails.length, 1);
    assert.equal(mails[0].to, "lead@clinic.example");
    assert.equal(mails[0].idempotencyKey, `fp-program-${session.id}`);
    assert.match(mails[0].text, new RegExp(first.key));
    assert.match(mails[0].subject, /Team program key/);
    assert.equal(calls.update.at(-1).params.metadata.license_key, first.key);

    // Claim again from the stored (stamped) session: same key, no second email.
    const again = await claimProgramSession(session.id, { stripe, mail });
    assert.equal(again.ok, true);
    if (again.ok) assert.equal(again.key, first.key);
    assert.equal(mails.length, 1);

    // A fresh read of the unstamped session still derives the same key.
    const fresh = await fulfillProgramSession(stripe, structuredClone(session) as any, { mail: async () => false });
    assert.equal(fresh.ok && fresh.key, first.key);
  });

  it("does not mint or mail for a refused session", async () => {
    const session = paidSession({ amount_total: 100, amount_subtotal: 100 });
    const { stripe, calls } = fakeStripe({ [session.id]: session });
    let mailed = 0;
    const res = await fulfillProgramSession(stripe, session as any, {
      mail: async () => {
        mailed += 1;
        return true;
      },
    });
    assert.equal(res.ok, false);
    assert.equal(mailed, 0);
    assert.equal(calls.update.length, 0);
    assert.equal(calls.pi.length, 0);
  });

  it("claim refuses non-Stripe ids and works without the flag once someone has paid", async () => {
    assert.deepEqual(await claimProgramSession("nope"), { ok: false, reason: "Not a Stripe session." });
    const session = paidSession();
    const { stripe } = fakeStripe({ [session.id]: session });
    delete process.env.PROGRAM_CHECKOUT;
    const res = await claimProgramSession(session.id, { stripe, mail: async () => false });
    assert.equal(res.ok, true);
  });
});

describe("program card checkout — webhook", () => {
  function signed(event: unknown) {
    const payload = JSON.stringify(event);
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: HOOK_SECRET });
    return new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": header },
      body: payload,
    });
  }

  it("fulfils checkout.session.completed once: repeat deliveries give the same key and one email", async () => {
    process.env.RESEND_API_KEY = "re_test_dummy";
    const session = paidSession();
    const { stripe, sessions } = fakeStripe({ [session.id]: session });
    const realFetch = globalThis.fetch;
    const sent: any[] = [];
    globalThis.fetch = (async (url: any, init: any) => {
      sent.push({ url: String(url), init });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      const event = { id: "evt_test_1", object: "event", type: "checkout.session.completed", data: { object: session } };
      const r1 = await handleStripeWebhook(signed(event), { stripe, hookSecret: HOOK_SECRET });
      assert.equal(r1.status, 200);
      const key1 = sessions[session.id].metadata.license_key;
      assert.match(key1, /^FP-ORG-T/);
      assert.equal(sessions[session.id].metadata.license_mailed, "1");

      const r2 = await handleStripeWebhook(signed(event), { stripe, hookSecret: HOOK_SECRET });
      assert.equal(r2.status, 200);
      assert.equal(sessions[session.id].metadata.license_key, key1);

      const mails = sent.filter((s) => s.url.includes("api.resend.com"));
      assert.equal(mails.length, 1);
      assert.equal(mails[0].init.headers["Idempotency-Key"], `fp-program-${session.id}`);
      assert.match(JSON.parse(mails[0].init.body).text, new RegExp(key1));
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("asks Stripe to retry when the key email fails, and keeps the same key on retry", async () => {
    process.env.RESEND_API_KEY = "re_test_dummy";
    const session = paidSession();
    const { stripe, sessions } = fakeStripe({ [session.id]: session });
    const realFetch = globalThis.fetch;
    let ok = false;
    globalThis.fetch = (async () => new Response("{}", { status: ok ? 200 : 500 })) as typeof fetch;
    try {
      const event = { id: "evt_test_2", object: "event", type: "checkout.session.completed", data: { object: session } };
      const r1 = await handleStripeWebhook(signed(event), { stripe, hookSecret: HOOK_SECRET });
      assert.equal(r1.status, 500);
      const key1 = sessions[session.id].metadata.license_key;
      ok = true;
      const r2 = await handleStripeWebhook(signed(event), { stripe, hookSecret: HOOK_SECRET });
      assert.equal(r2.status, 200);
      assert.equal(sessions[session.id].metadata.license_key, key1);
      assert.equal(sessions[session.id].metadata.license_mailed, "1");
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("ignores a program session with the wrong amount and never stamps a key", async () => {
    const session = paidSession({ amount_total: 100, amount_subtotal: 100 });
    const { stripe, sessions, calls } = fakeStripe({ [session.id]: session });
    const event = { id: "evt_test_3", object: "event", type: "checkout.session.completed", data: { object: session } };
    const res = await handleStripeWebhook(signed(event), { stripe, hookSecret: HOOK_SECRET });
    assert.equal(res.status, 200);
    assert.equal(sessions[session.id].metadata.license_key, undefined);
    assert.equal(calls.update.length, 0);
  });

  it("rejects a bad signature", async () => {
    const { stripe } = fakeStripe();
    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=bad" },
      body: "{}",
    });
    const res = await handleStripeWebhook(req, { stripe, hookSecret: HOOK_SECRET });
    assert.equal(res.status, 400);
  });
});
