import assert from "node:assert/strict";
import test from "node:test";
import { DRUG_BY_ID } from "./catalog.ts";
import { CPIC_GENE_DRUG_LIST, PGX, cardLink, guidelineUrl } from "./pgx.ts";

/**
 * Each CPIC guideline page a card may link, the drugs it covers on this desk, and the genes
 * it covers. A card may link a guideline only when its drug is listed here for that page and
 * its gene is one of the page's genes. A drug that CPIC has no guideline for gets
 * `source.kind: "none"` instead, never a neighbouring class's guideline.
 */
const GUIDELINES: Record<string, { drugs: string[]; genes: string[] }> = {
  "cpic-guideline-for-ssri-and-snri-antidepressants/": {
    drugs: ["citalopram", "escitalopram", "sertraline", "paroxetine", "fluvoxamine", "fluoxetine", "venlafaxine", "vortioxetine"],
    genes: ["CYP2D6", "CYP2C19", "CYP2B6"],
  },
  "guideline-for-tricyclic-antidepressants-and-cyp2d6-and-cyp2c19/": {
    drugs: ["amitriptyline", "nortriptyline", "imipramine", "desipramine", "clomipramine"],
    genes: ["CYP2D6", "CYP2C19"],
  },
  "guideline-for-codeine-and-cyp2d6/": { drugs: ["codeine", "tramadol", "hydrocodone"], genes: ["CYP2D6"] },
  "cpic-guideline-for-proton-pump-inhibitors-and-cyp2c19/": {
    drugs: ["omeprazole", "esomeprazole", "lansoprazole", "pantoprazole"],
    genes: ["CYP2C19"],
  },
  "cpic-guideline-for-statins/": {
    drugs: ["simvastatin", "atorvastatin", "rosuvastatin", "fluvastatin"],
    genes: ["SLCO1B1", "ABCG2", "CYP2C9"],
  },
  "cpic-guideline-for-nsaids-and-cyp2c9/": { drugs: ["celecoxib", "ibuprofen", "meloxicam"], genes: ["CYP2C9"] },
  "guideline-for-thiopurines-and-tpmt-nudt15/": { drugs: ["azathioprine", "mercaptopurine"], genes: ["TPMT", "NUDT15"] },
  "cpic-guideline-for-tamoxifen-based-on-cyp2d6-genotype/": { drugs: ["tamoxifen"], genes: ["CYP2D6"] },
  "cpic-guideline-for-atomoxetine-based-on-cyp2d6-genotype/": { drugs: ["atomoxetine"], genes: ["CYP2D6"] },
  "guideline-for-ondansetron-and-tropisetron-and-cyp2d6-genotype/": { drugs: ["ondansetron"], genes: ["CYP2D6"] },
  "guideline-for-clopidogrel-and-cyp2c19/": { drugs: ["clopidogrel"], genes: ["CYP2C19"] },
  "guideline-for-voriconazole-and-cyp2c19/": { drugs: ["voriconazole"], genes: ["CYP2C19"] },
  "guideline-for-warfarin-and-cyp2c9-and-vkorc1/": { drugs: ["warfarin"], genes: ["CYP2C9", "VKORC1"] },
  "guideline-for-phenytoin-and-cyp2c9-and-hla-b/": { drugs: ["phenytoin"], genes: ["CYP2C9", "HLA-B*15:02"] },
  "guideline-for-allopurinol-and-hla-b/": { drugs: ["allopurinol"], genes: ["HLA-B*58:01"] },
  "guideline-for-carbamazepine-and-hla-b/": {
    drugs: ["carbamazepine", "oxcarbazepine"],
    genes: ["HLA-B*15:02", "HLA-A*31:01"],
  },
  "guideline-for-tacrolimus-and-cyp3a5/": { drugs: ["tacrolimus"], genes: ["CYP3A5"] },
  "cpic-guideline-for-efavirenz-based-on-cyp2b6-genotype/": { drugs: ["efavirenz"], genes: ["CYP2B6"] },
};

const PREFIX = "https://cpicpgx.org/guidelines/";
const genesOf = (gene: string) => gene.split("/").map((x) => x.trim());

test("every guideline a card links names that card's drug and gene", () => {
  for (const [id, cards] of Object.entries(PGX)) {
    for (const card of cards) {
      const url = guidelineUrl(card);
      if (!url) continue;
      assert.ok(url.startsWith(PREFIX), `${id}: ${url} is not a CPIC guideline page`);
      const slug = url.slice(PREFIX.length);
      const entry = GUIDELINES[slug];
      assert.ok(entry, `${id}: ${slug} is not in the reviewed guideline map`);
      assert.ok(entry.drugs.includes(id), `${id} links ${slug}, which does not cover ${id}`);
      for (const gene of genesOf(card.gene)) {
        assert.ok(entry.genes.includes(gene), `${id}: ${slug} does not cover gene ${gene}`);
      }
    }
  }
});

