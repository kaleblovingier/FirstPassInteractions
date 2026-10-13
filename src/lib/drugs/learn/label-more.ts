import { labelFor, otherLineCount } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelMoreCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row) return null;
  const count = otherLineCount(a, b);
  if (count == null) return null;
  const correct = String(count);
  const id = `more-${[row.drugA, row.drugB].sort().join("|")}`;
  const pool = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    .filter((n) => n !== correct)
    .slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Other lines",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "How many other lines does this label store?",
    choices: bySeed(
      [{ id: correct, label: correct }, ...pool.map((n) => ({ id: n, label: n }))],
      id,
    ),
    correct,
    answer: `${row.labelDrug} stores ${count} other lines. Not a suggestion to add them. Not a new finding.`,
    drugIds: [row.drugA, row.drugB],
  };
}
