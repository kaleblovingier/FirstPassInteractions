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
  return narrowIndexNames(ids).length;
}

export type Meeting = "perpetrator-substrate" | "substrates-only" | "perpetrators-only";

/** Two different names, one a substrate and one a perpetrator. Not a severity. */
export function meetingOf(seats: readonly SharedSeat[]): Meeting {
  const substrates = new Set(seats.filter((seat) => seat.kind === "substrate").map((seat) => seat.id));
  const perpetrators = new Set(seats.filter((seat) => seat.kind !== "substrate").map((seat) => seat.id));
  for (const substrateId of substrates) {
    for (const perpetratorId of perpetrators) {
      if (substrateId !== perpetratorId) return "perpetrator-substrate";
    }
  }
  if (substrates.size > 0) return "substrates-only";
  return "perpetrators-only";
}

export function meetingLine(meeting: Meeting): string {
  if (meeting === "perpetrator-substrate") {
    return "Perpetrator meets substrate. The pair check is the severity. Not a new finding.";
  }
  if (meeting === "substrates-only") {
    return "Shared substrate. No perpetrator stored on this enzyme.";
  }
  return "Shared perpetrator. No substrate stored on this enzyme.";
}

export function countMeetings(ids: readonly string[]) {
  return sharedEnzymes(ids).filter((row) => meetingOf(row.seats) === "perpetrator-substrate").length;
}

export function narrowIndexNames(ids: readonly string[]): string[] {
  return resolved(ids)
    .filter((drug) => drug.enzymes.some((role) => role.kind === "substrate" && role.nti))
    .map((drug) => drug.name);
}

/** Plain text of the stored rows. Not a chart note and not a milligram. */
export function ledgerPlain(ids: readonly string[]): string {
  const drugs = ledgerFor(ids);
  const lines = [
    "Stored enzyme ledger. Not a clearance and not a milligram.",
  ];
  for (const drug of drugs) {
    lines.push(drug.name);
    if (drug.seats.length === 0) {
      lines.push("No enzyme row stored.");
      continue;
    }
    for (const seat of drug.seats) {
      lines.push(`${seat.enzyme} · ${seat.kind} · ${seat.detail}`);
    }
  }
  const shared = sharedEnzymes(ids);
  if (shared.length > 0) {
    lines.push("Shared on this desk");
    for (const row of shared) {
      const seats = row.seats.map((seat) => `${seat.name} ${seat.kind} ${seat.detail}`).join(" · ");
      lines.push(`${row.enzyme} · ${seats}`);
      lines.push(meetingLine(meetingOf(row.seats)));
    }
  }
  const narrow = narrowIndexNames(ids);
  if (narrow.length > 0) {
    lines.push(`Narrow index stored: ${narrow.join(", ")}. A flag is not a clearance.`);
  }
  return lines.join("\n");
}
