import { DRUG_BY_ID } from "./catalog";
import { FIRST_PASS_NMDA, isVirtual } from "./host";
import {
  DEFAULT_HOST,
  PHENOTYPE_ENZYMES,
  type Drug,
  type Enzyme,
  type HostContext,
  type Metabolizer,
  type Strength,
} from "./types";

const I_INH: Record<Strength, number> = { strong: 5, moderate: 2, weak: 0.5 };
const E_IND: Record<Strength, number> = { strong: 4, moderate: 2, weak: 0.5 };
const PHENO_CL: Record<Metabolizer, number> = { PM: 0.12, IM: 0.5, NM: 1, UM: 2.2 };

/** Furanocoumarins / juices that knock out intestinal CYP3A4 and spare the liver. */
const GUT_ONLY = new Set(["grapefruit", "pomegranate", "starfruit"]);

export interface PkSpec {
  tHalfH: number;
  kaH: number;
  F: number;
  fm: Partial<Record<Enzyme, number>>;
  /** Share of first-pass that is intestinal CYP3A4 (oral victims). */
  gut3A4?: number;
  iv?: boolean;
  activation?: { enzyme: Enzyme; name: string };
  note: string;
}

interface PkRow {
  tHalfH: number;
  kaH: number;
  F: number;
  fm: Partial<Record<Enzyme, number>>;
  gut3A4?: number;
  activation?: { enzyme: Enzyme; name: string };
  note: string;
}

