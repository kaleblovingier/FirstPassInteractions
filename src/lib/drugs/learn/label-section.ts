import type { StudyCard } from "../study";
import { labelFor, labelSectionPool } from "../label-on-desk";
import { bySeed } from "./learn-order";

export function labelSectionCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row) return null;
  const id = `sect-${[row.drugA, row.drugB].sort().join("|")}`;
  const section = row.labelSection;
  const distractors = bySeed(
    labelSectionPool()
      .filter((name) => name.length > 0 && name !== section)
      .map((name) => ({ id: name, label: name })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Label section",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which label section is stored?",
    choices: bySeed([{ id: section, label: section }, ...distractors], `${id}-order`),
    correct: section,
    answer: `${row.nameA} and ${row.nameB} store ${row.labelSection} on ${row.labelDrug}. The label's words. Not a new finding.`,
    drugIds: [row.drugA, row.drugB],
  };
}
