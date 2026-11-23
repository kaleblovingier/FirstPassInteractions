/**
 * Emerging Forensic Supply Surveillance Registry (2025-2026 NPS Early Warning).
 *
 * Synthesizes public forensic toxicology alerts from:
 * - CFSRE (Center for Forensic Science Research & Education — NPS Discovery)
 * - UNODC (United Nations Office on Drugs and Crime — Early Warning Advisory)
 * - EUDA (European Union Drugs Agency, formerly EMCDDA)
 * - DEA (U.S. Drug Enforcement Administration — Emerging Threat Reports)
 *
 * Educational pharmacology and toxicology reference only. Not a dose. Not FDA-cleared.
 */

export type NpsFamily =
  | "orphine"
  | "nitazene"
  | "designer-benzo"
  | "hhc"
  | "alpha2"
  | "kratom-alkaloid"
  | "dissociative";

export type NpsAgency = "CFSRE" | "UNODC" | "EUDA" | "DEA";

export interface NpsWatchEntry {
  id: string;
  shortLabel: string;
  family: NpsFamily;
  agencies: readonly NpsAgency[];
  assayBlindSpot: string;
  naloxoneNote: string;
  watchNote: string;
}

export const NPS_FAMILIES: readonly { id: NpsFamily; label: string }[] = [
  { id: "orphine", label: "Orphine opioids (7)" },
  { id: "nitazene", label: "Nitazene opioids (8)" },
  { id: "designer-benzo", label: "Designer benzos (4)" },
  { id: "hhc", label: "HHC cannabinoids (4)" },
  { id: "alpha2", label: "Veterinary α2 adulterants (1)" },
  { id: "kratom-alkaloid", label: "Concentrated kratom alkaloids (1)" },
  { id: "dissociative", label: "Arylcyclohexylamine dissociatives (2)" },
] as const;

