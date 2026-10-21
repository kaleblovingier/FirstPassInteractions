/**
 * Card set for the SCORM export, derived at build time from the live pair
 * pages (label gold set + label-contraindication pins, filtered to drugs in
 * the catalog). No fixed list or count: whatever ships on /pair today is what
 * gets packaged, minus cards whose text carries a dose or a price.
 */
import { pairPages, type PairPage } from "@/lib/seo/pair-pages";
import { hasDose, hasPrice } from "../../../scripts/lms/content-guard.mjs";

export function cardText(p: PairPage): string {
  return [p.nameA, p.nameB, p.severityLabel, p.mechanism, p.quote?.quote ?? "", p.quote?.labelDrug ?? "", p.quote?.labelSection ?? ""].join(" \n ");
}

export function scormCards(): { cards: PairPage[]; skipped: string[] } {
  const all = pairPages().filter((p) => p.quote);
  const cards = all.filter((p) => !hasDose(cardText(p)) && !hasPrice(cardText(p)));
  const keep = new Set(cards);
  return { cards, skipped: all.filter((p) => !keep.has(p)).map((p) => p.slug) };
}
