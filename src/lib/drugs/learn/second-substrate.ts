import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function secondSubstrateCard(d: Drug): StudyCard | null {
  const second = substrates(d)[1];
  if (!second) return null;
  const seed = `sub2-${d.id}`;
  const distractors = bySeed(
    ENZYMES.filter((enzyme) => enzyme !== second.enzyme).map((enzyme) => ({
      id: enzyme,
      label: enzyme,
    })),
    seed,
  ).slice(0, 3);
  return {
    id: seed,
    lane: "desk",
    kicker: "Second substrate",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is the second substrate?",
    choices: bySeed(
      [{ id: second.enzyme, label: second.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: second.enzyme,
    answer: `${d.name} stores ${second.enzyme} as a second substrate (${second.sensitivity}, ${second.pathway}). Not a clearance.`,
    drugIds: [d.id],
  };
}
