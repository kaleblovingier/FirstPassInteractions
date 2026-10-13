import { labelFor, labelRetrievedPool } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelRetrievedCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.retrieved) return null;
  const id = `ret-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelRetrievedPool()
      .filter((date) => date !== row.retrieved)
      .map((date) => ({ id: date, label: date })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Retrieved",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "When was this label line retrieved?",
    choices: bySeed([{ id: row.retrieved, label: row.retrieved }, ...distractors], `${id}-order`),
    correct: row.retrieved,
    answer: `${row.nameA} and ${row.nameB} store this label line as retrieved ${row.retrieved}. That date is not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
