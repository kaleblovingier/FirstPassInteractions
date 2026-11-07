/**
 * Methadone with a CYP3A4-inhibiting antiretroviral (2026-11-07). No boosted HIV
 * row shows a CYP3A4 "higher methadone" card; rows the saved methadone label
 * names show the fall card, the rest a neutral card. Regenerate the doc:
 *   npx --yes tsx scripts/methadone-arv-arrow.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOC_PATH, collect, methadoneSection7, render } from "../../../scripts/methadone-arv-arrow.ts";
import { DRUGS, DRUG_BY_ID } from "./catalog";
import { analyze } from "./engine";
import {
  METHADONE_ARV,
  METHADONE_ARV_FALL,
  METHADONE_ARV_HIGHLIGHT,
  METHADONE_ARV_QUOTE,
  METHADONE_ARV_WITHDRAWAL,
} from "./methadone-antiretroviral";
import { briefWindow } from "./window";
import { DEFAULT_HOST, SEVERITY_RANK, type Finding } from "./types";

const IDS = Object.keys(METHADONE_ARV);
const pair = (a: string, b: string, host?: typeof DEFAULT_HOST): Finding[] =>
  analyze([a, b], host).findings.filter((f) => f.drugIds.includes(a) && f.drugIds.includes(b));
const suffix = (f: Finding) => f.id.split("__").pop() ?? f.id;

test("every listed row is in the catalog and carries a CYP3A4 inhibitor role", () => {
  for (const id of IDS) {
    const d = DRUG_BY_ID[id];
    assert.ok(d, id);
    assert.ok(d.enzymes.some((r) => r.enzyme === "CYP3A4" && r.kind === "inhibitor"), id);
  }
});

test("every ritonavir- or cobicistat-boosted row and every HIV protease inhibitor with a 3A4 inhibitor role is listed", () => {
  const boosted = DRUGS.filter(
    (d) =>
      d.enzymes.some((r) => r.enzyme === "CYP3A4" && r.kind === "inhibitor") &&
      (/ritonavir|cobicistat/i.test(`${d.id} ${d.name}`) ||
        /HIV protease inhibitor/i.test(d.cls) ||
        ["indinavir", "saquinavir", "nelfinavir"].includes(d.id)),
  ).map((d) => d.id);
  // Standalone cobicistat (Tybost) keeps its card and desk copy (see the doc's review notes).
  const missing = boosted.filter((id) => !METHADONE_ARV[id] && id !== "cobicistat");
  assert.deepEqual(missing, []);
  assert.equal(METHADONE_ARV.cobicistat, undefined);
});

test("label quotes are verbatim in the saved methadone label, and each fall row is named there", () => {
  const text = methadoneSection7();
  for (const q of [METHADONE_ARV_QUOTE, METHADONE_ARV_FALL, METHADONE_ARV_WITHDRAWAL, METHADONE_ARV_HIGHLIGHT]) {
    assert.ok(text.includes(q), q);
  }
  const listed = METHADONE_ARV_QUOTE.replace(/^.*such as /, "").replace(/, has resulted.*$/, "").replace(/\band /, "").split(/,\s*/);
  for (const [id, row] of Object.entries(METHADONE_ARV)) {
    if (row.arrow === "falls") {
      if (id === "paxlovid") assert.equal(row.labelName, undefined);
      else assert.ok(row.labelName && listed.includes(row.labelName), `${id}: ${row.labelName}`);
    } else {
      assert.equal(row.labelName, undefined, id);
    }
    assert.doesNotMatch(row.why, /\b\d+(\.\d+)?\s*(mg|mcg)\b/i, id);
  }
});

