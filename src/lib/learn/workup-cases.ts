/**
 * Plain medicine lists for Workup: existing catalog ids that are plausibly co-prescribed.
 * Each list has pairs the desk maps and pairs it does not (checked by workup.test.ts), so
 * calling every pair an interaction over-calls. No grade is written here; analyze() decides.
 */
export interface WorkupList {
  id: string;
  title: string;
  blurb: string;
  drugIds: string[];
}

export const WORKUP_LISTS: WorkupList[] = [
  { id: "wk-af-warfarin", title: "Atrial fibrillation clinic", blurb: "A rhythm drug is added to an anticoagulant, alongside two everyday chronic medicines.", drugIds: ["warfarin", "amiodarone", "metformin", "lisinopril"] },
  { id: "wk-statin-macrolide", title: "Chest infection in a statin user", blurb: "An antibiotic course starts for a patient on a statin and a calcium channel blocker.", drugIds: ["simvastatin", "clarithromycin", "amlodipine", "metformin"] },
  { id: "wk-rate-control", title: "Heart failure rate control", blurb: "A glycoside and a calcium channel blocker, with a statin and a diabetes medicine on the list.", drugIds: ["digoxin", "verapamil", "atorvastatin", "metformin"] },
  { id: "wk-antiplatelet-ppi", title: "After a stent", blurb: "Dual antiplatelet therapy with a stomach-protection drug and a statin.", drugIds: ["clopidogrel", "omeprazole", "aspirin", "atorvastatin"] },
  { id: "wk-transplant", title: "Kidney transplant follow-up", blurb: "Maintenance immunosuppression plus an antifungal started for a yeast infection.", drugIds: ["tacrolimus", "fluconazole", "prednisone", "mycophenolate"] },
  { id: "wk-linezolid", title: "Resistant infection in a patient with depression", blurb: "An oral antibiotic is started in someone already on an antidepressant.", drugIds: ["linezolid", "sertraline", "metformin", "amlodipine"] },
  { id: "wk-tb-warfarin", title: "Tuberculosis treatment on an anticoagulant", blurb: "A standard TB regimen starts in a patient who takes warfarin.", drugIds: ["rifampin", "warfarin", "isoniazid", "pyridoxine"] },
  { id: "wk-lithium", title: "Mood stabiliser with a sore knee", blurb: "A patient on lithium also takes a blood pressure drug and buys an anti-inflammatory.", drugIds: ["lithium", "ibuprofen", "lisinopril", "metformin"] },
  { id: "wk-rheum", title: "Rheumatology clinic", blurb: "A disease-modifying drug with vitamin support, an anti-inflammatory and acid suppression.", drugIds: ["methotrexate", "ibuprofen", "folic-acid", "omeprazole"] },
  { id: "wk-pain", title: "Post-operative pain plan", blurb: "An opioid, a nerve-pain drug, a simple analgesic and a stool softener.", drugIds: ["oxycodone", "gabapentin", "acetaminophen", "docusate"] },
  { id: "wk-thyroid", title: "Hypothyroidism with reflux", blurb: "Thyroid replacement alongside a calcium supplement, acid suppression and a diabetes medicine.", drugIds: ["levothyroxine", "calcium", "omeprazole", "metformin"] },
  { id: "wk-epilepsy", title: "Epilepsy clinic", blurb: "Three antiseizure drugs with a vitamin supplement.", drugIds: ["phenytoin", "valproate", "levetiracetam", "folic-acid"] },
  { id: "wk-oncology", title: "Breast cancer supportive care", blurb: "Hormonal therapy with an antidepressant, an anti-nausea drug and a simple analgesic.", drugIds: ["tamoxifen", "paroxetine", "ondansetron", "acetaminophen"] },
  { id: "wk-nitrate", title: "Angina and erectile dysfunction", blurb: "A nitrate and a PDE5 inhibitor on the same list as two routine chronic medicines.", drugIds: ["sildenafil", "nitroglycerin", "metformin", "lisinopril"] },
];
