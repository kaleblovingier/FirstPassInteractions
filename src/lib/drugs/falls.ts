/**
 * Falls risk and deprescribing teaching engine (older adults).
 *
 * Reads the tray for fall-risk-increasing drugs (FRIDs), names the mechanism
 * behind each fall, and shows how they stack. The frame is STOPPFall (the
 * EuGMS Task and Finish Group on FRIDs) for the drug classes and their
 * deprescribing considerations, the 2023 AGS Beers Criteria for the older-adult
 * statements, and CDC STEADI as the US pointer for screening and assessment.
 *
 * Reuses, does not restate:
 *   - anticholinergic burden comes from ./acb (ACB score 2–3 marks the
 *     anticholinergic mechanism, and the ACB total is shown as-is);
 *   - per-drug Beers rows come from the clinic cards in ./clinic.
 *
 * The core teaching point: each FRID adds risk, and FRIDs that share or add
 * mechanisms stack. An empty result is not a green light.
 *
 * Teaching only. Not a decision, not a dose, not an order. No taper schedules:
 * the deprescribing algorithms and the Prescribing Information govern.
 */

import { DRUG_BY_ID } from "./catalog";
import { ACB_CATALOG, acbOnDesk, type AcbRiskLevel } from "./acb";
import { clinicFor } from "./clinic";
import type { HostContext, PdFlag } from "./types";

export const FALLS_DISCLAIMER =
  "Teaching map, not a decision, a dose or an order. Fall-risk drug lists and Beers statements describe population risk. Any change to a medicine follows the treating clinician, the deprescribing algorithm and the Prescribing Information, which governs.";

export const FALLS_CITATIONS: string[] = [
  "Seppala LJ, Petrovic M, Ryg J, et al. STOPPFall (Screening Tool of Older Persons Prescriptions in older adults with high fall risk): a Delphi study by the EuGMS Task and Finish Group on Fall-Risk-Increasing Drugs. Age Ageing 2021;50(4):1189–1199.",
  "2023 American Geriatrics Society Beers Criteria Update Expert Panel. American Geriatrics Society 2023 updated AGS Beers Criteria for potentially inappropriate medication use in older adults. J Am Geriatr Soc 2023;71(7):2052–2081.",
  "Centers for Disease Control and Prevention, National Center for Injury Prevention and Control. STEADI (Stopping Elderly Accidents, Deaths & Injuries): Algorithm for Fall Risk Screening, Assessment, and Intervention.",
  "Farrell B, Pottie K, Thompson W, et al. Deprescribing benzodiazepine receptor agonists: evidence-based clinical practice guideline. Can Fam Physician 2018;64(5):339–351. (deprescribing.org BZRA algorithm)",
  "Bjerre LM, Farrell B, Hogel M, et al. Deprescribing antipsychotics for behavioural and psychological symptoms of dementia and insomnia: evidence-based clinical practice guideline. Can Fam Physician 2018;64(1):17–27. (deprescribing.org antipsychotic algorithm)",
  "Farrell B, Black C, Thompson W, et al. Deprescribing antihyperglycemic agents in older persons: evidence-based clinical practice guideline. Can Fam Physician 2017;63(11):832–843. (deprescribing.org antihyperglycemic algorithm)",
  "Dowell D, Ragan KR, Jones CM, Baldwin GT, Chou R. CDC Clinical Practice Guideline for Prescribing Opioids for Pain — United States, 2022. MMWR Recomm Rep 2022;71(3):1–95.",
  "Boustani M, Campbell N, Munger S, Maidment I, Fox C. Impact of anticholinergics on the aging brain: a review and practical application. Aging Health 2008;4(3):311–320. (Anticholinergic Cognitive Burden scale, used by the ACB module)",
];

/* ── Mechanisms ───────────────────────────────────────────────────────── */

export type FallMechanism = "sedation" | "orthostatic" | "hypoglycemia" | "bradycardia" | "anticholinergic" | "hyponatremia";

export const FALL_MECHANISM_ORDER: readonly FallMechanism[] = [
  "sedation",
  "orthostatic",
  "hypoglycemia",
  "bradycardia",
  "anticholinergic",
  "hyponatremia",
];

export interface FallMechanismInfo {
  id: FallMechanism;
  label: string;
  /** How the drug effect turns into a fall. */
  how: string;
  /** What a learner would check at the bedside. */
  check: string;
}

export const FALL_MECHANISMS: Record<FallMechanism, FallMechanismInfo> = {
  sedation: {
    id: "sedation",
    label: "Sedation and slowed reactions",
    how: "Slows reaction time and the reflexes that catch a stumble. The effect can carry into the next day.",
    check: "Ask about daytime sleepiness and watch the person walk.",
  },
  orthostatic: {
    id: "orthostatic",
    label: "Blood pressure drop on standing",
    how: "Pressure falls when the person stands. The brain is briefly underperfused, and lightheadedness or a faint follows.",
    check: "Lying and standing blood pressure.",
  },
  hypoglycemia: {
    id: "hypoglycemia",
    label: "Low blood sugar",
    how: "Low glucose brings confusion, shakiness and weakness. Older adults may not feel the usual warning signs.",
    check: "Ask about lows and look at the glucose record.",
  },
  bradycardia: {
    id: "bradycardia",
    label: "Slow heart rate or fainting",
    how: "A slow or blocked heartbeat lowers cardiac output. Dizziness and syncope follow.",
    check: "Pulse, and an ECG if it is slow or the person has fainted.",
  },
  anticholinergic: {
    id: "anticholinergic",
    label: "Anticholinergic load",
    how: "Blocked acetylcholine brings confusion, blurred near vision and urinary retention. The load adds up across drugs.",
    check: "ACB score from the ACB tab; ask about confusion, constipation and retention.",
  },
  hyponatremia: {
    id: "hyponatremia",
    label: "Low sodium",
    how: "Even mild, chronic low sodium is linked to unsteady gait, poor attention and falls.",
    check: "Serum sodium after a start or a dose change.",
  },
};

/* ── FRID classes ─────────────────────────────────────────────────────── */

export type FridClassId =
  | "bzra"
  | "opioid"
  | "gabapentinoid"
  | "sedating-antihistamine"
  | "antipsychotic"
  | "tca"
  | "ssri-snri"
  | "other-antidepressant"
  | "antiepileptic"
  | "muscle-relaxant"
  | "alpha-blocker"
  | "central-alpha2"
  | "nitrate"
  | "diuretic"
  | "antihypertensive"
  | "beta-blocker"
  | "rate-ccb"
  | "digoxin"
  | "cholinesterase-inhibitor"
  | "sulfonylurea"
  | "insulin"
  | "anticholinergic";