test("no listed row shows a CYP3A4 rise card, clock or phenoconversion line naming methadone", () => {
  for (const id of IDS) {
    for (const host of [DEFAULT_HOST, undefined]) {
      const fs = pair("methadone", id, host);
      const tag = `${id} ${host ? "host" : "no host"}`;
      assert.equal(fs.some((f) => /^pk-CYP3A4-inhibitor-/.test(suffix(f))), false, tag);
      assert.equal(fs.some((f) => f.effect.includes("↑ exposure")), false, tag);
      assert.equal(fs.some((f) => f.tags.includes("cyp-protocol")), false, tag);
      assert.equal(fs.some((f) => f.id.startsWith("pheno-CYP3A4-")), false, tag);
      assert.equal(fs.some((f) => /Methadone (rises|climbs)|Methadone: parent climbs/.test(f.clinical)), false, tag);
    }
  }
});

test("fall rows show the existing fall card; unsettled rows show only the neutral card", () => {
  for (const [id, row] of Object.entries(METHADONE_ARV)) {
    const fs = pair("methadone", id, DEFAULT_HOST);
    const fall = fs.filter((f) => suffix(f) === "pd-methadone-ritonavir");
    const neutral = fs.filter((f) => suffix(f) === "pd-methadone-arv-unsettled");
    if (row.arrow === "falls") {
      assert.equal(fall.length, 1, id);
      assert.equal(neutral.length, 0, id);
      assert.equal(fall[0].severity, "major", id);
      assert.equal(fall[0].effect, "methadone may fall / withdrawal", id);
      // Ritonavir and Paxlovid keep main's text (next test).
      if (row.labelName && id !== "ritonavir") {
        assert.ok(fall[0].clinical.includes(`names ${row.labelName} among antiretrovirals`), id);
        assert.ok(fall[0].clinical.includes(METHADONE_ARV_FALL), id);
      }
    } else {
      assert.equal(fall.length, 0, id);
      assert.equal(neutral.length, 1, id);
      assert.equal(neutral[0].severity, "moderate", id);
      assert.equal(neutral[0].effect, "methadone direction not settled", id);
      assert.ok(neutral[0].clinical.includes(METHADONE_ARV_HIGHLIGHT), id);
      assert.doesNotMatch(neutral[0].clinical, /may fall|parent climbs|raises methadone/, id);
    }
  }
});

test("ritonavir and Paxlovid keep the fall card text from main", () => {
  const text =
    "The 3A4 arrow is the wrong one for methadone. Acute ritonavir (Paxlovid) and steady-state ritonavir still drop methadone — watch withdrawal at the window, not nod. Fentanyl on the same booster is the opposite: parent rises, airway risk climbs. This is not a dosing protocol.";
  for (const id of ["ritonavir", "paxlovid"]) {
    const f = pair("methadone", id).find((x) => suffix(x) === "pd-methadone-ritonavir");
    assert.equal(f?.clinical, text, id);
    assert.equal(f?.mechanism, "ritonavir-boosted 3A4 inhibit vs 2B6/UGT dump", id);
  }
});

test("buprenorphine, Tybost and non-antiretroviral 3A4 inhibitors are unchanged", () => {
  for (const id of ["ritonavir", "paxlovid", "cobicistat"]) {
    assert.ok(pair("buprenorphine", id).some((f) => suffix(f) === "pd-bup-ritonavir"), id);
  }
  // Buprenorphine with a boosted combo row still reads the 3A4 rise card.
  assert.ok(pair("buprenorphine", "darunavir-cobicistat").some((f) => /^pk-CYP3A4-inhibitor-/.test(suffix(f))));
  assert.ok(pair("methadone", "cobicistat").some((f) => suffix(f) === "pk-CYP3A4-inhibitor-cobicistat"));
  assert.ok(pair("methadone", "ketoconazole").some((f) => suffix(f) === "pk-CYP3A4-inhibitor-ketoconazole"));
});

