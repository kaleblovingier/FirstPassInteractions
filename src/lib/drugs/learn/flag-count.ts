import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function flagCountCard(d: Drug): StudyCard {
  const correct = String(d.pd.length);
  const pool = ["0", "1", "2", "3", "4", "5", "6"].filter((n) => n !== correct).slice(0, 3);
  return {
    id: `nflag-${d.id}`,
    lane: "desk",
    kicker: "Flags",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "How many effect flags are stored?",
    choices: bySeed(
      [{ id: correct, label: correct }, ...pool.map((n) => ({ id: n, label: n }))],
      `nflag-${d.id}`,
    ),
    correct,
    answer: `${d.name} stores ${d.pd.length} effect ${d.pd.length === 1 ? "flag" : "flags"}. A count is not a diagnosis.`,
    drugIds: [d.id],
  };
}
