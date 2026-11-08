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
