import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

export function seventhEnzymeCard(d: Drug): StudyCard | null {
  const seventh = d.enzymes[6];
  if (!seventh) return null;
  const seed = `enz7-${d.id}`;
  const distractors = bySeed(
    ENZYMES.filter((enzyme) => enzyme !== seventh.enzyme).map((enzyme) => ({
      id: enzyme,
      label: enzyme,
    })),
    seed,
  ).slice(0, 3);
  return {
    id: seed,
    lane: "desk",
    kicker: "Seventh enzyme",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is stored seventh?",
    choices: bySeed(
      [{ id: seventh.enzyme, label: seventh.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: seventh.enzyme,
    answer: `${d.name} stores ${seventh.enzyme} seventh, as a ${seventh.kind}. Not a clearance.`,
    drugIds: [d.id],
  };
}
