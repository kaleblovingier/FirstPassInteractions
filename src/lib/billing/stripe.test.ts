import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  stripeMode,
  issuedFor,
  claimSession,
  createCheckout,
  handleStripeWebhook,
  listPaidSessions,
  validatePaidSession,
} from "./stripe.server";
import {
  mintKeyFromPaid,
  verifyKey,
} from "./license.server";
import { priceFor } from "./plans";

describe("stripe billing functionality", () => {
  it("stripeMode correctly identifies test, live, and off states", () => {
    // Current environment without STRIPE_SECRET_KEY set returns 'off'
    const mode = stripeMode();
    assert.ok(mode === "off" || mode === "test" || mode === "live");
  });

  it("issuedFor routes plans and intervals accurately", () => {
    // Any plan with lifetime interval receives 'life' (Founding)
    assert.equal(issuedFor("pro", "life"), "life");
    assert.equal(issuedFor("lab", "life"), "life");
    assert.equal(issuedFor("free", "life"), "life");

    // Lab plan with year/month receives 'lab'
    assert.equal(issuedFor("lab", "year"), "lab");
    assert.equal(issuedFor("lab", "month"), "lab");

    // Pro plan with year/month receives 'pro'
    assert.equal(issuedFor("pro", "year"), "pro");
    assert.equal(issuedFor("pro", "month"), "pro");
  });

  it("plans pricing returns positive dollar amounts for paid tiers", () => {
    assert.equal(priceFor("free", "month"), 0);
    assert.equal(priceFor("pro", "month"), 12);
    assert.equal(priceFor("pro", "year"), 99);
    assert.equal(priceFor("pro", "life"), 79); // Founding lifetime
    assert.equal(priceFor("lab", "month"), 29);
    assert.equal(priceFor("lab", "year"), 249);
    assert.equal(priceFor("lab", "life"), 79);
  });

  it("mintKeyFromPaid deterministically mints valid, cryptographically verifiable keys", () => {
    const sessionId = "cs_test_a1b2c3d4e5f6g7h8";
    
    // Determinism: calling multiple times with the same session yields the exact same key
    const key1 = mintKeyFromPaid("life", sessionId);
    const key2 = mintKeyFromPaid("life", sessionId);
    assert.equal(key1, key2);

    // Format: FP-LIFE-8HEX-8HEX
    assert.match(key1, /^FP-LIFE-[0-9A-F]{8}-[0-9A-F]{8}$/);

    // Cryptographic verification
    const verified = verifyKey(key1);
    assert.equal(verified.ok, true);
    assert.equal(verified.lifetime, true);
    assert.equal(verified.plan, "lab"); // Life unlocks lab features
    assert.equal(verified.license, key1);

    // Different session ID yields distinct key
    const otherKey = mintKeyFromPaid("life", "cs_test_different_session_999");
    assert.notEqual(key1, otherKey);

    // Tampering fails verification
    const tampered = key1.slice(0, -1) + (key1.endsWith("A") ? "B" : "A");
    const badVerify = verifyKey(tampered);
    assert.equal(badVerify.ok, false);
    assert.match(badVerify.reason ?? "", /Signature does not verify/);
  });

  it("mintKeyFromPaid handles pro and lab issued plans correctly", () => {
    const proKey = mintKeyFromPaid("pro", "cs_test_pro_123");
    assert.match(proKey, /^FP-PRO-[0-9A-F]{8}-[0-9A-F]{8}$/);
    const proVer = verifyKey(proKey);
    assert.equal(proVer.ok, true);
    assert.equal(proVer.plan, "pro");
    assert.equal(proVer.lifetime, false);

    const labKey = mintKeyFromPaid("lab", "cs_test_lab_456");
    assert.match(labKey, /^FP-LAB-[0-9A-F]{8}-[0-9A-F]{8}$/);
    const labVer = verifyKey(labKey);
    assert.equal(labVer.ok, true);
    assert.equal(labVer.plan, "lab");
    assert.equal(labVer.lifetime, false);
  });

  it("claimSession rejects invalid or malformed session IDs", async () => {
    // Non-Stripe session ID
    const res1 = await claimSession("invalid_session_id");
    assert.equal(res1.ok, false);
    assert.equal(res1.reason, "Not a Stripe session.");

    const res2 = await claimSession("  ");
    assert.equal(res2.ok, false);
    assert.equal(res2.reason, "Not a Stripe session.");
  });

  it("createCheckout guards against unconfigured environment and zero-dollar plans", async () => {
    // Free plan check
    const freeRes = await createCheckout("free", "month");
    assert.equal(freeRes.ok, false);
    // Either "Card checkout is not live on this desk yet." (if no key) or "That license is free."
    assert.ok(
      freeRes.reason === "Card checkout is not live on this desk yet." ||
      freeRes.reason === "That license is free.",
    );
  });

  it("handleStripeWebhook requires proper configuration and signature", async () => {
    // Request with no signature
    const reqNoSig = new Request("http://localhost:8080/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const resNoSig = await handleStripeWebhook(reqNoSig);
    // When STRIPE_WEBHOOK_SECRET is unconfigured -> 503, or missing signature -> 400
    assert.ok(resNoSig.status === 503 || resNoSig.status === 400);

    // Request with bad signature
    const reqBadSig = new Request("http://localhost:8080/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=12345,v1=bad_signature" },
      body: JSON.stringify({ type: "checkout.session.completed" }),
    });

    const resBadSig = await handleStripeWebhook(reqBadSig);
    assert.ok(resBadSig.status === 503 || resBadSig.status === 400);
  });

  it("listPaidSessions fails gracefully when Stripe is unconfigured", async () => {
    const res = await listPaidSessions();
    if (!process.env.STRIPE_SECRET_KEY) {
      assert.equal(res.ok, false);
      assert.equal(res.reason, "Stripe is not live on this desk yet.");
    }
  });

  describe("validatePaidSession", () => {
    const validSession = {
      id: "cs_test_valid_123",
      payment_status: "paid",
      currency: "usd",
      amount_total: 7900,
      metadata: {
        product: "firstpass",
        plan: "lab",
        interval: "life",
      },
    };

    it("accepts a valid paid session with or without matching expected price", () => {
      const resWithoutPrice = validatePaidSession(validSession);
      assert.equal(resWithoutPrice.ok, true);
      if (resWithoutPrice.ok) {
        assert.equal(resWithoutPrice.plan, "lab");
        assert.equal(resWithoutPrice.interval, "life");
        assert.equal(resWithoutPrice.issued, "life");
      }

      const resWithPrice = validatePaidSession(validSession, 7900);
      assert.equal(resWithPrice.ok, true);

      // Uppercase currency (e.g. USD) should be accepted case-insensitively
      const resUpperCurrency = validatePaidSession({ ...validSession, currency: "USD" });
      assert.equal(resUpperCurrency.ok, true);

      // Pro plan with monthly interval
      const proSession = {
        ...validSession,
        amount_total: 1200,
        metadata: { product: "firstpass", plan: "pro", interval: "month" },
      };
      const resPro = validatePaidSession(proSession, 1200);
      assert.equal(resPro.ok, true);
      if (resPro.ok) {
        assert.equal(resPro.plan, "pro");
        assert.equal(resPro.interval, "month");
        assert.equal(resPro.issued, "pro");
      }
    });

    it("rejects amount mismatch when expectedPriceCents is provided", () => {
      const resMismatch = validatePaidSession(validSession, 9900);
      assert.equal(resMismatch.ok, false);
      assert.match(resMismatch.reason ?? "", /Amount mismatch/);

      const resDifferentAmount = validatePaidSession({ ...validSession, amount_total: 5000 }, 7900);
      assert.equal(resDifferentAmount.ok, false);
      assert.match(resDifferentAmount.reason ?? "", /Amount mismatch/);
    });

    it("rejects sessions with wrong currency", () => {
      const resEur = validatePaidSession({ ...validSession, currency: "eur" });
      assert.equal(resEur.ok, false);
      assert.match(resEur.reason ?? "", /USD/);

      const resEmpty = validatePaidSession({ ...validSession, currency: "" });
      assert.equal(resEmpty.ok, false);

      const resNull = validatePaidSession({ ...validSession, currency: null });
      assert.equal(resNull.ok, false);
    });

    it("rejects sessions with wrong product metadata", () => {
      const resWrongProduct = validatePaidSession({
        ...validSession,
        metadata: { ...validSession.metadata, product: "not_firstpass" },
      });
      assert.equal(resWrongProduct.ok, false);
      assert.match(resWrongProduct.reason ?? "", /not a FirstPass license/);

      const resNoMeta = validatePaidSession({ ...validSession, metadata: undefined });
      assert.equal(resNoMeta.ok, false);
    });

    it("rejects sessions with unpaid status", () => {
      const resUnpaid = validatePaidSession({ ...validSession, payment_status: "unpaid" });
      assert.equal(resUnpaid.ok, false);
      assert.match(resUnpaid.reason ?? "", /Payment has not cleared/);

      const resNoPayment = validatePaidSession({ ...validSession, payment_status: "no_payment_required" });
      assert.equal(resNoPayment.ok, false);
    });

    it("rejects sessions with invalid plan or interval", () => {
      const resFreePlan = validatePaidSession({
        ...validSession,
        metadata: { ...validSession.metadata, plan: "free" },
      });
      assert.equal(resFreePlan.ok, false);
      assert.match(resFreePlan.reason ?? "", /Invalid plan/);

      const resInvalidPlan = validatePaidSession({
        ...validSession,
        metadata: { ...validSession.metadata, plan: "enterprise" },
      });
      assert.equal(resInvalidPlan.ok, false);
      assert.match(resInvalidPlan.reason ?? "", /Invalid plan/);

      const resInvalidInterval = validatePaidSession({
        ...validSession,
        metadata: { ...validSession.metadata, interval: "decade" },
      });
      assert.equal(resInvalidInterval.ok, false);
      assert.match(resInvalidInterval.reason ?? "", /Invalid interval/);
    });

    it("rejects null or non-object session input", () => {
      assert.equal(validatePaidSession(null).ok, false);
      assert.equal(validatePaidSession(undefined).ok, false);
      assert.equal(validatePaidSession("cs_test_123").ok, false);
    });
  });
});
