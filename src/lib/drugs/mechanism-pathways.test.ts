import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MECHANISM_PATHWAYS,
  REGULATORY_NOTICE,
  getAllPathways,
  getPathwayById,
  findPathwaysForDrug,
  type PathwayNodeType,
} from "./mechanism-pathways";

describe("Pharmacological Mechanism Pathways Database", () => {
  const EXPECTED_IDS = [
    "raas-nephron",
    "coagulation-cascade",
    "cardiac-action-potential",
    "monoamine-synapse",
    "nmj-cholinergic",
    "arachidonic-eicosanoid",
  ] as const;

  const VALID_CATEGORIES = new Set([
    "Cardiovascular & Renal",
    "Hematology & Hemostasis",
    "Neurotransmission",
    "Autonomic & Neuromuscular",
    "Inflammation & Eicosanoids",
  ]);

  const VALID_NODE_TYPES: Set<PathwayNodeType> = new Set([
    "enzyme",
    "receptor",
    "transporter",
    "ion-channel",
    "messenger",
    "effector",
  ]);

  it("contains exactly the 6 major required pharmacological mechanism pathways", () => {
    const all = getAllPathways();
    assert.equal(all.length, 6, "Must define exactly 6 major mechanism pathways");

    const ids = all.map((p) => p.id);
    assert.equal(new Set(ids).size, 6, "Pathway IDs must be strictly unique");

    for (const expectedId of EXPECTED_IDS) {
      assert.ok(ids.includes(expectedId), `Missing expected pathway ID: ${expectedId}`);
    }
  });

  it("all pathways have valid categories, titles, summaries, and citations", () => {
    for (const pathway of MECHANISM_PATHWAYS) {
      assert.ok(pathway.id.length > 0, "ID must not be empty");
      assert.ok(pathway.name.length > 0, "Name must not be empty");
      assert.ok(pathway.shortTitle.length > 0, "Short title must not be empty");
      assert.ok(VALID_CATEGORIES.has(pathway.category), `Invalid category: ${pathway.category}`);
      assert.ok(pathway.summary.length > 50, `Summary too short for ${pathway.id}`);
      assert.ok(pathway.clinicalRelevance.length > 50, `Relevance too short for ${pathway.id}`);
      assert.ok(pathway.citations.length >= 2, `Pathway ${pathway.id} must cite at least 2 peer-reviewed sources`);
      assert.ok(pathway.clinicalPearls.length >= 2, `Pathway ${pathway.id} must contain at least 2 clinical pearls`);
      assert.ok(pathway.keyDrugIds.length >= 4, `Pathway ${pathway.id} must list at least 4 key drugs`);
    }
  });

  it("all pathway nodes have valid biochemical types, descriptions, and non-empty structures", () => {
    for (const pathway of MECHANISM_PATHWAYS) {
      assert.ok(pathway.nodes.length >= 4, `Pathway ${pathway.id} must have at least 4 nodes`);

      const nodeIds = pathway.nodes.map((n) => n.id);
      assert.equal(new Set(nodeIds).size, nodeIds.length, `Node IDs in ${pathway.id} must be unique`);

      for (const node of pathway.nodes) {
        assert.ok(node.id.length > 0);
        assert.ok(node.name.length > 0);
        assert.ok(VALID_NODE_TYPES.has(node.type), `Invalid node type ${node.type} in ${node.id}`);
        assert.ok(node.description.length > 20, `Node description too short for ${node.id}`);

        for (const target of node.drugTargets) {
          assert.ok(target.drugId.length > 0, `drugId missing in node ${node.id}`);
          assert.ok(target.drugName.length > 0, `drugName missing in node ${node.id}`);
          assert.ok(target.action.length > 10, `Drug action description too brief for ${target.drugName}`);
          assert.ok(target.effect.length > 10, `Drug effect description too brief for ${target.drugName}`);
        }
      }
    }
  });

  it("getPathwayById retrieves pathways correctly and handles casing & non-existent IDs", () => {
    for (const id of EXPECTED_IDS) {
      const pathway = getPathwayById(id);
      assert.ok(pathway, `Should find pathway for ${id}`);
      assert.equal(pathway?.id, id);

      // Case insensitivity
      const upper = getPathwayById(id.toUpperCase());
      assert.ok(upper, `Should find pathway for uppercase ${id}`);
      assert.equal(upper?.id, id);
    }

    assert.equal(getPathwayById("non-existent-system"), null);
    assert.equal(getPathwayById(""), null);
  });

  it("findPathwaysForDrug correctly associates canonical drugs across pathways", () => {
    // 1) Lisinopril -> raas-nephron
    const lisinoprilPathways = findPathwaysForDrug("lisinopril");
    assert.ok(lisinoprilPathways.some((p) => p.id === "raas-nephron"), "Lisinopril must map to raas-nephron");

    // 2) Apixaban -> coagulation-cascade
    const apixabanPathways = findPathwaysForDrug("apixaban");
    assert.ok(apixabanPathways.some((p) => p.id === "coagulation-cascade"), "Apixaban must map to coagulation-cascade");

    // 3) Amiodarone -> cardiac-action-potential
    const amiodaronePathways = findPathwaysForDrug("amiodarone");
    assert.ok(amiodaronePathways.some((p) => p.id === "cardiac-action-potential"), "Amiodarone must map to cardiac-action-potential");

    // 4) Sugammadex -> nmj-cholinergic
    const sugammadexPathways = findPathwaysForDrug("sugammadex");
    assert.ok(sugammadexPathways.some((p) => p.id === "nmj-cholinergic"), "Sugammadex must map to nmj-cholinergic");

    // Cross-pathway check: Ibuprofen is both in RAAS (renal hemodynamics) and Arachidonic cascade
    const ibuprofenPathways = findPathwaysForDrug("ibuprofen");
    const ibuprofenIds = ibuprofenPathways.map((p) => p.id);
    assert.ok(ibuprofenIds.includes("raas-nephron"), "Ibuprofen must map to raas-nephron");
    assert.ok(ibuprofenIds.includes("arachidonic-eicosanoid"), "Ibuprofen must map to arachidonic-eicosanoid");

    // Case insensitivity & empty queries
    assert.ok(findPathwaysForDrug("Lisinopril").length > 0);
    assert.equal(findPathwaysForDrug("unknown-compound-xyz").length, 0);
    assert.equal(findPathwaysForDrug("").length, 0);
  });

  it("maintains non-prescriptive regulatory posture under FD&C Act § 520(o)(1)(E)", () => {
    assert.match(
      REGULATORY_NOTICE,
      /FD&C Act § 520\(o\)\(1\)\(E\)/,
      "Regulatory notice must cite FD&C Act § 520(o)(1)(E)",
    );
    assert.match(
      REGULATORY_NOTICE,
      /Educational Decision Support/i,
      "Regulatory notice must declare educational decision support posture",
    );

    // Verify all pathways cite peer-reviewed academic textbooks/guidelines
    for (const pathway of MECHANISM_PATHWAYS) {
      const citedText = pathway.citations.join(" ");
      assert.match(
        citedText,
        /Goodman & Gilman|Guyton|Katzung|Miller|ACC\/AHA|CHEST|KDIGO|Stahl|ASA/i,
        `Pathway ${pathway.id} must cite canonical pharmacology/physiology literature`,
      );
    }

    // Verify absence of prescriptive dosing directives (e.g. "take X mg", "dosing protocol", "administer X mg/kg")
    const allText = JSON.stringify(MECHANISM_PATHWAYS);
    assert.doesNotMatch(allText, /\btake \d+ ?mg\b/i, "Must not contain patient dosing directives");
    assert.doesNotMatch(allText, /\bprescribe \d+/i, "Must not contain prescription orders");
    assert.doesNotMatch(allText, /\bmg\/kg\/day\b/i, "Must not contain dosing calculation directives");
  });
});
