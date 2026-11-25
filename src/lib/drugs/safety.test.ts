import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  safetyOnDesk,
  isPde5Nitrate,
  isXoThiopurine,
  isMtxTmpsmx,
  isColchicineInhibitor,
  isStatinStrong3a4,
  isSofosbuvirAmio,
  isClozapineBenzo,
  isClopidogrelPpi,
  isWarfarinCyp2c9,
  isMtxNsaid,
  isMaoiSerotonergic,
  isLithiumRenalClearance,
  isDigoxinPgp,
  isDoacInducer,
  isTheophyllineCyp1a2,
  isOpioidBenzo,
  isQtHypokalemicDiuretic,
  isTizanidineCyp1a2,
  isCniStrong3a4,
  isValproateCarbapenem,
  isHyperkalemiaRaasK,
  isErgotStrong3a4,
  isMaoiTyramineSympathomimetic,
  isAmiodaroneWarfarin,
  isIsoniazidAcetaminophen,
  isIvabradineCyp3a4NdhpCcb,
  isPhenytoinCyp2c9Inhibition,
  isSulfonylureaCyp2c9Hypoglycemia,
  isDhpCcbMacrolideHypotension,
  isNaltrexoneOpioidPrecipitatedOverdose,
  isDofetilideCationVerapamil,
  isTicagrelorStrongCyp3a4,
  isDronedaroneCyp3a4Qt,
  isPimozideThioridazineCyp2d63a4,
  isRanolazineStrongCyp3a4Inducer,
  isVenetoclaxStrongCyp3a4Tls,
  isVoriconazoleStrongInducer,
  isValproateTopiramateHyperammonemia,
  isMtxPpiDelayedClearance,
  isBenzo,
  isOpioid,
  isOrphineNitazeneSedativeStack,
  isEmergingOpioidAlpha2Adulterant,
  isProdrugCyp2d6OpioidFailure,
  isBotanicalStJohnsWortNarrowInducer,
  isBotanicalBerberineCypVictim,
  isOtcLithiumOrotateRenalTrap,
} from "./safety";

