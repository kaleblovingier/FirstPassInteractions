import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function fourthSensCard(d: Drug): StudyCard | null {
  const row = substrates(d)[3];
  if (!row) return null;
  const seed = `sens4-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Fourth sensitivity",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which sensitivity is stored on the fourth substrate?",
    choices: bySeed(
      [
        { id: "sensitive", label: "Sensitive" },
        { id: "major", label: "Major" },
        { id: "minor", label: "Minor" },
      ],
      seed,
    ),
    correct: row.sensitivity,
    answer: `${d.name} stores ${row.enzyme} fourth substrate as ${row.sensitivity}. Not a clearance.`,
    drugIds: [d.id],
  };
}
