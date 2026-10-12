import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { ENZYMES } from "../types";
import { bySeed } from "./learn-order";

export function fourthEnzymeCard(d: Drug): StudyCard | null {
  const fourth = d.enzymes[3];
  if (!fourth) return null;
  const seed = `enz4-${d.id}`;
  const distractors = bySeed(
    ENZYMES.filter((enzyme) => enzyme !== fourth.enzyme).map((enzyme) => ({
      id: enzyme,
      label: enzyme,
    })),
    seed,
  ).slice(0, 3);
  return {
    id: seed,
    lane: "desk",
    kicker: "Fourth enzyme",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which enzyme is stored fourth?",
    choices: bySeed(
      [{ id: fourth.enzyme, label: fourth.enzyme }, ...distractors],
      `${seed}-order`,
    ),
    correct: fourth.enzyme,
    answer: `${d.name} stores ${fourth.enzyme} fourth, as a ${fourth.kind}. Not a clearance.`,
    drugIds: [d.id],
  };
}
