import { labelFor } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelBasisCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.basis) return null;
  const id = `bas-${[row.drugA, row.drugB].sort().join("|")}`;
  return {
    id,
    lane: "desk",
    kicker: "Stored basis",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Is this line stored as named or class?",
    choices: bySeed(
      [
        { id: "named", label: "Named" },
        { id: "class", label: "Class" },
      ],
      id,
    ),
    correct: row.basis,
    answer: `${row.nameA} and ${row.nameB} store this line as ${row.basis}. Named means the label names the drug. Class means the label names a class. Not a new finding.`,
    drugIds: [row.drugA, row.drugB],
  };
}
