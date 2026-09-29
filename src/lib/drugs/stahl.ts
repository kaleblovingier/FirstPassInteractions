/**
 * Receptor sketches in the Stahl method: spectrum first, occupancy second, side effects from the receptors.
 * Original teaching language. Not a quotation of Stahl's Essential Psychopharmacology.
 */

export interface Occupancy {
  r: string;
  n: 1 | 2 | 3 | 4;
}

export interface StahlCard {
  spectrum: string;
  occupancy: Occupancy[];
  pearl: string;
  sides: string;
}

function st(spectrum: string, occupancy: Occupancy[], pearl: string, sides: string): StahlCard {
  return { spectrum, occupancy, pearl, sides };
}

export const STAHL: Record<string, StahlCard> = {
  fluoxetine: st(
    "SSRI — SERT occupancy that outlives the visit",
    [
      { r: "SERT", n: 4 },
      { r: "5-HT2C", n: 2 },
    ],
    "SERT is the job. Parent plus norfluoxetine occupy the transporter for weeks — washout is a calendar, not a weekend. Strong CYP2D6 inhibitor: tamoxifen activation and codeine both go quiet. More activating than sedating.",
    "Early agitation, sexual side effects, 5-week MAOI washout. Not an H1 story.",
  ),
  sertraline: st(
    "SSRI — SERT, a little DAT, sigma",
    [
      { r: "SERT", n: 4 },
      { r: "DAT", n: 1 },
      { r: "σ1", n: 2 },
    ],
    "SERT first. Weak DAT at high exposure is why some people call it 'activating.' 2C19 and 2B6 clear it. GI start-up is classic; not a strong 2D6 bully like paroxetine.",
    "Nausea, diarrhea, sexual side effects. GI is the first two weeks, not a reason to abandon SERT.",
  ),
  paroxetine: st(
    "SSRI — SERT plus M1, NET, and a 2D6 lock",
    [
      { r: "SERT", n: 4 },
      { r: "NET", n: 2 },
      { r: "M1", n: 2 },
    ],
    "The least 'selective' SSRI on the occupancy map. Anticholinergic at clinical doses, short half-life, nasty discontinuation. Strong 2D6 inhibitor — a phenocopy of a poor metabolizer for everything else on the desk.",
    "Dry mouth, constipation, withdrawal zaps, sexual side effects, weight. Do not stop cold.",
  ),
  fluvoxamine: st(
    "SSRI — SERT plus σ1, and a 1A2 hammer",
    [
      { r: "SERT", n: 4 },
      { r: "σ1", n: 3 },
    ],
    "The OCD SSRI. The desk cares because it is a strong 1A2 and 2C19 inhibitor — clozapine, theophylline, tizanidine, and melatonin all move. σ1 is a research footnote, not a dosing lever.",
    "Sedation, GI, and perpetrator toxicity of the other drugs — not a free SSRI next to clozapine.",
  ),
  citalopram: st(
    "SSRI — clean SERT, known QT",
    [
      { r: "SERT", n: 4 },
    ],
    "The 'clean' racemate. 2C19 victim. FDA dose-cap exists because of QT, not because SERT needed more milligrams. Escitalopram is the S-enantiomer with less QT at labeled doses.",
    "QT at higher exposure, sexual side effects, hyponatremia in older adults.",
  ),
  escitalopram: st(
    "SSRI — S-citalopram, SERT without the R-ballast",
    [
      { r: "SERT", n: 4 },
    ],
    "S-enantiomer. Same 2C19 map as citalopram. CPIC trims poor metabolizers. QT is quieter than the racemate at labeled doses — still not a free QT drug next to methadone.",
    "Sexual side effects, hyponatremia. 2C19 PM: start lower.",
  ),
  venlafaxine: st(
    "SNRI — SERT first, NET later",
    [
      { r: "SERT", n: 4 },
      { r: "NET", n: 3 },
    ],
    "Low dose is mostly SERT; NET occupancy climbs with milligrams and with ODV. 2D6 makes ODV. Poor metabolizers stack parent; ultrarapid may look like a failed trial. Discontinuation is real.",
    "Sweat, blood pressure, withdrawal, sexual side effects. Check a sitting BP before calling it anxiety.",
  ),
  duloxetine: st(
    "SNRI — SERT and NET together, plus 1A2",
    [
      { r: "SERT", n: 4 },
      { r: "NET", n: 4 },
    ],
    "Balanced SERT/NET at labeled doses. 1A2 plus 2D6 clearance — fluvoxamine and ciprofloxacin raise it. Pain labeling does not retire the serotonergic PD with MAOIs.",
    "Nausea, sweat, urinary hesitation, hepatotoxicity warning. Not for heavy drinkers.",
  ),
  bupropion: st(
    "NDRI — DAT / NET, no SERT",
    [
      { r: "DAT", n: 3 },
      { r: "NET", n: 3 },
    ],
    "The anti-SSRI occupancy. No SERT, no sexual story from serotonin, seizure threshold falls with dose and with IR dumps. Strong 2D6 inhibitor — tamoxifen and codeine still go quiet. 2B6 to hydroxybupropion.",
    "Insomnia, jitter, seizure risk. Not a serotonergic; MAOI is still a pressor row.",
  ),
  mirtazapine: st(
    "NaSSA — α2 off, H1 on, 5-HT2 off",
    [
      { r: "H1", n: 4 },
      { r: "α2", n: 3 },
      { r: "5-HT2A", n: 3 },
      { r: "5-HT2C", n: 3 },
      { r: "5-HT3", n: 2 },
    ],
    "H1 is why it puts people down and why weight climbs. α2 antagonism disinhibits NE and 5-HT; 5-HT2A/2C blockade is why it is not an SSRI-sexual story. Not a 2D6 bully.",
    "Sedation, appetite, weight. Falls in older adults. Rare agranulocytosis.",
  ),
  trazodone: st(
    "SARI — 5-HT2A and H1 at sleep doses; SERT only high",
    [
      { r: "5-HT2A", n: 4 },
      { r: "H1", n: 3 },
      { r: "α1", n: 3 },
      { r: "SERT", n: 2 },
    ],
    "Hypnotic milligrams occupy 5-HT2A, H1, α1 — not SERT. Antidepressant milligrams start to occupy SERT and nobody stays awake for them. α1 is the priapism / orthostasis receptor.",
    "Morning hangover, orthostasis, rare priapism. Not a free benzo-alternative on a QT opioid.",
  ),
  amitriptyline: st(
    "Tertiary TCA — SERT, NET, and the whole off-target piano",
    [
      { r: "SERT", n: 4 },
      { r: "NET", n: 3 },
      { r: "H1", n: 4 },
      { r: "M1", n: 4 },
      { r: "α1", n: 3 },
    ],
    "The original dirty drug, in the useful sense. H1 sedation, M1 anticholinergic, α1 orthostasis, quinidine-like Nav at overdose. 2D6 and 2C19 to nortriptyline. Narrow-ish index.",
    "Dry mouth, constipation, falls, QT, lethal in overdose. CPIC trims PMs.",
  ),
  nortriptyline: st(
    "Secondary TCA — NET > SERT, cleaner than parent",
    [
      { r: "NET", n: 4 },
      { r: "SERT", n: 2 },
      { r: "H1", n: 2 },
      { r: "M1", n: 2 },
      { r: "α1", n: 2 },
    ],
    "Amitriptyline's metabolite, less H1/M1. Sensitive 2D6 substrate. Therapeutic drug monitoring is the old way to do what CPIC now says in a table.",
    "Dry mouth, constipation, still lethal in overdose. Better tolerated than parent, not clean.",
  ),
  clomipramine: st(
    "TCA — SERT first (the OCD TCA)",
    [
      { r: "SERT", n: 4 },
      { r: "NET", n: 3 },
      { r: "H1", n: 3 },
      { r: "M1", n: 3 },
      { r: "α1", n: 2 },
    ],
    "Most serotonergic TCA — that is why OCD trials used it. Same off-target piano as amitriptyline. 2D6/2C19. MAOI is contraindicated.",
    "Anticholinergic load, seizure at high level, sexual side effects from SERT.",
  ),
  desipramine: st(
    "Secondary TCA — NET, sensitive 2D6",
    [
      { r: "NET", n: 4 },
      { r: "SERT", n: 1 },
    ],
    "The NET TCA. Sensitive 2D6 — paroxetine/fluoxetine/bupropion spike parent. Narrow-ish index.",
    "Jitter, tachycardia, overdose lethality. Little H1 compared with amitriptyline.",
  ),
  imipramine: st(
    "Tertiary TCA — SERT/NET plus off-targets",
    [
      { r: "SERT", n: 4 },
      { r: "NET", n: 3 },
      { r: "H1", n: 3 },
      { r: "M1", n: 3 },
      { r: "α1", n: 3 },
    ],
    "Parent of desipramine. 2C19 activation plus 2D6 clearance. Same TCA piano, same CPIC table.",
    "Orthostasis, anticholinergic, overdose.",
  ),
  phenelzine: st(
    "Irreversible MAOI — MAO-A and MAO-B for two weeks after the last tablet",
    [
      { r: "MAO-A", n: 4 },
      { r: "MAO-B", n: 4 },
    ],
    "Occupancy is the enzyme, not a transporter. New enzyme has to be synthesized — that is the 14-day washout. Tyramine and any serotonergic on this desk are contraindicated, not a 'monitor.'",
    "Hypertensive crisis with tyramine/stimulants; serotonin syndrome with SSRIs, MDMA, meperidine, linezolid.",
  ),
  tranylcypromine: st(
    "Irreversible MAOI — amphetamine-adjacent structure, same enzyme rule",
    [
      { r: "MAO-A", n: 4 },
      { r: "MAO-B", n: 4 },
    ],
    "Same irreversible occupancy as phenelzine. Structure looks a bit like an amphetamine — stimulating, not sedating. Washout is still two weeks. Tyramine still applies.",
    "Insomnia, pressor crisis, serotonin syndrome. Not a 'cleaner MAOI.'",
  ),
  selegiline: st(
    "MAO-B at labeled transdermal/low oral; MAO-A as the dose climbs",
    [
      { r: "MAO-B", n: 4 },
      { r: "MAO-A", n: 2 },
    ],
    "Selective MAO-B at Parkinson's doses; the patch at antidepressant doses starts to occupy MAO-A. Selectivity is not a free pass with MDMA or another serotonergic. 1A2 substrate — ciprofloxacin raises it.",
    "Pressor and serotonin rows still fire on this desk. Dietary tyramine is dose-dependent.",
  ),
  moclobemide: st(
    "RIMA — reversible MAO-A",
    [
      { r: "MAO-A", n: 4 },
    ],
    "Reversible occupancy. Tyramine can compete it off the enzyme — that is the point of a RIMA. Still not a green light for MDMA or an SSRI. Not US-labeled.",
    "Serotonin syndrome with other serotonergics still applies. Less dietary theater than phenelzine, not zero.",
  ),
  lithium: st(
    "Ion — second messenger, not a receptor cartoon",
    [],
    "No SERT, no D2. GSK-3 and inositol cycling. The desk maps the renal traps: ACEI, ARB, thiazide, NSAID, low salt, dehydration. Toxicity is a level and a tremor, not a CYP.",
    "Tremor, polyuria, hypothyroidism, Ebstein in pregnancy. NSAIDs and thiazides raise the level.",
  ),
  valproate: st(
    "Mood stabilizer / anticonvulsant — GABA, Nav, HDAC",
    [
      { r: "Nav", n: 3 },
      { r: "GABA-T", n: 3 },
    ],
    "Not a CYP perpetrator in the strong-inducer sense — it is a UGT and 2C9 story, and it dumps lamotrigine. Weight, tremor, PCOS, teratogenicity. Ammonia can rise.",
    "Teratogen, hepatotoxicity, pancreatitis, tremor, hair. Check a pregnancy plan before a mood plan.",
  ),
  lamotrigine: st(
    "Mood stabilizer — Nav / glutamate release, rash gene",
    [
      { r: "Nav", n: 3 },
    ],
    "Slow titration is the Stevens–Johnson protocol, not a CYP protocol. Valproate doubles it; estrogen OCPs dump it. Lithium-level thinking does not apply.",
    "Rash / SJS, insomnia. Estrogen is an inducer of its UGT — the pill can steal the dose.",
  ),
  carbamazepine: st(
    "Mood stabilizer — Nav plus broad CYP induction",
    [
      { r: "Nav", n: 4 },
    ],
    "HLA-B*15:02 is the rash gene. The desk scores the induction: OCPs fail, methadone looks stolen, oral ketamine fades. Autoinduction over the first weeks.",
    "SJS, hyponatremia, agranulocytosis, stolen victim-drug levels.",
  ),
  quetiapine: st(
    "Atypical — H1 at 50 mg, D2 only as the milligrams climb",
    [
      { r: "H1", n: 4 },
      { r: "α1", n: 3 },
      { r: "5-HT2A", n: 3 },
      { r: "D2", n: 2 },
      { r: "M1", n: 2 },
    ],
    "Sleep doses occupy H1, not D2 — that is why 50 mg is a hypnotic and 300–800 mg is an antipsychotic. 3A4 victim. QT-possible next to methadone. Metabolic at antipsychotic doses.",
    "Sedation, orthostasis, weight at antipsychotic exposure. 'Seroquel for sleep' is H1, not D2.",
  ),
  olanzapine: st(
    "Atypical — 5-HT2A/D2 plus H1 and M1 (the metabolic signature)",
    [
      { r: "5-HT2A", n: 4 },
      { r: "D2", n: 3 },
      { r: "H1", n: 4 },
      { r: "5-HT2C", n: 4 },
      { r: "M1", n: 3 },
    ],
    "H1 plus 5-HT2C is the weight signature. 1A2 substrate — smoke dumps it, fluvoxamine raises it. Not a 3A4 first-pass trap like quetiapine.",
    "Weight, lipids, glucose, sedation. Smoking status belongs on the desk.",
  ),
  risperidone: st(
    "Atypical — D2 and 5-HT2A, prolactin, EPS at the top of the range",
    [
      { r: "D2", n: 4 },
      { r: "5-HT2A", n: 4 },
      { r: "α1", n: 3 },
    ],
    "Tighter D2 than quetiapine — prolactin and EPS show up. 2D6 to paliperidone (renal). QT-possible. Less H1 than olanzapine, so less 'sleep in a pill.'",
    "Prolactin, EPS, orthostasis. Paliperidone skips 2D6.",
  ),
  aripiprazole: st(
    "Partial D2 / 5-HT1A — occupancy without full blockade",
    [
      { r: "D2", n: 4 },
      { r: "5-HT1A", n: 3 },
      { r: "5-HT2A", n: 3 },
    ],
    "Partial agonist: it sits on D2 and will not get off for a full antagonist. Akathisia is the signature, not sedation. 2D6 and 3A4; PM dose is on the label. Very long t½.",
    "Akathisia, insomnia, impulse-control (gambling) rare. Not an H1 hypnotic.",
  ),
  clozapine: st(
    "Atypical — D4 / 5-HT2A, low D2, high H1/M1/α1 — the agranulocytosis drug",
    [
      { r: "D4", n: 3 },
      { r: "5-HT2A", n: 4 },
      { r: "H1", n: 4 },
      { r: "M1", n: 4 },
      { r: "α1", n: 4 },
      { r: "D2", n: 2 },
    ],
    "Low D2 occupancy is why EPS is rare and why it works when others fail. 1A2 — smoke dumps it, fluvoxamine can multiply it. ANC monitoring is the non-negotiable. Seizure threshold falls with level.",
    "Agranulocytosis, myocarditis, constipation to obstruction, sialorrhea, metabolic, seizure. Smoking status is a dose.",
  ),
  haloperidol: st(
    "Typical — D2, EPS, QT",
    [
      { r: "D2", n: 4 },
    ],
    "The D2 stick. Little H1, little M1 — so it does not sedate like chlorpromazine, and it causes EPS and NMS. 2D6/3A4. QT-possible, worse IV.",
    "EPS, NMS, QT, tardive. Not a sleep drug.",
  ),
  ziprasidone: st(
    "Atypical — D2/5-HT2A, QT, take with food",
    [
      { r: "D2", n: 4 },
      { r: "5-HT2A", n: 4 },
      { r: "5-HT1A", n: 3 },
    ],
    "Known-QT atypical. Absorption needs a meal. Less metabolic than olanzapine. Still a D2 drug.",
    "QT, akathisia, take with 500 kcal. ECG next to other QT drugs.",
  ),
  lurasidone: st(
    "Atypical — D2/5-HT2A/5-HT7, 3A4 sensitive, take with food",
    [
      { r: "D2", n: 4 },
      { r: "5-HT2A", n: 4 },
      { r: "5-HT7", n: 3 },
      { r: "5-HT1A", n: 3 },
    ],
    "Sensitive 3A4 substrate — grapefruit, azoles, ritonavir are labeled problems. Food for absorption. Little H1, so little metabolic compared with olanzapine.",
    "Akathisia, nausea. 3A4 inhibitors are not a seasoning footnote.",
  ),
  paliperidone: st(
    "9-OH-risperidone — D2/5-HT2A, mostly renal",
    [
      { r: "D2", n: 4 },
      { r: "5-HT2A", n: 4 },
      { r: "α1", n: 3 },
    ],
    "The metabolite. Skips 2D6. QT and prolactin still apply. Invega Sustenna is a long occupancy, not a CYP trick.",
    "Prolactin, EPS, QT. Renal dose, not 2D6 dose.",
  ),
  chlorpromazine: st(
    "Low-potency typical — D2 plus H1/M1/α1",
    [
      { r: "D2", n: 3 },
      { r: "H1", n: 4 },
      { r: "M1", n: 4 },
      { r: "α1", n: 4 },
    ],
    "Sedating typical. The off-target piano is why it looks like a TCA of psychosis. QT-possible, seizure-lowering, stacked anticholinergic.",
    "Sedation, orthostasis, anticholinergic, photosensitivity, QT.",
  ),
  pimozide: st(
    "Typical — sensitive 3A4, boxed QT",
    [
      { r: "D2", n: 4 },
    ],
    "Tourette drug. Strong 3A4 inhibitors are labeled contraindicated. Known QT. Not a first-line antipsychotic on this desk.",
    "TdP with azoles/macrolides/ritonavir. EPS.",
  ),
  thioridazine: st(
    "Typical — boxed QT, 2D6, withdrawn in many markets",
    [
      { r: "D2", n: 3 },
      { r: "H1", n: 3 },
      { r: "M1", n: 4 },
    ],
    "The cautionary typical. 2D6 PMs and strong 2D6 inhibitors are labeled problems. Known QT.",
    "TdP, retinitis pigmentosa at chronic high dose. Historical more than a start.",
  ),
  alprazolam: st(
    "Benzodiazepine — GABA-A BZ site, short, 3A4",
    [
      { r: "GABA-A", n: 4 },
    ],
    "Positive allosteric modulator at the BZ site. Short occupancy, interdose anxiety, 3A4 victim (grapefruit, azoles, ritonavir). Opioid boxed airway. Not an antidepressant receptor.",
    "Rebound, withdrawal seizures, apnea with opioids/alcohol/GHB.",
  ),
  diazepam: st(
    "Benzodiazepine — long parent, longer nordiazepam, 2C19/3A4",
    [
      { r: "GABA-A", n: 4 },
    ],
    "The long GABA occupancy. 2C19 PMs stretch both parent and nordiazepam. LOT benzos skip this CYP. Same airway PD as any benzo.",
    "Accumulation in older adults, falls, airway with opioids.",
  ),
  clonazepam: st(
    "Benzodiazepine — long, 3A4",
    [
      { r: "GABA-A", n: 4 },
    ],
    "Longer than alprazolam, still a 3A4 benzo. Panic and seizure labeling. Opioid airway still applies.",
    "Sedation, dependence, withdrawal seizures.",
  ),
  lorazepam: st(
    "Benzodiazepine — UGT, the switch when 3A4 is blocked",
    [
      { r: "GABA-A", n: 4 },
    ],
    "LOT: lorazepam, oxazepam, temazepam. Glucuronidation, not 3A4/2C19. PD stacking with opioids and alcohol is unchanged. Not a 'safe benzo' — a cleaner CYP map.",
    "Sedation, airway, withdrawal. Cleaner CYP, same GABA.",
  ),
  oxazepam: st(
    "Benzodiazepine — UGT only",
    [
      { r: "GABA-A", n: 4 },
    ],
    "The other LOT. Same teaching as lorazepam. Prefer when 3A4 is occupied by ritonavir or an azole — PD still sedates.",
    "Same GABA airway. Not a CYP victim.",
  ),
  temazepam: st(
    "Benzodiazepine — mostly UGT, hypnotic labeling",
    [
      { r: "GABA-A", n: 4 },
    ],
    "Sleep benzo, UGT. Still an opioid airway. Not midazolam's 3A4 trap.",
    "Hangover, dependence, airway.",
  ),
  midazolam: st(
    "Benzodiazepine — sensitive 3A4, first-pass if swallowed",
    [
      { r: "GABA-A", n: 4 },
    ],
    "The procedure benzo. Oral/gut 3A4 is a first-pass victim like oral ketamine. IV skips the gut. Grapefruit and azoles stretch it.",
    "Apnea, especially with opioids. Overlay the curve oral vs IV.",
  ),
  triazolam: st(
    "Benzodiazepine — sensitive 3A4, short hypnotic",
    [
      { r: "GABA-A", n: 4 },
    ],
    "Halcion. Labeled with strong 3A4 inhibitors. Short occupancy, amnesia reports. Same GABA family.",
    "Anterograde amnesia, 3A4 traps, airway.",
  ),
  zolpidem: st(
    "Z-hypnotic — GABA-A α1 preferring",
    [
      { r: "GABA-A α1", n: 4 },
    ],
    "Not a benzo ring, same superfamily. α1-preferring — hypnotic more than anxiolytic. 3A4. Complex sleep behaviors. Still CNS with opioids.",
    "Sleep-driving, next-day impairment, women clear it slower. Not anxiolytic occupancy.",
  ),
  eszopiclone: st(
    "Z-hypnotic — GABA-A, 3A4",
    [
      { r: "GABA-A", n: 4 },
    ],
    "Same superfamily as zolpidem, longer. 3A4 victim. Metallic taste. Opioid airway still applies.",
    "Dysgeusia, next-day impairment, dependence.",
  ),
  buspirone: st(
    "Azapirone — 5-HT1A partial, sensitive 3A4, not GABA",
    [
      { r: "5-HT1A", n: 4 },
    ],
    "No BZ occupancy — no alcohol airway from GABA, no withdrawal seizures. Sensitive intestinal 3A4: grapefruit and azoles multiply oral exposure (the curve on this desk). Delayed onset.",
    "Dizziness, not sedation. Grapefruit is the PK trap, not a food footnote.",
  ),
  hydroxyzine: st(
    "Sedating antihistamine — H1, not a benzo",
    [
      { r: "H1", n: 4 },
      { r: "M", n: 2 },
    ],
    "The OTP 'not a benzo' for anxiety. Occupies H1, prolongs QT, anticholinergic. Next to methadone that is TdP and airway, not a free extra. 3A4 substrate.",
    "Sedation, QT, dry mouth. Vistaril is not lorazepam and not nothing.",
  ),
  diphenhydramine: st(
    "First-generation antihistamine — H1 and M",
    [
      { r: "H1", n: 4 },
      { r: "M", n: 3 },
    ],
    "OTC sleep is H1 plus antimuscarinic. Delirium in older adults. Weak 2D6 inhibition. Stacks with other anticholinergics and with opioids on the airway.",
    "Dry mouth, urinary retention, delirium, next-day hangover.",
  ),
  ketamine: st(
    "NMDA open-channel blocker — dissociation, then a glutamate bounce",
    [
      { r: "NMDA", n: 4 },
      { r: "AMPA", n: 2 },
    ],
    "Occupies NMDA; AMPA throughput rises downstream — that is the plasticity story, not a SSRI occupancy. Oral 3A4/2B6 first-pass is the trap; IV mostly skips the gut. Benzos blunt the antidepressant signal and stack the airway.",
    "Dissociation, BP swing, bladder with chronic use, airway with GABA drugs. Route is the PK.",
  ),
  esketamine: st(
    "S-ketamine — same NMDA pore, intranasal first-pass is quieter than a lozenge",
    [
      { r: "NMDA", n: 4 },
    ],
    "S-enantiomer. Spravato still sees hepatic 2B6/3A4. Same benzo-airway and blunting map as racemic ketamine. REMS is a clinic protocol, not this desk.",
    "Dissociation, BP, sedation. Watch 2B6 inducers (rifampin, efavirenz).",
  ),
  dextromethorphan: st(
    "NMDA + SERT/NET (via dextrorphan and parent) — 2D6 is the fork",
    [
      { r: "NMDA", n: 3 },
      { r: "SERT", n: 3 },
      { r: "σ1", n: 3 },
    ],
    "2D6 to dextrorphan (more NMDA). Poor metabolizers and paroxetine/fluoxetine stack parent (more SERT, more serotonin syndrome with MAOIs). Auvelity is bupropion occupying 2D6 on purpose.",
    "Serotonin syndrome with MAOIs, dissociation at high parent, airway with GABA.",
  ),
  memantine: st(
    "Low-affinity NMDA — Alzheimer's labeling, not a K-hole",
    [
      { r: "NMDA", n: 3 },
    ],
    "Uncompetitive NMDA at therapeutic occupancy — not ketamine. Renal clearance, not CYP. Still an NMDA on the stack if someone mixes it with DXM or ketamine.",
    "Dizziness, confusion. Not a recreational map.",
  ),
  mdma: st(
    "Entactogen — VMAT2 / SERT reverse-transport, 2D6 victim",
    [
      { r: "SERT", n: 4 },
      { r: "NET", n: 3 },
      { r: "DAT", n: 2 },
      { r: "VMAT2", n: 4 },
    ],
    "Not an SSRI. It dumps serotonin (and some DA/NE) via reverse transport. 2D6 plus auto-inhibition. MAOI is a hyperthermia/serotonin-syndrome contraindication, not a 'watch.' SSRIs blunt the dump by occupying SERT first.",
    "Hyperthermia, hyponatremia, jaw, serotonin syndrome, mid-week crash. Not a dosing protocol.",
  ),
  amphetamine: st(
    "Stimulant — VMAT2 / DAT / NET reverse-transport",
    [
      { r: "DAT", n: 4 },
      { r: "NET", n: 4 },
      { r: "VMAT2", n: 4 },
    ],
    "Releaser, not just a blocker. MAOI is a pressor contraindication. Urinary pH moves excretion on this desk. 2D6 is a minor clearance — the PD is the point.",
    "Tachycardia, insomnia, appetite, pressor crisis with MAOIs.",
  ),
  lisdexamfetamine: st(
    "Prodrug stimulant — lysine-amphetamine, same DAT/NET once cleaved",
    [
      { r: "DAT", n: 4 },
      { r: "NET", n: 4 },
    ],
    "Red blood cell hydrolysis, not CYP activation. Same occupancy as dextroamphetamine after cleavage. MAOI still contraindicated.",
    "Same stimulant PD, slower dump than IR amphetamine.",
  ),
  methylphenidate: st(
    "Stimulant — DAT/NET blocker, not a releaser",
    [
      { r: "DAT", n: 4 },
      { r: "NET", n: 3 },
    ],
    "Cocaine-like occupancy (block, not reverse-transport). CES1, not 2D6. MAOI is still a pressor row. Less of a 5-HT story than MDMA.",
    "Insomnia, appetite, tics, pressor with MAOIs.",
  ),
  methamphetamine: st(
    "Stimulant — stronger DAT/NET/VMAT2 releaser",
    [
      { r: "DAT", n: 4 },
      { r: "NET", n: 4 },
      { r: "VMAT2", n: 4 },
    ],
    "Same family as amphetamine, more CNS. 2D6 minor. MAOI contraindicated. Street supply is not Desoxyn.",
    "Hyperthermia, pressor, psychosis, cardio.",
  ),
  cocaine: st(
    "Blocker — DAT/NET/SERT plus Nav (the local anesthetic)",
    [
      { r: "DAT", n: 4 },
      { r: "NET", n: 3 },
      { r: "SERT", n: 2 },
      { r: "Nav", n: 3 },
    ],
    "Not a releaser. Nav is why it is a local anesthetic and why wide-complex is a thing. Ethanol makes cocaethylene (PD on this desk). Speedball: stimulant masks the opioid apnea.",
    "MI, arrhythmia, hyperthermia, crack lung. Not a CYP first.",
  ),
  atomoxetine: st(
    "NRI — NET, 2D6 sensitive",
    [
      { r: "NET", n: 4 },
    ],
    "Not a stimulant releaser. CPIC trims 2D6 PMs. Suicide-risk warning in youth. MAOI contraindicated.",
    "GI, BP/HR, sexual, rare liver. PM: slower peak, more parent.",
  ),
  modafinil: st(
    "Wake-promoter — weak DAT, 3A4 induction",
    [
      { r: "DAT", n: 2 },
    ],
    "Not amphetamine occupancy. Moderate 3A4 induction — OCPs can fail. 2C19 mild inhibition. SJS rare.",
    "Headache, insomnia, OCP counseling. Not a DAT hammer.",
  ),
  psilocybin: st(
    "Tryptamine psychedelic — 5-HT2A (via psilocin)",
    [
      { r: "5-HT2A", n: 4 },
      { r: "5-HT1A", n: 2 },
    ],
    "Prodrug to psilocin. 5-HT2A is the occupancy that correlates with the experience. Not a CYP substrate. Lithium and MAOIs still apply (seizure / serotonin). Set and setting are not this desk.",
    "Acute anxiety, rare HPPD, lithium-seizure signal. Not a SERT reuptake story.",
  ),
  lsd: st(
    "Ergoline psychedelic — 5-HT2A partial",
    [
      { r: "5-HT2A", n: 4 },
      { r: "5-HT1A", n: 3 },
      { r: "D2", n: 1 },
    ],
    "Long 5-HT2A occupancy. Not a CYP victim. Lithium still a seizure/bad-trip signal. NBOMe sold as LSD is a different, vasoconstrictive map on this desk.",
    "Acute anxiety, vasoconstriction mild vs NBOMe. Duration is hours.",
  ),
  dmt: st(
    "Tryptamine — 5-HT2A, MAO-A first-pass if swallowed",
    [
      { r: "5-HT2A", n: 4 },
    ],
    "Gut MAO-A destroys oral DMT — that is why ayahuasca is a harmala + DMT pair. Harmaline on this desk is the MAOI. Not a CYP story.",
    "Brief intense experience (smoked); oral only with an MAOI — then the serotonin rules apply.",
  ),
  "five-meo-dmt": st(
    "Tryptamine — 5-HT1A > 5-HT2A",
    [
      { r: "5-HT1A", n: 4 },
      { r: "5-HT2A", n: 2 },
    ],
    "More 5-HT1A than classic 2A psychedelics. MAOI (toad + harmala, or pharma) is a reported danger zone. Not a CYP substrate.",
    "Intense, short. MAOI stacking is not a ceremony footnote.",
  ),
  dronabinol: st(
    "THC — CB1/CB2 partial, 2C9 then 3A4",
    [
      { r: "CB1", n: 4 },
      { r: "CB2", n: 3 },
    ],
    "Edible first-pass to 11-OH-THC is the 2C9/3A4 trap; smoked mostly skips it. 2C9 PMs get more exposure from edibles. Fat meals raise oral AUC.",
    "Anxiety, tachycardia, delayed edible peak. Route is the PK.",
  ),
  cannabidiol: st(
    "CBD — low CB1, 2C19/3A4 perpetrator and victim",
    [
      { r: "CB1", n: 1 },
      { r: "5-HT1A", n: 2 },
    ],
    "Not a THC occupancy. 2C19 and 3A4 inhibition can move clobazam (N-desmethyl stacks) and other victims. Epidiolex is the labeled one.",
    "Somnolence, transaminitis, clobazam levels. Not 'non-psychoactive' next to a 2C19 substrate.",
  ),
  ethanol: st(
    "Alcohol — GABA-A up, NMDA down, 2E1 when chronic",
    [
      { r: "GABA-A", n: 4 },
      { r: "NMDA", n: 3 },
    ],
    "Acute: GABA occupancy and NMDA block — airway with opioids, benzos, GHB, xylazine. Chronic: 2E1 induction, NAPQI from acetaminophen. Cocaethylene with cocaine is PD on this desk.",
    "Withdrawal seizures, Wernicke, airway. Not a CYP substrate in the usual sense — a perpetrator and a PD.",
  ),
  "sodium-oxybate": st(
    "GHB — GABA-B, steep dose-response",
    [
      { r: "GABA-B", n: 4 },
    ],
    "The same receptor family as baclofen, much steeper. Alcohol and benzos and opioids are apnea. REMS for narcolepsy is a clinic protocol. GBL/1,4-BD are prodrugs on this desk.",
    "Coma, vomit, amnesia, airway. Not a drink.",
  ),
  baclofen: st(
    "GABA-B agonist — muscle, not a GHB analog in milligrams",
    [
      { r: "GABA-B", n: 4 },
    ],
    "Same receptor, clinical doses. Withdrawal can seize. Renal clearance. Still CNS with other depressants.",
    "Sedation, withdrawal seizures on abrupt stop. Not a party GHB.",
  ),
  gabapentin: st(
    "Gabapentinoid — α2δ, not GABA-A",
    [
      { r: "α2δ", n: 4 },
    ],
    "Does not occupy the BZ site. Still an airway extra on an opioid — the MAT board treats it as such. Renal clearance, not CYP. Not a free 'nerve pain' on methadone.",
    "Sedation, edema, respiratory depression with opioids. Renal dose.",
  ),
  pregabalin: st(
    "Gabapentinoid — α2δ, cleaner absorption than gabapentin",
    [
      { r: "α2δ", n: 4 },
    ],
    "Same family, more bioavailable. Same opioid airway. Renal, not CYP.",
    "Sedation, euphoria reports, airway with opioids.",
  ),
  buprenorphine: st(
    "Partial μ — high affinity, ceiling, 3A4",
    [
      { r: "μ", n: 4 },
      { r: "κ", n: 3 },
    ],
    "Occupies μ so a full agonist cannot. That is precipitated withdrawal, not stacked milligrams — the MAT finding on this desk. 3A4 victim. Naloxone in the film is a diversion deterrent, not the occupancy.",
    "Precipitated withdrawal on a fentanyl load, QT quieter than methadone, 3A4 inducers look like a failing film.",
  ),
  naltrexone: st(
    "μ antagonist — occupancy is the product",
    [
      { r: "μ", n: 4 },
      { r: "κ", n: 3 },
    ],
    "The shot occupies μ for weeks. Leftover fentanyl is precipitated withdrawal and blocked analgesia, not a failed injection. Oral is shorter occupancy. Not a CYP story.",
    "Precipitated withdrawal if agonist remains. Hepatotoxicity at high dose. Blocked analgesia in a trauma bay.",
  ),
  naloxone: st(
    "μ antagonist — short occupancy, not α2",
    [
      { r: "μ", n: 4 },
    ],
    "Reverses μ. Will not reverse xylazine, lofexidine, clonidine, or a benzo. Repeat dosing because fentanyl outlasts it. Not a CYP victim.",
    "Precipitated withdrawal. α2 and GABA apnea keep going.",
  ),
  methadone: st(
    "Full μ — long occupancy, 3A4/2B6, known QT",
    [
      { r: "μ", n: 4 },
      { r: "NMDA", n: 2 },
    ],
    "Long μ plus some NMDA. Inducers look like a stolen dose; azoles look like a nod plus TdP. Vistaril and Zofran are QT extras, not free. Partial agonist on top is precipitated withdrawal.",
    "TdP, delayed overdose (peak is late), airway with benzos/gabapentinoids.",
  ),
  morphine: st(
    "Full μ — UGT to M3G/M6G, not CYP",
    [
      { r: "μ", n: 4 },
    ],
    "Glucuronides, not 2D6. Codeine is the 2D6 prodrug into this occupancy. PD with benzos and alcohol is the airway. Renal M6G in impairment.",
    "Respiratory depression, histamine flush, renal metabolite in CKD.",
  ),
  oxycodone: st(
    "Full μ — 3A4 clearance, 2D6 to oxymorphone",
    [
      { r: "μ", n: 4 },
    ],
    "3A4 is the main clearance (noroxycodone). 2D6 makes oxymorphone. Percocet is this plus APAP — chronic alcohol is NAPQI. Pressed M30 is not this row.",
    "Airway, 3A4 inhibitors raise parent. APAP hepatotoxicity in the combo.",
  ),
  fentanyl: st(
    "Full μ — sensitive 3A4, high affinity, short IV / long patch",
    [
      { r: "μ", n: 4 },
    ],
    "3A4 victim. Buprenorphine on a fentanyl load is occupancy conflict. Street fentanyl ± xylazine is the α2 extra naloxone will not reverse.",
    "Apnea, chest wall, delayed patch absorption. Naloxone may need repeats.",
  ),
  tramadol: st(
    "μ (via M1) plus SNRI parent — 2D6 fork",
    [
      { r: "μ", n: 3 },
      { r: "SERT", n: 3 },
      { r: "NET", n: 3 },
    ],
    "Parent is SNRI; 2D6 makes O-desmethyltramadol (μ). PMs lose opioid, keep seizure/serotonin. MAOI contraindicated. Not a 'weak Vicodin.'",
    "Seizure, serotonin syndrome, airway. CPIC: avoid in UM and PM.",
  ),
  tapentadol: st(
    "μ plus NET — UGT, not 2D6",
    [
      { r: "μ", n: 4 },
      { r: "NET", n: 3 },
    ],
    "The 'tramadol without 2D6.' Parent is the opioid and the NRI. MAOI and serotonergics still stack. UGT2B7.",
    "Airway, seizure, serotonin. Not a CYP activation story.",
  ),
  kratom: st(
    "Mitragynine — mixed μ / adrenergic; 7-OH is the hot μ",
    [
      { r: "μ", n: 3 },
      { r: "α", n: 2 },
    ],
    "Tea vs tablet. 7-OH (separate row) is a hot μ-agonist. 3A4. Next to buprenorphine the 7-OH tablet is occupancy conflict. Not a vitamin.",
    "Dependence, airway with benzos, 3A4 inhibitors raise exposure.",
  ),
  "seven-oh": st(
    "7-Hydroxymitragynine — hot μ, not a leaf",
    [
      { r: "μ", n: 4 },
    ],
    "Much more potent than mitragynine. Street 7-OH is an opioid map. 3A4. Buprenorphine is precipitated withdrawal / blocked high, not stacked milligrams.",
    "Respiratory depression, benzo airway, occupancy conflict with Suboxone.",
  ),
  tianeptine: st(
    "μ agonist at high dose — not an SSRI despite the old story",
    [
      { r: "μ", n: 4 },
    ],
    "Labeled as an atypical antidepressant in some countries. The gas-station milligrams are μ. Airway and dependence. Not a SERT occupancy.",
    "Withdrawal, apnea, not a 'supplement.'",
  ),
  xylazine: st(
    "Veterinary α2 — naloxone will not reverse it",
    [
      { r: "α2", n: 4 },
    ],
    "Same family as clonidine, lofexidine, dexmedetomidine. μ reversal leaves the α2 apnea and bradycardia. Skin wounds are a separate tox. Not a CYP substrate.",
    "Bradycardia, hypotension, unresponsiveness naloxone does not fix. Pair the opioid separately.",
  ),
  clonidine: st(
    "α2 agonist — rebound hypertension, stacked airway",
    [
      { r: "α2", n: 4 },
    ],
    "Clinical cousin of xylazine at different milligrams. Naloxone will not reverse it. Abrupt stop is a pressor. Still used for opioid withdrawal when lofexidine is not on the shelf.",
    "Sedation, dry mouth, rebound HTN, airway with opioids.",
  ),
  lofexidine: st(
    "α2 — Lucemyra, 2D6 victim",
    [
      { r: "α2", n: 4 },
    ],
    "FDA-labeled for opioid withdrawal. Same naloxone-will-not-reverse family. Paroxetine/fluoxetine raise bradycardia via 2D6.",
    "Bradycardia, hypotension, QTc. 2D6 PMs and inhibitors.",
  ),
  prazosin: st(
    "α1 blocker — PTSD nightmares, first-dose syncope",
    [
      { r: "α1", n: 4 },
    ],
    "Occupies α1, not NMDA, not SERT. Alcohol and PDE5 stack the orthostasis. Not a CYP row. Nightmares dose still drops standing BP.",
    "First-dose syncope, nasal congestion, reflex tachycardia.",
  ),
  varenicline: st(
    "Partial α4β2 nicotinic — occupancy that blunts a cigarette",
    [
      { r: "nAChR α4β2", n: 4 },
    ],
    "Sits on the receptor so nicotine cannot. Not a CYP perpetrator. Neuropsychiatric warning is quieter than the original scare, still counsel. Alcohol sensitivity in some.",
    "Nausea, vivid dreams, rare mood signal. Not bupropion's 2D6.",
  ),
  nicotine: st(
    "nAChR agonist — 1A2 induction is the smoke, not the gum",
    [
      { r: "nAChR", n: 4 },
    ],
    "The patch does not induce 1A2. Combusted smoke (PAHs) does — clozapine and olanzapine fall. Occupancy is addiction and withdrawal; the desk maps the smoke.",
    "Withdrawal, vivid dreams (patch). CYP story is combustion.",
  ),
  donepezil: st(
    "AChE inhibitor — more acetylcholine in the cleft",
    [
      { r: "AChE", n: 4 },
    ],
    "Opposite of the anticholinergic piano. 2D6/3A4. GI cholinergic. Syncope from vagal tone. Not a NMDA drug (that is memantine).",
    "Nausea, bradycardia, insomnia, vivid dreams.",
  ),
  vortioxetine: st(
    "Multimodal — SERT plus 5-HT1A agonist, 5-HT3 antagonist",
    [
      { r: "SERT", n: 4 },
      { r: "5-HT1A", n: 3 },
      { r: "5-HT3", n: 3 },
      { r: "5-HT7", n: 2 },
    ],
    "SSRI occupancy plus receptor extras. 2D6 — CPIC max 10 mg in PMs. MAOI still contraindicated. Nausea from 5-HT.",
    "Nausea, sexual still possible. 2D6 PM ceiling.",
  ),
  vilazodone: st(
    "SPAR — SERT plus 5-HT1A partial, 3A4",
    [
      { r: "SERT", n: 4 },
      { r: "5-HT1A", n: 3 },
    ],
    "Take with food. Strong 3A4 inhibitors raise it. MAOI contraindicated. Not a 'buspirone plus SSRI' to stack freely — it is both occupancies in one molecule.",
    "GI, insomnia, 3A4 victim.",
  ),
  ramelteon: st(
    "MT1/MT2 agonist — 1A2 sensitive",
    [
      { r: "MT1", n: 4 },
      { r: "MT2", n: 4 },
    ],
    "Not GABA. Fluvoxamine (strong 1A2 inhibitor) is labeled contraindicated. No opioid airway from GABA — still CNS with other sedatives.",
    "Somnolence. 1A2 is the trap, not 3A4.",
  ),
  suvorexant: st(
    "Dual orexin antagonist — 3A4 sensitive",
    [
      { r: "OX1", n: 4 },
      { r: "OX2", n: 4 },
    ],
    "Turns wake signaling down rather than turning GABA up. Strong 3A4 inhibitors are not recommended. Still CNS with alcohol.",
    "Next-day impairment, sleep paralysis, 3A4 victim.",
  ),
  lemborexant: st(
    "Dual orexin antagonist — sensitive 3A4",
    [
      { r: "OX1", n: 4 },
      { r: "OX2", n: 4 },
    ],
    "Same superfamily as suvorexant, sensitive 3A4. Not a benzo occupancy.",
    "Sedation, 3A4 inhibitors not recommended.",
  ),
  melatonin: st(
    "Pineal hormone — MT1/MT2, 1A2 victim",
    [
      { r: "MT1", n: 4 },
      { r: "MT2", n: 3 },
    ],
    "1A2 substrate — fluvoxamine and ciprofloxacin raise it. Not a GABA hypnotic. Formulation-dependent dose is a mess.",
    "Vivid dreams, next-day fog at high dose. 1A2 inhibitors raise its exposure.",
  ),
  acamprosate: st(
    "NMDA / GABA modulator — alcohol MAT, renal, quiet CYP",
    [
      { r: "NMDA", n: 2 },
      { r: "GABA", n: 2 },
    ],
    "The pair with naltrexone should stay CYP/PD quiet on this desk — that is the teaching. Renal dose. Not disulfiram's ALDH.",
    "Diarrhea, renal adjustment. Not a deterrent reaction.",
  ),
  disulfiram: st(
    "ALDH inhibitor — occupancy is acetaldehyde",
    [
      { r: "ALDH", n: 4 },
    ],
    "Ethanol on this occupancy is the reaction: flush, nausea, hypotension. Metronidazole is a debated cousin. Not naltrexone's μ block.",
    "Hepatotoxicity, neuropathy, the reaction itself. Wait for alcohol to clear before the first tablet.",
  ),
};

export function stahlFor(id: string): StahlCard | null {
  return STAHL[id] ?? null;
}

export function hasStahl(id: string) {
  return Boolean(STAHL[id]);
}

export const STAHL_IDS = Object.keys(STAHL);
