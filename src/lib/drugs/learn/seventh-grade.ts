import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function perpetrators(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
      e.kind === "inhibitor" || e.kind === "inducer",
  );
}

export function seventhGradeCard(d: Drug): StudyCard | null {
  const row = perpetrators(d)[6];
  if (!row) return null;
  const seed = `grade7-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Seventh grade",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which strength is stored on the seventh perpetrator?",
    choices: bySeed(
      [
        { id: "strong", label: "Strong" },
        { id: "moderate", label: "Moderate" },
        { id: "weak", label: "Weak" },
      ],
      seed,
    ),
    correct: row.strength,
    answer: `${d.name} stores ${row.enzyme} as a seventh ${row.kind}, strength ${row.strength}. Not a milligram.`,
    drugIds: [d.id],
  };
}
