/**
 * Plain medicine lists for Workup: existing catalog ids that are plausibly co-prescribed.
 * Each list has pairs the desk maps and pairs it does not (checked by workup.test.ts), so
 * calling every pair a mapped interaction is never a perfect score. No grade is written here; analyze() decides.
 */
export interface WorkupList {
  id: string;
  title: string;
  blurb: string;
  drugIds: string[];
}

// The unmapped pairs below were checked against FDA label text (api.fda.gov) on 2026-11-05: neither label names the other drug or its class.
export const WORKUP_LISTS: WorkupList[] = [
  { id: "wk-af-warfarin", title: "Atrial fibrillation clinic", blurb: "A rhythm drug is added to an anticoagulant, with an allergy medicine on the list.", drugIds: ["warfarin", "amiodarone", "cetirizine"] },
  { id: "wk-statin-macrolide", title: "Chest infection in a statin user", blurb: "An antibiotic course starts for a patient on a statin, with an acid reducer and an allergy medicine.", drugIds: ["simvastatin", "clarithromycin", "famotidine", "loratadine"] },
  { id: "wk-rate-control", title: "Heart failure rate control", blurb: "A glycoside and a calcium channel blocker, with a stool softener and an allergy medicine.", drugIds: ["digoxin", "verapamil", "docusate", "cetirizine"] },
  { id: "wk-antiplatelet-ppi", title: "After a stent", blurb: "An antiplatelet drug with stomach protection, an allergy medicine and a stool softener.", drugIds: ["clopidogrel", "omeprazole", "loratadine", "docusate"] },
  { id: "wk-transplant", title: "Kidney transplant follow-up", blurb: "Maintenance immunosuppression plus an antifungal started for a yeast infection.", drugIds: ["tacrolimus", "fluconazole", "docusate", "loratadine"] },
  { id: "wk-linezolid", title: "Resistant infection in a patient with depression", blurb: "An oral antibiotic is started in someone already on an antidepressant.", drugIds: ["linezolid", "sertraline", "cetirizine", "famotidine"] },
  { id: "wk-tb-warfarin", title: "Tuberculosis treatment on an anticoagulant", blurb: "A TB drug starts in a patient who takes warfarin.", drugIds: ["rifampin", "warfarin", "docusate", "loratadine"] },
  { id: "wk-lithium", title: "Mood stabiliser with a sore knee", blurb: "A patient on lithium buys an anti-inflammatory, and also takes an acid reducer and a stool softener.", drugIds: ["lithium", "ibuprofen", "docusate", "famotidine"] },
  { id: "wk-nitrate", title: "Angina and erectile dysfunction", blurb: "A nitrate and a PDE5 inhibitor, with a stool softener and an asthma controller.", drugIds: ["sildenafil", "nitroglycerin", "docusate", "montelukast"] },
  { id: "wk-epilepsy", title: "Epilepsy clinic", blurb: "Two antiseizure drugs with an asthma controller and an allergy medicine.", drugIds: ["phenytoin", "valproate", "montelukast", "cetirizine"] },
];
