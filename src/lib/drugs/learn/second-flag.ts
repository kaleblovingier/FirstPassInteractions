import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function secondFlagCard(d: Drug): StudyCard | null {
  const second = d.pd[1];
  if (!second) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.pd))]
      .filter((flag) => flag !== second)
      .map((flag) => ({ id: flag, label: flag.replace(/-/g, " ") })),
    `flag2-${d.id}`,
  ).slice(0, 3);
  return {
    id: `flag2-${d.id}`,
    lane: "desk",
    kicker: "Second flag",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which effect flag is stored second?",
    choices: bySeed(
      [{ id: second, label: second.replace(/-/g, " ") }, ...distractors],
      `flag2-${d.id}-order`,
    ),
    correct: second,
    answer: `${d.name} stores ${second.replace(/-/g, " ")} second. A flag is not a diagnosis and not a milligram.`,
    drugIds: [d.id],
  };
}
