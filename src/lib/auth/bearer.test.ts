import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptBearerToken } from "./bearer";

describe("acceptBearerToken", () => {
  it("forwards a visible-ascii preview token and treats absence as no token", () => {
    assert.deepEqual(acceptBearerToken(undefined), { ok: true });
    assert.deepEqual(acceptBearerToken(null), { ok: true });
    assert.deepEqual(acceptBearerToken(""), { ok: true });
    const token = "preview.session.token_ABC-123";
    assert.deepEqual(acceptBearerToken(token), { ok: true, token });
  });

  it("rejects non-strings, whitespace, header breaks and oversized values", () => {
    for (const value of [1, { token: "abc" }, ["abc"], "has space", "line\nbreak", "cr\r", "x".repeat(4_097)]) {
      assert.deepEqual(acceptBearerToken(value), { ok: false });
    }
  });
});
