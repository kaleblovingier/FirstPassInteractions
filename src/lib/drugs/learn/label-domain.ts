import { labelFor, labelDomainPool } from "../label-on-desk";
import type { StudyCard } from "../study";
import { bySeed } from "./learn-order";

export function labelDomainCard(a: string, b: string): StudyCard | null {
  const row = labelFor(a, b);
  if (!row?.domain) return null;
  const id = `dom-${[row.drugA, row.drugB].sort().join("|")}`;
  const distractors = bySeed(
    labelDomainPool()
      .filter((name) => name !== row.domain)
      .map((name) => ({ id: name, label: name })),
    id,
  ).slice(0, 3);
  return {
    id,
    lane: "desk",
    kicker: "Domain",
    title: `${row.nameA} × ${row.nameB}`,
    prompt: `${row.nameA} × ${row.nameB}.`,
    ask: "Which domain is stored?",
    choices: bySeed(
      [{ id: row.domain, label: row.domain }, ...distractors],
      `${id}-order`,
    ),
    correct: row.domain,
    answer: `${row.nameA} and ${row.nameB} store the domain ${row.domain}. A domain is not a collision and not a clearance.`,
    drugIds: [row.drugA, row.drugB],
  };
}
