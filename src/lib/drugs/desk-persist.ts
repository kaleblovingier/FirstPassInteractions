/**
 * Hydrate guard for the desk blob (`firstpass.desk.v7`).
 *
 * Saved JSON is untrusted. A non-array `selected`, a spread of a bad `doses`
 * object, or a paid `plan` with no license-shaped key used to land in state
 * and throw on the desk. This module coerces one blob into a sealed shape.
 * The store rewrites storage when a field had to be repaired, and clears a
 * blob that is not JSON. HMAC checks stay on redeem; this only applies the
 * key-shape and program-grant rules the client already has.
 */

import type { StateStorage } from "zustand/middleware";
import { z } from "zod";
import type { PlanId } from "@/lib/billing/plans";
import {
  normalizeProgramGrant,
  programFromLicense,
  type ProgramGrant,
} from "@/lib/billing/program-license";
import { normalizeStudyMarks, type StudyMark } from "./study-marks";
import {
  DEFAULT_PHENOTYPES,
  PHENOTYPE_ENZYMES,
  type AgeBand,
  type AlcoholPattern,
  type CannabisRoute,
  type KetamineRoute,
  type KidneyBand,
  type Metabolizer,
  type PhenotypeEnzyme,
  type PhenotypeMap,
  type PregBand,
} from "./types";

export const DESK_STORAGE_KEY = "firstpass.desk.v7";

const PERSONAL_KEY_RE = /^FP-(PRO|LAB|LIFE)-[0-9A-F]{8}-[0-9A-F]{8}$/;
const MAX_SELECTED = 16;
const MAX_ID_LEN = 64;
const MAX_DOSES = 32;
const MAX_DOSE_LEN = 80;
const MAX_NOTE_LEN = 500;

const METABOLIZERS = ["PM", "IM", "NM", "UM"] as const satisfies readonly Metabolizer[];
const KETAMINE_ROUTES = ["iv", "in", "oral"] as const satisfies readonly KetamineRoute[];
const CANNABIS_ROUTES = ["smoked", "oral"] as const satisfies readonly CannabisRoute[];
const ALCOHOL_PATTERNS = ["off", "acute", "chronic"] as const satisfies readonly AlcoholPattern[];
const AGE_BANDS = ["adult", "geriatric"] as const satisfies readonly AgeBand[];
const KIDNEY_BANDS = ["ok", "ckd"] as const satisfies readonly KidneyBand[];
const PREG_BANDS = ["off", "pregnant", "lactating"] as const satisfies readonly PregBand[];
const PLAN_IDS = ["free", "pro", "lab"] as const satisfies readonly PlanId[];

const PERSISTED_KEYS = [
  "selected",
  "phenotypes",
  "smoking",
  "ketamineRoute",
  "cannabisRoute",
  "alcohol",
  "age",
  "kidney",
  "preg",
  "doses",
  "studyMarks",
  "plan",
  "license",
  "lifetime",
  "program",
  "programNote",
  "previewUntil",
  "previewUsed",
  "hcpAck",
  "doseAttest",
] as const;

const persistedKeySet = new Set<string>(PERSISTED_KEYS);

const MetabolizerSchema = z.enum(METABOLIZERS);
const StudyMarkSchema = z.object({
  mark: z.enum(["got", "miss"]),
  nextReview: z.number().finite(),
  streak: z.number().int().nonnegative(),
});
const ProgramGrantSchema = z.object({
  tier: z.enum(["team", "program", "site"]),
  endsAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
});

