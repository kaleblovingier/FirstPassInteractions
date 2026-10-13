import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

export function secondEnzymeCard(d: Drug): StudyCard | null {
  const second = d.enzymes[1];
  if (!second) return null;
  const seed = `enz2-${d.id}`;
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
    kicker: "Second enzyme",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is stored second?",
    choices: bySeed(
      [{ id: second.enzyme, label: second.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: second.enzyme,
    answer: `${d.name} stores ${second.enzyme} second, as a ${second.kind}. Not a clearance.`,
    drugIds: [d.id],
  };
}