const ROWS: Record<string, PkRow> = {
  ketamine: {
    tHalfH: 2.5,
    kaH: 1.4,
    F: 0.17,
    fm: { CYP2B6: 0.35, CYP3A4: 0.45 },
    gut3A4: 0.65,
    activation: { enzyme: "CYP2B6", name: "Norketamine" },
    note: "Oral first-pass is the 3A4 trap. IV skips the gut; hepatic 2B6 still clears.",
  },
  esketamine: {
    tHalfH: 2.6,
    kaH: 1.6,
    F: 0.48,
    fm: { CYP2B6: 0.4, CYP3A4: 0.35 },
    gut3A4: 0.25,
    activation: { enzyme: "CYP2B6", name: "S-norketamine" },
    note: "Intranasal Spravato still sees hepatic 2B6/3A4; less gut first-pass than a lozenge.",
  },
  "two-fdck": {
    tHalfH: 3.2,
    kaH: 1.2,
    F: 0.2,
    fm: { CYP2B6: 0.35, CYP3A4: 0.45 },
    gut3A4: 0.6,
    note: "Same oral 2B6/3A4 gauntlet as ketamine.",
  },
  dck: {
    tHalfH: 4,
    kaH: 1.1,
    F: 0.22,
    fm: { CYP2B6: 0.3, CYP3A4: 0.45 },
    gut3A4: 0.55,
    note: "Deschloroketamine — oral first-pass still 3A4/2B6.",
  },
  dextromethorphan: {
    tHalfH: 3,
    kaH: 1.8,
    F: 0.5,
    fm: { CYP2D6: 0.85, CYP3A4: 0.1 },
    activation: { enzyme: "CYP2D6", name: "Dextrorphan" },
    note: "2D6 PM or a strong 2D6 inhibitor stacks parent DXM (serotonergic) and cuts dextrorphan.",
  },
  mdma: {
    tHalfH: 8,
    kaH: 1.3,
    F: 0.6,
    fm: { CYP2D6: 0.55, CYP3A4: 0.15 },
    note: "Mechanism-based 2D6 inhibition after the first pass — the second dose is not the first.",
  },
  mda: {
    tHalfH: 10,
    kaH: 1.2,
    F: 0.55,
    fm: { CYP2D6: 0.5, CYP3A4: 0.15 },
    note: "MDMA cousin. Same 2D6 victim map.",
  },
  codeine: {
    tHalfH: 3,
    kaH: 2,
    F: 0.5,
    fm: { CYP2D6: 0.1, CYP3A4: 0.7 },
    activation: { enzyme: "CYP2D6", name: "Morphine" },
    note: "Parent clearance is mostly 3A4. Analgesia is the 2D6 morphine step — UM is the danger.",
  },
  tramadol: {
    tHalfH: 6,
    kaH: 1.5,
    F: 0.75,
    fm: { CYP2D6: 0.25, CYP3A4: 0.45 },
    activation: { enzyme: "CYP2D6", name: "O-desmethyltramadol" },
    note: "Parent is SNRI-like; M1 is the μ-agonist. 2D6 PM = less analgesia, more parent serotonin.",
  },
  warfarin: {
    tHalfH: 40,
    kaH: 1.2,
    F: 0.95,
    fm: { CYP2C9: 0.8, CYP3A4: 0.1 },
    note: "S-warfarin is a sensitive 2C9 substrate. Fluconazole, amiodarone, and 2C9 PMs raise INR.",
  },
  clozapine: {
    tHalfH: 12,
    kaH: 0.9,
    F: 0.55,
    fm: { CYP1A2: 0.7, CYP3A4: 0.15 },
    note: "Smoke induces 1A2 — levels fall, then rebound on quit.",
  },
  olanzapine: {
    tHalfH: 30,
    kaH: 0.8,
    F: 0.6,
    fm: { CYP1A2: 0.55, CYP2D6: 0.15 },
    note: "Same 1A2 smoke story as clozapine, quieter.",
  },
  tizanidine: {
    tHalfH: 2.5,
    kaH: 1.6,
    F: 0.2,
    fm: { CYP1A2: 0.95 },
    gut3A4: 0,
    note: "Sensitive 1A2 substrate. Cimetidine and ciprofloxacin are the classic bullies.",
  },
  midazolam: {
    tHalfH: 3,
    kaH: 2.2,
    F: 0.4,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.55,
    note: "Probe 3A4 substrate. Oral midazolam is how we measure the isoform.",
  },
  triazolam: {
    tHalfH: 2.5,
    kaH: 2.4,
    F: 0.44,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.6,
    note: "Sensitive 3A4 benzo. Ritonavir, azoles, grapefruit.",
  },
  buspirone: {
    tHalfH: 2.5,
    kaH: 1.8,
    F: 0.04,
    fm: { CYP3A4: 0.95 },
    gut3A4: 0.8,
    note: "Tiny F. Grapefruit and azoles turn a 5 mg anxiolytic into a much larger exposure.",
  },
  alprazolam: {
    tHalfH: 12,
    kaH: 1.4,
    F: 0.9,
    fm: { CYP3A4: 0.7 },
    note: "Hepatic 3A4 more than gut. Inhibitors stretch duration.",
  },
  clobazam: {
    tHalfH: 18,
    kaH: 1.1,
    F: 0.9,
    fm: { CYP3A4: 0.4, CYP2C19: 0.45 },
    activation: { enzyme: "CYP2C19", name: "N-desmethylclobazam" },
    note: "CBD and fluconazole stack the long active metabolite via 2C19.",
  },
  dronabinol: {
    tHalfH: 4,
    kaH: 0.7,
    F: 0.1,
    fm: { CYP2C9: 0.55, CYP3A4: 0.3 },
    gut3A4: 0.35,
    activation: { enzyme: "CYP2C9", name: "11-OH-THC" },
    note: "Edible first-pass makes 11-OH-THC. Smoked THC mostly skips that metabolite spike.",
  },
  cannabidiol: {
    tHalfH: 24,
    kaH: 0.6,
    F: 0.06,
    fm: { CYP2C19: 0.4, CYP3A4: 0.35 },
    gut3A4: 0.3,
    note: "High-dose CBD is a 2C19 perpetrator as well as a victim.",
  },
  methadone: {
    tHalfH: 24,
    kaH: 0.8,
    F: 0.8,
    fm: { CYP2B6: 0.45, CYP3A4: 0.35 },
    note: "Inducers (efavirenz, rifampin, carbamazepine, phenytoin, nevirapine) look like a stolen take-home. Fluvoxamine and fluconazole raise parent and QT. Paxlovid/ritonavir is the mixed arrow — methadone often falls. q24h Rac is large even without a perpetrator.",
  },
  fentanyl: {
    tHalfH: 4,
    kaH: 2.5,
    F: 0.5,
    fm: { CYP3A4: 0.7 },
    gut3A4: 0.35,
    note: "Norfentanyl via 3A4. Paxlovid, ritonavir, and azoles raise parent (Olkkola: ritonavir cuts clearance 67%). Street fentanyl is the usual contents of a dirty 30. Overlay a methadone take-home — that is stacked μ, not this curve.",
  },
  oxycodone: {
    tHalfH: 4,
    kaH: 1.6,
    F: 0.6,
    fm: { CYP3A4: 0.55, CYP2D6: 0.2 },
    activation: { enzyme: "CYP2D6", name: "Oxymorphone" },
    note: "3A4 is the main clearance. 2D6 makes oxymorphone. Percocet adds APAP — that is the 2E1/alcohol row, not this curve.",
  },
  loperamide: {
    tHalfH: 11,
    kaH: 1,
    F: 0.1,
    fm: { CYP3A4: 0.4, "P-gp": 0.45 },
    gut3A4: 0.3,
    note: "P-gp and 3A4 keep it peripheral. Quinidine or ritonavir opens the gate.",
  },
  simvastatin: {
    tHalfH: 3,
    kaH: 1.5,
    F: 0.05,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.7,
    note: "Sensitive oral 3A4 victim. Strong inhibitors are a labeled myopathy trap.",
  },
  quetiapine: {
    tHalfH: 6,
    kaH: 1.3,
    F: 0.09,
    fm: { CYP3A4: 0.8 },
    gut3A4: 0.45,
    note: "Low F, 3A4 victim. Azoles and grapefruit raise parent.",
  },
  theophylline: {
    tHalfH: 8,
    kaH: 1.2,
    F: 0.9,
    fm: { CYP1A2: 0.9 },
    note: "Classic 1A2 victim. Cipro, fluvoxamine, cimetidine, and smoke all move it.",
  },
  caffeine: {
    tHalfH: 5,
    kaH: 2.5,
    F: 1,
    fm: { CYP1A2: 0.95 },
    note: "1A2 probe. Smoke shortens it; fluvoxamine stretches it.",
  },
  atomoxetine: {
    tHalfH: 5,
    kaH: 1.4,
    F: 0.63,
    fm: { CYP2D6: 0.9 },
    note: "Sensitive 2D6 substrate. PMs and paroxetine/fluoxetine spike exposure.",
  },
  citalopram: {
    tHalfH: 35,
    kaH: 0.9,
    F: 0.8,
    fm: { CYP2C19: 0.45, CYP3A4: 0.3, CYP2D6: 0.15 },
    note: "2C19 PM and strong 2C19 inhibitors raise QT-relevant exposure.",
  },
  risperidone: {
    tHalfH: 3,
    kaH: 1.5,
    F: 0.7,
    fm: { CYP2D6: 0.7, CYP3A4: 0.2 },
    activation: { enzyme: "CYP2D6", name: "Paliperidone" },
    note: "2D6 to 9-OH-risperidone (paliperidone). PMs stack parent.",
  },
  bupropion: {
    tHalfH: 21,
    kaH: 0.7,
    F: 0.05,
    fm: { CYP2B6: 0.7 },
    note: "2B6 victim and a strong 2D6 inhibitor of other drugs.",
  },
  guanfacine: {
    tHalfH: 17,
    kaH: 0.8,
    F: 0.8,
    fm: { CYP3A4: 0.8 },
    note: "ADHD α2 agonist. Strong 3A4 inhibitors raise sedation and bradycardia.",
  },
  lofexidine: {
    tHalfH: 11,
    kaH: 1.2,
    F: 0.7,
    fm: { CYP2D6: 0.55 },
    note: "Lucemyra. 2D6 victim — paroxetine/fluoxetine raise bradycardia. α2 × opioid is PD, not this curve.",
  },
  "seven-oh": {
    tHalfH: 3.5,
    kaH: 1.4,
    F: 0.4,
    fm: { CYP3A4: 0.7 },
    note: "The hot μ-agonist. 3A4 inhibitors raise the opioid load.",
  },
  meperidine: {
    tHalfH: 4,
    kaH: 1.3,
    F: 0.5,
    fm: { CYP3A4: 0.4, CYP2B6: 0.35 },
    activation: { enzyme: "CYP3A4", name: "Normeperidine" },
    note: "Normeperidine is the seizure metabolite. 3A4 blockade and renal failure stack it.",
  },
  tamoxifen: {
    tHalfH: 170,
    kaH: 0.4,
    F: 1,
    fm: { CYP3A4: 0.5, CYP2D6: 0.3 },
    activation: { enzyme: "CYP2D6", name: "Endoxifen" },
    note: "Endoxifen is the workhorse. 2D6 PMs and strong 2D6 inhibitors lose activation.",
  },
  clopidogrel: {
    tHalfH: 6,
    kaH: 1.6,
    F: 0.5,
    fm: { CYP2C19: 0.45, CYP3A4: 0.25 },
    activation: { enzyme: "CYP2C19", name: "Thiol metabolite" },
    note: "Prodrug. 2C19 PMs and omeprazole blunt the antiplatelet effect.",
  },
  carisoprodol: {
    tHalfH: 2,
    kaH: 1.8,
    F: 0.8,
    fm: { CYP2C19: 0.8 },
    activation: { enzyme: "CYP2C19", name: "Meprobamate" },
    note: "2C19 to meprobamate. PMs and CBD/fluconazole stack parent plus metabolite.",
  },
  mxe: {
    tHalfH: 6,
    kaH: 1.1,
    F: 0.2,
    fm: { CYP2B6: 0.3, CYP3A4: 0.4 },
    gut3A4: 0.5,
    note: "Longer NMDA cousin. Oral 3A4/2B6 still applies.",
  },
  "three-meo-pcp": {
    tHalfH: 8,
    kaH: 1,
    F: 0.25,
    fm: { CYP2B6: 0.25, CYP3A4: 0.4 },
    gut3A4: 0.45,
    note: "Long arylcyclohexylamine. Oral first-pass is still 3A4.",
  },
  ibogaine: {
    tHalfH: 7,
    kaH: 0.9,
    F: 0.7,
    fm: { CYP2D6: 0.7, CYP3A4: 0.15 },
    activation: { enzyme: "CYP2D6", name: "Noribogaine" },
    note: "2D6 to noribogaine (long QT). PMs and strong 2D6 inhibitors stack parent. Not a treatment map.",
  },
  diazepam: {
    tHalfH: 44,
    kaH: 1.1,
    F: 1,
    fm: { CYP3A4: 0.4, CYP2C19: 0.4 },
    activation: { enzyme: "CYP2C19", name: "Nordiazepam" },
    note: "Long parent, longer nordiazepam. 2C19 PMs and inhibitors stretch both.",
  },
  fluoxetine: {
    tHalfH: 96,
    kaH: 0.5,
    F: 0.7,
    fm: { CYP2D6: 0.55, CYP2C9: 0.2 },
    note: "Parent plus norfluoxetine. t½ is days — q24h accumulates, and 2D6 stays blocked for weeks.",
  },
  venlafaxine: {
    tHalfH: 5,
    kaH: 1.4,
    F: 0.45,
    fm: { CYP2D6: 0.8 },
    activation: { enzyme: "CYP2D6", name: "O-desmethylvenlafaxine" },
    note: "2D6 to ODV (desvenlafaxine). PMs stack parent; the active metabolite falls.",
  },
  aripiprazole: {
    tHalfH: 75,
    kaH: 0.6,
    F: 0.87,
    fm: { CYP2D6: 0.4, CYP3A4: 0.4 },
    note: "Very long t½. q24h Rac is large. 2D6 PMs and 3A4 inhibitors both move it.",
  },
  amitriptyline: {
    tHalfH: 18,
    kaH: 1,
    F: 0.5,
    fm: { CYP2D6: 0.4, CYP2C19: 0.3 },
    activation: { enzyme: "CYP2D6", name: "Nortriptyline" },
    note: "2C19/2D6 to nortriptyline. PMs stack parent anticholinergic and QT load.",
  },
  nortriptyline: {
    tHalfH: 30,
    kaH: 0.9,
    F: 0.6,
    fm: { CYP2D6: 0.8 },
    note: "Sensitive 2D6 substrate. PMs and paroxetine/fluoxetine raise parent.",
  },
  hydrocodone: {
    tHalfH: 4,
    kaH: 1.6,
    F: 0.7,
    fm: { CYP3A4: 0.5, CYP2D6: 0.2 },
    activation: { enzyme: "CYP2D6", name: "Hydromorphone" },
    note: "3A4 is the main clearance. 2D6 makes hydromorphone — UM is the louder opioid.",
  },
  buprenorphine: {
    tHalfH: 32,
    kaH: 0.8,
    F: 0.3,
    fm: { CYP3A4: 0.7 },
    gut3A4: 0.25,
    note: "3A4 victim. Strong inhibitors raise parent; inducers (efavirenz, rifampin) drop it and can look like withdrawal. Precipitated withdrawal with fentanyl is PD, not this curve.",
  },
  tacrolimus: {
    tHalfH: 12,
    kaH: 1.2,
    F: 0.2,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.55,
    note: "NTI. Grapefruit and azoles open gut 3A4; IV would barely move. Not a dose.",
  },
  cyclosporine: {
    tHalfH: 8,
    kaH: 1.1,
    F: 0.3,
    fm: { CYP3A4: 0.8, "P-gp": 0.15 },
    gut3A4: 0.4,
    note: "NTI 3A4/P-gp victim. Same first-pass neighborhood as tacrolimus.",
  },
  colchicine: {
    tHalfH: 30,
    kaH: 0.9,
    F: 0.45,
    fm: { CYP3A4: 0.5, "P-gp": 0.35 },
    gut3A4: 0.3,
    note: "NTI. Strong 3A4/P-gp inhibitors are labeled — myopathy, marrow, death in impairment.",
  },
  sildenafil: {
    tHalfH: 4,
    kaH: 1.8,
    F: 0.4,
    fm: { CYP3A4: 0.8 },
    gut3A4: 0.3,
    note: "3A4 victim. Azoles and protease inhibitors raise parent. The nitrate pair is PD, not this curve.",
  },
  tadalafil: {
    tHalfH: 17.5,
    kaH: 1.2,
    F: 0.8,
    fm: { CYP3A4: 0.8 },
    note: "Longer PDE5. 3A4 inhibitors stretch it; nitrates remain a PD contraindication.",
  },
  atorvastatin: {
    tHalfH: 14,
    kaH: 1.3,
    F: 0.14,
    fm: { CYP3A4: 0.7 },
    gut3A4: 0.4,
    note: "3A4 victim, less sensitive than simvastatin. Strong inhibitors still raise myopathy risk.",
  },
  amlodipine: {
    tHalfH: 40,
    kaH: 0.7,
    F: 0.64,
    fm: { CYP3A4: 0.7 },
    note: "Long t½, q24h accumulates. 3A4 inhibitors raise edema and hypotension.",
  },
  zolpidem: {
    tHalfH: 2.5,
    kaH: 2.2,
    F: 0.7,
    fm: { CYP3A4: 0.6, CYP2C9: 0.15 },
    gut3A4: 0.2,
    note: "Short 3A4 Z-hypnotic. Strong inhibitors stretch next-day impairment. q8h is not a regimen.",
  },
  haloperidol: {
    tHalfH: 24,
    kaH: 0.9,
    F: 0.6,
    fm: { CYP2D6: 0.4, CYP3A4: 0.3 },
    note: "2D6/3A4. PMs and strong inhibitors raise QT-relevant exposure.",
  },
  cocaine: {
    tHalfH: 0.8,
    kaH: 2.2,
    F: 0.3,
    fm: { CYP3A4: 0.15 },
    gut3A4: 0.1,
    note: "Mostly CES1. 3A4 makes norcocaine. Cocaethylene with ethanol is PD, not this curve. Smoked crack is closer to IV.",
  },
  epclusa: {
    tHalfH: 15,
    kaH: 1,
    F: 0.3,
    fm: { CYP3A4: 0.2, "P-gp": 0.5 },
    note: "Velpatasvir is the P-gp piece. Rifampin dumps the DAA. Methadone usually does not move.",
  },
  "dirty-30": {
    tHalfH: 3.5,
    kaH: 1.4,
    F: 0.3,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.35,
    note: "Modeled as illicit fentanyl, not oxycodone. 3A4 inhibitors raise the μ load. Xylazine is PD, not this curve.",
  },
  nifedipine: {
    tHalfH: 3.5,
    kaH: 1.6,
    F: 0.45,
    fm: { CYP3A4: 0.8 },
    gut3A4: 0.5,
    note: "Sensitive 3A4. Grapefruit and azoles open first-pass; amlodipine is the longer, less first-pass cousin. Not a dose.",
  },
  felodipine: {
    tHalfH: 11,
    kaH: 1.3,
    F: 0.15,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.8,
    note: "Bailey 1991. The original juice victim. Tiny F, mostly intestinal 3A4. Grapefruit raises F; t½ barely moves.",
  },
  budesonide: {
    tHalfH: 2.8,
    kaH: 1.4,
    F: 0.1,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.7,
    note: "Oral Entocort is a gut 3A4 first-pass victim. Ketoconazole/grapefruit make a 'local' steroid systemic. Not an IV map.",
  },
  eplerenone: {
    tHalfH: 5,
    kaH: 1.3,
    F: 0.69,
    fm: { CYP3A4: 0.9 },
    gut3A4: 0.25,
    note: "Sensitive 3A4. Strong inhibitors are labeled contraindicated. Hyperkalemia with an ACEI is PD, not this curve.",
  },
  ranolazine: {
    tHalfH: 7,
    kaH: 1.1,
    F: 0.55,
    fm: { CYP3A4: 0.7, "P-gp": 0.15 },
    gut3A4: 0.25,
    note: "Sensitive 3A4 antianginal. Strong inhibitors are labeled. QT is PD on top of the exposure.",
  },
  eletriptan: {
    tHalfH: 4,
    kaH: 1.8,
    F: 0.5,
    fm: { CYP3A4: 0.8 },
    gut3A4: 0.3,
    note: "The CYP triptan. Strong 3A4 inhibitors are a 72-hour hold. Sumatriptan is MAO-A, not this curve.",
  },
  sirolimus: {
    tHalfH: 62,
    kaH: 0.8,
    F: 0.14,
    fm: { CYP3A4: 0.85, "P-gp": 0.15 },
    gut3A4: 0.5,
    note: "NTI mTOR. Azoles and grapefruit open gut 3A4. q24h Rac is large. Not a dose.",
  },
  fluticasone: {
    tHalfH: 8,
    kaH: 1.2,
    F: 0.01,
    fm: { CYP3A4: 0.95 },
    gut3A4: 0.85,
    note: "Swallowed Flonase fraction is almost entirely gut 3A4. Ritonavir opens that gate — iatrogenic Cushing, not a spray footnote.",
  },
};

