import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function seventhAliasCard(d: Drug): StudyCard | null {
  const alias = d.aliases[6];
  if (typeof alias !== "string" || alias.length === 0) return null;
  const own = new Set(d.aliases);
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.aliases))]
      .filter((name) => name.length > 0 && !own.has(name))
      .map((name) => ({ id: name, label: name })),
    `aka7-${d.id}`,
  ).slice(0, 3);
  return {
    id: `aka7-${d.id}`,
    lane: "desk",
    kicker: "Seventh name",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which other name is stored seventh?",
    choices: bySeed([{ id: alias, label: alias }, ...distractors], `aka7-${d.id}-order`),
    correct: alias,
    answer: `${d.name} also stores ${alias} seventh. An alias is not a different map.`,
    drugIds: [d.id],
  };
}
