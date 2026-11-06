import type { StudyCard } from "../study";
import type { Drug } from "../types";
import { UNGRADED_DISCLAIMER, ungradedPerpetratorsFor } from "../ungraded-perpetrators";
import { bySeed } from "./learn-order";

export function perpetratorCountCard(d: Drug): StudyCard {
  const count = d.enzymes.filter((e) => e.kind === "inhibitor" || e.kind === "inducer").length;
  const named = ungradedPerpetratorsFor(d.id);
  const correct = String(count);
  const pool = ["0", "1", "2", "3", "4", "5", "6", "7", "8"].filter((n) => n !== correct).slice(0, 3);
  const unscored = named.length
    ? ` The label names an unscored perpetrator and this desk did not assign a strength. A stored count is not the whole story. ${UNGRADED_DISCLAIMER}`
    : "";
  return {
    id: `nperp-${d.id}`,
    lane: "desk",
    kicker: "Perpetrators",
    title: d.name,
    prompt: `${d.name}.`,
    ask: "How many perpetrator rows are stored?",
    choices: bySeed(
      [{ id: correct, label: correct }, ...pool.map((n) => ({ id: n, label: n }))],
      `nperp-${d.id}`,
    ),
    correct,
    answer: `${d.name} stores ${count} perpetrator ${count === 1 ? "row" : "rows"}. A perpetrator is an inhibitor or inducer already stored. A count is not a clearance.${unscored}`,
    drugIds: [d.id],
  };
}
