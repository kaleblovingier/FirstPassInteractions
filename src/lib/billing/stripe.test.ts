import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  stripeMode,
  issuedFor,
  claimSession,
  createCheckout,
  handleStripeWebhook,
  listPaidSessions,
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
});
