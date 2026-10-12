import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function firstRowRoleCard(d: Drug): StudyCard | null {
  const first = d.enzymes[0];
  if (!first) return null;
  const seed = `row0-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "First row",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "What role is stored on the first enzyme row?",
    choices: bySeed(
      [
        { id: "substrate", label: "Substrate" },
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      seed,
    ),
    correct: first.kind,
    answer: `${d.name} stores ${first.enzyme} first as a ${first.kind}. This is the first row, not a later perpetrator. Not a clearance.`,
    drugIds: [d.id],
  };
}
