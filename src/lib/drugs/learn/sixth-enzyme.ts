import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

export function sixthEnzymeCard(d: Drug): StudyCard | null {
  const sixth = d.enzymes[5];
  if (!sixth) return null;
  const seed = `enz6-${d.id}`;
  const distractors = bySeed(
    ENZYMES.filter((enzyme) => enzyme !== sixth.enzyme).map((enzyme) => ({
      id: enzyme,
      label: enzyme,
    })),
    seed,
  ).slice(0, 3);
  return {
    id: seed,
    lane: "desk",
    kicker: "Sixth enzyme",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is stored sixth?",
    choices: bySeed(
      [{ id: sixth.enzyme, label: sixth.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: sixth.enzyme,
    answer: `${d.name} stores ${sixth.enzyme} sixth, as a ${sixth.kind}. Not a clearance.`,
    drugIds: [d.id],
  };
}
