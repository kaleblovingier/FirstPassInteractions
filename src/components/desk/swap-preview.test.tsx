import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

/* The store persists to localStorage; give Node an in-memory one before it loads. */
const mem = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true, writable: true });
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true, writable: true });

const { useDesk } = await import("@/lib/drugs/store");
const { readHistory } = await import("@/lib/drugs/tray-history");
const { swapDiff, SWAP_COPY } = await import("@/lib/drugs/swap");
const { DEFAULT_HOST, SEVERITY_LABEL } = await import("@/lib/drugs/types");
const { SwapPreview, SwapResult } = await import("./swap-preview");

const TRAY = ["simvastatin", "clarithromycin", "amlodipine"];

describe("store swap", () => {
  beforeEach(() => {
    mem.clear();
    useDesk.setState({ selected: [...TRAY], doses: { simvastatin: "40 mg", clarithromycin: "500 mg" }, smoking: true });
  });

  it("replaces in place, keeps person factors and other doses, and drops the old item's dose", () => {
    assert.equal(useDesk.getState().swap("clarithromycin", "azithromycin"), true);
    const s = useDesk.getState();
    assert.deepEqual(s.selected, ["simvastatin", "azithromycin", "amlodipine"]);
    assert.deepEqual(s.doses, { simvastatin: "40 mg" });
    assert.equal(s.smoking, true);
  });

  it("saves the old tray to recent trays so it can come back", () => {
    useDesk.getState().swap("clarithromycin", "azithromycin");
    const h = readHistory();
    assert.deepEqual(h.recent[0]?.ids, TRAY);
    assert.deepEqual(h.undo?.ids, TRAY);
  });

  it("refuses a swap that would duplicate or miss an item, leaving the tray alone", () => {
    assert.equal(useDesk.getState().swap("clarithromycin", "simvastatin"), false);
    assert.equal(useDesk.getState().swap("warfarin", "azithromycin"), false);
    assert.deepEqual(useDesk.getState().selected, TRAY);
    assert.equal(readHistory().recent.length, 0);
  });
});

describe("swap panel", () => {
  it("shows what leaves the list with the engine's own grade words", () => {
    const diff = swapDiff(TRAY, DEFAULT_HOST, "clarithromycin", "azithromycin");
    assert.ok(diff);
    const html = renderToStaticMarkup(<SwapResult diff={diff} outId="clarithromycin" inId="azithromycin" />);
    assert.match(html, /Would leave the list \(\d+\)/);
    assert.match(html, /with Azithromycin in place of Clarithromycin/);
    for (const f of diff.gone) assert.ok(html.includes(SEVERITY_LABEL[f.severity]));
    assert.ok(html.includes(SEVERITY_LABEL[diff.before.highest]));
  });

  it("says an unchanged list is not a clearance", () => {
    const real = swapDiff(TRAY, DEFAULT_HOST, "clarithromycin", "azithromycin");
    assert.ok(real);
    const diff = { ...real, gone: [], added: [], regraded: [] };
    const html = renderToStaticMarkup(<SwapResult diff={diff} outId="clarithromycin" inId="azithromycin" />);
    assert.ok(html.includes(SWAP_COPY.quiet));
    assert.doesNotMatch(html, /Would leave the list/);
  });

  it("renders the teaching caveat with the picker", () => {
    const html = renderToStaticMarkup(<SwapPreview ids={TRAY} host={DEFAULT_HOST} amounts={{}} />);
    assert.ok(html.includes(SWAP_COPY.caveat.replace(/'/g, "&#x27;")));
    assert.match(html, /Take off/);
    assert.match(html, /Put on instead/);
  });

  it("the desk shows the panel only on trays of two or more", () => {
    const app = readFileSync(new URL("./app.tsx", import.meta.url), "utf8");
    assert.equal(app.match(/<SwapPreview /g)?.length, 1);
    const multi = app.indexOf("<SwapPreview ");
    const single = app.indexOf("<SingleDrug id=");
    assert.ok(single > 0 && multi > single, "panel sits in the multi-item branch");
  });
});
