import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function fourthFlagCard(d: Drug): StudyCard | null {
  const fourth = d.pd[3];
  if (!fourth) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.pd))]
      .filter((flag) => flag !== fourth)
      .map((flag) => ({ id: flag, label: flag.replace(/-/g, " ") })),
    `flag4-${d.id}`,
  ).slice(0, 3);
  return {
    id: `flag4-${d.id}`,
    lane: "desk",
    kicker: "Fourth flag",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which effect flag is stored fourth?",
    choices: bySeed(
      [{ id: fourth, label: fourth.replace(/-/g, " ") }, ...distractors],
      `flag4-${d.id}-order`,
    ),
    correct: fourth,
    answer: `${d.name} stores ${fourth.replace(/-/g, " ")} fourth. A flag is not a diagnosis and not a milligram.`,
    drugIds: [d.id],
  };
}