/** Taper needed to avoid withdrawal or rebound? "ask" means plan the stop with the care team. */
export type TaperFlag = "yes" | "no" | "ask";

export interface DeprescribeQuestions {
  /** Q1. Is the indication still valid? */
  indication: string;
  /** Q2. Is there a lower-risk alternative? */
  alternative: string;
  /** Q3. Is a taper needed to avoid withdrawal or rebound? */
  taper: TaperFlag;
  taperNote: string;
  /** The named algorithm or guideline, when one exists. */
  algorithm?: string;
}

export interface FridClassDef {
  id: FridClassId;
  label: string;
  mechanisms: FallMechanism[];
  why: string;
  /** Counts toward the Beers 2023 "three or more CNS-active drugs" row. */
  beersCnsActive: boolean;
  deprescribe: DeprescribeQuestions;
  /** Beers 2023 statement for the class, in plain words. */
  beers?: string;
}

export const DEPRESCRIBE_QUESTIONS = [
  "Is the reason it was started still there?",
  "Is there a lower-risk option, drug or non-drug?",
  "Does it need a taper to avoid withdrawal or rebound?",
] as const;

export const FRID_CLASSES: FridClassDef[] = [
  {
    id: "bzra",
    label: "Benzodiazepines and Z-drugs",
    mechanisms: ["sedation"],
    why: "They slow reaction time and blunt the reflexes that catch a stumble. Long-acting agents and older age carry the effect into the next day.",
    beersCnsActive: true,
    deprescribe: {
      indication:
        "What was it started for? Many were started for sleep or a short crisis and never stopped. The BZRA algorithm is written for insomnia; use for an anxiety disorder or alcohol withdrawal follows a different path.",
      alternative: "Cognitive behavioural therapy for insomnia (CBT-I) and sleep hygiene. The guideline notes CBT-I helps a taper succeed.",
      taper: "yes",
      taperNote:
        "Taper per the deprescribing.org BZRA algorithm. Abrupt stop risks withdrawal, rebound insomnia and, after long use, seizures.",
      algorithm:
        "deprescribing.org benzodiazepine receptor agonist algorithm (Farrell 2018). It recommends offering a taper to adults 65 and older who take a BZRA, however long they have taken it.",
    },
    beers:
      "Beers 2023: avoid benzodiazepines and Z-drugs in older adults. Both raise the risk of cognitive impairment, delirium, falls, fractures and motor vehicle crashes.",
  },
  {
    id: "opioid",
    label: "Opioids",
    mechanisms: ["sedation"],
    why: "Sedation, dizziness and slowed reactions. Risk is highest in the first weeks and after a dose increase.",
    beersCnsActive: true,
    deprescribe: {
      indication: "Is the pain it was started for still there, and is the opioid still improving function, not just the pain score?",
      alternative: "Non-opioid analgesics and non-drug pain care matched to the type of pain.",
      taper: "yes",
      taperNote:
        "Taper rather than stop. After long use, abrupt stop risks withdrawal and a return of pain. CDC 2022 advises against stopping long-term opioids abruptly unless there is a life-threatening issue.",
      algorithm: "CDC 2022 Clinical Practice Guideline for opioids, recommendations on tapering and discontinuation.",
    },
    beers:
      "Beers 2023: with a history of falls or fractures, avoid opioids except for severe acute pain, such as a recent fracture or joint replacement.",
  },
  {
    id: "gabapentinoid",
    label: "Gabapentinoids",
    mechanisms: ["sedation"],
    why: "Dizziness, sleepiness and unsteady gait are among their most common side effects. The kidney clears them, so they build up as kidney function falls.",
    beersCnsActive: true,
    deprescribe: {
      indication: "What is it for, and is there a measured benefit? Check that the original indication is still active.",
      alternative: "Non-drug pain care, or a lower-risk option for the specific indication.",
      taper: "yes",
      taperNote: "The labels advise a gradual withdrawal. Abrupt stop risks withdrawal symptoms and, in epilepsy, seizures.",
    },
    beers:
      "Beers 2023: avoid opioids with gabapentinoids (severe sedation, respiratory depression), except when moving from an opioid to a gabapentinoid or using one to lower the opioid dose. As antiepileptics, they also fall under the Beers falls row and the three-CNS-drug limit.",
  },
  {
    id: "sedating-antihistamine",
    label: "First-generation antihistamines",
    mechanisms: ["sedation"],
    why: "Sedating and strongly anticholinergic. Often hidden in over-the-counter sleep and cold products. Meclizine, often given for dizziness, is one of them.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is it a sleep aid, an allergy pill, an antiemetic or for dizziness? Ask about over-the-counter 'PM' products.",
      alternative: "A second-generation antihistamine for allergy. For sleep, non-drug sleep care.",
      taper: "no",
      taperNote: "Usually stopped without a formal taper. Confirm with the care team and the label.",
    },
    beers:
      "Beers 2023: avoid first-generation antihistamines. They are highly anticholinergic and cleared more slowly with age, with confusion, constipation and dry mouth.",
  },
  {
    id: "antipsychotic",
    label: "Antipsychotics",
    mechanisms: ["sedation", "orthostatic"],
    why: "Sedation, alpha-1 blockade that drops pressure on standing, and drug-induced parkinsonism that shortens the stride.",
    beersCnsActive: true,
    deprescribe: {
      indication:
        "What target symptom is it for? For behavioural and psychological symptoms of dementia treated for 3 months or more, or for insomnia, the antipsychotic algorithm recommends deprescribing. It does not cover schizophrenia or bipolar disorder.",
      alternative: "Non-drug approaches for behavioural symptoms; non-drug sleep care for insomnia.",
      taper: "yes",
      taperNote:
        "Taper per the deprescribing.org antipsychotic algorithm and watch for symptoms coming back. Abrupt stop risks withdrawal effects and rebound.",
      algorithm: "deprescribing.org antipsychotic algorithm (Bjerre 2018), for behavioural symptoms of dementia and for insomnia.",
    },
    beers:
      "Beers 2023: avoid for behavioural symptoms of dementia or delirium unless non-drug options have failed and the person is at risk of substantial harm to self or others. Higher stroke risk and mortality in dementia (boxed warning).",
  },
  {
    id: "tca",
    label: "Tricyclic antidepressants",
    mechanisms: ["sedation", "orthostatic"],
    why: "A triple hit: sedation, a pressure drop on standing from alpha-1 blockade, and strong anticholinergic effects.",
    beersCnsActive: true,
    deprescribe: {
      indication: "Is it for depression, nerve pain or sleep? A low dose for sleep or pain still counts.",
      alternative: "For depression, an antidepressant with less anticholinergic and orthostatic effect. The ACB tab lists options.",
      taper: "yes",
      taperNote: "Taper rather than stop. Abrupt stop can cause a discontinuation syndrome, including cholinergic rebound.",
    },
    beers:
      "Beers 2023: avoid the strongly anticholinergic antidepressants, which include most tricyclics and paroxetine. They sedate and cause orthostatic hypotension. With a history of falls, avoid antidepressants unless safer options are not available.",
  },
  {
    id: "ssri-snri",
    label: "SSRIs and SNRIs",
    mechanisms: ["sedation", "hyponatremia"],
    why: "Linked to falls in older adults. Proposed reasons include slowed psychomotor responses, sleep disruption and SIADH low sodium, which is most likely in the first weeks.",
    beersCnsActive: true,
    deprescribe: {
      indication: "Is the depression or anxiety still active? When was the dose last reviewed?",
      alternative: "Psychological therapy may be enough for some. If the drug stays, check sodium after a start or dose change.",
      taper: "yes",
      taperNote:
        "Taper rather than stop. Abrupt stop risks discontinuation symptoms, and dizziness is one of them. Paroxetine and venlafaxine are the classic offenders.",
    },
    beers:
      "Beers 2023: use with caution, because SSRIs and SNRIs can cause SIADH or low sodium; check sodium when starting or changing the dose. With a history of falls, avoid unless safer options are not available.",
  },
  {
    id: "other-antidepressant",
    label: "Trazodone and mirtazapine",
    mechanisms: ["sedation"],
    why: "Sedating by design, through histamine and serotonin-2 blockade. Trazodone also blocks alpha-1 and can drop pressure on standing.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is it for depression or for sleep? If for sleep, has non-drug sleep care been tried?",
      alternative: "Non-drug sleep care for insomnia.",
      taper: "yes",
      taperNote: "Taper rather than stop abruptly, as with other antidepressants.",
    },
    beers: "Beers 2023: mirtazapine is on the use-with-caution list for SIADH and low sodium.",
  },
  {
    id: "antiepileptic",
    label: "Other antiseizure drugs",
    mechanisms: ["sedation"],
    why: "Dizziness, sleepiness and ataxia, worse at high levels. Carbamazepine and oxcarbazepine also lower sodium. Long-term enzyme inducers thin bone, so a fall is more likely to break it.",
    beersCnsActive: true,
    deprescribe: {
      indication: "Is it for seizures or a mood disorder, or for pain or another use? Beers keeps the seizure and mood indications.",
      alternative: "For seizures, review the regimen with neurology rather than stopping. For other uses, ask whether it is still needed.",
      taper: "yes",
      taperNote: "Never stop an antiseizure drug abruptly in someone with epilepsy: seizure risk. Any change goes through the treating team.",
    },
    beers:
      "Beers 2023: with a history of falls or fractures, avoid antiepileptics except for seizure and mood disorders. Carbamazepine and oxcarbazepine are on the SIADH caution list.",
  },
  {
    id: "muscle-relaxant",
    label: "Muscle relaxants",
    mechanisms: ["sedation"],
    why: "Sedation and weakness. Cyclobenzaprine is a tricyclic cousin and anticholinergic. Tizanidine is an alpha-2 agonist and drops blood pressure.",
    beersCnsActive: true,
    deprescribe: {
      indication: "Is the spasm or spasticity still there? Muscle relaxants for back pain are usually meant for short courses.",
      alternative: "Physical therapy and non-drug care for back pain. For spasticity, review the plan with the treating team.",
      taper: "yes",
      taperNote:
        "Baclofen, tizanidine and carisoprodol need a taper. Abrupt stop risks withdrawal (baclofen: hallucinations, seizures) or rebound high blood pressure (tizanidine).",
    },
    beers:
      "Beers 2023: avoid skeletal muscle relaxants such as cyclobenzaprine, methocarbamol, carisoprodol and metaxalone. Poorly tolerated, anticholinergic and sedating, with fracture risk.",
  },
  {
    id: "alpha-blocker",
    label: "Alpha-1 blockers",
    mechanisms: ["orthostatic"],
    why: "They relax arterial and venous tone, so pressure drops on standing. The first dose and dose increases carry the most risk.",
    beersCnsActive: false,
    deprescribe: {
      indication: "For blood pressure, is a better-tolerated class possible? For prostate symptoms, is the urinary benefit still worth the dizziness?",
      alternative: "Another blood-pressure class when the indication is hypertension.",
      taper: "no",
      taperNote: "No withdrawal syndrome is expected. Stopping mainly lets the original symptom or blood pressure come back.",
    },
    beers: "Beers 2023: avoid doxazosin, prazosin and terazosin as treatment for hypertension, because of orthostatic hypotension.",
  },
  {
    id: "central-alpha2",
    label: "Central alpha-2 agonists",
    mechanisms: ["orthostatic", "bradycardia", "sedation"],
    why: "They cut sympathetic outflow: lower pressure on standing, a slower heart rate, and sedation.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is it for blood pressure, ADHD, withdrawal or sleep? For blood pressure, is a first-line class possible?",
      alternative: "A first-line blood-pressure class when the indication is hypertension.",
      taper: "yes",
      taperNote: "Taper. Stopping clonidine abruptly can cause rebound high blood pressure.",
    },
    beers:
      "Beers 2023: avoid clonidine as first-line treatment for hypertension, and avoid the other central alpha agonists. CNS effects, bradycardia and orthostatic hypotension.",
  },
  {
    id: "nitrate",
    label: "Nitrates",
    mechanisms: ["orthostatic"],
    why: "Venous pooling in the legs drops pressure on standing. Headache and dizziness are common early.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is the angina still active? Is the long-acting nitrate still needed on top of the other antianginals?",
      alternative: "Review the antianginal plan with cardiology.",
      taper: "ask",
      taperNote: "Plan any stop with cardiology. Angina can come back when a nitrate is stopped.",
    },
  },
  {
    id: "diuretic",
    label: "Diuretics",
    mechanisms: ["orthostatic"],
    why: "Volume loss lowers pressure on standing. Urgency and night-time trips to the toilet add rushed walking in the dark. Thiazides also lower sodium.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is it for heart failure or edema, or for blood pressure? Could the timing change so the diuresis is over by bedtime?",
      alternative: "When the indication is blood pressure alone, another class may fit.",
      taper: "ask",
      taperNote: "No withdrawal syndrome, but fluid can build back up in heart failure. Plan any change with whoever manages the heart failure.",
    },
    beers: "Beers 2023: use diuretics with caution; they can cause or worsen SIADH and low sodium. Check sodium when starting or changing the dose.",
  },
  {
    id: "antihypertensive",
    label: "Other blood pressure drugs",
    mechanisms: ["orthostatic"],
    why: "Any drug that lowers blood pressure can lower it too far on standing. Risk is highest after a start or a dose increase.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is the blood-pressure target still right for this person? Is there a drop on standing?",
      alternative: "Measure lying and standing pressure before deciding which drug to change.",
      taper: "no",
      taperNote: "No withdrawal syndrome for these classes. Blood pressure can rise again, so recheck after any change.",
    },
  },
  {
    id: "beta-blocker",
    label: "Beta-blockers",
    mechanisms: ["bradycardia"],
    why: "They slow the heart and blunt the rise in heart rate on standing. Timolol eye drops reach the circulation too.",
    beersCnsActive: false,
    deprescribe: {
      indication: "What is it for: after a heart attack, heart failure, rate control, blood pressure, tremor? Is the resting heart rate low?",
      alternative: "If the indication is blood pressure alone, another class may fit.",
      taper: "yes",
      taperNote: "Taper rather than stop. Abrupt stop can cause rebound tachycardia and angina; several labels carry a boxed warning.",
    },
  },
  {
    id: "rate-ccb",
    label: "Diltiazem and verapamil",
    mechanisms: ["bradycardia", "orthostatic"],
    why: "They slow conduction through the AV node and lower blood pressure. With a beta-blocker or digoxin, the slowing stacks.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is it for rate control or blood pressure? Is the heart rate low?",
      alternative: "Review the rate-control or blood-pressure plan.",
      taper: "ask",
      taperNote: "Plan any change with the treating team. Heart rate and blood pressure can rise again after a stop.",
    },
  },
  {
    id: "digoxin",
    label: "Digoxin",
    mechanisms: ["bradycardia"],
    why: "Slows the heart through the vagus and the AV node. Toxicity brings confusion, visual changes and arrhythmias, and builds as kidney function falls.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is it still needed for rate control or heart failure symptoms? Has kidney function changed since it was started?",
      alternative: "Review the rate-control plan. The digoxin tab covers levels.",
      taper: "ask",
      taperNote: "Plan any change with cardiology. In heart failure, symptoms can worsen after digoxin is stopped.",
    },
    beers: "Beers 2023: avoid digoxin as first-line therapy for atrial fibrillation or heart failure. Lower kidney clearance raises the risk of toxicity.",
  },
  {
    id: "cholinesterase-inhibitor",
    label: "Cholinesterase inhibitors",
    mechanisms: ["bradycardia"],
    why: "They raise vagal tone: a slow heart rate, heart block and fainting.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is there still a benefit on memory or function that the person and family can see?",
      alternative: "Non-drug dementia care, set against the goals of care.",
      taper: "ask",
      taperNote: "Plan any stop with the treating team, and watch for a decline in cognition or behaviour after the change.",
    },
    beers: "Beers 2023: avoid in people with syncope, because they raise the risk of bradycardia and orthostatic hypotension.",
  },
  {
    id: "sulfonylurea",
    label: "Sulfonylureas and meglitinides",
    mechanisms: ["hypoglycemia"],
    why: "They release insulin whatever the glucose level. Long-acting agents and low kidney function make the lows last longer.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is the glucose target still right for this person's health and goals?",
      alternative: "An agent with a low risk of hypoglycemia, per the diabetes plan.",
      taper: "no",
      taperNote: "No withdrawal syndrome. Glucose will rise, so plan follow-up monitoring.",
      algorithm:
        "deprescribing.org antihyperglycemic algorithm (Farrell 2017): for older adults at risk of hypoglycemia, consider switching, reducing or stopping the agents that cause it.",
    },
    beers:
      "Beers 2023: avoid sulfonylureas as first- or second-line therapy unless there are substantial barriers to other agents. If one is used, short-acting glipizide is preferred over glyburide or glimepiride, which cause more prolonged lows.",
  },
  {
    id: "insulin",
    label: "Insulin",
    mechanisms: ["hypoglycemia"],
    why: "Lows bring confusion, weakness and shakiness. Missed meals, falling kidney function and tight targets raise the risk.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Does the regimen still fit how the person eats and lives? Is the glucose target still right?",
      alternative: "A simpler regimen. Sliding-scale-only regimens are a Beers row.",
      taper: "ask",
      taperNote: "Never stop insulin in type 1 diabetes. In type 2, any reduction is planned with glucose follow-up.",
      algorithm: "deprescribing.org antihyperglycemic algorithm (Farrell 2017).",
    },
    beers:
      "Beers 2023: avoid regimens of short- or rapid-acting insulin dosed by the current glucose (sliding scale) without basal insulin: more lows without better control.",
  },
  {
    id: "anticholinergic",
    label: "Strong anticholinergics",
    mechanisms: ["anticholinergic"],
    why: "Bladder, gut and movement-disorder antimuscarinics. Confusion, blurred near vision, constipation and urinary retention, adding up across drugs.",
    beersCnsActive: false,
    deprescribe: {
      indication: "Is the bladder, gut or movement symptom still a problem, and is the drug still helping?",
      alternative: "The ACB tab lists lower-burden alternatives for each drug.",
      taper: "ask",
      taperNote:
        "Antiparkinson anticholinergics such as benztropine and trihexyphenidyl are usually tapered. Bladder and gut agents usually are not. Confirm with the care team and the label.",
    },
    beers: "Beers 2023 lists strongly anticholinergic drugs to avoid and advises keeping the number of anticholinergic drugs taken together to a minimum.",
  },
];