/** The slice `partialize` writes. Every field is present and already sealed. */
export const DeskPersistedSchema = z.object({
  selected: z.array(z.string().min(1).max(MAX_ID_LEN)).max(MAX_SELECTED),
  phenotypes: z.object({
    CYP2D6: MetabolizerSchema,
    CYP2C19: MetabolizerSchema,
    CYP2C9: MetabolizerSchema,
    CYP2B6: MetabolizerSchema,
  }),
  smoking: z.boolean(),
  ketamineRoute: z.enum(KETAMINE_ROUTES),
  cannabisRoute: z.enum(CANNABIS_ROUTES),
  alcohol: z.enum(ALCOHOL_PATTERNS),
  age: z.enum(AGE_BANDS),
  kidney: z.enum(KIDNEY_BANDS),
  preg: z.enum(PREG_BANDS),
  doses: z.record(z.string().min(1).max(MAX_ID_LEN), z.string().min(1).max(MAX_DOSE_LEN)),
  studyMarks: z.record(z.string().min(1).max(MAX_ID_LEN), StudyMarkSchema),
  plan: z.enum(PLAN_IDS),
  license: z.string().min(1).max(80).nullable(),
  lifetime: z.boolean(),
  program: ProgramGrantSchema.nullable(),
  programNote: z.string().max(MAX_NOTE_LEN).nullable(),
  previewUntil: z.number().finite().nullable(),
  previewUsed: z.boolean(),
  hcpAck: z.boolean(),
  doseAttest: z.object({ v: z.number().finite(), at: z.number().finite() }).nullable(),
});

export type DeskPersisted = z.infer<typeof DeskPersistedSchema>;

export type DeskHydration = {
  state: DeskPersisted;
  /** The blob was unusable, or a present field was not the shape we saved. */
  rewrite: boolean;
};

export function defaultPersistedDesk(): DeskPersisted {
  return {
    selected: [],
    phenotypes: { ...DEFAULT_PHENOTYPES },
    smoking: false,
    ketamineRoute: "iv",
    cannabisRoute: "smoked",
    alcohol: "off",
    age: "adult",
    kidney: "ok",
    preg: "off",
    doses: {},
    studyMarks: {},
    plan: "free",
    license: null,
    lifetime: false,
    program: null,
    programNote: null,
    previewUntil: null,
    previewUsed: false,
    hcpAck: false,
    doseAttest: null,
  };
}

