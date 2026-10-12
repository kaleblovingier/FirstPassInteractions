import { labelFor, labelPinSentencePool, pinSentenceOf } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelPinSentenceCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  const sentence = row ? pinSentenceOf(row) : null;
  if (!row || !sentence) return null;
  const id = `csen-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelPinSentencePool()
      .filter((line) => line !== sentence)
      .map((line) => ({ id: line, label: line })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Pin sentence",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which contraindications sentence does the pin store?",
    choices: bySeed([{ id: sentence, label: sentence }, ...distractors], `${id}-order`),
    correct: sentence,
    answer: `${row.nameA} and ${row.nameB} store this contraindications sentence: ${sentence}. That sentence is not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
