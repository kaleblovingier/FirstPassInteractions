import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function thirdRoleCard(d: Drug): StudyCard | null {
  const third = d.enzymes[2];
  if (!third) return null;
  const seed = `role3-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Third role",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "What role is stored on the third enzyme row?",
    choices: bySeed(
      [
        { id: "substrate", label: "Substrate" },
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      seed,
    ),
    correct: third.kind,
    answer: `${d.name} stores ${third.enzyme} on the third row as a ${third.kind}. This is the third row, not the first. Not a clearance.`,
    drugIds: [d.id],
  };
}
