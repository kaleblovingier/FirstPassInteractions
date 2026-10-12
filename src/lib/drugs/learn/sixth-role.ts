import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { bySeed } from "./learn-order";

export function sixthRoleCard(d: Drug): StudyCard | null {
  const sixth = d.enzymes[5];
  if (!sixth) return null;
  const seed = `role6-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Sixth role",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "What role is stored on the sixth enzyme row?",
    choices: bySeed(
      [
        { id: "substrate", label: "Substrate" },
        { id: "inhibitor", label: "Inhibitor" },
        { id: "inducer", label: "Inducer" },
      ],
      seed,
    ),
    correct: sixth.kind,
    answer: `${d.name} stores ${sixth.enzyme} on the sixth row as a ${sixth.kind}. This is the sixth row, not the first. Not a clearance.`,
    drugIds: [d.id],
  };
}
