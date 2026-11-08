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
  /** The pairs the title and blurb set up; workup.test.ts checks that analyze() maps each one. */
  focus: [string, string][];
}

// The unmapped pairs below were checked against FDA label text (api.fda.gov): neither label names the other drug or its class.
// Lists up to wk-epilepsy were checked on 2026-11-05, the rest on 2026-11-07.
export const WORKUP_LISTS: WorkupList[] = [
  { id: "wk-af-warfarin", title: "Atrial fibrillation clinic", blurb: "A rhythm drug is added to an anticoagulant, with an allergy medicine on the list.", drugIds: ["warfarin", "amiodarone", "cetirizine"], focus: [["warfarin", "amiodarone"]] },
  { id: "wk-statin-macrolide", title: "Chest infection in a statin user", blurb: "An antibiotic course starts for a patient on a statin, with an acid reducer and an allergy medicine.", drugIds: ["simvastatin", "clarithromycin", "famotidine", "loratadine"], focus: [["simvastatin", "clarithromycin"]] },
  { id: "wk-rate-control", title: "Heart failure rate control", blurb: "A glycoside and a calcium channel blocker, with a stool softener and an allergy medicine.", drugIds: ["digoxin", "verapamil", "docusate", "cetirizine"], focus: [["digoxin", "verapamil"]] },
  { id: "wk-antiplatelet-ppi", title: "After a stent", blurb: "An antiplatelet drug with stomach protection, an allergy medicine and a stool softener.", drugIds: ["clopidogrel", "omeprazole", "loratadine", "docusate"], focus: [["clopidogrel", "omeprazole"]] },
  { id: "wk-transplant", title: "Kidney transplant follow-up", blurb: "Maintenance immunosuppression plus an antifungal started for a yeast infection.", drugIds: ["tacrolimus", "fluconazole", "docusate", "loratadine"], focus: [["tacrolimus", "fluconazole"]] },
  { id: "wk-linezolid", title: "Resistant infection in a patient with depression", blurb: "An oral antibiotic is started in someone already on an antidepressant.", drugIds: ["linezolid", "sertraline", "cetirizine", "famotidine"], focus: [["linezolid", "sertraline"]] },
  { id: "wk-tb-warfarin", title: "Tuberculosis treatment on an anticoagulant", blurb: "A TB drug starts in a patient who takes warfarin.", drugIds: ["rifampin", "warfarin", "docusate", "loratadine"], focus: [["rifampin", "warfarin"]] },
  { id: "wk-lithium", title: "Mood stabiliser with a sore knee", blurb: "A patient on lithium buys an anti-inflammatory, and also takes an acid reducer and a stool softener.", drugIds: ["lithium", "ibuprofen", "docusate", "famotidine"], focus: [["lithium", "ibuprofen"]] },
  { id: "wk-nitrate", title: "Angina and erectile dysfunction", blurb: "A nitrate and a PDE5 inhibitor, with a stool softener and an asthma controller.", drugIds: ["sildenafil", "nitroglycerin", "docusate", "montelukast"], focus: [["sildenafil", "nitroglycerin"]] },
  { id: "wk-epilepsy", title: "Epilepsy clinic", blurb: "Two antiseizure drugs with an asthma controller and an allergy medicine.", drugIds: ["phenytoin", "valproate", "montelukast", "cetirizine"], focus: [["phenytoin", "valproate"]] },
  { id: "wk-serotonin", title: "Back pain and migraine on an antidepressant", blurb: "A pain medicine is added for back pain in a patient who takes an antidepressant and a migraine medicine, with a stool softener.", drugIds: ["sertraline", "tramadol", "sumatriptan", "docusate"], focus: [["sertraline", "tramadol"], ["tramadol", "sumatriptan"], ["sertraline", "sumatriptan"]] },
  { id: "wk-qt-ward", title: "Pneumonia on the medical ward", blurb: "An older patient on an antibiotic for pneumonia is given medicines for delirium and nausea, with a laxative.", drugIds: ["levofloxacin", "haloperidol", "ondansetron", "polyethylene-glycol-3350"], focus: [["levofloxacin", "haloperidol"], ["levofloxacin", "ondansetron"], ["haloperidol", "ondansetron"]] },
  { id: "wk-doac-inducer", title: "Facial nerve pain and a new clot", blurb: "A patient who takes an anticonvulsant for trigeminal neuralgia starts an anticoagulant for a leg clot, and also uses glaucoma eye drops and a stool softener.", drugIds: ["carbamazepine", "apixaban", "latanoprost", "docusate"], focus: [["carbamazepine", "apixaban"]] },
  { id: "wk-transplant-herbal", title: "Heart transplant patient with low mood", blurb: "A patient on long-term immunosuppression starts an herbal remedy for low mood, with an allergy medicine and a stool softener.", drugIds: ["cyclosporine", "st-johns-wort", "cetirizine", "docusate"], focus: [["cyclosporine", "st-johns-wort"]] },
  { id: "wk-hiv-booster", title: "HIV clinic: hay fever and cholesterol", blurb: "A patient whose single-tablet HIV regimen contains a booster is given a steroid nose spray and a statin, and takes an allergy medicine.", drugIds: ["darunavir-cobicistat-ftc-taf", "fluticasone", "simvastatin", "cetirizine"], focus: [["darunavir-cobicistat-ftc-taf", "fluticasone"], ["darunavir-cobicistat-ftc-taf", "simvastatin"]] },
  { id: "wk-warfarin-antibiotic", title: "Bladder infection in a patient on warfarin", blurb: "An antibiotic is started, and the list also has glaucoma eye drops and a stool softener.", drugIds: ["warfarin", "tmp-smx", "latanoprost", "docusate"], focus: [["warfarin", "tmp-smx"]] },
  { id: "wk-lithium-thiazide", title: "Bipolar disorder with high blood pressure", blurb: "A water tablet is started for blood pressure in a patient on lithium, who also takes an allergy medicine and an acid reducer.", drugIds: ["lithium", "hctz", "loratadine", "famotidine"], focus: [["lithium", "hctz"]] },
  { id: "wk-methotrexate", title: "Rheumatoid arthritis with a skin abscess", blurb: "An antibiotic is started for a skin abscess in a patient on a disease-modifying drug, with an acid reducer and an allergy medicine.", drugIds: ["methotrexate", "tmp-smx", "famotidine", "cetirizine"], focus: [["methotrexate", "tmp-smx"]] },
  { id: "wk-opioid-benzo", title: "Home after spine surgery", blurb: "Two pain medicines and a stool softener are prescribed at discharge for a patient who already takes an anxiety medicine.", drugIds: ["oxycodone", "gabapentin", "alprazolam", "docusate"], focus: [["oxycodone", "alprazolam"], ["gabapentin", "alprazolam"], ["oxycodone", "gabapentin"]] },
  { id: "wk-heart-failure", title: "Heart failure discharge list", blurb: "A newer heart failure tablet is started in hospital; the list also has the ACE inhibitor from home, spironolactone and glaucoma eye drops.", drugIds: ["sacubitril-valsartan", "lisinopril", "spironolactone", "latanoprost"], focus: [["sacubitril-valsartan", "lisinopril"], ["sacubitril-valsartan", "spironolactone"], ["lisinopril", "spironolactone"]] },
];
