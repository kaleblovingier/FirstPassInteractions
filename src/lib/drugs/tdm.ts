/** Teaching TDM windows — not a protocol and not a draw-time order. */

import type { HostContext } from "./types";

export interface TdmCard {
  analyte: string;
  unit: string;
  trough: string;
  toxic: string;
  draw: string;
  pearl: string;
}

export const TDM: Record<string, TdmCard> = {
  lithium: {
    analyte: "Lithium",
    unit: "mEq/L",
    trough: "0.6–1.2 (maintenance often 0.6–0.8)",
    toxic: ">1.5; severe >2.0",
    draw: "Trough ~12 h after the last dose",
    pearl: "NSAID, ACEI/ARB, and thiazides raise the level. Salt restriction retains it; caffeine dumps it. CKD is a TDM problem, not a CYP one.",
  },
  valproate: {
    analyte: "Valproate",
    unit: "µg/mL",
    trough: "50–100 (mania sometimes higher)",
    toxic: ">150; hyperammonemia can happen inside the range",
    draw: "Trough before the morning dose",
    pearl: "UGT trap with lamotrigine — parent lamotrigine doubles. Boxed hepatotoxicity and pancreatitis. Not a first-line in people who can become pregnant.",
  },
  carbamazepine: {
    analyte: "Carbamazepine",
    unit: "µg/mL",
    trough: "4–12",
    toxic: ">15; hyponatremia can happen inside the range",
    draw: "Trough; autoinduction over the first weeks",
    pearl: "Strong 3A4 inducer. HLA-B*15:02 is the SJS gene. OCP failure and stolen methadone live on the same card.",
  },
  phenytoin: {
    analyte: "Phenytoin",
    unit: "µg/mL",
    trough: "10–20 total (free 1–2)",
    toxic: "Nystagmus ~20; ataxia ~30; lethargy ~40",
    draw: "Trough; correct for albumin",
    pearl: "Saturable 2C9/2C19 kinetics. Tube feeds bind it. A 2C9 PM looks like a dose that never settled.",
  },
  phenobarbital: {
    analyte: "Phenobarbital",
    unit: "µg/mL",
    trough: "15–40",
    toxic: ">40 sedation; >60 often toxic",
    draw: "Trough; t½ is days — do not chase yesterday",
    pearl: "Broad CYP inducer. Primidone is the prodrug. OCP failure is the quiet row.",
  },
  lamotrigine: {
    analyte: "Lamotrigine",
    unit: "µg/mL",
    trough: "3–15 (lab-dependent)",
    toxic: "Rash is not a level — SJS is the titration",
    draw: "Trough; pregnancy clearance rises",
    pearl: "Valproate doubles parent via UGT. Estrogen dumps it. The boxed warning is the rash, not the number.",
  },
  digoxin: {
    analyte: "Digoxin",
    unit: "ng/mL",
    trough: "0.5–0.9 in HFrEF (older 0.8–2.0 AF range is too hot)",
    toxic: ">2; toxicity at ‘normal’ if K is low",
    draw: "≥6 h after a dose; 8–24 h is cleaner",
    pearl: "P-gp victim. Clarithromycin, amiodarone, and verapamil raise it. Hypokalemia is the arrhythmia trap.",
  },
  clozapine: {
    analyte: "Clozapine",
    unit: "ng/mL",
    trough: "350–600 (response often ≥350)",
    toxic: ">1000 seizure / sedation watch",
    draw: "Trough; norclozapine is the metabolite column",
    pearl: "1A2 is the clearance. Daily smoke dumps the level; quitting makes it jump. Fluvoxamine is a strong 1A2 inhibitor — parent climbs.",
  },
  nortriptyline: {
    analyte: "Nortriptyline",
    unit: "ng/mL",
    trough: "50–150",
    toxic: ">500; anticholinergic / QT inside a hot range",
    draw: "Trough after ≥5 days",
    pearl: "2D6 victim. A PM or a strong 2D6 inhibitor (paroxetine, fluoxetine, bupropion) is how the TCA level surprises you.",
  },
  amitriptyline: {
    analyte: "Amitriptyline + nortriptyline",
    unit: "ng/mL",
    trough: "80–200 combined (lab-dependent)",
    toxic: ">500; QT and anticholinergic",
    draw: "Trough after ≥5 days",
    pearl: "2D6 and 2C19 both sit on this molecule. CPIC trims the PM. Not a free sleep drug in older adults.",
  },
  theophylline: {
    analyte: "Theophylline",
    unit: "µg/mL",
    trough: "10–20 (many labs now 5–15)",
    toxic: ">20 GI/CNS; >30 arrhythmia / seizure",
    draw: "Trough; peak 1–2 h after an IR dose",
    pearl: "Sensitive 1A2 substrate. Cipro and fluvoxamine raise it; smoke dumps it. The rebound on quit is the miss.",
  },
  tacrolimus: {
    analyte: "Tacrolimus",
    unit: "ng/mL",
    trough: "5–15 (indication and time from transplant)",
    toxic: "Nephrotoxicity, tremor, hyperglycemia as trough climbs",
    draw: "Trough (C0) just before the morning dose",
    pearl: "Sensitive 3A4 / P-gp gut victim. Grapefruit and azoles raise F; rifampin steals the graft. t½ barely moves — it is bioavailability.",
  },
  cyclosporine: {
    analyte: "Cyclosporine",
    unit: "ng/mL",
    trough: "100–400 (center protocol)",
    toxic: "Nephrotoxicity, HTN, gum, tremor",
    draw: "C0 or C2 per the transplant desk",
    pearl: "Same 3A4/P-gp gut story as tacrolimus. Diltiazem is sometimes used as a deliberate booster — that is a protocol, not a coincidence.",
  },
  sirolimus: {
    analyte: "Sirolimus",
    unit: "ng/mL",
    trough: "4–12 (center protocol)",
    toxic: "Marrow, lipids, delayed wound healing",
    draw: "Trough; t½ is long — do not redraw tomorrow",
    pearl: "3A4/P-gp. Cyclosporine raises sirolimus if you stack them the wrong hour.",
  },
  methotrexate: {
    analyte: "Methotrexate",
    unit: "µmol/L (high-dose) or nmol/L (weekly)",
    trough: "High-dose: follow the rescue nomogram, not a single number",
    toxic: "Mucositis, marrow, kidney — leucovorin is the rescue",
    draw: "Timed levels after high-dose; weekly RA doses are not this row",
    pearl: "NSAID, TMP-SMX, and PPI delay clearance. This is not a CYP story.",
  },
  warfarin: {
    analyte: "INR",
    unit: "",
    trough: "2–3 most indications (2.5–3.5 mechanical mitral)",
    toxic: "Bleed climbs as INR climbs; 4–5 is a hold conversation",
    draw: "Morning INR; vitamin K is the antidote",
    pearl: "S-warfarin is a sensitive 2C9 substrate. Fluconazole, TMP-SMX, and amiodarone are the classic perpetrators. Leafy greens are vitamin K, not 2C9.",
  },
  vancomycin: {
    analyte: "Vancomycin",
    unit: "",
    trough: "AUC24:MIC ratio 400–600 (trough-only 15–20 µg/mL deprecated)",
    toxic: "AKI risk rises steeply at AUC24 >600 or sustained troughs >15–20 µg/mL",
    draw: "Two-level peak (1–2 h post-infusion) and pre-dose trough, or Bayesian AUC24",
    pearl: "2020 ASHP/IDSA consensus guides serious MRSA therapy by AUC24:MIC rather than trough escalation. Piperacillin-tazobactam, aminoglycosides, loop diuretics, and NSAIDs multiply AKI risk.",
  },
  gentamicin: {
    analyte: "Gentamicin",
    unit: "µg/mL",
    trough: "Traditional peak 5–10, trough <1–2 (extended-interval trough <1)",
    toxic: "Trough >2 drives proximal tubular AKI; cumulative exposure drives ototoxicity",
    draw: "Traditional: peak 30 min post-infusion, trough ≤30 min pre-dose; extended-interval: 6–14 h level",
    pearl: "Concentration-dependent killing (Cmax:MIC ≥8–10). Proximal tubule megalin uptake saturates, so extended-interval dosing spares kidneys; loop diuretics and vancomycin stack toxicity.",
  },
  tobramycin: {
    analyte: "Tobramycin",
    unit: "µg/mL",
    trough: "Traditional peak 5–10 (8–10 pneumonia), trough <1–2 (extended-interval <1)",
    toxic: "Trough >2 drives proximal tubular AKI; irreversible cochlear and vestibular ototoxicity",
    draw: "Traditional: peak 30 min post-infusion, trough ≤30 min pre-dose; extended-interval: 6–14 h Hartford nomogram",
    pearl: "Preferred aminoglycoside for Pseudomonas; pulmonary penetration favors higher Cmax:MIC. Exclude extended-interval nomograms in CrCl <20–30 mL/min, pregnancy, ascites, or endocarditis synergy.",
  },
  amikacin: {
    analyte: "Amikacin",
    unit: "µg/mL",
    trough: "Traditional peak 20–35, trough <4–8 (extended-interval <1–4)",
    toxic: "Trough >8–10; irreversible high-frequency sensorineural hearing loss and AKI",
    draw: "Traditional: peak 30 min post-infusion, trough ≤30 min pre-dose; extended-interval: 6–14 h Hartford (2.5× cutoff)",
    pearl: "Resists most aminoglycoside-modifying enzymes. Shares megalin-mediated renal tubular accumulation and synergistic ototoxicity/nephrotoxicity with loop diuretics and vancomycin.",
  },
  voriconazole: {
    analyte: "Voriconazole",
    unit: "µg/mL",
    trough: "1.0–5.5 (invasive mold protocols often target 1.5–5.5)",
    toxic: ">5.5: visual hallucinations, photopsia, encephalopathy, hepatotoxicity",
    draw: "Trough prior to dose after 5–7 days (or day 2–3 after loading)",
    pearl: "Non-linear saturable CYP2C19/CYP3A4 clearance plus strong CYP3A4 and moderate CYP2C19 inhibition. CYP2C19 PMs spike into neuro/hepatotoxicity; UMs run subtherapeutic.",
  },
  posaconazole: {
    analyte: "Posaconazole",
    unit: "µg/mL",
    trough: "≥0.7 prophylaxis; ≥1.0–1.25 invasive mold treatment",
    toxic: "Hepatotoxicity, QTc prolongation, pseudohyperaldosteronism (HTN, hypokalemia)",
    draw: "Trough prior to dose after ~7 days",
    pearl: "Delayed-release tablets and IV absorb reliably; oral suspension needs acidic high-fat meals and fails on PPIs. Strong CYP3A4 and moderate P-gp inhibitor — trim tacrolimus and sirolimus upfront.",
  },
  itraconazole: {
    analyte: "Itraconazole + hydroxy-itraconazole",
    unit: "µg/mL",
    trough: "≥0.5–1.0 combined sum (assay-dependent)",
    toxic: ">3–5: negative inotropy / HF exacerbation, peripheral edema, HTN, hepatotoxicity",
    draw: "Trough after 7–14 days (long t½ of parent and active metabolite)",
    pearl: "Capsules need gastric acid and food (PPIs/H2RAs blunt absorption); oral solution absorbs better fasting. Potent CYP3A4 and P-gp inhibitor with boxed heart-failure warning.",
  },
  everolimus: {
    analyte: "Everolimus",
    unit: "ng/mL",
    trough: "3–8 (transplant with reduced CNI; oncology protocols differ)",
    toxic: "Stomatitis, hyperlipidemia, cytopenias, delayed wound healing, non-infectious pneumonitis",
    draw: "12-hour whole-blood trough (C0) immediately prior to morning dose",
    pearl: "Sensitive CYP3A4 and P-gp substrate (~30 h half-life). Strong 3A4 inhibitors (azoles, clarithromycin, Paxlovid) spike exposure; rifampin and enzyme-inducing AEDs strip it.",
  },
  "mycophenolate-mofetil": {
    analyte: "Mycophenolic acid (MPA)",
    unit: "µg/mL",
    trough: "C0 1.0–3.5 (tacrolimus) or 2.0–4.0 (cyclosporine); 12-h MPA AUC 30–60 mcg/mL·h",
    toxic: "Erosive enteropathy/diarrhea, leukopenia, viral reactivation; boxed teratogenicity",
    draw: "12-hour pre-dose trough (C0) or abbreviated 3-point MPA AUC",
    pearl: "UGT1A9 forms MPAG, which relies on canalicular MRP2 biliary secretion and gut-flora beta-glucuronidase for enterohepatic recycling. Cyclosporine blocks MRP2, PPIs cut MMF dissolution, and bile-acid binders/broad-spectrum antibiotics erase the second peak.",
  },
  procainamide: {
    analyte: "Procainamide + NAPA",
    unit: "µg/mL",
    trough: "Procainamide 4–10; NAPA 10–30 (combined ≤30)",
    toxic: "Combined >30: QRS widening, QTc prolongation / TdP, hypotension, drug-induced lupus",
    draw: "Pre-dose trough (or steady-state infusion level); always measure both parent and NAPA",
    pearl: "NAT2 converts procainamide to NAPA (pure Class III IKr blocker). Slow acetylators accumulate parent (lupus risk); CKD retains renally cleared NAPA (torsades risk).",
  },
  quinidine: {
    analyte: "Quinidine",
    unit: "µg/mL",
    trough: "2–5",
    toxic: ">6: cinchonism (tinnitus, blurred vision, GI upset), QRS widening, QTc / TdP",
    draw: "Trough immediately before the next dose",
    pearl: "CYP3A4 substrate and potent CYP2D6 / P-gp inhibitor. Doubles digoxin via renal/biliary P-gp blockade, converts 2D6 substrates (codeine, metoprolol, TCAs) to PM-like exposure, and stacks QTc.",
  },
  lidocaine: {
    analyte: "Lidocaine",
    unit: "µg/mL",
    trough: "1.5–5.0",
    toxic: ">6: perioral numbness, tinnitus, slurred speech, confusion, seizures, sinus arrest",
    draw: "During continuous IV maintenance infusion (steady state ~8–10 h; longer in HF or cirrhosis)",
    pearl: "High hepatic extraction ratio (perfusion-limited clearance via CYP1A2/3A4) bound to alpha-1-acid glycoprotein (AAG). Heart failure or cirrhosis halves clearance; acute MI elevates AAG, shifting total vs free levels.",
  },
  olanzapine: {
    analyte: "Olanzapine",
    unit: "ng/mL",
    trough: "20–80 (AGNP reference range)",
    toxic: ">100–150: marked sedation, orthostasis, anticholinergic delirium, QTc risk",
    draw: "Pre-dose trough after ≥5–7 days at steady state (t½ ~30 h)",
    pearl: "CYP1A2 smoking-sensitive substrate. Smoking induces CYP1A2 and lowers plasma levels; abrupt smoking cessation or adding fluvoxamine can double plasma olanzapine exposure.",
  },
  risperidone: {
    analyte: "Risperidone + 9-hydroxyrisperidone (active moiety)",
    unit: "ng/mL",
    trough: "20–60 active moiety (parent + paliperidone)",
    toxic: ">120 active moiety: extrapyramidal symptoms (EPS), hyperprolactinemia, orthostasis, QTc risk",
    draw: "Pre-dose trough at steady state; compare parent-to-metabolite ratio (R/9-OH-R) to spot CYP2D6 phenoconversion",
    pearl: "CYP2D6 converts risperidone to active 9-hydroxyrisperidone (paliperidone). Strong CYP2D6 inhibitors (paroxetine, fluoxetine, bupropion) or CYP2D6 PM status invert the ratio and spike EPS and prolactin toxicity.",
  },
  haloperidol: {
    analyte: "Haloperidol",
    unit: "ng/mL",
    trough: "1–10 (AGNP reference range; higher levels rarely add efficacy)",
    toxic: ">15: severe EPS, akathisia, tardive dyskinesia, QTc prolongation / TdP, NMS",
    draw: "Pre-dose trough after ≥5–7 days; pair with baseline and follow-up ECG QTc monitoring",
    pearl: "CYP2D6 and CYP3A4 substrate plus moderate CYP2D6 inhibitor. Strong 2D6/3A4 perpetrator stacks elevate haloperidol levels and compound QTc/TdP risk, especially with IV use or hypokalemia/hypomagnesemia.",
  },
  imipramine: {
    analyte: "Imipramine + desipramine (active moiety)",
    unit: "ng/mL",
    trough: "175–300 combined sum",
    toxic: ">300–500: QRS widening (>100 ms), QTc prolongation, anticholinergic delirium, seizures, hypotension",
    draw: "Pre-dose trough after ≥5–7 days at steady state; obtain ECG (QRS/QTc) alongside trough",
    pearl: "CYP2C19 demethylates imipramine to desipramine and CYP2D6 hydroxylates both. CYP2D6 or CYP2C19 inhibition (fluoxetine, paroxetine, fluvoxamine, bupropion) or PM status spikes active moiety exposure and TCA cardiotoxicity.",
  },
  desipramine: {
    analyte: "Desipramine",
    unit: "ng/mL",
    trough: "100–300 (AGNP reference range)",
    toxic: ">300–500: QRS widening, ventricular arrhythmia, anticholinergic delirium, seizures",
    draw: "Pre-dose trough after ≥5–7 days at steady state; pair with ECG QRS/QTc monitoring",
    pearl: "Sensitive narrow-therapeutic-index CYP2D6 substrate. Strong CYP2D6 inhibitors (paroxetine, fluoxetine, bupropion, quinidine) or CYP2D6 PM status can multiply plasma exposure several-fold and precipitate cardiotoxicity.",
  },
  doxepin: {
    analyte: "Doxepin + nordoxepin (active moiety)",
    unit: "ng/mL",
    trough: "50–150 combined sum (antidepressant range)",
    toxic: ">300: heavy sedation, anticholinergic delirium, orthostasis, QRS/QTc prolongation, seizures",
    draw: "Pre-dose trough after ≥5–7 days at steady state; sum parent doxepin plus active nordoxepin",
    pearl: "CYP2C19 forms active nordoxepin and CYP2D6 clears both. CYP2C19 or CYP2D6 perpetrators (fluvoxamine, fluoxetine, paroxetine, cimetidine) elevate the combined active moiety.",
  },
  primidone: {
    analyte: "Primidone + phenobarbital (active metabolite)",
    unit: "µg/mL",
    trough: "Primidone 5–12; derived phenobarbital 15–40",
    toxic: "Primidone >15 or phenobarbital >40: ataxia, nystagmus, heavy sedation, respiratory depression",
    draw: "Pre-dose trough for both analytes; derived phenobarbital takes 2–3 weeks to reach steady state",
    pearl: "Bioactivated to phenobarbital and PEMA; potent broad CYP/P-gp inducer that lowers OCPs, DOACs, and warfarin. Phenytoin and carbamazepine accelerate conversion to phenobarbital, shifting the metabolite ratio upward.",
  },
  oxcarbazepine: {
    analyte: "10-Monohydroxy metabolite (MHD / licarbazepine)",
    unit: "µg/mL",
    trough: "3–35 MHD (assay tracks active MHD, not rapidly reduced parent)",
    toxic: ">35–40 MHD: diplopia, dizziness, ataxia; hyponatremia (Na <130 mEq/L) often occurs inside range",
    draw: "Pre-dose MHD trough at steady state paired with baseline and periodic serum sodium",
    pearl: "Prodrug reduced to active MHD (UGT glucuronidation and renal clearance). Moderate CYP3A4 inducer (risks OCP failure) and moderate CYP2C19 inhibitor; hyponatremia risk climbs with SSRIs, thiazides, or older age.",
  },
  levetiracetam: {
    analyte: "Levetiracetam",
    unit: "µg/mL",
    trough: "12–46 (ILAE reference range)",
    toxic: ">46: somnolence, dizziness, behavioral irritability, agitation",
    draw: "Pre-dose trough; highest yield in pregnancy, severe CKD/dialysis, or adherence checks",
    pearl: "Predominantly renally excreted unchanged with minimal CYP liability. Pregnancy increases clearance markedly (troughs drop substantially), whereas severe CKD retains drug and heightens sedation and neuropsychiatric toxicity.",
  },
  topiramate: {
    analyte: "Topiramate",
    unit: "µg/mL",
    trough: "5–20 (ILAE reference range)",
    toxic: ">20: cognitive slowing, word-finding aphasia, paresthesias; metabolic acidosis and nephrolithiasis occur inside range",
    draw: "Pre-dose trough plus baseline and periodic serum bicarbonate (and serum ammonia if paired with valproate)",
    pearl: "Carbonic anhydrase inhibition drops serum bicarbonate (stacks acidosis with zonisamide or acetazolamide). Co-use with valproate can trigger hyperammonemic encephalopathy and hypothermia even with normal LFTs.",
  },
  zonisamide: {
    analyte: "Zonisamide",
    unit: "µg/mL",
    trough: "10–40 (ILAE reference range)",
    toxic: ">40: somnolence, ataxia, cognitive slowing; metabolic acidosis, oligohidrosis/hyperthermia, and renal stones occur inside range",
    draw: "Pre-dose trough after ~10–14 days (long t½ ~63 h — avoid premature redraws) plus serum bicarbonate",
    pearl: "Long-half-life sulfonamide AED partially cleared via CYP3A4. Strong CYP3A4 inducers (carbamazepine, phenytoin, phenobarbital, rifampin) shorten half-life and drop troughs; strong 3A4 inhibitors raise steady-state levels.",
  },
  imatinib: {
    analyte: "Imatinib",
    unit: "ng/mL",
    trough: "≥1000 (CML response threshold; GIST ≥1100; typical 1000–3000)",
    toxic: ">3000: severe periorbital/peripheral edema, cytopenias, hepatotoxicity, fluid retention, QTc prolongation",
    draw: "Pre-dose trough (Cmin) at steady state (~7 days) during uninterrupted therapy",
    pearl: "Major CYP3A4 substrate and moderate CYP3A4 inhibitor. Strong CYP3A4 inducers (rifampin, phenytoin, carbamazepine, St. John's wort) drive subtherapeutic troughs (<1000 ng/mL) and loss of oncology response; strong 3A4 inhibitors spike toxicity.",
  },
  linezolid: {
    analyte: "Linezolid",
    unit: "µg/mL",
    trough: "2–8 (prolonged therapy >14 days or renal impairment)",
    toxic: ">8–10: exposure-dependent thrombocytopenia, anemia, lactic acidosis, peripheral/optic neuropathy",
    draw: "Pre-dose trough after ≥3–5 days during prolonged courses or CrCl <60 mL/min; pair with weekly CBC",
    pearl: "Renal impairment retains linezolid and its metabolites, driving troughs >8 µg/mL and steep thrombocytopenia and lactic acidosis risk. Reversible nonselective MAOI — watch serotonergic stacks; rifampin lowers exposure.",
  },
  "lithium-orotate": {
    analyte: "Lithium (serum elemental lithium from OTC salt)",
    unit: "mEq/L",
    trough: "No established OTC target (Rx lithium maintenance is 0.6–0.8; acute 0.8–1.2)",
    toxic: ">1.5; severe >2.0 (cumulative renal tubular retention when stacked with Rx lithium or clearance blockers)",
    draw: "Serum lithium, SCr/eGFR, and electrolytes if co-exposed with Rx lithium, NSAIDs, ACEi/ARBs, or thiazides",
    pearl: "Unregulated OTC elemental lithium salt lacking FDA approval. Dissociated lithium ions share identical proximal renal reabsorption with prescription lithium — NSAIDs, ACEi/ARBs, and thiazides cut renal clearance, and co-use with Rx lithium creates duplicate exposure.",
  },
};

