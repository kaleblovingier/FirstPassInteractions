/** Review aids for a finding's basis (FDA CDS guidance, criterion 4).
 *  Display only. Reads basisFor() and the fields already on a finding. It never
 *  changes a grade, a direction, or a warning, and it never adds a source.
 *
 *  Three things a reviewer sees:
 *  1. For each source, the FDA label section in FDA's own heading words, and the
 *     day the saved label line was retrieved, when the saved data records them.
 *  2. A plain notice when the only basis is the desk's own map.
 *  3. One "How this grade was reached" line that restates the rule inputs already
 *     stored on the finding (rule family, perpetrator strength, stored FDA fold). */
import { basisFor, type FindingBasis } from "./basis";
import { FDA_GRADES } from "./cyp-protocol";
import { LABEL_CONDITIONAL_TAG } from "./label-conditional";
import { LABEL_CONTRAINDICATED_TAG } from "./label-contraindications";
import { DRUG_BY_ID } from "./catalog";
import { SEVERITY_LABEL, type Finding } from "./types";

/** Section headings as FDA writes them for Prescribing Information in the
 *  current format (21 CFR 201.57). Older-format labels (21 CFR 201.80) carry
 *  unnumbered Contraindications, Warnings, and Precautions sections. */
export const FDA_PLR_HEADINGS: Record<string, string> = {
  "1": "1 Indications and Usage",
  "2": "2 Dosage and Administration",
  "3": "3 Dosage Forms and Strengths",
  "4": "4 Contraindications",
  "5": "5 Warnings and Precautions",
  "6": "6 Adverse Reactions",
  "7": "7 Drug Interactions",
  "8": "8 Use in Specific Populations",
  "8.1": "8.1 Pregnancy",
  "8.2": "8.2 Lactation",
  "12": "12 Clinical Pharmacology",
  "12.3": "12.3 Pharmacokinetics",
};

function numberedHeading(num: string): string | null {
  const [major] = num.split(".");
  const exact = FDA_PLR_HEADINGS[num];
  if (exact) return exact;
  const parent = major ? FDA_PLR_HEADINGS[major] : undefined;
  if (!parent) return null;
  return num === major ? parent : `${parent}, subsection ${num}`;
}

/** One stored section segment -> FDA heading words. Null when it names no heading we can map. */
function segmentHeading(raw: string): string | null {
  const seg = raw.replace(/\(.*?\)/g, "").trim();
  if (!seg) return null;
  if (/^boxed warning/i.test(seg)) return "Boxed Warning";
  const num = /^(\d+(?:\.\d+)?)\b/.exec(seg)?.[1];
  if (num) return numberedHeading(num);
  if (/^contraindications\b/i.test(seg))
    return "Contraindications (older label format, no section number)";
  if (/^precautions\b/i.test(seg)) {
    return /drug interactions/i.test(seg)
      ? "Precautions, Drug Interactions (older label format, no section number)"
      : "Precautions (older label format, no section number)";
  }
  if (/^warnings\b/i.test(seg)) return "Warnings (older label format, no section number)";
  if (/^drug interactions\b/i.test(seg))
    return "Drug Interactions (no section number on the saved line)";
  return null;
}

/** FDA heading words for a stored label section string, in stored order, no repeats.
 *  "Boxed Warning (…); 5.3" -> ["Boxed Warning", "5 Warnings and Precautions, subsection 5.3"]. */
export function fdaSectionHeadings(section: string | undefined): string[] {
  if (!section) return [];
  const out: string[] = [];
  for (const part of section.split(";")) {
    const heading = segmentHeading(part);
    if (heading && !out.includes(heading)) out.push(heading);
  }
  return out;
}

export type BasisProvenance =
  | "saved-label"
  | "fda-table"
  | "label-paraphrase"
  | "safety-communication"
  | "literature"
  | "teaching-card"
  | "desk";

export interface BasisReview {
  basis: FindingBasis;
  provenance: BasisProvenance;
  /** FDA heading words for the stored section. Empty when none is stored. */
  sections: string[];
  /** Plain sentence naming the section and retrieval date, or saying neither is saved. */
  note: string;
}

