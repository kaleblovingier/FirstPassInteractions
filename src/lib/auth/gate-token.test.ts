import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readGateIdentityToken } from "./gate-token";

const TOKEN = "eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJ1c2VyLTEifQ.sigvalue";

describe("readGateIdentityToken", () => {
  it("accepts a compact JWS and rejects other shapes", () => {
    assert.equal(readGateIdentityToken(` ${TOKEN} `), TOKEN);
    assert.equal(readGateIdentityToken(TOKEN), TOKEN);
    for (const raw of [null, undefined, "", "not-a-jwt", `${TOKEN}.extra`, `line\n${TOKEN}`, "a".repeat(20_000)]) {
      assert.equal(readGateIdentityToken(raw), null);
    }
  });
});