export const FRID_CLASS_BY_ID: Record<FridClassId, FridClassDef> = Object.fromEntries(FRID_CLASSES.map((c) => [c.id, c])) as Record<
  FridClassId,
  FridClassDef
>;

/* ── Membership ───────────────────────────────────────────────────────── */

const known = (list: string[]) => new Set(list.filter((id) => id in DRUG_BY_ID));
const hasPd = (id: string, flag: PdFlag) => Boolean(DRUG_BY_ID[id]?.pd.includes(flag));

/** IV, procedural or peripheral-only items that share a catalog flag but are not part of a falls review. */
const NOT_ON_A_FALLS_REVIEW = known([
  "loperamide",
  "esmolol",
  "enalaprilat",
  "clevidipine",
  "sufentanil",
  "alfentanil",
  "remifentanil",
  "remimazolam",
  "hydralazine-ob",
  "valproate-iv",
]);

const GABAPENTINOID_IDS = known(["gabapentin", "pregabalin", "gabapentin-enacarbil"]);
const SEDATING_ANTIHISTAMINE_IDS = known([
  "diphenhydramine",
  "hydroxyzine",
  "promethazine",
  "doxylamine",
  "chlorpheniramine",
  "brompheniramine",
  "clemastine",
  "triprolidine",
  "cyproheptadine",
  "meclizine",
  "dimenhydrinate",
]);
const ANTIPSYCHOTIC_IDS = known([
  "quetiapine",
  "olanzapine",
  "risperidone",
  "aripiprazole",
  "clozapine",
  "haloperidol",
  "ziprasidone",
  "lurasidone",
  "pimozide",
  "thioridazine",
  "paliperidone",
  "chlorpromazine",
  "brexpiprazole",
  "cariprazine",
  "lumateperone",
  "asenapine",
  "iloperidone",
  "fluphenazine",
  "perphenazine",
  "thiothixene",
  "loxapine",
  "trifluoperazine",
  "prochlorperazine",
  "perphenazine-amitriptyline",
  "molindone",
  "paliperidone-palmitate",
  "aripiprazole-lauroxil",
  "aripiprazole-lai",
  "risperidone-lai",
  "olanzapine-lai",
  "haloperidol-decanoate",
  "fluphenazine-decanoate",
  "olanzapine-samidorphan",
  "lybalvi",
]);
const TCA_IDS = known([
  "amitriptyline",
  "nortriptyline",
  "clomipramine",
  "desipramine",
  "doxepin",
  "imipramine",
  "imipramine-pamoate",
  "protriptyline",
  "trimipramine",
  "amoxapine",
  "maprotiline",
  "perphenazine-amitriptyline",
]);
const OTHER_ANTIDEPRESSANT_IDS = known(["trazodone", "mirtazapine", "mirtazapine-odt", "nefazodone"]);
const ANTIEPILEPTIC_IDS = known([
  "carbamazepine",
  "carbamazepine-xr",
  "carbamazepine-equetro",
  "oxcarbazepine",
  "oxcarbazepine-xr",
  "eslicarbazepine",
  "eslicarbazepine-acetate",
  "phenytoin",
  "fosphenytoin",
  "phenobarbital",
  "primidone",
  "valproate",
  "divalproex",
  "valproate-sprinkle",
  "lamotrigine",
  "lamotrigine-xr",
  "levetiracetam",
  "levetiracetam-xr",
  "brivaracetam",
  "topiramate",
  "topiramate-xr",
  "zonisamide",
  "lacosamide",
  "perampanel",
  "cenobamate",
  "ethosuximide",
  "felbamate",
  "tiagabine",
  "vigabatrin",
  "rufinamide",
]);
const MUSCLE_RELAXANT_IDS = known([
  "cyclobenzaprine",
  "methocarbamol",
  "carisoprodol",
  "metaxalone",
  "orphenadrine",
  "chlorzoxazone",
  "tizanidine",
  "baclofen",
  "baclofen-it",
]);
const ALPHA1_BLOCKER_IDS = known(["doxazosin", "prazosin", "terazosin", "tamsulosin", "alfuzosin", "silodosin"]);
const CENTRAL_ALPHA2_IDS = known(["clonidine", "guanfacine", "methyldopa", "lofexidine"]);
const NITRATE_IDS = known(["nitroglycerin", "isosorbide-mononitrate", "isosorbide-dinitrate"]);
/** Thiazides and thiazide-like diuretics, alone or in a fixed combination. */
export const THIAZIDE_IDS = known([
  "hctz",
  "chlorthalidone",
  "metolazone",
  "indapamide",
  "chlorothiazide",
  "bendroflumethiazide",
  "hydrochlorothiazide-triamterene",
  "lisinopril-hctz",
  "losartan-hctz",
  "valsartan-hctz",
  "spironolactone-hctz",
]);
const OTHER_DIURETIC_IDS = known(["spironolactone", "amiloride", "triamterene"]);
const OTHER_BP_IDS = known([
  "amlodipine",
  "nifedipine",
  "felodipine",
  "nicardipine",
  "nisoldipine",
  "isradipine",
  "nimodipine",
  "olmesartan-amlodipine",
  "atorvastatin-amlodipine",
  "hydralazine",
  "minoxidil",
  "aliskiren",
  "sacubitril-valsartan",
]);
const CHOLINESTERASE_IDS = known(["donepezil", "rivastigmine", "galantamine"]);

