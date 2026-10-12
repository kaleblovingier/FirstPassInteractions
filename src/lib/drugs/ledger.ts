import { DRUG_BY_ID } from "./catalog";
import { ENZYMES, type EnzymeRole } from "./types";

export type LedgerSeat = {
  enzyme: string;
  kind: "substrate" | "inhibitor" | "inducer";
  detail: string;
};

export type LedgerDrug = {
  id: string;
  name: string;
  seats: LedgerSeat[];
};

export type SharedSeat = {
  id: string;
  name: string;
  kind: LedgerSeat["kind"];
  detail: string;
};

export type SharedEnzyme = {
  enzyme: string;
  seats: SharedSeat[];
};

function seatDetail(role: EnzymeRole): string {
  if (role.kind === "substrate") {
    const base = `${role.sensitivity} ${role.pathway}`;
    return role.nti ? `${base}, narrow index` : base;
  }
  return role.strength;
}

function resolved(ids: readonly string[]) {
  const out = [];
  for (const id of ids) {
    const drug = DRUG_BY_ID[id];
    if (drug) out.push(drug);
  }
  return out;
}

/** Stored enzyme rows for the names already on the desk. Not a severity. */
export function ledgerFor(ids: readonly string[]): LedgerDrug[] {
  return resolved(ids).map((drug) => ({
    id: drug.id,
    name: drug.name,
    seats: drug.enzymes.map((role) => ({
      enzyme: role.enzyme,
      kind: role.kind,
      detail: seatDetail(role),
    })),
  }));
}

/** An enzyme two different names both store. One drug's two rows do not count. */
export function sharedEnzymes(ids: readonly string[]): SharedEnzyme[] {
  const seats = new Map<string, SharedSeat[]>();
  for (const drug of ledgerFor(ids)) {
    for (const seat of drug.seats) {
      const list = seats.get(seat.enzyme) ?? [];
      list.push({ id: drug.id, name: drug.name, kind: seat.kind, detail: seat.detail });
      seats.set(seat.enzyme, list);
    }
  }
  const shared: SharedEnzyme[] = [];
  for (const enzyme of ENZYMES) {
    const rows = seats.get(enzyme);
    if (!rows) continue;
    if (new Set(rows.map((row) => row.id)).size < 2) continue;
    shared.push({ enzyme, seats: rows });
  }
  return shared;
}

export function countFourthEnzymes(ids: readonly string[]) {
  return resolved(ids).filter((drug) => drug.enzymes.length > 3).length;
}

export function countThirdSubstrates(ids: readonly string[]) {
  return resolved(ids).filter(
    (drug) => drug.enzymes.filter((role) => role.kind === "substrate").length >= 3,
  ).length;
}

export function countNarrowIndex(ids: readonly string[]) {
  return resolved(ids).filter((drug) =>
    drug.enzymes.some((role) => role.kind === "substrate" && role.nti),
  ).length;
}
