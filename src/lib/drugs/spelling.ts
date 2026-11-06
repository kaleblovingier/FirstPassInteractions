import { DRUGS, normalizeSearchText, saltFormKeys, withoutStrength } from "./catalog";
import { COMBINATION_BY_KEY, COMBINATIONS, type CombinationHit } from "./combos";
import type { Drug } from "./types";

/**
 * "Did you mean" for a desk query that matched nothing: the catalog names, brands, aliases and
 * combination names closest by edit distance. The desk offers these as buttons to click, never as
 * listbox options, so Enter cannot add a guess: look-alike drug names cause real errors.
 */
export type SpellingSuggestion = { label: string; distance: number } & (
  | { drug: Drug; combo?: undefined }
  | { combo: CombinationHit; drug?: undefined }
);

let CANDIDATES: { key: string; suggestion: SpellingSuggestion }[] | null = null;
function candidates() {
  CANDIDATES ??= [
    ...COMBINATIONS.flatMap((c) =>
      c.names.map((label) => ({ key: normalizeSearchText(label), suggestion: { label, distance: 0, combo: { ...c, name: label } } })),
    ),
    // A brand that is also a combination name (Percocet) means the combination, as on the desk.
    ...DRUGS.flatMap((drug) =>
      [drug.name, ...drug.brands, ...drug.aliases].map((label) => ({ key: normalizeSearchText(label), suggestion: { label, distance: 0, drug } })),
    ).filter(({ key }) => !COMBINATION_BY_KEY.has(key)),
  ];
  return CANDIDATES;
}

/** Edits plus adjacent swaps (optimal string alignment), so "flouxetine" is one from fluoxetine. Stops past `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  let before: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let prevMin = 0;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], before[j - 2] + 1);
    }
    const rowMin = Math.min(...row);
    // Two rows past the cap means every later cell is too: a swap reaches back only two rows.
    if (rowMin > max && prevMin > max) return max + 1;
    [before, prev, prevMin] = [prev, row, rowMin];
  }
  return prev[b.length];
}

/**
 * Up to `limit` rows or combinations within one edit per four letters of the query (salt, release and
 * strength words set aside), closest first. A query that is itself a catalog name gets none.
 */
export function suggestSpellings(query: string, limit = 3): SpellingSuggestion[] {
  const keys = saltFormKeys(withoutStrength(normalizeSearchText(query))).filter((k) => k.length >= 4);
  const best = new Map<string, SpellingSuggestion>();
  for (const { key, suggestion } of candidates()) {
    for (const k of keys) {
      const max = Math.floor(k.length / 4);
      if (Math.abs(key.length - k.length) > max) continue;
      const distance = editDistance(k, key, max);
      if (distance === 0) return [];
      const target = suggestion.drug ? suggestion.drug.id : suggestion.combo.ids.join("+");
      if (distance <= max && distance < (best.get(target)?.distance ?? Infinity)) best.set(target, { ...suggestion, distance });
    }
  }
  return [...best.values()].sort((a, b) => a.distance - b.distance || a.label.localeCompare(b.label)).slice(0, limit);
}