function isDailymedSearch(href: string | undefined): boolean {
  return Boolean(href && /dailymed\.nlm\.nih\.gov\/dailymed\/search\.cfm/i.test(href));
}

function isFdaSafetyPage(href: string | undefined): boolean {
  if (!href) return false;
  try {
    const url = new URL(href);
    return (
      url.hostname.endsWith("fda.gov") && url.pathname.includes("/drug-safety-and-availability/")
    );
  } catch {
    return false;
  }
}

function provenanceOf(b: FindingBasis): BasisProvenance {
  if (b.kind === "desk") return "desk";
  if (b.kind === "fda-ddi") return "fda-table";
  if (b.kind === "pubmed") return "literature";
  if (b.kind === "cpic") return "teaching-card";
  if (b.retrieved && b.section) return "saved-label";
  if (isFdaSafetyPage(b.href)) return "safety-communication";
  return "label-paraphrase";
}

function sectionSentence(sections: string[]): string {
  if (sections.length === 0) return "";
  if (sections.length === 1) return `FDA label section: ${sections[0]}.`;
  return `FDA label sections: ${sections.join("; ")}.`;
}

function noteFor(b: FindingBasis, provenance: BasisProvenance, sections: string[]): string {
  switch (provenance) {
    case "saved-label": {
      const words = b.verbatim === false ? "Saved label line, paraphrased" : "Saved label text";
      const head = sectionSentence(sections);
      const raw = sections.length ? "" : ` Section as stored: ${b.section}.`;
      return `${head ? `${head} ` : ""}${words}, retrieved from DailyMed ${b.retrieved}.${raw}`.trim();
    }
    case "fda-table":
      return b.retrieved
        ? `FDA web table, not a label section. Saved from FDA's page ${b.retrieved}.`
        : "FDA web table, not a label section.";
    case "safety-communication":
      return "FDA Drug Safety Communication, not a label section. No retrieval date is saved for this row. Open the current Prescribing Information too.";
    case "label-paraphrase":
      return isDailymedSearch(b.href)
        ? "The desk's paraphrase of the label. No label section or retrieval date is saved for this row. The link searches DailyMed, so open the current label and find the section yourself."
        : "The desk's paraphrase of the label. No label section or retrieval date is saved for this row.";
    case "literature":
      return "Published literature. Read the paper; it is not the Prescribing Information.";
    case "teaching-card":
      return "Teaching card link. Not a label section and not a PGx result.";
    case "desk":
    default:
      return "The desk's own map. No external source is saved for this line.";
  }
}

/** Each basis with its FDA section and retrieval note. Same order as basisFor(). */
export function reviewBases(finding: Finding): BasisReview[] {
  return basisFor(finding).map((basis) => {
    const sections = fdaSectionHeadings(basis.section);
    const provenance = provenanceOf(basis);
    return { basis, provenance, sections, note: noteFor(basis, provenance, sections) };
  });
}

export const DESK_ONLY_NOTICE =
  "Desk map only: no FDA label or literature source is saved for this row. Check the Prescribing Information.";

/** True when every basis on the finding is the desk's own map. */
export function isDeskMapOnly(finding: Finding): boolean {
  return basisFor(finding).every((b) => b.kind === "desk");
}

/** The notice to show above a desk-only row, or null when a source is saved. */
export function deskOnlyNotice(finding: Finding): string | null {
  return isDeskMapOnly(finding) ? DESK_ONLY_NOTICE : null;
}

type Strength = "strong" | "moderate" | "weak";

function storedStrength(f: Finding): Strength | null {
  const word = f.mechanism.split(" ")[0]?.toLowerCase();
  return word === "strong" || word === "moderate" || word === "weak" ? word : null;
}

function perpRole(f: Finding): "inhibitor" | "inducer" | null {
  if (f.tags.includes("inducer")) return "inducer";
  if (f.tags.includes("inhibitor")) return "inhibitor";
  return null;
}

function nameOf(id: string | undefined): string {
  if (!id) return "";
  return DRUG_BY_ID[id]?.name ?? id;
}

