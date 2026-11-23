/**
 * Formulary wave 6 — 2025-2026 emerging forensic toxicology and early-warning
 * novel psychoactive substances (NPS): orphine synthetic opioids, N-pyrrolidino
 * and N-piperidinyl benzimidazole opioids (nitazepynes / nitazepipnes), designer
 * triazolobenzodiazepines, and semi-synthetic hydrogenated cannabinoids (HHC series).
 *
 * Synthesized from CFSRE NPS Discovery monographs, UNODC Early Warning Advisory
 * alerts, EUDA (formerly EMCDDA) risk assessments, and DEA Emerging Threat Reports.
 * Empty enzyme lists mean no CYP story here, not "safe."
 * Educational desk only. Not a dose. Not FDA-cleared. PI / FDA / DEA govern.
 */

import type { Drug, Enzyme, EnzymeRole, PdFlag, SubstrateSensitivity } from "./types";

function sub(enzyme: Enzyme, sensitivity: SubstrateSensitivity): EnzymeRole {
  return { enzyme, kind: "substrate", sensitivity, pathway: "clearance", nti: false };
}

function d(
  id: string,
  name: string,
  cls: string,
  aliases: string[],
  enzymes: EnzymeRole[],
  pd: PdFlag[],
  toxicityHint: string,
  note: string,
): Drug {
  return {
    id,
    name,
    brands: [],
    cls,
    aliases,
    enzymes,
    pd,
    toxicityHint,
    note,
    kind: "drug",
  };
}

