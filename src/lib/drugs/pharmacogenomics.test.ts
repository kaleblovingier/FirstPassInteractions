import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  PHARMACOGENES,
  PGX_INTERACTIONS,
  PHARMACOGENOMICS_REGULATORY_DISCLAIMER,
  getAllPharmacogenes,
  getGeneById,
  getAllPgxInteractions,
  getInteractionsForGene,
  getInteractionsForDrug,
  getTherapeuticAreas,
  getInteractionsByTherapeuticArea,
  detectPgxRisksOnTray,
} from "./pharmacogenomics";

describe("Pharmacogenomics & CPIC Drug-Gene Mechanism Matrix", () => {
  it("defines the major pharmacogenes with complete structural annotations", () => {
    const genes = getAllPharmacogenes();
    assert.ok(genes.length >= 8, "Must contain all major clinical pharmacogenes");

    const expectedGeneIds = [
      "CYP2D6",
      "CYP2C19",
      "CYP2C9",
      "VKORC1",
      "HLA-B5701",
      "HLA-B1502",
      "HLA-A3101",
      "DPYD",
      "TPMT",
      "NUDT15",
      "G6PD",
    ];

    for (const gid of expectedGeneIds) {
      const g = getGeneById(gid);
      assert.ok(g, `Pharmacogene ${gid} must be retrievable by getGeneById`);
      assert.ok(g.symbol.length > 0, `${gid} symbol must not be empty`);
      assert.ok(g.name.length > 0, `${gid} name must not be empty`);
      assert.ok(g.chromosomeLocation.length > 0, `${gid} chromosomeLocation required`);
      assert.ok(g.ncbiGeneId.length > 0, `${gid} ncbiGeneId required`);
      assert.ok(g.systemRole.length > 0, `${gid} systemRole required`);
      assert.ok(g.molecularMechanism.length > 0, `${gid} molecularMechanism required`);
      assert.ok(g.alleles.length > 0, `${gid} must have alleles defined`);
      assert.ok(g.phenotypes.length > 0, `${gid} must have phenotypes defined`);
      assert.ok(g.citations.length > 0, `${gid} must have citations`);
    }
  });

  describe("Specific Pharmacogene Allele & Phenotype Configurations", () => {
    it("validates CYP2D6 alleles (*1, *2, *4, *5, *10, *41, *1xN) and phenotypes (PM, IM, NM, UM)", () => {
      const cyp2d6 = getGeneById("CYP2D6")!;
      assert.ok(cyp2d6);

      const alleleNames = cyp2d6.alleles.map((a) => a.allele);
      assert.ok(alleleNames.includes("*1"), "CYP2D6 must include *1");
      assert.ok(alleleNames.includes("*2"), "CYP2D6 must include *2");
      assert.ok(alleleNames.includes("*4"), "CYP2D6 must include *4 (non-functional)");
      assert.ok(alleleNames.includes("*5"), "CYP2D6 must include *5 (deletion)");
      assert.ok(alleleNames.includes("*10"), "CYP2D6 must include *10 (decreased)");
      assert.ok(alleleNames.includes("*41"), "CYP2D6 must include *41 (decreased)");
      assert.ok(alleleNames.includes("*1xN"), "CYP2D6 must include *1xN (duplication)");

      const a4 = cyp2d6.alleles.find((a) => a.allele === "*4")!;
      assert.equal(a4.functionality, "No Function");
      assert.equal(a4.activityScore, 0);

      const a5 = cyp2d6.alleles.find((a) => a.allele === "*5")!;
      assert.equal(a5.functionality, "No Function");
      assert.equal(a5.activityScore, 0);

      const a10 = cyp2d6.alleles.find((a) => a.allele === "*10")!;
      assert.equal(a10.functionality, "Decreased Function");

      const a1xN = cyp2d6.alleles.find((a) => a.allele === "*1xN")!;
      assert.equal(a1xN.functionality, "Increased Function");

      const phenoCodes = cyp2d6.phenotypes.map((p) => p.code);
      assert.ok(phenoCodes.includes("PM"), "CYP2D6 must have Poor Metabolizer");
      assert.ok(phenoCodes.includes("IM"), "CYP2D6 must have Intermediate Metabolizer");
      assert.ok(phenoCodes.includes("NM"), "CYP2D6 must have Normal Metabolizer");
      assert.ok(phenoCodes.includes("UM"), "CYP2D6 must have Ultrarapid Metabolizer");
    });

    it("validates CYP2C19 alleles (*1, *2, *3, *17) and phenotypes (PM, IM, NM, RM, UM)", () => {
      const cyp2c19 = getGeneById("CYP2C19")!;
      assert.ok(cyp2c19);

      const alleleNames = cyp2c19.alleles.map((a) => a.allele);
      assert.ok(alleleNames.includes("*1"));
      assert.ok(alleleNames.includes("*2"));
      assert.ok(alleleNames.includes("*3"));
      assert.ok(alleleNames.includes("*17"));

      const a2 = cyp2c19.alleles.find((a) => a.allele === "*2")!;
      assert.equal(a2.functionality, "No Function");

      const a3 = cyp2c19.alleles.find((a) => a.allele === "*3")!;
      assert.equal(a3.functionality, "No Function");

      const a17 = cyp2c19.alleles.find((a) => a.allele === "*17")!;
      assert.equal(a17.functionality, "Increased Function");

      const phenoCodes = cyp2c19.phenotypes.map((p) => p.code);
      assert.ok(phenoCodes.includes("PM"));
      assert.ok(phenoCodes.includes("IM"));
      assert.ok(phenoCodes.includes("NM"));
      assert.ok(phenoCodes.includes("RM"));
      assert.ok(phenoCodes.includes("UM"));
    });

    it("validates CYP2C9 and VKORC1 clinical variants", () => {
      const cyp2c9 = getGeneById("CYP2C9")!;
      assert.ok(cyp2c9);
      const cyp2c9Alleles = cyp2c9.alleles.map((a) => a.allele);
      assert.ok(cyp2c9Alleles.includes("*1"));
      assert.ok(cyp2c9Alleles.includes("*2"));
      assert.ok(cyp2c9Alleles.includes("*3"));

      const a2 = cyp2c9.alleles.find((a) => a.allele === "*2")!;
      assert.match(a2.description, /Arg144Cys/i);

      const a3 = cyp2c9.alleles.find((a) => a.allele === "*3")!;
      assert.match(a3.description, /Ile359Leu/i);

      const vkorc1 = getGeneById("VKORC1")!;
      assert.ok(vkorc1);
      const vkorc1Alleles = vkorc1.alleles.map((a) => a.allele);
      assert.ok(vkorc1Alleles.includes("A"));
      const alleleA = vkorc1.alleles.find((a) => a.allele === "A")!;
      assert.match(alleleA.description, /-1639G>A/i);
    });

    it("validates HLA loci (HLA-B*57:01, HLA-B*15:02, HLA-A*31:01)", () => {
      const hlaB57 = getGeneById("HLA-B5701")!;
      assert.ok(hlaB57);
      assert.match(hlaB57.molecularMechanism, /F-pocket/i);
      assert.match(hlaB57.molecularMechanism, /self-peptide/i);

      const hlaB15 = getGeneById("HLA-B1502")!;
      assert.ok(hlaB15);
      assert.match(hlaB15.molecularMechanism, /granulysin/i);

      const hlaA31 = getGeneById("HLA-A3101")!;
      assert.ok(hlaA31);
    });

    it("validates DPYD alleles (*2A, *13, c.2846A>T) and pyrimidine catabolism role", () => {
      const dpyd = getGeneById("DPYD")!;
      assert.ok(dpyd);
      const alleleNames = dpyd.alleles.map((a) => a.allele);
      assert.ok(alleleNames.includes("*2A"));
      assert.ok(alleleNames.includes("*13"));
      assert.ok(alleleNames.includes("c.2846A>T"));

      const a2a = dpyd.alleles.find((a) => a.allele === "*2A")!;
      assert.equal(a2a.functionality, "No Function");
      assert.match(a2a.description, /c\.1905\+1G>A/i);

      const a13 = dpyd.alleles.find((a) => a.allele === "*13")!;
      assert.equal(a13.functionality, "No Function");
      assert.match(a13.description, /c\.1679T>G/i);

      assert.match(dpyd.systemRole, />80%/);
    });

    it("validates TPMT and NUDT15 thiopurine toxicity pathways", () => {
      const tpmt = getGeneById("TPMT")!;
      assert.ok(tpmt);
      const tpmtAlleles = tpmt.alleles.map((a) => a.allele);
      assert.ok(tpmtAlleles.includes("*2"));
      assert.ok(tpmtAlleles.includes("*3A"));
      assert.ok(tpmtAlleles.includes("*3C"));

      const nudt15 = getGeneById("NUDT15")!;
      assert.ok(nudt15);
      const nudtAlleles = nudt15.alleles.map((a) => a.allele);
      assert.ok(nudtAlleles.includes("*3"));
    });

    it("validates G6PD pentose phosphate pathway and hemolytic risk classes", () => {
      const g6pd = getGeneById("G6PD")!;
      assert.ok(g6pd);
      assert.match(g6pd.molecularMechanism, /NADPH/i);
      assert.match(g6pd.molecularMechanism, /glutathione/i);
      assert.match(g6pd.molecularMechanism, /Heinz/i);
    });
  });

  describe("Catalog Validation", () => {
    it("ensures EVERY drug ID referenced in all PGX interactions exists in DRUG_BY_ID", () => {
      const allInteractions = getAllPgxInteractions();
      assert.ok(allInteractions.length >= 15, "Must contain all major interactions");

      for (const ix of allInteractions) {
        const drug = DRUG_BY_ID[ix.drugId];
        assert.ok(
          drug,
          `Interaction '${ix.id}' references drugId '${ix.drugId}' which does not exist in DRUG_BY_ID catalog`,
        );
        assert.equal(
          drug.id,
          ix.drugId,
          `Interaction drugId '${ix.drugId}' must match catalog entry ID exactly`,
        );
      }
    });

    it("ensures EVERY drug ID in primaryDrugs of pharmacogenes exists in DRUG_BY_ID", () => {
      for (const gene of PHARMACOGENES) {
        for (const drugId of gene.primaryDrugs) {
          assert.ok(
            DRUG_BY_ID[drugId],
            `Gene '${gene.id}' primaryDrug '${drugId}' must exist in DRUG_BY_ID`,
          );
        }
      }
    });
  });

  describe("Core Clinical Drug-Gene Interactions Verification", () => {
    it("verifies Codeine & Tramadol with CYP2D6 bioactivation vs respiratory depression", () => {
      const codeineIx = getInteractionsForDrug("codeine");
      assert.ok(codeineIx.length > 0);
      const c = codeineIx.find((x) => x.geneId === "CYP2D6")!;
      assert.ok(c);
      assert.equal(c.cpicLevel, "Level A");
      assert.equal(c.fdaBoxedWarning, true);

      const umRisk = c.phenotypeRisks.find((r) => r.phenotype.includes("Ultrarapid"))!;
      assert.ok(umRisk);
      assert.equal(umRisk.severity, "critical");
      assert.match(umRisk.clinicalConsequence, /respiratory depression/i);

      const pmRisk = c.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
      assert.ok(pmRisk);
      assert.match(pmRisk.clinicalConsequence, /inadequate analgesia|failure/i);

      const tramadolIx = getInteractionsForDrug("tramadol");
      assert.ok(tramadolIx.length > 0);
      const t = tramadolIx.find((x) => x.geneId === "CYP2D6")!;
      assert.ok(t);
      assert.match(t.molecularMechanism, /O-desmethyltramadol/i);
    });

    it("verifies Tamoxifen with CYP2D6 endoxifen bioactivation", () => {
      const tamoxifenIx = getInteractionsForDrug("tamoxifen");
      assert.ok(tamoxifenIx.length > 0);
      const ix = tamoxifenIx.find((x) => x.geneId === "CYP2D6")!;
      assert.ok(ix);
      assert.equal(ix.cpicLevel, "Level A");
      assert.match(ix.molecularMechanism, /endoxifen/i);
      const pmRisk = ix.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
      assert.match(pmRisk.clinicalConsequence, /recurrence|breast cancer/i);
    });

    it("verifies Tricyclic Antidepressants (Amitriptyline, Nortriptyline) with CYP2D6", () => {
      const ami = getInteractionsForDrug("amitriptyline");
      assert.ok(ami.length > 0);
      const ami2d6 = ami.find((x) => x.geneId === "CYP2D6")!;
      assert.ok(ami2d6);
      assert.equal(ami2d6.cpicLevel, "Level A");
      const amiPm = ami2d6.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
      assert.match(amiPm.clinicalConsequence, /cardiac toxicity|arrhythmias|QTc/i);

      const nort = getInteractionsForDrug("nortriptyline");
      assert.ok(nort.length > 0);
      const nort2d6 = nort.find((x) => x.geneId === "CYP2D6")!;
      assert.ok(nort2d6);
      assert.equal(nort2d6.cpicLevel, "Level A");
    });

    it("verifies Clopidogrel with CYP2C19 bioactivation and stent thrombosis risk", () => {
      const clop = getInteractionsForDrug("clopidogrel");
      assert.ok(clop.length > 0);
      const ix = clop.find((x) => x.geneId === "CYP2C19")!;
      assert.ok(ix);
      assert.equal(ix.cpicLevel, "Level A");
      assert.equal(ix.fdaBoxedWarning, true);
      assert.match(ix.molecularMechanism, /thiol/i);
      assert.match(ix.molecularMechanism, /P2Y12/i);

      const pm = ix.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
      assert.ok(pm);
      assert.equal(pm.severity, "critical");
      assert.match(pm.clinicalConsequence, /stent thrombosis/i);
    });

    it("verifies Voriconazole with CYP2C19 supratherapeutic levels and subtherapeutic failure", () => {
      const vori = getInteractionsForDrug("voriconazole");
      assert.ok(vori.length > 0);
      const ix = vori.find((x) => x.geneId === "CYP2C19")!;
      assert.ok(ix);
      assert.equal(ix.cpicLevel, "Level A");
      const pm = ix.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
      assert.match(pm.clinicalConsequence, /neurotoxicity|hepatotoxicity/i);
      const um = ix.phenotypeRisks.find((r) => r.phenotype.includes("Ultrarapid"))!;
      assert.match(um.clinicalConsequence, /subtherapeutic|fungal/i);
    });

    it("verifies Citalopram and Escitalopram with CYP2C19 QTc prolongation", () => {
      for (const drugId of ["citalopram", "escitalopram"]) {
        const ixs = getInteractionsForDrug(drugId);
        assert.ok(ixs.length > 0);
        const ix = ixs.find((x) => x.geneId === "CYP2C19")!;
        assert.ok(ix);
        assert.equal(ix.cpicLevel, "Level A");
        const pm = ix.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
        assert.match(pm.clinicalConsequence, /QTc/i);
      }
    });

    it("verifies Warfarin with CYP2C9 and VKORC1 narrow therapeutic index sensitivity", () => {
      const warf = getInteractionsForDrug("warfarin");
      assert.ok(warf.length > 0);
      const ix = warf[0];
      assert.equal(ix.cpicLevel, "Level A");
      assert.equal(ix.fdaBoxedWarning, true);
      assert.match(ix.molecularMechanism, /S-warfarin/i);
      assert.match(ix.molecularMechanism, /epoxide reductase/i);

      const cypRisk = ix.phenotypeRisks.find((r) => r.phenotype.includes("CYP2C9"))!;
      assert.match(cypRisk.clinicalConsequence, /bleeding/i);
      const vkorc1Risk = ix.phenotypeRisks.find((r) => r.phenotype.includes("VKORC1"))!;
      assert.match(vkorc1Risk.clinicalConsequence, /sensitivity|bleeding/i);
    });

    it("verifies Phenytoin with CYP2C9 non-linear capacity saturation toxicity", () => {
      const pht = getInteractionsForDrug("phenytoin");
      assert.ok(pht.length > 0);
      const ix = pht.find((x) => x.geneId === "CYP2C9")!;
      assert.ok(ix);
      assert.equal(ix.cpicLevel, "Level A");
      const pm = ix.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
      assert.match(pm.clinicalConsequence, /ataxia|nystagmus|encephalopathy/i);
    });

    it("verifies Abacavir with HLA-B*57:01 F-pocket hypersensitivity and screening mandate", () => {
      const abv = getInteractionsForDrug("abacavir");
      assert.ok(abv.length > 0);
      const ix = abv.find((x) => x.geneId === "HLA-B5701")!;
      assert.ok(ix);
      assert.equal(ix.cpicLevel, "Level A");
      assert.equal(ix.fdaBoxedWarning, true);
      assert.match(ix.molecularMechanism, /F-pocket/i);
      assert.match(ix.molecularMechanism, /self-peptide/i);

      const carrier = ix.phenotypeRisks.find((r) => r.phenotype.includes("Carrier"))!;
      assert.equal(carrier.severity, "critical");
      assert.match(carrier.cpicRecommendation, /contraindicated/i);
      assert.match(carrier.cpicRecommendation, /screening/i);
    });

    it("verifies Carbamazepine and Oxcarbazepine with HLA-B*15:02 and HLA-A*31:01 SJS/TEN", () => {
      const cbz = getInteractionsForDrug("carbamazepine");
      assert.ok(cbz.length > 0);
      const cbzHla = cbz[0];
      assert.equal(cbzHla.cpicLevel, "Level A");
      assert.equal(cbzHla.fdaBoxedWarning, true);
      assert.match(cbzHla.molecularMechanism, /granulysin/i);

      const oxc = getInteractionsForDrug("oxcarbazepine");
      assert.ok(oxc.length > 0);
      const oxcHla = oxc[0];
      assert.equal(oxcHla.cpicLevel, "Level A");
      assert.match(oxcHla.molecularMechanism, /HLA-B\*15:02/i);
    });

    it("verifies Fluorouracil and Capecitabine with DPYD catabolic deficiency", () => {
      for (const drugId of ["fluorouracil", "capecitabine"]) {
        const ixs = getInteractionsForDrug(drugId);
        assert.ok(ixs.length > 0);
        const ix = ixs.find((x) => x.geneId === "DPYD")!;
        assert.ok(ix);
        assert.equal(ix.cpicLevel, "Level A");
        const pm = ix.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
        assert.equal(pm.severity, "critical");
        assert.match(pm.clinicalConsequence, /mucositis|sepsis|lethal/i);
      }
    });

    it("verifies Azathioprine and Mercaptopurine with TPMT and NUDT15 myelosuppression", () => {
      for (const drugId of ["azathioprine", "mercaptopurine"]) {
        const ixs = getInteractionsForDrug(drugId);
        assert.ok(ixs.length > 0);
        const ix = ixs.find((x) => x.geneId === "TPMT")!;
        assert.ok(ix);
        assert.equal(ix.cpicLevel, "Level A");
        assert.match(ix.molecularMechanism, /6-TGN|thioguanine/i);
        const pm = ix.phenotypeRisks.find((r) => r.phenotype.includes("Poor"))!;
        assert.equal(pm.severity, "critical");
        assert.match(pm.clinicalConsequence, /myelosuppression|leukopenia|pancytopenia/i);
      }
    });

    it("verifies Rasburicase, Primaquine, Dapsone, Nitrofurantoin with G6PD oxidative hemolysis", () => {
      const rasb = getInteractionsForDrug("rasburicase");
      assert.ok(rasb.length > 0);
      const rasbIx = rasb[0];
      assert.equal(rasbIx.cpicLevel, "Level A");
      assert.equal(rasbIx.fdaBoxedWarning, true);
      assert.match(rasbIx.molecularMechanism, /hydrogen peroxide/i);
      const rasbDef = rasbIx.phenotypeRisks.find((r) => r.phenotype.includes("Deficient"))!;
      assert.equal(rasbDef.severity, "critical");
      assert.match(rasbDef.cpicRecommendation, /contraindicated/i);

      const prim = getInteractionsForDrug("primaquine");
      assert.ok(prim.length > 0);
      assert.equal(prim[0].cpicLevel, "Level A");

      const dap = getInteractionsForDrug("dapsone");
      assert.ok(dap.length > 0);
      assert.equal(dap[0].cpicLevel, "Level B");

      const nitro = getInteractionsForDrug("nitrofurantoin");
      assert.ok(nitro.length > 0);
      assert.equal(nitro[0].cpicLevel, "Level B");
    });
  });

  describe("Tray PGx Risk Detection Engine", () => {
    it("returns empty array when no drugs are on tray", () => {
      assert.deepEqual(detectPgxRisksOnTray([]), []);
    });

    it("correctly identifies CPIC Level A alerts for single and combination regimens", () => {
      const risks = detectPgxRisksOnTray(["clopidogrel", "abacavir"]);
      assert.equal(risks.length, 2);

      const clopRisk = risks.find((r) => r.drugId === "clopidogrel")!;
      assert.ok(clopRisk);
      assert.equal(clopRisk.cpicLevel, "Level A");
      assert.equal(clopRisk.geneSymbol, "CYP2C19");
      assert.equal(clopRisk.severity, "critical");

      const abacRisk = risks.find((r) => r.drugId === "abacavir")!;
      assert.ok(abacRisk);
      assert.equal(abacRisk.cpicLevel, "Level A");
      assert.equal(abacRisk.geneSymbol, "HLA-B*57:01");
      assert.equal(abacRisk.severity, "critical");
    });

    it("ranks critical risks above high and moderate risks", () => {
      // nitrofurantoin (Level B, moderate) + fluorouracil (Level A, critical)
      const risks = detectPgxRisksOnTray(["nitrofurantoin", "fluorouracil"]);
      assert.ok(risks.length >= 2);
      assert.equal(risks[0].severity, "critical");
      assert.equal(risks[0].drugId, "fluorouracil");
    });

    it("ignores unrecognized drug IDs safely without crashing", () => {
      const risks = detectPgxRisksOnTray(["nonexistent_compound_123", "water"]);
      assert.deepEqual(risks, []);
    });
  });

  describe("Therapeutic Areas Filtering", () => {
    it("provides therapeutic areas list and filters correctly", () => {
      const areas = getTherapeuticAreas();
      assert.ok(areas.includes("Oncology"));
      assert.ok(areas.includes("Cardiology"));
      assert.ok(areas.includes("Psychiatry"));
      assert.ok(areas.includes("Infectious Disease"));

      const onco = getInteractionsByTherapeuticArea("Oncology");
      assert.ok(onco.length >= 3);
      assert.ok(onco.some((x) => x.drugId === "fluorouracil"));
      assert.ok(onco.some((x) => x.drugId === "tamoxifen"));

      const cardio = getInteractionsByTherapeuticArea("Cardiology");
      assert.ok(cardio.length >= 2);
      assert.ok(cardio.some((x) => x.drugId === "clopidogrel"));
      assert.ok(cardio.some((x) => x.drugId === "warfarin"));
    });
  });

  describe("Non-prescriptive CDS Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
    it("exports official regulatory disclaimer with explicit statutory citation", () => {
      assert.ok(PHARMACOGENOMICS_REGULATORY_DISCLAIMER.length > 0);
      assert.match(PHARMACOGENOMICS_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/);
      assert.match(PHARMACOGENOMICS_REGULATORY_DISCLAIMER, /educational/i);
      assert.match(PHARMACOGENOMICS_REGULATORY_DISCLAIMER, /Clinical Decision Support/i);
      assert.match(PHARMACOGENOMICS_REGULATORY_DISCLAIMER, /no.*dosing orders|not provide patient-specific dosing/i);
    });

    it("strictly avoids prescriptive directives throughout all guidelines and clinical descriptions", () => {
      for (const ix of PGX_INTERACTIONS) {
        const json = JSON.stringify(ix);
        assert.doesNotMatch(json, /\bprescribe\s+\d+\s*(%|mg)/i, `Interaction ${ix.id} has prescriptive directive`);
        assert.doesNotMatch(json, /\btake\s+\d+\s*mg\b/i, `Interaction ${ix.id} has dosing directive`);
        assert.doesNotMatch(json, /\bgive\s+\d+\s*mg\b/i, `Interaction ${ix.id} has dosing directive`);
      }
    });

    it("cites peer-reviewed literature and CPIC guideline publications for every interaction", () => {
      for (const ix of PGX_INTERACTIONS) {
        assert.ok(ix.citations.length > 0, `Interaction ${ix.id} must have citations`);
        const citText = ix.citations.join(" ");
        assert.match(citText, /Clin Pharmacol Ther|N Engl J Med|Nature|Blood|FDA/i);
      }
    });
  });
});