export const NPS_WATCH: readonly NpsWatchEntry[] = [
  // —— Orphines (7) ————————————————————————————————————————————————
  {
    id: "cychlorphine",
    shortLabel: "Cychlorphine (N-propionitrile chlorphine)",
    family: "orphine",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Invisible on routine hospital opiate immunoassays, fentanyl test strips (FTS), and nitazene test strips; requires updated LC-QTOF / LC-MS/MS library matching.",
    naloxoneNote:
      "Reversible at μ-opioid receptors, but high receptor affinity frequently demands repeat naloxone administration, continuous airway support, and extended monitoring for re-narcotization.",
    watchNote:
      "Surged in 2025–2026 counterfeit oxycodone and pressed alprazolam/bromazolam tablets; carries brorphine-scaffold hERG potassium-channel QTc prolongation concern.",
  },
  {
    id: "brorphine",
    shortLabel: "Brorphine",
    family: "orphine",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Negative on fentanyl test strips and standard urine opiate cups; detected only on expanded synthetic-opioid LC-MS/MS panels.",
    naloxoneNote:
      "Competitive μ-opioid reversal applies, though repeat naloxone and prolonged observation are needed; naloxone does not reverse co-adulterated α2-agonists or designer benzos.",
    watchNote:
      "Prototype benzimidazolone-piperidine ('orphine') street opioid that bridged the transition between fentanyl analogues, nitazenes, and newer chloro-orphines; documented hERG blockade in vitro.",
  },
  {
    id: "spirochlorphine",
    shortLabel: "Spirochlorphine (R-6890)",
    family: "orphine",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Missed by fentanyl and nitazene lateral-flow strips as well as standard hospital urine toxicology screens; requires targeted high-resolution mass spectrometry.",
    naloxoneNote:
      "Responds to μ-opioid antagonism with higher cumulative naloxone requirement and airway vigilance; ECG monitoring advised for class-level hERG/QTc signal.",
    watchNote:
      "Archival spiro-decane benzimidazolone opioid (R-6890) re-emerging in forensic seizures alongside cychlorphine; high lipophilicity prolongs CNS depression.",
  },
  {
    id: "sr-17018",
    shortLabel: "5,6-Dichloro-desmethylchlorphine (SR-17018)",
    family: "orphine",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Completely absent from clinical immunoassay panels and lateral-flow harm-reduction strips; frequent grey-market mislabeling requires forensic LC-MS/MS verification.",
    naloxoneNote:
      "Full μ-opioid respiratory depression remains naloxone-responsive, but unpredictable cross-tolerance and co-ingested sedatives require immediate bag-valve-mask airway priority.",
    watchNote:
      "Preclinical G-protein bias reported in rodent literature does NOT protect humans from fatal apnea, erratic tolerance shifts, precipitated withdrawal swings, or sedative stacking.",
  },
  {
    id: "dichloro-brorphine",
    shortLabel: "5,6-Dichloro-brorphine",
    family: "orphine",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Negative on point-of-care fentanyl and opiate immunoassays; halogen-substituted benzimidazolone fragments require updated forensic MS/MS transitions.",
    naloxoneNote:
      "Naloxone reverses the μ-opioid component,often requiring repeat titration and prolonged re-narcotization watch.",
    watchNote:
      "Dichloro-substituted brorphine analogue identified in illicit opioid powders; shares the CYP3A4 clearance bottleneck and hERG potassium-channel QTc liability of the orphine class.",
  },
  {
    id: "chlorphine",
    shortLabel: "Chlorphine",
    family: "orphine",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Fails to trigger fentanyl test strips or routine opiate immunoassays; distinguishable from brorphine and cychlorphine only via chromatographic/mass-spectral confirmation.",
    naloxoneNote:
      "Reversible with titrated naloxone plus airway support; monitor for delayed re-sedation and QTc prolongation.",
    watchNote:
      "Chloro-substituted brorphine congener appearing as both a standalone synthetic opioid and a synthetic precursor/byproduct in cychlorphine batches.",
  },
  {
    id: "n-phenethyl-chloro-nor-orphine",
    shortLabel: "N'-Phenethyl-5/6-chloro nor-orphine",
    family: "orphine",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Negative on routine point-of-care strips; 5-chloro vs 6-chloro positional isomerism challenges standard GC-MS/LC-MS library identification.",
    naloxoneNote:
      "Treat acute hypoventilation with ventilatory support and titrated naloxone; watch for prolonged μ-opioid re-narcotization and unreversed sedative co-adulterants.",
    watchNote:
      "Positional chloro-isomer derivative of the nor-orphine scaffold flagged in forensic reference standards and seized street samples.",
  },

  // —— Nitazenes (8) ———————————————————————————————————————————————
  {
    id: "etonitazene",
    shortLabel: "Etonitazene",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Does not cross-react with fentanyl test strips or standard hospital opiate immunoassays; detected by dedicated nitazene immunoassay strips or forensic LC-MS/MS.",
    naloxoneNote:
      "High μ-opioid potency and rapid chest-wall/apneic arrest often necessitate repeat naloxone administration and immediate ventilatory rescue.",
    watchNote:
      "Archetypal 2-benzylbenzimidazole opioid with in-vitro MOR potency orders of magnitude above morphine; frequently mixed into counterfeit tablets and illicit powders.",
  },
  {
    id: "isotonitazene",
    shortLabel: "Isotonitazene",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Invisible on fentanyl strips and standard urine drug screens; requires nitazene lateral-flow strips or targeted benzimidazole mass spectrometry.",
    naloxoneNote:
      "Requires prompt ventilatory support and repeat naloxone monitoring because hepatic N-deethylation generates active norisotonitazene, extending the apneic window.",
    watchNote:
      "First widely distributed street nitazene wave; metabolizes via CYP3A4 to active norisotonitazene, producing biphasic or prolonged respiratory depression.",
  },
  {
    id: "metonitazene",
    shortLabel: "Metonitazene",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Negative on fentanyl test strips and standard opiate cups; detectable on broad nitazene lateral-flow strips and forensic LC-MS/MS.",
    naloxoneNote:
      "Responsive to naloxone at μ-opioid receptors, but co-formulation with xylazine, medetomidine, or bromazolam frequently leaves patients comatose after opioid reversal.",
    watchNote:
      "Pervasive benzimidazole opioid in pressed M30/oxycodone counterfeits and poly-adulterated street powders across North America and Europe.",
  },
  {
    id: "protonitazepyne",
    shortLabel: "Protonitazepyne (N-pyrrolidino protonitazene)",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Negative on fentanyl test strips and routine hospital opiate panels; N-pyrrolidino ring modification can reduce sensitivity on older lateral-flow nitazene strips.",
    naloxoneNote:
      "Ultra-high MOR affinity and lipophilic depot behavior drive rapid apneic arrest and recurrent re-narcotization outlasting single-bolus naloxone.",
    watchNote:
      "Dominant 2024–2026 N-pyrrolidino nitazene linked to severe overdose clusters in counterfeit tablets and 'benzo-dope' supplies.",
  },
  {
    id: "metonitazepyne",
    shortLabel: "Metonitazepyne (N-pyrrolidino metonitazene)",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Missed by fentanyl test strips and routine opiate immunoassays; requires updated LC-MS/MS transitions covering N-pyrrolidino benzimidazoles.",
    naloxoneNote:
      "Reversible with titrated naloxone and continuous bag-valve-mask ventilation; prolonged observation mandatory for delayed re-sedation.",
    watchNote:
      "N-pyrrolidino analogue of metonitazene proliferating alongside protonitazepyne in pressed pills and synthetic heroin/fentanyl blends.",
  },
  {
    id: "etonitazepipne",
    shortLabel: "Etonitazepipne (N-piperidinyl etonitazene)",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Fails to trigger fentanyl test strips or standard hospital opiate screens; N-piperidinyl substitution requires specific forensic mass-spectral confirmation.",
    naloxoneNote:
      "High μ-opioid potency requires aggressive airway support and repeat naloxone titration with extended post-reversal monitoring.",
    watchNote:
      "N-piperidinyl analogue of etonitazene flagged in European and North American forensic seizures as a high-potency ring-modified benzimidazole opioid.",
  },
  {
    id: "norisotonitazene",
    shortLabel: "Norisotonitazene (N-desethyl isotonitazene)",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Invisible on routine opiate and fentanyl point-of-care screens; detected in forensic blood/urine as both an isotonitazene metabolite and a primary street drug.",
    naloxoneNote:
      "Potent active μ-agonist demanding sustained naloxone vigilance and prolonged observation after apparent initial reversal.",
    watchNote:
      "Dual forensic significance: active N-deethylated CYP3A4 metabolite of isotonitazene that retains high MOR potency, and an independently distributed street nitazene.",
  },
  {
    id: "n-pyrrolidino-ethylene-isotonitazene",
    shortLabel: "N-Pyrrolidino ethylene isotonitazene",
    family: "nitazene",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Evades fentanyl strips, routine hospital immunoassays, and first-generation nitazene MRM panels lacking linker-modified transitions.",
    naloxoneNote:
      "Treat clinically as an ultra-potent μ-opioid with early airway control and repeat naloxone readiness.",
    watchNote:
      "2025–2026 ethylene-linker and pyrrolidine-ring variant of isotonitazene engineered to circumvent generic class scheduling while maintaining MOR agonism.",
  },

  // —— Designer benzodiazepines (4) ————————————————————————————————
  {
    id: "desalkylgidazepam",
    shortLabel: "Desalkylgidazepam (Bromonordiazepam)",
    family: "designer-benzo",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Variable cross-reactivity on standard clinical benzodiazepine urine immunoassays; false negatives occur unless confirmed by LC-MS/MS.",
    naloxoneNote:
      "Not reversed by naloxone. In 'benzo-dope' overdoses, naloxone restores respiratory drive from the opioid while desalkylgidazepam sedation persists.",
    watchNote:
      "Active metabolite of gidazepam widely trafficked as a standalone designer benzodiazepine; exceptionally long elimination half-life drives multi-day accumulation and delayed withdrawal seizures.",
  },
  {
    id: "ethylbromazolam",
    shortLabel: "Ethylbromazolam",
    family: "designer-benzo",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Inconsistent detection on legacy clinical benzodiazepine immunoassays and uncalibrated benzodiazepine test strips; requires updated forensic LC-MS/MS library.",
    naloxoneNote:
      "Not reversed by naloxone; prioritize airway patency and oxygenation after reversing co-ingested opioids. Avoid routine flumazenil due to seizure risk.",
    watchNote:
      "2025–2026 ethyl-substituted successor replacing scheduled bromazolam in counterfeit alprazolam bars and fentanyl/nitazene powders.",
  },
  {
    id: "ethylflualprazolam",
    shortLabel: "Ethylflualprazolam",
    family: "designer-benzo",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Triazolobenzodiazepine structure often under-reacts on oxazepam/nordiazepam-calibrated hospital urine screens; confirm with targeted LC-MS/MS.",
    naloxoneNote:
      "Naloxone does not reverse GABA-A sedation; manage persistent coma with airway protection rather than excessive naloxone escalation.",
    watchNote:
      "High-potency fluorinated triazolobenzodiazepine analogue of flualprazolam causing profound anterograde amnesia, respiratory synergy with opioids, and severe withdrawal seizures.",
  },
  {
    id: "phenazolam",
    shortLabel: "Phenazolam (Clobromazolam)",
    family: "designer-benzo",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Frequently missed by standard point-of-care urine benzodiazepine cups due to low microgram tissue concentrations and triazolo ring structure.",
    naloxoneNote:
      "Not reversed by naloxone; co-exposure with nitazenes or fentanyl produces profound refractory central apnea requiring ventilatory support.",
    watchNote:
      "Ultra-potent chloro-bromo triazolobenzodiazepine ('clobromazolam') sold in counterfeit pressed bars and blotters; high blackout and status-epilepticus withdrawal liability.",
  },

  // —— Semi-synthetic cannabinoids — HHC Series (4) ————————————————
  {
    id: "hhc",
    shortLabel: "HHC (Hexahydrocannabinol)",
    family: "hhc",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Cross-reacts unpredictably on standard THC-COOH urine immunoassays but fails gas-chromatography or LC-MS/MS confirmation panels tuned only for delta-9-THC.",
    naloxoneNote:
      "CB1 cannabinoid receptor agonist — not reversed by naloxone (unless the vape or edible is illicitly adulterated with a synthetic opioid).",
    watchNote:
      "Hydrogenated CBD-derived cannabinoid sold as 9R/9S epimer mixtures; variable (9R)-HHC enrichment causes erratic CB1 intoxication, tachycardia, and anxiety.",
  },
  {
    id: "hhc-p",
    shortLabel: "HHC-P (Hexahydrocannabiphorol)",
    family: "hhc",
    agencies: ["UNODC", "EUDA"],
    assayBlindSpot:
      "Missed by standard delta-9-THC confirmatory mass spectrometry; requires heptyl-homologue LC-MS/MS reference standards.",
    naloxoneNote:
      "Not an opioid; naloxone has no effect on CB1-mediated stupor, panic, agitation, or orthostatic collapse.",
    watchNote:
      "Heptyl-tail HHC homologue with markedly higher CB1 receptor affinity and multi-day duration, driving prolonged encephalopathy, panic/psychosis, and hyperemesis.",
  },
  {
    id: "hhc-o",
    shortLabel: "HHC Acetate (HHC-O)",
    family: "hhc",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Deacetylates in vivo to HHC and hydroxylated HHC metabolites; parent acetate ester is rarely detected in urine and requires blood/vape-fluid analysis.",
    naloxoneNote:
      "Not reversed by naloxone; manage acute inhalational lung injury, hypoxia, and agitation supportively.",
    watchNote:
      "O-acetylated HHC prodrug with two hazards: delayed oral/inhaled onset leading to accidental re-dosing, and thermal generation of toxic ketene gas when vaped or dabbed.",
  },
  {
    id: "ten-oh-hhc",
    shortLabel: "10-OH-HHC",
    family: "hhc",
    agencies: ["UNODC", "EUDA"],
    assayBlindSpot:
      "Indistinguishable from endogenous hepatic HHC metabolism unless quantified with specialized hydroxylated-HHC forensic standards.",
    naloxoneNote:
      "CB1 agonist — not reversed by naloxone; supportive care for tachycardia, panic, and CNS sedation.",
    watchNote:
      "Active hydroxylated HHC metabolite marketed directly as a next-wave commercial vape/edible cannabinoid after European HHC bans.",
  },

  // —— Veterinary α2-agonist adulterant (1) ————————————————————————
  {
    id: "medetomidine",
    shortLabel: "Medetomidine (racemic dexmedetomidine)",
    family: "alpha2",
    agencies: ["CFSRE", "UNODC", "DEA"],
    assayBlindSpot:
      "Negative on xylazine test strips (XTS), fentanyl test strips, and routine hospital urine toxicology screens; requires LC-MS/MS confirmation (note: shares identical mass with clinical dexmedetomidine).",
    naloxoneNote:
      "NOT reversed by naloxone. Give naloxone for the co-present fentanyl/nitazene, but expect persistent deep α2 coma, severe bradycardia, and hypotension requiring airway and hemodynamic support.",
    watchNote:
      "Potent veterinary α2-adrenergic agonist (up to 100–200x more potent than xylazine) displacing or stacking with xylazine in illicit fentanyl/nitazene supplies; abrupt withdrawal causes severe autonomic storm and hypertension.",
  },

  // —— Concentrated kratom alkaloid (1) ————————————————————————————
  {
    id: "seven-oh",
    shortLabel: "7-Hydroxymitragynine (7-OH)",
    family: "kratom-alkaloid",
    agencies: ["CFSRE", "DEA"],
    assayBlindSpot:
      "Negative on routine hospital opiate, oxycodone, methadone, and fentanyl immunoassays; requires specialized mitragynine / 7-hydroxymitragynine LC-MS/MS quantification.",
    naloxoneNote:
      "Acts as a high-affinity μ-opioid receptor agonist — respiratory depression and CNS obtundation ARE reversible with naloxone.",
    watchNote:
      "Semi-synthetically concentrated 7-OH tablets, shots, and sublingual strips carry roughly an order-of-magnitude higher μ-opioid potency than raw leaf mitragynine, behaving clinically like a conventional opioid on CYP3A4 and CNS-depressant boards.",
  },

  // —— Arylcyclohexylamine dissociatives (2) ———————————————————————
  {
    id: "dck",
    shortLabel: "Deschloroketamine (DCK)",
    family: "dissociative",
    agencies: ["CFSRE", "UNODC", "EUDA"],
    assayBlindSpot:
      "Variable cross-reactivity on PCP and ketamine point-of-care immunoassays; definitive separation from ketamine and 2-FDCK requires GC-MS or LC-MS/MS.",
    naloxoneNote:
      "NMDA receptor antagonist — not reversed by naloxone; airway compromise occurs primarily when stacked with opioids, benzodiazepines, GHB, or alcohol.",
    watchNote:
      "Deschloro-analogue of ketamine with higher oral bioavailability, longer duration, and significant CYP2B6/CYP3A4 first-pass sensitivity.",
  },
  {
    id: "two-fdck",
    shortLabel: "2-Fluorodeschloroketamine (2-FDCK)",
    family: "dissociative",
    agencies: ["CFSRE", "UNODC", "EUDA", "DEA"],
    assayBlindSpot:
      "Often triggers false-negative or inconsistent results on commercial ketamine urine strips while mimicking ketamine clinically; requires LC-MS/MS confirmation.",
    naloxoneNote:
      "NMDA receptor antagonist — not reversed by naloxone; administer naloxone only if co-exposure with illicit opioids is suspected.",
    watchNote:
      "Fluorinated ketamine analogue widely substituted for illicit ketamine in powders and blotters; prominent oral CYP3A4/CYP2B6 first-pass interaction trap.",
  },
] as const;

