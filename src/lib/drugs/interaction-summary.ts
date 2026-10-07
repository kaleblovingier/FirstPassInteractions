import { FDA_GRADES } from "./cyp-protocol";

export type InteractionSummaryLike = {
  headline?: string;
  effect?: string;
  mechanism?: string;
  clinical?: string;
};

function fdaOpener(mechanism: string): "strong" | "moderate" | "weak" | undefined {
  const first = mechanism.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first === "strong" || first === "moderate" || first === "weak") return first;
  return undefined;
}

export function plainLanguageSummary(finding: InteractionSummaryLike): string {
  const headline = (finding.headline ?? "This interaction").replace(/ × /g, " and ");
  const effect = (finding.effect ?? "").toLowerCase();
  const rawMechanism = finding.mechanism ?? "";
  const mechanism = rawMechanism.toLowerCase();
  const clinical = (finding.clinical ?? "").toLowerCase();

  let outcome = "change how much drug is in the body and how strongly it acts";
  if (
    effect.includes("↑ exposure") ||
    effect.includes("↑ active metabolite") ||
    /higher|build up|more side effects|toxicity/.test(clinical)
  ) {
    outcome = "make one medicine build up and raise side effects or toxicity";
  } else if (
    effect.includes("↓ exposure") ||
    effect.includes("loss of efficacy") ||
    /falling|less effective|not work as well|withdrawal/.test(clinical)
  ) {
    outcome = "make one medicine less effective or wear off sooner";
  } else if (
    effect.includes("bleed") ||
    /bleed|hemostasis|\binr\b/.test(clinical) ||
    clinical.includes("platelet-serotonin")
  ) {
    outcome = "raise the chance of bleeding";
  } else if (
    (mechanism.includes("serotonin") || /agitation|tremor|sweating|fever/.test(clinical) || clinical.includes("serotonin")) &&
    !clinical.includes("platelet-serotonin")
  ) {
    outcome = "push serotonin too high and cause agitation, tremor, sweating, or a dangerous fever";
  } else if (/qt|arrhythmia|palpitations|rhythm/.test(clinical)) {
    outcome = "make the heart rhythm less stable and raise the chance of dangerous rhythm problems";
  } else if (/sleepiness|sedation|breathing|respiratory|blood pressure/.test(clinical)) {
    outcome = "make drowsiness, breathing problems, or low blood pressure more likely";
  } else if (effect.includes("competitive substrate overlap")) {
    outcome = "make both drugs compete for the same pathway and shift levels unexpectedly";
  }

  const summary = `In plain English: ${headline} can ${outcome}.`;
  const grade = fdaOpener(rawMechanism);
  if (!grade || (!mechanism.includes("inhib") && !mechanism.includes("induc"))) return summary;
  const kind = mechanism.includes("induc") ? "inducer" : "inhibitor";
  return `${summary} FDA calls a ${grade} ${kind} ${FDA_GRADES[kind][grade].fold}. Not a milligram.`;
}

/** One scan line for a clinician: enzyme, then the direction already on the finding. */
export function clinicianScan(finding: { enzymes?: readonly string[]; effect?: string }): string {
  const enzymes = (finding.enzymes ?? []).map((e) => e.trim()).filter(Boolean);
  const effect = (finding.effect ?? "").replace(/\s+/g, " ").trim();
  return [enzymes.join(", "), effect].filter(Boolean).join(" · ");
}