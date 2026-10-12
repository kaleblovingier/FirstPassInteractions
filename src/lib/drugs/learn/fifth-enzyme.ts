import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

export function fifthEnzymeCard(d: Drug): StudyCard | null {
  const fifth = d.enzymes[4];
  if (!fifth) return null;
  const seed = `enz5-${d.id}`;
  const distractors = bySeed(
    ENZYMES.filter((enzyme) => enzyme !== fifth.enzyme).map((enzyme) => ({
      id: enzyme,
      label: enzyme,
    })),
    seed,
  ).slice(0, 3);
  return {
    id: seed,
    lane: "desk",
    kicker: "Fifth enzyme",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is stored fifth?",
    choices: bySeed(
      [{ id: fifth.enzyme, label: fifth.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: fifth.enzyme,
    answer: `${d.name} stores ${fifth.enzyme} fifth, as a ${fifth.kind}. Not a clearance.`,
    drugIds: [d.id],
  };
}