export const NPS_WATCH_BY_ID: Readonly<Record<string, NpsWatchEntry>> = Object.fromEntries(
  NPS_WATCH.map((e) => [e.id, e]),
);

/** All 7 orphine synthetic opioids in the catalog. */
export const NPS_ORPHINE_IDS: ReadonlySet<string> = new Set([
  "cychlorphine",
  "brorphine",
  "spirochlorphine",
  "sr-17018",
  "dichloro-brorphine",
  "chlorphine",
  "n-phenethyl-chloro-nor-orphine",
]);

/** All 13 benzimidazole (nitazene) opioids in the catalog (8 watch-list + 5 earlier wave nitazenes). */
export const NPS_NITAZENE_IDS: ReadonlySet<string> = new Set([
  "etonitazene",
  "isotonitazene",
  "metonitazene",
  "protonitazepyne",
  "metonitazepyne",
  "etonitazepipne",
  "norisotonitazene",
  "n-pyrrolidino-ethylene-isotonitazene",
  "protonitazene",
  "n-pyrrolidino-etonitazene",
  "etodesnitazene",
  "butonitazene",
  "flunitazene",
]);

/** Designer benzodiazepines and thienodiazepines tracked across forensic supply alerts. */
export const NPS_DESIGNER_BENZO_IDS: ReadonlySet<string> = new Set([
  "bromazolam",
  "flubromazolam",
  "desalkylgidazepam",
  "ethylbromazolam",
  "ethylflualprazolam",
  "phenazolam",
  "pyrazolam",
  "flubromazepam",
  "deschloroetizolam",
  "meclonazepam",
]);