/** Sixth modern wave — 2025-2026 emerging forensic NPS compounds, merged after MODERN_WAVE5_FORMULARY. */
export const MODERN_WAVE6_FORMULARY: Drug[] = [
  // —— Orphine synthetic opioids (6) ——————————————————————————————
  d(
    "cychlorphine",
    "Cychlorphine",
    "Orphine synthetic opioid",
    ["n-propionitrile chlorphine", "n-propionitrile-chlorphine", "orphine"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant", "qt-possible"],
    "High-potency orphine μ-agonist; rapid apnea and re-narcotization outlasting naloxone; mislabeled in counterfeit benzodiazepine and opioid tablets; brorphine-scaffold hERG/QTc liability; CYP3A4 victim",
    "N-propionitrile analogue of chlorphine and structural successor to brorphine flagged across CFSRE NPS Discovery, UNODC Early Warning Advisory, EUDA, and DEA Emerging Threat Reports (2024–2026). Identified in counterfeit oxycodone and pressed alprazolam/bromazolam tablets where users expecting a sedative encounter high-potency μ-opioid respiratory arrest. Fails to cross-react on standard point-of-care fentanyl and opiate immunoassay strips. Repeat naloxone administration and prolonged airway observation are often required due to high receptor affinity and re-narcotization, plus hERG potassium-channel blockade signal shared across the benzimidazolone-piperidine (brorphine/orphine) scaffold. Educational desk only. Not a dose.",
  ),
  d(
    "spirochlorphine",
    "Spirochlorphine",
    "Orphine synthetic opioid",
    ["r-6890", "r6890", "orphine"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant", "qt-possible"],
    "Spiro-piperidine brorphine/orphine analogue (R-6890); high-potency MOR agonist respiratory arrest; hERG/QTc liability; fentanyl test strip blind spot; CYP3A4 victim",
    "Spiro-decane benzimidazolone-piperidine μ-opioid receptor agonist originally synthesized in Janssen archival series (R-6890) and detected in illicit forensic seizures reported by CFSRE NPS Discovery and EUDA early-warning networks. Shares the high-potency respiratory depression, fentanyl test strip blind spot, CYP3A4 hepatic clearance vulnerability, and class-level hERG potassium-channel / QTc prolongation concern of brorphine and cychlorphine. Stacks fatally with designer benzodiazepines, alcohol, and veterinary α2-agonists. Educational desk only. Not a dose.",
  ),
  d(
    "sr-17018",
    "5,6-Dichloro-desmethylchlorphine (SR-17018)",
    "Orphine synthetic opioid",
    ["sr-17018", "sr17018", "5,6-dichloro-desmethylchlorphine", "desmethylchlorphine", "orphine"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Illicitly circulated tool compound (SR-17018); preclinical G-protein bias does NOT prevent human respiratory arrest, unpredictable cross-tolerance, withdrawal swings, or fatal CNS-depressant stacking",
    "Scripps research tool compound structurally related to the dichloro-benzimidazolone-piperidine (chlorphine/brorphine) scaffold that entered grey-market research-chemical and self-detox supply chains in 2025–2026 (CFSRE / UNODC / EUDA surveillance). Clinical teaching point: although rodent literature explored G-protein-biased μ-opioid signaling, bias in preclinical models does NOT confer human clinical safety, does NOT eliminate respiratory arrest, and produces unpredictable cross-tolerance, delayed or precipitated withdrawal swings when transitioning to or from fentanyl, nitazenes, or buprenorphine, and fatal apnea when stacked with benzodiazepines, gabapentinoids, or alcohol. Uncharacterized human CYP3A4 clearance and frequent batch mislabeling amplify overdose risk. Educational desk only. Not a dose.",
  ),
  d(
    "dichloro-brorphine",
    "5,6-Dichloro-brorphine",
    "Orphine synthetic opioid",
    ["5,6-dichloro-brorphine", "5,6-dichlorobrorphine", "dichlorobrorphine", "orphine"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant", "qt-possible"],
    "Halogen-substituted brorphine analogue; high-potency μ-agonist respiratory arrest; hERG/QTc scaffold signal; invisible on fentanyl strips; CYP3A4 victim",
    "5,6-Dichloro-substituted analogue of brorphine identified in forensic toxicology monitoring (CFSRE NPS Discovery / UNODC Early Warning Advisory). Halogen replacement on the benzimidazolone ring preserves high μ-opioid receptor efficacy and lipophilicity while evading targeted fentanyl immunoassays. Carries the same rapid central apnea, prolonged re-narcotization window, CYP3A4 inhibitor susceptibility, and brorphine-family hERG potassium-channel QTc liability. Educational desk only. Not a dose.",
  ),
  d(
    "chlorphine",
    "Chlorphine",
    "Orphine synthetic opioid",
    ["chlorphine", "orphine"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant", "qt-possible"],
    "Chloro-substituted brorphine analogue; potent μ-opioid respiratory depression; hERG/QTc class liability; fentanyl test strip blind spot; CYP3A4 victim",
    "Chloro-analogue of brorphine where chlorine replaces bromine on the benzimidazolone moiety (CFSRE NPS Discovery / EUDA / UNODC EWA). Emerged alongside cychlorphine in illicit powders and counterfeit pressed tablets. High μ-opioid receptor potency drives rapid hypoventilation and chest-wall rigidity; standard fentanyl and opiate point-of-care screens remain negative. Treat with ventilatory support, titrated naloxone with observation for re-narcotization, and ECG awareness for orphine-class hERG blockade. Educational desk only. Not a dose.",
  ),
  d(
    "n-phenethyl-chloro-nor-orphine",
    "N'-Phenethyl-5/6-chloro nor-orphine",
    "Orphine synthetic opioid",
    ["n'-phenethyl-5/6-chloro nor-orphine", "phenethyl chloro nor-orphine", "chloro nor-orphine", "nor-orphine", "orphine"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant", "qt-possible"],
    "Positional chloro-isomer orphine derivative; μ-opioid respiratory arrest; fentanyl test strip negative; hERG/QTc scaffold risk; CYP3A4 victim",
    "Emerging 5-chloro / 6-chloro positional isomer variant of the N-phenethyl nor-orphine scaffold catalogued in forensic GC-MS and LC-QTOF reference updates (CFSRE NPS Discovery / UNODC / EUDA). Positional isomerism complicates routine mass-spectral library differentiation while maintaining full μ-opioid respiratory depression and CNS-depressant synergy with benzodiazepines and xylazine/medetomidine. Educational desk only. Not a dose.",
  ),

  // —— Benzimidazole opioids — 2025-2026 Nitazenes (5) —————————————
  d(
    "protonitazepyne",
    "Protonitazepyne",
    "Benzimidazole opioid (nitazene)",
    ["n-pyrrolidino protonitazene", "n-pyrrolidino-protonitazene", "pyrrolidino-protonitazene", "nitazene"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Ultra-potent N-pyrrolidino nitazene; rapid apneic arrest and prolonged re-narcotization; negative on fentanyl strips; CYP3A4 victim",
    "N-pyrrolidino analogue of protonitazene highlighted in CFSRE NPS Discovery public health alerts, DEA Emerging Threat Reports, EUDA risk assessments, and UNODC EWA clusters across North America and Europe. The pyrrolidine ring confers high μ-opioid potency and prolonged tissue residence, driving sudden apneic arrest and recurrent respiratory depression after initial naloxone response. Invisible on fentanyl and routine opiate immunoassays (requires nitazene test strips or LC-MS/MS). Frequently co-adulterated with bromazolam, ethylbromazolam, xylazine, or medetomidine. Educational desk only. Not a dose.",
  ),
  d(
    "metonitazepyne",
    "Metonitazepyne",
    "Benzimidazole opioid (nitazene)",
    ["n-pyrrolidino metonitazene", "n-pyrrolidino-metonitazene", "pyrrolidino-metonitazene", "nitazene"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "N-pyrrolidino metonitazene; high-potency μ-agonist respiratory arrest; repeat naloxone and airway support often required; CYP3A4 victim",
    "N-pyrrolidino derivative of metonitazene tracked by CFSRE NPS Discovery, UNODC Early Warning Advisory, EUDA, and DEA forensic laboratories in counterfeit tablets and illicit heroin/fentanyl mixtures. Like protonitazepyne, replacement of the diethylamino tail with a pyrrolidine ring retains high μ-opioid receptor efficacy and slows metabolic clearance. Standard fentanyl strips do not detect nitazepynes; co-present α2-agonists (medetomidine, xylazine) or designer benzodiazepines cause naloxone-refractory coma requiring mechanical or bag-valve-mask ventilation. Educational desk only. Not a dose.",
  ),
  d(
    "etonitazepipne",
    "Etonitazepipne",
    "Benzimidazole opioid (nitazene)",
    ["n-piperidinyl etonitazene", "n-piperidinyl-etonitazene", "piperidinyl-etonitazene", "nitazene"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "N-piperidinyl etonitazene; ultra-potent benzimidazole μ-agonist; rapid apnea; fentanyl test strip blind spot; CYP3A4 victim",
    "N-piperidinyl analogue of etonitazene characterized in CFSRE NPS Discovery monographs, EUDA early-warning notifications, and UNODC forensic bulletins. Exhibits potency well above morphine and comparable to fentanyl/etonitazene in vitro, causing abrupt hypoventilation and hypoxic brain injury. Evades routine hospital opiate and fentanyl screens. Strong CYP3A4 inhibitors further slow hepatic N-dealkylation and O-dealkylation. Educational desk only. Not a dose.",
  ),
  d(
    "norisotonitazene",
    "Norisotonitazene",
    "Benzimidazole opioid (nitazene)",
    ["n-desethyl isotonitazene", "n-desethyl-isotonitazene", "desethyl-isotonitazene", "nitazene"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Active N-deethylated metabolite of isotonitazene and standalone street nitazene; high MOR potency and prolonged second-phase respiratory depression; CYP3A4 victim",
    "N-desethyl isotonitazene is both an active hepatic CYP3A4 N-deethylation metabolite of isotonitazene and an independently trafficked benzimidazole opioid identified in CFSRE NPS Discovery, DEA, and UNODC forensic casework. Unlike many opioids whose N-dealkylated metabolites lose activity, norisotonitazene retains potent μ-opioid receptor agonism, explaining delayed second-wave apnea and prolonged naloxone requirement after isotonitazene or direct norisotonitazene exposure. Educational desk only. Not a dose.",
  ),
  d(
    "n-pyrrolidino-ethylene-isotonitazene",
    "N-Pyrrolidino ethylene isotonitazene",
    "Benzimidazole opioid (nitazene)",
    ["n-pyrrolidino-ethylene-isotonitazene", "ethylene-isotonitazepyne", "isotonitazepyne", "ethylene isotonitazene", "nitazene"],
    [sub("CYP3A4", "major")],
    ["opioid", "cns-depressant"],
    "Linker-modified pyrrolidino-isotonitazene analogue; potent μ-opioid respiratory depression; assay blind spot on routine toxicology panels; CYP3A4 victim",
    "Structural analogue of isotonitazene combining an N-pyrrolidino substituent with ethylene-bridge modification reported in 2025–2026 forensic seizures (CFSRE NPS Discovery / EUDA / UNODC EWA). Designed to sidestep generic structure definitions while preserving benzimidazole μ-opioid receptor binding. Evades standard opiate, fentanyl, and older targeted LC-MS panels lacking updated MRM transitions. Treat clinically as a high-potency nitazene with high re-narcotization risk. Educational desk only. Not a dose.",
  ),

  // —— Designer benzodiazepines (2) ————————————————————————————————
  d(
    "ethylbromazolam",
    "Ethylbromazolam",
    "Designer benzodiazepine",
    ["ethyl-bromazolam", "rc benzo"],
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Post-scheduling bromazolam successor; profound sedation, amnesia, and fatal airway synergy with nitazenes/fentanyl; withdrawal seizures; CYP3A4 victim",
    "Ethyl-substituted triazolobenzodiazepine analogue of bromazolam that surged across illicit tablet and ’benzo-dope’ seizures in 2025–2026 following international bromazolam controls (CFSRE NPS Discovery / DEA / EUDA / UNODC alerts). Acts as a positive allosteric modulator at GABA-A receptors; adds naloxone-insensitive central respiratory depression when co-ingested with fentanyl, nitazenes, or orphines, and carries severe rebound anxiety, delirium, and status epilepticus risk upon abrupt cessation. Standard clinical benzodiazepine urine immunoassays show variable cross-reactivity. Educational desk only. Not a dose.",
  ),
  d(
    "ethylflualprazolam",
    "Ethylflualprazolam",
    "Designer benzodiazepine",
    ["ethyl-flualprazolam", "rc benzo"],
    [sub("CYP3A4", "major")],
    ["benzo-zdrug", "cns-depressant", "seizure-lowering"],
    "Fluoro-substituted triazolobenzodiazepine analogue of flualprazolam; blackout amnesia, opioid airway collapse, and severe withdrawal seizures; CYP3A4 victim",
    "Ethyl-modified successor to flualprazolam detected in counterfeit alprazolam bars and adulterated street opioid powders by CFSRE NPS Discovery, EUDA, and UNODC early-warning laboratories. High GABA-A receptor affinity drives anterograde amnesia, prolonged psychomotor impairment, and synergistic apnea with μ-opioids and α2-agonists. Naloxone reverses co-ingested opioids but leaves ethylflualprazolam coma untouched; flumazenil is generally avoided in mixed or chronic benzodiazepine exposure due to refractory seizure precipitation. Educational desk only. Not a dose.",
  ),

  // —— Semi-synthetic cannabinoids — HHC Series (4) ————————————————
  d(
    "hhc",
    "HHC (Hexahydrocannabinol)",
    "Semi-synthetic cannabinoid (HHC)",
    ["hhc", "hexahydrocannabinol", "9r-hhc", "9s-hhc"],
    [sub("CYP2C9", "major"), sub("CYP3A4", "major")],
    ["cannabinoid", "cns-depressant"],
    "Hydrogenated semi-synthetic cannabinoid (9R/9S epimers); CB1 intoxication, tachycardia, orthostasis, anxiety/psychosis, and additive CNS depression; CYP2C9/3A4 substrate",
    "Semi-synthetic hydrogenated derivative of delta-8/delta-9-THC produced via catalytic hydrogenation of CBD-derived cannabinoids and widely monitored by EUDA technical reports, UNODC EWA, and CFSRE toxicology panels. Commercial products contain variable ratios of the more CB1-active (9R)-HHC epimer and less active (9S)-HHC epimer, creating unpredictable potency across vapes and gummies. Cross-reacts on many 11-nor-9-carboxy-THC urine immunoassays while requiring LC-MS/MS epimer separation for confirmation. Cleared via CYP2C9 and CYP3A4 hydroxylation; stacks CNS sedation and tachycardia with alcohol, sedatives, and sympathomimetics. Educational desk only. Not a dose.",
  ),
  d(
    "hhc-p",
    "HHC-P (Hexahydrocannabiphorol)",
    "Semi-synthetic cannabinoid (HHC)",
    ["hhc-p", "hhcp", "hexahydrocannabiphorol"],
    [sub("CYP2C9", "major"), sub("CYP3A4", "major")],
    ["cannabinoid", "cns-depressant"],
    "Heptyl-side-chain hydrogenated cannabinoid; high-affinity full/near-full CB1 agonism; prolonged intoxication, panic/psychosis, cannabinoid hyperemesis, and tachycardia; CYP2C9/3A4 victim",
    "Seven-carbon (heptyl) alkyl-chain homologue of hexahydrocannabinol documented in EUDA and UNODC semi-synthetic cannabinoid surveillance. Elongation of the pentyl side chain to a heptyl chain (analogous to THCP) markedly increases CB1 receptor binding affinity and tissue half-life compared with HHC or delta-9-THC. Clinical presentations include multi-day sedation, acute agitation or toxic psychosis, orthostatic syncope, tachycardia, and intractable vomiting. Missed by standard targeted THC confirmation panels unless HHC-P transitions are included. Educational desk only. Not a dose.",
  ),
  d(
    "hhc-o",
    "HHC Acetate (HHC-O)",
    "Semi-synthetic cannabinoid (HHC)",
    ["hhc-o", "hhco", "hhc acetate", "hhc-o-acetate", "hexahydrocannabinol acetate"],
    [sub("CYP2C9", "major"), sub("CYP3A4", "major")],
    ["cannabinoid", "cns-depressant"],
    "O-acetylated HHC prodrug; delayed systemic onset drives accidental re-dosing; vaping/dabbing risks toxic ketene gas formation and acute lung injury; CYP2C9/3A4 substrate",
    "Acetate ester prodrug of hexahydrocannabinol (HHC-O-acetate) tracked by EUDA, CFSRE, and UNODC early-warning reports. Two distinct clinical hazards dominate: first, enzymatic deacetylation delays peak CB1 psychoactivity after oral or inhaled use, prompting premature re-ingestion and severe delayed cannabinoid toxicity; second, thermal pyrolysis of aryl acetate cannabinoid esters (analogous to vitamin E acetate and THC-O-acetate) during vaping or dabbing can generate ketene gas, a severe pulmonary toxicant linked to acute lung injury. Educational desk only. Not a dose.",
  ),
  d(
    "ten-oh-hhc",
    "10-OH-HHC",
    "Semi-synthetic cannabinoid (HHC)",
    ["10-oh-hhc", "10-hydroxyhexahydrocannabinol", "10-hydroxy-hhc"],
    [sub("CYP2C9", "major"), sub("CYP3A4", "major")],
    ["cannabinoid", "cns-depressant"],
    "Hydroxylated HHC metabolite sold directly as a next-wave semi-synthetic cannabinoid; active CB1 agonist with rapid oral/vape onset and CYP2C9/3A4 clearance",
    "10-Hydroxyhexahydrocannabinol is both an oxidative CYP metabolite of HHC and a marketed semi-synthetic cannabinoid that proliferated across European and online vape/edible markets following initial HHC scheduling (EUDA / UNODC EWA 2024–2026). Retains direct CB1 psychoactivity, causing acute anxiety, tachycardia, dizziness, and additive CNS depression with alcohol or sedatives, while bypassing first-generation HHC-only forensic screens. Educational desk only. Not a dose.",
  ),
];
