import { DRUG_BY_ID, normalizeSearchText, saltFormKeys, withoutStrength } from "./catalog";

/**
 * Combination products named as one thing. `ids` are the catalog rows the product puts on the desk:
 * every cataloged active ingredient, or the one row the catalog already keeps for that product
 * (amox-clav, fluticasone-salmeterol). `names[0]` is the usual display name; the rest mean the same
 * product. `source` is the DailyMed product title the ingredients were read from.
 *
 * Not here on purpose: Bactrim/Septra and Paxlovid (rows of their own), Suboxone/Zubsolv (the
 * buprenorphine row's note: sublingual naloxone is not a second opioid on this desk), and products
 * with an active ingredient the catalog lacks (Fioricet/Fiorinal: butalbital).
 */
export interface Combination {
  names: string[];
  ids: string[];
  source: string;
}

export const COMBINATIONS: readonly Combination[] = [
  // Opioid and analgesic combinations
  {
    names: ["Percocet", "Endocet", "oxycodone/acetaminophen", "oxycodone/APAP", "oxycodone and acetaminophen"],
    ids: ["oxycodone", "acetaminophen"],
    source: "PERCOCET (OXYCODONE HYDROCHLORIDE AND ACETAMINOPHEN) TABLET",
  },
  {
    names: ["Norco", "Vicodin", "Lortab", "hydrocodone/acetaminophen", "hydrocodone/APAP", "hydrocodone and acetaminophen"],
    ids: ["hydrocodone", "acetaminophen"],
    source: "NORCO (HYDROCODONE BITARTRATE AND ACETAMINOPHEN) TABLET (Vicodin is a discontinued brand of the same product)",
  },
  {
    names: ["Tylenol with Codeine", "Tylenol #3", "Tylenol #4", "acetaminophen/codeine", "APAP/codeine", "acetaminophen with codeine"],
    ids: ["acetaminophen", "codeine"],
    source: "TYLENOL WITH CODEINE (ACETAMINOPHEN AND CODEINE PHOSPHATE) TABLET",
  },
  {
    names: ["Ultracet", "tramadol/acetaminophen", "tramadol/APAP"],
    ids: ["tramadol", "acetaminophen"],
    source: "ULTRACET (TRAMADOL HYDROCHLORIDE AND ACETAMINOPHEN) TABLET",
  },
  {
    names: ["Vicoprofen", "hydrocodone/ibuprofen"],
    ids: ["hydrocodone", "ibuprofen"],
    source: "VICOPROFEN (HYDROCODONE BITARTRATE AND IBUPROFEN) TABLET",
  },
  {
    names: ["Tussionex", "hydrocodone/chlorpheniramine"],
    ids: ["hydrocodone", "chlorpheniramine"],
    source: "TUSSIONEX PENNKINETIC (HYDROCODONE POLISTIREX AND CHLORPHENIRAMINE POLISTIREX) SUSPENSION, EXTENDED RELEASE",
  },
  {
    names: ["Excedrin", "Excedrin Extra Strength", "Excedrin Migraine"],
    ids: ["acetaminophen", "aspirin", "caffeine"],
    source: "EXCEDRIN MIGRAINE (ACETAMINOPHEN, ASPIRIN, AND CAFFEINE) TABLET",
  },
  {
    names: ["Excedrin PM", "Excedrin PM Triple Action"],
    ids: ["acetaminophen", "aspirin", "diphenhydramine"],
    source: "EXCEDRIN PM TRIPLE ACTION CAPLETS (ACETAMINOPHEN, ASPIRIN (NSAID) AND DIPHENHYDRAMINE CITRATE) TABLET",
  },
  {
    names: ["Treximet", "sumatriptan/naproxen"],
    ids: ["sumatriptan", "naproxen"],
    source: "TREXIMET (SUMATRIPTAN SUCCINATE AND NAPROXEN SODIUM) TABLET",
  },
  {
    names: ["Vimovo", "naproxen/esomeprazole"],
    ids: ["naproxen", "esomeprazole"],
    source: "VIMOVO (NAPROXEN AND ESOMEPRAZOLE MAGNESIUM) TABLET, DELAYED RELEASE",
  },
  {
    names: ["Arthrotec", "diclofenac/misoprostol"],
    ids: ["diclofenac", "misoprostol"],
    source: "ARTHROTEC (DICLOFENAC SODIUM AND MISOPROSTOL) TABLET",
  },
  // Cold, cough, allergy, and sleep (OTC)
  {
    names: ["NyQuil", "Vicks NyQuil", "NyQuil Cold and Flu", "NyQuil Cold & Flu"],
    ids: ["acetaminophen", "dextromethorphan", "doxylamine"],
    source: "VICKS NYQUIL COLD AND FLU (ACETAMINOPHEN, DOXYLAMINE SUCCINATE, DEXTROMETHORPHAN HYDROBROMIDE)",
  },
  {
    names: ["DayQuil", "Vicks DayQuil", "DayQuil Cold and Flu", "DayQuil Cold & Flu"],
    ids: ["acetaminophen", "dextromethorphan"],
    source: "DAYQUIL COLD AND FLU (PE-FREE) (ACETAMINOPHEN, DEXTROMETHORPHAN HYDROBROMIDE) TABLET",
  },
  {
    names: ["Tylenol PM", "acetaminophen/diphenhydramine"],
    ids: ["acetaminophen", "diphenhydramine"],
    source: "TYLENOL PM EXTRA STRENGTH (ACETAMINOPHEN AND DIPHENHYDRAMINE HYDROCHLORIDE) TABLET",
  },
  {
    names: ["Advil PM", "ibuprofen/diphenhydramine"],
    ids: ["ibuprofen", "diphenhydramine"],
    source: "ADVIL PM (DIPHENHYDRAMINE CITRATE AND IBUPROFEN) TABLET",
  },
  {
    names: ["Aleve PM", "naproxen/diphenhydramine"],
    ids: ["naproxen", "diphenhydramine"],
    source: "ALEVE PM (DIPHENHYDRAMINE HYDROCHLORIDE AND NAPROXEN SODIUM) TABLET",
  },
  {
    names: ["Robitussin DM", "Mucinex DM", "guaifenesin/dextromethorphan", "guaifenesin DM"],
    ids: ["guaifenesin", "dextromethorphan"],
    source: "MUCINEX DM (GUAIFENESIN AND DEXTROMETHORPHAN HYDROBROMIDE) TABLET, EXTENDED RELEASE; ROBITUSSIN COUGH PLUS CHEST CONGESTION DM",
  },
  {
    names: ["Zyrtec-D", "cetirizine/pseudoephedrine"],
    ids: ["cetirizine", "pseudoephedrine"],
    source: "ZYRTEC-D (CETIRIZINE HYDROCHLORIDE AND PSEUDOEPHEDRINE HYDROCHLORIDE) TABLET, EXTENDED RELEASE",
  },
  {
    names: ["Claritin-D", "loratadine/pseudoephedrine"],
    ids: ["loratadine", "pseudoephedrine"],
    source: "CLARITIN-D 12 HOUR (LORATADINE AND PSEUDOEPHEDRINE SULFATE) TABLET, EXTENDED RELEASE",
  },
  {
    names: ["Allegra-D", "fexofenadine/pseudoephedrine"],
    ids: ["fexofenadine", "pseudoephedrine"],
    source: "ALLEGRA-D (FEXOFENADINE HYDROCHLORIDE AND PSEUDOEPHEDRINE HYDROCHLORIDE) TABLET, EXTENDED RELEASE",
  },
  {
    names: ["Aleve-D", "naproxen/pseudoephedrine"],
    ids: ["naproxen", "pseudoephedrine"],
    source: "ALEVE-D SINUS AND COLD (NAPROXEN SODIUM, PSEUDOEPHEDRINE HYDROCHLORIDE) TABLET",
  },
  // Inhalers
  {
    names: ["DuoNeb", "Combivent", "Combivent Respimat", "ipratropium/albuterol", "albuterol/ipratropium"],
    ids: ["ipratropium", "albuterol"],
    source: "COMBIVENT RESPIMAT (IPRATROPIUM BROMIDE AND ALBUTEROL) SPRAY; IPRATROPIUM BROMIDE AND ALBUTEROL SULFATE SOLUTION (generic of DuoNeb)",
  },
  {
    names: ["Anoro", "Anoro Ellipta", "umeclidinium/vilanterol"],
    ids: ["umeclidinium", "vilanterol"],
    source: "ANORO ELLIPTA (UMECLIDINIUM BROMIDE AND VILANTEROL TRIFENATATE) POWDER",
  },
  { names: ["Advair", "Advair Diskus", "Advair HFA"], ids: ["fluticasone-salmeterol"], source: "ADVAIR DISKUS (FLUTICASONE PROPIONATE AND SALMETEROL) POWDER" },
  { names: ["Symbicort"], ids: ["budesonide-formoterol"], source: "SYMBICORT (BUDESONIDE AND FORMOTEROL FUMARATE DIHYDRATE) AEROSOL" },
  {
    names: ["Trelegy", "Trelegy Ellipta"],
    ids: ["fluticasone-umeclidinium-vilanterol"],
    source: "TRELEGY ELLIPTA (FLUTICASONE FUROATE, UMECLIDINIUM BROMIDE AND VILANTEROL TRIFENATATE) POWDER",
  },
  // Cardiometabolic
  {
    names: ["Lotrel", "amlodipine/benazepril"],
    ids: ["amlodipine", "benazepril"],
    source: "LOTREL (AMLODIPINE BESYLATE AND BENAZEPRIL HYDROCHLORIDE) CAPSULE",
  },
  {
    names: ["Exforge", "amlodipine/valsartan"],
    ids: ["amlodipine", "valsartan"],
    source: "EXFORGE (AMLODIPINE BESYLATE AND VALSARTAN) TABLET",
  },
  {
    names: ["Exforge HCT", "amlodipine/valsartan/HCTZ"],
    ids: ["amlodipine", "valsartan", "hctz"],
    source: "EXFORGE HCT (AMLODIPINE VALSARTAN AND HYDROCHLOROTHIAZIDE) TABLET",
  },
  {
    names: ["Benicar HCT", "olmesartan/HCTZ"],
    ids: ["olmesartan", "hctz"],
    source: "BENICAR HCT (OLMESARTAN MEDOXOMIL AND HYDROCHLOROTHIAZIDE) TABLET",
  },
  {
    names: ["Tribenzor", "olmesartan/amlodipine/HCTZ"],
    ids: ["olmesartan", "amlodipine", "hctz"],
    source: "TRIBENZOR (OLMESARTAN MEDOXOMIL / AMLODIPINE BESYLATE / HYDROCHLOROTHIAZIDE) TABLET",
  },
  {
    names: ["Lopressor HCT", "metoprolol/HCTZ"],
    ids: ["metoprolol", "hctz"],
    source: "LOPRESSOR HCT (METOPROLOL TARTRATE AND HYDROCHLOROTHIAZIDE) TABLET",
  },
  {
    names: ["Ziac", "bisoprolol/HCTZ"],
    ids: ["bisoprolol", "hctz"],
    source: "BISOPROLOL FUMARATE AND HYDROCHLOROTHIAZIDE TABLET (generic of Ziac)",
  },
  {
    names: ["Tenoretic", "atenolol/chlorthalidone"],
    ids: ["atenolol", "chlorthalidone"],
    source: "ATENOLOL AND CHLORTHALIDONE TABLET (generic of Tenoretic)",
  },
  {
    names: ["Glucovance", "glyburide/metformin"],
    ids: ["glyburide", "metformin"],
    source: "GLUCOVANCE (GLYBURIDE AND METFORMIN HYDROCHLORIDE) TABLET",
  },
  {
    names: ["Jentadueto", "Jentadueto XR", "linagliptin/metformin"],
    ids: ["linagliptin", "metformin"],
    source: "JENTADUETO (LINAGLIPTIN AND METFORMIN HYDROCHLORIDE) TABLET",
  },
  {
    names: ["Invokamet", "Invokamet XR", "canagliflozin/metformin"],
    ids: ["canagliflozin", "metformin"],
    source: "INVOKAMET (CANAGLIFLOZIN AND METFORMIN HYDROCHLORIDE) TABLET",
  },
  {
    names: ["Actoplus Met", "pioglitazone/metformin"],
    ids: ["pioglitazone", "metformin"],
    source: "ACTOPLUS MET (PIOGLITAZONE AND METFORMIN HYDROCHLORIDE) TABLET",
  },
  { names: ["Contrave"], ids: ["naltrexone-bupropion"], source: "CONTRAVE EXTENDED-RELEASE (NALTREXONE HYDROCHLORIDE AND BUPROPION HYDROCHLORIDE) TABLET" },
  // Psychiatry and neurology
  {
    names: ["Symbyax", "olanzapine/fluoxetine"],
    ids: ["olanzapine", "fluoxetine"],
    source: "OLANZAPINE AND FLUOXETINE CAPSULE (generic of Symbyax)",
  },
  {
    names: ["Nuedexta", "dextromethorphan/quinidine"],
    ids: ["dextromethorphan", "quinidine"],
    source: "NUEDEXTA (DEXTROMETHORPHAN HYDROBROMIDE AND QUINIDINE SULFATE) CAPSULE",
  },
  // Anti-infectives with a row of their own
  {
    names: ["Augmentin"],
    ids: ["amox-clav"],
    source: "AUGMENTIN (AMOXICILLIN AND CLAVULANATE POTASSIUM) FOR SUSPENSION",
  },
  {
    names: ["Biktarvy"],
    ids: ["bictegravir-emtricitabine-taf"],
    source: "BIKTARVY (BICTEGRAVIR SODIUM, EMTRICITABINE, AND TENOFOVIR ALAFENAMIDE FUMARATE) TABLET",
  },
];

