import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

/*
 * The desk store persists to window.localStorage under firstpass.desk.v7.
 * Node has no window, so give it an in-memory one before the store loads.
 */
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

const { DOSE_ATTEST_VERSION, doseAttested, useDesk } = await import("@/lib/drugs/store");
const { DOSE_ATTEST_LEAD, DOSE_ATTEST_TEXT, DoseGate } = await import("./dose-gate");
const { ClinicalBoard } = await import("./clinical");
const { DEFAULT_HOST } = await import("@/lib/drugs/types");

const KEY = "firstpass.desk.v7";
const board = readFileSync(new URL("./clinical.tsx", import.meta.url), "utf8");
const unescape = (html: string) => html.replaceAll("&#x27;", "'");

/** Every station that computes a patient-specific dose or infusion rate. */
const DOSE_STATIONS = [
  "AcidBasePanel",
  "AfPanel",
  "AminoglycosidesPanel",
  "AnesthesiaPanel",
  "AntiarrhythmicPanel",
  "AnticoagulationPanel",
  "AntimicrobialPanel",
  "DigoxinPanel",
  "DoacPanel",
  "EpilepsyPanel",
  "GlycemicPanel",
  "IronPanel",
  "MoudPanel",
  "PediatricPanel",
  "PhenobarbitalPanel",
  "PhenytoinPanel",
  "RotationPanel",
  "SteroidsPanel",
  "ToxicologyPanel",
  "ValproatePanel",
];
/** Dose blocks on the always-open Bedside panel. The first carries the gate; the rest wait on it. */
const BEDSIDE_DOSE_BLOCKS = ["SteroidEquivBlock", "GanzoniBlock", "DigoxinBlock", "PhenobarbitalBlock", "AminoglycosideBlock"];

beforeEach(() => {
  useDesk.setState(useDesk.getInitialState(), true);
  mem.clear();
});

describe("dose calculator attestation", () => {
  it("keeps Kaleb's wording, pinned to its version", () => {
    assert.equal(
      `${DOSE_ATTEST_LEAD} ${DOSE_ATTEST_TEXT}`,
      "Before using the dose calculators: I'm a licensed healthcare professional, or a health-professions student working under supervision. I won't use them for time-critical decisions. The Prescribing Information and my institution's protocols govern.",
    );
    assert.equal(DOSE_ATTEST_VERSION, 1, "Changed the wording? Bump DOSE_ATTEST_VERSION so every browser is asked again.");
  });

  it("stands in front of every dose calculator", () => {
    for (const p of DOSE_STATIONS) assert.match(board, new RegExp(`<DoseGate><${p} [^\\n]*/></DoseGate>`), p);
    assert.match(board, /<DoseGate><CalvertBlock [^\n]*\/><\/DoseGate>/);
    for (const b of BEDSIDE_DOSE_BLOCKS) assert.match(board, new RegExp(`\\{doseOk \\? <${b} [^\\n]*/> : null\\}`), b);
    // Nothing else is gated, so the list above is the whole list.
    assert.equal(board.match(/<DoseGate>/g)?.length, DOSE_STATIONS.length + 1);
    assert.equal(board.match(/\{doseOk \? /g)?.length, BEDSIDE_DOSE_BLOCKS.length);
  });

  it("shows the attestation and none of the calculator until confirmed", () => {
    const html = unescape(
      renderToStaticMarkup(
        <DoseGate>
          <label>
            Weight (kg)
            <input name="calc-weight" />
          </label>
        </DoseGate>,
      ),
    );
    assert.ok(html.includes(DOSE_ATTEST_LEAD));
    assert.ok(html.includes(DOSE_ATTEST_TEXT));
    assert.match(html, /<button[^>]*>Confirm<\/button>/);
    assert.match(html, /<button[^>]*>Not now<\/button>/);
    assert.ok(!html.includes("calc-weight"));
    assert.ok(!html.includes("<input"));
  });

  it("saves one confirmation with its version and time, and it opens every calculator after a reload", async () => {
    assert.equal(doseAttested(useDesk.getState()), false);
    const before = Date.now();
    useDesk.getState().attestDose();
    const saved = JSON.parse(mem.get(KEY) ?? "{}").state.doseAttest;
    assert.deepEqual(Object.keys(saved).sort(), ["at", "v"], "one record for every calculator, not one per station");
    assert.equal(saved.v, DOSE_ATTEST_VERSION);
    assert.ok(saved.at >= before && saved.at <= Date.now());

    // A fresh tab: memory starts empty, the browser still has what was saved.
    const raw = mem.get(KEY) ?? "";
    useDesk.setState(useDesk.getInitialState(), true);
    assert.equal(doseAttested(useDesk.getState()), false);
    mem.set(KEY, raw);
    await useDesk.persist.rehydrate();
    assert.equal(doseAttested(useDesk.getState()), true);
  });

  it("asks again after a version bump or a damaged record", async () => {
    for (const doseAttest of [{ v: DOSE_ATTEST_VERSION - 1, at: Date.now() }, { v: String(DOSE_ATTEST_VERSION) }, "yes", true, null]) {
      mem.set(KEY, JSON.stringify({ state: { doseAttest }, version: 0 }));
      await useDesk.persist.rehydrate();
      assert.equal(doseAttested(useDesk.getState()), false, JSON.stringify(doseAttest));
    }
    useDesk.getState().attestDose();
    assert.equal(JSON.parse(mem.get(KEY) ?? "{}").state.doseAttest.v, DOSE_ATTEST_VERSION);
  });

  it("leaves the other stations and the Bedside calculators open without it", () => {
    for (const p of ["OtpPanel", "QtPanel", "CypPanel", "DosePanel", "LevelsPanel", "OncologyPanel", "NeuropsychPanel", "ResourcePanel", "BedsidePanel"])
      assert.doesNotMatch(board, new RegExp(`<DoseGate><${p} `), p);
    for (const b of ["PhenytoinBlock", "BodyMetricsBlock", "AnionGapBlock", "CorrectedSodiumBlock", "ChildPughBlock", "VancoAucBlock", "LithiumBlock", "OsmolarGapBlock"])
      assert.doesNotMatch(board, new RegExp(`(<DoseGate>|doseOk \\? )<${b} `), b);

    // Never confirmed (or "Not now", which saves nothing): the board still opens its first station,
    // and the gated stations stay listed and free to open.
    const html = unescape(renderToStaticMarkup(<ClinicalBoard ids={["methadone"]} host={DEFAULT_HOST} />));
    assert.ok(html.includes("Clinical board"));
    assert.ok(!html.includes(DOSE_ATTEST_TEXT));
    assert.ok(html.includes("Opioid Rotation"));
    assert.equal(mem.get(KEY), undefined);
  });
});
