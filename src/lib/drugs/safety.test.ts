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

  it("continues to detect existing high-risk safety collisions", () => {
    const amioHits = safetyOnDesk(["sofosbuvir", "amiodarone"]);
    assert.equal(amioHits.length, 1);
    assert.equal(amioHits[0].id, "sofosbuvir-amio");
    assert.equal(amioHits[0].severity, "contraindicated");

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
