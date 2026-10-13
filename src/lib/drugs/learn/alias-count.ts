import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function aliasCountCard(d: Drug): StudyCard {
  const correct = String(d.aliases.length);
  const pool = ["0", "1", "2", "3", "4", "5", "6"].filter((n) => n !== correct).slice(0, 3);
  return {
    id: `naka-${d.id}`,
    lane: "desk",
    kicker: "Aliases",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "How many other names are stored?",
    choices: bySeed(
      [{ id: correct, label: correct }, ...pool.map((n) => ({ id: n, label: n }))],
      `naka-${d.id}`,
    ),
    correct,
    answer: `${d.name} stores ${d.aliases.length} other ${d.aliases.length === 1 ? "name" : "names"}. An alias is not a different map.`,
    drugIds: [d.id],
  };
}
