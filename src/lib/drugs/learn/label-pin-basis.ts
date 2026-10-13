import { labelFor } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelPinBasisCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.pinBasis || row.basis) return null;
  const id = `pbas-${[row.drugA, row.drugB].sort().join("|")}`;
  return {
    id,
    lane: "desk",
    kicker: "Pin basis",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Is the pin stored as named or class?",
    choices: bySeed(
      [
        { id: "named", label: "Named" },
        { id: "class", label: "Class" },
      ],
      id,
    ),
    correct: row.pinBasis,
    answer: `${row.nameA} and ${row.nameB} store the pin as ${row.pinBasis}. Named means the label names the drug. Class means the label names a class. Not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
