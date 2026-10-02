/**
 * CPIC / PharmGKB teaching cards.
 * Paraphrases of published guidelines — open the source for the table.
 * ClinPGx is the current PharmGKB home.
 */

export type CpicLevel = "A" | "B" | "C";

export interface PgxRow {
  pheno: string;
  action: string;
}

export interface PgxCard {
  gene: string;
  cpic: CpicLevel;
  guideline: string;
  clinpgx: string;
  rows: PgxRow[];
  pearl: string;
}

function g(path: string) {
  return `https://cpicpgx.org/guidelines/${path}`;
}
function c(q: string) {
  return `https://www.clinpgx.org/search?query=${encodeURIComponent(q)}`;
}

const SSRI = g("cpic-guideline-for-ssri-and-snri-antidepressants/");
const TCA = g("guideline-for-tricyclic-antidepressants-and-cyp2d6-and-cyp2c19/");
const CODEINE = g("guideline-for-codeine-and-cyp2d6/");
const PPI = g("cpic-guideline-for-proton-pump-inhibitors-and-cyp2c19/");
const STATIN = g("cpic-guideline-for-statins/");
const NSAID = g("cpic-guideline-for-nsaids-and-cyp2c9/");
const THIO = g("guideline-for-thiopurines-and-tpmt-nudt15/");

function ssri2c19(drug: string): PgxCard {
  return {
    gene: "CYP2C19",
    cpic: "A",
    guideline: SSRI,
    clinpgx: c(drug),
    rows: [
      { pheno: "UM / RM", action: "Consider a drug not primarily cleared by 2C19." },
      { pheno: "NM / IM", action: "Start the usual labeled dose." },
      { pheno: "PM", action: "Start at 50% of the usual dose, or pick another SSRI." },
    ],
    pearl:
      "Citalopram and escitalopram are 2C19 victims. Ultrarapid clearance can look like a failed trial; poor metabolizers stack parent and QT-relevant exposure. Flip 2C19 on this desk to see the PK sketch move.",
  };
}

function tca2d6(drug: string): PgxCard {
  return {
    gene: "CYP2D6",
    cpic: "A",
    guideline: TCA,
    clinpgx: c(drug),
    rows: [
      { pheno: "UM", action: "Avoid tertiary TCAs; pick a 2D6-independent agent." },
      { pheno: "NM", action: "Usual dosing; titrate to level and side effects." },
      { pheno: "IM", action: "Consider 25% reduction; watch anticholinergic / QT load." },
      { pheno: "PM", action: "Avoid, or start at 50% with TDM if you must use a TCA." },
    ],
    pearl:
      "Tertiary TCAs (amitriptyline, imipramine, clomipramine) are 2D6 and 2C19 stories. Poor metabolizers stack parent; ultrarapid metabolizers may never see a level. This is not a dosing protocol.",
  };
}