export function hasPk(id: string) {
  return Boolean(ROWS[id]);
}

export function pkIdsOn(ids: string[]) {
  return ids.filter((id) => ROWS[id]);
}

/** Typical adult elimination half-life on the PK shelf, in hours. */
export function pkHalfLifeH(id: string): number | undefined {
  return Object.hasOwn(ROWS, id) ? ROWS[id].tHalfH : undefined;
}

function specFor(id: string, host: HostContext): PkSpec | null {
  const row = ROWS[id];
  if (!row) return null;
  const spec: PkSpec = {
    tHalfH: row.tHalfH,
    kaH: row.kaH,
    F: row.F,
    fm: { ...row.fm },
    gut3A4: row.gut3A4,
    activation: row.activation,
    note: row.note,
    iv: false,
  };
  if ((FIRST_PASS_NMDA as readonly string[]).includes(id)) {
    if (host.ketamineRoute === "iv") {
      spec.F = 1;
      spec.kaH = 8;
      spec.gut3A4 = 0;
      spec.iv = true;
      spec.fm = { CYP2B6: 0.55, CYP3A4: 0.2 };
      spec.note =
        "IV/IM skips gut 3A4. Hepatic CYP2B6 is the main clearance — inhibitors still move it, quietly.";
    } else if (host.ketamineRoute === "in") {
      spec.F = 0.5;
      spec.kaH = 2.2;
      spec.gut3A4 = 0.2;
      spec.fm = { CYP2B6: 0.4, CYP3A4: 0.35 };
    }
  }
  if (id === "dronabinol") {
    if (host.cannabisRoute === "smoked") {
      spec.F = 0.25;
      spec.kaH = 4;
      spec.gut3A4 = 0;
      spec.iv = true;
      spec.fm = { CYP2C9: 0.35, CYP3A4: 0.2 };
      spec.note = "Smoked THC mostly skips 11-OH-THC first-pass. Hepatic 2C9/3A4 still clear parent.";
    }
  }
  return spec;
}

