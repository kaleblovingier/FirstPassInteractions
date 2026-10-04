import { labAssignment, sampleForLab, type LabAssignment } from "./lab";
import { SAMPLE_REGIMENS, type SampleRegimen } from "./samples";
import type { LoadExtras } from "./store";
import type { KetamineRoute } from "./types";
import { DRUG_BY_ID } from "./catalog";
import { buildBriefUrl as briefUrlFromIds } from "./brief";
import { isVirtual } from "./host";

export type PackId = "clinic-onboard" | "mat-cup" | "pharmd";

export interface PackMeta {
  id: PackId;
  title: string;
  blurb: string;
  caseIds: string[];
}

/** Teaching packs — free-friendly cases (oral/IN ketamine route OK; no Pro host extras). */
export const PACKS: Record<PackId, PackMeta> = {
  "clinic-onboard": {
    id: "clinic-onboard",
    title: "Clinic onboard",
    blurb: "Oral first-pass, benzo airway stack, and induction loss — three free desk maps.",
    caseIds: ["gf-oral-ketamine", "ketamine-benzo", "esketamine-rifampin"],
  },
  "mat-cup": {
    id: "mat-cup",
    title: "MAT / street cup",
    blurb: "Xylazine, naltrexone precip, Imodium P-gp, designer benzo — fits the free five-drug cap.",
    caseIds: ["xylazine-fentanyl", "naltrexone-opioid", "loperamide-quinidine", "bromazolam-oxy"],
  },
  pharmd: {
    id: "pharmd",
    title: "PharmD lab",
    blurb: "Free teaching pairs for students — swallowed ketamine, benzo airway stack, transplant food, street sedative. Not an exam key.",
    caseIds: ["gf-oral-ketamine", "ketamine-benzo", "tacrolimus-gf", "xylazine-fentanyl"],
  },
};

export const PACK_IDS = Object.keys(PACKS) as PackId[];

export interface TeachingPackLink {
  id: PackId;
  title: string;
  blurb: string;
  url: string;
}

/**
 * Absolute free teaching-pack link: `siteUrl` + `?pack=<id>` only.
 * Operators paste these before founding pay. Pass SITE.url from commerce.
 */
export function teachingPackUrl(packId: PackId, siteUrl: string): string {
  const url = new URL(siteUrl);
  url.hash = "";
  url.search = "";
  url.searchParams.set("pack", packId);
  return url.toString();
}

/** One share row per pack, reusing PACKS titles and blurbs. */
export function teachingPackLinks(siteUrl: string): TeachingPackLink[] {
  return PACK_IDS.map((id) => ({
    id,
    title: PACKS[id].title,
    blurb: PACKS[id].blurb,
    url: teachingPackUrl(id, siteUrl),
  }));
}

export interface PermalinkResolved {
  kind: "case" | "pack" | "lab" | "brief" | "none";
  caseId: string | null;
  packId: PackId | null;
  labId: string | null;
  assignment: LabAssignment | null;
  flip: boolean;
  sample: SampleRegimen | null;
  ids: string[];
  extras: LoadExtras;
}

function sampleById(id: string | null | undefined): SampleRegimen | null {
  if (!id) return null;
  return SAMPLE_REGIMENS.find((s) => s.id === id) ?? null;
}

function extrasFromSample(sample: SampleRegimen): LoadExtras {
  return {
    phenotypes: sample.phenotypes,
    smoking: sample.smoking,
    ketamineRoute: sample.ketamineRoute,
    cannabisRoute: sample.cannabisRoute,
    alcohol: sample.alcohol,
    doses: sample.doses,
  };
}

/** Flip oral↔iv and in↔iv for route-contrast teaching permalinks. */
export function flipKetamineRoute(route: KetamineRoute | undefined): KetamineRoute | undefined {
  if (!route) return undefined;
  if (route === "oral" || route === "in") return "iv";
  return "oral";
}

function applyFlip(extras: LoadExtras, flip: boolean): LoadExtras {
  if (!flip) return extras;
  const next = { ...extras };
  if (next.ketamineRoute) {
    next.ketamineRoute = flipKetamineRoute(next.ketamineRoute);
  } else {
    // Case has no explicit route — treat default IV as the baseline and flip to oral.
    next.ketamineRoute = "oral";
  }
  return next;
}

function isPackId(value: string | null): value is PackId {
  return value != null && Object.prototype.hasOwnProperty.call(PACKS, value);
}

function emptyResolved(flip: boolean): PermalinkResolved {
  return {
    kind: "none",
    caseId: null,
    packId: null,
    labId: null,
    assignment: null,
    flip,
    sample: null,
    ids: [],
    extras: {},
  };
}

/**
 * Parse desk share params.
 * - `case` (preferred) or legacy `sample`: sample regimen id
 * - `pack`: clinic-onboard | mat-cup | pharmd
 * - `lab`: PharmD lab-book assignment id (loads sample + Study view)
 * - `brief`: comma-separated catalog ids (loads onto desk; stays on desk view)
 * - `flip=1`: invert ketamine route for first-pass contrast
 * Priority: lab > pack > case > brief > none
 */
