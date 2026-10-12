import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function sixthAliasCard(d: Drug): StudyCard | null {
  const alias = d.aliases[5];
  if (typeof alias !== "string" || alias.length === 0) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.aliases))]
      .filter((name) => name.length > 0 && !d.aliases.includes(name))
      .map((name) => ({ id: name, label: name })),
    `aka6-${d.id}`,
  ).slice(0, 3);
  return {
    id: `aka6-${d.id}`,
    lane: "desk",
    kicker: "Sixth name",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which other name is stored sixth?",
    choices: bySeed([{ id: alias, label: alias }, ...distractors], `aka6-${d.id}-order`),
    correct: alias,
    answer: `${d.name} also stores ${alias} sixth. An alias is not a different map.`,
    drugIds: [d.id],
  };
}
