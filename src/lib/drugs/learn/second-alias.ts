import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function secondAliasCard(d: Drug): StudyCard | null {
  const alias = d.aliases[1];
  if (typeof alias !== "string" || alias.length === 0) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.aliases))]
      .filter((name) => name.length > 0 && name !== d.aliases[0] && name !== alias)
      .map((name) => ({ id: name, label: name })),
    `aka2-${d.id}`,
  ).slice(0, 3);
  return {
    id: `aka2-${d.id}`,
    lane: "desk",
    kicker: "Second name",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which other name is stored second?",
    choices: bySeed([{ id: alias, label: alias }, ...distractors], `aka2-${d.id}-order`),
    correct: alias,
    answer: `${d.name} also stores ${alias} second. An alias is not a different map.`,
    drugIds: [d.id],
  };
}