function enzymeCl(
  enzyme: Enzyme,
  others: Drug[],
  host: HostContext,
  site: "hep" | "gut" = "hep",
): { cl: number; drivers: string[] } {
  let inh = 0;
  let ind = 0;
  const drivers: string[] = [];
  for (const d of others) {
    if (isVirtual(d.id)) continue;
    if (site === "hep" && GUT_ONLY.has(d.id)) continue;
    for (const role of d.enzymes) {
      if (role.enzyme !== enzyme) continue;
      if (role.kind === "inhibitor") {
        const I = I_INH[role.strength];
        if (I > inh) {
          inh = I;
          drivers.push(
            GUT_ONLY.has(d.id)
              ? `${d.name} intestinal ${enzyme} knockout`
              : `${d.name} ${role.strength} ${enzyme} inhibition`,
          );
        }
      }
      if (role.kind === "inducer") {
        const E = E_IND[role.strength];
        if (E > ind) {
          ind = E;
          drivers.push(`${d.name} ${role.strength} ${enzyme} induction`);
        }
      }
    }
  }
  let cl = 1 / (1 + inh);
  if (ind) cl *= 1 + ind;
  if (site === "hep") {
    if ((PHENOTYPE_ENZYMES as readonly string[]).includes(enzyme)) {
      const p = host.phenotypes[enzyme as (typeof PHENOTYPE_ENZYMES)[number]];
      if (p && p !== "NM") {
        cl *= PHENO_CL[p];
        drivers.push(`${enzyme} ${p} (${p === "UM" ? "faster" : "slower"} clearance)`);
      }
    }
    if (enzyme === "CYP1A2" && host.smoking) {
      cl *= 2.4;
      drivers.push("tobacco smoke CYP1A2 induction");
    }
    if (enzyme === "CYP2E1" && host.alcohol === "chronic") {
      cl *= 2.2;
      drivers.push("chronic alcohol CYP2E1 induction");
    }
  }
  return { cl: Math.max(0.05, cl), drivers };
}

