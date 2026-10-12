import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function thirdFlagCard(d: Drug): StudyCard | null {
  const third = d.pd[2];
  if (!third) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.pd))]
      .filter((flag) => flag !== third)
      .map((flag) => ({ id: flag, label: flag.replace(/-/g, " ") })),
    `flag3-${d.id}`,
  ).slice(0, 3);
  return {
    id: `flag3-${d.id}`,
    lane: "desk",
    kicker: "Third flag",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which effect flag is stored third?",
    choices: bySeed(
      [{ id: third, label: third.replace(/-/g, " ") }, ...distractors],
      `flag3-${d.id}-order`,
    ),
    correct: third,
    answer: `${d.name} stores ${third.replace(/-/g, " ")} third. A flag is not a diagnosis and not a milligram.`,
    drugIds: [d.id],
  };
}
