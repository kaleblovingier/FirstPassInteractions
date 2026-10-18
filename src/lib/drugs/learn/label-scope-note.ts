import { labelFor, labelScopeNotePool } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelScopeNoteCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.scopeNote) return null;
  const id = `snote-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelScopeNotePool()
      .filter((note) => note !== row.scopeNote)
      .map((note) => ({ id: note, label: note })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Label note",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which note is stored on this label line?",
    choices: bySeed([{ id: row.scopeNote, label: row.scopeNote }, ...distractors], `${id}-order`),
    correct: row.scopeNote,
    answer: `${row.nameA} and ${row.nameB} store this label note: ${row.scopeNote} That note is not a new finding and not an instruction. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