export function partializeDesk(s: DeskPersisted): DeskPersisted {
  return {
    selected: s.selected,
    phenotypes: s.phenotypes,
    smoking: s.smoking,
    ketamineRoute: s.ketamineRoute,
    cannabisRoute: s.cannabisRoute,
    alcohol: s.alcohol,
    age: s.age,
    kidney: s.kidney,
    preg: s.preg,
    doses: s.doses,
    studyMarks: s.studyMarks,
    plan: s.plan,
    license: s.license,
    lifetime: s.lifetime,
    program: s.program,
    programNote: s.programNote,
    previewUntil: s.previewUntil,
    previewUsed: s.previewUsed,
    hcpAck: s.hcpAck,
    doseAttest: s.doseAttest,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Personal and program key shapes. Not a signature check — that stays on redeem. */
export function canonicalLicense(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!key) return null;
  if (PERSONAL_KEY_RE.test(key)) return key;
  return programFromLicense(key) ? key : null;
}

function personalUnlock(key: string): { plan: PlanId; lifetime: boolean } | null {
  const tag = /^FP-(PRO|LAB|LIFE)-/.exec(key)?.[1];
  if (tag === "PRO") return { plan: "pro", lifetime: false };
  if (tag === "LAB") return { plan: "lab", lifetime: false };
  if (tag === "LIFE") return { plan: "lab", lifetime: true };
  return null;
}

function sameProgram(raw: unknown, program: ProgramGrant | null): boolean {
  if (program === null) return raw == null;
  const norm = normalizeProgramGrant(raw);
  if (!norm || norm.tier !== program.tier || norm.endsAt !== program.endsAt) return false;
  if (!isRecord(raw)) return false;
  const keys = Object.keys(raw);
  return keys.length === 2 && keys.includes("tier") && keys.includes("endsAt");
}

/**
 * Plan, lifetime, and program follow the key when it has a known shape.
 * A stored program grant still wins over the month baked into an org key,
 * matching redeem. A paid plan with neither a key nor a grant becomes free.
 */
function resolveUnlock(
  raw: Record<string, unknown>,
  current: DeskPersisted,
): { plan: PlanId; license: string | null; lifetime: boolean; program: ProgramGrant | null; corrected: boolean } {
  const seenPlan = Object.hasOwn(raw, "plan");
  const seenLicense = Object.hasOwn(raw, "license");
  const seenLifetime = Object.hasOwn(raw, "lifetime");
  const seenProgram = Object.hasOwn(raw, "program");

  if (!seenPlan && !seenLicense && !seenLifetime && !seenProgram) {
    return {
      plan: current.plan,
      license: current.license,
      lifetime: current.lifetime,
      program: null,
      corrected: false,
    };
  }

  const licenseFromBlob = seenLicense ? canonicalLicense(raw.license) : null;
  const personal = licenseFromBlob ? personalUnlock(licenseFromBlob) : null;
  const storedProgram = seenProgram && !personal ? normalizeProgramGrant(raw.program) : null;
  const keyProgram = !personal && licenseFromBlob ? programFromLicense(licenseFromBlob) : null;
  const program = personal ? null : (storedProgram ?? keyProgram);

  let plan: PlanId;
  let lifetime: boolean;
  let license: string | null;

  if (personal && licenseFromBlob) {
    plan = personal.plan;
    lifetime = personal.lifetime;
    license = licenseFromBlob;
  } else if (program) {
    plan = "lab";
    lifetime = false;
    license = seenLicense ? licenseFromBlob : current.license;
  } else if (seenPlan && raw.plan === "free" && !(seenLicense && raw.license)) {
    plan = "free";
    lifetime = false;
    license = null;
  } else if (!seenPlan && !seenLicense && !seenProgram) {
    plan = current.plan;
    license = current.license;
    lifetime = typeof current.lifetime === "boolean" ? current.lifetime : false;
  } else {
    plan = "free";
    lifetime = false;
    license = null;
  }

  let corrected = false;
  if (seenPlan && raw.plan !== plan) corrected = true;
  if (seenLicense && raw.license !== license) corrected = true;
  if (seenLifetime && raw.lifetime !== lifetime) corrected = true;
  if (seenProgram && !sameProgram(raw.program, program)) corrected = true;
  return { plan, license, lifetime, program, corrected };
}

function readSelected(raw: unknown, present: boolean, current: string[]): { value: string[]; corrected: boolean } {
  if (!present) return { value: current, corrected: false };
  if (!Array.isArray(raw)) return { value: [], corrected: true };
  const value: string[] = [];
  const seen = new Set<string>();
  let corrected = raw.length > MAX_SELECTED;
  for (const item of raw) {
    if (value.length >= MAX_SELECTED) {
      corrected = true;
      break;
    }
    if (typeof item !== "string" || item.length === 0 || item.length > MAX_ID_LEN) {
      corrected = true;
      continue;
    }
    // "constructor", "toString", "__proto__" are truthy DRUG_BY_ID lookups. Checked without importing
    // the catalog, since this module also feeds the root route's prehydrate script.
    if (Object.hasOwn(Object.prototype, item)) {
      corrected = true;
      continue;
    }
    if (seen.has(item)) {
      corrected = true;
      continue;
    }
    seen.add(item);
    value.push(item);
  }
  return { value, corrected };
}

function readPhenotypes(raw: unknown, present: boolean): { value: PhenotypeMap; corrected: boolean } {
  const value: PhenotypeMap = { ...DEFAULT_PHENOTYPES };
  if (!present || raw == null) return { value, corrected: false };
  if (!isRecord(raw)) return { value, corrected: true };
  let corrected = false;
  for (const key of Object.keys(raw)) {
    if (!PHENOTYPE_ENZYMES.includes(key as PhenotypeEnzyme)) corrected = true;
  }
  for (const enzyme of PHENOTYPE_ENZYMES) {
    if (!Object.hasOwn(raw, enzyme)) continue;
    const next = oneOf(raw[enzyme], METABOLIZERS);
    if (!next) corrected = true;
    else value[enzyme] = next;
  }
  return { value, corrected };
}

function readDoses(raw: unknown, present: boolean): { value: Record<string, string>; corrected: boolean } {
  if (!present || raw == null) return { value: {}, corrected: false };
  if (!isRecord(raw)) return { value: {}, corrected: true };
  const value: Record<string, string> = {};
  let corrected = false;
  for (const [key, dose] of Object.entries(raw)) {
    if (Object.keys(value).length >= MAX_DOSES) {
      corrected = true;
      break;
    }
    if (key.length === 0 || key.length > MAX_ID_LEN || key === "__proto__" || key === "constructor" || key === "prototype") {
      corrected = true;
      continue;
    }
    if (typeof dose !== "string") {
      corrected = true;
      continue;
    }
    const trimmed = dose.trim();
    if (!trimmed || trimmed.length > MAX_DOSE_LEN) {
      corrected = true;
      continue;
    }
    if (trimmed !== dose) corrected = true;
    value[key] = trimmed;
  }
  return { value, corrected };
}

function studyEntryKept(entry: unknown, mark: StudyMark | undefined): boolean {
  if (!mark) return false;
  if (entry === "got" || entry === "miss") return true;
  if (!isRecord(entry)) return false;
  if (entry.mark !== mark.mark) return false;
  if (entry.nextReview !== undefined && entry.nextReview !== mark.nextReview) return false;
  if (entry.streak !== undefined && entry.streak !== mark.streak) return false;
  return true;
}

function readStudyMarks(raw: unknown, present: boolean): { value: Record<string, StudyMark>; corrected: boolean } {
  if (!present || raw == null) return { value: {}, corrected: false };
  if (!isRecord(raw)) return { value: {}, corrected: true };
  const normalized = normalizeStudyMarks(raw);
  const value: Record<string, StudyMark> = {};
  let corrected = false;
  for (const [id, entry] of Object.entries(raw)) {
    const mark = normalized[id];
    if (!mark || id.length === 0 || id.length > MAX_ID_LEN) {
      corrected = true;
      continue;
    }
    value[id] = mark;
    if (!studyEntryKept(entry, mark)) corrected = true;
  }
  return { value, corrected };
}

function readEnum<T extends string>(
  raw: unknown,
  present: boolean,
  allowed: readonly T[],
  fallback: T,
  current: T | undefined,
  keepCurrent: boolean,
): { value: T; corrected: boolean } {
  if (!present) return { value: keepCurrent && current ? current : fallback, corrected: false };
  const next = oneOf(raw, allowed);
  return next ? { value: next, corrected: false } : { value: fallback, corrected: true };
}

function readBool(raw: unknown, present: boolean, fallback: boolean): { value: boolean; corrected: boolean } {
  if (!present) return { value: fallback, corrected: false };
  if (typeof raw === "boolean") return { value: raw, corrected: false };
  return { value: fallback, corrected: true };
}

/** The calculator attestation: a malformed record reads as not attested, so the gate asks again. */
function readDoseAttest(raw: unknown, present: boolean): { value: DeskPersisted["doseAttest"]; corrected: boolean } {
  if (!present || raw === null) return { value: null, corrected: false };
  const parsed = DeskPersistedSchema.shape.doseAttest.safeParse(raw);
  return parsed.success ? { value: parsed.data, corrected: false } : { value: null, corrected: true };
}

function readPreviewUntil(raw: unknown, present: boolean, current: number | null): { value: number | null; corrected: boolean } {
  if (!present) return { value: current, corrected: false };
  if (raw === null) return { value: null, corrected: false };
  if (typeof raw === "number" && Number.isFinite(raw)) return { value: raw, corrected: false };
  return { value: null, corrected: true };
}

function readNote(raw: unknown, present: boolean): { value: string | null; corrected: boolean } {
  if (!present || raw == null || raw === "") return { value: null, corrected: false };
  if (typeof raw !== "string") return { value: null, corrected: true };
  if (raw.length > MAX_NOTE_LEN) return { value: raw.slice(0, MAX_NOTE_LEN), corrected: true };
  return { value: raw, corrected: false };
}

function emptyHydration(current: DeskPersisted): DeskHydration {
  // Match the historical merge: a missing blob resets host fields that were
  // always overwritten, and leaves the tray and unlock alone.
  const phenotypes = readPhenotypes(undefined, false).value;
  return {
    rewrite: false,
    state: {
      ...current,
      phenotypes,
      age: "adult",
      kidney: "ok",
      preg: "off",
      doses: {},
      studyMarks: {},
      program: null,
      programNote: null,
      previewUsed: false,
      hcpAck: false,
      doseAttest: null,
    },
  };
}

function seal(state: DeskPersisted, rewrite: boolean): DeskHydration {
  const parsed = DeskPersistedSchema.safeParse(state);
  if (!parsed.success) return { state: defaultPersistedDesk(), rewrite: true };
  return { state: parsed.data, rewrite };
}

/**
 * Turn one persisted `state` value into a desk slice.
 * `null` and `undefined` mean nothing was stored. Any other non-object is corrupt.
 */
export function readDeskStorageState(persisted: unknown, current: DeskPersisted = defaultPersistedDesk()): DeskHydration {
  if (persisted == null) return seal(emptyHydration(current).state, false);
  if (!isRecord(persisted)) return { state: defaultPersistedDesk(), rewrite: true };

  let rewrite = false;
  for (const key of Object.keys(persisted)) {
    if (!persistedKeySet.has(key)) rewrite = true;
  }

  const selected = readSelected(persisted.selected, Object.hasOwn(persisted, "selected"), current.selected);
  const phenotypes = readPhenotypes(persisted.phenotypes, Object.hasOwn(persisted, "phenotypes"));
  const smoking = readBool(persisted.smoking, Object.hasOwn(persisted, "smoking"), current.smoking);
  const ketamineRoute = readEnum(
    persisted.ketamineRoute,
    Object.hasOwn(persisted, "ketamineRoute"),
    KETAMINE_ROUTES,
    "iv",
    current.ketamineRoute,
    true,
  );
  const cannabisRoute = readEnum(
    persisted.cannabisRoute,
    Object.hasOwn(persisted, "cannabisRoute"),
    CANNABIS_ROUTES,
    "smoked",
    current.cannabisRoute,
    true,
  );
  const alcohol = readEnum(
    persisted.alcohol,
    Object.hasOwn(persisted, "alcohol"),
    ALCOHOL_PATTERNS,
    "off",
    current.alcohol,
    true,
  );
  const age = readEnum(persisted.age, Object.hasOwn(persisted, "age"), AGE_BANDS, "adult", current.age, false);
  const kidney = readEnum(persisted.kidney, Object.hasOwn(persisted, "kidney"), KIDNEY_BANDS, "ok", current.kidney, false);
  const preg = readEnum(persisted.preg, Object.hasOwn(persisted, "preg"), PREG_BANDS, "off", current.preg, false);
  const doses = readDoses(persisted.doses, Object.hasOwn(persisted, "doses"));
  const studyMarks = readStudyMarks(persisted.studyMarks, Object.hasOwn(persisted, "studyMarks"));
  const unlock = resolveUnlock(persisted, current);
  const programNote = readNote(persisted.programNote, Object.hasOwn(persisted, "programNote"));
  const previewUntil = readPreviewUntil(
    persisted.previewUntil,
    Object.hasOwn(persisted, "previewUntil"),
    current.previewUntil,
  );
  const previewUsed = readBool(persisted.previewUsed, Object.hasOwn(persisted, "previewUsed"), false);
  const hcpAck = readBool(persisted.hcpAck, Object.hasOwn(persisted, "hcpAck"), false);
  const doseAttest = readDoseAttest(persisted.doseAttest, Object.hasOwn(persisted, "doseAttest"));
  const previewUsedValue = previewUsed.value || typeof previewUntil.value === "number";

  rewrite =
    rewrite ||
    selected.corrected ||
    phenotypes.corrected ||
    smoking.corrected ||
    ketamineRoute.corrected ||
    cannabisRoute.corrected ||
    alcohol.corrected ||
    age.corrected ||
    kidney.corrected ||
    preg.corrected ||
    doses.corrected ||
    studyMarks.corrected ||
    unlock.corrected ||
    programNote.corrected ||
    previewUntil.corrected ||
    previewUsed.corrected ||
    hcpAck.corrected ||
    doseAttest.corrected;

  return seal(
    {
      selected: selected.value,
      phenotypes: phenotypes.value,
      smoking: smoking.value,
      ketamineRoute: ketamineRoute.value,
      cannabisRoute: cannabisRoute.value,
      alcohol: alcohol.value,
      age: age.value,
      kidney: kidney.value,
      preg: preg.value,
      doses: doses.value,
      studyMarks: studyMarks.value,
      plan: unlock.plan,
      license: unlock.license,
      lifetime: unlock.lifetime,
      program: unlock.program,
      programNote: programNote.value,
      previewUntil: previewUntil.value,
      previewUsed: previewUsedValue,
      hcpAck: hcpAck.value,
      doseAttest: doseAttest.value,
    },
    rewrite,
  );
}

/** Drop the desk blob. Invalid JSON is cleared here so rehydrate never throws. */
export function clearDeskStorage(): void {
  try {
    localStorage.removeItem(DESK_STORAGE_KEY);
  } catch {
    /* private mode, or no localStorage */
  }
}

/**
 * A zustand envelope is `{ state, version }`. Anything else is dropped so
 * `JSON.parse` inside the storage adapter cannot reject rehydrate.
 */
export function deskEnvelope(raw: string | null): { value: string | null; drop: boolean } {
  if (raw == null) return { value: null, drop: false };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Object.hasOwn(parsed, "state")) return { value: null, drop: true };
    return { value: raw, drop: false };
  } catch {
    return { value: null, drop: true };
  }
}

