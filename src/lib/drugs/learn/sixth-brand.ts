import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function sixthBrandCard(d: Drug): StudyCard | null {
  const brand = d.brands[5];
  if (typeof brand !== "string" || brand.length === 0) return null;
  const distractors = bySeed(
    [...new Set(DRUGS.flatMap((row) => row.brands))]
      .filter(
        (name) =>
          name.length > 0 &&
          name !== d.brands[0] &&
          name !== d.brands[1] &&
          name !== d.brands[2] &&
          name !== d.brands[3] &&
          name !== d.brands[4] &&
          name !== brand,
      )
      .map((name) => ({ id: name, label: name })),
    `brand6-${d.id}`,
  ).slice(0, 3);
  return {
    id: `brand6-${d.id}`,
    lane: "desk",
    kicker: "Sixth brand",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which sixth brand is stored?",
    choices: bySeed([{ id: brand, label: brand }, ...distractors], `brand6-${d.id}-order`),
    correct: brand,
    answer: `${d.name} stores ${brand} sixth. A sixth brand is not a different map.`,
    drugIds: [d.id],
  };
}
