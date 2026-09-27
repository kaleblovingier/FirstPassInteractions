/** Labeling for FirstPass as non-device clinical decision support.
 *  Not FDA-cleared. Not FDA-approved. The Prescribing Information governs. */

export const SOFTWARE = {
  name: "FirstPass",
  version: "1.14.0",
  released: "2026-09-26",
  manufacturer: "Kaleb Lovingier",
  email: "kaleblovingier@gmail.com",
  phone: "360-707-8923",
  udi: "FP-SW-1.14.0",
} as const;

/** FD&C Act 520(o)(1)(E) / FDA CDS Guidance (January 2026, superseding 2022) posture — not a clearance. */
/** Single source of truth for who the desk is for. Copy elsewhere must match. */
export const INTENDED_USERS =
  "Licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision";

export const RECREATIONAL_SAFETY_CONTEXT =
  "This desk may be used in educational harm-reduction and recreational-safety review for licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision, including analysis of stimulant, sedative, dissociative, and street-supply combinations. Where local drug-checking services are available, purity and content testing services are complementary harm-reduction tools; they are not urine testing, not patient-directed dosing guidance, and not a substitute for the relevant FDA-approved Prescribing Information or local protocols. It is not intended for patient self-treatment, recreational dosing, or direct medical decision-making without independent review of the relevant FDA-approved Prescribing Information and local protocols.";

export const INTENDED_USE =
  `FirstPass is clinical decision support software intended for use by licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision, to display mapped cytochrome P450 and pharmacodynamic interaction information, FDA-label excerpts (OpenFDA / DailyMed), published scale scores, labeled dose ranges and dose-caps, and cited literature so the healthcare professional can independently review the basis of any recommendation before acting. ${RECREATIONAL_SAFETY_CONTEXT} It is not intended to diagnose, treat, mitigate, or prevent disease, to generate a prescription, or to replace the FDA-approved Prescribing Information. Displayed dose ranges paraphrase FDA-approved labeling; a user-entered milligram is checked against those rails. The desk does not pick a milligram.`;

export const INDICATIONS = [
  "Displaying CYP450 substrate / inhibitor / inducer maps, FDA DDI fold-change grades, start/stop safety clocks (reversible vs time-dependent inactivation vs induction lag), and pharmacodynamic collision scores for drugs and foods on a user-selected regimen.",
  "Surfacing excerpts of FDA-approved labeling (boxed warnings, contraindications, drug interactions, pregnancy) retrieved from OpenFDA and DailyMed.",
  "Displaying published clinical scales (COWS, CIWA-Ar, Hunter criteria, CDC 2022 oral MME factors, Bazett / Fridericia, Cockcroft–Gault) with the published source named.",
  "Displaying labeled usual dose ranges, labeled maxima, and interaction dose-caps paraphrased from FDA-approved labeling, and checking a user-entered milligram against those rails.",
  "Displaying named labeled pharmacodynamic collisions (sofosbuvir–amiodarone bradycardia, clozapine–benzodiazepine respiratory collapse, dual RAAS blockade, fluoroquinolone–corticosteroid tendinopathy, and related boxed pairs) so the healthcare professional can independently review the basis.",
  "Displaying harm-reduction teaching (overdose response, test-strip limits, never-use-alone, recovery position, DanceSafe reagent instructions, PsychonautWiki / TripSit / SAMHSA / CDC paraphrases, and live wiki intros with dosage and route-how-to stripped) so the healthcare professional can independently review the basis. Not a protocol and not a milligram.",
  "Leading a pair check with the perpetrator, the victim, the direction of effect, the enzyme or receptor, and a source that can be opened. Contraindicated is its own tier, above major. The check does not pick a milligram.",
  "Showing food, drink, and alcohol rows for the names already on the desk, and pregnancy, CKD, older-adult, and daily-smoke rows labeled as a different host. Those rows are the same map. They are not a clearance and not a milligram.",
  "Ranking a regimen into pairs by the sharpest collision, and leading with a plain-language sentence of that row. The sentence does not pick a milligram or a next step.",
  "Listing the pairs on a regimen that had no mapped collision, labeled as not a clearance. A blank pair is not a statement that the combination is safe.",
  "Showing every pair on a regimen in one grid. Each cell is a severity or no mapped collision. A blank cell is not a clearance.",
  "On a mapped cell, naming the direction of the sharpest row. On a blank cell, saying whether the pair shares an enzyme with no perpetrator, or a perpetrator that does not land. A blank reason is not a clearance.",
  "When an enzyme on the desk has no mapped row, saying whether no perpetrator or no victim was mapped. That line is not a clearance.",
  "On request, three separate readers (pair, gap, trainee) restate the check already on screen. A reader cannot add a finding, a milligram, or a clearance.",
  "Showing the start clock, the stop clock, and the watch for the sharpest pair only. If that pair has no mapped clock, the row says so. The clock does not pick a milligram.",
  "Building a shareable regimen brief that lists mapped pairs worst-first with a plain-language lead sentence, then whole-desk notes. Free desks may copy the brief for teaching. The brief does not pick a milligram or a next step.",
  "Displaying study cards (rounds, named labeled pairs, formulary CYP roles, FDA fold-change grades, and mechanism cards from the selected pair) so a healthcare trainee can rehearse the basis, mark misses, and review them. Not an exam key and not a milligram.",
  "Watching user-selected names for OpenFDA shortage and enforcement/recall excerpts so the healthcare professional can independently review the basis. The excerpts are shortened for teaching. This is not a shortage alert service and not a milligram.",
  "Linking CPIC / ClinPGx tables, PubMed PMIDs, DrugBank accessions, NIH RxClass, LactMed paraphrases, and ClinicalTrials.gov records for independent review.",
] as const;

