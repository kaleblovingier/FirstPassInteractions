/**
 * Label sentences that name a perpetrator and do not use strong, moderate, or weak.
 * Educational reference only. Not FDA-cleared. The Prescribing Information governs.
 *
 * These rows are not EnzymeRole values. engine.ts does not import this module, and
 * pkSeverity() never sees them. A sentence here is not a grade, a pin, or a tier.
 */
import { DRUG_BY_ID } from "./catalog";
import type { Enzyme } from "./types";

export const UNGRADED_DISCLAIMER =
  "Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

/** Drugs whose labels name a perpetrator and whose scored inh()/ind() rows stay empty. */
export const UNGRADED_PERPETRATOR_IDS = [
  "fedratinib",
  "mavacamten",
  "mavorixafor",
  "vanzacaftor-tezacaftor-deutivacaftor",
  "etripamil",
  "tradipitant",
  "zoliflodacin",
] as const;

export type UngradedPerpetratorId = (typeof UNGRADED_PERPETRATOR_IDS)[number];

export type UngradedDirection = "inhibitor" | "inducer";

export interface UngradedPerpetrator {
  drugId: UngradedPerpetratorId;
  enzymes: readonly Enzyme[];
  direction: UngradedDirection;
  /** What the label says. No strength word is added. */
  sentence: string;
  href: string;
  linkLabel: string;
}

export interface UngradedPairNote {
  /** Sorted pair key, same shape as the check board. */
  key: string;
  perpetratorId: string;
  perpetratorName: string;
  substrateId: string;
  substrateName: string;
  enzymes: Enzyme[];
  directions: UngradedDirection[];
  sentence: string;
  href: string;
  linkLabel: string;
  /** Plain-language line. Includes the label sentence and the disclaimer. No tier. */
  line: string;
}

const DAILYMED = "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=";

function dailyMed(setid: string): string {
  return `${DAILYMED}${setid}`;
}

const LINK = "DailyMed label";

/**
 * Explicit list. Fold changes in a label are not turned into a strength here.
 * In vitro lines keep the label's own qualifier. A negative in vivo study stays in the sentence.
 */
