import { labelFor, labelSearchPool, storedSearch } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelSearchCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  const search = row ? storedSearch(row) : null;
  if (!row || !search) return null;
  const id = `qry-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelSearchPool()
      .filter((item) => item !== search)
      .map((item) => ({ id: item, label: item })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Stored search",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which search words are stored for this label line?",
    choices: bySeed([{ id: search, label: search }, ...distractors], `${id}-order`),
    correct: search,
    answer: `${row.nameA} and ${row.nameB} store this search: ${search}. That search is not a new finding. The pair check is still the severity.`,
    drugIds: [row.drugA, row.drugB],
  };
}