/** One combination per normalized name. */
export const COMBINATION_BY_KEY: ReadonlyMap<string, Combination> = new Map(
  COMBINATIONS.flatMap((c) => c.names.map((n) => [normalizeSearchText(n), c] as const)),
);

export interface CombinationHit extends Combination {
  /** The name the query matched, for display ("Vicodin", not "Norco"). */
  name: string;
}

/** The combination product a desk query names, read past salt, release, and strength words. */
export function findCombination(query: string): CombinationHit | undefined {
  const normalized = normalizeSearchText(query);
  for (const key of [...saltFormKeys(normalized), withoutStrength(normalized)]) {
    const c = COMBINATION_BY_KEY.get(key);
    if (c) return { ...c, name: c.names.find((n) => normalizeSearchText(n) === key) ?? c.names[0] };
  }
  return undefined;
}

/** "Oxycodone + Acetaminophen" */
export function combinationParts(ids: readonly string[]): string {
  return ids.map((id) => DRUG_BY_ID[id]?.name ?? id).join(" + ");
}

/**
 * What adding a combination does to a desk that holds `selected` under `cap`: every missing row
 * at once, or nothing and a plain reason when they do not all fit.
 */
export function planCombination(
  c: CombinationHit,
  selected: readonly string[],
  cap: number,
): { add: string[]; message: string } {
  const add = c.ids.filter((id) => !selected.includes(id));
  if (add.length === 0) return { add, message: `${c.name} is already on the desk.` };
  const room = Math.max(cap - selected.length, 0);
  if (add.length > room) {
    const need = add.length - room;
    return {
      add: [],
      message: `${c.name} is ${add.length} items (${combinationParts(add)}) and the desk has room for ${room}. Remove ${need} to add it — nothing was added.`,
    };
  }
  return { add, message: `${c.name} → ${combinationParts(c.ids)}.` };
}