describe("safetyOnDesk - Clinical Collision Suite", () => {
  it("detects Warfarin × TMP-SMX / Metronidazole CYP2C9 inhibition collision", () => {
    assert.equal(isWarfarinCyp2c9("warfarin", "tmp-smx"), true);
    assert.equal(isWarfarinCyp2c9("metronidazole", "warfarin"), true);
    assert.equal(isWarfarinCyp2c9("warfarin", "amoxicillin"), false);

    const tmpHits = safetyOnDesk(["warfarin", "tmp-smx"]);
    assert.equal(tmpHits.length, 1);
    assert.equal(tmpHits[0].id, "warfarin-cyp2c9");
    assert.equal(tmpHits[0].severity, "major");
    assert.equal(tmpHits[0].tone, "danger");
    assert.match(tmpHits[0].mechanism, /CYP2C9 blockade \/ extreme INR surge/i);
    assert.match(tmpHits[0].clinical, /\(S\)-warfarin.*intracranial hemorrhage/i);
    assert.match(tmpHits[0].source, /Coumadin.*Bactrim.*Flagyl/i);

    const metroHits = safetyOnDesk(["warfarin", "metronidazole"]);
    assert.equal(metroHits.length, 1);
    assert.equal(metroHits[0].id, "warfarin-cyp2c9");
  });

  it("detects Methotrexate × Systemic NSAIDs collision as major risk", () => {
    assert.equal(isMtxNsaid("methotrexate", "ibuprofen"), true);
    assert.equal(isMtxNsaid("naproxen", "methotrexate"), true);
    assert.equal(isMtxNsaid("methotrexate", "indomethacin"), true);
    assert.equal(isMtxNsaid("methotrexate", "celecoxib"), true);
    assert.equal(isMtxNsaid("methotrexate", "ketorolac"), true);
    assert.equal(isMtxNsaid("methotrexate", "acetaminophen"), false);

    const hits = safetyOnDesk(["methotrexate", "ibuprofen"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "mtx-nsaid");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /OAT1\/3 blockade \/ renal clearance failure/i);
    assert.match(hits[0].clinical, /OAT1 and OAT3.*Boxed Warning.*bone marrow suppression/i);
    assert.match(hits[0].source, /Methotrexate FDA Boxed Warning/i);
  });

  it("detects MAOIs × Serotonergic agents as contraindicated serotonin toxicity", () => {
    assert.equal(isMaoiSerotonergic("phenelzine", "fluoxetine"), true);
    assert.equal(isMaoiSerotonergic("tranylcypromine", "tramadol"), true);
    assert.equal(isMaoiSerotonergic("isocarboxazid", "dextromethorphan"), true);
    assert.equal(isMaoiSerotonergic("methylene-blue", "sertraline"), true);
    assert.equal(isMaoiSerotonergic("linezolid", "meperidine"), true);
    assert.equal(isMaoiSerotonergic("phenelzine", "gabapentin"), false);

    const hits = safetyOnDesk(["phenelzine", "fluoxetine"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "maoi-serotonergic");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /life-threatening serotonin toxicity/i);
    assert.match(hits[0].clinical, /Hunter criteria.*14-day washout.*5-week/i);
    assert.match(hits[0].source, /Boyer EW.*Dunkley EJ/i);
  });

  it("detects Lithium × Thiazides / NSAIDs / ACEIs / ARBs renal clearance collision as major risk", () => {
    assert.equal(isLithiumRenalClearance("lithium", "hctz"), true);
    assert.equal(isLithiumRenalClearance("chlorthalidone", "lithium"), true);
    assert.equal(isLithiumRenalClearance("lithium", "ibuprofen"), true);
    assert.equal(isLithiumRenalClearance("naproxen", "lithium"), true);
    assert.equal(isLithiumRenalClearance("lithium", "lisinopril"), true);
    assert.equal(isLithiumRenalClearance("losartan", "lithium"), true);
    assert.equal(isLithiumRenalClearance("lithium", "atorvastatin"), false);

    const thiazideHits = safetyOnDesk(["lithium", "hctz"]);
    assert.equal(thiazideHits.length, 1);
    assert.equal(thiazideHits[0].id, "lithium-renal-clearance");
    assert.equal(thiazideHits[0].severity, "major");
    assert.equal(thiazideHits[0].tone, "danger");
    assert.match(thiazideHits[0].mechanism, /impaired renal clearance \/ neurotoxicity/i);
    assert.match(thiazideHits[0].clinical, /narrow therapeutic index.*proximal tubule.*SILENT syndrome/i);
    assert.match(thiazideHits[0].source, /Lithobid.*Finley PR.*Juurlink DN/i);

    const nsaidHits = safetyOnDesk(["lithium", "ibuprofen"]);
    assert.equal(nsaidHits.length, 1);
    assert.equal(nsaidHits[0].id, "lithium-renal-clearance");
  });

  it("detects Digoxin × Strong P-gp Inhibitors / Macrolides collision as major risk", () => {
    assert.equal(isDigoxinPgp("digoxin", "amiodarone"), true);
    assert.equal(isDigoxinPgp("verapamil", "digoxin"), true);
    assert.equal(isDigoxinPgp("digoxin", "clarithromycin"), true);
    assert.equal(isDigoxinPgp("erythromycin", "digoxin"), true);
    assert.equal(isDigoxinPgp("digoxin", "quinidine"), true);
    assert.equal(isDigoxinPgp("itraconazole", "digoxin"), true);
    assert.equal(isDigoxinPgp("digoxin", "metoprolol"), false);

    const hits = safetyOnDesk(["digoxin", "amiodarone"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "digoxin-pgp");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /P-gp efflux blockade \/ digitalis toxicity/i);
    assert.match(hits[0].clinical, /cardiac glycoside.*Eggerthella lenta.*bidirectional ventricular tachycardia/i);
    assert.match(hits[0].source, /Lanoxin.*Hager WD.*Lindenbaum J/i);
  });

  it("detects DOACs × Strong CYP3A4 / P-gp Inducers collision as major risk", () => {
    assert.equal(isDoacInducer("apixaban", "rifampin"), true);
    assert.equal(isDoacInducer("carbamazepine", "rivaroxaban"), true);
    assert.equal(isDoacInducer("dabigatran", "phenytoin"), true);
    assert.equal(isDoacInducer("edoxaban", "st-johns-wort"), true);
    assert.equal(isDoacInducer("apixaban", "phenobarbital"), true);
    assert.equal(isDoacInducer("apixaban", "amoxicillin"), false);

    const hits = safetyOnDesk(["apixaban", "rifampin"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "doac-inducer");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /clearance surge \/ thromboembolic failure/i);
    assert.match(hits[0].clinical, /subtherapeutic anticoagulation.*ischemic stroke.*avoid/i);
    assert.match(hits[0].source, /Eliquis.*Xarelto.*Wiggins BS.*AHA/i);
  });

  it("detects Theophylline × Strong CYP1A2 Inhibitors collision as contraindicated", () => {
    assert.equal(isTheophyllineCyp1a2("theophylline", "ciprofloxacin"), true);
    assert.equal(isTheophyllineCyp1a2("fluvoxamine", "theophylline"), true);
    assert.equal(isTheophyllineCyp1a2("theophylline", "amoxicillin"), false);

    const ciproHits = safetyOnDesk(["theophylline", "ciprofloxacin"]);
    assert.equal(ciproHits.length, 1);
    assert.equal(ciproHits[0].id, "theophylline-cyp1a2");
    assert.equal(ciproHits[0].severity, "contraindicated");
    assert.equal(ciproHits[0].tone, "danger");
    assert.match(ciproHits[0].mechanism, /CYP1A2 blockade \/ fatal theophylline toxicity/i);
    assert.match(ciproHits[0].clinical, /narrow therapeutic index.*tachydysrhythmias.*status epilepticus/i);
    assert.match(ciproHits[0].source, /Theo-Dur.*Cipro.*Luvox/i);

    const fluvoxHits = safetyOnDesk(["theophylline", "fluvoxamine"]);
    assert.equal(fluvoxHits.length, 1);
    assert.equal(fluvoxHits[0].id, "theophylline-cyp1a2");
  });

  it("detects Opioids × Benzodiazepines collision as major Boxed Warning", () => {
    assert.equal(isOpioidBenzo("morphine", "lorazepam"), true);
    assert.equal(isOpioidBenzo("alprazolam", "oxycodone"), true);
    assert.equal(isOpioidBenzo("fentanyl", "diazepam"), true);
    assert.equal(isOpioidBenzo("methadone", "clonazepam"), true);
    assert.equal(isOpioidBenzo("hydrocodone", "temazepam"), true);
    assert.equal(isOpioidBenzo("naloxone", "lorazepam"), false);
    assert.equal(isOpioidBenzo("loperamide", "lorazepam"), false);
    assert.equal(isOpioidBenzo("morphine", "acetaminophen"), false);

    const hits = safetyOnDesk(["morphine", "lorazepam"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "opioid-benzo");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /synergistic respiratory depression \/ fatal overdose/i);
    assert.match(hits[0].clinical, /FDA Boxed Warning.*pre-Bötzinger.*respiratory failure/i);
    assert.match(hits[0].watch, /Pasero Opioid-Induced Sedation Scale.*naloxone nasal spray/i);
    assert.match(hits[0].source, /Dowell D.*CDC Clinical Practice Guideline/i);
  });

  it("detects QT-Prolonging Antiarrhythmics × K-Wasting Diuretics collision as major risk", () => {
    assert.equal(isQtHypokalemicDiuretic("sotalol", "furosemide"), true);
    assert.equal(isQtHypokalemicDiuretic("dofetilide", "hctz"), true);
    assert.equal(isQtHypokalemicDiuretic("amiodarone", "chlorthalidone"), true);
    assert.equal(isQtHypokalemicDiuretic("haloperidol", "bumetanide"), true);
    assert.equal(isQtHypokalemicDiuretic("ibutilide", "torsemide"), true);
    assert.equal(isQtHypokalemicDiuretic("quinidine", "metolazone"), true);
    assert.equal(isQtHypokalemicDiuretic("sotalol", "spironolactone"), false);
    assert.equal(isQtHypokalemicDiuretic("amoxicillin", "furosemide"), false);

    const hits = safetyOnDesk(["sotalol", "furosemide"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "qt-hypokalemic-diuretic");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /hypokalemia multi-hit \/ Torsades de Pointes/i);
    assert.match(hits[0].clinical, /rapid delayed rectifier potassium current.*IKr.*Torsades de Pointes/i);
    assert.match(hits[0].watch, /Serial 12-lead ECG.*magnesium sulfate.*overdrive/i);
    assert.match(hits[0].source, /Betapace.*Tikosyn.*Drew BJ.*CredibleMeds/i);
  });

  it("detects Tizanidine × Strong CYP1A2 Inhibitors collision as contraindicated", () => {
    assert.equal(isTizanidineCyp1a2("tizanidine", "ciprofloxacin"), true);
    assert.equal(isTizanidineCyp1a2("fluvoxamine", "tizanidine"), true);
    assert.equal(isTizanidineCyp1a2("tizanidine", "levofloxacin"), false);
    assert.equal(isTizanidineCyp1a2("tizanidine", "ciprofloxacin-ophthalmic"), false);
    assert.equal(isTizanidineCyp1a2("tizanidine", "sertraline"), false);

    const fluvHits = safetyOnDesk(["tizanidine", "fluvoxamine"]);
    assert.equal(fluvHits.length, 1);
    assert.equal(fluvHits[0].id, "tizanidine-cyp1a2");
    assert.equal(fluvHits[0].severity, "contraindicated");
    assert.equal(fluvHits[0].tone, "danger");
    assert.match(fluvHits[0].mechanism, /first-pass blockade.*hypotension & coma/i);
    assert.match(fluvHits[0].clinical, /10-fold.*33-fold.*alpha-2.*contraindication/i);
    assert.match(fluvHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(fluvHits[0].source, /Zanaflex.*Granfors MT.*15060511.*15592331/i);

    const ciproHits = safetyOnDesk(["tizanidine", "ciprofloxacin"]);
    assert.equal(ciproHits.length, 1);
    assert.equal(ciproHits[0].id, "tizanidine-cyp1a2");
  });

  it("detects CNI / mTOR Immunosuppressants × Strong CYP3A4 / P-gp Inhibitors as contraindicated", () => {
    assert.equal(isCniStrong3a4("tacrolimus", "paxlovid"), true);
    assert.equal(isCniStrong3a4("ritonavir", "cyclosporine"), true);
    assert.equal(isCniStrong3a4("sirolimus", "voriconazole"), true);
    assert.equal(isCniStrong3a4("everolimus", "cobicistat"), true);
    assert.equal(isCniStrong3a4("tacrolimus", "itraconazole"), true);
    assert.equal(isCniStrong3a4("cyclosporine-modified", "posaconazole"), true);
    assert.equal(isCniStrong3a4("tacrolimus-xr", "clarithromycin"), true);
    assert.equal(isCniStrong3a4("sirolimus", "ketoconazole"), true);
    assert.equal(isCniStrong3a4("everolimus", "nefazodone"), true);
    assert.equal(isCniStrong3a4("tacrolimus", "amoxicillin"), false);
    assert.equal(isCniStrong3a4("tacrolimus", "azithromycin"), false);
    assert.equal(isCniStrong3a4("tacrolimus-topical", "paxlovid"), false);
    assert.equal(isCniStrong3a4("cyclosporine-ophthalmic", "voriconazole"), false);

    const paxHits = safetyOnDesk(["tacrolimus", "paxlovid"]);
    assert.equal(paxHits.length, 1);
    assert.equal(paxHits[0].id, "cni-strong-3a4");
    assert.equal(paxHits[0].severity, "contraindicated");
    assert.equal(paxHits[0].tone, "danger");
    assert.match(paxHits[0].mechanism, /catastrophic trough surge/i);
    assert.match(paxHits[0].clinical, /nephrotoxicity.*PRES.*thrombotic microangiopathy/i);
    assert.match(paxHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(paxHits[0].source, /Paxlovid.*35599203.*25708713/i);

    const mtorHits = safetyOnDesk(["everolimus", "ritonavir"]);
    assert.equal(mtorHits.length, 1);
    assert.equal(mtorHits[0].id, "cni-strong-3a4");
  });

  it("detects Valproate × Carbapenem collision as major risk", () => {
    assert.equal(isValproateCarbapenem("valproate", "meropenem"), true);
    assert.equal(isValproateCarbapenem("ertapenem", "divalproex"), true);
    assert.equal(isValproateCarbapenem("valproate-iv", "imipenem-cilastatin"), true);
    assert.equal(isValproateCarbapenem("valproate-sprinkle", "doripenem"), true);
    assert.equal(isValproateCarbapenem("divalproex", "meropenem-vaborbactam"), true);
    assert.equal(isValproateCarbapenem("valproate", "cefepime"), false);
    assert.equal(isValproateCarbapenem("valproate", "levetiracetam"), false);
    assert.equal(isValproateCarbapenem("valproate", "sulopenem"), false);

    const hits = safetyOnDesk(["divalproex", "meropenem"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "valproate-carbapenem");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /irreversible APEH blockade \/ rapid valproate crash/i);
    assert.match(hits[0].clinical, /acylpeptide hydrolase.*60–90%.*status epilepticus/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Depakote.*17609232.*20551238.*21770850/i);

    const ertaHits = safetyOnDesk(["valproate", "ertapenem"]);
    assert.equal(ertaHits.length, 1);
    assert.equal(ertaHits[0].id, "valproate-carbapenem");
  });

  it("detects Hyperkalemia RAAS × K-Retaining / ENaC collision without dual-raas or combo misfires", () => {
    assert.equal(isHyperkalemiaRaasK("lisinopril", "spironolactone"), true);
    assert.equal(isHyperkalemiaRaasK("losartan", "tmp-smx"), true);
    assert.equal(isHyperkalemiaRaasK("sacubitril-valsartan", "eplerenone"), true);
    assert.equal(isHyperkalemiaRaasK("enalapril", "amiloride"), true);
    assert.equal(isHyperkalemiaRaasK("valsartan", "triamterene"), true);
    assert.equal(isHyperkalemiaRaasK("lisinopril", "potassium-chloride"), true);
    assert.equal(isHyperkalemiaRaasK("ramipril", "trimethoprim"), true);
    assert.equal(isHyperkalemiaRaasK("losartan-hctz", "spironolactone"), true);
    assert.equal(isHyperkalemiaRaasK("spironolactone", "potassium-chloride"), true);
    assert.equal(isHyperkalemiaRaasK("spironolactone", "tmp-smx"), true);
    assert.equal(isHyperkalemiaRaasK("amiloride", "potassium-chloride"), true);
    assert.equal(isHyperkalemiaRaasK("eplerenone", "trimethoprim"), true);

    assert.equal(isHyperkalemiaRaasK("losartan-hctz", "losartan-hctz"), false);
    assert.equal(isHyperkalemiaRaasK("spironolactone", "spironolactone-hctz"), false);
    assert.equal(isHyperkalemiaRaasK("triamterene", "hydrochlorothiazide-triamterene"), false);
    assert.equal(isHyperkalemiaRaasK("lisinopril", "losartan"), false);
    assert.equal(isHyperkalemiaRaasK("lisinopril", "spironolactone-derm"), false);
    assert.equal(isHyperkalemiaRaasK("lisinopril", "trimethoprim-polymyxin-eye"), false);
    assert.equal(isHyperkalemiaRaasK("lisinopril", "furosemide"), false);

    assert.equal(safetyOnDesk(["losartan-hctz"]).length, 0);
    assert.equal(safetyOnDesk(["spironolactone-hctz"]).length, 0);
    assert.equal(safetyOnDesk(["hydrochlorothiazide-triamterene"]).length, 0);

    const dualRaasHits = safetyOnDesk(["lisinopril", "losartan"]);
    assert.equal(dualRaasHits.length, 1);
    assert.equal(dualRaasHits[0].id, "dual-raas");

    const raasMraHits = safetyOnDesk(["lisinopril", "spironolactone"]);
    assert.equal(raasMraHits.length, 1);
    assert.equal(raasMraHits[0].id, "hyperkalemia-raas-k");
    assert.equal(raasMraHits[0].severity, "major");
    assert.equal(raasMraHits[0].tone, "danger");
    assert.match(raasMraHits[0].mechanism, /additive hyperkalemia & fatal arrhythmia/i);
    assert.match(raasMraHits[0].clinical, /ENaC.*>= 6\.0 mEq\/L.*sine-wave/i);
    assert.match(raasMraHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(raasMraHits[0].source, /Antoniou T.*20585070.*21911446.*Fralick M.*25359996/i);

    const spironoTmpHits = safetyOnDesk(["spironolactone", "tmp-smx"]);
    assert.equal(spironoTmpHits.length, 1);
    assert.equal(spironoTmpHits[0].id, "hyperkalemia-raas-k");
  });

  it("detects Colchicine × strong CYP3A4 / P-gp inhibitor collision as contraindicated", () => {
    assert.equal(isColchicineInhibitor("colchicine", "clarithromycin"), true);
    assert.equal(isColchicineInhibitor("cyclosporine", "colchicine"), true);
    assert.equal(isColchicineInhibitor("colchicine", "ketoconazole"), true);
    assert.equal(isColchicineInhibitor("colchicine", "amoxicillin"), false);

    const hits = safetyOnDesk(["colchicine", "clarithromycin"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "colchicine-inhibitor");
    assert.equal(hit.severity, "contraindicated");
    assert.equal(hit.tone, "danger");
    assert.match(hit.mechanism, /fatal colchicine toxicity/i);
    assert.match(hit.clinical, /renal or hepatic impairment.*contraindication/i);
    assert.match(hit.source, /Colcrys.*Hung 2005/i);
  });

  it("detects Simvastatin / Lovastatin × strong CYP3A4 inhibitor collision as contraindicated", () => {
    assert.equal(isStatinStrong3a4("simvastatin", "clarithromycin"), true);
    assert.equal(isStatinStrong3a4("itraconazole", "lovastatin"), true);
    assert.equal(isStatinStrong3a4("simvastatin", "gemfibrozil"), true);
    assert.equal(isStatinStrong3a4("red-yeast-rice", "ketoconazole"), true);
    assert.equal(isStatinStrong3a4("atorvastatin", "clarithromycin"), false);

    const hits = safetyOnDesk(["simvastatin", "clarithromycin"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "statin-strong-3a4");
    assert.equal(hit.severity, "contraindicated");
    assert.equal(hit.tone, "danger");
    assert.match(hit.mechanism, /rhabdomyolysis \/ AKI/i);
    assert.match(hit.clinical, /contraindication/i);
    assert.match(hit.clinical, /rhabdomyolysis.*myoglobinuria/i);
    assert.match(hit.source, /Zocor.*Mevacor/i);
  });

  it("detects Clopidogrel × Omeprazole / Esomeprazole collision as major warning", () => {
    assert.equal(isClopidogrelPpi("clopidogrel", "omeprazole"), true);
    assert.equal(isClopidogrelPpi("esomeprazole", "clopidogrel"), true);
    assert.equal(isClopidogrelPpi("clopidogrel", "pantoprazole"), false);

    const hits = safetyOnDesk(["clopidogrel", "omeprazole"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "clopidogrel-ppi");
    assert.equal(hit.severity, "major");
    assert.equal(hit.tone, "warn");
    assert.match(hit.mechanism, /bioactivation/i);
    assert.match(hit.clinical, /CYP2C19/i);
    assert.match(hit.source, /Plavix boxed warning.*CPIC/i);
  });

  it("detects PDE5 inhibitor × organic nitrate collision as contraindicated", () => {
    assert.equal(isPde5Nitrate("sildenafil", "nitroglycerin"), true);
    assert.equal(isPde5Nitrate("nitroglycerin", "tadalafil"), true);
    assert.equal(isPde5Nitrate("sildenafil", "isosorbide-mononitrate"), true);
    assert.equal(isPde5Nitrate("sildenafil", "metformin"), false);

    const hits = safetyOnDesk(["sildenafil", "nitroglycerin"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "pde5-nitrate");
    assert.equal(hit.severity, "contraindicated");
    assert.equal(hit.tone, "danger");
    assert.match(hit.clinical, /refractory hypotension/i);
    assert.match(hit.source, /Viagra.*Nitrostat/i);
  });

  it("detects Xanthine Oxidase inhibitor × Thiopurine collision as contraindicated", () => {
    assert.equal(isXoThiopurine("allopurinol", "azathioprine"), true);
    assert.equal(isXoThiopurine("azathioprine", "febuxostat"), true);
    assert.equal(isXoThiopurine("allopurinol", "mercaptopurine"), true);
    assert.equal(isXoThiopurine("allopurinol", "atorvastatin"), false);

    const hits = safetyOnDesk(["allopurinol", "azathioprine"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "xo-thiopurine");
    assert.equal(hit.severity, "contraindicated");
    assert.equal(hit.tone, "danger");
    assert.match(hit.clinical, /6-mercaptopurine.*6-TGN.*pancytopenia/i);
    assert.match(hit.source, /Imuran.*Zyloprim/i);
  });

  it("detects Methotrexate × TMP-SMX collision as contraindicated", () => {
    assert.equal(isMtxTmpsmx("methotrexate", "tmp-smx"), true);
    assert.equal(isMtxTmpsmx("tmp-smx", "methotrexate"), true);
    assert.equal(isMtxTmpsmx("methotrexate", "amoxicillin"), false);

    const hits = safetyOnDesk(["methotrexate", "tmp-smx"]);
    // Note: mtx-tmpsmx matches; mtx-nsaid does not match since tmp-smx is not an NSAID
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "mtx-tmpsmx");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].clinical, /tubular secretion/i);
    assert.match(hits[0].clinical, /bone marrow aplasia/i);
    assert.match(hits[0].source, /Methotrexate and Bactrim/i);
  });

  it("detects Ergot Alkaloids × Strong CYP3A4 Inhibitors collision as contraindicated vasospastic ergotism", () => {
    assert.equal(isErgotStrong3a4("ergotamine", "paxlovid"), true);
    assert.equal(isErgotStrong3a4("ritonavir", "ergotamine"), true);
    assert.equal(isErgotStrong3a4("dihydroergotamine", "cobicistat"), true);
    assert.equal(isErgotStrong3a4("methylergonovine", "darunavir-cobicistat"), true);
    assert.equal(isErgotStrong3a4("ergotamine", "voriconazole"), true);
    assert.equal(isErgotStrong3a4("dihydroergotamine", "itraconazole"), true);
    assert.equal(isErgotStrong3a4("methylergonovine", "posaconazole"), true);
    assert.equal(isErgotStrong3a4("ergotamine", "ketoconazole"), true);
    assert.equal(isErgotStrong3a4("dihydroergotamine", "clarithromycin"), true);
    assert.equal(isErgotStrong3a4("dihydroergotamine", "erythromycin"), true);
    assert.equal(isErgotStrong3a4("ergotamine", "nefazodone"), true);
    assert.equal(isErgotStrong3a4("ergotamine", "telithromycin"), true);
    assert.equal(isErgotStrong3a4("methylergonovine", "mifepristone"), true);

    assert.equal(isErgotStrong3a4("ergotamine", "azithromycin"), false);
    assert.equal(isErgotStrong3a4("dihydroergotamine", "amoxicillin"), false);
    assert.equal(isErgotStrong3a4("ergotamine", "ketoconazole-topical"), false);
    assert.equal(isErgotStrong3a4("dihydroergotamine", "voriconazole-eye"), false);
    assert.equal(isErgotStrong3a4("cabergoline", "ritonavir"), false);

    const hits = safetyOnDesk(["ergotamine", "ritonavir"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "ergot-strong-3a4");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /vasospastic ergotism & ischemia/i);
    assert.match(hits[0].clinical, /FDA Boxed Warning.*CYP3A4.*cerebral ischemia.*gangrene/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Cafergot.*Migranal.*24978905.*8607732.*11524501.*3389610/i);

    const macrolideHits = safetyOnDesk(["dihydroergotamine", "erythromycin"]);
    assert.equal(macrolideHits.length, 1);
    assert.equal(macrolideHits[0].id, "ergot-strong-3a4");
  });

  it("detects MAOIs × Tyramine / Indirect & Mixed Sympathomimetics collision as contraindicated hypertensive crisis", () => {
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "tyramine-foods"), true);
    assert.equal(isMaoiTyramineSympathomimetic("tyramine-foods", "tranylcypromine"), true);
    assert.equal(isMaoiTyramineSympathomimetic("isocarboxazid", "pseudoephedrine"), true);
    assert.equal(isMaoiTyramineSympathomimetic("linezolid", "tyramine-foods"), true);
    assert.equal(isMaoiTyramineSympathomimetic("methylene-blue", "pseudoephedrine"), true);
    assert.equal(isMaoiTyramineSympathomimetic("selegiline", "phenylephrine"), true);
    assert.equal(isMaoiTyramineSympathomimetic("rasagiline", "phenylephrine-oral"), true);
    assert.equal(isMaoiTyramineSympathomimetic("safinamide", "methylphenidate"), true);
    assert.equal(isMaoiTyramineSympathomimetic("moclobemide", "amphetamine"), true);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "lisdexamfetamine"), true);
    assert.equal(isMaoiTyramineSympathomimetic("tranylcypromine", "amphetamine-mixed-salts-xr"), true);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "methylphenidate-oros"), true);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "ephedrine"), true);

    // Distinct from maoi-serotonergic and excludes ophthalmic/topical/inert products
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "fluoxetine"), false);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "sertraline"), false);
    assert.equal(isMaoiTyramineSympathomimetic("tranylcypromine", "venlafaxine"), false);
    assert.equal(isMaoiTyramineSympathomimetic("linezolid", "tramadol"), false);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "phenylephrine-ophthalmic"), false);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "oxymetazoline-topical"), false);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "guaifenesin"), false);
    assert.equal(isMaoiTyramineSympathomimetic("phenelzine", "tranylcypromine"), false);

    const tyramineHits = safetyOnDesk(["phenelzine", "tyramine-foods"]);
    assert.equal(tyramineHits.length, 1);
    assert.equal(tyramineHits[0].id, "maoi-tyramine-sympathomimetic");
    assert.equal(tyramineHits[0].severity, "contraindicated");
    assert.equal(tyramineHits[0].tone, "danger");
    assert.match(tyramineHits[0].mechanism, /catecholamine storm \/ hypertensive crisis/i);
    assert.match(tyramineHits[0].clinical, /MAO-A.*vesicular norepinephrine.*hypertensive encephalopathy.*hemorrhagic stroke.*aortic dissection/i);
    assert.match(tyramineHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(tyramineHits[0].source, /Nardil.*Parnate.*2190595.*21971008.*15521893.*35721816/i);

    const decongestantHits = safetyOnDesk(["tranylcypromine", "pseudoephedrine"]);
    assert.equal(decongestantHits.length, 1);
    assert.equal(decongestantHits[0].id, "maoi-tyramine-sympathomimetic");

    // Verify SSRI + MAOI still emits only maoi-serotonergic
    const ssriHits = safetyOnDesk(["phenelzine", "sertraline"]);
    assert.equal(ssriHits.length, 1);
    assert.equal(ssriHits[0].id, "maoi-serotonergic");
  });

  it("detects Amiodarone × Warfarin collision as major risk distinct from warfarin-cyp2c9", () => {
    assert.equal(isAmiodaroneWarfarin("amiodarone", "warfarin"), true);
    assert.equal(isAmiodaroneWarfarin("warfarin", "amiodarone"), true);
    assert.equal(isAmiodaroneWarfarin("warfarin", "tmp-smx"), false);
    assert.equal(isAmiodaroneWarfarin("warfarin", "metronidazole"), false);
    assert.equal(isAmiodaroneWarfarin("amiodarone", "digoxin"), false);

    const hits = safetyOnDesk(["amiodarone", "warfarin"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "amiodarone-warfarin");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /CYP2C9\/1A2\/3A4 blockade & delayed INR surge/i);
    assert.match(hits[0].clinical, /N-desethylamiodarone.*\(S\)-warfarin.*40–55 days.*1–4 weeks/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Coumadin.*3621782.*3401099.*1563209.*22398967/i);
  });

  it("detects Isoniazid × Acetaminophen collision as major CYP2E1 / NAPQI hepatotoxicity risk", () => {
    assert.equal(isIsoniazidAcetaminophen("isoniazid", "acetaminophen"), true);
    assert.equal(isIsoniazidAcetaminophen("acetaminophen", "isoniazid"), true);
    assert.equal(isIsoniazidAcetaminophen("acetaminophen", "atorvastatin"), false);
    assert.equal(isIsoniazidAcetaminophen("isoniazid", "ibuprofen"), false);

    const hits = safetyOnDesk(["isoniazid", "acetaminophen"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "isoniazid-acetaminophen");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /CYP2E1 induction & NAPQI hepatotoxicity/i);
    assert.match(hits[0].clinical, /biphasic CYP2E1.*NAPQI.*glutathione.*centrilobular hepatocellular necrosis/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Isoniazid.*Acetaminophen.*8354023.*9024171.*2240884.*8470644.*7508362/i);
  });

  it("detects Ivabradine × Strong CYP3A4 Inhibitors / Diltiazem & Verapamil as contraindicated SA-node arrest risk", () => {
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "diltiazem"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("verapamil", "ivabradine"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "clarithromycin"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("itraconazole", "ivabradine"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "ketoconazole"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "voriconazole"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "paxlovid"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ritonavir", "ivabradine"), true);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "nefazodone"), true);

    // Excludes non-systemic topical/ophthalmic routes, azithromycin, DHP CCBs, and intranasal etripamil
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "ketoconazole-topical"), false);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "voriconazole-eye"), false);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "ciprofloxacin-ophthalmic"), false);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "azithromycin"), false);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "amlodipine"), false);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "etripamil"), false);
    assert.equal(isIvabradineCyp3a4NdhpCcb("ivabradine", "metoprolol"), false);

    const diltHits = safetyOnDesk(["ivabradine", "diltiazem"]);
    assert.equal(diltHits.length, 1);
    assert.equal(diltHits[0].id, "ivabradine-cyp3a4-ndhp-ccb");
    assert.equal(diltHits[0].severity, "contraindicated");
    assert.equal(diltHits[0].tone, "danger");
    assert.match(diltHits[0].mechanism, /SA-node arrest & severe bradycardia/i);
    assert.match(diltHits[0].clinical, /Corlanor Section 4 Contraindications.*diltiazem and verapamil.*sinus arrest/i);
    assert.match(diltHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(diltHits[0].source, /Corlanor.*18217787.*33033962.*31486198.*25438492.*27012681/i);

    const clarithroHits = safetyOnDesk(["clarithromycin", "ivabradine"]);
    assert.equal(clarithroHits.length, 1);
    assert.equal(clarithroHits[0].id, "ivabradine-cyp3a4-ndhp-ccb");
  });

  it("detects Phenytoin / Fosphenytoin × CYP2C9/2C19 Inhibitors as major Michaelis-Menten neurotoxicity risk", () => {
    assert.equal(isPhenytoinCyp2c9Inhibition("phenytoin", "fluconazole"), true);
    assert.equal(isPhenytoinCyp2c9Inhibition("voriconazole", "phenytoin"), true);
    assert.equal(isPhenytoinCyp2c9Inhibition("fosphenytoin", "amiodarone"), true);
    assert.equal(isPhenytoinCyp2c9Inhibition("phenytoin", "tmp-smx"), true);
    assert.equal(isPhenytoinCyp2c9Inhibition("fluvoxamine", "phenytoin"), true);
    assert.equal(isPhenytoinCyp2c9Inhibition("phenytoin-fosphenytoin", "metronidazole"), true);

    // Distinct from warfarin-cyp2c9 and excludes topical/ophthalmic routes or unrelated AEDs
    assert.equal(isPhenytoinCyp2c9Inhibition("warfarin", "tmp-smx"), false);
    assert.equal(isPhenytoinCyp2c9Inhibition("phenytoin", "metronidazole-topical"), false);
    assert.equal(isPhenytoinCyp2c9Inhibition("phenytoin", "voriconazole-eye"), false);
    assert.equal(isPhenytoinCyp2c9Inhibition("phenytoin", "trimethoprim-polymyxin-eye"), false);
    assert.equal(isPhenytoinCyp2c9Inhibition("phenytoin", "levetiracetam"), false);

    const hits = safetyOnDesk(["phenytoin", "fluconazole"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "phenytoin-cyp2c9-inhibition");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /Michaelis-Menten saturation & neurotoxicity/i);
    assert.match(hits[0].clinical, /Michaelis-Menten nonlinear zero-order elimination.*nystagmus.*dysarthria.*cerebellar ataxia.*encephalopathy/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Dilantin.*Cerebyx.*2015731.*14616412.*6486598.*284708.*11206048.*20405111/i);

    const warfHits = safetyOnDesk(["warfarin", "tmp-smx"]);
    assert.equal(warfHits.length, 1);
    assert.equal(warfHits[0].id, "warfarin-cyp2c9");
  });

  it("detects Sulfonylureas × CYP2C9 Inhibitors as major prolonged hypoglycemia risk", () => {
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("glipizide", "tmp-smx"), true);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("fluconazole", "glyburide"), true);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("glimepiride", "voriconazole"), true);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("glyburide", "tmp-smx"), true);

    // Excludes non-sulfonylureas, topical/ophthalmic routes, and local miconazole entry
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("metformin", "tmp-smx"), false);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("repaglinide", "fluconazole"), false);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("glipizide", "amoxicillin"), false);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("glyburide", "voriconazole-eye"), false);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("glimepiride", "trimethoprim-polymyxin-eye"), false);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("glipizide", "miconazole"), false);
    assert.equal(isSulfonylureaCyp2c9Hypoglycemia("warfarin", "tmp-smx"), false);

    const hits = safetyOnDesk(["glipizide", "tmp-smx"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "sulfonylurea-cyp2c9-hypoglycemia");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /prolonged, delayed-onset severe hypoglycemia/i);
    assert.match(hits[0].clinical, /CYP2C9.*displaces protein-bound sulfonylurea.*neuroglycopenia/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Glucotrol.*Amaryl.*11309547.*12672733.*20592722.*25179404.*24858839/i);

    const flucHits = safetyOnDesk(["glimepiride", "fluconazole"]);
    assert.equal(flucHits.length, 1);
    assert.equal(flucHits[0].id, "sulfonylurea-cyp2c9-hypoglycemia");
  });

  it("detects Dihydropyridine CCB × Clarithromycin / Erythromycin hypotension & AKI collision while excluding azithromycin", () => {
    assert.equal(isDhpCcbMacrolideHypotension("amlodipine", "clarithromycin"), true);
    assert.equal(isDhpCcbMacrolideHypotension("erythromycin", "nifedipine"), true);
    assert.equal(isDhpCcbMacrolideHypotension("felodipine", "clarithromycin"), true);
    assert.equal(isDhpCcbMacrolideHypotension("nicardipine", "clarithromycin"), true);
    assert.equal(isDhpCcbMacrolideHypotension("nisoldipine", "erythromycin"), true);
    assert.equal(isDhpCcbMacrolideHypotension("olmesartan-amlodipine", "clarithromycin"), true);
    assert.equal(isDhpCcbMacrolideHypotension("atorvastatin-amlodipine", "erythromycin"), true);

    // Crucial negative controls: azithromycin does not inhibit CYP3A4; clevidipine is esterase-cleared; diltiazem/verapamil are non-DHP
    assert.equal(isDhpCcbMacrolideHypotension("amlodipine", "azithromycin"), false);
    assert.equal(isDhpCcbMacrolideHypotension("nifedipine", "azithromycin"), false);
    assert.equal(isDhpCcbMacrolideHypotension("amlodipine", "azithromycin-ophthalmic"), false);
    assert.equal(isDhpCcbMacrolideHypotension("clevidipine", "clarithromycin"), false);
    assert.equal(isDhpCcbMacrolideHypotension("diltiazem", "clarithromycin"), false);
    assert.equal(isDhpCcbMacrolideHypotension("verapamil", "erythromycin"), false);

    assert.equal(safetyOnDesk(["amlodipine", "azithromycin"]).length, 0);

    const hits = safetyOnDesk(["amlodipine", "clarithromycin"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "dihydropyridine-ccb-macrolide-hypotension");
    assert.equal(hits[0].severity, "major");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /CYP3A4 blockade & vasodilatory shock/i);
    assert.match(hits[0].clinical, /azithromycin.*vasodilatory hypotension.*acute kidney injury.*Gandhi.*JAMA 2013/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Norvasc.*Biaxin.*24346990.*21242274.*28832423.*30893067/i);
  });

  it("detects Naltrexone × Opioid Agonist collision as contraindicated precipitated withdrawal & override overdose risk", () => {
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naltrexone", "oxycodone"), true);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("fentanyl", "naltrexone"), true);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naltrexone", "methadone"), true);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naltrexone", "buprenorphine"), true);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naltrexone", "morphine"), true);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naltrexone-bupropion", "methadone"), true);

    // Excludes loperamide, rescue antagonists, PAMORAs, and non-opioid analgesics
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naltrexone", "loperamide"), false);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naloxone", "morphine"), false);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("methylnaltrexone", "oxycodone"), false);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naloxegol", "fentanyl"), false);
    assert.equal(isNaltrexoneOpioidPrecipitatedOverdose("naltrexone", "acetaminophen"), false);

    const hits = safetyOnDesk(["naltrexone", "fentanyl"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "naltrexone-opioid-precipitated-overdose");
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /acute precipitated withdrawal & blockade-override fatal overdose/i);
    assert.match(hits[0].clinical, /mu-opioid receptor antagonist.*precipitates abrupt, severe opioid withdrawal.*override|overcome/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Vivitrol.*Revia.*32511106.*29150198.*38967916.*40543362/i);
  });

  it("detects Dofetilide × Cation Transport Inhibitors / Verapamil / HCTZ as contraindicated Section 4 risk", () => {
    assert.equal(isDofetilideCationVerapamil("dofetilide", "cimetidine"), true);
    assert.equal(isDofetilideCationVerapamil("trimethoprim", "dofetilide"), true);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "tmp-smx"), true);
    assert.equal(isDofetilideCationVerapamil("ketoconazole", "dofetilide"), true);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "prochlorperazine"), true);
    assert.equal(isDofetilideCationVerapamil("megestrol", "dofetilide"), true);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "dolutegravir"), true);
    assert.equal(isDofetilideCationVerapamil("verapamil", "dofetilide"), true);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "hctz"), true);
    assert.equal(isDofetilideCationVerapamil("hydrochlorothiazide", "dofetilide"), true);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "losartan-hctz"), true);
    assert.equal(isDofetilideCationVerapamil("valsartan-hctz", "dofetilide"), true);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "hydrochlorothiazide-triamterene"), true);

    assert.equal(isDofetilideCationVerapamil("dofetilide", "azithromycin"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "pravastatin"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "diltiazem"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "famotidine"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "chlorthalidone"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "furosemide"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "ketoconazole-topical"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "trimethoprim-polymyxin-eye"), false);
    assert.equal(isDofetilideCationVerapamil("dofetilide", "dofetilide"), false);

    const cimHits = safetyOnDesk(["dofetilide", "cimetidine"]);
    assert.equal(cimHits.length, 1);
    assert.equal(cimHits[0].id, "dofetilide-cation-verapamil");
    assert.deepEqual(cimHits[0].drugIds, ["dofetilide", "cimetidine"]);
    assert.equal(cimHits[0].severity, "contraindicated");
    assert.equal(cimHits[0].tone, "danger");
    assert.match(cimHits[0].mechanism, /cation transport inhibitor \/ verapamil \/ HCTZ.*Torsades de Pointes/i);
    assert.match(cimHits[0].clinical, /OCT2 \(SLC22A2\).*MATE1 \(SLC47A1\).*Torsades de Pointes/i);
    assert.match(cimHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(cimHits[0].source, /Tikosyn.*10606839.*35955741.*20142454/i);

    const revHits = safetyOnDesk(["verapamil", "dofetilide"]);
    assert.equal(revHits.length, 1);
    assert.equal(revHits[0].id, "dofetilide-cation-verapamil");
    assert.deepEqual(revHits[0].drugIds, ["dofetilide", "verapamil"]);

    // Deduplicates multiple perpetrators on the same desk and supersedes generic qt-hypokalemic-diuretic for dofetilide + HCTZ
    const dedupHits = safetyOnDesk(["dofetilide", "cimetidine", "verapamil"]);
    assert.equal(dedupHits.length, 1);
    assert.equal(dedupHits[0].id, "dofetilide-cation-verapamil");

    const hctzHits = safetyOnDesk(["dofetilide", "hctz"]);
    assert.equal(hctzHits.length, 1);
    assert.equal(hctzHits[0].id, "dofetilide-cation-verapamil");
    assert.equal(hctzHits[0].severity, "contraindicated");

    const chlorthalidoneHits = safetyOnDesk(["dofetilide", "chlorthalidone"]);
    assert.equal(chlorthalidoneHits.length, 1);
    assert.equal(chlorthalidoneHits[0].id, "qt-hypokalemic-diuretic");

    const splitLoopHits = safetyOnDesk(["dofetilide", "hctz", "furosemide"]);
    assert.equal(splitLoopHits.length, 2);
    assert.deepEqual(
      splitLoopHits.map((h) => h.id).sort(),
      ["dofetilide-cation-verapamil", "qt-hypokalemic-diuretic"],
    );
  });

  it("detects Ticagrelor × Strong CYP3A4 Inhibitors / Inducers as contraindicated Section 4 risk", () => {
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "itraconazole"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ketoconazole", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "posaconazole"), true);
    assert.equal(isTicagrelorStrongCyp3a4("voriconazole", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "clarithromycin"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ritonavir", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "cobicistat"), true);
    assert.equal(isTicagrelorStrongCyp3a4("paxlovid", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "nefazodone"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ceritinib", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "rifampin"), true);
    assert.equal(isTicagrelorStrongCyp3a4("carbamazepine", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "carbamazepine-xr"), true);
    assert.equal(isTicagrelorStrongCyp3a4("carbamazepine-equetro", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "phenytoin"), true);
    assert.equal(isTicagrelorStrongCyp3a4("fosphenytoin", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "phenytoin-fosphenytoin"), true);
    assert.equal(isTicagrelorStrongCyp3a4("phenobarbital", "ticagrelor"), true);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "primidone"), true);
    assert.equal(isTicagrelorStrongCyp3a4("st-johns-wort", "ticagrelor"), true);

    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "azithromycin"), false);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "pravastatin"), false);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "diltiazem"), false);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "fluconazole"), false);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "ketoconazole-topical"), false);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "voriconazole-eye"), false);
    assert.equal(isTicagrelorStrongCyp3a4("clopidogrel", "rifampin"), false);
    assert.equal(isTicagrelorStrongCyp3a4("ticagrelor", "ticagrelor"), false);

    assert.equal(safetyOnDesk(["ticagrelor", "azithromycin"]).length, 0);

    const inhHits = safetyOnDesk(["ticagrelor", "ketoconazole"]);
    assert.equal(inhHits.length, 1);
    assert.equal(inhHits[0].id, "ticagrelor-strong-cyp3a4");
    assert.deepEqual(inhHits[0].drugIds, ["ticagrelor", "ketoconazole"]);
    assert.equal(inhHits[0].severity, "contraindicated");
    assert.equal(inhHits[0].tone, "danger");
    assert.match(inhHits[0].mechanism, /major hemorrhage or stent thrombosis/i);
    assert.match(inhHits[0].clinical, /~7\.3-fold increase.*~86% reduction/i);
    assert.match(inhHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(inhHits[0].source, /Brilinta.*34729703/i);

    const indHits = safetyOnDesk(["rifampin", "ticagrelor"]);
    assert.equal(indHits.length, 1);
    assert.equal(indHits[0].id, "ticagrelor-strong-cyp3a4");
    assert.deepEqual(indHits[0].drugIds, ["ticagrelor", "rifampin"]);

    assert.equal(safetyOnDesk(["ticagrelor", "ritonavir", "rifampin"]).length, 1);
  });

  it("detects Dronedarone × Strong CYP3A4 Inhibitors / Class I–III & QT Agents as contraindicated risk", () => {
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "itraconazole"), true);
    assert.equal(isDronedaroneCyp3a4Qt("ketoconazole", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "posaconazole"), true);
    assert.equal(isDronedaroneCyp3a4Qt("voriconazole", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "clarithromycin"), true);
    assert.equal(isDronedaroneCyp3a4Qt("ritonavir", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "cobicistat"), true);
    assert.equal(isDronedaroneCyp3a4Qt("paxlovid", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "nefazodone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("cyclosporine", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "amiodarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("sotalol", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "dofetilide"), true);
    assert.equal(isDronedaroneCyp3a4Qt("quinidine", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "quinidine-gluconate"), true);
    assert.equal(isDronedaroneCyp3a4Qt("procainamide", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "disopyramide"), true);
    assert.equal(isDronedaroneCyp3a4Qt("flecainide", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "propafenone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("ibutilide", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "pimozide"), true);
    assert.equal(isDronedaroneCyp3a4Qt("thioridazine", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "ziprasidone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("haloperidol", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "methadone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("citalopram", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "escitalopram"), true);
    assert.equal(isDronedaroneCyp3a4Qt("moxifloxacin", "dronedarone"), true);
    assert.equal(isDronedaroneCyp3a4Qt("erythromycin", "dronedarone"), true);

    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "azithromycin"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "pravastatin"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "diltiazem"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "metoprolol"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "ketoconazole-topical"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "voriconazole-eye"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "moxifloxacin-ophthalmic"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "cyclosporine-ophthalmic"), false);
    assert.equal(isDronedaroneCyp3a4Qt("dronedarone", "dronedarone"), false);

    assert.equal(safetyOnDesk(["dronedarone", "azithromycin"]).length, 0);

    const hits = safetyOnDesk(["dronedarone", "ketoconazole"]);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "dronedarone-cyp3a4-qt");
    assert.deepEqual(hits[0].drugIds, ["dronedarone", "ketoconazole"]);
    assert.equal(hits[0].severity, "contraindicated");
    assert.equal(hits[0].tone, "danger");
    assert.match(hits[0].mechanism, /~17-fold surge & Torsades de Pointes/i);
    assert.match(hits[0].clinical, /~17-fold exposure elevation.*PALLAS.*ANDROMEDA/i);
    assert.match(hits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(hits[0].source, /Multaq.*18565860.*22082198.*20142454/i);

    const revQtHits = safetyOnDesk(["amiodarone", "dronedarone"]);
    assert.equal(revQtHits.length, 1);
    assert.equal(revQtHits[0].id, "dronedarone-cyp3a4-qt");
    assert.deepEqual(revQtHits[0].drugIds, ["dronedarone", "amiodarone"]);

    assert.equal(safetyOnDesk(["dronedarone", "ketoconazole", "sotalol"]).length, 1);
  });

  it("detects Pimozide / Thioridazine × CYP2D6 or Strong CYP3A4 Inhibitors as contraindicated QT/TdP risk", () => {
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "paroxetine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("fluoxetine", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "bupropion"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("quinidine", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "quinidine-gluconate"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("terbinafine", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "duloxetine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("sertraline", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "citalopram"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("escitalopram", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "fluvoxamine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("amiodarone", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "cimetidine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("mirabegron", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "clarithromycin"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("erythromycin", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "itraconazole"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("ketoconazole", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "posaconazole"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("voriconazole", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "ritonavir"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("cobicistat", "thioridazine"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "paxlovid"), true);
    assert.equal(isPimozideThioridazineCyp2d63a4("nefazodone", "thioridazine"), true);

    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "azithromycin"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("thioridazine", "azithromycin"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "pravastatin"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("thioridazine", "venlafaxine"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "ketoconazole-topical"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("thioridazine", "terbinafine-topical"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "voriconazole-eye"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "thioridazine"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("haloperidol", "paroxetine"), false);
    assert.equal(isPimozideThioridazineCyp2d63a4("pimozide", "pimozide"), false);

    assert.equal(safetyOnDesk(["pimozide", "azithromycin"]).length, 0);

    const pimHits = safetyOnDesk(["pimozide", "paroxetine"]);
    assert.equal(pimHits.length, 1);
    assert.equal(pimHits[0].id, "pimozide-thioridazine-cyp2d6-3a4");
    assert.deepEqual(pimHits[0].drugIds, ["pimozide", "paroxetine"]);
    assert.equal(pimHits[0].severity, "contraindicated");
    assert.equal(pimHits[0].tone, "danger");
    assert.match(pimHits[0].mechanism, /CYP2D6 or strong CYP3A4 inhibitor.*Torsades de Pointes/i);
    assert.match(pimHits[0].clinical, /hERG\/IKr.*Torsades de Pointes.*fluoxetine/i);
    assert.match(pimHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(pimHits[0].source, /Orap.*Mellaril.*10831018.*20142454/i);

    const thiorHits = safetyOnDesk(["clarithromycin", "thioridazine"]);
    assert.equal(thiorHits.length, 1);
    assert.equal(thiorHits[0].id, "pimozide-thioridazine-cyp2d6-3a4");
    assert.deepEqual(thiorHits[0].drugIds, ["thioridazine", "clarithromycin"]);

    assert.equal(safetyOnDesk(["pimozide", "thioridazine", "fluoxetine", "itraconazole"]).length, 1);
  });

  it("detects Ranolazine × Strong CYP3A4 Inhibitors / CYP3A4 Inducers as contraindicated risk", () => {
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "ketoconazole"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("itraconazole", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "posaconazole"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("voriconazole", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "clarithromycin"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ritonavir", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "cobicistat"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("paxlovid", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "nefazodone"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "rifampin"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("carbamazepine", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "carbamazepine-xr"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("carbamazepine-equetro", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "phenytoin"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("fosphenytoin", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "phenytoin-fosphenytoin"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("phenobarbital", "ranolazine"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "primidone"), true);
    assert.equal(isRanolazineStrongCyp3a4Inducer("st-johns-wort", "ranolazine"), true);

    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "azithromycin"), false);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "pravastatin"), false);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "diltiazem"), false);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "verapamil"), false);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "metoprolol"), false);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "ketoconazole-topical"), false);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "voriconazole-eye"), false);
    assert.equal(isRanolazineStrongCyp3a4Inducer("ranolazine", "ranolazine"), false);

    assert.equal(safetyOnDesk(["ranolazine", "diltiazem"]).length, 0);
    assert.equal(safetyOnDesk(["ranolazine", "azithromycin"]).length, 0);

    const inhHits = safetyOnDesk(["ranolazine", "ketoconazole"]);
    assert.equal(inhHits.length, 1);
    assert.equal(inhHits[0].id, "ranolazine-strong-cyp3a4-inducer");
    assert.deepEqual(inhHits[0].drugIds, ["ranolazine", "ketoconazole"]);
    assert.equal(inhHits[0].severity, "contraindicated");
    assert.equal(inhHits[0].tone, "danger");
    assert.match(inhHits[0].mechanism, /QTc surge or antianginal loss/i);
    assert.match(inhHits[0].clinical, /3\.2- to 3\.9-fold exposure increase.*~95% reduction/i);
    assert.match(inhHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\./);
    assert.match(inhHits[0].source, /Ranexa.*15778423.*16640453/i);

    const indHits = safetyOnDesk(["rifampin", "ranolazine"]);
    assert.equal(indHits.length, 1);
    assert.equal(indHits[0].id, "ranolazine-strong-cyp3a4-inducer");
    assert.deepEqual(indHits[0].drugIds, ["ranolazine", "rifampin"]);

    assert.equal(safetyOnDesk(["ranolazine", "ketoconazole", "rifampin"]).length, 1);
  });

  it("detects Venetoclax × Strong CYP3A4 Inhibitors as contraindicated fatal TLS exposure surge", () => {
    for (const perp of [
      "ketoconazole",
      "itraconazole",
      "posaconazole",
      "voriconazole",
      "clarithromycin",
      "ritonavir",
      "cobicistat",
      "paxlovid",
      "nefazodone",
    ]) {
      assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", perp), true, `venetoclax + ${perp}`);
      assert.equal(isVenetoclaxStrongCyp3a4Tls(perp, "venetoclax"), true, `${perp} + venetoclax`);
    }

    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", "fluconazole"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("fluconazole", "venetoclax"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", "isavuconazole"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", "azithromycin"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", "ketoconazole-topical"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", "voriconazole-eye"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", "ciprofloxacin-ophthalmic"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax-topical", "ketoconazole"), false);
    assert.equal(isVenetoclaxStrongCyp3a4Tls("venetoclax", "venetoclax"), false);

    assert.equal(safetyOnDesk(["venetoclax", "fluconazole"]).length, 0);
    assert.equal(safetyOnDesk(["venetoclax", "isavuconazole"]).length, 0);
    assert.equal(safetyOnDesk(["venetoclax", "azithromycin"]).length, 0);
    assert.equal(safetyOnDesk(["venetoclax", "ketoconazole-topical"]).length, 0);
    assert.equal(safetyOnDesk(["venetoclax", "voriconazole-eye"]).length, 0);

    const ketoHits = safetyOnDesk(["venetoclax", "ketoconazole"]);
    assert.equal(ketoHits.length, 1);
    assert.equal(ketoHits[0].id, "venetoclax-strong-cyp3a4-tls");
    assert.deepEqual(ketoHits[0].drugIds, ["venetoclax", "ketoconazole"]);
    assert.equal(ketoHits[0].severity, "contraindicated");
    assert.equal(ketoHits[0].tone, "danger");
    assert.equal(ketoHits[0].mechanism, "venetoclax × strong CYP3A4 inhibitor — fatal Tumor Lysis Syndrome (TLS) exposure surge");
    assert.match(ketoHits[0].clinical, /Venclexta Section 4.*ramp-up.*Tumor Lysis Syndrome/i);
    assert.match(ketoHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\.$/);
    assert.match(ketoHits[0].source, /Venclexta \(venetoclax\).*35456528.*41104611/);

    const revHits = safetyOnDesk(["paxlovid", "venetoclax"]);
    assert.equal(revHits.length, 1);
    assert.equal(revHits[0].id, "venetoclax-strong-cyp3a4-tls");
    assert.deepEqual(revHits[0].drugIds, ["venetoclax", "paxlovid"]);

    assert.equal(safetyOnDesk(["venetoclax", "ketoconazole", "ritonavir"]).length, 1);
  });

  it("detects Voriconazole × Strong CYP450 Inducers as contraindicated AUC collapse & fungal failure", () => {
    for (const ind of [
      "rifampin",
      "carbamazepine",
      "carbamazepine-xr",
      "carbamazepine-equetro",
      "phenobarbital",
      "primidone",
      "st-johns-wort",
      "efavirenz",
      "ritonavir",
    ]) {
      assert.equal(isVoriconazoleStrongInducer("voriconazole", ind), true, `voriconazole + ${ind}`);
      assert.equal(isVoriconazoleStrongInducer(ind, "voriconazole"), true, `${ind} + voriconazole`);
    }

    assert.equal(isVoriconazoleStrongInducer("voriconazole", "fluconazole"), false);
    assert.equal(isVoriconazoleStrongInducer("fluconazole", "rifampin"), false);
    assert.equal(isVoriconazoleStrongInducer("voriconazole", "azithromycin"), false);
    assert.equal(isVoriconazoleStrongInducer("voriconazole", "phenytoin"), false);
    assert.equal(isVoriconazoleStrongInducer("voriconazole-eye", "rifampin"), false);
    assert.equal(isVoriconazoleStrongInducer("voriconazole-eye", "carbamazepine"), false);
    assert.equal(isVoriconazoleStrongInducer("voriconazole", "rifampin-topical"), false);
    assert.equal(isVoriconazoleStrongInducer("voriconazole", "phenylephrine-ophthalmic"), false);
    assert.equal(isVoriconazoleStrongInducer("voriconazole", "voriconazole"), false);

    assert.equal(safetyOnDesk(["voriconazole", "fluconazole"]).length, 0);
    assert.equal(safetyOnDesk(["fluconazole", "rifampin"]).length, 0);
    assert.equal(safetyOnDesk(["voriconazole-eye", "rifampin"]).length, 0);

    // Voriconazole + phenytoin remains scoped to phenytoin-cyp2c9-inhibition without colliding
    const voriPhenyHits = safetyOnDesk(["voriconazole", "phenytoin"]);
    assert.deepEqual(voriPhenyHits.map((h) => h.id), ["phenytoin-cyp2c9-inhibition"]);

    const rifHits = safetyOnDesk(["voriconazole", "rifampin"]);
    assert.equal(rifHits.length, 1);
    assert.equal(rifHits[0].id, "voriconazole-strong-inducer");
    assert.deepEqual(rifHits[0].drugIds, ["voriconazole", "rifampin"]);
    assert.equal(rifHits[0].severity, "contraindicated");
    assert.equal(rifHits[0].tone, "danger");
    assert.equal(rifHits[0].mechanism, "voriconazole × strong CYP450 inducer — >90% AUC collapse & invasive fungal failure");
    assert.match(rifHits[0].clinical, /Vfend Section 4.*CYP2C19.*~96%.*invasive aspergillosis/i);
    assert.match(rifHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\.$/);
    assert.match(rifHits[0].source, /Vfend \(voriconazole\).*28177134/);

    const ritHits = safetyOnDesk(["ritonavir", "voriconazole"]);
    assert.equal(ritHits.length, 1);
    assert.equal(ritHits[0].id, "voriconazole-strong-inducer");
    assert.deepEqual(ritHits[0].drugIds, ["voriconazole", "ritonavir"]);

    const cbzHits = safetyOnDesk(["carbamazepine", "voriconazole"]);
    assert.equal(cbzHits.length, 1);
    assert.equal(cbzHits[0].id, "voriconazole-strong-inducer");
    assert.deepEqual(cbzHits[0].drugIds, ["voriconazole", "carbamazepine"]);

    assert.equal(safetyOnDesk(["voriconazole", "rifampin", "carbamazepine"]).length, 1);
  });

  it("detects Valproate / Divalproex × Topiramate as major hyperammonemic encephalopathy & hypothermia risk", () => {
    for (const vpa of ["valproate", "divalproex", "valproate-sprinkle", "valproate-iv"]) {
      for (const tpm of ["topiramate", "topiramate-xr"]) {
        assert.equal(isValproateTopiramateHyperammonemia(vpa, tpm), true, `${vpa} + ${tpm}`);
        assert.equal(isValproateTopiramateHyperammonemia(tpm, vpa), true, `${tpm} + ${vpa}`);
      }
    }

    assert.equal(isValproateTopiramateHyperammonemia("valproate", "levetiracetam"), false);
    assert.equal(isValproateTopiramateHyperammonemia("divalproex", "levetiracetam"), false);
    assert.equal(isValproateTopiramateHyperammonemia("topiramate", "levetiracetam"), false);
    assert.equal(isValproateTopiramateHyperammonemia("valproate", "divalproex"), false);
    assert.equal(isValproateTopiramateHyperammonemia("valproate-topical", "topiramate"), false);
    assert.equal(isValproateTopiramateHyperammonemia("valproate", "topiramate-ophthalmic"), false);
    assert.equal(isValproateTopiramateHyperammonemia("valproate", "valproate"), false);

    assert.equal(safetyOnDesk(["valproate", "levetiracetam"]).length, 0);
    assert.equal(safetyOnDesk(["topiramate", "levetiracetam"]).length, 0);

    const vpaHits = safetyOnDesk(["valproate", "topiramate"]);
    assert.equal(vpaHits.length, 1);
    assert.equal(vpaHits[0].id, "valproate-topiramate-hyperammonemia");
    assert.deepEqual(vpaHits[0].drugIds, ["valproate", "topiramate"]);
    assert.equal(vpaHits[0].severity, "major");
    assert.equal(vpaHits[0].tone, "danger");
    assert.equal(vpaHits[0].mechanism, "valproate / divalproex × topiramate — hyperammonemic encephalopathy & hypothermia");
    assert.match(vpaHits[0].clinical, /CPS-I.*carbonic anhydrase V.*AST\/ALT.*hypothermia/i);
    assert.match(vpaHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\.$/);
    assert.match(vpaHits[0].source, /Depakote \(divalproex\) & Topamax \(topiramate\).*40606599.*39873559/);

    const divHits = safetyOnDesk(["topiramate", "divalproex"]);
    assert.equal(divHits.length, 1);
    assert.equal(divHits[0].id, "valproate-topiramate-hyperammonemia");
    assert.deepEqual(divHits[0].drugIds, ["divalproex", "topiramate"]);

    assert.equal(safetyOnDesk(["valproate", "divalproex", "topiramate"]).length, 1);
  });

  it("detects Methotrexate × Proton Pump Inhibitors (PPIs) as major BCRP/OAT3 delayed elimination risk", () => {
    for (const ppi of [
      "omeprazole",
      "esomeprazole",
      "lansoprazole",
      "pantoprazole",
      "rabeprazole",
      "dexlansoprazole",
      "omeprazole-sodium-bicarbonate",
    ]) {
      assert.equal(isMtxPpiDelayedClearance("methotrexate", ppi), true, `methotrexate + ${ppi}`);
      assert.equal(isMtxPpiDelayedClearance(ppi, "methotrexate"), true, `${ppi} + methotrexate`);
    }

    assert.equal(isMtxPpiDelayedClearance("methotrexate", "famotidine"), false);
    assert.equal(isMtxPpiDelayedClearance("famotidine", "methotrexate"), false);
    assert.equal(isMtxPpiDelayedClearance("methotrexate", "vonoprazan"), false);
    assert.equal(isMtxPpiDelayedClearance("methotrexate", "acetaminophen"), false);
    assert.equal(isMtxPpiDelayedClearance("methotrexate-topical", "omeprazole"), false);
    assert.equal(isMtxPpiDelayedClearance("methotrexate", "omeprazole-topical"), false);
    assert.equal(isMtxPpiDelayedClearance("methotrexate", "pantoprazole-ophthalmic"), false);
    assert.equal(isMtxPpiDelayedClearance("methotrexate", "methotrexate"), false);

    assert.equal(safetyOnDesk(["methotrexate", "famotidine"]).length, 0);
    assert.equal(safetyOnDesk(["methotrexate", "vonoprazan"]).length, 0);

    const omeHits = safetyOnDesk(["methotrexate", "omeprazole"]);
    assert.equal(omeHits.length, 1);
    assert.equal(omeHits[0].id, "mtx-ppi-delayed-clearance");
    assert.deepEqual(omeHits[0].drugIds, ["methotrexate", "omeprazole"]);
    assert.equal(omeHits[0].severity, "major");
    assert.equal(omeHits[0].tone, "danger");
    assert.equal(omeHits[0].mechanism, "methotrexate × proton pump inhibitor (PPI) — BCRP/OAT3 renal delayed elimination");
    assert.match(omeHits[0].clinical, /7-hydroxymethotrexate.*OAT3.*BCRP.*pancytopenia/i);
    assert.match(omeHits[0].watch, /The Prescribing Information governs\. This desk does not pick the dose or replacement agent\.$/);
    assert.match(omeHits[0].source, /Methotrexate Prescribing Information.*36946211.*42255661/);

    const pantoHits = safetyOnDesk(["pantoprazole", "methotrexate"]);
    assert.equal(pantoHits.length, 1);
    assert.equal(pantoHits[0].id, "mtx-ppi-delayed-clearance");
    assert.deepEqual(pantoHits[0].drugIds, ["methotrexate", "pantoprazole"]);

    assert.equal(safetyOnDesk(["methotrexate", "omeprazole", "pantoprazole"]).length, 1);
  });

  it("detects Emerging Orphine / Nitazene Synthetic Opioids × Benzodiazepines (orphine-nitazene-sedative-stack)", () => {
    for (const op of ["cychlorphine", "brorphine", "spirochlorphine", "sr-17018", "protonitazepyne", "metonitazepyne", "etonitazepipne", "norisotonitazene"]) {
      assert.equal(isOpioid(op), true, `${op} should be recognized as opioid`);
    }
    for (const bz of ["phenazolam", "ethylbromazolam", "ethylflualprazolam", "desalkylgidazepam", "bromazolam", "alprazolam"]) {
      assert.equal(isBenzo(bz), true, `${bz} should be recognized as benzo`);
    }

    assert.equal(isOrphineNitazeneSedativeStack("cychlorphine", "phenazolam"), true);
    assert.equal(isOrphineNitazeneSedativeStack("protonitazepyne", "ethylbromazolam"), true);
    assert.equal(isOrphineNitazeneSedativeStack("sr-17018", "desalkylgidazepam"), true);
    assert.equal(isOrphineNitazeneSedativeStack("oxycodone", "alprazolam"), false);
    assert.equal(isOrphineNitazeneSedativeStack("cychlorphine", "medetomidine"), false);

    for (const [op, bz] of [
      ["cychlorphine", "phenazolam"],
      ["protonitazepyne", "ethylbromazolam"],
      ["sr-17018", "desalkylgidazepam"],
    ] as const) {
      const hits = safetyOnDesk([op, bz]);
      const hit = hits.find((h) => h.id === "orphine-nitazene-sedative-stack");
      assert.ok(hit, `Expected orphine-nitazene-sedative-stack for ${op} + ${bz}`);
      assert.equal(hit.severity, "contraindicated");
      assert.equal(hit.regulatoryTier, "contraindicated");
      assert.equal(hit.tone, "danger");
      assert.match(
        hit.title,
        /Emerging orphine\/nitazene synthetic opioid \+ benzodiazepine respiratory arrest & counterfeit-pill toxicity/,
      );
      assert.match(hit.clinical, /fentanyl test strips.*CYP3A4.*designer-benzodiazepine coma unreversed/i);
      assert.match(hit.watch, /bag-valve-mask ventilation.*norisotonitazene.*avoid flumazenil/i);
      assert.match(hit.source, /42979587/);
      assert.match(hit.source, /42931793/);
      assert.match(hit.source, /42392847/);
      assert.deepEqual(
        hit.citations?.map((c) => c.pmid),
        ["42979587", "42931793", "42392847"],
      );
    }
  });

  it("detects Street / Emerging Synthetic Opioids × Alpha-2 Adrenergic Adulterants (emerging-opioid-alpha2-adulterant)", () => {
    assert.equal(isEmergingOpioidAlpha2Adulterant("cychlorphine", "medetomidine"), true);
    assert.equal(isEmergingOpioidAlpha2Adulterant("protonitazepyne", "xylazine"), true);
    assert.equal(isEmergingOpioidAlpha2Adulterant("fentanyl", "medetomidine"), true);
    assert.equal(isEmergingOpioidAlpha2Adulterant("seven-oh", "medetomidine"), true);
    assert.equal(isEmergingOpioidAlpha2Adulterant("dirty-30", "xylazine"), true);
    assert.equal(isEmergingOpioidAlpha2Adulterant("cychlorphine", "phenazolam"), false);
    assert.equal(isEmergingOpioidAlpha2Adulterant("medetomidine", "xylazine"), false);

    for (const [op, a2] of [
      ["cychlorphine", "medetomidine"],
      ["protonitazepyne", "xylazine"],
      ["fentanyl", "medetomidine"],
    ] as const) {
      const hits = safetyOnDesk([op, a2]);
      const hit = hits.find((h) => h.id === "emerging-opioid-alpha2-adulterant");
      assert.ok(hit, `Expected emerging-opioid-alpha2-adulterant for ${op} + ${a2}`);
      assert.equal(hit.severity, "contraindicated");
      assert.equal(hit.regulatoryTier, "contraindicated");
      assert.equal(hit.tone, "danger");
      assert.match(
        hit.title,
        /Synthetic opioid \+ α2-adrenergic adulterant \(medetomidine \/ xylazine\) naloxone-refractory coma & severe bradycardia/,
      );
      assert.match(hit.clinical, /100 to 200 times more potent than xylazine.*locus coeruleus.*autonomic rebound withdrawal/i);
      assert.match(hit.watch, /restore spontaneous ventilation.*bradycardia\/hypotension.*rebound hypertension/i);
      assert.match(hit.source, /42996303/);
      assert.match(hit.source, /42276321/);
      assert.deepEqual(
        hit.citations?.map((c) => c.pmid),
        ["42996303", "42276321"],
      );
    }
  });

  it("detects CYP2D6 opioid prodrugs × strong CYP2D6 inhibitors (prodrug-cyp2d6-opioid-failure)", () => {
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "fluoxetine"), true);
    assert.equal(isProdrugCyp2d6OpioidFailure("paroxetine", "codeine"), true);
    assert.equal(isProdrugCyp2d6OpioidFailure("tramadol", "bupropion"), true);
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "quinidine"), true);
    assert.equal(isProdrugCyp2d6OpioidFailure("tramadol", "terbinafine"), true);
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "cinacalcet"), true);
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "dextromethorphan-bupropion"), true);
    assert.equal(isProdrugCyp2d6OpioidFailure("tramadol", "auvelity"), true);

    assert.equal(isProdrugCyp2d6OpioidFailure("morphine", "fluoxetine"), false);
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "sertraline"), false);
    // Moderate CYP2D6 inhibitors stay out: the catalog and the FDA label both grade
    // mirabegron moderate, and this rule speaks only to strong inhibition.
    assert.equal(isProdrugCyp2d6OpioidFailure("tramadol", "mirabegron"), false);
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "duloxetine"), false);
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "terbinafine-topical"), false);
    assert.equal(isProdrugCyp2d6OpioidFailure("codeine", "tramadol"), false);

    for (const [prodrug, inhibitor] of [
      ["codeine", "fluoxetine"],
      ["tramadol", "bupropion"],
    ] as const) {
      const hits = safetyOnDesk([prodrug, inhibitor]);
      const hit = hits.find((h) => h.id === "prodrug-cyp2d6-opioid-failure");
      assert.ok(hit, `Expected prodrug-cyp2d6-opioid-failure for ${prodrug} + ${inhibitor}`);
      assert.deepEqual(hit.drugIds, [prodrug, inhibitor]);
      assert.equal(hit.severity, "major");
      assert.equal(hit.regulatoryTier, "label-major");
      assert.equal(hit.tone, "warn");
      assert.match(hit.title, /CYP2D6 prodrug bioactivation blockade \(blunted analgesia\)$/);
      assert.match(hit.clinical, /O-demethylation to morphine.*O-desmethyltramadol \(M1\).*phenoconvert/i);
      assert.match(hit.watch, /non-CYP2D6-dependent analgesic alternative.*The Prescribing Information governs\./i);
      assert.match(hit.source, /24458010/);
      // Laugesen 2005 (paroxetine blunting tramadol analgesia) replaced Kirchheiner 2007,
      // which measured ultrarapid metabolizers and so pointed the opposite way.
      assert.match(hit.source, /15903129/);
      assert.deepEqual(
        hit.citations?.map((c) => c.pmid),
        ["24458010", "15903129"],
      );
    }
  });

  it("detects St. John's wort × narrow-index CYP3A4 / P-gp substrates (botanical-st-johns-wort-narrow-inducer)", () => {
    for (const victim of [
      "cyclosporine",
      "tacrolimus",
      "sirolimus",
      "everolimus",
      "apixaban",
      "rivaroxaban",
      "dabigatran",
      "edoxaban",
      "warfarin",
      "digoxin",
      "ethinyl-estradiol",
      "indinavir",
      "irinotecan",
      "imatinib",
      "methadone",
      "midazolam",
    ]) {
      assert.equal(isBotanicalStJohnsWortNarrowInducer("st-johns-wort", victim), true, victim);
      assert.equal(isBotanicalStJohnsWortNarrowInducer(victim, "st-johns-wort"), true, victim);
    }

    assert.equal(isBotanicalStJohnsWortNarrowInducer("st-johns-wort", "acetaminophen"), false);
    assert.equal(isBotanicalStJohnsWortNarrowInducer("st-johns-wort", "cyclosporine-ophthalmic"), false);
    assert.equal(isBotanicalStJohnsWortNarrowInducer("st-johns-wort", "tacrolimus-topical"), false);

    // Contraindicated is reserved for the victims whose labels say do-not-use and whose
    // published drop is a collapse: antiretrovirals and transplant immunosuppressants.
    for (const victim of ["tacrolimus", "cyclosporine", "sirolimus", "everolimus", "indinavir"] as const) {
      const hits = safetyOnDesk(["st-johns-wort", victim]);
      const hit = hits.find((h) => h.id === "botanical-st-johns-wort-narrow-inducer");
      assert.ok(hit, `Expected botanical-st-johns-wort-narrow-inducer for st-johns-wort + ${victim}`);
      assert.deepEqual(hit.drugIds, ["st-johns-wort", victim]);
      assert.equal(hit.severity, "contraindicated");
      assert.equal(hit.regulatoryTier, "contraindicated");
      assert.equal(hit.tone, "danger");
      assert.match(hit.title, /St\. John's wort \+ .+: PXR CYP3A4 & P-gp induction \(treatment failure \/ rejection risk\)$/);
      assert.match(hit.clinical, /hyperforin.*pregnane X receptor \(PXR\).*Indinavir AUC fell 57%.*1–2 weeks/i);
      assert.match(hit.watch, /Avoid St\. John's wort.*rebound over 1–2 weeks.*The Prescribing Information governs\./i);
      assert.match(hit.source, /13129991/);
      assert.match(hit.source, /10546917/);
      assert.match(hit.source, /11180019/);
      assert.match(hit.source, /10683007/);
      assert.deepEqual(
        hit.citations?.map((c) => c.pmid),
        ["13129991", "10546917", "11180019", "10683007"],
      );
    }

    // Everything else the labels treat as avoid-or-monitor is major, not contraindicated.
    // Johne 1999 measured a 25% fall in digoxin exposure and Dürr 2000 an 18% fall.
    for (const victim of ["apixaban", "digoxin", "warfarin", "midazolam", "methadone", "imatinib"] as const) {
      const hit = safetyOnDesk(["st-johns-wort", victim]).find(
        (h) => h.id === "botanical-st-johns-wort-narrow-inducer",
      );
      assert.ok(hit, `Expected botanical-st-johns-wort-narrow-inducer for st-johns-wort + ${victim}`);
      assert.equal(hit.severity, "major", victim);
      assert.equal(hit.regulatoryTier, "label-major", victim);
      assert.equal(hit.tone, "warn", victim);
      assert.match(hit.title, /\(reduced victim exposure\)$/);
      assert.match(hit.clinical, /digoxin AUC fell 25%/);
    }

    // A collapse-tier victim anywhere on the desk sets the grade for the whole finding.
    const mixed = safetyOnDesk(["st-johns-wort", "digoxin", "tacrolimus"]).find(
      (h) => h.id === "botanical-st-johns-wort-narrow-inducer",
    );
    assert.ok(mixed);
    assert.equal(mixed.severity, "contraindicated");
    assert.deepEqual(mixed.drugIds, ["st-johns-wort", "tacrolimus"]);
  });

  it("detects Berberine × calcineurin inhibitors and sensitive CYP2D6/3A4/2C9 substrates (botanical-berberine-cyp-victim)", () => {
    for (const victim of [
      "cyclosporine",
      "tacrolimus",
      "sirolimus",
      "everolimus",
      "dextromethorphan",
      "atomoxetine",
      "metoprolol",
      "midazolam",
      "simvastatin",
      "lovastatin",
      "apixaban",
      "rivaroxaban",
      "warfarin",
      "pimozide",
      "colchicine",
      "codeine",
      "tramadol",
    ]) {
      assert.equal(isBotanicalBerberineCypVictim("berberine", victim), true, victim);
      assert.equal(isBotanicalBerberineCypVictim(victim, "berberine"), true, victim);
    }

    assert.equal(isBotanicalBerberineCypVictim("berberine", "acetaminophen"), false);
    assert.equal(isBotanicalBerberineCypVictim("berberine", "cyclosporine-ophthalmic"), false);

    for (const victim of ["cyclosporine", "dextromethorphan"] as const) {
      const hits = safetyOnDesk(["berberine", victim]);
      const hit = hits.find((h) => h.id === "botanical-berberine-cyp-victim");
      assert.ok(hit, `Expected botanical-berberine-cyp-victim for berberine + ${victim}`);
      assert.deepEqual(hit.drugIds, ["berberine", victim]);
      assert.equal(hit.severity, "major");
      assert.equal(hit.regulatoryTier, "label-major");
      assert.equal(hit.tone, "warn");
      assert.match(hit.title, /^Berberine \+ .+: Multi-isoform CYP2D6 \/ CYP3A4 \/ CYP2C9 botanical inhibition$/);
      // The detail now carries the measured magnitudes and claims no P-gp arm, which
      // Guo 2012 never ran, and no tacrolimus data, which nobody here has.
      assert.match(hit.clinical, /ninefold.*losartan ratio doubled; midazolam AUC up 40%/i);
      assert.match(hit.clinical, /cyclosporine AUC 34\.5% and trough concentrations 88%/i);
      assert.doesNotMatch(hit.clinical, /P-gp/);
      assert.match(hit.watch, /clinically active CYP perpetrators.*The Prescribing Information governs\./i);
      assert.match(hit.source, /21870106/);
      assert.match(hit.source, /16133554/);
      assert.deepEqual(
        hit.citations?.map((c) => c.pmid),
        ["21870106", "16133554"],
      );
    }
  });

  it("detects OTC Lithium Orotate × prescription lithium or renal lithium-clearance perpetrators (otc-lithium-orotate-renal-trap)", () => {
    for (const partner of [
      "lithium",
      "ibuprofen",
      "naproxen",
      "meloxicam",
      "celecoxib",
      "diclofenac",
      "indomethacin",
      "ketorolac",
      "lisinopril",
      "enalapril",
      "ramipril",
      "losartan",
      "valsartan",
      "olmesartan",
      "irbesartan",
      "hctz",
      "chlorthalidone",
      "indapamide",
      "metolazone",
    ]) {
      assert.equal(isOtcLithiumOrotateRenalTrap("lithium-orotate", partner), true, partner);
      assert.equal(isOtcLithiumOrotateRenalTrap(partner, "lithium-orotate"), true, partner);
    }

    assert.equal(isOtcLithiumOrotateRenalTrap("lithium-orotate", "acetaminophen"), false);
    assert.equal(isOtcLithiumOrotateRenalTrap("lithium-orotate", "atorvastatin"), false);
    assert.equal(isOtcLithiumOrotateRenalTrap("lithium-orotate", "lithium-orotate"), false);
    // Finley 1995 puts thiazides at a 25–40% rise and calls loop and potassium-sparing
    // diuretics minor and variable, so they no longer fire a thiazide-grade claim.
    for (const diuretic of ["furosemide", "bumetanide", "torsemide", "spironolactone", "amiloride"] as const) {
      assert.equal(isOtcLithiumOrotateRenalTrap("lithium-orotate", diuretic), false, diuretic);
    }

    const dupHits = safetyOnDesk(["lithium-orotate", "lithium"]);
    const dupHit = dupHits.find((h) => h.id === "otc-lithium-orotate-renal-trap");
    assert.ok(dupHit);
    assert.deepEqual(dupHit.drugIds, ["lithium-orotate", "lithium"]);
    assert.equal(dupHit.severity, "major");
    assert.equal(dupHit.regulatoryTier, "label-major");
    assert.equal(dupHit.tone, "danger");
    assert.match(dupHit.title, /^Lithium Orotate \+ Lithium: Unstandardized OTC elemental lithium \+ reduced renal lithium clearance$/);
    assert.match(dupHit.clinical, /Thiazide and thiazide-like diuretics raise it most \(25–40%/i);
    assert.match(dupHit.clinical, /Loop and potassium-sparing diuretics have only minor, variable effects/i);
    assert.match(dupHit.clinical, /not standardized across supplements/i);
    assert.match(dupHit.watch, /Reconcile OTC mineral and nootropic supplements.*The Prescribing Information governs\./i);
    assert.match(dupHit.source, /8521679/);
    assert.match(dupHit.source, /22265699/);
    assert.deepEqual(
      dupHit.citations?.map((c) => c.pmid),
      ["8521679", "22265699"],
    );

    const renalHits = safetyOnDesk(["lithium-orotate", "ibuprofen", "lisinopril"]);
    const renalHit = renalHits.find((h) => h.id === "otc-lithium-orotate-renal-trap");
    assert.ok(renalHit);
    assert.equal(renalHit.severity, "major");
    assert.equal(renalHit.regulatoryTier, "label-major");
    assert.equal(renalHit.tone, "danger");
    assert.match(renalHit.title, /^Lithium Orotate \+ Ibuprofen \/ Lisinopril: Unstandardized OTC elemental lithium \+ reduced renal lithium clearance$/);
    assert.deepEqual(
      renalHit.citations?.map((c) => c.pmid),
      ["8521679", "22265699"],
    );
  });

  it("continues to detect existing high-risk safety collisions", () => {
    assert.equal(isSofosbuvirAmio("sofosbuvir", "amiodarone"), true);
    assert.equal(isSofosbuvirAmio("epclusa", "amiodarone"), true);
    assert.equal(isSofosbuvirAmio("sofosbuvir", "metoprolol"), false);

    const amioHits = safetyOnDesk(["sofosbuvir", "amiodarone"]);
    assert.equal(amioHits.length, 1);
    assert.equal(amioHits[0].id, "sofosbuvir-amio");
    assert.equal(amioHits[0].severity, "contraindicated");

    assert.equal(isClozapineBenzo("clozapine", "lorazepam"), true);
    assert.equal(isClozapineBenzo("alprazolam", "clozapine"), true);
    assert.equal(isClozapineBenzo("clozapine", "zolpidem"), false);

    const clozHits = safetyOnDesk(["clozapine", "lorazepam"]);
    assert.equal(clozHits.length, 1);
    assert.equal(clozHits[0].id, "clozapine-benzo");
    assert.equal(clozHits[0].severity, "contraindicated");
  });

  it("returns empty array when regimen has no mapped collisions", () => {
    const hits = safetyOnDesk(["acetaminophen", "atorvastatin"]);
    assert.equal(hits.length, 0);
  });
});
