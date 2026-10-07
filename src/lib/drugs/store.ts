import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DRUG_BY_ID } from "./catalog";
import { rememberTray } from "./tray-history";
import { maxDrugs, type Interval, type PlanId } from "@/lib/billing/plans";
import { foundingGateCopy } from "@/lib/billing/founding-gate";
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
  studyMarks: Record<string, "got" | "miss">;
  plan: PlanId;
  license: string | null;
  lifetime: boolean;
  previewUntil: number | null;
  /** True after a preview has been started on this browser. Not cleared by returning to free. */
  previewUsed: boolean;
  /** Class name to open on the formulary. Not saved. */
  libraryShelf: string;
  justActivated: boolean;
  hcpAck: boolean;
  checkout: { open: boolean; plan: PlanId; interval: Interval; reason: string };
  add: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  load: (ids: string[], extras?: LoadExtras) => boolean;
  setView: (view: View) => void;
  setAtlasEnzyme: (id: string | null) => void;
  openShelf: (cls: string) => void;
  setPhenotype: (enzyme: PhenotypeEnzyme, value: Metabolizer) => void;
  setSmoking: (smoking: boolean) => void;
  setKetamineRoute: (route: KetamineRoute) => void;
  setCannabisRoute: (route: CannabisRoute) => void;
  setAlcohol: (alcohol: AlcoholPattern) => void;
  setAge: (age: AgeBand) => void;
  setKidney: (kidney: KidneyBand) => void;
  setPreg: (preg: PregBand) => void;
  setDose: (id: string, value: string) => void;
  markStudy: (id: string, mark: "got" | "miss") => void;
  clearStudy: () => void;
  resetPhenotypes: () => void;
  openCheckout: (plan: PlanId, reason?: string, interval?: Interval) => void;
  closeCheckout: () => void;
  setCheckoutInterval: (interval: Interval) => void;
  startPreview: () => void;
  activateLicense: (opts: { plan: PlanId; license: string; lifetime: boolean }) => void;
  dismissActivated: () => void;
  ackHcp: () => void;
  downgrade: () => void;
}

function activePlan(s: { plan: PlanId; previewUntil: number | null }): PlanId {
  if (s.plan === "pro" || s.plan === "lab") return s.plan;
  if (s.previewUntil && Date.now() < s.previewUntil) return "pro";
  return "free";
}

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
      previewUntil: null,
      previewUsed: false,
      libraryShelf: "",
      justActivated: false,
      hcpAck: false,
      checkout: { open: false, plan: "pro", interval: "life", reason: "" },
      add: (id) => {
        if (!DRUG_BY_ID[id] || id.startsWith("__")) return false;
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
        const next = ids.filter((id) => DRUG_BY_ID[id] && !id.startsWith("__")).slice(0, cap);
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
      markStudy: (id, mark) => set({ studyMarks: { ...get().studyMarks, [id]: mark } }),
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
      activateLicense: ({ plan, license, lifetime }) =>
        set({
          plan: plan === "lab" ? "lab" : "pro",
          license,
          lifetime,
          previewUntil: null,
          justActivated: true,
          checkout: { ...get().checkout, open: false },
          view: "desk",
        }),
      dismissActivated: () => set({ justActivated: false }),
      ackHcp: () => set({ hcpAck: true }),
      downgrade: () =>
        set({
          plan: "free",
          license: null,
          lifetime: false,
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
      name: "firstpass.desk.v7",
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DeskState>;
        return {
          ...current,
          ...p,
          phenotypes: { ...DEFAULT_PHENOTYPES, ...p.phenotypes },
          age: p.age === "geriatric" ? "geriatric" : "adult",
          kidney: p.kidney === "ckd" ? "ckd" : "ok",
          preg: p.preg === "pregnant" || p.preg === "lactating" ? p.preg : "off",
          doses: p.doses && typeof p.doses === "object" ? p.doses : {},
          studyMarks: p.studyMarks && typeof p.studyMarks === "object" ? p.studyMarks : {},
          justActivated: false,
          hcpAck: Boolean(p.hcpAck),
          previewUsed: Boolean(p.previewUsed) || typeof p.previewUntil === "number",
        };
      },
      partialize: (s) => ({
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
        previewUntil: s.previewUntil,
        previewUsed: s.previewUsed,
        hcpAck: s.hcpAck,
      }),
    },
  ),
);

export function currentPlan(): PlanId {
  return activePlan(useDesk.getState());
}

export function usePlan(): PlanId {
  const plan = useDesk((s) => s.plan);
  const previewUntil = useDesk((s) => s.previewUntil);
  if (plan === "pro" || plan === "lab") return plan;
  if (previewUntil && Date.now() < previewUntil) return "pro";
  return "free";
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