function oralF(F: number, gut3A4: number, clGut: number) {
  if (gut3A4 <= 0) return F;
  const lift = (1 - F) * gut3A4 * (1 - clGut);
  return Math.min(1, F + lift);
}

export interface PkPoint {
  t: number;
  base: number;
  desk: number;
  metab?: number;
  alt?: number;
}

export interface PkModel {
  id: string;
  name: string;
  note: string;
  drivers: string[];
  aucr: number;
  cmaxFold: number;
  tHalfBase: number;
  tHalfDesk: number;
  tmaxBase: number;
  tmaxDesk: number;
  horizonH: number;
  activationName?: string;
  metabFold?: number;
  iv: boolean;
  scale: number;
  tauH: number;
  rac: number;
  racBase: number;
  points: PkPoint[];
}

export interface ModelOpts {
  tauH?: number;
  horizonH?: number;
  n?: number;
  scale?: number;
}

export const DOSE_INTERVALS = [
  { id: 0, label: "Once" },
  { id: 8, label: "q8h" },
  { id: 12, label: "q12h" },
  { id: 24, label: "q24h" },
] as const;

function ke(tHalf: number) {
  return Math.LN2 / Math.max(0.2, tHalf);
}

function conc(t: number, F: number, ka: number, kElim: number, iv: boolean) {
  if (t < 0) return 0;
  if (iv) return F * Math.exp(-kElim * t);
  if (Math.abs(ka - kElim) < 0.02) ka = kElim + 0.05;
  return ((F * ka) / (ka - kElim)) * (Math.exp(-kElim * t) - Math.exp(-ka * t));
}

