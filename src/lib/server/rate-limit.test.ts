import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { SHARED_CLIENT, SlidingWindow, addressKey, clientKey } from "./rate-limit";

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

  it("stays full under a flood of hits and empties once the latest ones age out", () => {
    const w = new SlidingWindow(3, 1_000);
    for (let t = 0; t < 10_000; t += 1) w.hit("a", t);
    assert.equal(w.full("a", 10_000), true);
    assert.equal(w.full("a", 10_998), false, "only hits inside the window count");
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

describe("clientKey", () => {
  const vercel = process.env.VERCEL;
  afterEach(() => {
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
  });
  const req = (headers: Record<string, string>) => new Request("https://desk.test/", { headers });
  const spoofed = { "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1", "x-vercel-forwarded-for": "192.0.2.1" };

  it("ignores client-supplied address headers off Vercel: every caller shares one key", () => {
    delete process.env.VERCEL;
    assert.equal(clientKey(req(spoofed)), SHARED_CLIENT);
    assert.equal(clientKey(req({ "x-real-ip": "192.0.2.77" })), SHARED_CLIENT);
    assert.equal(clientKey(), SHARED_CLIENT);
  });

  it("on Vercel reads x-real-ip, then the first forwarded hop, else the shared key", () => {
    process.env.VERCEL = "1";
    assert.equal(clientKey(req(spoofed)), "203.0.113.9");
    assert.equal(clientKey(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })), "198.51.100.1");
    assert.equal(clientKey(req({ "x-vercel-forwarded-for": "192.0.2.1" })), SHARED_CLIENT);
    assert.equal(clientKey(req({})), SHARED_CLIENT);
    assert.equal(clientKey(), SHARED_CLIENT, "outside a request");
    assert.equal(clientKey(req({ "x-real-ip": "2001:db8:aa:bb:1:2:3:4" })), "2001:db8:aa:bb::/64");
  });
});

describe("addressKey", () => {
  it("keeps IPv4 whole and cuts IPv6 to its /64, however it is written", () => {
    assert.equal(addressKey("203.0.113.9"), "203.0.113.9");
    assert.equal(addressKey("::ffff:203.0.113.9"), "203.0.113.9");
    const block = "2001:db8:1:2::/64";
    assert.equal(addressKey("2001:db8:1:2:aaaa::1"), block);
    assert.equal(addressKey("2001:0DB8:0001:0002:ffff:ffff:ffff:ffff"), block);
    assert.equal(addressKey("2001:db8:1:2::"), block);
    assert.equal(addressKey("2001:db8:1:3::1"), "2001:db8:1:3::/64", "the next /64 is another client");
    assert.equal(addressKey("2001:db8::1"), "2001:db8:0:0::/64");
    assert.equal(addressKey("::1"), "0:0:0:0::/64");
    assert.equal(addressKey("fe80::1%eth0"), "fe80:0:0:0::/64");
  });
});