const MEMBERSHIP: Record<Exclude<FridClassId, "anticholinergic">, (id: string) => boolean> = {
  bzra: (id) => hasPd(id, "benzo-zdrug") || id === "clidinium-chlordiazepoxide",
  opioid: (id) => hasPd(id, "opioid"),
  gabapentinoid: (id) => GABAPENTINOID_IDS.has(id),
  "sedating-antihistamine": (id) => SEDATING_ANTIHISTAMINE_IDS.has(id),
  antipsychotic: (id) => ANTIPSYCHOTIC_IDS.has(id),
  tca: (id) => TCA_IDS.has(id),
  "ssri-snri": (id) => hasPd(id, "ssri-snri") && !OTHER_ANTIDEPRESSANT_IDS.has(id),
  "other-antidepressant": (id) => OTHER_ANTIDEPRESSANT_IDS.has(id),
  antiepileptic: (id) => ANTIEPILEPTIC_IDS.has(id),
  "muscle-relaxant": (id) => MUSCLE_RELAXANT_IDS.has(id),
  "alpha-blocker": (id) => ALPHA1_BLOCKER_IDS.has(id),
  "central-alpha2": (id) => CENTRAL_ALPHA2_IDS.has(id),
  nitrate: (id) => NITRATE_IDS.has(id),
  diuretic: (id) => hasPd(id, "loop-thiazide") || THIAZIDE_IDS.has(id) || OTHER_DIURETIC_IDS.has(id),
  antihypertensive: (id) => hasPd(id, "acei-arb") || OTHER_BP_IDS.has(id),
  "beta-blocker": (id) => hasPd(id, "beta-blocker"),
  "rate-ccb": (id) => hasPd(id, "ndhp-ccb"),
  digoxin: (id) => id === "digoxin",
  "cholinesterase-inhibitor": (id) => CHOLINESTERASE_IDS.has(id),
  sulfonylurea: (id) => hasPd(id, "insulin-secretagogue"),
  insulin: (id) => hasPd(id, "hypoglycemic") && /insulin/i.test(DRUG_BY_ID[id]?.cls ?? ""),
};