export const NOT_FOR = [
  "Patients acting without a licensed healthcare professional.",
  "Generating a prescription, a milligram, a take-home, or an induction protocol.",
  "Patient self-treatment, recreational dosing, or informal harm-reduction guidance meant to replace professional assessment.",
  "Charting, billing, PDMP query, or storing protected health information.",
  "Processing medical images, waveforms, or device signals.",
  "Replacing the FDA-approved Prescribing Information, a poison-control consult, or bedside assessment.",
] as const;

export const WARNINGS = [
  "FirstPass is not FDA-cleared and not FDA-approved. Do not describe it as either.",
  "The FDA-approved Prescribing Information is the authority. If this desk and the label disagree, the label wins.",
  "This software is for educational harm-reduction and recreational-safety review, not patient-directed treatment, self-dosing, or a substitute for clinical judgment.",
  "Absence of a mapped collision is not proof of safety. Transporters, UGT, plasma protein, unlisted metabolites, and unpublished interactions still apply.",
  "Live OpenFDA / DailyMed excerpts are truncated. Open the full SPL before acting.",
  "Street-supply rows (xylazine, nitazenes, designer benzos) are teaching maps, not labeled products.",
  "Harm-reduction copy paraphrases DanceSafe, PsychonautWiki, TripSit, SAMHSA, and CDC. Live wiki extracts are sanitized of milligrams and route how-to; a wiki is still not a Prescribing Information. Independently review.",
  "COWS, CIWA-Ar, Hunter, MME, QTc, and CYP start/stop clocks are published formulas and FDA-grade paraphrases displayed for independent scoring — not a diagnosis, not a hold, and not a documented vital.",
] as const;