export const UNGRADED_PERPETRATORS: readonly UngradedPerpetrator[] = [
  {
    drugId: "fedratinib",
    enzymes: ["CYP3A4", "CYP2C19", "CYP2D6"],
    direction: "inhibitor",
    sentence:
      "Section 7.2: Coadministration of INREBIC with drugs that are CYP3A4 substrates, CYP2C19 substrates, or CYP2D6 substrates increases the concentrations of these drugs, which may increase the risk of adverse reactions of these drugs. The label does not use a strength word for that effect.",
    href: dailyMed("f0f55a2a-4e0c-4cba-8571-03e1424486d7"),
    linkLabel: LINK,
  },
  {
    drugId: "mavacamten",
    enzymes: ["CYP3A4", "CYP2C9", "CYP2C19"],
    direction: "inducer",
    sentence:
      'Section 7.2: "Mavacamten is an inducer of CYP3A4, CYP2C9, and CYP2C19." The label gives no inducer strength.',
    href: dailyMed("669c936b-3ee6-4e36-8a22-79dd11b1255b"),
    linkLabel: LINK,
  },
  {
    drugId: "mavorixafor",
    enzymes: ["CYP2D6"],
    direction: "inhibitor",
    sentence:
      'Section 7.2: "Mavorixafor is a CYP2D6 inhibitor." Section 4: "Use of XOLREMDI is contraindicated with drugs that are highly dependent on CYP2D6 for clearance." The label gives no strength word, so this desk does not turn that sentence into a scored tier.',
    href: dailyMed("7f3a5ee3-ca73-4876-85a0-ed1e108a2237"),
    linkLabel: LINK,
  },
  {
    drugId: "mavorixafor",
    enzymes: ["CYP3A4"],
    direction: "inhibitor",
    sentence:
      'Section 7.2: "Mavorixafor is an inhibitor of CYP3A4." The labeled action is more frequent monitoring where minimal substrate concentration changes may lead to serious adverse reactions. The label names no strength.',
    href: dailyMed("7f3a5ee3-ca73-4876-85a0-ed1e108a2237"),
    linkLabel: LINK,
  },
  {
    drugId: "mavorixafor",
    enzymes: ["P-gp"],
    direction: "inhibitor",
    sentence:
      'Section 7.2: "Mavorixafor is an inhibitor of P-gp." The label names no strength.',
    href: dailyMed("7f3a5ee3-ca73-4876-85a0-ed1e108a2237"),
    linkLabel: LINK,
  },
  {
    drugId: "vanzacaftor-tezacaftor-deutivacaftor",
    enzymes: ["P-gp"],
    direction: "inhibitor",
    sentence:
      'Section 7.2: "Tezacaftor and deutivacaftor (components of ALYFTREK) are P-gp inhibitors." The label names no strength.',
    href: dailyMed("7e635909-c6fd-4f0d-ae77-cdff03653a20"),
    linkLabel: LINK,
  },
  {
    drugId: "vanzacaftor-tezacaftor-deutivacaftor",
    enzymes: ["CYP2C8", "CYP2C9", "CYP3A4"],
    direction: "inhibitor",
    sentence:
      'Section 12.3: "Deutivacaftor inhibits CYP2C8, CYP2C9, and CYP3A4" in vitro. CYP2C9-substrate use has not been studied clinically. A tezacaftor/ivacaftor study found no clinically significant midazolam change. "Vanzacaftor, tezacaftor, and deutivacaftor do not induce CYP3A4." The label names no strength.',
    href: dailyMed("7e635909-c6fd-4f0d-ae77-cdff03653a20"),
    linkLabel: LINK,
  },
  {
    drugId: "etripamil",
    enzymes: ["CYP2D6", "CYP3A4", "CYP2C9"],
    direction: "inhibitor",
    sentence:
      'Section 12.3, in vitro: "Etripamil inhibits CYP2D6, CYP3A4, and CYP2C9 but does not inhibit CYP2B6 or CYP2C8." The label gives no strength and has no section 7 interaction table. "Etripamil does not induce CYP1A2, CYP2B6, or CYP3A4."',
    href: dailyMed("a92170b9-4f93-4b83-b2cd-cb85c52821cd"),
    linkLabel: LINK,
  },
  {
    drugId: "tradipitant",
    enzymes: ["CYP3A4"],
    direction: "inhibitor",
    sentence:
      'Section 12.3: "Based on in vitro studies, tradipitant may inhibit and induce CYP3A4. However, an in vivo study showed no clinically significant differences in midazolam pharmacokinetics when co-administered with tradipitant." The label names no strength.',
    href: dailyMed("1a021ebd-16ac-4354-b4b2-1c3950c091e5"),
    linkLabel: LINK,
  },
  {
    drugId: "tradipitant",
    enzymes: ["CYP3A4"],
    direction: "inducer",
    sentence:
      'Section 12.3: "Based on in vitro studies, tradipitant may inhibit and induce CYP3A4. However, an in vivo study showed no clinically significant differences in midazolam pharmacokinetics when co-administered with tradipitant." The label names no strength.',
    href: dailyMed("1a021ebd-16ac-4354-b4b2-1c3950c091e5"),
    linkLabel: LINK,
  },
  {
    drugId: "zoliflodacin",
    enzymes: ["CYP2C8", "CYP2C9", "CYP2C19"],
    direction: "inhibitor",
    sentence:
      'Section 12.3: "Zoliflodacin inhibited CYP2C8, CYP2C9, and CYP2C19 at IC50 values that were approximately 14- to 28-fold higher than the anticipated unbound therapeutic plasma concentrations (total concentrations 2.5 to 5-fold higher)." The label names no strength.',
    href: dailyMed("4beda35a-21b0-4b34-84ea-be6ea8cae50f"),
    linkLabel: LINK,
  },
];

