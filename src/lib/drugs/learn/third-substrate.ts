import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function thirdSubstrateCard(d: Drug): StudyCard | null {
  const row = substrates(d)[2];
  if (!row) return null;
  const seed = `sub3-${d.id}`;
  const distractors = bySeed(
    ENZYMES.filter((enzyme) => enzyme !== row.enzyme).map((enzyme) => ({
      id: enzyme,
      label: enzyme,
    })),
    seed,
  ).slice(0, 3);
  return {
    id: seed,
    lane: "desk",
    kicker: "Third substrate",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is the third substrate?",
    choices: bySeed(
      [{ id: row.enzyme, label: row.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: row.enzyme,
    answer: `${d.name} stores ${row.enzyme} as a third substrate (${row.sensitivity}, ${row.pathway}). Not a clearance.`,
    drugIds: [d.id],
  };
}
