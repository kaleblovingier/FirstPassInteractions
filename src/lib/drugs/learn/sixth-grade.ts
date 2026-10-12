import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function perpetrators(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
      e.kind === "inhibitor" || e.kind === "inducer",
  );
}

export function sixthGradeCard(d: Drug): StudyCard | null {
  const row = perpetrators(d)[5];
  if (!row) return null;
  const seed = `grade6-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Sixth grade",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which strength is stored on the sixth perpetrator?",
    choices: bySeed(
      [
        { id: "strong", label: "Strong" },
        { id: "moderate", label: "Moderate" },
        { id: "weak", label: "Weak" },
      ],
      seed,
    ),
    correct: row.strength,
    answer: `${d.name} stores ${row.enzyme} as a sixth ${row.kind}, strength ${row.strength}. Not a milligram.`,
    drugIds: [d.id],
  };
}
