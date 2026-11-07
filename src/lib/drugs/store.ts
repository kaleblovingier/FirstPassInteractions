import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DESK_STORAGE_KEY, deskJsonStorage, partializeDesk, readDeskStorageState } from "./desk-persist";
import { isCatalogId } from "./catalog";
import { scheduleStudyMark, type StudyGrade, type StudyMark } from "./study-marks";
import { rememberTray } from "./tray-history";
import type { StationId } from "./station-groups";
import { maxDrugs, type Interval, type PlanId } from "@/lib/billing/plans";
import { foundingGateCopy } from "@/lib/billing/founding-gate";
import {
  normalizeProgramGrant,
  programEnded,
  programEndedNote,
  type ProgramGrant,
} from "@/lib/billing/program-license";
import { KEY_NOT_VERIFIED_NOTE, type LicenseVerdict } from "@/lib/billing/license-verdict";
import {
  DEFAULT_HOST,
  DEFAULT_PHENOTYPES,
  type AgeBand,
  type AlcoholPattern,
  type CannabisRoute,
  type HostContext,
  type KetamineRoute,
  type KidneyBand,
  type Metabolizer,
  type PhenotypeEnzyme,
  type PhenotypeMap,
  type PregBand,
} from "./types";

type View =
  | "desk"
  | "atlas"
  | "plans"
  | "library"
  | "foundry"
  | "rounds"
  | "cites"
  | "label"
  | "study"
  | "compare"
  | "watch"
  | "help";

export interface LoadExtras {
  phenotypes?: Partial<PhenotypeMap>;
  smoking?: boolean;
  ketamineRoute?: KetamineRoute;
  cannabisRoute?: CannabisRoute;
  alcohol?: AlcoholPattern;
  doses?: Record<string, string>;
}

interface DeskState {
  selected: string[];
  view: View;
  atlasEnzyme: string | null;
  phenotypes: PhenotypeMap;
  smoking: boolean;
  ketamineRoute: KetamineRoute;
  cannabisRoute: CannabisRoute;
  alcohol: AlcoholPattern;
  age: AgeBand;
  kidney: KidneyBand;
  preg: PregBand;
  doses: Record<string, string>;
  studyMarks: Record<string, StudyMark>;
  plan: PlanId;
  license: string | null;
  lifetime: boolean;
  /** Program license tier and last moment it works. Null for personal keys and the free desk. */
  program: ProgramGrant | null;
  /** One line shown after a program license ends. Cleared on dismiss or a new key. */
  programNote: string | null;
  previewUntil: number | null;
  /** True after a preview has been started on this browser. Not cleared by returning to free. */
  previewUsed: boolean;
  /** Class name to open on the formulary. Not saved. */
  libraryShelf: string;
  /** Station the clinical board opens next, picked in the Ctrl+K palette. Not saved. */
  station: StationId | null;
  justActivated: boolean;
  hcpAck: boolean;
  /** Clinician attestation in front of the dose calculators: the version confirmed and when (ms). */
  doseAttest: { v: number; at: number } | null;
  checkout: { open: boolean; plan: PlanId; interval: Interval; reason: string };
  add: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  load: (ids: string[], extras?: LoadExtras) => boolean;
  setView: (view: View) => void;
  setAtlasEnzyme: (id: string | null) => void;
  openShelf: (cls: string) => void;
  openStation: (id: StationId) => void;
  setPhenotype: (enzyme: PhenotypeEnzyme, value: Metabolizer) => void;
  setSmoking: (smoking: boolean) => void;
  setKetamineRoute: (route: KetamineRoute) => void;
  setCannabisRoute: (route: CannabisRoute) => void;
  setAlcohol: (alcohol: AlcoholPattern) => void;
  setAge: (age: AgeBand) => void;
  setKidney: (kidney: KidneyBand) => void;
  setPreg: (preg: PregBand) => void;
  setDose: (id: string, value: string) => void;
  markStudy: (id: string, grade: StudyGrade) => void;
  clearStudy: () => void;
  resetPhenotypes: () => void;
  openCheckout: (plan: PlanId, reason?: string, interval?: Interval) => void;
  closeCheckout: () => void;
  setCheckoutInterval: (interval: Interval) => void;
  startPreview: () => void;
  /** Returns false when the key was not applied (a program key on a desk that already has Founding for life). */
  activateLicense: (opts: { plan: PlanId; license: string; lifetime: boolean; program?: ProgramGrant | null }) => boolean;
  /** Falls back to the free desk if the program license has ended. Returns true when it did. */
  checkProgram: (now?: number) => boolean;
  /** Applies the server's verdict on the saved key `checked`. Returns true when the desk went back to free. */
  applyLicenseCheck: (checked: string | null, verdict: LicenseVerdict) => boolean;
  dismissProgramNote: () => void;
  dismissActivated: () => void;
  ackHcp: () => void;
  attestDose: () => void;
  downgrade: () => void;
}

