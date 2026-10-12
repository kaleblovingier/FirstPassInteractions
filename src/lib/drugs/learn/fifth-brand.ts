import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { DRUGS } from "../catalog";
import { bySeed } from "./learn-order";

export function fifthBrandCard(d: Drug): StudyCard | null {
  const brand = d.brands[4];
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
          name !== brand,
      )
      .map((name) => ({ id: name, label: name })),
    `brand5-${d.id}`,
  ).slice(0, 3);
  return {
    id: `brand5-${d.id}`,
    lane: "desk",
    kicker: "Fifth brand",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which fifth brand is stored?",
    choices: bySeed([{ id: brand, label: brand }, ...distractors], `brand5-${d.id}-order`),
    correct: brand,
    answer: `${d.name} stores ${brand} fifth. A fifth brand is not a different map.`,
    drugIds: [d.id],
  };
}
