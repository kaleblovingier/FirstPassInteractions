import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function fourthAliasCard(d: Drug): StudyCard | null {
  const alias = d.aliases[3];
  if (typeof alias !== "string" || alias.length === 0) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.aliases))]
      .filter(
        (name) =>
          name.length > 0 &&
          name !== d.aliases[0] &&
          name !== d.aliases[1] &&
          name !== d.aliases[2] &&
          name !== alias,
      )
      .map((name) => ({ id: name, label: name })),
    `aka4-${d.id}`,
  ).slice(0, 3);
  return {
    id: `aka4-${d.id}`,
    lane: "desk",
    kicker: "Fourth name",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which other name is stored fourth?",
    choices: bySeed([{ id: alias, label: alias }, ...distractors], `aka4-${d.id}-order`),
    correct: alias,
    answer: `${d.name} also stores ${alias} fourth. An alias is not a different map.`,
    drugIds: [d.id],
  };
}
