import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SlidingWindow, clientIp } from "./rate-limit";

describe("SlidingWindow", () => {
  it("allows max hits per key in the window, then refuses until the oldest hit ages out", () => {
    const w = new SlidingWindow(2, 1_000);
    assert.equal(w.take("a", 0), true);
    assert.equal(w.take("a", 100), true);
    assert.equal(w.take("a", 200), false);
    assert.equal(w.full("a", 999), true);
    assert.equal(w.take("b", 200), true, "keys are counted separately");
    assert.equal(w.take("a", 1_000), true, "the hit at t=0 has left the window");
    assert.equal(w.take("a", 1_050), false);
  });

  it("does not count refused takes", () => {
    const w = new SlidingWindow(1, 1_000);
    assert.equal(w.take("a", 0), true);
    for (let t = 1; t < 10; t += 1) assert.equal(w.take("a", t), false);
    assert.equal(w.take("a", 1_000), true);
  });

  it("forgets the least recent keys past maxKeys instead of growing", () => {
    const w = new SlidingWindow(1, 60_000, 2);
    const now = Date.now();
    w.hit("a", now);
    w.hit("b", now);
    w.hit("c", now);
    assert.equal(w.full("a", now), false, "a was evicted");
    assert.equal(w.full("c", now), true);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("https://desk.test/", { headers });

  it("prefers Vercel's forwarded-for, takes the first hop, and falls back to unknown", () => {
    assert.equal(clientIp(req({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "198.51.100.1" })), "203.0.113.9");
    assert.equal(clientIp(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })), "198.51.100.1");
    assert.equal(clientIp(req({ "x-real-ip": "192.0.2.4" })), "192.0.2.4");
    assert.equal(clientIp(req({})), "unknown");
  });

  it("answers unknown outside a request instead of throwing", () => {
    assert.equal(clientIp(), "unknown");
  });
});
