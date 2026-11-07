/**
 * Public FDA and NLM reference pages that sit behind the desk: where labels live,
 * where approvals and equivalence ratings are listed, where safety notices are
 * posted, and where to report a problem. Shown on /sources and in the desk's
 * Resources station. Links only: FirstPass fetches none of these pages here.
 *
 * Every address is a stable top-level page on fda.gov, accessdata.fda.gov or
 * nlm.nih.gov (reference-resources.test.ts checks the hosts). Educational
 * reference only. Not FDA-cleared.
 */
import { FDA_DDI_SOURCE } from "./reference/fda-ddi-table";

export type ReferenceResourceKind = "label" | "approval" | "interaction" | "safety" | "report";

export interface ReferenceResource {
  id: string;
  name: string;
  /** Agency that runs the page. */
  owner: "FDA" | "NLM";
  kind: ReferenceResourceKind;
  url: string;
  /** What the page is, in one or two plain sentences. */
  description: string;
  /** How it ties to FirstPass, in one sentence. */
  onDesk: string;
}

export const REFERENCE_RESOURCE_KIND_LABEL: Record<ReferenceResourceKind, string> = {
  label: "Drug labels",
  approval: "Approvals and equivalence",
  interaction: "Interaction tables",
  safety: "Safety notices",
  report: "Report a problem",
};

export const REFERENCE_RESOURCES: readonly ReferenceResource[] = [
  {
    id: "dailymed",
    name: "DailyMed",
    owner: "NLM",
    kind: "label",
    url: "https://dailymed.nlm.nih.gov/",
    description:
      "The National Library of Medicine's library of drug labels in Structured Product Labeling (SPL) format, as submitted to FDA. Each label has a set ID that stays the same across versions.",
    onDesk: "Every label link on FirstPass opens the label's DailyMed page by its set ID.",
  },
  {
    id: "drugs-at-fda",
    name: "Drugs@FDA",
    owner: "FDA",
    kind: "approval",
    url: "https://www.accessdata.fda.gov/scripts/cder/daf/",
    description:
      "FDA's database of drug products it has approved, with approval history, letters, reviews and label documents.",
    onDesk: "Use it to see when a label changed and what FDA reviewed, beyond the excerpt the desk shows.",
  },
  {
    id: "orange-book",
    name: "Orange Book",
    owner: "FDA",
    kind: "approval",
    url: "https://www.accessdata.fda.gov/scripts/cder/ob/",
    description:
      "FDA's list of approved drug products with therapeutic equivalence evaluations, patents and exclusivity.",
    onDesk: "The desk does not rate generic equivalence. This is the place that does.",
  },
  {
    id: "fda-ddi-table-1",
    name: "FDA examples of drugs that interact with CYP enzymes and transporters (Table 1)",
    owner: "FDA",
    kind: "interaction",
    url: FDA_DDI_SOURCE.url,
    description:
      "FDA's examples of clinical substrates, inhibitors and inducers of CYP enzymes and transporter systems, with a strength class for each CYP role.",
    onDesk: "FirstPass compares its stored enzyme roles to this table. The rows it uses are indexed on the sources page.",
  },
  {
    id: "fda-ddi-companion",
    name: "FDA table of substrates, inhibitors and inducers (drug development)",
    owner: "FDA",
    kind: "interaction",
    url: FDA_DDI_SOURCE.companionUrl,
    description: "FDA's companion table of in vitro probes and clinical index drugs used in drug interaction studies.",
    onDesk: "FirstPass reads this page for context and does not transcribe its rows.",
  },
  {
    id: "drug-safety-communications",
    name: "Drug Safety Communications",
    owner: "FDA",
    kind: "safety",
    url: "https://www.fda.gov/drugs/drug-safety-and-availability/drug-safety-communications",
    description: "FDA's announcements of new safety information about marketed drugs, listed by date.",
    onDesk: "A new communication can come before the label text the desk quotes is updated.",
  },
  {
    id: "fda-recalls",
    name: "Recalls, market withdrawals and safety alerts",
    owner: "FDA",
    kind: "safety",
    url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
    description: "FDA's list of product recalls, market withdrawals and safety alerts.",
    onDesk: "The desk does not track recalls. Check here for a specific product or lot.",
  },
  {
    id: "medwatch",
    name: "MedWatch",
    owner: "FDA",
    kind: "report",
    url: "https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program",
    description:
      "FDA's safety information and adverse event reporting program. Health professionals, patients and caregivers can report a serious adverse event, a product quality problem or a medication error.",
    onDesk: "Report a suspected adverse event to FDA through MedWatch. FirstPass does not collect reports.",
  },
];

/** Hosts a reference resource may point to. */
export const REFERENCE_RESOURCE_HOSTS = ["dailymed.nlm.nih.gov", "www.fda.gov", "www.accessdata.fda.gov"] as const;