/**
 * JSON storage that refuses a broken envelope. Zustand parses the string we
 * return; a throw from `JSON.parse` would reject rehydrate and skip the merge.
 */
export function deskJsonStorage(): StateStorage {
  if (typeof window === "undefined") {
    throw new Error("localStorage is unavailable");
  }
  return {
    getItem(name) {
      let raw: string | null;
      try {
        raw = localStorage.getItem(name);
      } catch {
        return null;
      }
      const envelope = deskEnvelope(raw);
      if (envelope.drop) {
        try {
          localStorage.removeItem(name);
        } catch {
          /* ignore */
        }
      }
      return envelope.value;
    },
    setItem(name, value) {
      try {
        localStorage.setItem(name, value);
      } catch {
        /* quota */
      }
    },
    removeItem(name) {
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * First-paint hint. A paid plan string alone must not hide the unlock control;
 * only a personal or program key shape does. The store re-checks after hydrate.
 */
export const DESK_PREHYDRATE_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(DESK_STORAGE_KEY)})||"{}").state||{},d=document.documentElement;if(s&&typeof s==="object"&&s.hcpAck===true)d.setAttribute("data-fp-ack","");var k=s&&typeof s.license==="string"?s.license.trim().toUpperCase().replace(/\\s+/g,""):"";var paid=/^FP-(PRO|LAB|LIFE)-[0-9A-F]{8}-[0-9A-F]{8}$/.test(k)||/^FP-ORG-[TPS]\\d{6}-[0-9A-F]{8}-[0-9A-F]{8}$/.test(k);if(paid)d.setAttribute("data-fp-paid","");}catch(e){}})();`;