/** Drug-level mechanisms on top of the class ones. */
const EXTRA_MECHANISMS: Record<string, FallMechanism[]> = Object.fromEntries(
  [
    ...[...THIAZIDE_IDS].map((id) => [id, ["hyponatremia"]] as const),
    ...["carbamazepine", "carbamazepine-xr", "carbamazepine-equetro", "oxcarbazepine", "oxcarbazepine-xr", "eslicarbazepine", "eslicarbazepine-acetate"].map(
      (id) => [id, ["hyponatremia"]] as const,
    ),
    ["mirtazapine", ["hyponatremia"]] as const,
    ["mirtazapine-odt", ["hyponatremia"]] as const,
    ["tramadol", ["hyponatremia"]] as const,
    ["trazodone", ["orthostatic"]] as const,
    ["nefazodone", ["orthostatic"]] as const,
    ["tizanidine", ["orthostatic"]] as const,
    ["carvedilol", ["orthostatic"]] as const,
    ["labetalol", ["orthostatic"]] as const,
  ]
    .filter(([id]) => id in DRUG_BY_ID)
    .map(([id, m]) => [id, [...m]]),
);

const acbScoreOf = (id: string): number => ACB_CATALOG[id]?.score ?? 0;

/** FRID classes a catalog drug belongs to, in display order. Empty when it is not a mapped FRID. */
export function fridClassesOf(id: string): FridClassId[] {
  if (!(id in DRUG_BY_ID) || NOT_ON_A_FALLS_REVIEW.has(id)) return [];
  const out = FRID_CLASSES.filter((c) => c.id !== "anticholinergic" && MEMBERSHIP[c.id as Exclude<FridClassId, "anticholinergic">](id)).map(
    (c) => c.id,
  );
  // Definite anticholinergics (ACB 2–3, from ./acb) with no other class get their own row.
  if (out.length === 0 && acbScoreOf(id) >= 2) out.push("anticholinergic");
  return out;
}

