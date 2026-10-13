import type { StudyCard } from "../study";
import { labelFor, labelExamplePool } from "../label-on-desk";
import { bySeed } from "./learn-order";

export function labelExampleCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row || !row.example) return null;
  const id = `ex-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelExamplePool()
      .filter((example) => example !== row.example)
      .map((example) => ({ id: example, label: example })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Naming line",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which naming line is stored?",
    choices: bySeed(
      [{ id: row.example, label: row.example }, ...distractors],
      `${id}-order`,
    ),
    correct: row.example,
    answer: `The label names ${row.example}. An example is not a different pair.`,
    drugIds: [row.drugA, row.drugB],
  };
}
