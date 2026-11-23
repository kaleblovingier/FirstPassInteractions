/**
 * Typical adult elimination half-lives for catalog ids that have no row on the PK shelf (pk.ts).
 * Read only by the timing sketch in overlap.ts. Nothing here changes a severity or a PK curve.
 *
 * Every row names where its number came from: the FDA label's clinical pharmacology text, read
 * through OpenFDA on 2026-11-12 and 2026-11-22, or a PubMed abstract read the same day. The comment above each row
 * quotes the sentence. Rules for the number:
 * - the label's typical value when it states one;
 * - otherwise the top of the stated range, so the sketch never understates what is left;
 * - when formulations differ, the longest stated value, since the desk does not know which was taken.
 */

export interface HalfLifeRow {
  /** Typical adult elimination half-life, in hours. */
  hours: number;
  /** Where the number came from: a label section or a PubMed id. */
  source: string;
}

const LABEL = "FDA label, clinical pharmacology";

/** Keyed by catalog id. The PK shelf wins when both have a row. */
export const HALF_LIVES: Record<string, HalfLifeRow> = {
  // "The average terminal elimination half-life of plasma sertraline is about 26 hours."
  // set_id 00179766-980b-44b0-99d3-1fee2bb27e37 (2019-11-01)
  sertraline: { hours: 26, source: LABEL },
  // "...a mean terminal half-life of about 27-32 hours." set_id 0458445b-e431-4c82-86b8-90373813c10a
  escitalopram: { hours: 32, source: `${LABEL}: 27 to 32 hours; the top is used` },
  // "The mean elimination half-life is approximately 21 hours (CV 32%)..."
  // set_id 009d8b89-eab9-43ba-b077-86bfa993a745 (2026-07-08)
  paroxetine: { hours: 21, source: LABEL },
  // "Duloxetine has an elimination half-life of about 12 hours (range 8 to 17 hours)..."
  // set_id 00628e5e-4c5b-2573-e063-6294a90a0e3b (2026-08-20)
  duloxetine: { hours: 12, source: `${LABEL}: about 12 hours, range 8 to 17` },
  // "Mirtazapine has a half-life of about 20 to 40 hours following oral administration..."
  // set_id 0f19ab40-1a30-4ac2-9bd7-c2f8199e29e1 (2022-08-01)
  mirtazapine: { hours: 40, source: `${LABEL}: 20 to 40 hours; the top is used` },
  // "The mean elimination half-life for d-amphetamine is 10 hours in adults..." / "For the
  // l-amphetamine, the mean elimination half-life in adults is 13 hours..."
  // mixed amphetamine salts, set_id 084c625c-94c6-4c8a-ba5f-6e26206dd903 (2026-06-18)
  amphetamine: { hours: 13, source: `${LABEL}: d-amphetamine 10 hours, l-amphetamine 13; the longer is used` },
  // "The biological half-life has been reported in the range of 4 to 5 hours."
  // set_id 90c02ac6-e5e2-4c97-8c68-81e4e389a195 (2024-09-30)
  methamphetamine: { hours: 5, source: `${LABEL}: 4 to 5 hours; the top is used` },
  // "...extended-release capsules (t1/2=6.8 hours) is longer than ... immediate-release tablets
  // (t1/2=2.9 hours)..." set_id 10aa0dc0-bd0e-4927-a19a-8722d78ad67d (2026-05-27)
  methylphenidate: {
    hours: 6.8,
    source: `${LABEL}: 2.9 hours immediate release, 6.8 extended release; the longer is used`,
  },
  // "The effective terminal half-life of morphine sulfate after IV administration is reported to be
  // approximately 2 hours." set_id 07593aa4-f2c4-4d6e-b186-ab2a4ecaa38a (2025-10-10)
  morphine: { hours: 2, source: `${LABEL}: effective half-life about 2 hours` },
  // "The terminal elimination half-life of hydromorphone after an intravenous dose is about 2.3 hours."
  // set_id 18f6f54e-1537-4181-9d07-54ddf881a9ee (2025-12-04)
  hydromorphone: { hours: 2.3, source: LABEL },
  // "Half-life ranges from approximately 9-11 hours after a single oral dose (5-40 mg)."
  // set_id 06af7dff-c261-4c03-9cd9-0605c42507fa (2025-08-18)
  oxymorphone: { hours: 11, source: `${LABEL}: 9 to 11 hours; the top is used` },
  // "The terminal half-life is on average 5 hours after oral administration."
  // set_id 38de863e-56ff-4c43-9ab8-9b3e1ba82858 (2026-02-26)
  tapentadol: { hours: 5, source: LABEL },
  // "The elimination half-life of clonazepam is typically 30 to 40 hours."
  // set_id 00f323c0-e007-40df-ae7f-e6b3c7ba0aa8 (2026-03-16)
  clonazepam: { hours: 40, source: `${LABEL}: 30 to 40 hours; the top is used` },
  // "The mean half-life of unconjugated lorazepam in human plasma is about 12 hours..."
  // set_id 00960fbd-a5da-408b-9867-62982f20906f (2025-07-24)
  lorazepam: { hours: 12, source: LABEL },
  // "...the terminal half-life from 3.5 to 18.4 hours (mean 8.8 hours)..."
  // set_id 066e25b2-8a1b-4b08-b585-ce36753bf104 (2024-12-11)
  temazepam: { hours: 8.8, source: `${LABEL}: mean 8.8 hours, range 3.5 to 18.4` },
  // "Gabapentin elimination half-life is 5 to 7 hours and is unaltered by dose..."
  // set_id 01b810b7-f4c8-4412-bbc5-b9220d8770d8 (2024-04-02)
  gabapentin: {
    hours: 7,
    source: `${LABEL}: 5 to 7 hours with normal kidney function; the top is used`,
  },
  // "...a mean elimination half-life of 6.3 hours in subjects with normal renal function."
  // set_id 0101cd1f-4a95-40e9-86a8-ccde8d656e3d (2025-09-23)
  pregabalin: { hours: 6.3, source: `${LABEL}: with normal kidney function` },
  // "The elimination half-life of lithium is approximately 18 to 36 hours."
  // set_id 01c4facd-ed79-4078-ba33-2044de372d0f (2026-04-27)
  lithium: { hours: 36, source: `${LABEL}: 18 to 36 hours; the top is used` },
  // "GHB has an elimination half-life of 0.5 to 1 hour."
  // sodium oxybate (Lumryz), set_id 10e5e40c-52f3-4c73-8a34-2c29c690a934 (2026-09-08)
  "sodium-oxybate": { hours: 1, source: `${LABEL}: 0.5 to 1 hour; the top is used` },
  // "...an effective half-life of 18 hours (range 8 to 37 hours; n = 18)..."
  // set_id 00b20a8c-debd-e930-e063-6394a90a7ed0 (2026-05-20)
  cyclobenzaprine: { hours: 18, source: `${LABEL}: effective half-life 18 hours, range 8 to 37` },
  // "Elimination half-lives were 3.7 h (3.4-4.1) and 4.0 h (3.6-4.4), for 85 and 170 μg LSD"
  lsd: { hours: 4, source: "PMID 37596682: 3.7 and 4.0 hours at two doses; the longer is used" },
  // "Elimination half-life varied across studies, ranging from 1.5 to 4 h." (systematic review)
  psilocybin: { hours: 4, source: "PMID 40284409: 1.5 to 4 hours across studies; the top is used" },
  // "Apixaban has a total clearance of approximately 3.3 L/hour and an apparent half-life of
  // approximately 12 hours following oral administration."
  // Eliquis, set_id 1523ab32-2c2c-6501-e063-6394a90aa0b3 (2025-02-03)
  apixaban: { hours: 12, source: LABEL },
  // "The terminal elimination half-life of rivaroxaban is 5 to 9 hours in healthy subjects aged 20
  // to 45 years." Xarelto, set_id 10db92f9-2300-4a80-836b-673e1ae91610 (2026-09-10)
  rivaroxaban: { hours: 9, source: `${LABEL}: 5 to 9 hours in healthy adults; the top is used` },
  // "The half-life of dabigatran in healthy adult subjects is 12 to 17 hours."
  // Pradaxa, set_id ba74e3cd-b06f-4145-b284-5fd6b84ff3c9 (2025-06-25)
  dabigatran: { hours: 17, source: `${LABEL}: 12 to 17 hours in healthy adults; the top is used` },
  // "The terminal elimination half-life of edoxaban following oral administration is 10 to 14 hours."
  // Savaysa, set_id e77d3400-56ad-11e3-949a-0800200c9a66 (2025-07-10)
  edoxaban: { hours: 14, source: `${LABEL}: 10 to 14 hours; the top is used` },
  // "The mean elimination half-life of sotalol is 12 hours."
  // Betapace, set_id a6a7702f-36c9-45db-b640-453dc324baee (2024-12-16)
  sotalol: { hours: 12, source: LABEL },
  // "The terminal half-life of dofetilide is approximately 10 hours; steady state plasma
  // concentrations are attained within 2-3 days, with an accumulation index of 1.5 to 2.0."
  // Tikosyn, set_id 02438044-d6a3-49e9-a1ac-3aad21ef2c8c (2026-04-21)
  dofetilide: { hours: 10, source: LABEL },
  // "Its elimination half-life is 13 to 19 hours."
  // Multaq, set_id 3bd4006a-8bad-4909-ac6d-b6d84390155c (2026-01-27)
  dronedarone: { hours: 19, source: `${LABEL}: 13 to 19 hours; the top is used` },
  // "The apparent plasma half-life averages about 20 hours and is quite variable (range, 12 to 27
  // hours) after multiple oral doses in patients with premature ventricular contractions (PVCs)."
  // set_id 166aa9e4-3402-4ebd-baa5-07a8da8aae56 (2026-01-06)
  flecainide: { hours: 20, source: `${LABEL}: averages about 20 hours, range 12 to 27` },
  // "The mean elimination half-life of metoprolol is 3 to 4 hours; in poor CYP2D6 metabolizers
  // the half-life may be 7 to 9 hours." Lopressor, set_id 0283bc9d-6998-493a-824a-d4c85f704111
  // (2023-09-14); extended-release succinate states "3 to 7 hours" (set_id 496ddfaa-7c9c-4888-b747-a210249b367a)
  metoprolol: {
    hours: 9,
    source: `${LABEL}: 3 to 4 hours in extensive metabolizers, 7 to 9 hours in CYP2D6 poor metabolizers; the top is used`,
  },
  // "Following oral administration, the apparent mean terminal elimination half-life of carvedilol
  // generally ranges from 7 to 10 hours." Coreg, set_id 07c619c6-4a0c-445e-94fa-664a54f68a39 (2026-07-31)
  carvedilol: { hours: 10, source: `${LABEL}: 7 to 10 hours; the top is used` },
  // "The elimination half-life of rosuvastatin is approximately 19 hours."
  // Crestor, set_id 325a5d0e-9a72-4015-9fcd-1655fb504cee (2026-09-23)
  rosuvastatin: { hours: 19, source: LABEL },
  // "The terminal half-life of furosemide is approximately 2 hours."
  // Lasix, set_id 2c9b4d8f-0770-482d-a9e6-9c616a440b1a (2025-09-30)
  furosemide: { hours: 2, source: LABEL },
  // "Upon multiple dosing, lisinopril exhibits an effective half-life of 12 hours."
  // Zestril, set_id 838c2d78-d2d8-4981-9ec9-e50ef9e1a5d8 (2025-01-02)
  lisinopril: { hours: 12, source: `${LABEL}: effective half-life 12 hours` },
  // "The half-life of elimination ranges from 2 to 4 hours in normal subjects, whether given
  // intravenously or orally." (set_id 00729e82-150a-464a-abe7-a3319721fbdb, 2026-08-27) /
  // "The mean terminal elimination half-life of glipizide ranged from 2 to 5 hours after single or
  // multiple doses in patients with type 2 diabetes mellitus."
  // Glucotrol XL, set_id eed99b60-d043-4249-9b2a-f05e46fb588d (2026-07-21)
  glipizide: {
    hours: 5,
    source: `${LABEL}: 2 to 4 hours immediate release, 2 to 5 hours extended release; the top is used`,
  },
  // "The apparent terminal elimination half-life of empagliflozin was estimated to be 12.4 h and
  // apparent oral clearance was 10.6 L/h based on the population pharmacokinetic analysis."
  // Jardiance, set_id 334f1b3d-5670-6685-e063-6294a90a7e47 (2026-06-17)
  empagliflozin: { hours: 12.4, source: LABEL },
  // "Following oral administration, approximately 90% of the absorbed drug is eliminated via the
  // renal route within the first 24 hours, with a plasma elimination half-life of approximately 6.2
  // hours. In blood, the elimination half-life is approximately 17.6 hours..."
  // set_id 014f2a32-8440-4d0c-8f5d-c4b3a49e0dec (2026-09-21)
  metformin: { hours: 6.2, source: `${LABEL}: plasma elimination half-life 6.2 hours (blood 17.6)` },
  // "The elimination half-life of clarithromycin was about 3 hours to 4 hours with 250 mg
  // administered every 12 hours but increased to 5 hours to 7 hours with 500 mg administered every
  // 8 hours to 12 hours." set_id 0be243c6-de02-45dd-8210-cab1bbc8dfa7 (2026-11-09)
  clarithromycin: {
    hours: 7,
    source: `${LABEL}: 3 to 4 hours at lower dose, 5 to 7 hours at higher dose; the top is used`,
  },
  // "Plasma concentrations of azithromycin following single 500 mg oral and IV doses declined in a
  // polyphasic pattern resulting in a mean apparent plasma clearance of 630 mL/min and terminal
  // elimination half-life of 68 hr." set_id 003307c5-3f73-4a5d-a704-bfdea3c656e8 (2026-03-16)
  azithromycin: { hours: 68, source: LABEL },
  // "The mean terminal plasma elimination half-life of levofloxacin ranges from approximately 6 to
  // 8 hours following single or multiple doses of levofloxacin given orally or intravenously."
  // set_id 05d179f5-b200-8597-e063-6394a90a10cc (2025-03-04)
  levofloxacin: { hours: 8, source: `${LABEL}: 6 to 8 hours; the top is used` },
  // "Peak plasma concentrations (C max ) in fasted normal volunteers occur between 1 and 2 hours
  // with a terminal plasma elimination half-life of approximately 30 hours (range: 20 to 50 hours)
  // after oral administration." set_id 01df20c4-7b94-044e-e063-6394a90a406a (2025-11-17)
  fluconazole: { hours: 30, source: `${LABEL}: about 30 hours, range 20 to 50` },
  // "The mean elimination half-life of vancomycin from plasma is 4 to 6 hours in subjects with
  // normal renal function." IV vancomycin, set_id 0543b2b5-b1c7-4ad6-b38c-3be0086f0e06 (2025-12-23)
  vancomycin: {
    hours: 6,
    source: `${LABEL}: 4 to 6 hours with normal kidney function; the top is used`,
  },
  // "Mean terminal half-life for valproate monotherapy ranged from 9 to 16 hours following oral
  // dosing regimens of 250 to 1,000 mg." Depakote, set_id 08a65cf4-7749-4ceb-6895-8f4805e2b01f (2026-03-31)
  valproate: { hours: 16, source: `${LABEL}: 9 to 16 hours on monotherapy; the top is used` },
  // "Levetiracetam plasma half-life in adults is 7 ± 1 hour and is unaffected by either dose or
  // repeated administration." set_id 02e237ff-a3e0-40fe-a3d0-9d8802855c71 (2026-03-23)
  levetiracetam: { hours: 7, source: LABEL },
  // "The mean plasma elimination half-life is 21 hours after single or multiple doses."
  // (set_id 021005ab-6a00-40d8-9aee-20c91613b4d5, 2026-06-08) / "The mean elimination half-life of
  // topiramate was approximately 31 hours following repeat administration of TROKENDI XR."
  // (set_id 2dc7957e-a3e5-46bb-aa66-f3250f872f5e, 2026-10-05) / "The mean effective half-life of
  // QUDEXY XR is approximately 56 hours." set_id 46f54677-3a22-4c38-9b92-923020164e15 (2026-09-03)
  topiramate: {
    hours: 56,
    source: `${LABEL}: 21 hours immediate release, 31 to 56 hours extended release; the longest is used`,
  },
  // "The mean elimination half-life of everolimus is approximately 30 hours." (Afinitor,
  // set_id 2150f73a-179b-4afc-b8ce-67c85cc72f04, 2026-06-01) / "...30 ± 11 hours (range: 19 to 53
  // hours)." Zortress, set_id e082a024-7850-400b-a5c2-2a140612562a (2026-09-16)
  everolimus: { hours: 30, source: `${LABEL}: about 30 hours, range 19 to 53` },
  // "The mean plasma half-life of fluvoxamine at steady state after multiple oral doses of 100 mg/day
  // in healthy, young volunteers was 15.6 hours." (set_id 0b107225-ed5a-4461-9184-f3f2bad1892f,
  // 2026-06-19) / "After administration of a 100 mg, single oral dose of fluvoxamine maleate
  // extended-release capsules, the mean plasma half-life of fluvoxamine in healthy male and female
  // volunteers was 16.3 hours." set_id 0a6836ab-bd0e-410b-82af-07720e386532 (2025-11-04)
  fluvoxamine: {
    hours: 16.3,
    source: `${LABEL}: 15.6 hours immediate release, 16.3 extended release; the longer is used`,
  },
  // "The serum half-life of digoxin in pediatric patients is reported to be 18 to 36 hours, and in
  // adults it is typically 36 to 48 hours." set_id 1b7e5c6e-e052-41b0-a4ce-05dfe62faaaf (2025-04-10)
  digoxin: {
    hours: 48,
    source: `${LABEL}: 36 to 48 hours in adults with normal kidney function; the top is used`,
  },
  // "The serum elimination half-life in subjects with normal renal function is approximately 4
  // hours." (Cipro oral, set_id 888dc7f9-ad9c-4c00-8d50-8ddfd9bd27c0, 2026-03-02) / "The serum
  // elimination half-life is approximately 5 to 6 hours and the total clearance is around 35 L/hr."
  // IV ciprofloxacin, set_id 42c758be-4d44-018a-e063-6294a90ae041 (2025-11-04)
  ciprofloxacin: {
    hours: 6,
    source: `${LABEL}: about 4 hours oral, 5 to 6 hours intravenous; the longest is used`,
  },
  // Table 8 (Mean Pharmacokinetic Parameters of Linezolid in Adults): mean t1/2 is 4.26 h (single
  // oral 600 mg), 4.40 h (single IV 600 mg), 4.80 h (IV every 12 hours), and 5.40 h (oral 600 mg
  // every 12 hours). Zyvox, set_id 3e5e9975-6f36-42e4-ab46-0e75dda83592 (2026-07-09)
  linezolid: {
    hours: 5.4,
    source: `${LABEL}: 4.3 to 5.4 hours across adult oral and IV regimens; the top is used`,
  },
  // "No clinically significant difference in pharmacokinetics of trazodone was observed between
  // RALDESY and immediate-release trazodone hydrochloride tablet administered under fed conditions."
  // / "The average terminal elimination half-life of RALDESY under fed state is 18 hours."
  // Raldesy oral solution, set_id 34708cc1-b0b2-4fd0-b9f3-7f008b457fc9 (2026-09-01)
  trazodone: {
    hours: 18,
    source: `${LABEL}: oral solution under fed state (matched fed immediate-release tablet)`,
  },
};

