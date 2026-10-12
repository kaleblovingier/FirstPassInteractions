import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkPaypalOrder, claimPaypalOrder, createPaypalOrder, paypalMode } from "./paypal.server";
import { verifyKey } from "./license.server";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

function done(over: Record<string, unknown> = {}, amount = "79.00", currency = "USD") {
  return {
    id: "5O190127TN364715T",
    status: "COMPLETED",
    payer: { email_address: "buyer@example.com", name: { given_name: "Pat" } },
    purchase_units: [
      {
        custom_id: "firstpass:life",
        payments: { captures: [{ status: "COMPLETED", amount: { currency_code: currency, value: amount } }] },
      },
    ],
    ...over,
  };
}

type Call = { url: string; method: string };
function router(handlers: Record<string, () => Response>) {
  const calls: Call[] = [];
  const f = (async (url: any, init: any = {}) => {
    const method = init.method ?? "GET";
    calls.push({ url: String(url), method });
    if (String(url).includes("/oauth2/token")) {
      return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
    }
    for (const [k, h] of Object.entries(handlers)) if (`${method} ${url}`.includes(k)) return h();
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { f, calls };
}

describe("paypal rail (flag-gated)", () => {
  it("is off unless both client id and secret are set; sandbox unless PAYPAL_ENV=live", () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    assert.equal(paypalMode(), "off");
    process.env.PAYPAL_CLIENT_ID = "id";
    assert.equal(paypalMode(), "off");
    process.env.PAYPAL_CLIENT_SECRET = "secret";
    assert.equal(paypalMode(), "sandbox");
    process.env.PAYPAL_ENV = "live";
    assert.equal(paypalMode(), "live");
  });

  it("off means no network and a plain refusal", async () => {
    delete process.env.PAYPAL_CLIENT_ID;
    const { f, calls } = router({});
    const a = await createPaypalOrder(f);
    const b = await claimPaypalOrder("5O190127TN364715T", f);
    assert.equal(a.ok, false);
    assert.equal(b.ok, false);
    assert.equal(calls.length, 0);
  });

  it("checkPaypalOrder demands completed, ours, USD, and exactly $79", () => {
    assert.equal(checkPaypalOrder(done()).ok, true);
    assert.equal(checkPaypalOrder(done({ status: "APPROVED" })).ok, false);
    assert.equal(checkPaypalOrder(done({}, "1.00")).ok, false);
    assert.equal(checkPaypalOrder(done({}, "79.00", "EUR")).ok, false);
    const foreign = done();
    foreign.purchase_units[0].custom_id = "other";
    assert.equal(checkPaypalOrder(foreign).ok, false);
    assert.equal(checkPaypalOrder(null).ok, false);
  });

  it("claim captures, mints a verifiable key, and gives the same key on a refresh", async () => {
    process.env.PAYPAL_CLIENT_ID = "id";
    process.env.PAYPAL_CLIENT_SECRET = "secret";
    delete process.env.RESEND_API_KEY;
    const first = router({ "POST https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T/capture": () => new Response(JSON.stringify(done()), { status: 201 }) });
    const a = await claimPaypalOrder("5O190127TN364715T", first.f);
    assert.equal(a.ok, true);
    if (!a.ok) return;
    assert.match(a.key, /^FP-LIFE-/);
    assert.equal(verifyKey(a.key).ok, true);
    // Refresh: capture answers 422 already-captured, so we read the order instead.
    const again = router({
      "/capture": () => new Response("{}", { status: 422 }),
      "GET https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T": () => new Response(JSON.stringify(done()), { status: 200 }),
    });
    const b = await claimPaypalOrder("5O190127TN364715T", again.f);
    assert.equal(b.ok && b.key === a.key, true);
  });

  it("claim never mints for an unapproved or underpaid order, or a junk id", async () => {
    process.env.PAYPAL_CLIENT_ID = "id";
    process.env.PAYPAL_CLIENT_SECRET = "secret";
    const unapproved = router({
      "/capture": () => new Response("{}", { status: 422 }),
      "GET https://api-m.sandbox.paypal.com/v2/checkout/orders/": () => new Response(JSON.stringify({ status: "CREATED" }), { status: 200 }),
    });
    assert.equal((await claimPaypalOrder("5O190127TN364715T", unapproved.f)).ok, false);
    const cheap = router({ "/capture": () => new Response(JSON.stringify(done({}, "1.00")), { status: 201 }) });
    assert.equal((await claimPaypalOrder("5O190127TN364715T", cheap.f)).ok, false);
    assert.equal((await claimPaypalOrder("../../etc", cheap.f)).ok, false);
  });
});
