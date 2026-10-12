import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function thirdBrandCard(d: Drug): StudyCard | null {
  const brand = d.brands[2];
  if (typeof brand !== "string" || brand.length === 0) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.brands))]
      .filter((name) => name.length > 0 && name !== d.brands[0] && name !== d.brands[1] && name !== brand)
      .map((name) => ({ id: name, label: name })),
    `brand3-${d.id}`,
  ).slice(0, 3);
  return {
    id: `brand3-${d.id}`,
    lane: "desk",
    kicker: "Third brand",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which third brand is stored?",
    choices: bySeed([{ id: brand, label: brand }, ...distractors], `brand3-${d.id}-order`),
    correct: brand,
    answer: `${d.name} stores ${brand} third. A third brand is not a different map.`,
    drugIds: [d.id],
  };
}
