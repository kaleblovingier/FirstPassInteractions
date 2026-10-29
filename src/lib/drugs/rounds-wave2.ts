/**
 * Rounds wave 2 — scenario coverage for compounds that were thin or absent in
 * rounds.ts: nitazene-class opioids (metonitazene, protonitazene,
 * isotonitazene), medetomidine, tianeptine, phenibut, tirzepatide, methylene
 * blue, kratom, and tapentadol. Every stem is a recognition/management
 * encounter — ED, ward, clinic, a MAT program, or harm-reduction outreach —
 * never usage, dosing, or combination guidance. Every teach line matches a
 * mechanism engine.ts's analyze() actually computes for these drugIds: a
 * named CYP3A4 PK role, a named PD flag (opioid, alpha2-agonist, maoi,
 * serotonergic, cns-depressant, insulin-secretagogue, etc.), or a bespoke
 * string match already in engine.ts (the methadone-take-home /
 * STREET_FULL_AGONIST branch). No half-life, potency, or AUC figures are
 * invented beyond what the catalog and engine already encode.
 * Stacks on rounds.ts. Educational desk only. Not a dose. PI/FDA/DEA govern.
 */

import type { Round } from "./rounds";

export const ROUNDS_WAVE2: Round[] = [
  {
    id: "r-nitazene-bup-precip",
    title: "The induction that precipitated anyway",
    setting: "mat",
    stem:
      "A bridge clinic times a buprenorphine induction to a clean COWS, the same way it always has. Fifteen minutes in, the patient is retching and crawling out of their skin. The clinic has run this exact protocol for years without this result.",
    ask: "The protocol didn't change. What does the desk say changed?",
    teach:
      "The fold wasn't fentanyl this time — it came back protonitazene, a nitazene-class full μ-agonist. The desk's rule for buprenorphine next to a full agonist doesn't name fentanyl specifically: any full μ-agonist on board gets displaced by buprenorphine's higher receptor affinity, and that displacement is precipitated withdrawal. The protocol wasn't the variable. The supply was.",
    drugIds: ["buprenorphine", "protonitazene"],
    lane: "mat",
    blurb: "Any full agonist, not just fentanyl",
  },
  {
    id: "r-nitazene-methadone-takehome",
    title: "The take-home and the supply that wasn't fentanyl",
    setting: "mat",
    stem:
      "A patient stable on a methadone take-home is found down. Naloxone brings back some respiratory effort. The baggie tests positive for isotonitazene. No fentanyl detected.",
    ask: "Does the take-home get safer because the street opioid wasn't fentanyl?",
    teach:
      "No. The desk treats a methadone take-home plus any illicit full agonist — fentanyl, a nitazene, a dirty 30 — as one stacked μ load, one airway, not two prescriptions. Isotonitazene gets the identical stacked-agonist finding fentanyl would. Naloxone still reverses the μ-agonist; it reverses nothing else that might also be on board. The take-home conversation is about total opioid load, not about matching one named drug.",
    drugIds: ["methadone", "isotonitazene"],
    lane: "mat",
    blurb: "Stacked μ load, whichever nitazene",
  },
  {
    id: "r-metonitazene-medetomidine-street",
    title: "Two reversals in, still not breathing right",
    setting: "street",
    stem:
      "An outreach team gives naloxone twice on scene. Respiratory rate improves to marginal. Heart rate stays in the 40s. The person will not open their eyes or protect their airway. The strip on the fold reads metonitazene and medetomidine — not fentanyl and xylazine.",
    ask: "Same picture as a tranq overdose. Is it the same drug class?",
    teach:
      "Different names, same two mechanisms. Metonitazene is a full μ-agonist — naloxone displaces it, which is why breathing improved. Medetomidine is an α2-agonist, the clinical cousin of xylazine and dexmedetomidine: it sedates and drops heart rate independent of any opioid receptor, and naloxone does nothing to it. The desk flags this pairing exactly the way it flags fentanyl plus xylazine — ventilate and support the airway, don't chase the sedation with more naloxone.",
    drugIds: ["metonitazene", "medetomidine"],
    lane: "street",
    blurb: "Same α2 airway problem, different name",
  },
  {
    id: "r-methylene-blue-ssri-dye",
    title: "The mapping dye that met an SSRI",
    setting: "ward",
    stem:
      "A parathyroid case gets methylene blue for gland localization. The patient has taken sertraline for six years, well documented and unremarkable. Two hours post-op: agitated, clonic jerks in the legs, temperature 39.1°C.",
    ask: "The surgeon used a dye, not a drug. Why is this an MAOI chart?",
    teach:
      "Methylene blue is modeled on this desk as what it pharmacologically is: a reversible MAO-A inhibitor, carrying both the maoi and serotonergic flags, not a dye with no pharmacology of its own. Paired with any serotonergic drug — including a long-stable SSRI — the desk returns the same contraindicated serotonin-syndrome finding it would give phenelzine plus that SSRI. The surgical team needs the medication list before the dye goes in, not a differential after.",
    drugIds: ["methylene-blue", "sertraline"],
    lane: "clinic",
    blurb: "The dye is an MAOI",
  },
  {
    id: "r-methylene-blue-stimulant-shock",
    title: "The vasoplegic shock and the tox screen still pending",
    setting: "ward",
    stem:
      "A patient in refractory vasoplegic shock gets methylene blue after pressors stall. Within the hour, blood pressure spikes rather than settles, heart rate climbing into the 160s. The admission tox screen — sent, not yet back when the dye was pushed — returns positive for methamphetamine.",
    ask: "Methylene blue is supposed to raise a falling pressure. Why did it overshoot this badly?",
    teach:
      "The desk carries methylene blue with the maoi flag, and an MAOI next to a stimulant is its own contraindicated finding — hypertensive crisis — separate from the serotonin-syndrome rule. Methamphetamine is flagged stimulant; the pairing fires the same pressor-crisis logic the desk gives phenelzine plus amphetamine. A tox screen sent is not a tox screen back. If shock is refractory enough to reach for methylene blue, that screen needs to be in hand first.",
    drugIds: ["methylene-blue", "methamphetamine"],
    lane: "entactogen",
    blurb: "MAOI × stimulant, not just SSRI",
  },
  {
    id: "r-suzetrigine-rifampin-failure",
    title: "The non-opioid analgesic that quietly stopped working",
    setting: "clinic",
    stem:
      "Someone recovering from a fasciotomy is doing well on suzetrigine, picked specifically to avoid an opioid. They are also three weeks into a rifampin course for a bone infection. By week two, the suzetrigine is doing nothing and the surgical team is reaching for an opioid after all.",
    ask: "No bleeding, no sedation, no obvious toxicity — so why does the desk still flag this pair?",
    teach:
      "Suzetrigine is a major CYP3A4 substrate. Rifampin is a strong 3A4 inducer. The desk's inducer math doesn't wait for a toxic level to fire: strong induction of a major substrate is a major finding on its own, and the direction here is loss of exposure, not excess. The whole appeal of suzetrigine was skipping an opioid; losing it quietly to an inducer brings the opioid back in by the side door.",
    drugIds: ["suzetrigine", "rifampin"],
    lane: "clinic",
    blurb: "Inducer, not inhibitor — analgesia loss",
  },
  {
    id: "r-tianeptine-ritonavir",
    title: "The gas-station antidepressant and the booster",
    setting: "street",
    stem:
      "Someone using a tianaa product daily starts ritonavir-boosted HIV treatment. The desk lights a major CYP3A4 exposure finding next to the opioid flag. Nobody has a prescribing-information sentence that says ritonavir raises tianeptine.",
    ask: "The chip says major. Is that a labeled interaction?",
    teach:
      "The desk stores tianeptine as a major CYP3A4 substrate, so ritonavir, a strong 3A4 inhibitor, produces a major exposure finding, and the opioid flag still stacks sedation. That CYP3A4 role is not a prescribing-information sentence. The citations on this row support μ-agonist toxicity and withdrawal, not a characterized CYP3A4 pathway. Published clearance is mainly beta-oxidation of the side chain. Read the chip as an unsourced stored grade, not as a labeled interaction.",
    drugIds: ["tianeptine", "ritonavir"],
    lane: "street",
    blurb: "Stored 3A4 grade, not a labeled interaction",
  },
  {
    id: "r-phenibut-oxycodone-supplement",
    title: "The supplement that wasn't on the medication list",
    setting: "street",
    stem:
      "A harm-reduction team meets a client on a long-standing, stable oxycodone prescription who has also been taking phenibut daily, bought online as a nootropic. Nobody — not the pharmacy, not the prescriber — has it on a medication list. Lately they're far more sedated than the oxycodone dose alone explains.",
    ask: "Phenibut isn't a controlled substance here. Does that mean it's off the desk's radar?",
    teach:
      "Phenibut carries only the cns-depressant flag, no CYP role at all — and that's enough. Oxycodone is flagged opioid; the desk's rule for an opioid next to any CNS depressant is additive respiratory depression, graded major, the same tier it gives a gabapentinoid next to an opioid. A 'supplement' with no prescription and no CYP story still stacks onto the same airway. The medication list has to ask the question, because the bottle won't.",
    drugIds: ["phenibut", "oxycodone"],
    lane: "gaba",
    blurb: "No CYP, still a major stack",
  },
  {
    id: "r-tirzepatide-glipizide-hypo",
    title: "The GLP-1 that made the sulfonylurea dangerous",
    setting: "clinic",
    stem:
      "A patient with type 2 diabetes is doing well on long-standing glipizide. Tirzepatide is added for additional glycemic control and weight loss. Two weeks in, they have a shaky, diaphoretic episode at 3 a.m. with a fingerstick in the 50s — something glipizide alone had never caused.",
    ask: "Tirzepatide barely drops glucose on its own. So why the hypoglycemia?",
    teach:
      "Tirzepatide carries no hypoglycemic flag by itself, and the desk is right that it rarely causes lows alone. The finding here is the pairing: a GLP-1/GIP agonist next to an insulin secretagogue is its own moderate finding — stacked hypoglycemia — separate from tirzepatide's solo profile. The sulfonylurea usually needs a downward dose conversation once a GLP-1-class drug joins the regimen. This desk doesn't pick that dose, but it does flag that the conversation is overdue.",
    drugIds: ["tirzepatide", "glipizide"],
    lane: "clinic",
    blurb: "GLP-1 plus secretagogue, not GLP-1 alone",
  },
  {
    id: "r-tapentadol-maoi-washout",
    title: "The pain consult that skipped the washout question",
    setting: "ward",
    stem:
      "Someone admitted for a long-bone fracture mentions, almost as an aside, that they stopped phenelzine nine days ago for depression that 'never really responded anyway.' The pain team starts tapentadol for breakthrough pain. After the first dose: rigidity, fever, a racing heart.",
    ask: "Tapentadol isn't meperidine, and it isn't an SSRI. Why does the desk still call this contraindicated?",
    teach:
      "Tapentadol carries the serotonergic flag alongside opioid — it's a norepinephrine-reuptake-blocking analgesic, not a plain μ-agonist, and the desk treats that serotonergic activity the same way it treats an SSRI's. Any MAOI next to any serotonergic drug is a contraindicated finding, full stop, and nine days is short of the two-week MAOI washout this desk expects before clearing a serotonergic analgesic. The pain team needed the washout date before the first dose, not a differential after.",
    drugIds: ["tapentadol", "phenelzine"],
    lane: "clinic",
    blurb: "Serotonergic enough to contraindicate an MAOI",
  },
  {
    id: "r-kratom-clarithromycin-sedation",
    title: "The macrolide that made the kratom hit different",
    setting: "clinic",
    stem:
      "A patient is prescribed a standard course of clarithromycin for sinusitis. They don't mention, and aren't asked about, the kratom they drink daily for chronic pain. Day three: unusually sedated, slow to respond, family worried enough to call the office.",
    ask: "Clarithromycin and kratom aren't on the same interaction checker most clinics use. Does that mean there's nothing here?",
    teach:
      "Mitragynine, kratom's main alkaloid, is a major CYP3A4 substrate on this desk, carrying opioid, cns-depressant, and serotonergic flags. Clarithromycin is a strong 3A4 inhibitor. Strong inhibition of a major substrate is a major finding: more parent mitragynine, more opioid-like sedation at the same cup count. The desk doesn't need kratom on a pharmacy's formulary to flag it. It only needs kratom on the intake question list.",
    drugIds: ["kratom", "clarithromycin"],
    lane: "clinic",
    blurb: "3A4 inhibitor raises parent mitragynine",
  },
];
