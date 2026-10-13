import { labelFor } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelClassCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row || !row.labelClass) return null;
  return {
    id: `lcls-${[row.drugA, row.drugB].sort().join("|")}`,
    lane: "desk",
    kicker: "Label class",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which label class is stored?",
    choices: bySeed(
      [
        { id: "contraindicated", label: "Contraindicated" },
        { id: "avoid", label: "Avoid" },
        { id: "boxed-warning", label: "Boxed warning" },
        { id: "warning", label: "Warning" },
      ],
      `lcls-${row.drugA}|${row.drugB}`,
    ),
    correct: row.labelClass,
    answer: `${row.nameA} and ${row.nameB} store the label class ${row.labelClass}. That class is the label's word. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
