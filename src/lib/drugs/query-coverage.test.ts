import test from "node:test";
import assert from "node:assert/strict";
import { searchDrugs } from "./catalog";
import { findCombination } from "./combos";
import { resolveDrugQuery } from "../server/api/cds-service";

/**
 * Names US outpatient, ED, and pharmacy staff actually type, run through the desk search and the
 * API resolver. `want` is "a" (that row), "a|b" (either row), "a+b" (every row of a combination,
 * any order), or "" (catalog gap: no row should be added, so it always counts as a miss).
 */
const QUERIES: [query: string, want: string, kind: string][] = [
  // Top generics
  ["atorvastatin", "atorvastatin", "generic"],
  ["levothyroxine", "levothyroxine", "generic"],
  ["lisinopril", "lisinopril", "generic"],
  ["metformin", "metformin", "generic"],
  ["amlodipine", "amlodipine", "generic"],
  ["metoprolol", "metoprolol", "generic"],
  ["albuterol", "albuterol", "generic"],
  ["omeprazole", "omeprazole", "generic"],
  ["losartan", "losartan", "generic"],
  ["gabapentin", "gabapentin", "generic"],
  ["hydrochlorothiazide", "hctz", "generic"],
  ["sertraline", "sertraline", "generic"],
  ["simvastatin", "simvastatin", "generic"],
  ["montelukast", "montelukast", "generic"],
  ["escitalopram", "escitalopram", "generic"],
  ["rosuvastatin", "rosuvastatin", "generic"],
  ["bupropion", "bupropion", "generic"],
  ["furosemide", "furosemide", "generic"],
  ["pantoprazole", "pantoprazole", "generic"],
  ["trazodone", "trazodone", "generic"],
  ["fluticasone", "fluticasone", "generic"],
  ["tamsulosin", "tamsulosin", "generic"],
  ["fluoxetine", "fluoxetine", "generic"],
  ["carvedilol", "carvedilol", "generic"],
  ["duloxetine", "duloxetine", "generic"],
  ["meloxicam", "meloxicam", "generic"],
  ["clopidogrel", "clopidogrel", "generic"],
  ["prednisone", "prednisone", "generic"],
  ["insulin glargine", "insulin-glargine", "generic"],
  ["tramadol", "tramadol", "generic"],
  ["cyclobenzaprine", "cyclobenzaprine", "generic"],
  ["zolpidem", "zolpidem", "generic"],
  ["ondansetron", "ondansetron", "generic"],
  ["spironolactone", "spironolactone", "generic"],
  ["lamotrigine", "lamotrigine", "generic"],
  ["alprazolam", "alprazolam", "generic"],
  ["warfarin", "warfarin", "generic"],
  ["apixaban", "apixaban", "generic"],
  ["quetiapine", "quetiapine", "generic"],
  ["amoxicillin", "amoxicillin", "generic"],
  ["azithromycin", "azithromycin", "generic"],
  ["cephalexin", "cephalexin", "generic"],
  ["doxycycline", "doxycycline", "generic"],
  ["ciprofloxacin", "ciprofloxacin", "generic"],
  ["nitrofurantoin", "nitrofurantoin", "generic"],
  ["semaglutide", "semaglutide", "generic"],
  ["oxycodone", "oxycodone", "generic"],
  ["buprenorphine", "buprenorphine", "generic"],
  ["methadone", "methadone", "generic"],
  ["ceftriaxone", "ceftriaxone", "generic"],
  ["alteplase", "", "generic"],
  // Single-ingredient brands
  ["Lipitor", "atorvastatin", "brand"],
  ["Synthroid", "levothyroxine", "brand"],
  ["Zestril", "lisinopril", "brand"],
  ["Glucophage", "metformin", "brand"],
  ["Norvasc", "amlodipine", "brand"],
  ["Lopressor", "metoprolol", "brand"],
  ["ProAir", "albuterol", "brand"],
  ["Prilosec", "omeprazole", "brand"],
  ["Neurontin", "gabapentin", "brand"],
  ["Zoloft", "sertraline", "brand"],
  ["Singulair", "montelukast", "brand"],
  ["Lexapro", "escitalopram", "brand"],
  ["Crestor", "rosuvastatin", "brand"],
  ["Wellbutrin", "bupropion", "brand"],
  ["Lasix", "furosemide", "brand"],
  ["Protonix", "pantoprazole", "brand"],
  ["Flomax", "tamsulosin", "brand"],
  ["Prozac", "fluoxetine", "brand"],
  ["Cymbalta", "duloxetine", "brand"],
  ["Plavix", "clopidogrel", "brand"],
  ["Lantus", "insulin-glargine", "brand"],
  ["Ultram", "tramadol", "brand"],
  ["Flexeril", "cyclobenzaprine", "brand"],
  ["Ambien", "zolpidem", "brand"],
  ["Zofran", "ondansetron", "brand"],
  ["Lamictal", "lamotrigine", "brand"],
  ["Xanax", "alprazolam", "brand"],
  ["Klonopin", "clonazepam", "brand"],
  ["Coumadin", "warfarin", "brand"],
  ["Eliquis", "apixaban", "brand"],
  ["Xarelto", "rivaroxaban", "brand"],
  ["Seroquel", "quetiapine", "brand"],
  ["Abilify", "aripiprazole", "brand"],
  ["Keflex", "cephalexin", "brand"],
  ["Cipro", "ciprofloxacin", "brand"],
  ["Macrobid", "nitrofurantoin", "brand"],
  ["Valtrex", "valacyclovir", "brand"],
  ["Diflucan", "fluconazole", "brand"],
  ["Ozempic", "semaglutide", "brand"],
  ["Mounjaro", "tirzepatide", "brand"],
  ["Jardiance", "empagliflozin", "brand"],
  ["Narcan", "naloxone", "brand"],
  ["Opvee", "nalmefene", "brand"],
  ["Suboxone", "buprenorphine", "brand"],
  ["Dilaudid", "hydromorphone", "brand"],
  ["Lovenox", "enoxaparin", "brand"],
  ["Toradol", "ketorolac", "brand"],
  ["Vyvanse", "lisdexamfetamine", "brand"],
  ["Zosyn", "piperacillin-tazobactam", "brand"],
  ["Entresto", "sacubitril-valsartan", "brand"],
  ["Activase", "", "brand"],
  // Salt, release, and strength forms
  ["metoprolol succinate", "metoprolol", "salt"],
  ["metoprolol tartrate", "metoprolol", "salt"],
  ["sertraline HCl", "sertraline", "salt"],
  ["bupropion XL", "bupropion|bupropion-xl", "salt"],
  ["Toprol XL", "metoprolol", "salt"],
  ["Effexor XR", "venlafaxine|venlafaxine-xr", "salt"],
  ["diltiazem CD", "diltiazem", "salt"],
  ["amlodipine besylate", "amlodipine", "salt"],
  ["losartan potassium", "losartan", "salt"],
  ["quetiapine fumarate", "quetiapine", "salt"],
  ["escitalopram oxalate", "escitalopram", "salt"],
  ["clopidogrel bisulfate", "clopidogrel", "salt"],
  ["hydrocodone bitartrate", "hydrocodone", "salt"],
  ["hydroxyzine pamoate", "hydroxyzine", "salt"],
  ["oxybutynin chloride", "oxybutynin", "salt"],
  ["ipratropium bromide", "ipratropium", "salt"],
  ["lithium carbonate", "lithium", "salt"],
  ["potassium chloride ER", "potassium-chloride|potassium", "salt"],
  ["doxycycline hyclate", "doxycycline", "salt"],
  ["esomeprazole magnesium", "esomeprazole", "salt"],
  ["lisinopril 10 mg", "lisinopril", "salt"],
  ["metformin 500mg", "metformin", "salt"],
  ["Synthroid 50 mcg", "levothyroxine", "salt"],
  // Abbreviations
  ["APAP", "acetaminophen", "abbreviation"],
  ["HCTZ", "hctz", "abbreviation"],
  ["ASA", "aspirin", "abbreviation"],
  ["MS Contin", "morphine", "abbreviation"],
  ["TMP-SMX", "tmp-smx", "abbreviation"],
  ["SMX-TMP", "tmp-smx", "abbreviation"],
  ["MTX", "methotrexate", "abbreviation"],
  ["KCl", "potassium|potassium-chloride", "abbreviation"],
  ["NTG", "nitroglycerin", "abbreviation"],
  ["ISMN", "isosorbide-mononitrate", "abbreviation"],
  ["INH", "isoniazid", "abbreviation"],
  ["NAC", "nac", "abbreviation"],
  ["TXA", "tranexamic-acid", "abbreviation"],
  ["bicarb", "sodium-bicarbonate", "abbreviation"],
  ["vanc", "vancomycin", "abbreviation"],
  ["pip-tazo", "piperacillin-tazobactam", "abbreviation"],
  ["PTU", "propylthiouracil", "abbreviation"],
  ["DXM", "dextromethorphan", "abbreviation"],
  ["OCP", "ethinyl-estradiol", "abbreviation"],
  ["tPA", "", "abbreviation"],
  // Misspellings (the API never resolves these by design; they count as API misses)
  ["amoxacillin", "amoxicillin", "misspelling"],
  ["ibuprophen", "ibuprofen", "misspelling"],
  ["acetominophen", "acetaminophen", "misspelling"],
  ["buproprion", "bupropion", "misspelling"],
  ["trazadone", "trazodone", "misspelling"],
  ["loratidine", "loratadine", "misspelling"],
  ["flouxetine", "fluoxetine", "misspelling"],
  ["dexamethazone", "dexamethasone", "misspelling"],
  ["mirtazepine", "mirtazapine", "misspelling"],
  ["metropolol", "metoprolol", "misspelling"],
  ["lisinipril", "lisinopril", "misspelling"],
  ["hydrochlorthiazide", "hctz", "misspelling"],
  ["gabapenten", "gabapentin", "misspelling"],
  ["sertaline", "sertraline", "misspelling"],
  ["amlodapine", "amlodipine", "misspelling"],
  ["clonazapam", "clonazepam", "misspelling"],
  ["xanex", "alprazolam", "misspelling"],
  ["seroquil", "quetiapine", "misspelling"],
  ["cephalexen", "cephalexin", "misspelling"],
  ["omeprazol", "omeprazole", "misspelling"],
  // Combination products
  ["Percocet", "oxycodone+acetaminophen", "combination"],
  ["oxycodone/acetaminophen", "oxycodone+acetaminophen", "combination"],
  ["Norco", "hydrocodone+acetaminophen", "combination"],
  ["Vicodin", "hydrocodone+acetaminophen", "combination"],
  ["hydrocodone/APAP", "hydrocodone+acetaminophen", "combination"],
  ["Tylenol #3", "acetaminophen+codeine", "combination"],
  ["Tylenol with codeine", "acetaminophen+codeine", "combination"],
  ["Ultracet", "tramadol+acetaminophen", "combination"],
  ["Vicoprofen", "hydrocodone+ibuprofen", "combination"],
  ["Fioricet", "", "combination"],
  ["Excedrin", "acetaminophen+aspirin+caffeine", "combination"],
  ["NyQuil", "acetaminophen+dextromethorphan+doxylamine", "combination"],
  ["DayQuil", "acetaminophen+dextromethorphan", "combination"],
  ["Tylenol PM", "acetaminophen+diphenhydramine", "combination"],
  ["Advil PM", "ibuprofen+diphenhydramine", "combination"],
  ["Robitussin DM", "guaifenesin+dextromethorphan", "combination"],
  ["Mucinex DM", "guaifenesin+dextromethorphan", "combination"],
  ["Zyrtec-D", "cetirizine+pseudoephedrine", "combination"],
  ["Claritin-D", "loratadine+pseudoephedrine", "combination"],
  ["DuoNeb", "ipratropium+albuterol", "combination"],
  ["Combivent", "ipratropium+albuterol", "combination"],
  ["Lotrel", "amlodipine+benazepril", "combination"],
  ["Exforge", "amlodipine+valsartan", "combination"],
  ["Treximet", "sumatriptan+naproxen", "combination"],
  ["Bactrim DS", "tmp-smx", "combination"],
  ["Augmentin", "amox-clav", "combination"],
  ["amoxicillin-clavulanate", "amox-clav", "combination"],
  ["Advair", "fluticasone-salmeterol", "combination"],
  ["Symbicort", "budesonide-formoterol", "combination"],
  ["Biktarvy", "bictegravir-emtricitabine-taf", "combination"],
  ["Contrave", "naltrexone-bupropion", "combination"],
  ["Paxlovid", "paxlovid", "combination"],
  ["Janumet", "sitagliptin-metformin", "combination"],
  // OTC singles
  ["Tylenol", "acetaminophen", "otc"],
  ["Advil", "ibuprofen", "otc"],
  ["Motrin", "ibuprofen", "otc"],
  ["Aleve", "naproxen", "otc"],
  ["aspirin", "aspirin", "otc"],
  ["Benadryl", "diphenhydramine", "otc"],
  ["Claritin", "loratadine", "otc"],
  ["Zyrtec", "cetirizine", "otc"],
  ["Allegra", "fexofenadine", "otc"],
  ["Pepcid", "famotidine", "otc"],
  ["Pepcid AC", "famotidine", "otc"],
  ["Prilosec OTC", "omeprazole", "otc"],
  ["Imodium", "loperamide", "otc"],
  ["Pepto-Bismol", "bismuth-subsalicylate", "otc"],
  ["Miralax", "polyethylene-glycol-3350", "otc"],
  ["polyethylene glycol", "polyethylene-glycol-3350", "otc"],
  ["Mucinex", "guaifenesin", "otc"],
  ["Sudafed", "pseudoephedrine", "otc"],
  ["melatonin", "melatonin", "otc"],
  ["St. John's wort", "st-johns-wort", "otc"],
];

