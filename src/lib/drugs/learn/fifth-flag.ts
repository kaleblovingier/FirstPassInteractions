import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function fifthFlagCard(d: Drug): StudyCard | null {
  const fifth = d.pd[4];
  if (!fifth) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.pd))]
      .filter((flag) => flag !== fifth)
      .map((flag) => ({ id: flag, label: flag.replace(/-/g, " ") })),
    `flag5-${d.id}`,
  ).slice(0, 3);
  return {
    id: `flag5-${d.id}`,
    lane: "desk",
    kicker: "Fifth flag",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which effect flag is stored fifth?",
    choices: bySeed(
      [{ id: fifth, label: fifth.replace(/-/g, " ") }, ...distractors],
      `flag5-${d.id}-order`,
    ),
    correct: fifth,
    answer: `${d.name} stores ${fifth.replace(/-/g, " ")} fifth. A flag is not a diagnosis and not a milligram.`,
    drugIds: [d.id],
  };
}
