/** Labeling for FirstPass as non-device clinical decision support.
 *  Not FDA-cleared. Not FDA-approved. The Prescribing Information governs. */

export const SOFTWARE = {
  name: "FirstPass",
  version: "1.53.0",
  released: "2026-09-26",
  manufacturer: "Kaleb Lovingier",
  email: "FirstPassInteractions@gmail.com",
  phone: "360-707-8923",
  /** Internal build tag. Not an FDA Unique Device Identifier (FirstPass is not a device). */
  buildId: "FP-SW-1.53.0",
} as const;

/** FD&C Act 520(o)(1)(E) / FDA CDS Guidance (January 2026, superseding 2022) posture — not a clearance. */
/** Single source of truth for who the desk is for. Copy elsewhere must match. */
export const INTENDED_USERS =
  "For licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision.";

export const RECREATIONAL_SAFETY_CONTEXT =
  "This desk may be used in educational harm-reduction and recreational-safety review for licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision, including analysis of stimulant, sedative, dissociative, and street-supply combinations. Where local drug-checking services are available, purity and content testing services are complementary harm-reduction tools; they are not urine testing, not patient-directed dosing guidance, and not a substitute for the relevant FDA-approved Prescribing Information or local protocols. It is not intended for patient self-treatment, recreational dosing, or direct medical decision-making without independent review of the relevant FDA-approved Prescribing Information and local protocols.";

export const INTENDED_USE =
  `FirstPass is educational interaction reference software intended for use by licensed healthcare professionals, and by students in accredited health-professions programs using it for education under faculty or preceptor supervision, to display mapped cytochrome P450 and pharmacodynamic interaction information, FDA-label excerpts (OpenFDA / DailyMed), published scale scores, labeled dose ranges and dose-caps, and cited literature so the healthcare professional can independently review the basis of any recommendation before acting. ${RECREATIONAL_SAFETY_CONTEXT} It is not intended to diagnose, treat, mitigate, or prevent disease, to generate a prescription, or to replace the FDA-approved Prescribing Information. Displayed dose ranges paraphrase FDA-approved labeling; a user-entered milligram is checked against those rails. The desk does not pick a milligram.`;

