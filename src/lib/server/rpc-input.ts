/**
 * Input schemas for the drug server functions. Validators run on the server; a failed check
 * becomes a typed miss in the handler, so malformed, oversize or off-shelf input never
 * reaches an upstream API. Lists are bounded and unknown ids dropped rather than rejected,
 * so a stale id left on a saved desk does not sink the rest of the request.
 */

import { z } from "zod";
import { DRUG_BY_ID } from "../drugs/catalog";
import { sanitizeBrief, type ReaderBrief } from "../drugs/readers";
import { logEvent } from "./log";

/** Most drugs one desk holds (maxDrugs on a paid plan). */
export const DESK_MAX_IDS = 8;
const MAX_REQUEST_IDS = 16;
const MAX_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 120;
const MAX_QUERY_LENGTH = 300;
const MAX_BRIEF_TEXT = 2_000;

export type Checked<T> = { ok: true; value: T } | { ok: false };

/** Own catalog keys only — "constructor" and "__proto__" are truthy lookups on a plain object. */
export function onShelf(id: string): boolean {
  return Object.hasOwn(DRUG_BY_ID, id);
}

let shelfNames: Set<string> | null = null;

export function nameOnShelf(name: string): boolean {
  shelfNames ??= new Set(Object.values(DRUG_BY_ID).map((d) => d.name.toLowerCase()));
  return shelfNames.has(name.trim().toLowerCase());
}

const shelfIds = z
  .array(z.string().max(MAX_ID_LENGTH))
  .max(MAX_REQUEST_IDS)
  .default([])
  .transform((ids) => [...new Set(ids)].filter(onShelf));

export const LiveInput = z.object({ id: z.string().max(MAX_ID_LENGTH).refine(onShelf) });

export const IdsInput = z.object({ ids: shelfIds });

export const SearchInput = z.object({
  query: z.string().max(MAX_QUERY_LENGTH).default(""),
  ids: shelfIds,
});

export const CpicInput = z.object({ name: z.string().max(MAX_NAME_LENGTH).refine(nameOnShelf) });

const briefText = z.string().max(MAX_BRIEF_TEXT).default("");

/** Transport bounds sit above the brief's own clips, so a long desk is clipped, not refused. */
export const ReaderBriefInput = z
  .object({
    names: z
      .array(z.string().max(MAX_NAME_LENGTH))
      .max(MAX_REQUEST_IDS)
      .default([])
      .transform((names) => names.filter(nameOnShelf)),
    lead: briefText,
    clock: briefText,
    watch: briefText,
    source: briefText,
    fold: briefText,
    hands: briefText,
    rows: z
      .array(z.object({ severity: briefText, line: briefText, why: briefText }))
      .max(12)
      .default([]),
    quiet: z.array(z.string().max(MAX_BRIEF_TEXT)).max(40).default([]),
    food: z.array(z.string().max(MAX_BRIEF_TEXT)).max(12).default([]),
  })
  .transform((brief): ReaderBrief => sanitizeBrief(brief));

export function checkInput<S extends z.ZodType>(
  fn: string,
  schema: S,
  input: unknown,
): Checked<z.output<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  logEvent("info", "rpc.invalid", { fn, issues: parsed.error.issues.length });
  return { ok: false };
}