// Floors are the hit counts this list reaches today; raise them as coverage improves.
const DESK_FLOOR = 195;
const API_FLOOR = 191;

/** What one Enter on the desk search adds: the combination option when one leads, else the top suggestion. */
function deskAdds(query: string): string[] {
  const combo = findCombination(query);
  if (combo) return combo.ids;
  const top = searchDrugs(query)[0];
  return top ? [top.id] : [];
}

/** What one API lookup analyzes for this string. */
function apiAdds(query: string): string[] {
  const r = resolveDrugQuery(query);
  return r.status === "resolved" ? (r.drugIds ?? [r.drugId]) : [];
}

function hits(want: string, got: string[]): boolean {
  if (!want) return false;
  if (want.includes("+")) {
    const need = want.split("+").sort();
    return got.length === need.length && [...got].sort().every((id, i) => id === need[i]);
  }
  return got.length === 1 && want.split("|").includes(got[0]);
}

function misses(adds: (query: string) => string[]): string[] {
  return QUERIES.filter(([query, want]) => !hits(want, adds(query))).map(
    ([query, want, kind]) => `${kind}: ${query} â†’ [${adds(query).join(", ")}] (want ${want || "a catalog row"})`,
  );
}

test("query list is about 200 distinct real-world queries", () => {
  assert.ok(QUERIES.length >= 200, `${QUERIES.length} queries`);
  assert.equal(new Set(QUERIES.map(([q]) => q.toLowerCase())).size, QUERIES.length);
});

test("desk search puts the intended row first for at least the floor", () => {
  const missed = misses(deskAdds);
  const hit = QUERIES.length - missed.length;
  assert.ok(hit >= DESK_FLOOR, `desk ${hit}/${QUERIES.length} below floor ${DESK_FLOOR}:\n${missed.join("\n")}`);
});

test("API resolves the intended rows for at least the floor", () => {
  const missed = misses(apiAdds);
  const hit = QUERIES.length - missed.length;
  assert.ok(hit >= API_FLOOR, `API ${hit}/${QUERIES.length} below floor ${API_FLOOR}:\n${missed.join("\n")}`);
});