export const INDICATIONS = [
  "Displaying CYP450 substrate / inhibitor / inducer maps, FDA DDI fold-change grades, start/stop timing study aids (reversible vs time-dependent inactivation vs induction lag), and pharmacodynamic collision scores for drugs and foods on a user-selected regimen.",
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
  "Naming the enzyme on a mapped cell, and showing the sharpest food and drink hits beside the pair grid. Those food cells are not on the desk until added.",
  "On a CYP cell, naming whether the victim is a sensitive substrate, a minor pathway, a prodrug, or a narrow window. When a pair has another kind of row, naming that effect. Neither line picks a milligram.",
  "Putting the first openable source on the sharpest row, before the row is expanded. The source is for independent review. It is not a clearance and not a milligram.",
  "On request, the three readers restate the sharpest row, its clock, its source, and the blank-pair reasons already on screen. A reader cannot add a finding, a source, a milligram, or a clearance.",
  "Showing the sharpest pregnancy, CKD, older-adult, and daily-smoke row on the pair grid, labeled as a different host. Those cells are not the person on the desk unless that flag is on. They do not pick a milligram.",
  "Showing the sharpest food and host rows on a two-drug check, not only on a longer regimen. A host cell that says more in this lane has other rows below. None of those cells pick a milligram.",
  "Naming the first openable source on a mapped cell, a food cell, and a host cell. The source is for independent review. It is not a clearance and not a milligram.",
  "On a CYP cell, naming the perpetrator grade already on that row: strong, moderate, or weak. The grade is the map’s word. It is not a milligram and not a clearance.",
  "When narcotic use is reported, or an opioid or partial opioid is on the desk, showing public lines for treatment referral, a treatment locator, a crisis line, and an overdose-response line. The desk does not diagnose a substance use disorder and does not pick a treatment or a milligram. The report is not stored.",
  "When that card is open and the map already has an opioid-with-benzodiazepine, gabapentinoid, or second-agonist row, naming that row. Copying the public lines does not store the report and does not pick a next step.",
  "Keeping the call buttons on one line and the explanation of each public line behind a disclosure, so the interaction check stays reachable. If the copy fails, the same lines are shown to copy by hand.",
  "Letting a person type a ZIP to resolve state helplines via a static in-browser table that does not transmit or store the ZIP, text it to 435748, or open the FindTreatment.gov locator and search it there. The desk does not look up a facility and does not store or transmit the ZIP. The locator link cannot carry the ZIP. The card appears once, on the interaction check, not again on the harm-reduction tab.",
  "Naming the opioid or partial opioid that opened the public lines. A same-shelf cell names two drugs in one class and says it is not a collision. On a row with one enzyme, the chip includes the perpetrator grade already on that row. The three readers are told the public lines are not a finding.",
  "On Learn, defining the words already on a check row, and asking them back on the enzyme map: direction, prodrug, minor pathway, blank cell, and same shelf. Up to three strong examples per enzyme role. Not an exam key and not a milligram.",
  "On an open CYP row, naming the FDA fold already stored for that perpetrator grade. A one-day preview counts down in hours once less than a day remains. The fold is not a milligram.",
  "Class shelves on the formulary, counted from the catalog. A selected class states the most common enzyme role already mapped, and says that is not a collision. Typing a class pulls that shelf forward even when it is not one of the largest. A same-shelf cell names single-ingredient classmates who are not on the desk, without suggesting they be added.",
  "On a mapped grid cell, showing the FDA fold already stored for that perpetrator grade. Learn asks which enzyme role is most common on eight class shelves, counted from the catalog, and can open those shelves. The fold and the count are not a milligram.",
  "The atlas counts substrates, inhibitors, and inducers already stored for the selected enzyme, and how many of those inhibitors are strong. A plain-language row restates the FDA fold when the mechanism already names a strong, moderate, or weak inhibitor or inducer. An enzyme header on the desk map opens that enzyme in the atlas. None of these is a milligram or a clearance.",
  "A same-shelf cell can open that class on the formulary. An open row with one enzyme can open that enzyme in the atlas. Neither jump adds a drug or picks a milligram.",
  "Learn asks the FDA fold already stored for a moderate inhibitor and for a weak inhibitor. A class shelf also names the second-most-common enzyme role when at least two drugs carry it. A revealed shelf card can open that shelf, and a revealed direction card can open the atlas or the formulary. None of these is a milligram.",
  "The check opens with a contents line: mapped rows, same-shelf groups, food beside the desk, and blank pairs. Each name on the desk shows its class. The enzyme map counts how many drugs on the tray touch each enzyme. The counts are not a clearance.",
  "A two-name check groups its rows by the enzyme already on each row, and those rows start closed. Jump links reach the rows and the food list. Search names the stored inhibitor or inducer strength. A desk study card asks which enzyme that row names, and can return to the check. None of this is a milligram or a clearance.",
  "An enzyme group header opens that enzyme in the atlas. A closed row shows the FDA fold already stored for that grade. A name on the desk shows one stored enzyme role. Search names a substrate's stored sensitivity. An empty Learn desk can load clarithromycin and simvastatin as a teaching pair, not a suggestion to take either. A class shelf says how many of its drugs are already on the desk. None of this is a milligram or a clearance.",
  "Food and drink rows group by the enzyme already on each row. Case compare shows that enzyme and the stored FDA fold. Sources pins papers already tied to a name on the desk. A one-drug Learn card asks which enzyme is named first on that drug, and a revealed enzyme answer can open the atlas. A phenotype enzyme can open the atlas. The medication review names the enzymes already on the strongest mapped row. None of this is a milligram or a clearance.",
  "A role line and a food-group header open that enzyme in the atlas. An ungated case can load its names into Learn. A watch pin shows one stored enzyme role. A single-enzyme Learn card hides the teaching bin until reveal. A shelf card names a substrate's stored sensitivity. None of this is a milligram or a clearance.",
  "The check contents line names up to three enzyme groups already on the rows, and can open Learn for this desk. Search and the atlas say when a name is already on the desk. A cited paper names which of its drugs are on the desk. Learn asks which teaching bin is stored on a mapped row, using the four existing bins. A watch pin and the medication review can open Learn. None of this is a milligram or a clearance.",
  "Pharmacokinetic math does not emit Avoid together; a named label pin still can. Dual ACE-inhibitor plus ARB is Serious concern unless the pair is the labeled aliskiren pin. Linezolid with a tyramine food is Serious concern; an irreversible MAOI with that food stays Avoid together. A row with no external source says so. The bins are unreviewed engineering defaults. None of this is a milligram or a clearance.",
  "The founding card on the enzyme atlas sits at the top of that page and stays in view while the map scrolls. It does not change what founding unlocks.",
  "Learn asks the stored role on a name (substrate, inhibitor, or inducer) and the stored direction on a mapped row (exposure up or down, or the active metabolite). The prompt does not give that answer away. None of this is a milligram or a clearance.",
  "When an enzyme on the desk has no mapped row, saying whether no perpetrator or no victim was mapped. That line is not a clearance.",
  "Showing the start clock, the stop clock, and the watch for the sharpest pair only. If that pair has no mapped clock, the row says so. The clock is a study aid for how timing changes the picture, not a real-time or time-critical alert, and it does not pick a milligram.",
  "Building a shareable regimen brief that lists mapped pairs worst-first with a plain-language lead sentence, then whole-desk notes. Free desks may copy the brief for teaching. The brief does not pick a milligram or a next step.",
  "Displaying study cards (rounds, named labeled pairs, formulary CYP roles, FDA fold-change grades, and mechanism cards from the selected pair) so a healthcare trainee can rehearse the basis, mark misses, and review them. Not an exam key and not a milligram.",
  "Watching user-selected names for OpenFDA shortage and enforcement/recall excerpts so the healthcare professional can independently review the basis. The excerpts are shortened for teaching. They are recent label, shortage, and recall notes to read, not safety alerts, not a shortage alert service, and not a milligram.",
  "Linking CPIC / ClinPGx tables, PubMed PMIDs, DrugBank accessions, NIH RxClass, LactMed paraphrases, and ClinicalTrials.gov records for independent review.",
  "Reading a metabolizer status the healthcare professional already knows and picks by hand. Metabolizer rows are teaching paraphrases of CPIC guidance, not a genetic test result and not an interpretation of one. The desk takes no raw genotype or genetic test data as input.",
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
  "COWS, CIWA-Ar, Hunter, MME, QTc, and CYP start/stop clocks are published formulas and FDA-grade paraphrases displayed for independent scoring — not a diagnosis, not a hold, not a documented vital, and not a real-time alert.",
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
