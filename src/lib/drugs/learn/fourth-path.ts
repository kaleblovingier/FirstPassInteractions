import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function fourthPathCard(d: Drug): StudyCard | null {
  const row = substrates(d)[3];
  if (!row) return null;
  const seed = `path4-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Fourth pathway",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Is that fourth substrate stored as clearance or prodrug activation?",
    choices: bySeed(
      [
        { id: "clearance", label: "Clearance" },
        { id: "activation", label: "Prodrug activation" },
      ],
      seed,
    ),
    correct: row.pathway,
    answer: `${d.name} stores ${row.enzyme} fourth substrate as ${row.pathway === "activation" ? "activation" : "clearance"}. Not a milligram.`,
    drugIds: [d.id],
  };
}