const MAOI_NOTE =
  "Irreversible MAO inhibition outlasts the drug itself, so the label's washout clock on the check governs, not this sketch.";

/**
 * Ids where one half-life would mislead, with the sentence the sketch shows instead. These get no
 * share-left bar and no percent.
 */
export const NO_SINGLE_HALF_LIFE: Record<string, string> = {
  ethanol:
    "Ethanol is cleared at a roughly fixed amount per hour, not a fixed share, so a half-life sketch would mislead.",
  heroin:
    "Heroin is turned into 6-MAM and then morphine, which carry most of its effect, so its own half-life would understate what is left.",
  // "The mean elimination half-life (T 1/2) values for naltrexone and 6-β-naltrexol are 4 hours and
  // 13 hours, respectively." set_id 00c04ff4-b6f2-466c-9ab9-813a60577db0 (2023-12-15)
  naltrexone:
    "Its active metabolite, 6-beta-naltrexol, outlasts it (13 versus 4 hours on the label), so the parent half-life would understate what is left.",
  phenelzine: MAOI_NOTE,
  tranylcypromine: MAOI_NOTE,
  isocarboxazid: MAOI_NOTE,
  // "As a result of non-linear pharmacokinetics, the terminal half-life of voriconazole is dose
  // dependent and therefore not useful in predicting the accumulation or elimination of
  // voriconazole." VFEND, set_id 08d08721-1f4c-478a-8abf-d9c402d50553 (2026-03-20)
  voriconazole:
    "Voriconazole follows non-linear, saturable pharmacokinetics whose apparent terminal half-life depends on dose, so the label states it is not useful for predicting accumulation or elimination.",
  // "Because phenytoin is hydroxylated in the liver by an enzyme system which is saturable at high
  // serum levels, small incremental doses may increase the half-life and produce very substantial
  // increases in serum levels, when these are in the upper range."
  // Dilantin, set_id 86dd27d1-9cee-48ae-b55d-e2d2f7dbc593 (2023-08-21)
  phenytoin:
    "Phenytoin follows saturable Michaelis-Menten hepatic elimination, so its apparent half-life lengthens as serum concentration rises and one number would mislead.",
  // "In patients, following discontinuation of chronic oral therapy, amiodarone hydrochloride has been
  // shown to have a biphasic elimination with an initial 50% reduction of plasma levels after 2.5 to
  // 10 days. A much slower terminal plasma-elimination phase shows a half-life of the parent
  // compound ranging from 26 to 107 days, with a mean of approximately 53 days..."
  // Pacerone, set_id 02f4a736-63ed-4ad4-a1f1-b21a71e928bd (2024-02-02)
  amiodarone:
    "Amiodarone has biphasic tissue distribution with a terminal half-life spanning weeks to months (26 to 107 days on the label alongside an active metabolite), so a short decay bar would understate lingering exposure.",
  // "The mean half-life of spironolactone is 1.4 hour. The mean half-life values of its metabolites
  // including canrenone, 7-α-(thiomethyl) spirolactone (TMS), and 6-ß-hydroxy-7-α-(thiomethyl)
  // spirolactone (HTMS) are 16.5, 13.8, and 15 hours, respectively."
  // set_id 08738ad4-1607-4d55-af71-6790477353bd (2026-10-08)
  spironolactone:
    "Its active metabolites, led by canrenone and 7-alpha-thiomethylspironolactone, far outlast parent spironolactone (around 14 to 17 versus 1.4 hours on the label), so the parent half-life would understate what is left.",
  // "It is converted, in part, to an active carboxylic acid metabolite that is responsible for most
  // of the angiotensin II receptor antagonism that follows losartan treatment." / "The terminal
  // half-life of losartan is about 2 hours and of the metabolite is about 6-9 hours."
  // Cozaar, set_id 9949448f-c3b9-44ee-94ed-c1aca8c90f39 (2026-01-20)
  losartan:
    "Its active carboxylic acid metabolite (E-3174) carries most of the receptor blockade and outlasts parent losartan (6 to 9 versus about 2 hours on the label), so the parent half-life would understate what is left.",
  // "The antisecretory effect thus lasts far longer than would be expected from the very short
  // (less than one hour) plasma half-life, apparently due to prolonged binding to the parietal
  // H+/K+ ATPase enzyme. When the drug is discontinued, secretory activity returns gradually, over
  // 3 to 5 days." Prilosec, set_id b6761f84-53ac-4745-a8c8-1e5427d7e179 (2024-03-19)
  omeprazole:
    "Irreversible binding to the parietal proton pump keeps acid suppression active for 3 to 5 days despite a plasma half-life under 1 hour on the label, so a plasma decay bar would understate its effect.",
  // "Following oral or intravenous administration, the serum concentration of pantoprazole declines
  // biexponentially, with a terminal elimination half-life of approximately one hour." / "The
  // duration of action of PROTONIX I.V. was 24 hours."
  // Protonix Delayed-Release, set_id 08098cb2-c048-4640-f387-6beec4a38936 (2026-05-18)
  pantoprazole:
    "Irreversible binding to the parietal proton pump sustains acid suppression well past its roughly 1-hour plasma half-life on the label, so a plasma decay bar would understate its effect.",
};
