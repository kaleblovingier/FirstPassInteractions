import { ENZYMES } from "../types";
import { labelFor, labelPinEnzymePool } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelPinEnzymeCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.pinEnzyme) return null;
  const id = `penz-${[row.drugA, row.drugB].sort().join("|")}`;
  const pool = labelPinEnzymePool().filter((name) => name !== row.pinEnzyme);
  const fill = ENZYMES.filter((name) => name !== row.pinEnzyme && !pool.includes(name));
  const distractors = bySeed(
    [...pool, ...fill].map((name) => ({ id: name, label: name })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Pin enzyme",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which enzyme does the pin store?",
    choices: bySeed([{ id: row.pinEnzyme, label: row.pinEnzyme }, ...distractors], `${id}-order`),
    correct: row.pinEnzyme,
    answer: `${row.nameA} and ${row.nameB} store a pin on ${row.pinEnzyme}. That enzyme is not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
