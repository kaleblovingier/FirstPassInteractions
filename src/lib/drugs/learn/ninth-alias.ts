import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function ninthAliasCard(d: Drug): StudyCard | null {
  const alias = d.aliases[8];
  if (typeof alias !== "string" || alias.length === 0) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.aliases))]
      .filter((name) => name.length > 0 && !d.aliases.includes(name))
      .map((name) => ({ id: name, label: name })),
    `aka9-${d.id}`,
  ).slice(0, 3);
  return {
    id: `aka9-${d.id}`,
    lane: "desk",
    kicker: "Ninth name",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which other name is stored ninth?",
    choices: bySeed([{ id: alias, label: alias }, ...distractors], `aka9-${d.id}-order`),
    correct: alias,
    answer: `${d.name} also stores ${alias} ninth. An alias is not a different map.`,
    drugIds: [d.id],
  };
}
