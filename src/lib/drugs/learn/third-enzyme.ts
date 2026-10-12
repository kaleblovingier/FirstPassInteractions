import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

export function thirdEnzymeCard(d: Drug): StudyCard | null {
  const third = d.enzymes[2];
  if (!third) return null;
  const seed = `enz3-${d.id}`;
  const distractors = bySeed(
    ENZYMES.filter((enzyme) => enzyme !== third.enzyme).map((enzyme) => ({
      id: enzyme,
      label: enzyme,
    })),
    seed,
  ).slice(0, 3);
  return {
    id: seed,
    lane: "desk",
    kicker: "Third enzyme",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is stored third?",
    choices: bySeed(
      [{ id: third.enzyme, label: third.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: third.enzyme,
    answer: `${d.name} stores ${third.enzyme} third, as a ${third.kind}. Not a clearance.`,
    drugIds: [d.id],
  };
}
