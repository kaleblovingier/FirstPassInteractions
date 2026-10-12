import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import {
  RECOVERY_GENERIC,
  RECOVERY_LIMITED,
  RECOVERY_UNCONFIGURED,
  LIMITS,
  clientIp,
  handleRecoverRequest,
  hit,
  normalizeEmail,
  resetRecoveryLimits,
} from "./recover.server";
import { mintKeyFromPaid } from "./license.server";

const saved = { ...process.env };
const realFetch = globalThis.fetch;

function session(over: Record<string, unknown> = {}, meta: Record<string, string> = {}) {
  return {
    id: "cs_test_recover_1",
    payment_status: "paid",
    currency: "usd",
    amount_total: 7900,
    amount_subtotal: 7900,
    customer_details: { email: "buyer@example.com", name: "Pat Buyer" },
    metadata: { product: "firstpass", plan: "lab", interval: "life", issued: "life", ...meta },
    ...over,
  } as any;
}

function fakeStripe(rows: any[], opts: { throws?: boolean } = {}) {
  const calls: any[] = [];
  const stripe = {
    checkout: {
      sessions: {
        list: async (params: any) => {
          calls.push(params);
          if (opts.throws) throw new Error("stripe down");
          const want = params.customer_details?.email;
          return {
            data: rows.filter((r) => (r.customer_details?.email || "").toLowerCase() === want),
            has_more: false,
          };
        },
      },
    },
  } as unknown as Stripe;
  return { stripe, calls };
}

let mails: Array<{ headers: Record<string, string>; body: any }> = [];
function mockResend(ok = true) {
  mails = [];
  globalThis.fetch = (async (_url: any, init: any) => {
    mails.push({ headers: init.headers, body: JSON.parse(init.body) });
    return new Response("{}", { status: ok ? 200 : 500 });
  }) as typeof fetch;
}

function req(email: unknown, ip = "203.0.113.7") {
  return new Request("https://desk.test/api/license/recover", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  process.env.RESEND_API_KEY = "re_test_placeholder";
  resetRecoveryLimits();
  mockResend(true);
});
afterEach(() => {
  process.env = { ...saved };
  globalThis.fetch = realFetch;
});

describe("lost-key recovery", () => {
  it("re-sends the existing derived key to the matching email only", async () => {
    const { stripe } = fakeStripe([session()]);
    const res = await handleRecoverRequest(req("  Buyer@Example.com "), { stripe });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).message, RECOVERY_GENERIC);
    assert.equal(mails.length, 1);
    assert.deepEqual(mails[0]!.body.to, ["buyer@example.com"]);
    assert.ok(mails[0]!.body.text.includes(mintKeyFromPaid("life", "cs_test_recover_1")));
    assert.match(mails[0]!.headers["Idempotency-Key"]!, /^fp-recover-cs_test_recover_1-\d+$/);
  });

  it("prefers the key already stamped on the session", async () => {
    const stamped = mintKeyFromPaid("life", "cs_other");
    const { stripe } = fakeStripe([session({}, { license_key: stamped })]);
    await handleRecoverRequest(req("buyer@example.com"), { stripe });
    assert.ok(mails[0]!.body.text.includes(stamped));
  });

  it("gives the identical answer when no purchase matches, and sends nothing", async () => {
    const { stripe } = fakeStripe([session()]);
    const res = await handleRecoverRequest(req("stranger@example.com"), { stripe });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).message, RECOVERY_GENERIC);
    assert.equal(mails.length, 0);
  });

  it("ignores unpaid, non-Founding, wrong-price and foreign-product sessions", async () => {
    const { stripe } = fakeStripe([
      session({ id: "cs_a", payment_status: "unpaid" }),
      session({ id: "cs_b", amount_total: 9900, amount_subtotal: 9900 }, { plan: "pro", interval: "year", issued: "pro" }),
      session({ id: "cs_c", amount_total: 100, amount_subtotal: 100 }),
      session({ id: "cs_d" }, { product: "other" }),
    ]);
    const res = await handleRecoverRequest(req("buyer@example.com"), { stripe });
    assert.equal(res.status, 200);
    assert.equal(mails.length, 0);
  });

  it("hides Stripe errors behind the generic answer", async () => {
    const { stripe } = fakeStripe([], { throws: true });
    const res = await handleRecoverRequest(req("buyer@example.com"), { stripe });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).message, RECOVERY_GENERIC);
  });

  it("returns 503 with a friendly message when Stripe or Resend is unconfigured", async () => {
    delete process.env.RESEND_API_KEY;
    let res = await handleRecoverRequest(req("buyer@example.com"), { stripe: fakeStripe([]).stripe });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).message, RECOVERY_UNCONFIGURED);
    process.env.RESEND_API_KEY = "re_test_placeholder";
    delete process.env.STRIPE_SECRET_KEY;
    res = await handleRecoverRequest(req("buyer@example.com"));
    assert.equal(res.status, 503);
  });

  it("rejects malformed emails with 400", async () => {
    for (const bad of ["", "nope", 42, null, "a@b"]) {
      const res = await handleRecoverRequest(req(bad), { stripe: fakeStripe([]).stripe });
      assert.equal(res.status, 400);
    }
  });

  it("rate limits per email across IPs", async () => {
    const { stripe } = fakeStripe([]);
    for (let i = 0; i < LIMITS.email.max; i += 1) {
      const r = await handleRecoverRequest(req("buyer@example.com", `198.51.100.${i}`), { stripe });
      assert.equal(r.status, 200);
    }
    const r = await handleRecoverRequest(req("buyer@example.com", "198.51.100.99"), { stripe });
    assert.equal(r.status, 429);
    assert.equal((await r.json()).message, RECOVERY_LIMITED);
  });

  it("rate limits per IP across emails", async () => {
    const { stripe } = fakeStripe([]);
    for (let i = 0; i < LIMITS.ip.max; i += 1) {
      assert.equal((await handleRecoverRequest(req(`u${i}@example.com`), { stripe })).status, 200);
    }
    assert.equal((await handleRecoverRequest(req("z@example.com"), { stripe })).status, 429);
  });

  it("sliding window frees up after it expires", () => {
    assert.equal(hit("t", 1, 1000, 0), true);
    assert.equal(hit("t", 1, 1000, 500), false);
    assert.equal(hit("t", 1, 1000, 1500), true);
  });

  it("parses the client IP and normalizes emails", () => {
    assert.equal(clientIp(req("x@y.co", "192.0.2.1")), "192.0.2.1");
    assert.equal(normalizeEmail(" A@B.Co "), "a@b.co");
    assert.equal(normalizeEmail("bad"), null);
  });
});
