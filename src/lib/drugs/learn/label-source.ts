import { labelFor, labelSourcePool, storedSource } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelSourceCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  const source = row ? storedSource(row) : null;
  if (!row || !source) return null;
  const id = `src-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelSourcePool()
      .filter((item) => item !== source)
      .map((item) => ({ id: item, label: item })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Stored source",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which source stored this label line?",
    choices: bySeed([{ id: source, label: source }, ...distractors], `${id}-order`),
    correct: source,
    answer: `${row.nameA} and ${row.nameB} store this line from ${source}. That source is not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