/** Which rule family put this row on the desk, from the finding's own kind and tags. */
function ruleSentence(f: Finding): string {
  const enzyme = f.enzymes[0];
  const role = perpRole(f);
  if (f.kind === "pk" && role && enzyme && f.drugIds.length >= 2) {
    const strength = storedStrength(f);
    const perp = nameOf(f.drugIds[0]);
    // FDA defines strong, moderate, and weak by AUC fold for CYP enzymes. Transporter rows get no fold sentence.
    const stored = strength ? `${strength} ${enzyme} ${role}` : `${enzyme} ${role}`;
    const fold =
      strength && enzyme.startsWith("CYP")
        ? ` FDA's definition of that grade is ${FDA_GRADES[role][strength].fold}.`
        : "";
    const base = `Enzyme rule: the map stores ${perp} as a ${stored}.${fold}`;
    return `${base} The desk's enzyme rule sets the tier from that strength, the stored substrate sensitivity, any narrow-index flag, and whether the pathway is clearance or prodrug activation.`;
  }
  if (f.kind === "pk" && f.tags.includes("competition") && enzyme) {
    return `Shared-substrate rule: both names are stored as ${enzyme} substrates and no perpetrator is on this pair. The tier depends on the stored sensitivity and any narrow-index flag.`;
  }
  if (f.tags.includes("dual-hit")) {
    return "Dual-hit rule: the perpetrator is stored on both CYP3A4 and P-gp. This rule sets one fixed tier for that card.";
  }
  if (f.tags.includes("cyp-protocol")) {
    return "Clock rule: a stored start and stop clock for this perpetrator. The tier follows the stored perpetrator strength and the clock's stored tone.";
  }
  if (f.tags.includes("washout")) {
    return "Washout rule: a name on the desk is stored with a washout clock, and the other names are compared against it.";
  }
  if (f.tags.includes("food")) {
    return "Food and drink rule: a stored food or drink row for a name on the desk.";
  }
  if (f.kind === "pk") return "Enzyme-map rule written by the desk for this pattern.";
  if (f.kind === "pd")
    return "Same-system effect rule: a rule the desk wrote for this pair or for stored effect flags on these names.";
  if (f.kind === "geno") {
    return f.tags.includes("phenoconversion")
      ? "Metabolizer rule: an inhibitor or inducer on the desk changes how this enzyme acts on the teaching map. The lab genotype is unchanged."
      : "Metabolizer rule: a metabolizer status picked by hand is compared with the stored enzyme roles.";
  }
  if (f.tags.includes("uds"))
    return "Urine-screen teaching rule: a stored teaching row for a name on the desk.";
  return "Clinic rule: a stored row for a host flag, a ward note, or a teaching note on this desk.";
}

/** Plain-language trace of how the tier was reached, built only from fields already on the
 *  finding and its stored sources. It names inputs and logic. It adds no clinical content. */
export function gradePath(finding: Finding): string {
  const tier = SEVERITY_LABEL[finding.severity];
  const parts: string[] = [];
  if (finding.tags.includes(LABEL_CONTRAINDICATED_TAG) && finding.severity === "contraindicated") {
    parts.push(
      `Label hold: a saved label line lists this pair under Contraindications, so the desk holds the row at ${tier}.`,
    );
    parts.push(
      finding.id.includes("label-ci")
        ? "The saved label line is the only rule for this row. The desk did not grade it from an enzyme strength or an effect rule."
        : `The row first came from this rule. ${ruleSentence(finding)}`,
    );
  } else if (finding.tags.includes(LABEL_CONDITIONAL_TAG)) {
    parts.push(ruleSentence(finding));
    parts.push(
      `A saved label line lists this pair under Contraindications only under a condition the desk does not know, so the row stays at ${tier}.`,
    );
  } else {
    parts.push(ruleSentence(finding));
    parts.push(`Result: ${tier}. That word is the desk's bin, not an FDA grade.`);
  }
  const external = basisFor(finding).filter((b) => b.kind !== "desk").length;
  parts.push(
    external
      ? `Sources saved for this row: ${external}. Read them before you rely on the tier.`
      : "No external source is saved for this row.",
  );
  return parts.join(" ");
}
