import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function thirdSensCard(d: Drug): StudyCard | null {
  const row = substrates(d)[2];
  if (!row) return null;
  const seed = `sens3-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Third sensitivity",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which sensitivity is stored on the third substrate?",
    choices: bySeed(
      [
        { id: "sensitive", label: "Sensitive" },
        { id: "major", label: "Major" },
        { id: "minor", label: "Minor" },
      ],
      seed,
    ),
    correct: row.sensitivity,
    answer: `${d.name} stores ${row.enzyme} third substrate as ${row.sensitivity}. Not a clearance.`,
    drugIds: [d.id],
  };
}
