import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./engine.ts";
import { harmOnDesk, stripsFor } from "./harm.ts";
import { mmeForDesk } from "./mme.ts";
import {
  NPS_HHC_IDS,
  NPS_ORPHINE_IDS,
  NPS_WATCH,
  npsByFamily,
} from "./nps-watch.ts";
import { guessLastAgonist } from "./otp.ts";
import { reversalOnDesk } from "./reversal.ts";
import { toSeverityTier } from "./types.ts";
import { udsForDesk } from "./uds.ts";

const ORPHINE_IDS = [...NPS_ORPHINE_IDS];
const MONITORED_NITAZENE_IDS = npsByFamily("nitazene").map((e) => e.id);
const MONITORED_DESIGNER_BENZO_IDS = npsByFamily("designer-benzo").map((e) => e.id);
const HHC_IDS = [...NPS_HHC_IDS];

test("every single one of the 27 NPS_WATCH compounds returns a UDS immunoassay card via udsForDesk", () => {
  assert.equal(NPS_WATCH.length, 27);
  for (const entry of NPS_WATCH) {
    const cards = udsForDesk([entry.id]);
    assert.equal(cards.length, 1, `expected 1 UDS card for ${entry.id}, got ${cards.length}`);
    const card = cards[0]!;
    assert.equal(card.id, entry.id);
    assert.ok(card.pearl.length > 20, `UDS pearl too short for ${entry.id}`);
    assert.ok(card.hits.length >= 1, `expected UDS hits for ${entry.id}`);
  }
});

test("harmOnDesk returns the family-specific danger/warn cards for all 7 orphines, 8 monitored nitazenes, 4 monitored designer benzos, and 4 HHC compounds", () => {
  assert.equal(ORPHINE_IDS.length, 7);
  for (const id of ORPHINE_IDS) {
    const cards = harmOnDesk([id]);
    const orphineCard = cards.find(
      (c) =>
        c.title ===
        "Orphine synthetic opioids — non-fentanyl MOR apnea, hERG QTc signal & FTS blind spot",
    );
    assert.ok(orphineCard, `missing Orphine harm card for ${id}`);
    assert.equal(orphineCard.tone, "danger");
    assert.match(orphineCard.body, /SR-17018/);
    assert.match(orphineCard.body, /hERG/);
    const strips = stripsFor([id]);
    assert.ok(
      strips.some((s) => s.id === "orphine-strip"),
      `missing orphine strip guidance for ${id}`,
    );
  }

  assert.equal(MONITORED_NITAZENE_IDS.length, 8);
  for (const id of MONITORED_NITAZENE_IDS) {
    const cards = harmOnDesk([id]);
    const nitazeneCard = cards.find(
      (c) => c.title === "Nitazene / carfentanil — naloxone, then a long watch",
    );
    assert.ok(nitazeneCard, `missing Nitazene harm card for ${id}`);
    assert.equal(nitazeneCard.tone, "danger");
    const strips = stripsFor([id]);
    assert.ok(
      strips.some((s) => s.id === "nts"),
      `missing nitazene strip (nts) guidance for ${id}`,
    );
  }

  assert.equal(MONITORED_DESIGNER_BENZO_IDS.length, 4);
  for (const id of MONITORED_DESIGNER_BENZO_IDS) {
    const cards = harmOnDesk([id]);
    const benzoCard = cards.find(
      (c) =>
        c.title ===
        "Illicit designer benzodiazepines — naloxone-resistant coma, prolonged half-life & severe withdrawal",
    );
    assert.ok(benzoCard, `missing Designer Benzo harm card for ${id}`);
    assert.equal(benzoCard.tone, "danger");
    const strips = stripsFor([id]);
    assert.ok(
      strips.some((s) => s.id === "bts"),
      `missing benzo strip (bts) guidance for ${id}`,
    );
  }

  assert.equal(HHC_IDS.length, 4);
  for (const id of HHC_IDS) {
    const cards = harmOnDesk([id]);
    const hhcCard = cards.find(
      (c) =>
        c.title ===
        "Semi-synthetic HHC cannabinoids — (9R)/(9S) epimer potency, CYP2C9/3A4 bottleneck & HHC-O ketene hazard",
    );
    assert.ok(hhcCard, `missing HHC harm card for ${id}`);
    assert.equal(hhcCard.tone, "warn");
    assert.match(hhcCard.body, /ketene/i);
  }
});

test("reversalOnDesk triggers Naloxone for all 7 orphines and 8 monitored nitazenes, and Flumazenil warning for all 4 monitored designer benzos", () => {
  for (const id of [...ORPHINE_IDS, ...MONITORED_NITAZENE_IDS]) {
    const rows = reversalOnDesk([id]);
    assert.ok(
      rows.some((r) => r.card.agent === "Naloxone" && r.card.kind === "antidote"),
      `missing Naloxone reversal card for ${id}`,
    );
  }

  for (const id of MONITORED_DESIGNER_BENZO_IDS) {
    const rows = reversalOnDesk([id]);
    assert.ok(
      rows.some((r) => r.card.agent.startsWith("Flumazenil")),
      `missing Flumazenil warning card for ${id}`,
    );
  }

  for (const id of ["medetomidine", "dck", "two-fdck"]) {
    const rows = reversalOnDesk([id]);
    assert.ok(
      rows.some((r) => r.card.kind === "will-not"),
      `missing non-reversible card for ${id}`,
    );
  }
});

test("guessLastAgonist in otp.ts returns 'fentanyl' for all 7 orphines and 8 monitored nitazenes", () => {
  for (const id of [...ORPHINE_IDS, ...MONITORED_NITAZENE_IDS]) {
    assert.equal(
      guessLastAgonist([id]),
      "fentanyl",
      `expected guessLastAgonist([${id}]) to return 'fentanyl'`,
    );
  }
});

test("mmeForDesk in mme.ts marks all 7 orphines and 8 monitored nitazenes as unconvertible (factor: null)", () => {
  for (const id of [...ORPHINE_IDS, ...MONITORED_NITAZENE_IDS]) {
    const rows = mmeForDesk([id]);
    assert.equal(rows.length, 1, `expected 1 MME row for ${id}`);
    assert.equal(rows[0]!.factor, null, `expected factor: null for ${id}`);
    assert.equal(rows[0]!.unconvertible, true, `expected unconvertible: true for ${id}`);
  }
});

test("analyze buprenorphine with cychlorphine, sr-17018, or protonitazepyne produces a danger/major precipitated-withdrawal finding", () => {
  for (const agonist of ["cychlorphine", "sr-17018", "protonitazepyne"]) {
    const report = analyze(["buprenorphine", agonist]);
    const precip = report.findings.find((f) => f.id.endsWith("__pd-bup-precip"));
    assert.ok(precip, `expected precipitated-withdrawal finding for buprenorphine + ${agonist}`);
    assert.equal(precip.effect, "precipitated withdrawal");
    assert.equal(precip.severity, "major");
    assert.equal(toSeverityTier(precip.severity), "Severe");
  }
});
