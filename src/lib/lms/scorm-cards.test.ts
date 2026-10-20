import assert from "node:assert/strict";
import test from "node:test";
import { scormCards } from "./scorm-cards";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { LABEL_CONTRAINDICATIONS } from "@/lib/drugs/label-contraindications";
import { LABEL_GOLD_SET } from "@/lib/drugs/reference/label-gold-set";
import { pairSlug } from "@/lib/seo/pair-pages";

// Rebuild the quoted-pair set straight from the raw live sources (gold set, pins,
// catalog), independent of pair-pages.ts, and compare with what the export ships.
function livePairs() {
  const key = (a: string, b: string) => [a, b].sort().join("|");
  const m = new Map<string, { a: string; b: string; quoted: boolean; ids: string[] }>();
  for (const g of LABEL_GOLD_SET) {
    if (!DRUG_BY_ID[g.drugA] || !DRUG_BY_ID[g.drugB]) continue;
    const k = key(g.drugA, g.drugB);
    if (!m.has(k)) m.set(k, { a: g.drugA, b: g.drugB, quoted: !g.paraphrased, ids: [g.id] });
  }
  for (const p of LABEL_CONTRAINDICATIONS) {
    if (!DRUG_BY_ID[p.labelDrugId] || !DRUG_BY_ID[p.otherId]) continue;
    const k = key(p.labelDrugId, p.otherId);
    const cur = m.get(k);
    if (cur) { cur.quoted = true; cur.ids.push(p.id); } else m.set(k, { a: p.labelDrugId, b: p.otherId, quoted: true, ids: [p.id] });
  }
  return [...m.values()].filter((v) => v.quoted);
}

test("SCORM cards: every card's source id and drugs exist in live gold/pin/catalog data", () => {
  const goldIds = new Set(LABEL_GOLD_SET.map((g) => g.id));
  const pinIds = new Set(LABEL_CONTRAINDICATIONS.map((p) => p.id));
  const { cards } = scormCards();
  assert.ok(cards.length > 0);
  for (const c of cards) {
    assert.ok(DRUG_BY_ID[c.drugA] && DRUG_BY_ID[c.drugB], `${c.slug}: drug missing from catalog`);
    const src = c.quote!.source === "gold" ? goldIds : pinIds;
    assert.ok(src.has(c.quote!.sourceId), `${c.slug}: ${c.quote!.source} id ${c.quote!.sourceId} not in live data`);
  }
});

test("SCORM cards: count equals the live quoted-pair count (minus dose/price skips), same slugs", () => {
  const live = livePairs();
  const { cards, skipped } = scormCards();
  assert.equal(cards.length + skipped.length, live.length);
  const liveSlugs = new Set(live.map((v) => pairSlug(v.a, v.b)));
  for (const c of cards) assert.ok(liveSlugs.has(c.slug), `${c.slug} not in live data`);
  assert.equal(new Set(cards.map((c) => c.slug)).size, cards.length, "duplicate cards");
});
