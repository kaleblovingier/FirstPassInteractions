import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function fourthBrandCard(d: Drug): StudyCard | null {
  const brand = d.brands[3];
  if (typeof brand !== "string" || brand.length === 0) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.brands))]
      .filter(
        (name) =>
          name.length > 0 &&
          name !== d.brands[0] &&
          name !== d.brands[1] &&
          name !== d.brands[2] &&
          name !== brand,
      )
      .map((name) => ({ id: name, label: name })),
    `brand4-${d.id}`,
  ).slice(0, 3);
  return {
    id: `brand4-${d.id}`,
    lane: "desk",
    kicker: "Fourth brand",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which fourth brand is stored?",
    choices: bySeed([{ id: brand, label: brand }, ...distractors], `brand4-${d.id}-order`),
    correct: brand,
    answer: `${d.name} stores ${brand} fourth. A fourth brand is not a different map.`,
    drugIds: [d.id],
  };
}
