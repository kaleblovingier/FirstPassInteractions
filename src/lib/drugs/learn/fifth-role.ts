import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function fifthRoleCard(d: Drug): StudyCard | null {
  const fifth = d.enzymes[4];
  if (!fifth) return null;
  const seed = `role5-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Fifth role",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "What role is stored on the fifth enzyme row?",
    choices: bySeed(
      [
        { id: "substrate", label: "Substrate" },
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      seed,
    ),
    correct: fifth.kind,
    answer: `${d.name} stores ${fifth.enzyme} on the fifth row as a ${fifth.kind}. This is the fifth row, not the first. Not a clearance.`,
    drugIds: [d.id],
  };
}
