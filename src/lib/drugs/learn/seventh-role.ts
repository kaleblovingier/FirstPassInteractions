import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function seventhRoleCard(d: Drug): StudyCard | null {
  const row = d.enzymes[6];
  if (!row) return null;
  const seed = `role7-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Seventh role",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "What role is stored on the seventh enzyme row?",
    choices: bySeed(
      [
        { id: "substrate", label: "Substrate" },
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      seed,
    ),
    correct: row.kind,
    answer: `${d.name} stores ${row.enzyme} on the seventh row as a ${row.kind}. This is the seventh row, not the first. Not a clearance.`,
    drugIds: [d.id],
  };
}
