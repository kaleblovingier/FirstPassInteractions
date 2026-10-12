import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function brandCountCard(d: Drug): StudyCard {
  const correct = String(d.brands.length);
  const pool = ["0", "1", "2", "3", "4", "5", "6"].filter((n) => n !== correct).slice(0, 3);
  return {
    id: `nbrand-${d.id}`,
    lane: "desk",
    kicker: "Brands",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "How many brands are stored?",
    choices: bySeed(
      [{ id: correct, label: correct }, ...pool.map((n) => ({ id: n, label: n }))],
      `nbrand-${d.id}`,
    ),
    correct,
    answer: `${d.name} stores ${d.brands.length} ${d.brands.length === 1 ? "brand" : "brands"}. A count is not a different map.`,
    drugIds: [d.id],
  };
}
