import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

/* The desk store persists to localStorage. Node has none, so give it an in-memory one first. */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  },
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true, writable: true });

const { Paywall } = await import("./paywall");

describe("Paywall", () => {
  it("stacks the card and the preview in one grid cell, so a short preview cannot cut the card off", () => {
    const html = renderToStaticMarkup(
      <Paywall gate="host">
        <p>preview</p>
      </Paywall>,
    );
    assert.doesNotMatch(html, /absolute inset-0/);
    const root = html.match(/^<div data-testid="paywall" class="([^"]+)"/);
    assert.ok(root, "paywall root");
    assert.match(root[1], /\bgrid\b/);
    const layers = [...html.matchAll(/class="[^"]*col-start-1 row-start-1[^"]*"/g)];
    assert.equal(layers.length, 2);
    assert.match(html, /aria-hidden="true" inert="">\s*<p>preview<\/p>/);
  });
});
