import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function fourthRoleCard(d: Drug): StudyCard | null {
  const fourth = d.enzymes[3];
  if (!fourth) return null;
  const seed = `role4-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Fourth role",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "What role is stored on the fourth enzyme row?",
    choices: bySeed(
      [
        { id: "substrate", label: "Substrate" },
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      seed,
    ),
    correct: fourth.kind,
    answer: `${d.name} stores ${fourth.enzyme} on the fourth row as a ${fourth.kind}. This is the fourth row, not the first. Not a clearance.`,
    drugIds: [d.id],
  };
}
