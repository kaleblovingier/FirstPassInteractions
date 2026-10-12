import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function secondRoleCard(d: Drug): StudyCard | null {
  const second = d.enzymes[1];
  if (!second) return null;
  const seed = `role2-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Second role",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "What role is stored on the second enzyme row?",
    choices: bySeed(
      [
        { id: "substrate", label: "Substrate" },
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      seed,
    ),
    correct: second.kind,
    answer: `${d.name} stores ${second.enzyme} second as a ${second.kind}. Not a clearance.`,
    drugIds: [d.id],
  };
}
