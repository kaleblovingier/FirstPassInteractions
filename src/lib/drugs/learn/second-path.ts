import type { StudyCard } from "../study";
import type { Drug, EnzymeRole } from "../types";
import { bySeed } from "./learn-order";

function substrates(d: Drug) {
  return d.enzymes.filter(
    (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.kind === "substrate",
  );
}

export function secondPathCard(d: Drug): StudyCard | null {
  const second = substrates(d)[1];
  if (!second) return null;
  const seed = `path2-${d.id}`;
  return {
    id: seed,
    lane: "desk",
    kicker: "Second pathway",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "Is that second substrate stored as clearance or prodrug activation?",
    choices: bySeed(
      [
        { id: "clearance", label: "Clearance" },
        { id: "activation", label: "Prodrug activation" },
      ],
      seed,
    ),
    correct: second.pathway,
    answer: `${d.name} stores ${second.enzyme} second substrate as ${second.pathway === "activation" ? "activation" : "clearance"}. Not a milligram.`,
    drugIds: [d.id],
  };
}