/** Mechanisms behind a drug's fall risk: its classes, drug-level extras, and ACB 2–3 from ./acb. */
export function fallMechanismsOf(id: string): FallMechanism[] {
  const classes = fridClassesOf(id);
  if (classes.length === 0) return [];
  const set = new Set<FallMechanism>(classes.flatMap((c) => FRID_CLASS_BY_ID[c].mechanisms));
  for (const m of EXTRA_MECHANISMS[id] ?? []) set.add(m);
  if (acbScoreOf(id) >= 2) set.add("anticholinergic");
  return FALL_MECHANISM_ORDER.filter((m) => set.has(m));
}

const isBeersCnsActive = (id: string) => fridClassesOf(id).some((c) => FRID_CLASS_BY_ID[c].beersCnsActive);

/* ── Helpers ──────────────────────────────────────────────────────────── */

const nameOf = (id: string) => DRUG_BY_ID[id]?.name ?? id;

function joinNames(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const names = (ids: string[]) => joinNames(ids.map(nameOf));

function uniqKnown(ids: string[]): string[] {
  return [...new Set(ids)].filter((id) => id in DRUG_BY_ID);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ── Desk detection ───────────────────────────────────────────────────── */

export interface FallsDeskDetection {
  hasFrid: boolean;
  fridCount: number;
  fridIds: string[];
  classIds: FridClassId[];
  mechanisms: FallMechanism[];
  mechanismCount: number;
  /** Two or more FRIDs on the tray. */
  stacked: boolean;
  hasSedation: boolean;
  hasOrthostatic: boolean;
  hasHypoglycemia: boolean;
  hasBradycardia: boolean;
  hasAnticholinergic: boolean;
  hasHyponatremia: boolean;
  /** Drugs in the Beers 2023 CNS-active list (antiepileptics, antidepressants, antipsychotics, benzodiazepines, Z-drugs, opioids, muscle relaxants). */
  beersCnsActiveIds: string[];
  beersCnsActiveCount: number;
  /** Three or more CNS-active drugs: the Beers 2023 combination row. */
  beersCnsStack: boolean;
}

export function fallsOnDesk(ids: string[]): FallsDeskDetection {
  const tray = uniqKnown(ids);
  const fridIds = tray.filter((id) => fridClassesOf(id).length > 0);
  const classSet = new Set(fridIds.flatMap(fridClassesOf));
  const classIds = FRID_CLASSES.map((c) => c.id).filter((c) => classSet.has(c));
  const mechSet = new Set(fridIds.flatMap(fallMechanismsOf));
  const mechanisms = FALL_MECHANISM_ORDER.filter((m) => mechSet.has(m));
  const beersCnsActiveIds = fridIds.filter(isBeersCnsActive);
  return {
    hasFrid: fridIds.length > 0,
    fridCount: fridIds.length,
    fridIds,
    classIds,
    mechanisms,
    mechanismCount: mechanisms.length,
    stacked: fridIds.length >= 2,
    hasSedation: mechSet.has("sedation"),
    hasOrthostatic: mechSet.has("orthostatic"),
    hasHypoglycemia: mechSet.has("hypoglycemia"),
    hasBradycardia: mechSet.has("bradycardia"),
    hasAnticholinergic: mechSet.has("anticholinergic"),
    hasHyponatremia: mechSet.has("hyponatremia"),
    beersCnsActiveIds,
    beersCnsActiveCount: beersCnsActiveIds.length,
    beersCnsStack: beersCnsActiveIds.length >= 3,
  };
}

/* ── STEADI screen ────────────────────────────────────────────────────── */

export type SteadiKey = "fell" | "unsteady" | "worries";

export interface SteadiQuestion {
  key: SteadiKey;
  label: string;
  hint?: string;
}

/** The three STEADI key questions. A yes to any one screens the person at risk. */
export const STEADI_QUESTIONS: SteadiQuestion[] = [
  { key: "fell", label: "Fallen in the past year?", hint: "STEADI follows up: how many times, and was the person hurt?" },
  { key: "unsteady", label: "Feels unsteady when standing or walking?" },
  { key: "worries", label: "Worries about falling?" },
];

export type SteadiAnswers = Record<SteadiKey, boolean>;

export const STEADI_NONE: SteadiAnswers = { fell: false, unsteady: false, worries: false };

export interface SteadiResult {
  screenedAtRisk: boolean;
  yesCount: number;
  fridCount: number;
  tone: "high" | "watch" | "low";
  headline: string;
  steps: string[];
}

const STEADI_ASSESS_STEPS = [
  "Assess gait, strength and balance. STEADI uses the Timed Up and Go, the 30-Second Chair Stand and the 4-Stage Balance Test.",
  "Measure lying and standing blood pressure.",
  "Review medicines for fall risk. The tray list is the starting point, not the whole list.",
  "Check vision, feet and footwear, home hazards and vitamin D intake.",
];

export function steadiScreen(answers: SteadiAnswers, fridCount: number): SteadiResult {
  const yesCount = STEADI_QUESTIONS.filter((q) => answers[q.key]).length;
  const screenedAtRisk = yesCount > 0;
  const frid = Math.max(0, Math.floor(fridCount));
  const fridText = plural(frid, "fall-risk drug", "fall-risk drugs");
  let tone: SteadiResult["tone"];
  let headline: string;
  let steps: string[];
  if (screenedAtRisk && frid > 0) {
    tone = "high";
    headline = `Screened at risk on STEADI, with ${fridText} on the tray. The person has a reason to fall and the tray adds more. STEADI's next step is an assessment that includes a medication review.`;
    steps = STEADI_ASSESS_STEPS;
  } else if (screenedAtRisk) {
    tone = "watch";
    headline =
      "Screened at risk on STEADI, and no fall-risk drug is mapped on the tray. That is not a clean bill: the tray may be incomplete, and over-the-counter sleep aids and alcohol often go unrecorded.";
    steps = STEADI_ASSESS_STEPS;
  } else if (frid > 0) {
    tone = "watch";
    headline = `Screen negative today, but ${fridText} on the tray. A negative screen does not remove the drug risk.`;
    steps = ["Re-screen at least once a year, and again after a new fall-risk drug or a dose change.", "Work the deprescribing questions for each class anyway."];
  } else {
    tone = "low";
    headline = "Screen negative and no fall-risk drug mapped. This desk only sees what is on the tray.";
    steps = ["Re-screen at least once a year. STEADI screens every adult 65 and older."];
  }
  return { screenedAtRisk, yesCount, fridCount: frid, tone, headline, steps };
}

/* ── What-if: take one drug off ───────────────────────────────────────── */

export interface FallsSnapshot {
  fridCount: number;
  mechanisms: FallMechanism[];
  beersCnsActiveCount: number;
  acbTotal: number;
}

export interface FallsWhatIf {
  removedId: string;
  removedName: string;
  wasFrid: boolean;
  before: FallsSnapshot;
  after: FallsSnapshot;
  lostClassIds: FridClassId[];
  lostMechanisms: FallMechanism[];
  message: string;
}

export const WHAT_IF_NOTE =
  "A what-if for teaching, not a plan to stop anything. A real change follows the three deprescribing questions and the treating team.";

function snapshot(ids: string[]): FallsSnapshot {
  const d = fallsOnDesk(ids);
  return {
    fridCount: d.fridCount,
    mechanisms: d.mechanisms,
    beersCnsActiveCount: d.beersCnsActiveCount,
    acbTotal: acbOnDesk(ids)?.totalScore ?? 0,
  };
}

export function fallsWhatIf(ids: string[], removeId: string): FallsWhatIf {
  const tray = uniqKnown(ids);
  const rest = tray.filter((id) => id !== removeId);
  const before = snapshot(tray);
  const after = snapshot(rest);
  const beforeClasses = fallsOnDesk(tray).classIds;
  const afterClasses = new Set(fallsOnDesk(rest).classIds);
  const lostClassIds = beforeClasses.filter((c) => !afterClasses.has(c));
  const lostMechanisms = before.mechanisms.filter((m) => !after.mechanisms.includes(m));
  const wasFrid = tray.includes(removeId) && fridClassesOf(removeId).length > 0;
  const removedName = nameOf(removeId);

  const parts: string[] = [];
  if (!wasFrid) {
    parts.push(`${removedName} is not a mapped fall-risk drug, so the count stays at ${before.fridCount}.`);
  } else {
    parts.push(`Taking ${removedName} off drops the fall-risk drug count from ${before.fridCount} to ${after.fridCount}.`);
    if (lostMechanisms.length > 0) {
      parts.push(`It removes ${joinNames(lostMechanisms.map((m) => FALL_MECHANISMS[m].label.toLowerCase()))} from the stack.`);
    } else if (after.fridCount > 0) {
      parts.push("Every mechanism it carried is still covered by another drug, so the shape of the stack does not change.");
    }
    if (before.acbTotal !== after.acbTotal) parts.push(`The ACB total falls from ${before.acbTotal} to ${after.acbTotal}.`);
    if (before.beersCnsActiveCount >= 3 && after.beersCnsActiveCount < 3) {
      parts.push("The tray drops below the Beers 2023 three-CNS-drug line.");
    }
    if (after.fridCount === 0) parts.push("No mapped fall-risk drug is left. That is still not a green light.");
  }

  return { removedId: removeId, removedName, wasFrid, before, after, lostClassIds, lostMechanisms, message: parts.join(" ") };
}

/* ── Report ───────────────────────────────────────────────────────────── */

export interface FridDrugRow {
  id: string;
  name: string;
  classIds: FridClassId[];
  classLabels: string[];
  mechanisms: FallMechanism[];
  /** ACB score from ./acb, when the drug has one. */
  acbScore: number | null;
  /** The Beers row from this drug's clinic card (./clinic), when it has one. */
  beersRow: string | null;
  beersCnsActive: boolean;
}

export interface FridClassRow {
  id: FridClassId;
  label: string;
  mechanisms: FallMechanism[];
  why: string;
  drugIds: string[];
  drugNames: string[];
  deprescribe: DeprescribeQuestions;
  beers: string | null;
  beersCnsActive: boolean;
}

export interface FallMechanismRow {
  id: FallMechanism;
  label: string;
  how: string;
  check: string;
  drugIds: string[];
  drugNames: string[];
}

export interface FallsAcbSummary {
  totalScore: number;
  riskLevel: AcbRiskLevel;
  summary: string;
  contributors: { id: string; name: string; score: number }[];
}

export interface FallsHostView {
  olderAdult: boolean;
  message: string;
}

export interface FallsReport {
  detection: FallsDeskDetection;
  summary: string;
  host: FallsHostView;
  drugs: FridDrugRow[];
  classes: FridClassRow[];
  mechanisms: FallMechanismRow[];
  acb: FallsAcbSummary | null;
  deprescribeQuestions: string[];
  steadi: { questions: SteadiQuestion[]; rule: string };
  notes: string[];
  citations: string[];
  disclaimer: string;
}

export const EMPTY_TRAY_NOTE =
  "No mapped fall-risk drug on the tray. That is not a green light. Falls have many causes (gait, vision, feet, home hazards), the tray may be incomplete, and over-the-counter sleep aids are often missed. STEADI screening still applies to every older adult each year.";

export const STEADI_RULE =
  "CDC STEADI: a yes to any of the three key questions screens the person at risk and leads to an assessment of gait, strength and balance, with a medication review.";

function hostView(host?: HostContext): FallsHostView {
  if (host?.age === "geriatric") {
    return {
      olderAdult: true,
      message:
        "Older adult on the host. This is the population STOPPFall, Beers and STEADI were written for, so each fall-risk drug here counts.",
    };
  }
  return {
    olderAdult: false,
    message:
      "The host is not set to an older adult. STOPPFall, Beers and STEADI are written for adults 65 and older. The mechanisms apply at any age, but read the statements as older-adult teaching.",
  };
}

export function fallsReportOnDesk(ids: string[], host?: HostContext): FallsReport {
  const detection = fallsOnDesk(ids);
  const tray = uniqKnown(ids);
  const hv = hostView(host);

  const drugs: FridDrugRow[] = detection.fridIds.map((id) => {
    const classIds = fridClassesOf(id);
    const acb = acbScoreOf(id);
    return {
      id,
      name: nameOf(id),
      classIds,
      classLabels: classIds.map((c) => FRID_CLASS_BY_ID[c].label),
      mechanisms: fallMechanismsOf(id),
      acbScore: acb > 0 ? acb : null,
      beersRow: clinicFor(id)?.beers ?? null,
      beersCnsActive: isBeersCnsActive(id),
    };
  });

  const classes: FridClassRow[] = detection.classIds.map((cid) => {
    const def = FRID_CLASS_BY_ID[cid];
    const drugIds = detection.fridIds.filter((id) => fridClassesOf(id).includes(cid));
    return {
      id: cid,
      label: def.label,
      mechanisms: def.mechanisms,
      why: def.why,
      drugIds,
      drugNames: drugIds.map(nameOf),
      deprescribe: def.deprescribe,
      beers: def.beers ?? null,
      beersCnsActive: def.beersCnsActive,
    };
  });

  const mechanisms: FallMechanismRow[] = detection.mechanisms.map((m) => {
    const drugIds = detection.fridIds.filter((id) => fallMechanismsOf(id).includes(m));
    const info = FALL_MECHANISMS[m];
    return { id: m, label: info.label, how: info.how, check: info.check, drugIds, drugNames: drugIds.map(nameOf) };
  });

  const acbReport = acbOnDesk(tray);
  const acb: FallsAcbSummary | null = acbReport
    ? {
        totalScore: acbReport.totalScore,
        riskLevel: acbReport.riskLevel,
        summary: acbReport.summary,
        contributors: acbReport.contributors.map((c) => ({ id: c.drugId, name: c.name, score: c.score })),
      }
    : null;

  /* Summary */
  let summary: string;
  if (!detection.hasFrid) {
    summary = EMPTY_TRAY_NOTE;
  } else {
    const mechText = joinNames(detection.mechanisms.map((m) => FALL_MECHANISMS[m].label.toLowerCase()));
    const head = `${plural(detection.fridCount, "fall-risk drug", "fall-risk drugs")} on the tray, across ${plural(
      detection.mechanismCount,
      "mechanism",
      "mechanisms",
    )}: ${mechText}.`;
    const tail = detection.stacked
      ? " Each one adds risk, and they stack. The teaching move is to count them, name the mechanism, and ask the three deprescribing questions for each."
      : " One drug is enough to ask the three deprescribing questions.";
    summary = `${hv.olderAdult ? "Older adult. " : ""}${head}${tail}`;
  }

  /* Notes */
  const notes: string[] = [];
  const inClass = (c: FridClassId) => detection.classIds.includes(c);
  const idsIn = (c: FridClassId) => detection.fridIds.filter((id) => fridClassesOf(id).includes(c));
  const idsWith = (m: FallMechanism) => detection.fridIds.filter((id) => fallMechanismsOf(id).includes(m));

  if (detection.beersCnsStack) {
    notes.push(
      `${detection.beersCnsActiveCount} CNS-active drugs on the tray (${names(detection.beersCnsActiveIds)}). Beers 2023 advises avoiding three or more together and keeping the number to a minimum, because falls rise with each one.`,
    );
  }
  if (inClass("opioid") && inClass("bzra")) {
    notes.push(
      `${names(idsIn("opioid"))} with ${names(idsIn("bzra"))}: Beers 2023 lists opioids with benzodiazepines as a pair to avoid (overdose, respiratory depression). The opioid boxed warning extends to other CNS depressants, Z-drugs included.`,
    );
  }
  if (inClass("opioid") && inClass("gabapentinoid")) {
    notes.push(
      `${names(idsIn("opioid"))} with ${names(idsIn("gabapentinoid"))}: Beers 2023 lists opioids with gabapentinoids as a pair to avoid (severe sedation, respiratory depression), except when moving from an opioid to a gabapentinoid or using one to lower the opioid dose.`,
    );
  }
  const ortho = idsWith("orthostatic");
  if (ortho.length >= 2) {
    notes.push(`${names(ortho)} all drop pressure on standing. STEADI asks for lying and standing blood pressure; this is where it pays off.`);
  }
  const brady = idsWith("bradycardia");
  if (brady.length >= 2) notes.push(`${names(brady)} all slow the heart. Together the slowing stacks; check the pulse.`);
  const lowNa = idsWith("hyponatremia");
  if (lowNa.length >= 2) {
    notes.push(`${names(lowNa)} can each lower sodium. Two together raise the chance; check sodium after starts and dose changes.`);
  }
  if (detection.hasHypoglycemia && inClass("beta-blocker")) {
    notes.push(
      `${names(idsIn("beta-blocker"))} with a glucose-lowering drug: beta-blockers blunt the tremor and racing heart that warn of a low. Sweating is usually preserved.`,
    );
  }
  if (acb && acb.totalScore >= 3) {
    notes.push(`From the ACB module: ${acb.summary} The ACB tab has the full breakdown and alternatives.`);
  }
  const kidneyLow = host?.kidney === "ckd" || (typeof host?.egfr === "number" && host.egfr < 60);
  if (kidneyLow && inClass("gabapentinoid")) {
    notes.push("Kidney flag set. Gabapentin and pregabalin are cleared by the kidney and build up as function falls; the labels adjust for it.");
  }
  if (kidneyLow && (inClass("sulfonylurea") || inClass("insulin"))) {
    notes.push("Kidney flag set. Lower kidney function prolongs sulfonylurea and insulin action, and the lows that come with it.");
  }
  const alcoholOnTray = tray.includes("ethanol");
  const alcoholOnHost = Boolean(host?.alcohol && host.alcohol !== "off");
  if (alcoholOnTray || alcoholOnHost) {
    notes.push(
      `Alcohol ${alcoholOnHost ? "on the host" : "on the tray"} adds sedation and unsteadiness on top of any sedating drug here. It is not counted as a fall-risk drug, but it belongs in the conversation.`,
    );
  }
  if (!detection.hasFrid) notes.push(EMPTY_TRAY_NOTE);

  return {
    detection,
    summary,
    host: hv,
    drugs,
    classes,
    mechanisms,
    acb,
    deprescribeQuestions: [...DEPRESCRIBE_QUESTIONS],
    steadi: { questions: STEADI_QUESTIONS, rule: STEADI_RULE },
    notes,
    citations: FALLS_CITATIONS,
    disclaimer: FALLS_DISCLAIMER,
  };
}
