/**
 * Sample regimens wave 2 — quick-reference cards for compounds thin or absent
 * in samples.ts: nitazene-class opioids, methylene blue, phenibut,
 * tirzepatide, suzetrigine, and tapentadol, spread across lanes that had no
 * row for them yet (street, mat, entactogen, gaba, clinic). Every blurb
 * matches a mechanism engine.ts's analyze() actually computes for the listed
 * drugIds — a named CYP3A4 PK role or a named PD flag (opioid, maoi,
 * stimulant, cns-depressant, insulin-secretagogue, partial-opioid) — not an
 * invented pharmacology claim.
 * Stacks on samples.ts. Educational desk only. Not a dose. PI/FDA/DEA govern.
 */

import type { SampleRegimen } from "./samples";

export const SAMPLE_REGIMENS_WAVE2: SampleRegimen[] = [
  {
    id: "metonitazene-bromazolam",
    title: "Metonitazene + bromazolam",
    blurb: "Nitazene-class opioid × designer benzo — same FDA boxed-warning airway risk as any opioid-benzo pair",
    drugIds: ["metonitazene", "bromazolam"],
    lane: "street",
  },
  {
    id: "protonitazene-naltrexone",
    title: "Protonitazene + naltrexone",
    blurb: "A nitazene full agonist meets an antagonist already on the receptor — precipitated withdrawal or blocked effect, not a stronger high",
    drugIds: ["protonitazene", "naltrexone"],
    lane: "mat",
  },
  {
    id: "methylene-blue-cocaine",
    title: "Methylene blue + cocaine",
    blurb: "An MAOI-class antidote next to a stimulant — hypertensive crisis, not just a serotonin-syndrome story",
    drugIds: ["methylene-blue", "cocaine"],
    lane: "entactogen",
  },
  {
    id: "phenibut-alprazolam",
    title: "Phenibut + alprazolam",
    blurb: "Two GABA-ergic sedatives with no CYP role between them — additive sedation an interaction checker keyed to CYP alone can miss",
    drugIds: ["phenibut", "alprazolam"],
    lane: "gaba",
  },
  {
    id: "tirzepatide-insulin-glargine",
    title: "Tirzepatide + insulin glargine",
    blurb: "GLP-1/GIP agonist next to basal insulin — stacked hypoglycemia, not a tirzepatide-alone risk",
    drugIds: ["tirzepatide", "insulin-glargine"],
    lane: "clinic",
  },
  {
    id: "suzetrigine-fluconazole",
    title: "Suzetrigine + fluconazole",
    blurb: "A moderate 3A4 inhibitor, not a strong one — a smaller exposure rise than the clarithromycin pairing, still worth a look",
    drugIds: ["suzetrigine", "fluconazole"],
    lane: "clinic",
  },
  {
    id: "tapentadol-buprenorphine",
    title: "Tapentadol + buprenorphine",
    blurb: "A full-agonist analgesic layered onto stable buprenorphine — occupancy conflict, not better pain control",
    drugIds: ["tapentadol", "buprenorphine"],
    lane: "mat",
  },
];