/** FDA Clinical Decision Support Software guidance (issued Jan 6, 2026; revised Jan 29, 2026) — four statutory criteria for non-device CDS. */
export const CDS_CRITERIA: { id: string; title: string; how: string }[] = [
  {
    id: "1",
    title: "Not an image or signal device",
    how: "FirstPass does not acquire, process, or analyze medical images, IVD data, or physiologic signals. Inputs are user-selected drug names and optional host flags.",
  },
  {
    id: "2",
    title: "Displays medical information",
    how: "The desk displays FDA-label excerpts, published enzyme maps, and cited literature about the selected regimen.",
  },
  {
    id: "3",
    title: "Recommendations to a healthcare professional",
    how: "Watch / counsel / consider language is directed at licensed HCPs, and at health-professions students only for supervised education. It is not a patient-facing or general-public app.",
  },
  {
    id: "4",
    title: "Independent review of the basis",
    how: "Every collision names its mechanism, the drugs, the source class (FDA boxed, PI, CPIC, PMID, published scale, or desk map), and a link to DailyMed or PubMed. The HCP can reject the recommendation.",
  },
];

export const HAZARDS: { id: string; hazard: string; control: string }[] = [
  {
    id: "H1",
    hazard: "User treats a collision as a dose or a hold order.",
    control: "Labeled ranges and user-entered milligram checks only. Window language is 'consider / independently review.' IFU and huddle footer repeat that the PI governs. The desk never fills a milligram.",
  },
  {
    id: "H2",
    hazard: "Desk map disagrees with the current label.",
    control: "Live OpenFDA / DailyMed excerpts sit on the desk. Label wins. Sources page is one tap.",
  },
  {
    id: "H3",
    hazard: "Missing interaction is read as 'safe.'",
    control: "Empty-collision copy states absence is not proof of safety. Live label-pair scan is offered.",
  },
  {
    id: "H4",
    hazard: "Patient uses the desk without an HCP.",
    control: "Intended-use statement, persistent HCP banner, and no patient-facing dosing UI. Dose rails are HCP-directed labeled ranges, not a prescription writer.",
  },
  {
    id: "H5",
    hazard: "Stale software after a label change.",
    control: "Software version is printed on the IFU, export, and huddle. Live label fetch is not a cache of last year.",
  },
];

export const PRIMARY_SOURCES = [
  { name: "OpenFDA drug labels", href: "https://open.fda.gov/apis/drug/label/" },
  { name: "DailyMed SPL", href: "https://dailymed.nlm.nih.gov/" },
  { name: "FDA CYP / transporter tables", href: "https://www.fda.gov/drugs/drug-interactions-labeling/drug-development-and-drug-interactions-table-substrates-inhibitors-and-inducers" },
  { name: "FDA drug shortages", href: "https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages" },
  { name: "FDA enforcement reports", href: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts" },
  { name: "NIH RxNorm / RxClass", href: "https://www.nlm.nih.gov/research/umls/rxnorm/" },
  { name: "CPIC", href: "https://cpicpgx.org/" },
  { name: "NCBI PubMed", href: "https://pubmed.ncbi.nlm.nih.gov/" },
  { name: "NIDDK LiverTox", href: "https://www.ncbi.nlm.nih.gov/books/NBK547852/" },
  { name: "NIH LactMed", href: "https://www.ncbi.nlm.nih.gov/books/NBK501922/" },
  { name: "PsychonautWiki", href: "https://psychonautwiki.org/wiki/Responsible_drug_use" },
  { name: "TripSit combination chart", href: "https://wiki.tripsit.me/wiki/Drug_combinations" },
  { name: "DanceSafe · reagent instructions", href: "https://dancesafe.org/testing-kit-instructions/" },
] as const;

export const NOT_CLEARED =
  "This software has not been cleared or approved by the U.S. Food and Drug Administration. Display of FDA-label text does not make FirstPass an FDA-cleared device.";

export const PI_FOOTER = `${SOFTWARE.name} ${SOFTWARE.version} · Not FDA-cleared · Confirm against the FDA-approved Prescribing Information · Labeled ranges are not a prescription · Independent review required.`;

export function dailymedSearchUrl(name: string) {
  return `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(name)}`;
}

export function dailymedSetUrl(setId: string) {
  return `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setId)}`;
}

export function openFdaLabelUrl(name: string) {
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=BasicSearch.process&searchterm=${encodeURIComponent(name)}`;
}
