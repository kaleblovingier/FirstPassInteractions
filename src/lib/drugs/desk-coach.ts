import { DRUG_BY_ID } from "./catalog";
import type { PhenotypeEnzyme } from "./types";

export type DeskCoachAction =
  | { kind: "add"; id: string; label: string }
  | { kind: "phenotype"; enzyme: PhenotypeEnzyme; value: "PM" | "UM"; label: string }
  | { kind: "smoking"; on: boolean; label: string }
  | { kind: "view"; view: "library" | "rounds" | "study"; label: string };

export interface DeskCoachTip {
  headline: string;
  why: string;
  actions: DeskCoachAction[];
}

const PARTNERS_BY_ENZYME: Record<string, { id: string; label: string }[]> = {
  CYP3A4: [
    { id: "clarithromycin", label: "Add clarithromycin" },
    { id: "grapefruit", label: "Add grapefruit" },
    { id: "itraconazole", label: "Add itraconazole" },
  ],
  CYP2D6: [
    { id: "paroxetine", label: "Add paroxetine" },
    { id: "fluoxetine", label: "Add fluoxetine" },
  ],
  CYP2C19: [
    { id: "omeprazole", label: "Add omeprazole" },
    { id: "fluvoxamine", label: "Add fluvoxamine" },
  ],
  CYP2C9: [
    { id: "amiodarone", label: "Add amiodarone" },
    { id: "fluconazole", label: "Add fluconazole" },
  ],
  CYP1A2: [
    { id: "fluvoxamine", label: "Add fluvoxamine" },
    { id: "ciprofloxacin", label: "Add ciprofloxacin" },
  ],
};

const FALLBACK_ADDS: { id: string; label: string }[] = [
  { id: "grapefruit", label: "Try grapefruit" },
  { id: "clarithromycin", label: "Try clarithromycin" },
  { id: "paroxetine", label: "Try paroxetine" },
];

function present(id: string, selected: Set<string>) {
  return Boolean(DRUG_BY_ID[id]) && !selected.has(id);
}

/**
 * Plain-language next steps when the desk has items but no mapped findings.
 * Empty is not “safe” — it usually means need another item, a host flip, or the pair is unmapped.
 */
export function buildDeskCoach(ids: string[]): DeskCoachTip | null {
  const clean = ids.filter((id) => DRUG_BY_ID[id]);
  if (clean.length === 0) return null;

  const selected = new Set(clean);
  const actions: DeskCoachAction[] = [];
  const seen = new Set<string>();

  function pushAdd(id: string, label: string) {
    const key = `add:${id}`;
    if (seen.has(key) || !present(id, selected)) return;
    seen.add(key);
    actions.push({ kind: "add", id, label });
  }

  for (const id of clean) {
    const drug = DRUG_BY_ID[id]!;
    for (const role of drug.enzymes) {
      if (role.kind !== "substrate") continue;
      const partners = PARTNERS_BY_ENZYME[role.enzyme] ?? [];
      for (const p of partners) pushAdd(p.id, p.label);
    }
  }

  // Single-item desks: phenotype flips often surface geno findings (DXM PM, codeine UM).
  if (clean.length === 1) {
    const drug = DRUG_BY_ID[clean[0]]!;
    const subs = drug.enzymes.filter((e) => e.kind === "substrate");
    if (subs.some((e) => e.enzyme === "CYP2D6")) {
      actions.push({
        kind: "phenotype",
        enzyme: "CYP2D6",
        value: "PM",
        label: "Flip CYP2D6 to poor",
      });
    }
    if (subs.some((e) => e.enzyme === "CYP2D6" && e.pathway === "activation")) {
      actions.push({
        kind: "phenotype",
        enzyme: "CYP2D6",
        value: "UM",
        label: "Flip CYP2D6 to ultrarapid",
      });
    }
    if (subs.some((e) => e.enzyme === "CYP1A2")) {
      actions.push({ kind: "smoking", on: true, label: "Turn daily smoke on" });
    }
  }

  if (actions.filter((a) => a.kind === "add").length === 0) {
    for (const p of FALLBACK_ADDS) pushAdd(p.id, p.label);
  }

  actions.push({ kind: "view", view: "rounds", label: "Open a teaching round" });
  actions.push({ kind: "view", view: "library", label: "Browse the library" });

  const trimmed = actions.slice(0, 6);

  if (clean.length === 1) {
    const name = DRUG_BY_ID[clean[0]]!.name;
    return {
      headline: "Why nothing collided yet",
      why: `${name} is alone on the desk. Mapped pair findings need a second item — or a host flip (phenotype, smoke, alcohol) for some single-drug stories. An empty panel is not proof this medicine is “safe alone.”`,
      actions: trimmed,
    };
  }

  const names = clean.map((id) => DRUG_BY_ID[id]!.name).join(" · ");
  return {
    headline: "No mapped finding for this set",
    why: `${names} did not fire a row in this map. That can mean the pair is unmapped here, or the collision needs a host change (poor metabolizer, daily smoke, chronic alcohol). Empty is not clearance — check the label and a clinician.`,
    actions: trimmed,
  };
}
