import { DRUGS } from "./catalog";
import { ENZYMES, type Drug, type Enzyme, type EnzymeRole } from "./types";

export type ShelfRole = "any" | EnzymeRole["kind"];

export type EnzymeShelfCount = {
  enzyme: Enzyme;
  any: number;
  substrate: number;
  inhibitor: number;
  inducer: number;
};

function hasRole(drug: Drug, enzyme: Enzyme, role: ShelfRole) {
  return drug.enzymes.some((row) => row.enzyme === enzyme && (role === "any" || row.kind === role));
}

/** Names that already store this enzyme and, when set, this role. Not a collision. */
export function drugsWithRole(enzyme: Enzyme, role: ShelfRole): Drug[] {
  return DRUGS.filter((drug) => hasRole(drug, enzyme, role)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function enzymeShelfCounts(): EnzymeShelfCount[] {
  return ENZYMES.map((enzyme) => ({
    enzyme,
    any: drugsWithRole(enzyme, "any").length,
    substrate: drugsWithRole(enzyme, "substrate").length,
    inhibitor: drugsWithRole(enzyme, "inhibitor").length,
    inducer: drugsWithRole(enzyme, "inducer").length,
  }));
}