/** Bump when the attestation wording changes: every browser is asked again. */
export const DOSE_ATTEST_VERSION = 1;

export const doseAttested = (s: Pick<DeskState, "doseAttest">) => s.doseAttest?.v === DOSE_ATTEST_VERSION;

function activePlan(
  s: { plan: PlanId; previewUntil: number | null; program?: ProgramGrant | null },
  now: number = Date.now(),
): PlanId {
  if (s.program && programEnded(s.program, now)) return "free";
  if (s.plan === "pro" || s.plan === "lab") return s.plan;
  if (s.previewUntil && now < s.previewUntil) return "pro";
  return "free";
}

type ProgramState = Pick<
  DeskState,
  | "plan"
  | "license"
  | "lifetime"
  | "program"
  | "programNote"
  | "selected"
  | "doses"
  | "phenotypes"
  | "smoking"
  | "cannabisRoute"
  | "alcohol"
  | "age"
  | "kidney"
  | "preg"
>;

/**
 * The free desk a learner lands on when their program license has ended, or
 * null while it still runs (and for every personal key). Keeps up to five drugs
 * and the free ketamine route; clears the host factors only a license opens.
 */
export function programFallback(s: ProgramState, now: number = Date.now()): Partial<DeskState> | null {
  if (!s.program || !programEnded(s.program, now)) return null;
  return freeDeskFallback(s, programEndedNote(s.program));
}

/**
 * What the server's verdict on the saved key changes, or null when nothing does.
 * Applies only while the desk still holds the key that was checked, so a redeem in between wins.
 * "unavailable" (the server could not check) changes nothing; "invalid" returns the free desk.
 * A valid key sets plan, lifetime and program term from the key itself.
 */
export function licenseCheckOutcome(
  s: ProgramState,
  checked: string | null,
  verdict: LicenseVerdict,
  now: number = Date.now(),
): Partial<DeskState> | null {
  if (s.plan === "free" || s.license !== checked) return null;
  if (verdict.status === "unavailable") return null;
  if (verdict.status === "invalid") {
    // A program term that ran out keeps its own note.
    return programFallback(s, now) ?? freeDeskFallback(s, KEY_NOT_VERIFIED_NOTE);
  }
  const program = verdict.program ? normalizeProgramGrant(verdict.program) : null;
  const sameProgram =
    s.program === program || (!!s.program && !!program && s.program.tier === program.tier && s.program.endsAt === program.endsAt);
  if (s.plan === verdict.plan && s.lifetime === verdict.lifetime && sameProgram) return null;
  return { plan: verdict.plan, lifetime: verdict.lifetime, program };
}

/** Back to the free desk with a one-line note: first five drugs and their amounts, host factors reset. */
function freeDeskFallback(s: ProgramState, note: string): Partial<DeskState> {
  const selected = (Array.isArray(s.selected) ? s.selected : [])
    .filter((id): id is string => typeof id === "string")
    .slice(0, maxDrugs("free"));
  const doses = s.doses && typeof s.doses === "object" && !Array.isArray(s.doses) ? s.doses : {};
  return {
    plan: "free",
    license: null,
    lifetime: false,
    program: null,
    programNote: note,
    justActivated: false,
    selected,
    doses: Object.fromEntries(
      selected
        .map((id) => [id, doses[id]] as const)
        .filter((row): row is [string, string] => typeof row[1] === "string" && row[1].length > 0),
    ),
    phenotypes: { ...DEFAULT_PHENOTYPES },
    smoking: false,
    cannabisRoute: "smoked",
    alcohol: "off",
    age: "adult",
    kidney: "ok",
    preg: "off",
  };
}

