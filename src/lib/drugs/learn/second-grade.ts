import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function perpetrators(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
      e.kind === "inhibitor" || e.kind === "inducer",
  );
}

export function secondGradeCard(d: Drug): StudyCard | null {
  const second = perpetrators(d)[1];
  if (!second) return null;
  const seed = `grade2-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Second grade",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which strength is stored on the second perpetrator?",
    choices: bySeed(
      [
        { id: "strong", label: "Strong" },
        { id: "moderate", label: "Moderate" },
        { id: "weak", label: "Weak" },
      ],
      seed,
    ),
    correct: second.strength,
    answer: `${d.name} stores ${second.enzyme} as a second ${second.kind}, strength ${second.strength}. Not a milligram.`,
    drugIds: [d.id],
  };
}