export const PGX: Record<string, PgxCard[]> = {
  citalopram: [ssri2c19("citalopram")],
  escitalopram: [ssri2c19("escitalopram")],
  sertraline: [
    {
      gene: "CYP2C19",
      cpic: "A",
      guideline: SSRI,
      clinpgx: c("sertraline"),
      rows: [
        { pheno: "UM / RM", action: "Usual start; optional switch if no response." },
        { pheno: "NM / IM", action: "Usual labeled dose." },
        { pheno: "PM", action: "Start at 50%; slower titration." },
      ],
      pearl:
        "Sertraline is a 2C19 (and 2B6) substrate. CPIC is quieter than for citalopram. Poor metabolizers still deserve a slower start.",
    },
  ],
  paroxetine: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: SSRI,
      clinpgx: c("paroxetine"),
      rows: [
        { pheno: "UM", action: "Pick an SSRI not primarily 2D6-cleared." },
        { pheno: "NM / IM", action: "Usual dose; watch withdrawal on stop." },
        { pheno: "PM", action: "50% reduction or an alternative." },
      ],
      pearl:
        "Paroxetine is a 2D6 substrate and a strong 2D6 inhibitor. A PM is both a victim and a perpetrator. Tamoxifen activation and codeine both go quiet next to it.",
    },
  ],
  fluvoxamine: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: SSRI,
      clinpgx: c("fluvoxamine"),
      rows: [
        { pheno: "NM / IM / UM", action: "Usual labeled dose." },
        { pheno: "PM", action: "25–50% reduction; it is also a strong 1A2/2C19 inhibitor." },
      ],
      pearl:
        "The louder fluvoxamine story on this desk is 1A2 (clozapine, theophylline, tizanidine), not 2D6. CPIC still trims the PM dose.",
    },
  ],
  venlafaxine: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: SSRI,
      clinpgx: c("venlafaxine"),
      rows: [
        { pheno: "UM", action: "Consider an alternative; parent may be low." },
        { pheno: "NM", action: "Usual dose." },
        { pheno: "PM / IM", action: "Consider an alternative not 2D6-activated to ODV." },
      ],
      pearl:
        "2D6 makes O-desmethylvenlafaxine (desvenlafaxine). Poor metabolizers stack parent; the active metabolite falls. Flip 2D6 PM on the curve.",
    },
  ],
  vortioxetine: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: SSRI,
      clinpgx: c("vortioxetine"),
      rows: [
        { pheno: "NM / IM / UM", action: "Usual labeled dose (max 20 mg)." },
        { pheno: "PM", action: "Maximum 10 mg/day." },
      ],
      pearl: "A clean 2D6 ceiling. Poor metabolizers do not get the 20 mg step.",
    },
  ],
  fluoxetine: [
    {
      gene: "CYP2D6",
      cpic: "C",
      guideline: SSRI,
      clinpgx: c("fluoxetine"),
      rows: [
        { pheno: "any", action: "No gene-based dose. Parent + norfluoxetine still occupy SERT." },
      ],
      pearl:
        "CPIC looked and did not recommend a 2D6 dose cut — the parent and S-norfluoxetine both block SERT, so the sum may not move enough. It remains a strong 2D6 inhibitor of everything else on the desk.",
    },
  ],
  amitriptyline: [tca2d6("amitriptyline")],
  nortriptyline: [tca2d6("nortriptyline")],
  imipramine: [tca2d6("imipramine")],
  desipramine: [tca2d6("desipramine")],
  clomipramine: [tca2d6("clomipramine")],
  codeine: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: CODEINE,
      clinpgx: c("codeine"),
      rows: [
        { pheno: "UM", action: "Avoid — excess morphine, respiratory depression." },
        { pheno: "NM", action: "Usual labeled dose if an opioid is indicated." },
        { pheno: "IM", action: "Watch response; consider a non-tramadol opioid." },
        { pheno: "PM", action: "Avoid — little morphine, little analgesia." },
      ],
      pearl:
        "Codeine is a 2D6 prodrug to morphine. Ultrarapid is toxicity; poor is a sugar pill. Tramadol is the same family — do not swap one for the other.",
    },
  ],
  tramadol: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: CODEINE,
      clinpgx: c("tramadol"),
      rows: [
        { pheno: "UM", action: "Avoid — excess O-desmethyltramadol." },
        { pheno: "NM", action: "Usual labeled dose if indicated." },
        { pheno: "PM", action: "Avoid — lost opioid effect; SNRI parent remains." },
      ],
      pearl:
        "Same 2D6 activation map as codeine. Poor metabolizers keep the SNRI parent (seizure / serotonin) and lose the μ metabolite. Not a free swap.",
    },
  ],
  hydrocodone: [
    {
      gene: "CYP2D6",
      cpic: "B",
      guideline: CODEINE,
      clinpgx: c("hydrocodone"),
      rows: [
        { pheno: "UM", action: "Monitor; hydromorphone formation may rise." },
        { pheno: "PM", action: "Analgesia may be weaker; 3A4 is still the main clearance." },
      ],
      pearl:
        "3A4 clears parent; 2D6 makes hydromorphone. Louder than a footnote, quieter than codeine. Strong 3A4 inhibitors are the PK trap on this desk.",
    },
  ],
  tamoxifen: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: g("cpic-guideline-for-tamoxifen-based-on-cyp2d6-genotype/"),
      clinpgx: c("tamoxifen"),
      rows: [
        { pheno: "UM / NM", action: "Standard adjuvant dosing." },
        { pheno: "IM / PM", action: "Consider an aromatase inhibitor (with ovarian suppression if premenopausal)." },
      ],
      pearl:
        "Endoxifen needs 2D6. Paroxetine, fluoxetine, and bupropion are the classic blockers — a phenocopy of a poor metabolizer. This is oncology PGx, not a mood footnote.",
    },
  ],
  atomoxetine: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: g("cpic-guideline-for-atomoxetine-based-on-cyp2d6-genotype/"),
      clinpgx: c("atomoxetine"),
      rows: [
        { pheno: "UM", action: "May need the upper labeled range; check plasma if no response." },
        { pheno: "NM", action: "Usual titration." },
        { pheno: "PM", action: "Lower start, slower titration; peak exposure is higher and later." },
      ],
      pearl: "A 2D6-sensitive NRI. Poor metabolizers get more parent, more noradrenergic side effects, and a slower peak.",
    },
  ],
  ondansetron: [
    {
      gene: "CYP2D6",
      cpic: "A",
      guideline: g("guideline-for-ondansetron-and-tropisetron-and-cyp2d6-genotype/"),
      clinpgx: c("ondansetron"),
      rows: [
        { pheno: "UM", action: "Increased metabolism — consider a non-5-HT3 alternative for CINV." },
        { pheno: "NM / IM / PM", action: "Usual labeled dose." },
      ],
      pearl:
        "Ultrarapid 2D6 can fail Zofran. On an OTP board it is still a known-QT drug next to methadone — PGx does not retire the ECG.",
    },
  ],
  aripiprazole: [
    {
      gene: "CYP2D6",
      cpic: "B",
      guideline: SSRI,
      clinpgx: c("aripiprazole"),
      rows: [
        { pheno: "PM", action: "Label: half the usual dose. DPWG agrees. 3A4 inhibitors stack on top." },
        { pheno: "NM / IM / UM", action: "Usual titration; long t½ still accumulates." },
      ],
      pearl: "2D6 PM is on the Abilify label. The curve on this desk is days, not hours.",
    },
  ],
  risperidone: [
    {
      gene: "CYP2D6",
      cpic: "C",
      guideline: SSRI,
      clinpgx: c("risperidone"),
      rows: [
        { pheno: "PM", action: "DPWG: extra-pyramidal risk. Paliperidone (9-OH) is mostly renal." },
        { pheno: "NM", action: "Usual dose." },
      ],
      pearl:
        "CPIC is quieter than DPWG here. 2D6 makes paliperidone. The QT and prolactin PD still apply regardless of genotype.",
    },
  ],
  clopidogrel: [
    {
      gene: "CYP2C19",
      cpic: "A",
      guideline: g("guideline-for-clopidogrel-and-cyp2c19/"),
      clinpgx: c("clopidogrel"),
      rows: [
        { pheno: "UM / RM / NM", action: "Standard 75 mg if indicated." },
        { pheno: "IM / PM", action: "ACS/PCI: prasugrel or ticagrelor. Omeprazole is a phenocopy of IM." },
      ],
      pearl:
        "Clopidogrel is a 2C19 prodrug. Poor activation is a stent thrombosis story. Omeprazole/esomeprazole inhibit 2C19 — pantoprazole is the quieter PPI on this desk.",
    },
  ],
  omeprazole: [
    {
      gene: "CYP2C19",
      cpic: "A",
      guideline: PPI,
      clinpgx: c("omeprazole"),
      rows: [
        { pheno: "UM", action: "Increase dose ~100% for H. pylori / erosive disease." },
        { pheno: "NM / IM", action: "Usual dose." },
        { pheno: "PM", action: "Usual dose; exposure is already higher (better acid control)." },
      ],
      pearl: "Ultrarapid 2C19 can fail a PPI. The clopidogrel collision is the other 2C19 story — not this dose table.",
    },
  ],
  esomeprazole: [
    {
      gene: "CYP2C19",
      cpic: "A",
      guideline: PPI,
      clinpgx: c("esomeprazole"),
      rows: [
        { pheno: "UM", action: "Increase dose for H. pylori / erosive disease." },
        { pheno: "PM", action: "Usual dose; still a 2C19 inhibitor of clopidogrel." },
      ],
      pearl: "Same PPI family as omeprazole. Pantoprazole is the weaker 2C19 inhibitor if a P2Y12 prodrug is on the desk.",
    },
  ],
  lansoprazole: [
    {
      gene: "CYP2C19",
      cpic: "A",
      guideline: PPI,
      clinpgx: c("lansoprazole"),
      rows: [
        { pheno: "UM", action: "Increase dose for H. pylori / erosive disease." },
        { pheno: "PM", action: "Usual dose." },
      ],
      pearl: "CPIC PPI table includes lansoprazole. Same 2C19 family as omeprazole.",
    },
  ],
  voriconazole: [
    {
      gene: "CYP2C19",
      cpic: "A",
      guideline: g("guideline-for-voriconazole-and-cyp2c19/"),
      clinpgx: c("voriconazole"),
      rows: [
        { pheno: "UM / RM", action: "Choose another antifungal if possible — subtherapeutic risk." },
        { pheno: "NM", action: "Usual labeled dose with TDM." },
        { pheno: "PM", action: "Lower dose / TDM; visual and hepatic toxicity stack." },
      ],
      pearl: "A 2C19-sensitive azole and a strong 3A4 inhibitor. PGx and the perpetrator map both belong on the desk.",
    },
  ],
  diazepam: [
    {
      gene: "CYP2C19",
      cpic: "C",
      guideline: TCA,
      clinpgx: c("diazepam"),
      rows: [
        { pheno: "PM", action: "Longer parent and nordiazepam. Lorazepam / oxazepam skip this CYP." },
      ],
      pearl: "2C19 and 3A4 stretch diazepam. The LOT benzos (lorazepam, oxazepam, temazepam) are UGT, not this gene.",
    },
  ],
  clobazam: [
    {
      gene: "CYP2C19",
      cpic: "C",
      guideline: TCA,
      clinpgx: c("clobazam"),
      rows: [
        { pheno: "PM", action: "Label: start lower. N-desmethylclobazam stacks." },
      ],
      pearl: "Onfi is a 2C19 victim. Poor metabolizers accumulate the metabolite. Still a benzo on an opioid airway.",
    },
  ],
  warfarin: [
    {
      gene: "CYP2C9 / VKORC1",
      cpic: "A",
      guideline: g("guideline-for-warfarin-and-cyp2c9-and-vkorc1/"),
      clinpgx: c("warfarin"),
      rows: [
        { pheno: "2C9 NM", action: "Algorithm or usual 5 mg-ish start, INR-guided." },
        { pheno: "2C9 IM / PM", action: "Lower start; *3/*3 is a fraction of the usual milligrams." },
      ],
      pearl:
        "S-warfarin is a sensitive 2C9 substrate. A PM on this desk looks like fluconazole already on board. VKORC1 −1639G>A is the other half of the algorithm — not modeled here.",
    },
  ],
  phenytoin: [
    {
      gene: "CYP2C9",
      cpic: "A",
      guideline: g("guideline-for-phenytoin-and-cyp2c9-and-hla-b/"),
      clinpgx: c("phenytoin"),
      rows: [
        { pheno: "NM", action: "Usual labeled dosing with levels." },
        { pheno: "IM", action: "25% reduction." },
        { pheno: "PM", action: "50% reduction; nonlinear kinetics still apply." },
      ],
      pearl: "HLA-B*15:02 is a separate SJS story in ancestry with that allele — avoid like carbamazepine.",
    },
  ],
  celecoxib: [
    {
      gene: "CYP2C9",
      cpic: "A",
      guideline: NSAID,
      clinpgx: c("celecoxib"),
      rows: [
        { pheno: "NM / IM", action: "Lowest effective dose." },
        { pheno: "PM", action: "Start at 25–50%; watch GI, CV, renal." },
      ],
      pearl: "CPIC NSAID table. 2C9 PMs stack parent. The NSAID × ACEI × diuretic triple-whammy is still PD.",
    },
  ],
  ibuprofen: [
    {
      gene: "CYP2C9",
      cpic: "A",
      guideline: NSAID,
      clinpgx: c("ibuprofen"),
      rows: [
        { pheno: "PM", action: "Lowest dose, shortest course." },
        { pheno: "NM", action: "Usual OTC / labeled use." },
      ],
      pearl: "Quieter than celecoxib on the CPIC table, same gene. Not a free pass on CKD or lithium.",
    },
  ],
  meloxicam: [
    {
      gene: "CYP2C9",
      cpic: "A",
      guideline: NSAID,
      clinpgx: c("meloxicam"),
      rows: [
        { pheno: "PM", action: "25–50% of the usual dose or pick another NSAID." },
        { pheno: "NM", action: "Usual labeled dose." },
      ],
      pearl: "Longer 2C9 NSAID. Poor metabolizers stretch exposure.",
    },
  ],
  simvastatin: [
    {
      gene: "SLCO1B1",
      cpic: "A",
      guideline: STATIN,
      clinpgx: c("simvastatin"),
      rows: [
        { pheno: "normal function", action: "Usual dose; 80 mg is already a relic." },
        { pheno: "decreased / poor", action: "Avoid simvastatin 40–80 mg; pick another statin or a lower dose." },
      ],
      pearl:
        "OATP1B1 (SLCO1B1) is the myopathy gene. 3A4 inhibitors are a separate, stacked trap on this desk. We do not phenotype SLCO1B1 here — open CPIC for the *5 table.",
    },
  ],
  atorvastatin: [
    {
      gene: "SLCO1B1",
      cpic: "A",
      guideline: STATIN,
      clinpgx: c("atorvastatin"),
      rows: [
        { pheno: "decreased / poor", action: "Dose-cap or switch; 3A4 inhibitors still raise parent." },
      ],
      pearl: "Same transporter family as simvastatin, less dramatic. CYP3A4 is still the perpetrator map on this desk.",
    },
  ],
  rosuvastatin: [
    {
      gene: "SLCO1B1 / ABCG2",
      cpic: "A",
      guideline: STATIN,
      clinpgx: c("rosuvastatin"),
      rows: [
        { pheno: "decreased OATP / BCRP", action: "Consider a lower start, especially in East Asian ancestry." },
      ],
      pearl: "Not a 3A4 statin. Transporters and 2C9 are the quieter genes. Gemfibrozil is still a fibrate PD.",
    },
  ],
  azathioprine: [
    {
      gene: "TPMT / NUDT15",
      cpic: "A",
      guideline: THIO,
      clinpgx: c("azathioprine"),
      rows: [
        { pheno: "NM / NM", action: "Usual start; still watch WBC." },
        { pheno: "IM (either gene)", action: "Reduce start 30–80%; slower titration." },
        { pheno: "PM (either gene)", action: "Avoid, or a tiny non-malignant dose with weekly counts." },
      ],
      pearl:
        "TPMT and NUDT15 are the marrow genes. Allopurinol is a phenocopy — xanthine oxidase blockade of 6-MP, scored as PD on this desk. Genotype does not retire the XO pair.",
    },
  ],
  mercaptopurine: [
    {
      gene: "TPMT / NUDT15",
      cpic: "A",
      guideline: THIO,
      clinpgx: c("mercaptopurine"),
      rows: [
        { pheno: "IM", action: "Reduce start." },
        { pheno: "PM", action: "Avoid or drastic reduction with counts." },
      ],
      pearl: "Same thiopurine map as azathioprine. Febuxostat is the other XO blocker.",
    },
  ],
  allopurinol: [
    {
      gene: "HLA-B*58:01",
      cpic: "A",
      guideline: g("guideline-for-allopurinol-and-hla-b/"),
      clinpgx: c("allopurinol"),
      rows: [
        { pheno: "negative", action: "Usual gout / urate dosing." },
        { pheno: "positive", action: "Avoid — SJS/TEN. Pick febuxostat only after HLA thinking, or another class." },
      ],
      pearl:
        "Ancestry with higher *58:01 frequency (Han Chinese, Korean, Thai) is why this gene is on the label. The azathioprine marrow pair is a different enzyme (XO), not HLA.",
    },
  ],
  carbamazepine: [
    {
      gene: "HLA-B*15:02 / HLA-A*31:01",
      cpic: "A",
      guideline: g("guideline-for-carbamazepine-and-hla-b/"),
      clinpgx: c("carbamazepine"),
      rows: [
        { pheno: "*15:02 positive", action: "Avoid unless already tolerant >3 months. SJS/TEN." },
        { pheno: "*31:01 positive", action: "Avoid if other options; HSS / SJS risk." },
        { pheno: "both negative", action: "Usual titration; still a broad CYP inducer." },
      ],
      pearl:
        "The gene is a rash gene. The desk still scores carbamazepine as a strong 3A4/2C9/2C19 inducer — OCP failure, stolen methadone, lost ketamine.",
    },
  ],
  oxcarbazepine: [
    {
      gene: "HLA-B*15:02",
      cpic: "A",
      guideline: g("guideline-for-carbamazepine-and-hla-b/"),
      clinpgx: c("oxcarbazepine"),
      rows: [
        { pheno: "positive", action: "Avoid in a carbamazepine-naive patient." },
        { pheno: "negative", action: "Usual dose; hyponatremia and 3A4 induction still apply." },
      ],
      pearl: "Weaker inducer than carbamazepine, same HLA-B*15:02 caution.",
    },
  ],
  tacrolimus: [
    {
      gene: "CYP3A5",
      cpic: "A",
      guideline: g("guideline-for-tacrolimus-and-cyp3a5/"),
      clinpgx: c("tacrolimus"),
      rows: [
        { pheno: "non-expresser (*3/*3)", action: "Usual labeled start (most European ancestry)." },
        { pheno: "expresser (*1 carrier)", action: "Increase start ~1.5–2× with TDM — they clear it." },
      ],
      pearl:
        "Most European patients are 3A5 non-expressers. Expressers (more common in African ancestry) look like they were underdosed. Grapefruit and azoles are a separate gut-3A4 trap on the curve.",
    },
  ],
  efavirenz: [
    {
      gene: "CYP2B6",
      cpic: "A",
      guideline: g("cpic-guideline-for-efavirenz-based-on-cyp2b6-genotype/"),
      clinpgx: c("efavirenz"),
      rows: [
        { pheno: "NM / UM", action: "Usual 600 mg if still used." },
        { pheno: "PM", action: "Consider 400 mg; CNS toxicity and QT stack." },
      ],
      pearl:
        "2B6 PM plus efavirenz is a neurotoxicity row. The methadone story on this desk is induction — stolen dose, not sedation.",
    },
  ],
  methadone: [
    {
      gene: "CYP2B6",
      cpic: "B",
      guideline: g("cpic-guideline-for-efavirenz-based-on-cyp2b6-genotype/"),
      clinpgx: c("methadone"),
      rows: [
        { pheno: "PM", action: "Higher exposure, longer QTc watch. Not a CPIC A table." },
        { pheno: "NM", action: "Usual OTP titration." },
      ],
      pearl:
        "2B6 and 3A4 share methadone. Phenotype is quieter than a rifampin / fluconazole pair. QT is PD. This is not a dose.",
    },
  ],
  metoprolol: [
    {
      gene: "CYP2D6",
      cpic: "C",
      guideline: c("metoprolol"),
      clinpgx: c("metoprolol"),
      rows: [
        { pheno: "PM", action: "DPWG: start lower, watch bradycardia. Atenolol skips 2D6." },
        { pheno: "UM", action: "May need a higher dose or a different beta blocker." },
      ],
      pearl:
        "CPIC has not issued an A table. DPWG has. Paroxetine next to metoprolol is a phenocopy of PM — atenolol is the quiet contrast on this shelf.",
    },
  ],
};

export function pgxFor(id: string): PgxCard[] {
  return PGX[id] ?? [];
}

export function hasPgx(id: string) {
  return (PGX[id]?.length ?? 0) > 0;
}

export const PGX_IDS = Object.keys(PGX);
