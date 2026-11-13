import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createNcbiGate } from "./ncbi-gate";
import { UpstreamError } from "./http";

function fake() {
  let t = 10_000;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    at: () => t,
  };
}

describe("ncbi-gate", () => {
  it("starts at most 3 requests in any one second, in order", async () => {
    const clock = fake();
    const gate = createNcbiGate({ now: clock.now, sleep: clock.sleep });
    const order: number[] = [];
    const starts: number[] = [];
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        gate.acquire("t").then(() => {
          order.push(i);
          starts.push(clock.at());
        }),
      ),
    );
    assert.deepEqual(order, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const s of starts) {
      assert.ok(starts.filter((x) => x >= s && x < s + 1000).length <= 3);
    }
  });

  it("fails fast as a timeout when the queue is too long, without blocking later callers", async () => {
    const clock = fake();
    const gate = createNcbiGate({ now: clock.now, sleep: clock.sleep, maxWaitMs: 1500 });
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => gate.acquire("ncbi.esearch")));
    const rejected = results.filter((r) => r.status === "rejected");
    assert.ok(rejected.length > 0 && rejected.length < 10);
    const first = rejected[0] as PromiseRejectedResult;
    assert.ok(first.reason instanceof UpstreamError && first.reason.kind === "timeout");
    await gate.acquire("later");
  });
});