/** Set by the persist merge when a saved program license had already ended. */
let endedOnLoad = false;
/** Set when the blob was corrupt or a field was repaired, so the bad JSON is replaced. */
let rewriteOnLoad = false;

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      selected: [],
      view: "desk",
      atlasEnzyme: null,
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
      libraryShelf: "",
      station: null,
      justActivated: false,
      hcpAck: false,
      doseAttest: null,
      checkout: { open: false, plan: "pro", interval: "life", reason: "" },
      add: (id) => {
        if (!isCatalogId(id) || id.startsWith("__")) return false;
        const cur = get().selected;
        if (cur.includes(id)) return true;
        const cap = maxDrugs(activePlan(get()));
        if (cur.length >= cap) {
          set({
            checkout: {
              open: true,
              plan: "pro",
              interval: get().checkout.interval,
              reason: `Free desks hold ${cap} drugs. Founding opens eight.`,
            },
          });
          return false;
        }
        set({ selected: [...cur, id], view: "desk" });
        return true;
      },
      remove: (id) => {
        const next = { ...get().doses };
        delete next[id];
        set({ selected: get().selected.filter((x) => x !== id), doses: next });
      },
      clear: () => {
        const s = get();
        if (s.selected.length > 0) {
          rememberTray(s.selected, { ketamineRoute: s.ketamineRoute });
        }
        set({
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
        });
      },
      load: (ids, extras) => {
        const s0 = get();
        if (s0.selected.length > 0) {
          rememberTray(s0.selected, { ketamineRoute: s0.ketamineRoute });
        }
        const cap = maxDrugs(activePlan(get()));
        const next = ids.filter((id) => isCatalogId(id) && !id.startsWith("__")).slice(0, cap);
        // Oral/IN ketamine route is free for the teaching demo (grapefruit × oral K).
        // Phenotype, smoke, alcohol, and cannabis route come with founding.
        const wantsHost = Boolean(
          extras?.phenotypes ||
            extras?.smoking ||
            extras?.alcohol ||
            extras?.cannabisRoute,
        );
        if (wantsHost && activePlan(get()) === "free") {
          set({
            checkout: {
              open: true,
              plan: "pro",
              interval: get().checkout.interval,
              reason: "That sample uses host factors — phenotype, smoke, alcohol, or cannabis route.",
            },
            selected: next,
            view: "desk",
            phenotypes: { ...DEFAULT_PHENOTYPES },
            smoking: false,
            ketamineRoute: "iv",
            cannabisRoute: "smoked",
            alcohol: "off",
            age: "adult",
            kidney: "ok",
            preg: "off",
            doses: extras?.doses ?? {},
          });
          return false;
        }
        set({
          selected: next,
          view: "desk",
          phenotypes: { ...DEFAULT_PHENOTYPES, ...extras?.phenotypes },
          smoking: extras?.smoking ?? false,
          ketamineRoute: extras?.ketamineRoute ?? "iv",
          cannabisRoute: extras?.cannabisRoute ?? "smoked",
          alcohol: extras?.alcohol ?? "off",
          age: "adult",
          kidney: "ok",
          preg: "off",
          doses: extras?.doses ?? {},
          checkout: { ...get().checkout, open: false },
        });
        return true;
      },
      setView: (view) => {
        // Free users may open atlas; DeskApp wraps EnzymeAtlas in the founding-gate Paywall coach.
        set({ view });
      },
      setAtlasEnzyme: (atlasEnzyme) => {
        if (activePlan(get()) === "free") {
          get().setView("atlas");
          return;
        }
        set({ atlasEnzyme, view: "atlas" });
      },
      openShelf: (cls) => set({ libraryShelf: cls, view: "library" }),
      openStation: (station) => set({ station, view: "desk" }),
      setPhenotype: (enzyme, value) => {
        if (activePlan(get()) === "free") {
          get().openCheckout("lab", foundingGateCopy("host").reason, "life");
          return;
        }
        set({ phenotypes: { ...get().phenotypes, [enzyme]: value } });
      },
      setSmoking: (smoking) => {
        if (activePlan(get()) === "free") {
          get().openCheckout("lab", foundingGateCopy("host").reason, "life");
          return;
        }
        set({ smoking });
      },
      setKetamineRoute: (ketamineRoute) => {
        // Free tier may flip IV/IN/oral so oral ketamine × grapefruit teaches without a key.
        set({ ketamineRoute });
      },
      setCannabisRoute: (cannabisRoute) => {
        if (activePlan(get()) === "free") {
          get().openCheckout("lab", foundingGateCopy("host").reason, "life");
          return;
        }
        set({ cannabisRoute });
      },
      setAlcohol: (alcohol) => {
        if (activePlan(get()) === "free") {
          get().openCheckout("lab", foundingGateCopy("host").reason, "life");
          return;
        }
        set({ alcohol });
      },
      setAge: (age) => {
        if (activePlan(get()) === "free") {
          get().openCheckout("lab", foundingGateCopy("host").reason, "life");
          return;
        }
        set({ age });
      },
      setKidney: (kidney) => {
        if (activePlan(get()) === "free") {
          get().openCheckout("lab", foundingGateCopy("host").reason, "life");
          return;
        }
        set({ kidney });
      },
      setPreg: (preg) => {
        if (activePlan(get()) === "free") {
          get().openCheckout("lab", foundingGateCopy("host").reason, "life");
          return;
        }
        set({ preg });
      },
      setDose: (id, value) => {
        const next = { ...get().doses };
        const trimmed = value.trim();
        if (!trimmed) delete next[id];
        else next[id] = trimmed;
        set({ doses: next });
      },
      markStudy: (id, grade) => {
        const prev = get().studyMarks[id];
        set({ studyMarks: { ...get().studyMarks, [id]: scheduleStudyMark(prev, grade) } });
      },
      clearStudy: () => set({ studyMarks: {} }),
      resetPhenotypes: () =>
        set({
          phenotypes: { ...DEFAULT_PHENOTYPES },
          smoking: false,
          ketamineRoute: "iv",
          cannabisRoute: "smoked",
          alcohol: "off",
          age: "adult",
          kidney: "ok",
          preg: "off",
        }),
      openCheckout: (plan, reason = "", interval) => {
        const resolved = plan === "free" ? "pro" : plan;
        // Founding / lab CTAs always open on lifetime $79 — never month/year leftovers.
        const nextInterval =
          interval ?? (resolved === "lab" ? "life" : get().checkout.interval);
        set({
          view: "plans",
          checkout: { open: true, plan: resolved, interval: nextInterval, reason },
        });
      },
      closeCheckout: () => set({ checkout: { ...get().checkout, open: false } }),
      setCheckoutInterval: (interval) => set({ checkout: { ...get().checkout, interval } }),
      startPreview: () => {
        if (get().previewUsed) return;
        set({
          previewUsed: true,
          previewUntil: Date.now() + 24 * 60 * 60 * 1000,
          checkout: { ...get().checkout, open: false },
          view: "desk",
          justActivated: false,
        });
      },
      activateLicense: ({ plan, license, lifetime, program }) => {
        const grant = program ? normalizeProgramGrant(program) : null;
        // Founding for life already opens everything, and never ends. Keep it.
        if (grant && get().lifetime) return false;
        set({
          plan: plan === "lab" ? "lab" : "pro",
          license,
          lifetime,
          program: grant,
          programNote: null,
          previewUntil: null,
          justActivated: true,
          checkout: { ...get().checkout, open: false },
          view: "desk",
        });
        return true;
      },
      checkProgram: (now = Date.now()) => {
        const next = programFallback(get(), now);
        if (!next) return false;
        set(next);
        return true;
      },
      applyLicenseCheck: (checked, verdict) => {
        const next = licenseCheckOutcome(get(), checked, verdict);
        if (!next) return false;
        set(next);
        return next.plan === "free";
      },
      dismissProgramNote: () => set({ programNote: null }),
      dismissActivated: () => set({ justActivated: false }),
      ackHcp: () => set({ hcpAck: true }),
      attestDose: () => set({ doseAttest: { v: DOSE_ATTEST_VERSION, at: Date.now() } }),
      downgrade: () =>
        set({
          plan: "free",
          license: null,
          lifetime: false,
          program: null,
          previewUntil: null,
          justActivated: false,
          selected: get().selected.slice(0, 2),
          doses: Object.fromEntries(
            get()
              .selected.slice(0, 2)
              .map((id) => [id, get().doses[id]])
              .filter((row): row is [string, string] => Boolean(row[1])),
          ),
        }),
    }),
    {
      name: DESK_STORAGE_KEY,
      skipHydration: true,
      storage: createJSONStorage(deskJsonStorage),
      merge: (persisted, current) => {
        const read = readDeskStorageState(persisted, partializeDesk(current));
        rewriteOnLoad = read.rewrite;
        const merged: DeskState = {
          ...current,
          ...read.state,
          justActivated: false,
        };
        const ended = programFallback(merged);
        endedOnLoad = Boolean(ended);
        return { ...merged, ...ended };
      },
      // Replace a bad blob, and save the free desk when a program term ended while the tab was closed.
      onRehydrateStorage: () => (state) => {
        const write = Boolean(state) && (endedOnLoad || rewriteOnLoad);
        endedOnLoad = false;
        rewriteOnLoad = false;
        if (!write) return;
        useDesk.setState({});
      },
      partialize: (s) => partializeDesk(s),
    },
  ),
);

export function currentPlan(): PlanId {
  return activePlan(useDesk.getState());
}

export function usePlan(): PlanId {
  const plan = useDesk((s) => s.plan);
  const previewUntil = useDesk((s) => s.previewUntil);
  const program = useDesk((s) => s.program);
  return activePlan({ plan, previewUntil, program });
}

export function hostFromState(
  s: Pick<DeskState, "phenotypes" | "smoking" | "ketamineRoute" | "cannabisRoute" | "alcohol" | "age" | "kidney" | "preg">,
): HostContext {
  return {
    phenotypes: s.phenotypes,
    smoking: s.smoking,
    ketamineRoute: s.ketamineRoute,
    cannabisRoute: s.cannabisRoute,
    alcohol: s.alcohol,
    age: s.age,
    kidney: s.kidney,
    preg: s.preg,
  };
}

export { DEFAULT_HOST };
