/**
 * Reads a pasted medication list (an EHR export, a discharge summary, a phone note) into one name
 * per item, then matches each name against the catalog. Strength, route, schedule and form words are
 * dropped and never shown back: the desk works from names, not doses.
 */
import {
  DRUG_BY_ID,
  matchedStreetName,
  normalizeSearchText,
  saltFormKeys,
  searchDrugs,
  withoutStrength,
} from "./catalog";
import { findCombination, type CombinationHit } from "./combos";
import { suggestSpellings, type SpellingSuggestion } from "./spelling";
import type { Drug } from "./types";

export const MED_LIST_MAX_ITEMS = 40;
export const MED_LIST_MAX_CHARS = 10_000;

// Words that end the name part of an item: routes, schedules, forms and units.
const SIG_WORDS = new Set([
  "po", "oral", "orally", "by", "iv", "im", "sc", "sq", "subq", "subcut", "sl", "pr", "topical", "topically",
  "inh", "inhaled", "nasal", "intranasal", "daily", "qd", "bid", "tid", "qid", "qhs", "hs", "qam", "qpm", "prn",
  "weekly", "monthly", "once", "twice", "nightly", "morning", "evening", "bedtime", "every", "needed", "tab",
  "tabs", "tablet", "tablets", "cap", "caps", "capsule", "capsules", "solution", "susp", "suspension", "cream",
  "ointment", "gel", "patch", "inhaler", "injection", "injectable", "syringe", "pen", "drops", "spray", "puff",
  "puffs", "mg", "mcg", "g", "ml", "unit", "units", "iu", "meq",
  // Schedule connectors ("at bedtime", "as needed"); not "with", which names products (Tylenol with Codeine).
  "at", "for", "before", "after", "as", "per", "via",
]);
// Words a line may open with before the name: "Take 1 tab aspirin". Routes stay ("oral contraceptive").
const LEAD_WORDS = new Set([
  "take", "takes", "taking", "use", "apply", "inhale", "inject", "give", "tab", "tabs", "tablet", "tablets",
  "cap", "caps", "capsule", "capsules", "puff", "puffs", "unit", "units", "mg", "mcg", "ml", "g",
]);
// A count or strength token ("10", "0.5", "1/2", "10mg", "25mcg"), not a name that starts with a digit ("5-HTP").
const STRENGTH = /^[\d.,/]+(mg|mcg|g|ml|l|%|iu|units?|meq|x)?$/i;
const ALLERGY_LABEL = /^(allerg(y|ies)|nkda|intolerances?|adverse reactions?)\b/i;

export interface MedListRead {
  /** One name per item, in list order, duplicates removed. */
  names: string[];
  /** Items past MED_LIST_MAX_ITEMS that were not read. */
  more: number;
}

function nameOf(piece: string): string {
  let text = piece
    .replace(/^\s*(?:[-*•·▪◦>]+|\(?\d+[.)]|[a-z][.)])\s+/i, "") // bullets and list numbers
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ") // parentheticals: "(escitalopram)", "[PRN]"
    .trim();
  const label = /^([^:]{1,40}):\s*(.*)$/.exec(text);
  if (label) {
    if (ALLERGY_LABEL.test(label[1]!.trim())) return ""; // an allergy line is not a medicine on board
    text = label[2]!;
  }
  const tokens = text.split(/\s+/).filter(Boolean);
  while (tokens.length && (LEAD_WORDS.has(tokens[0]!.toLowerCase()) || STRENGTH.test(tokens[0]!))) {
    tokens.shift(); // "1 tab aspirin daily", "Take atorvastatin"
  }
  const sig = (t: string) => STRENGTH.test(t) || SIG_WORDS.has(t.toLowerCase().replace(/[.,;]+$/, ""));
  if (tokens.every(sig)) return ""; // "10 mg daily" names nothing
  const cut = tokens.findIndex((t, i) => i > 0 && sig(t));
  return (cut > 0 ? tokens.slice(0, cut) : tokens).join(" ").replace(/[.,;:]+$/, "").trim();
}

/** Split pasted text into item names. Lines, commas, semicolons, tabs and pipes separate items. */
export function readMedList(text: string): MedListRead {
  const seen = new Set<string>();
  const names: string[] = [];
  let more = 0;
  for (const piece of text.slice(0, MED_LIST_MAX_CHARS).split(/[\n\r;,\t|]+/)) {
    const name = nameOf(piece);
    const key = normalizeSearchText(name);
    if (!key || key.length > 80 || seen.has(key)) continue;
    seen.add(key);
    if (names.length >= MED_LIST_MAX_ITEMS) more++;
    else names.push(name);
  }
  return { names, more };
}

export type MedListRow =
  | { name: string; status: "found"; ids: string[]; drug?: Drug; combo?: CombinationHit }
  | { name: string; status: "check"; options: Drug[]; street?: string }
  | { name: string; status: "missing"; suggestions: SpellingSuggestion[] };

/** True when `name` is this row's name, id, brand, alias or street name, past strength and salt words. */
function namesExactly(name: string, drug: Drug): boolean {
  const keys = new Set(saltFormKeys(withoutStrength(normalizeSearchText(name))));
  return [drug.name, drug.id, ...drug.brands, ...drug.aliases].some((label) => keys.has(normalizeSearchText(label)));
}

/**
 * Match one read name. Only an exact name, brand, alias or combination product counts as found;
 * anything looser is offered as choices the reader must pick, never added on a guess. A street name
 * is a choice too: in a medication list "K" is usually potassium, not ketamine.
 */
export function matchMedListName(name: string): MedListRow {
  const combo = findCombination(name);
  if (combo) return { name, status: "found", ids: [...combo.ids], combo };
  const results = searchDrugs(name);
  const top = results[0];
  if (top) {
    const street = matchedStreetName(top.id, name) ?? undefined;
    if (!street && namesExactly(name, top)) return { name, status: "found", ids: [top.id], drug: top };
    return { name, status: "check", options: results.slice(0, 3), street };
  }
  return { name, status: "missing", suggestions: suggestSpellings(name) };
}

/** Read and match a pasted list. */
export function matchMedList(text: string): { rows: MedListRow[]; more: number } {
  const { names, more } = readMedList(text);
  return { rows: names.map(matchMedListName), more };
}

/** Display name for an id, for summaries. */
export function medListLabel(id: string): string {
  return DRUG_BY_ID[id]?.name ?? id;
}