export function ungradedPerpetratorsFor(drugId: string): readonly UngradedPerpetrator[] {
  return UNGRADED_PERPETRATORS.filter((row) => row.drugId === drugId);
}

export function monographRoleEmpty(drugId: string, direction: UngradedDirection): string {
  const named = ungradedPerpetratorsFor(drugId).some((row) => row.direction === direction);
  if (!named) return direction === "inhibitor" ? "Not a mapped inhibitor" : "Not a mapped inducer";
  const word = direction === "inhibitor" ? "inhibitor" : "inducer";
  return `The label named an ${word} and this desk did not assign a strength.`;
}

function joinEnzymes(enzymes: readonly Enzyme[]): string {
  if (enzymes.length <= 1) return enzymes[0] ?? "";
  if (enzymes.length === 2) return `${enzymes[0]} and ${enzymes[1]}`;
  return `${enzymes.slice(0, -1).join(", ")}, and ${enzymes[enzymes.length - 1]}`;
}

function directionPhrase(directions: readonly UngradedDirection[]): string {
  const hasInh = directions.includes("inhibitor");
  const hasInd = directions.includes("inducer");
  if (hasInh && hasInd) return "inhibitor and inducer";
  return hasInd ? "inducer" : "inhibitor";
}

function pairLine(
  name: string,
  enzymes: readonly Enzyme[],
  directions: readonly UngradedDirection[],
  sentence: string,
): string {
  return `The ${name} label names a ${joinEnzymes(enzymes)} ${directionPhrase(directions)} and this desk did not assign a strength. ${sentence} ${UNGRADED_DISCLAIMER}`;
}

function substrateEnzymes(drugId: string): Set<Enzyme> {
  const drug = DRUG_BY_ID[drugId];
  return new Set(
    (drug?.enzymes ?? []).filter((role) => role.kind === "substrate").map((role) => role.enzyme),
  );
}

export function ungradedPairNotes(aId: string, bId: string): UngradedPairNote[] {
  const out: UngradedPairNote[] = [];
  for (const [perpId, subId] of [
    [aId, bId],
    [bId, aId],
  ] as const) {
    const perp = DRUG_BY_ID[perpId];
    const sub = DRUG_BY_ID[subId];
    if (!perp || !sub || perpId === subId) continue;
    const substrates = substrateEnzymes(subId);
    const grouped = new Map<
      string,
      { row: UngradedPerpetrator; enzymes: Enzyme[]; directions: UngradedDirection[] }
    >();
    for (const row of ungradedPerpetratorsFor(perpId)) {
      const hit = row.enzymes.filter((enzyme) => substrates.has(enzyme));
      if (!hit.length) continue;
      const groupKey = `${row.sentence}\n${row.href}`;
      const existing = grouped.get(groupKey);
      if (!existing) {
        grouped.set(groupKey, { row, enzymes: [...hit], directions: [row.direction] });
        continue;
      }
      for (const enzyme of hit) {
        if (!existing.enzymes.includes(enzyme)) existing.enzymes.push(enzyme);
      }
      if (!existing.directions.includes(row.direction)) existing.directions.push(row.direction);
    }
    for (const group of grouped.values()) {
      out.push({
        key: [perpId, subId].sort().join("|"),
        perpetratorId: perpId,
        perpetratorName: perp.name,
        substrateId: subId,
        substrateName: sub.name,
        enzymes: group.enzymes,
        directions: group.directions,
        sentence: group.row.sentence,
        href: group.row.href,
        linkLabel: group.row.linkLabel,
        line: pairLine(perp.name, group.enzymes, group.directions, group.row.sentence),
      });
    }
  }
  return out;
}