export const TDM_IDS: readonly string[] = Object.keys(TDM);

export function tdmFor(id: string): TdmCard | undefined {
  return TDM[id];
}

export function tdmOnDesk(ids: string[]): Array<{ id: string; card: TdmCard }> {
  return ids.map((id) => ({ id, card: TDM[id] })).filter((row): row is { id: string; card: TdmCard } => Boolean(row.card));
}

export function tdmHostNote(id: string, host: HostContext): string | null {
  if (id === "lithium" && host.kidney === "ckd") return "CKD on this host — lithium is renally cleared. The trough will drift up.";
  if (id === "lithium-orotate") {
    if (host.kidney === "ckd") return "CKD on this host — dissociated lithium from OTC lithium orotate clears renally and accumulates like prescription lithium. Check serum lithium and SCr.";
    if (host.age === "geriatric") return "Geriatric host — lower GFR and smaller Vd heighten cumulative elemental lithium retention risk from OTC lithium orotate.";
  }
  if (id === "digoxin" && host.kidney === "ckd") return "CKD on this host — digoxin clearance falls. Recheck the trough, not just the milligrams.";
  if (id === "lithium" && host.age === "geriatric") return "Geriatric host — smaller Vd and GFR. Toxicity can sit inside a ‘therapeutic’ number.";
  if (id === "vancomycin") {
    if (host.kidney === "ckd" && host.age === "geriatric") {
      return "CKD and geriatric age on this host — reduced GFR slows vancomycin clearance and elevates AUC24 and AKI risk.";
    }
    if (host.kidney === "ckd") return "CKD on this host — vancomycin is renally cleared. Clearance falls and AUC24 climbs quickly; follow SCr and early levels.";
    if (host.age === "geriatric") return "Geriatric host — lower GFR (even with normal-looking SCr) slows vancomycin clearance and raises AKI risk.";
  }
  if (id === "gentamicin" || id === "tobramycin" || id === "amikacin") {
    if (host.kidney === "ckd" && host.age === "geriatric") {
      return "CKD and geriatric age on this host — extended-interval nomograms do not apply below CrCl 20–30 mL/min; trough retention drives AKI and ototoxicity.";
    }
    if (host.kidney === "ckd") {
      return "CKD on this host — aminoglycoside clearance falls and extended-interval nomograms do not apply below CrCl 20–30 mL/min. Trough retention drives AKI and ototoxicity.";
    }
    if (host.age === "geriatric") {
      return "Geriatric host — reduced GFR and lean mass raise aminoglycoside trough retention and irreversible vestibular/cochlear ototoxicity risk.";
    }
  }
  if (id === "procainamide" && host.kidney === "ckd") {
    return "CKD on this host — active NAPA metabolite is renally cleared and accumulates even when parent procainamide looks in range. Watch QTc.";
  }
  if (id === "linezolid" && host.kidney === "ckd") {
    return "CKD on this host — linezolid trough retention (>8 µg/mL) drives steep thrombocytopenia and lactic acidosis risk during prolonged courses.";
  }
  if (id === "levetiracetam") {
    if (host.preg === "pregnant") return "Pregnancy markedly raises renal levetiracetam clearance — troughs often fall without close monitoring.";
    if (host.kidney === "ckd") return "CKD on this host — levetiracetam clears renally unchanged; reduced GFR elevates troughs and neuropsychiatric/sedation risk.";
  }
  if (id === "oxcarbazepine") {
    if (host.kidney === "ckd") return "CKD on this host — active MHD metabolite clears renally and accumulates as GFR drops; monitor MHD trough and serum sodium.";
    if (host.preg === "pregnant") return "Pregnancy accelerates UGT glucuronidation of MHD — serum MHD troughs can fall substantially.";
    if (host.age === "geriatric") return "Geriatric host — higher SIADH/hyponatremia risk on oxcarbazepine; follow serum sodium alongside MHD trough.";
  }
  if (id === "topiramate" && host.preg === "pregnant") {
    return "Pregnancy lowers topiramate troughs via rising clearance, and topiramate carries oral-cleft teratogenic risk.";
  }
  if (id === "voriconazole") {
    if (host.phenotypes.CYP2C19 === "PM") {
      return "CYP2C19 poor metabolizer — voriconazole clearance drops sharply. Expect elevated troughs and visual/neurotoxicity without early TDM.";
    }
    if (host.phenotypes.CYP2C19 === "UM") {
      return "CYP2C19 ultrarapid metabolizer — voriconazole clears fast and troughs often run subtherapeutic (<1.0 µg/mL).";
    }
  }
  if (id === "risperidone") {
    if (host.phenotypes.CYP2D6 === "PM") {
      return "CYP2D6 poor metabolizer — parent risperidone accumulates with an inverted risperidone/9-OH ratio, elevating EPS and QTc risk.";
    }
    if (host.kidney === "ckd") {
      return "CKD on this host — active 9-hydroxyrisperidone (paliperidone) is renally cleared and accumulates as GFR declines.";
    }
  }
  if (id === "haloperidol" && host.phenotypes.CYP2D6 === "PM") {
    return "CYP2D6 poor metabolizer — haloperidol clearance drops and troughs climb; monitor EPS and ECG QTc.";
  }
  if (id === "desipramine" && host.phenotypes.CYP2D6 === "PM") {
    return "CYP2D6 poor metabolizer — desipramine is a sensitive 2D6 NTI substrate. Expect multi-fold trough elevation and ECG QRS/QTc risk.";
  }
  if (id === "imipramine" && (host.phenotypes.CYP2D6 === "PM" || host.phenotypes.CYP2C19 === "PM")) {
    return "CYP2D6 or CYP2C19 poor metabolizer — imipramine + desipramine active moiety climbs sharply. Monitor combined trough and ECG QRS/QTc.";
  }
  if (id === "doxepin" && (host.phenotypes.CYP2D6 === "PM" || host.phenotypes.CYP2C19 === "PM")) {
    return "CYP2D6 or CYP2C19 poor metabolizer — doxepin + nordoxepin clearance slows; monitor sedation, anticholinergic burden, and ECG QRS/QTc.";
  }
  if (id === "clozapine" && host.smoking) return "Daily smoke on this host — 1A2 induction. Expect a lower trough; quitting will raise it.";
  if (id === "olanzapine" && host.smoking) return "Daily smoke on this host — CYP1A2 induction drops olanzapine troughs; abrupt smoking cessation can double plasma exposure.";
  if (id === "theophylline" && host.smoking) return "Smoke induces 1A2. Theophylline falls; the quit rebound is the toxicity.";
  if (id === "phenytoin" && host.preg === "pregnant") return "Pregnancy — clearance and albumin both move. Free phenytoin is the honest number.";
  if (id === "lamotrigine" && host.preg === "pregnant") return "Pregnancy raises lamotrigine clearance. Levels fall unless you titrate.";
  if (id === "valproate" && host.preg === "pregnant") return "Valproate is avoid in pregnancy on this desk — neural-tube and cognitive risk, not a TDM tweak.";
  return null;
}

export function hasTdm(id: string) {
  return Boolean(TDM[id]);
}