/** Semi-synthetic hydrogenated cannabinoids (HHC series). */
export const NPS_HHC_IDS: ReadonlySet<string> = new Set([
  "hhc",
  "hhc-p",
  "hhc-o",
  "ten-oh-hhc",
]);

/** Street / emerging synthetic μ-opioid agonists (all orphines + all nitazenes + concentrated 7-OH). */
export const NPS_STREET_OPIOID_IDS: ReadonlySet<string> = new Set([
  ...NPS_ORPHINE_IDS,
  ...NPS_NITAZENE_IDS,
  "seven-oh",
]);

/** Returns all NPS surveillance entries present on the active desk, preserving desk order. */
export function npsWatchOnDesk(ids: readonly string[]): NpsWatchEntry[] {
  const seen = new Set<string>();
  const out: NpsWatchEntry[] = [];
  for (const id of ids) {
    if (seen.has(id) || !Object.hasOwn(NPS_WATCH_BY_ID, id)) continue;
    seen.add(id);
    out.push(NPS_WATCH_BY_ID[id]!);
  }
  return out;
}

/** Filters the 27-compound NPS watch registry by chemical/toxicological family. */
export function npsByFamily(family: NpsFamily | "all"): readonly NpsWatchEntry[] {
  if (family === "all") return NPS_WATCH;
  return NPS_WATCH.filter((e) => e.family === family);
}
