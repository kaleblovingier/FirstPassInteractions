import type { StudyCard } from "../study";
import { labelFor, labelOwnerPool } from "../label-on-desk";
import { bySeed } from "./learn-order";

export function labelOwnerCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row) return null;
  const id = `own-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelOwnerPool()
      .filter((name) => name !== row.labelDrug)
      .map((name) => ({ id: name, label: name })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Label",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which label stores this line?",
    choices: bySeed(
      [{ id: row.labelDrug, label: row.labelDrug }, ...distractors],
      `${id}-order`,
    ),
    correct: row.labelDrug,
    answer: `The line is stored on ${row.labelDrug}. Not a new finding.`,
    drugIds: [row.drugA, row.drugB],
  };
}