test("cards for drugs CPIC has no guideline for say so instead of linking another drug's", () => {
  for (const id of ["aripiprazole", "risperidone", "diazepam", "clobazam", "methadone"]) {
    const card = PGX[id]?.[0];
    assert.ok(card, id);
    assert.equal(card.source.kind, "none", `${id} should carry no CPIC guideline`);
    assert.equal(guidelineUrl(card), null);
    assert.ok(card.source.kind === "none" && /CPIC has no/.test(card.source.note), id);
    assert.equal(cardLink(card), card.clinpgx);
  }
  const methadone = PGX.methadone[0]!;
  assert.ok(methadone.source.kind === "none" && /no recommendation/.test(methadone.source.note));
});

test("a card without a guideline never points at a guideline page, and the list link is CPIC's", () => {
  assert.equal(CPIC_GENE_DRUG_LIST, "https://cpicpgx.org/genes-drugs/");
  for (const [id, cards] of Object.entries(PGX)) {
    for (const card of cards) {
      if (card.source.kind === "guideline") continue;
      assert.ok(card.source.note.length > 0, `${id} has no note`);
      assert.ok(!card.clinpgx.includes("cpicpgx.org/guidelines"), id);
      assert.match(card.clinpgx, /^https:\/\/www\.clinpgx\.org\/search\?query=/, id);
    }
  }
});

test("ancestry copy describes allele frequency, not ancestry-based dosing", () => {
  const text = Object.values(PGX)
    .flat()
    .flatMap((card) => [card.pearl, ...card.rows.map((r) => r.action)])
    .join("\n");
  assert.doesNotMatch(text, /especially in [A-Z][a-z]+ [A-Z][a-z]+ ancestry/);
  assert.doesNotMatch(text, /Ancestry with higher/);
  for (const id of ["rosuvastatin", "allopurinol"]) {
    const card = PGX[id]![0]!;
    const copy = [card.pearl, ...card.rows.map((r) => r.action)].join(" ");
    assert.match(copy, /the genotype, not ancestry, decides the row/i, id);
  }
});

const REGULATORY_CLAIM_PATTERNS = [
  /\bFDA[- ]cleared\b/i,
  /\bFDA[- ]registered\b/i,
  /\b510\(k\)[- ]cleared\b/i,
  /\bFDA[- ]approved (?:software|app|device|tool|desk|checker|card)\b/i,
  /\bclinically (?:validated|proven|tested|verified)\b/i,
  /\bmedically reviewed\b/i,
  /\b(?:reviewed|vetted|validated|approved|checked|built) by (?:a |an |our |licensed )?(?:pharmacists?|clinicians?|physicians?|doctors?|PharmDs?|nurses?)\b/i,
  /\b(?:pharmacist|clinician|physician|doctor|PharmD)[- ](?:reviewed|built|vetted|approved|validated|verified)\b/i,
  /\bHIPAA[- ]compliant\b/i,
];
const NEGATED_CLAIM_RE =
  /\b(?:not|no|never|nor|without|isn['’]t|aren['’]t|hasn['’]t|doesn['’]t|cannot|can['’]t|neither|none)\b/i;

test("every PGX key exists in DRUG_BY_ID and cards carry non-empty rows/pearls without affirmative regulatory claims", () => {
  for (const [id, cards] of Object.entries(PGX)) {
    assert.ok(DRUG_BY_ID[id], `PGX key "${id}" is missing from DRUG_BY_ID`);
    assert.ok(cards.length > 0, `${id} has no PGX cards`);
    for (const card of cards) {
      assert.ok(card.gene.trim().length > 0, `${id} has a card with an empty gene`);
      assert.ok(card.pearl.trim().length > 0, `${id} (${card.gene}) has an empty pearl`);
      assert.ok(card.rows.length > 0, `${id} (${card.gene}) has no action rows`);
      for (const row of card.rows) {
        assert.ok(row.pheno.trim().length > 0, `${id} (${card.gene}) has a row with empty pheno`);
        assert.ok(row.action.trim().length > 0, `${id} (${card.gene}, ${row.pheno}) has an empty action`);
      }

      const texts = [
        card.pearl,
        ...card.rows.map((r) => `${r.pheno}: ${r.action}`),
        ...(card.source.kind === "guideline" ? [] : [card.source.note]),
      ];
      for (const text of texts) {
        for (const sentence of text.split(/(?<=[.!?])\s+/)) {
          for (const re of REGULATORY_CLAIM_PATTERNS) {
            if (re.test(sentence)) {
              assert.ok(
                NEGATED_CLAIM_RE.test(sentence),
                `${id} (${card.gene}) contains affirmative regulatory claim: ${sentence}`,
              );
            }
          }
        }
      }
    }
  }
});
