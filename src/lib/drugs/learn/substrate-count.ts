import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function substrateCountCard(d: Drug): StudyCard {
  const count = d.enzymes.filter((e) => e.kind === "substrate").length;
  const correct = String(count);
  const pool = ["0", "1", "2", "3", "4", "5", "6", "7", "8"].filter((n) => n !== correct).slice(0, 3);
  return {
    id: `nsub-${d.id}`,
    lane: "desk",
    kicker: "Substrates",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "How many substrate rows are stored?",
    choices: bySeed(
      [{ id: correct, label: correct }, ...pool.map((n) => ({ id: n, label: n }))],
      `nsub-${d.id}`,
    ),
    correct,
    answer: `${d.name} stores ${count} substrate ${count === 1 ? "row" : "rows"}. A count is not a clearance.`,
    drugIds: [d.id],
  };
}
