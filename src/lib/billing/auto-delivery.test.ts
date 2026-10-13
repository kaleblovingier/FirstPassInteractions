import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import {
  checkListPrice,
  fulfillPaidSession,
  handleStripeWebhook,
  stripeMode,
} from "./stripe.server";
import { verifyKey } from "./license.server";

const saved = { ...process.env };
const realFetch = globalThis.fetch;

function session(over: Record<string, unknown> = {}, meta: Record<string, string> = {}) {
  return {
    id: "cs_test_auto_1",
    payment_status: "paid",
    currency: "usd",
    amount_total: 7900,
    amount_subtotal: 7900,
    customer_details: { email: "buyer@example.com", name: "Pat Buyer" },
    metadata: { product: "firstpass", plan: "lab", interval: "life", issued: "life", ...meta },
    ...over,
  } as any;
}

function fakeStripe() {
  const calls = { pi: 0, sessionUpdates: [] as Array<Record<string, string>> };
  const stripe = {
    paymentIntents: {
      update: async () => {
        calls.pi += 1;
        return {};
      },
    },
    checkout: {
      sessions: {
        update: async (_id: string, body: { metadata: Record<string, string> }) => {
          calls.sessionUpdates.push(body.metadata);
          return {};
        },
      },
    },
  } as unknown as Stripe;
  return { stripe, calls };
}

let mailBodies: Array<{ headers: Record<string, string>; body: any }> = [];
function mockResend(ok: boolean) {
  mailBodies = [];
  globalThis.fetch = (async (_url: any, init: any) => {
    mailBodies.push({ headers: init.headers, body: JSON.parse(init.body) });
    return new Response("{}", { status: ok ? 200 : 422 });
  }) as typeof fetch;
}

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test_placeholder";
  delete process.env.LICENSE_FROM;
});
afterEach(() => {
  process.env = { ...saved };
  globalThis.fetch = realFetch;
});

describe("automatic key delivery", () => {
  it("stripeMode reads test, live, restricted, and junk keys", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    assert.equal(stripeMode(), "test");
    process.env.STRIPE_SECRET_KEY = "rk_test_x";
    assert.equal(stripeMode(), "test");
    process.env.STRIPE_SECRET_KEY = "sk_live_x";
    assert.equal(stripeMode(), "live");
    process.env.STRIPE_SECRET_KEY = "rk_live_x";
    assert.equal(stripeMode(), "live");
    process.env.STRIPE_SECRET_KEY = "not-a-stripe-key";
    assert.equal(stripeMode(), "off");
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal(stripeMode(), "off");
  });

  it("checkListPrice accepts list price or a discounted total, and rejects other prices", () => {
    assert.equal(checkListPrice(session()).ok, true);
    // 20% promo code: subtotal still $79, total lower.
    assert.equal(checkListPrice(session({ amount_total: 6320 })).ok, true);
    const cheap = checkListPrice(session({ amount_total: 100, amount_subtotal: 100 }));
    assert.equal(cheap.ok, false);
    assert.match(cheap.ok ? "" : cheap.reason, /Amount mismatch/);
    assert.equal(checkListPrice(session({}, { plan: "enterprise" })).ok, false);
  });

  it("fulfills once: key verifies, email sent with an idempotency key, second pass does not re-mail", async () => {
    mockResend(true);
    const { stripe, calls } = fakeStripe();
    const first = await fulfillPaidSession(stripe, session());
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.match(first.key, /^FP-LIFE-[0-9A-F]{8}-[0-9A-F]{8}$/);
    assert.equal(verifyKey(first.key).ok, true);
    assert.equal(first.mailed, true);
    assert.equal(mailBodies.length, 1);
    assert.equal(mailBodies[0].headers["Idempotency-Key"], "fp-license-cs_test_auto_1");
    assert.deepEqual(mailBodies[0].body.to, ["buyer@example.com"]);

    // Stripe replays the webhook with the metadata the first pass wrote back.
    const stamped = calls.sessionUpdates.at(-1)!;
    assert.equal(stamped.license_mailed, "1");
    const second = await fulfillPaidSession(stripe, session({}, stamped));
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.key, first.key);
    assert.equal(mailBodies.length, 1, "no second email");
  });

  it("same session always gives the same key, so webhook and return page agree", async () => {
    mockResend(true);
    const a = await fulfillPaidSession(fakeStripe().stripe, session());
    const b = await fulfillPaidSession(fakeStripe().stripe, session());
    assert.equal(a.ok && b.ok && a.key === b.key, true);
  });

  it("an email failure still returns the key, and leaves mailed false so it can be retried", async () => {
    mockResend(false);
    const { stripe, calls } = fakeStripe();
    const res = await fulfillPaidSession(stripe, session());
    assert.equal(res.ok, true);
    if (!res.ok) return;
    assert.equal(res.mailed, false);
    assert.notEqual(calls.sessionUpdates.at(-1)?.license_mailed, "1");
  });

  it("no mail provider configured: key still delivered on the desk, nothing sent", async () => {
    delete process.env.RESEND_API_KEY;
    mockResend(true);
    const res = await fulfillPaidSession(fakeStripe().stripe, session());
    assert.equal(res.ok, true);
    assert.equal(mailBodies.length, 0);
  });

  it("refuses wrong amount, wrong currency, foreign product, and unpaid sessions", async () => {
    mockResend(true);
    const { stripe } = fakeStripe();
    for (const bad of [
      session({ amount_total: 100, amount_subtotal: 100 }),
      session({ currency: "eur" }),
      session({}, { product: "other" }),
      session({ payment_status: "unpaid" }),
    ]) {
      const res = await fulfillPaidSession(stripe, bad);
      assert.equal(res.ok, false);
    }
    assert.equal(mailBodies.length, 0, "no key mailed for a refused session");
  });

  it("webhook rejects missing and forged signatures, and accepts a correctly signed unrelated event", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder";
    const body = JSON.stringify({ id: "evt_1", object: "event", type: "customer.created", data: { object: {} } });
    const noSig = await handleStripeWebhook(new Request("http://x/api/stripe/webhook", { method: "POST", body }));
    assert.equal(noSig.status, 400);
    const forged = await handleStripeWebhook(
      new Request("http://x/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
        body,
      }),
    );
    assert.equal(forged.status, 400);
    const header = new Stripe("sk_test_placeholder").webhooks.generateTestHeaderString({
      payload: body,
      secret: "whsec_placeholder",
    });
    const ok = await handleStripeWebhook(
      new Request("http://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body }),
    );
    assert.equal(ok.status, 200);
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const off = await handleStripeWebhook(new Request("http://x/api/stripe/webhook", { method: "POST", body }));
    assert.equal(off.status, 503);
  });
});