function summed(t: number, F: number, ka: number, kElim: number, iv: boolean, tau: number) {
  if (tau <= 0) return conc(t, F, ka, kElim, iv);
  let s = 0;
  const nMax = Math.floor(t / tau + 1e-9);
  for (let n = 0; n <= nMax; n++) s += conc(t - n * tau, F, ka, kElim, iv);
  return s;
}

function racOf(kElim: number, tau: number) {
  if (tau <= 0) return 1;
  const x = Math.exp(-kElim * tau);
  return 1 / Math.max(1e-6, 1 - x);
}

function tmaxOf(F: number, ka: number, kElim: number, iv: boolean, horizon: number) {
  if (iv) return 0;
  const t = Math.log(ka / kElim) / (ka - kElim);
  return Math.min(horizon, Math.max(0, t));
}

/** Other first-pass route for the ghost overlay — same milligram, different input. */
export function otherRoute(
  id: string,
  host: HostContext,
): { host: HostContext; label: string } | null {
  if ((FIRST_PASS_NMDA as readonly string[]).includes(id) && ROWS[id]) {
    if (host.ketamineRoute === "oral") {
      return { host: { ...host, ketamineRoute: "iv" }, label: "If IV" };
    }
    return { host: { ...host, ketamineRoute: "oral" }, label: "If oral" };
  }
  if (id === "dronabinol") {
    if (host.cannabisRoute === "oral") {
      return { host: { ...host, cannabisRoute: "smoked" }, label: "If smoked" };
    }
    return { host: { ...host, cannabisRoute: "oral" }, label: "If edible" };
  }
  return null;
}

