import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function secondSensCard(d: Drug): StudyCard | null {
  const second = substrates(d)[1];
  if (!second) return null;
  return {
    id: `sens2-${d.id}`,
    lane: "desk",
    kicker: "Second sensitivity",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Which sensitivity is stored on the second substrate?",
    choices: bySeed(
      [
        { id: "sensitive", label: "Sensitive" },
        { id: "major", label: "Major" },
        { id: "minor", label: "Minor" },
      ],
      `sens2-${d.id}`,
    ),
    correct: second.sensitivity,
    answer: `${d.name} stores ${second.enzyme} as a ${second.sensitivity} second substrate. Not a milligram.`,
    drugIds: [d.id],
  };
}
