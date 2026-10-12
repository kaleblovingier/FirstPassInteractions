import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function thirdPathCard(d: Drug): StudyCard | null {
  const row = substrates(d)[2];
  if (!row) return null;
  const seed = `path3-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Third pathway",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Is that third substrate stored as clearance or prodrug activation?",
    choices: bySeed(
      [
        { id: "clearance", label: "Clearance" },
        { id: "activation", label: "Prodrug activation" },
      ],
      seed,
    ),
    correct: row.pathway,
    answer: `${d.name} stores ${row.enzyme} third substrate as ${row.pathway === "activation" ? "activation" : "clearance"}. Not a milligram.`,
    drugIds: [d.id],
  };
}
