import { labelFor } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelMechanismCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.mechanism) return null;
  const id = `mech-${[row.drugA, row.drugB].sort().join("|")}`;
  return {
    id,
    lane: "desk",
    kicker: "Mechanism word",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which mechanism word is stored?",
    choices: bySeed(
      [
        { id: "PK", label: "PK" },
        { id: "PD", label: "PD" },
        { id: "PK+PD", label: "PK+PD" },
      ],
      id,
    ),
    correct: row.mechanism,
    answer: `${row.nameA} and ${row.nameB} store ${row.mechanism}. That word is not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
