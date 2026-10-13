import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function perpetrators(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
      e.kind === "inhibitor" || e.kind === "inducer",
  );
}

export function fifthGradeCard(d: Drug): StudyCard | null {
  const row = perpetrators(d)[4];
  if (!row) return null;
  const seed = `grade5-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Fifth grade",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which strength is stored on the fifth perpetrator?",
    choices: bySeed(
      [
        { id: "strong", label: "Strong" },
        { id: "moderate", label: "Moderate" },
        { id: "weak", label: "Weak" },
      ],
      seed,
    ),
    correct: row.strength,
    answer: `${d.name} stores ${row.enzyme} as a fifth ${row.kind}, strength ${row.strength}. Not a milligram.`,
    drugIds: [d.id],
  };
}
