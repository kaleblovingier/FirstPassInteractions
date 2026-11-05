import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { publicAuthError, readPopupProviderId } from "./popup-input";

describe("popup provider id", () => {
  it("accepts registered providers and rejects anything else", () => {
    assert.equal(readPopupProviderId("grok-google"), "grok-google");
    assert.equal(readPopupProviderId(" grok-x "), "grok-x");
    assert.equal(readPopupProviderId("google"), null);
    assert.equal(readPopupProviderId("grok-google<script>"), null);
    assert.equal(readPopupProviderId(""), null);
    assert.equal(readPopupProviderId(null), null);
  });
});

describe("publicAuthError", () => {
  it("keeps a short code and replaces text that must not be reflected", () => {
    assert.equal(publicAuthError("1"), "1");
    assert.equal(publicAuthError("oauth_init_failed_502"), "oauth_init_failed_502");
    assert.equal(publicAuthError("<script>alert(1)</script>"), "sign_in_failed");
    assert.equal(publicAuthError("not a code"), "sign_in_failed");
    assert.equal(publicAuthError(null), "sign_in_failed");
  });
});