test("on a desk with a non-listed 3A4 inhibitor, methadone still reads that inhibitor's rise", () => {
  const r = analyze(["methadone", "darunavir-cobicistat", "ketoconazole"], DEFAULT_HOST).findings;
  assert.ok(r.some((f) => f.id.endsWith("pk-CYP3A4-inhibitor-ketoconazole")));
  assert.equal(r.some((f) => f.id.endsWith("pk-CYP3A4-inhibitor-darunavir-cobicistat") && f.drugIds.includes("methadone")), false);
  assert.ok(r.some((f) => f.id.startsWith("pheno-CYP3A4-") && f.drugIds.includes("methadone")));
  assert.ok(r.some((f) => f.id === "ketoconazole__cyp-clock" && f.drugIds.includes("methadone")));
  assert.equal(r.some((f) => f.id === "darunavir-cobicistat__cyp-clock" && f.drugIds.includes("methadone")), false);
});

test("window brief follows the label arrow", () => {
  const brief = (ids: string[]) => briefWindow(ids, analyze(ids, DEFAULT_HOST), DEFAULT_HOST);
  const kaletra = brief(["methadone", "lopinavir"]);
  assert.ok(kaletra?.watch.some((w) => w.includes("lists Lopinavir/ritonavir among antiretrovirals that lowered methadone")));
  assert.equal(kaletra?.watch.some((w) => /Paxlovid|COVID/.test(w)), false);
  assert.doesNotMatch(kaletra?.tell ?? "", /COVID/);
  const prezcobix = brief(["methadone", "darunavir-cobicistat"]);
  assert.ok(prezcobix?.watch.some((w) => w.startsWith("Methadone direction not settled with Darunavir–cobicistat")));
  assert.equal(prezcobix?.watch.some((w) => /parent climbs|Withdrawal at the window/.test(w)), false);
  const pax = brief(["methadone", "paxlovid"]);
  assert.ok(pax?.watch.some((w) => w.includes("Paxlovid / ritonavir often drops methadone")));
});

test("before -> after doc is generated from the engine and in sync; only listed pairs change", () => {
  const d = collect();
  assert.equal(
    readFileSync(DOC_PATH, "utf8").replace(/\r\n/g, "\n"),
    render(d).replace(/\r\n/g, "\n"),
    "methadone-arv-arrow-2026-11-07.md is stale; run npx --yes tsx scripts/methadone-arv-arrow.ts",
  );
  assert.equal(d.otherUnchanged, true, "a methadone pair outside METHADONE_ARV changed");
  assert.equal(d.changes.length, IDS.length);
  for (const c of d.changes) {
    assert.ok(c.removed.length + c.added.length > 0, `${c.id} does not change`);
    assert.ok(SEVERITY_RANK[c.gradeAfter] <= SEVERITY_RANK[c.gradeBefore], `${c.id} goes up`);
    assert.notEqual(c.gradeAfter, "contraindicated", c.id);
    assert.ok(c.removed.some((x) => x.startsWith("pk-CYP3A4-inhibitor-")) || ["ritonavir", "paxlovid"].includes(c.id), c.id);
  }
  // Grades that move: unsettled rows with no other major card go major -> moderate.
  const moved = d.changes.filter((c) => c.gradeBefore !== c.gradeAfter).map((c) => `${c.id}:${c.gradeBefore}>${c.gradeAfter}`);
  assert.deepEqual(
    moved.sort(),
    [
      "atazanavir-cobicistat:major>moderate",
      "darunavir-cobicistat-ftc-taf:major>moderate",
      "darunavir-cobicistat:major>moderate",
      "elvitegravir-and-ritonavir:major>moderate",
      "elvitegravir-cobicistat-ftc-taf:major>moderate",
      "elvitegravir-cobicistat-ftc-tdf:major>moderate",
      "indinavir-and-ritonavir:major>moderate",
      "indinavir:major>moderate",
      "paritaprevir-and-ritonavir-and-ombitasvir-and-or-dasabuvir:major>moderate",
    ],
  );
  assert.match(render(d), /needs Kaleb's approval before merge/);
  assert.doesNotMatch(render(d), /\b\d+(\.\d+)?\s*(mg|mcg)\b/i);
});