export function parsePermalink(search: string | URLSearchParams): PermalinkResolved {
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  const flip = params.get("flip") === "1" || params.get("flip") === "true";
  const labRaw = params.get("lab");
  const assignment = labAssignment(labRaw);
  if (assignment) {
    const sample = sampleForLab(assignment);
    if (!sample) {
      return { ...emptyResolved(flip), kind: "lab", labId: assignment.id, assignment };
    }
    return {
      kind: "lab",
      caseId: sample.id,
      packId: null,
      labId: assignment.id,
      assignment,
      flip,
      sample,
      ids: sample.drugIds,
      extras: applyFlip(extrasFromSample(sample), flip),
    };
  }

  const packRaw = params.get("pack");
  const packId = isPackId(packRaw) ? packRaw : null;
  const caseRaw = params.get("case") || params.get("sample");
  const empty = emptyResolved(flip);

  if (packId) {
    const pack = PACKS[packId];
    const requested = caseRaw && pack.caseIds.includes(caseRaw) ? caseRaw : pack.caseIds[0];
    const sample = sampleById(requested);
    if (!sample) return { ...empty, kind: "pack", packId };
    return {
      kind: "pack",
      caseId: sample.id,
      packId,
      labId: null,
      assignment: null,
      flip,
      sample,
      ids: sample.drugIds,
      extras: applyFlip(extrasFromSample(sample), flip),
    };
  }

  const sample = sampleById(caseRaw);
  if (sample) {
    return {
      kind: "case",
      caseId: sample.id,
      packId: null,
      labId: null,
      assignment: null,
      flip,
      sample,
      ids: sample.drugIds,
      extras: applyFlip(extrasFromSample(sample), flip),
    };
  }

  // ?brief=id1,id2 — load catalog ids onto the desk (no sample / Study).
  const briefIds = parseBriefIds(params.get("brief"));
  if (briefIds.length > 0) {
    return {
      kind: "brief",
      caseId: null,
      packId: null,
      labId: null,
      assignment: null,
      flip,
      sample: null,
      ids: briefIds,
      extras: {},
    };
  }

  return empty;
}

/** Comma-separated catalog ids that exist and are non-virtual; max 8; tray order preserved. */
export function parseBriefIds(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = decodeURIComponent(part.trim());
    if (!id || isVirtual(id) || seen.has(id)) continue;
    if (!DRUG_BY_ID[id]) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 8) break;
  }
  return out;
}

function deskBase(): string {
  // Prefer live origin in browser; fall back to the public desk URL for SSR / tests.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://firstpass-desk.vercel.app";
}

export function buildCaseUrl(
  sampleId: string,
  opts?: { flip?: boolean; pack?: PackId; base?: string },
): string {
  const url = new URL(opts?.base ?? deskBase());
  url.searchParams.set("case", sampleId);
  if (opts?.pack) url.searchParams.set("pack", opts.pack);
  if (opts?.flip) url.searchParams.set("flip", "1");
  return url.toString();
}

export function buildCompareUrl(leftId: string, rightId: string, opts?: { base?: string }): string {
  const url = new URL(opts?.base ?? deskBase());
  url.searchParams.set("compareA", leftId);
  url.searchParams.set("compareB", rightId);
  return url.toString();
}

export function parseComparePair(search: string | URLSearchParams): { leftId: string | null; rightId: string | null } {
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  const leftId = params.get("compareA");
  const rightId = params.get("compareB");
  if (!leftId && !rightId) return { leftId: null, rightId: null };
  return { leftId, rightId };
}

export function buildPackUrl(packId: PackId, opts?: { caseId?: string; flip?: boolean; base?: string }): string {
  const pack = PACKS[packId];
  const caseId = opts?.caseId && pack.caseIds.includes(opts.caseId) ? opts.caseId : pack.caseIds[0];
  return buildCaseUrl(caseId, { pack: packId, flip: opts?.flip, base: opts?.base });
}

export function buildLabPermalink(assignmentId: string, opts?: { base?: string; flip?: boolean }): string {
  const url = new URL(opts?.base ?? deskBase());
  url.searchParams.set("lab", assignmentId);
  if (opts?.flip) url.searchParams.set("flip", "1");
  return url.toString();
}

export type LoadFn = (ids: string[], extras?: LoadExtras) => boolean;

/** Load the resolved case (lab assignment, first pack case, or single case). Returns false if nothing to load. */
export function applyPermalink(loadFn: LoadFn, search: string | URLSearchParams = typeof window !== "undefined" ? window.location.search : ""): PermalinkResolved {
  const resolved = parsePermalink(search);
  if (resolved.kind === "none" || resolved.ids.length === 0) return resolved;
  loadFn(resolved.ids, resolved.extras);
  return resolved;
}

/** Absolute `?brief=` share URL (tray order, max 8). */
export function buildBriefUrl(ids: string[], opts?: { base?: string }): string {
  return briefUrlFromIds(ids, opts);
}
