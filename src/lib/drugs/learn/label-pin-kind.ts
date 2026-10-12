import { labelFor } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelPinKindCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.pinKind) return null;
  const id = `pkind-${[row.drugA, row.drugB].sort().join("|")}`;
  return {
    id,
    lane: "desk",
    kicker: "Pin direction",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which direction does the pin store?",
    choices: bySeed(
      [
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      id,
    ),
    correct: row.pinKind,
    answer: `${row.nameA} and ${row.nameB} store the pin as an ${row.pinKind}. That direction is not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