export function ungradedNotesForTray(ids: readonly string[]): UngradedPairNote[] {
  const real = ids.filter((id) => DRUG_BY_ID[id]);
  const out: UngradedPairNote[] = [];
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) {
      out.push(...ungradedPairNotes(real[i], real[j]));
    }
  }
  return out;
}

/**
 * Quiet-pair explanation. Stored enzyme rows decide the base sentence.
 * An ungraded label sentence is appended and is never a severity.
 * "No perpetrator was mapped" is not used once a matching annotation exists.
 */
export function pairBlankReason(aId: string, bId: string): string {
  const notes = ungradedPairNotes(aId, bId);
  return scrubBlankReason(storedBlankReason(aId, bId), notes);
}

export function unscoredPerpetratorClause(ids: readonly string[], enzyme: string): string | null {
  const named = ids.some((id) =>
    ungradedPerpetratorsFor(id).some((row) => row.enzymes.some((namedEnzyme) => namedEnzyme === enzyme)),
  );
  if (!named) return null;
  return `${enzyme}, label names an unscored perpetrator`;
}

function storedBlankReason(aId: string, bId: string): string {
  const a = DRUG_BY_ID[aId];
  const b = DRUG_BY_ID[bId];
  if (!a || !b) return "Not a clearance.";
  const substrates = (id: string) => DRUG_BY_ID[id]?.enzymes.filter((role) => role.kind === "substrate") ?? [];
  const perps = (id: string) => DRUG_BY_ID[id]?.enzymes.filter((role) => role.kind !== "substrate") ?? [];
  const shared = [...new Set(substrates(aId).map((role) => role.enzyme))].filter((enzyme) =>
    substrates(bId).some((role) => role.enzyme === enzyme),
  );
  const near = (perpId: string, otherId: string) =>
    perps(perpId).find((role) => !substrates(otherId).some((roleOnOther) => roleOnOther.enzyme === role.enzyme));
  const fromA = near(aId, bId);
  const fromB = near(bId, aId);
  const miss = fromA ? { name: a.name, role: fromA, other: b.name } : fromB ? { name: b.name, role: fromB, other: a.name } : null;
  const verb = miss?.role.kind === "inducer" ? "speeds" : "slows";
  if (shared.length && miss) {
    return `No perpetrator on shared ${shared[0]}. ${miss.name} ${verb} ${miss.role.enzyme}, and ${miss.other} is not on it.`;
  }
  if (shared.length) {
    return `Both are ${shared.slice(0, 2).join(" and ")} substrates. No perpetrator was mapped.`;
  }
  if (miss) {
    return `${miss.name} ${verb} ${miss.role.enzyme}. ${miss.other} is not a ${miss.role.enzyme} substrate on this map.`;
  }
  return "No shared enzyme and no stacked-effect row on this map.";
}

function scrubBlankReason(base: string, notes: readonly UngradedPairNote[]): string {
  if (!notes.length) return base;
  const covered = new Set(notes.flatMap((note) => note.enzymes));
  let text = base;
  const sharedLead = text.match(/^No perpetrator on shared ([A-Za-z0-9-]+)\. /);
  if (sharedLead && covered.has(sharedLead[1] as Enzyme)) {
    text = text.replace(sharedLead[0], "");
  }
  if (text.includes("No perpetrator was mapped.")) {
    text = text.replace(
      "No perpetrator was mapped.",
      "A label sentence names a perpetrator this desk did not score.",
    );
  }
  if (text.trim() === "No shared enzyme and no stacked-effect row on this map.") {
    text = "";
  }
  const body = notes
    .map((note) => note.line.replace(` ${UNGRADED_DISCLAIMER}`, ""))
    .join(" ");
  const hrefs = [...new Set(notes.map((note) => note.href))].join(" ");
  return [text.trim(), body, hrefs, UNGRADED_DISCLAIMER].filter(Boolean).join(" ");
}