export function modelPk(
  victim: Drug,
  others: Drug[],
  host: HostContext,
  opts: ModelOpts = {},
): PkModel | null {
  const spec = specFor(victim.id, host);
  if (!spec) return null;
  const tau = Math.max(0, opts.tauH ?? 0);
  const mono: HostContext = {
    ...DEFAULT_HOST,
    ketamineRoute: host.ketamineRoute,
    cannabisRoute: host.cannabisRoute,
  };
  const fmEntries = Object.entries(spec.fm) as [Enzyme, number][];
  const fmSum = fmEntries.reduce((s, [, v]) => s + v, 0);
  const other = Math.max(0, 1 - fmSum);
  const drivers: string[] = [];
  let clHep0 = other;
  let clHep1 = other;
  let clGut0 = 1;
  let clGut1 = 1;
  const perps = others.filter((d) => !isVirtual(d.id));
  for (const [enz, fm] of fmEntries) {
    const a = enzymeCl(enz, [], mono, "hep");
    const b = enzymeCl(enz, perps, host, "hep");
    clHep0 += fm * a.cl;
    clHep1 += fm * b.cl;
    if (enz === "CYP3A4") {
      const gutA = enzymeCl(enz, [], mono, "gut");
      const gutB = enzymeCl(enz, perps, host, "gut");
      clGut0 = gutA.cl;
      clGut1 = gutB.cl;
      if ((spec.gut3A4 ?? 0) > 0) drivers.push(...gutB.drivers);
    }
    drivers.push(...b.drivers);
  }
  clHep0 = Math.max(0.08, clHep0);
  clHep1 = Math.max(0.08, clHep1);
  const ke0 = ke(spec.tHalfH);
  const ke1 = ke0 * (clHep1 / clHep0);
  const F0 = oralF(spec.F, spec.gut3A4 ?? 0, clGut0);
  const F1 = oralF(spec.F, spec.gut3A4 ?? 0, clGut1);
  if (F1 / Math.max(F0, 0.01) > 1.15 && (spec.gut3A4 ?? 0) > 0) {
    drivers.push("intestinal CYP3A4 first-pass opening");
  }
  const uniqueDrivers = [...new Set(drivers)];
  const tHalfDesk = Math.LN2 / ke1;
  const horizon =
    opts.horizonH ??
    Math.min(
      168,
      Math.max(tau > 0 ? tau * 5 : 12, 5 * Math.max(spec.tHalfH, tHalfDesk), tau > 0 ? tau * 4 : 0),
    );
  const n = opts.n ?? (tau > 0 ? 140 : 80);
  const act = spec.activation;
  const act0 = act ? enzymeCl(act.enzyme, [], mono, "hep").cl : 1;
  const act1 = act ? enzymeCl(act.enzyme, perps, host, "hep").cl : 1;
  const iv = Boolean(spec.iv);

  let maxBaseSingle = 0;
  const probeH = Math.max(8, 5 * spec.tHalfH);
  const probeN = 50;
  for (let i = 0; i <= probeN; i++) {
    const t = (probeH * i) / probeN;
    maxBaseSingle = Math.max(maxBaseSingle, conc(t, F0, spec.kaH, ke0, iv));
  }
  const scale = opts.scale ?? (maxBaseSingle > 0 ? 1 / maxBaseSingle : 1);

  const raw: { t: number; base: number; desk: number; met0: number; met1: number }[] = [];
  let aucBase = 0;
  let aucDesk = 0;
  const aucH = Math.min(horizon, Math.max(12, 5 * Math.max(spec.tHalfH, tHalfDesk)));
  for (let i = 0; i <= n; i++) {
    const t = (horizon * i) / n;
    const base1 = Math.max(0, conc(t, F0, spec.kaH, ke0, iv));
    const desk1 = Math.max(0, conc(t, F1, spec.kaH, ke1, iv));
    const base = Math.max(0, summed(t, F0, spec.kaH, ke0, iv, tau));
    const desk = Math.max(0, summed(t, F1, spec.kaH, ke1, iv, tau));
    raw.push({ t, base, desk, met0: base * act0, met1: desk * act1 });
    if (i > 0 && t <= aucH + horizon / n) {
      const dt = horizon / n;
      aucBase += ((conc(raw[i - 1].t, F0, spec.kaH, ke0, iv) + base1) / 2) * dt;
      aucDesk += ((conc(raw[i - 1].t, F1, spec.kaH, ke1, iv) + desk1) / 2) * dt;
    }
  }
  const maxMet0 = Math.max(...raw.map((p) => p.met0), 1e-9);
  const points: PkPoint[] = raw.map((p) => ({
    t: p.t,
    base: p.base * scale,
    desk: p.desk * scale,
    metab: act ? p.met1 / maxMet0 : undefined,
  }));
  const aucr = aucBase > 0 ? aucDesk / aucBase : 1;
  const metabFold = act ? (act1 / Math.max(act0, 0.05)) * aucr : undefined;
  const maxDesk = Math.max(...raw.map((p) => p.desk));
  const maxBase = Math.max(...raw.map((p) => p.base), 1e-9);
  return {
    id: victim.id,
    name: victim.name,
    note: spec.note,
    drivers: uniqueDrivers,
    aucr,
    cmaxFold: maxDesk / maxBase,
    tHalfBase: spec.tHalfH,
    tHalfDesk,
    tmaxBase: tmaxOf(F0, spec.kaH, ke0, iv, horizon),
    tmaxDesk: tmaxOf(F1, spec.kaH, ke1, iv, horizon),
    horizonH: horizon,
    activationName: act?.name,
    metabFold,
    iv,
    scale,
    tauH: tau,
    rac: racOf(ke1, tau),
    racBase: racOf(ke0, tau),
    points,
  };
}

export function modelsFor(drugs: Drug[], host: HostContext, opts: ModelOpts = {}): PkModel[] {
  const real = drugs.filter((d) => !isVirtual(d.id) && ROWS[d.id] && DRUG_BY_ID[d.id]);
  const out: PkModel[] = [];
  for (const v of real) {
    const others = drugs.filter((d) => d.id !== v.id && !isVirtual(d.id));
    const m = modelPk(v, others, host, opts);
    if (m) out.push(m);
  }
  out.sort((a, b) => Math.abs(Math.log(b.aucr)) - Math.abs(Math.log(a.aucr)));
  return out;
}
