/**
 * Everyday leads for metabolite maps.
 * Educational only — no milligram / dosing language. PI / clinician govern.
 */

/** Card subtitle under the serif “Metabolite map” title. */
export const METABOLITE_CARD_INTRO =
  "Parent drug → what the body turns it into. Named enzymes are the conversion pathways — teaching only; product labeling and the clinician govern.";

/**
 * Free-tier teaser over the blurred card.
 * Softens isoform / metabolite-name jargon while staying accurate.
 */
export const METABOLITE_PAYWALL_BLURB =
  "See what the body turns each drug into — and which enzyme pathway does the work. The parent is only half the teaching story.";

/** Role chip for the starting molecule. */
export function parentRoleLabel(): string {
  return "Starts as";
}

/** Role chip for each mapped product (first vs later steps). */
export function metaboliteRoleLabel(stepIndex: number): string {
  return stepIndex === 0 ? "Becomes" : "Then becomes";
}

/**
 * One-line lead above a tree: parent name → everyday conversion framing.
 * Keeps the scientific drug id readable (hyphens → spaces).
 */
export function plainTreeLead(drugId: string): string {
  const name = drugId.replace(/-/g, " ");
  return `Starts as ${name} → what the body turns it into.`;
}

/** Known via fragments → short everyday gloss (scientific token stays first). */
const VIA_GLOSS: Record<string, string> = {
  CYP2D6: "common conversion pathway",
  CYP3A4: "gut / liver conversion pathway",
  CYP2B6: "hepatic conversion pathway",
  CYP2C9: "hepatic conversion pathway",
  CYP2C19: "hepatic conversion pathway",
  CYP1A2: "hepatic conversion pathway",
  CYP2E1: "alcohol-inducible conversion pathway",
  UGT2B7: "conjugation pathway",
  COMT: "catechol conversion",
  ADH: "alcohol dehydrogenase path",
  ALDH: "aldehyde dehydrogenase path",
  hCE1: "hydrolysis enzyme",
  esterases: "cleaving enzymes",
  "plasma esterases": "blood-borne cleaving enzymes",
  lactonase: "ring-opening enzyme",
  "further oxidation": "next conversion step",
  "further metabolism": "next conversion step",
  oxidation: "oxidation step",
};

/**
 * Soften a `via` string for the UI while keeping enzyme / pathway names.
 * Unknown fragments pass through unchanged.
 */
export function plainVia(via: string): string {
  const parts = via.split(/\s*·\s*|\s*\+\s*/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return via;

  const glossed = parts.map((part) => {
    const key = Object.keys(VIA_GLOSS).find((k) => k.toLowerCase() === part.toLowerCase());
    if (key) {
      return `${part} (${VIA_GLOSS[key]})`;
    }
    // Partial match for compound labels like "hCE1 + ethanol"
    const nested = Object.keys(VIA_GLOSS).find((k) =>
      part.toLowerCase().includes(k.toLowerCase()),
    );
    if (nested && part.toLowerCase() !== nested.toLowerCase()) {
      return `${part} (${VIA_GLOSS[nested]})`;
    }
    return part;
  });

  if (via.includes("+")) {
    return glossed.join(" + ");
  }
  if (via.includes("·")) {
    return glossed.join(" · ");
  }
  return glossed.join(" · ");
}
