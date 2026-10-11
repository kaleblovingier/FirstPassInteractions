/**
 * Thyroid teaching engine: drugs that move thyroid tests and thyroid hormone.
 *
 * The teaching point is the sort. The same TSH rise can start in the gut
 * (absorption), the liver (clearance), the blood (binding proteins), the gland,
 * the pituitary, or the lab tube (assay). Antithyroid drugs act on the gland on
 * purpose. Each tray drug is filed by where it acts, then read two ways:
 *   - "treated": a patient taking levothyroxine, who cannot compensate.
 *   - "untreated": an intact gland, which adjusts its own output.
 * Absorption, clearance and binding changes show up mostly in the treated view.
 *
 * Levothyroxine spacing is not restated here. The labeled wording comes from
 * ./separation (the Separate station) so the two desks never disagree.
 * Clearance reads inducer roles straight off the catalog Drug objects.
 *
 * Teaching map only. Not a dose, not a decision, not an order.
 *
 * Sources:
 *   Synthroid (levothyroxine) Prescribing Information, sections 7.1–7.10.
 *   Jonklaas J, et al. ATA hypothyroidism guideline. Thyroid 2014;24(12):1670–1751.
 *   Alexander EK, et al. 2017 ATA pregnancy guideline. Thyroid 2017;27(3):315–389.
 *   Ross DS, et al. 2016 ATA hyperthyroidism guideline. Thyroid 2016;26(10):1343–1421.
 *   Bartalena L, et al. 2018 ETA amiodarone guideline. Eur Thyroid J 2018;7(2):55–66.
 *   FDA biotin safety communication, November 2017; updated November 2019.
 *   Propylthiouracil Prescribing Information, boxed warning.
 */

import { DRUG_BY_ID } from "./catalog";
import type { Drug, Enzyme, HostContext } from "./types";
import { SEPARATION_RULES, separationHits } from "./separation";

export const THYROID_DISCLAIMER =
  "Teaching map, not a dose, a decision, or an order. A drug on this map can explain a thyroid test result; it does not prove it did. The Prescribing Information and the treating clinician govern.";

export const THYROID_CITATIONS: string[] = [
  "Synthroid (levothyroxine sodium) tablets. Prescribing Information. AbbVie; 2024. Section 7.1 tables (absorption, binding, hepatic metabolism, T4-to-T3 conversion), 7.3 oral anticoagulants, 7.4 digitalis, 7.5 sertraline, 7.8 tyrosine kinase inhibitors, 7.9 food, 7.10 laboratory tests and biotin.",
  "Levothyroxine sodium tablets (generic labels). Drug–thyroidal axis table: dopamine and dopamine agonists, glucocorticoids, and octreotide may briefly lower TSH; lithium, amiodarone, and iodide (including iodinated contrast) may change thyroid hormone secretion.",
  "Jonklaas J, Bianco AC, Bauer AJ, et al. Guidelines for the treatment of hypothyroidism: prepared by the American Thyroid Association Task Force on Thyroid Hormone Replacement. Thyroid 2014;24(12):1670–1751.",
  "Alexander EK, Pearce EN, Brent GA, et al. 2017 Guidelines of the American Thyroid Association for the Diagnosis and Management of Thyroid Disease During Pregnancy and the Postpartum. Thyroid 2017;27(3):315–389.",
  "Ross DS, Burch HB, Cooper DS, et al. 2016 American Thyroid Association Guidelines for Diagnosis and Management of Hyperthyroidism and Other Causes of Thyrotoxicosis. Thyroid 2016;26(10):1343–1421.",
  "Bartalena L, Bogazzi F, Chiovato L, Hubalewska-Dydejczyk A, Links TP, Vanderpump M. 2018 European Thyroid Association (ETA) Guidelines for the Management of Amiodarone-Associated Thyroid Dysfunction. Eur Thyroid J 2018;7(2):55–66.",
  "U.S. Food and Drug Administration. The FDA Warns that Biotin May Interfere with Lab Tests: FDA Safety Communication. November 2017; updated November 2019.",
  "Propylthiouracil tablets. Prescribing Information. Boxed warning: severe liver injury and acute liver failure.",
  "Arafah BM. Increased need for thyroxine in women with hypothyroidism during estrogen therapy. N Engl J Med 2001;344(23):1743–1749.",
  "Stevenson HP, Archbold GP, Johnston P, Young IS, Sheridan B. Misleading serum free thyroxine results during low molecular weight heparin treatment. Clin Chem 1998;44(5):1002–1007.",
  "Sherman SI, Gopal J, Haugen BR, et al. Central hypothyroidism associated with retinoid X receptor-selective ligands. N Engl J Med 1999;340(14):1075–1079.",
  "Lupoli R, Di Minno A, Tortora A, et al. Effects of treatment with metformin on TSH levels: a meta-analysis of literature studies. J Clin Endocrinol Metab 2014;99(1):E143–E148.",
  "Schneider BJ, Naidoo J, Santomasso BD, et al. Management of immune-related adverse events in patients treated with immune checkpoint inhibitor therapy: ASCO guideline update. J Clin Oncol 2021;39(36):4073–4126.",
];

/* ── Shapes ───────────────────────────────────────────────────────────── */

export type ThyroidMechanism = "absorption" | "clearance" | "binding" | "gland" | "pituitary" | "assay" | "antithyroid";

/** Who the tests belong to. Treated = taking levothyroxine. Untreated = an intact gland. */
export type ThyroidContext = "treated" | "untreated";

/** The lab change a learner is trying to explain. */
export type ThyroidPattern = "tsh-up" | "tsh-down" | "t4-odd";

export interface ThyroidMechanismInfo {
  key: ThyroidMechanism;
  label: string;
  /** Where in the body (or the lab) it acts. */
  where: string;
  summary: string;
  /** What it looks like in a patient taking levothyroxine. */
  treated: string;
  /** What it looks like with an intact, untreated gland. */
  untreated: string;
  /** Class members the catalog does not carry. Teaching only, never detected. */
  alsoInClass?: string;
}

export interface ThyroidGroup {
  key: string;
  mechanism: ThyroidMechanism;
  label: string;
  /** Catalog ids only (filtered). */
  ids: string[];
  what: string;
  /** Patterns it can produce on levothyroxine. Empty = no effect in that view. */
  treated: ThyroidPattern[];
  /** Patterns it can produce with an intact gland. */
  untreated: ThyroidPattern[];
  /** Lights the station on its own, without a thyroid hormone on the tray. */
  standalone: boolean;
  source: string;
}

/* ── Mechanisms ───────────────────────────────────────────────────────── */

export const THYROID_MECHANISMS: ThyroidMechanismInfo[] = [
  {
    key: "absorption",
    label: "Absorption",
    where: "Gut",
    summary:
      "Binders hold levothyroxine in the gut. Less stomach acid means less of the tablet dissolves. Either way, less hormone gets in.",
    treated: "Less of the dose arrives. TSH rises on a dose that used to work.",
    untreated: "No effect. These act on the tablet, and there is no tablet.",
    alsoInClass: "aluminum and magnesium hydroxide antacids, soybean flour, cottonseed meal, walnuts",
  },
  {
    key: "clearance",
    label: "Clearance",
    where: "Liver",
    summary:
      "Enzyme inducers speed the liver's breakdown of thyroid hormone, including glucuronidation. The same dose leaves the body faster.",
    treated: "The dose is cleared faster. TSH can rise weeks after the inducer starts.",
    untreated: "A healthy gland makes more. TSH usually stays normal.",
  },
  {
    key: "binding",
    label: "Binding proteins",
    where: "Blood (TBG)",
    summary:
      "Most T4 rides on thyroxine-binding globulin (TBG). Only free T4 acts. More TBG soaks up more T4; less TBG lets more go free.",
    treated:
      "A TBG rise binds more of a fixed dose, so free T4 falls and TSH rises. A TBG fall does the reverse.",
    untreated: "The gland adjusts. Total T4 moves, but free T4 and TSH stay normal. Read free T4, not total T4.",
    alsoInClass: "clofibrate; high-dose salicylates, fenamates, and large IV furosemide doses displace T4 from its proteins",
  },
  {
    key: "gland",
    label: "Gland",
    where: "Thyroid",
    summary: "The drug changes what the gland makes: an iodine load, direct injury, or an immune attack.",
    treated: "If some gland function remains, it can fall further and TSH rises. A few agents also raise needs after thyroidectomy.",
    untreated: "Hypothyroidism, or thyrotoxicosis from an overactive or inflamed gland. Some agents can go either way.",
    alsoInClass: "aminoglutethimide, perchlorate",
  },
  {
    key: "pituitary",
    label: "Pituitary",
    where: "Pituitary (TSH)",
    summary: "The drug lowers TSH release itself. TSH stops being a clean readout of thyroid hormone.",
    treated: "TSH can read low while free T4 is fine. A low TSH here is not proof of over-replacement.",
    untreated: "TSH reads low or low-normal, usually briefly and without true hypothyroidism. Bexarotene is the exception.",
  },
  {
    key: "assay",
    label: "Assay",
    where: "Lab tube",
    summary: "The thyroid is unchanged. The test result is wrong.",
    treated: "A result can look like over-replacement when it is not.",
    untreated: "A result can look like hyperthyroidism when it is not.",
  },
  {
    key: "antithyroid",
    label: "Antithyroid drugs",
    where: "Thyroid, on purpose",
    summary: "Thionamides block hormone synthesis in the gland. PTU also slows T4-to-T3 conversion.",
    treated: "Not usually paired with levothyroxine. Overtreatment shows up as a rising TSH.",
    untreated:
      "Free T4 and T3 fall first. TSH can stay low for months after free T4 normalizes, so early on free T4 and T3 track the response, not TSH.",
    alsoInClass: "carbimazole (outside the US)",
  },
];

export const THYROID_MECHANISM_BY_KEY = Object.fromEntries(THYROID_MECHANISMS.map((m) => [m.key, m])) as Record<
  ThyroidMechanism,
  ThyroidMechanismInfo
>;

/* ── Groups (static) ──────────────────────────────────────────────────── */

const known = (ids: string[]) => [...new Set(ids)].filter((id) => id in DRUG_BY_ID);

/** The Separate station's levothyroxine rule. Its binders seed the absorption groups below. */
const LEVO_SEPARATION = SEPARATION_RULES.find((r) => r.victimId === "levothyroxine") ?? null;
const SEP_BINDERS = LEVO_SEPARATION?.binderIds ?? [];
const sepBinders = (pred: (id: string) => boolean) => SEP_BINDERS.filter(pred);

export const THYROID_HORMONE_IDS = known(["levothyroxine", "liothyronine", "desiccated-thyroid", "thyroid-dessicated-np"]);
export const ANTITHYROID_IDS = known(["methimazole", "propylthiouracil"]);

const RAW_GROUPS: ThyroidGroup[] = [
  /* Absorption */
  {
    key: "cation",
    mechanism: "absorption",
    label: "Calcium and iron",
    ids: [
      ...sepBinders((id) => /calcium|iron|ferr/.test(id)),
      "calcium",
      "calcium-acetate",
      "ferrous-sulfate",
      "ferrous-fumarate",
      "ferrous-gluconate",
      "iron",
      "prenatal-vitamin",
      "multivitamin",
    ],
    what: "Calcium and iron bind levothyroxine in the gut into complexes that are not absorbed. Prenatal and multivitamins count when they carry calcium or iron. IV iron does not.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.1; ATA 2014",
  },
  {
    key: "phosphate-binder",
    mechanism: "absorption",
    label: "Phosphate and potassium binders",
    ids: ["sevelamer", "lanthanum", "ferric-citrate", "sodium-polystyrene-sulfonate", "patiromer"],
    what: "The levothyroxine label names sevelamer, lanthanum, and sodium polystyrene sulfonate. Ferric citrate carries iron. Patiromer binds many oral drugs, and its label asks for spacing from other oral medicines.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.1; patiromer PI",
  },
  {
    key: "sequestrant",
    mechanism: "absorption",
    label: "Bile acid sequestrants",
    ids: [...sepBinders((id) => /chol|coles/.test(id)), "cholestyramine", "colesevelam", "colestipol"],
    what: "Bile acid sequestrants bind levothyroxine in the gut. The label names all three.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.1",
  },
  {
    key: "acid",
    mechanism: "absorption",
    label: "Acid suppression and coating agents",
    ids: [
      ...sepBinders((id) => id === "sucralfate"),
      "omeprazole",
      "esomeprazole",
      "pantoprazole",
      "lansoprazole",
      "rabeprazole",
      "dexlansoprazole",
      "sucralfate",
      "simethicone",
    ],
    what: "Levothyroxine needs stomach acid to dissolve. The label lists PPIs, sucralfate, and antacids with simethicone. PPI study results are mixed (ATA 2014), so the TSH is the tiebreaker.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.1; ATA 2014",
  },
  {
    key: "orlistat",
    mechanism: "absorption",
    label: "Orlistat",
    ids: ["orlistat"],
    what: "The levothyroxine label asks for thyroid monitoring when orlistat is added.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.1",
  },
  {
    key: "food",
    mechanism: "absorption",
    label: "Food, coffee, and fiber",
    ids: ["coffee", "dairy", "soy", "psyllium", "enteral-feed", "grapefruit"],
    what: "Coffee, soy, dietary fiber, and calcium-rich milk lower absorption. Continuous tube feeds do too. Grapefruit juice can delay absorption and lower bioavailability (label 7.9).",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.9; ATA 2014",
  },

  /* Clearance */
  {
    key: "inducer-labeled",
    mechanism: "clearance",
    label: "Rifampin and phenobarbital",
    ids: ["rifampin", "phenobarbital", "primidone"],
    what: "Induce the liver enzymes, including UGT glucuronidation, that clear levothyroxine. The levothyroxine label names both. Primidone is converted to phenobarbital.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.1; ATA 2014",
  },
  {
    key: "inducer-aed",
    mechanism: "clearance",
    label: "Phenytoin and carbamazepine",
    ids: ["phenytoin", "fosphenytoin", "carbamazepine"],
    what: "Strong inducers. ATA 2014 lists them with drugs that raise levothyroxine needs and advises a TSH check when they start. They also push T4 off its binding proteins, so free and total T4 can read low while TSH stays normal (label). Fosphenytoin becomes phenytoin.",
    treated: ["tsh-up", "t4-odd"],
    untreated: ["t4-odd"],
    standalone: false,
    source: "ATA 2014; Synthroid PI 7.1",
  },
  {
    key: "sertraline",
    mechanism: "clearance",
    label: "Sertraline",
    ids: ["sertraline"],
    what: "The levothyroxine label and ATA 2014 note sertraline may raise levothyroxine needs. The mechanism is not settled.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.5; ATA 2014",
  },
  {
    key: "imatinib",
    mechanism: "clearance",
    label: "Imatinib",
    ids: ["imatinib"],
    what: "Raises levothyroxine needs after thyroidectomy (label 7.8; ATA 2014). With no gland left, the effect has to be on hormone handling, not the gland.",
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Synthroid PI 7.8; ATA 2014",
  },

  /* Binding */
  {
    key: "tbg-up",
    mechanism: "binding",
    label: "Raise TBG",
    ids: [
      "estradiol-oral",
      "conjugated-estrogens",
      "ethinyl-estradiol",
      "tamoxifen",
      "methadone",
      "methadone-soluble",
      "heroin",
      "mitotane",
      "fluorouracil",
    ],
    what: "Oral estrogen is the classic case. In women on levothyroxine, oral estrogen raised TBG, free T4 fell, and TSH rose; in women with normal glands only total T4 rose (Arafah 2001). Transdermal estradiol skips the first pass through the liver and moves TBG much less.",
    treated: ["tsh-up", "t4-odd"],
    untreated: ["t4-odd"],
    standalone: false,
    source: "Synthroid PI 7.1; Arafah 2001",
  },
  {
    key: "tbg-down",
    mechanism: "binding",
    label: "Lower TBG",
    ids: ["testosterone-cypionate", "testosterone-gel", "testosterone-patch", "danazol", "niacin", "asparaginase"],
    what: "Androgens, asparaginase, and slow-release nicotinic acid lower TBG (label). On levothyroxine, more of the dose is free and needs can fall (ATA 2014).",
    treated: ["tsh-down", "t4-odd"],
    untreated: ["t4-odd"],
    standalone: false,
    source: "Synthroid PI 7.1; ATA 2014",
  },

  /* Gland */
  {
    key: "amiodarone",
    mechanism: "gland",
    label: "Amiodarone",
    ids: ["amiodarone"],
    what: "About 37% iodine by weight. The iodine load can shut synthesis down (Wolff–Chaikoff) and cause hypothyroidism. In a nodular gland or latent Graves disease it can fuel synthesis instead (Jod–Basedow): type 1 thyrotoxicosis. Type 2 is a destructive thyroiditis in a normal gland, treated with glucocorticoids. Amiodarone also blocks T4-to-T3 conversion, so free T4 can read high with a normal TSH (ETA 2018).",
    treated: ["tsh-up", "t4-odd"],
    untreated: ["tsh-up", "tsh-down", "t4-odd"],
    standalone: true,
    source: "ETA 2018; Synthroid PI 7.1",
  },
  {
    key: "lithium",
    mechanism: "gland",
    label: "Lithium",
    ids: ["lithium"],
    what: "Lithium slows thyroid hormone release from the gland. Goiter and hypothyroidism are common with long-term use, so TSH is checked before and during therapy.",
    treated: ["tsh-up"],
    untreated: ["tsh-up"],
    standalone: true,
    source: "Levothyroxine and lithium labels",
  },
  {
    key: "iodine",
    mechanism: "gland",
    label: "Iodine and iodinated contrast",
    ids: [
      "iodine",
      "potassium-iodide",
      "potassium-iodide-thyroid-block",
      "iohexol",
      "iodixanol",
      "iopamidol",
      "ioversol",
      "iopromide",
      "diatrizoate",
    ],
    what: "A large iodine load briefly shuts synthesis down (Wolff–Chaikoff). Most glands escape; one that cannot turns hypothyroid. A nodular gland or latent Graves disease can turn hyperthyroid (Jod–Basedow). Potassium iodide uses the shutdown on purpose, for example before Graves surgery (ATA 2016). A recent iodine load also lowers radioiodine uptake.",
    treated: ["tsh-up"],
    untreated: ["tsh-up", "tsh-down"],
    standalone: true,
    source: "Levothyroxine labels; ATA 2016",
  },
  {
    key: "checkpoint",
    mechanism: "gland",
    label: "Immune checkpoint inhibitors",
    ids: [
      "pembrolizumab",
      "nivolumab",
      "cemiplimab",
      "atezolizumab",
      "durvalumab",
      "avelumab",
      "ipilimumab",
      "relatlimab-nivolumab",
      "dostarlimab",
      "tremelimumab",
      "retifanlimab",
      "toripalimab",
    ],
    what: "Immune thyroiditis. A short thyrotoxic phase often comes first, then hypothyroidism. Risk is higher with PD-1 plus CTLA-4 combinations. Ipilimumab can also inflame the pituitary (hypophysitis): then TSH is low or normal while free T4 is low (ASCO 2021).",
    treated: ["tsh-up", "tsh-down"],
    untreated: ["tsh-down", "tsh-up", "t4-odd"],
    standalone: true,
    source: "ASCO 2021",
  },
  {
    key: "tki",
    mechanism: "gland",
    label: "VEGF-pathway kinase inhibitors",
    ids: ["sunitinib", "sorafenib", "pazopanib", "axitinib", "lenvatinib", "cabozantinib", "vandetanib"],
    what: "Hypothyroidism is a known effect of this class; sunitinib is the classic case. Sunitinib and vandetanib also raise levothyroxine needs after thyroidectomy (ATA 2014).",
    treated: ["tsh-up"],
    untreated: ["tsh-up"],
    standalone: true,
    source: "Synthroid PI 7.8; ATA 2014",
  },
  {
    key: "interferon",
    mechanism: "gland",
    label: "Interferon alfa",
    ids: ["peginterferon-alfa-2a"],
    what: "Interferon alfa can trigger autoimmune thyroiditis, Graves disease, or a destructive thyroiditis. Either direction is possible.",
    treated: ["tsh-up"],
    untreated: ["tsh-up", "tsh-down"],
    standalone: true,
    source: "Interferon alfa labeling",
  },
  {
    key: "alemtuzumab",
    mechanism: "gland",
    label: "Alemtuzumab",
    ids: ["alemtuzumab"],
    what: "Alemtuzumab can trigger autoimmune thyroid disease, including Graves disease, months to years after a course.",
    treated: ["tsh-up"],
    untreated: ["tsh-down", "tsh-up"],
    standalone: true,
    source: "Alemtuzumab labeling",
  },
  {
    key: "radioiodine",
    mechanism: "gland",
    label: "Radioiodine",
    ids: ["iodine-131"],
    what: "Radioiodine is meant to destroy thyroid tissue. Hypothyroidism afterward is the expected result, not an interaction.",
    treated: [],
    untreated: ["tsh-up"],
    standalone: true,
    source: "ATA 2016",
  },

  /* Pituitary */
  {
    key: "glucocorticoid",
    mechanism: "pituitary",
    label: "Systemic glucocorticoids",
    ids: [
      "prednisone",
      "prednisolone",
      "methylprednisolone",
      "dexamethasone",
      "dexamethasone-intensol",
      "hydrocortisone",
      "cortisone",
      "betamethasone",
      "triamcinolone-im",
    ],
    what: "High doses briefly lower TSH release. They also lower TBG and slow T4-to-T3 conversion, so T3 can fall (label). The effect on TSH is not sustained and does not cause hypothyroidism.",
    treated: ["tsh-down", "t4-odd"],
    untreated: ["tsh-down", "t4-odd"],
    standalone: false,
    source: "Levothyroxine labels",
  },
  {
    key: "dopamine",
    mechanism: "pituitary",
    label: "Dopamine and dopamine agonists",
    ids: ["dopamine", "bromocriptine", "cabergoline"],
    what: "Dopamine is a natural brake on TSH. A dopamine infusion or a dopamine agonist can lower TSH. The effect is brief and does not cause hypothyroidism, but it can hide a TSH rise while it lasts.",
    treated: ["tsh-down"],
    untreated: ["tsh-down"],
    standalone: true,
    source: "Levothyroxine labels",
  },
  {
    key: "somatostatin",
    mechanism: "pituitary",
    label: "Somatostatin analogs",
    ids: ["octreotide", "lanreotide"],
    what: "Somatostatin inhibits TSH release. The levothyroxine labels list octreotide at higher doses as briefly lowering TSH.",
    treated: ["tsh-down"],
    untreated: ["tsh-down"],
    standalone: true,
    source: "Levothyroxine labels",
  },
  {
    key: "metformin",
    mechanism: "pituitary",
    label: "Metformin",
    ids: ["metformin"],
    what: "A 2014 meta-analysis found metformin lowered TSH modestly in hypothyroid patients, treated or not. Euthyroid patients showed no change. The mechanism is unclear.",
    treated: ["tsh-down"],
    untreated: ["tsh-down"],
    standalone: false,
    source: "Lupoli 2014",
  },
  {
    key: "bexarotene",
    mechanism: "pituitary",
    label: "Bexarotene",
    ids: ["bexarotene"],
    what: "Bexarotene suppresses TSH at the pituitary and causes central hypothyroidism: TSH and free T4 fall together (Sherman 1999). TSH cannot guide replacement here; free T4 does.",
    treated: ["tsh-down", "t4-odd"],
    untreated: ["tsh-down", "t4-odd"],
    standalone: true,
    source: "Sherman 1999",
  },

  /* Assay */
  {
    key: "biotin",
    mechanism: "assay",
    label: "High-dose biotin",
    ids: ["biotin"],
    what: "Biotin interferes with streptavidin–biotin immunoassays. Sandwich assays such as TSH read falsely low. Competitive assays such as free T4 and free T3 read falsely high. The pattern looks like Graves disease (FDA 2017, 2019). The Synthroid label says to stop biotin at least 2 days before thyroid testing.",
    treated: ["tsh-down", "t4-odd"],
    untreated: ["tsh-down", "t4-odd"],
    standalone: true,
    source: "FDA 2017/2019; Synthroid PI 7.10",
  },
  {
    key: "heparin",
    mechanism: "assay",
    label: "Heparin and LMWH",
    ids: ["heparin", "enoxaparin", "dalteparin", "tinzaparin"],
    what: "Heparin releases lipase into the blood. In the tube, lipase keeps making free fatty acids that push T4 off its proteins, so measured free T4 reads falsely high. Shown with LMWH as well as unfractionated heparin (Stevenson 1998). TSH is not affected.",
    treated: ["t4-odd"],
    untreated: ["t4-odd"],
    standalone: false,
    source: "Stevenson 1998; Synthroid PI 7.1",
  },

  /* Antithyroid */
  {
    key: "thionamide",
    mechanism: "antithyroid",
    label: "Thionamides",
    ids: ["methimazole", "propylthiouracil"],
    what: "Block thyroid peroxidase, so the gland makes less hormone. PTU also slows T4-to-T3 conversion. Both can cause agranulocytosis. PTU carries a boxed warning for severe liver injury.",
    treated: ["tsh-up"],
    untreated: ["tsh-up", "t4-odd"],
    standalone: true,
    source: "ATA 2016; PTU PI",
  },
];

/** Static groups with ids filtered to the catalog. Empty groups are dropped. */
export const THYROID_GROUPS: ThyroidGroup[] = RAW_GROUPS.map((g) => ({ ...g, ids: known(g.ids) })).filter(
  (g) => g.ids.length > 0,
);

/** Every static id in the map, for catalog checks. */
export const THYROID_MAPPED_IDS: string[] = [...new Set(THYROID_GROUPS.flatMap((g) => g.ids))];

/* ── Clearance from catalog roles ─────────────────────────────────────── */

const STATIC_CLEARANCE = new Set(THYROID_GROUPS.filter((g) => g.mechanism === "clearance").flatMap((g) => g.ids));

/** Enzymes on which the catalog marks this drug a strong inducer. */
export function strongInducerEnzymes(drug: Drug | undefined): Enzyme[] {
  if (!drug) return [];
  return drug.enzymes.flatMap((e) => (e.kind === "inducer" && e.strength === "strong" ? [e.enzyme] : []));
}

export const OTHER_INDUCER_GROUP_KEY = "inducer-other";

/** A tray drug that is a strong inducer in the catalog but not named for levothyroxine. */
function otherInducerGroup(id: string): ThyroidGroup | null {
  if (STATIC_CLEARANCE.has(id)) return null;
  const drug = DRUG_BY_ID[id];
  const enzymes = strongInducerEnzymes(drug);
  if (!drug || enzymes.length === 0) return null;
  return {
    key: OTHER_INDUCER_GROUP_KEY,
    mechanism: "clearance",
    label: "Other strong inducers",
    ids: [id],
    what: `${drug.name} is a strong inducer in the catalog (${enzymes.join(", ")}). The levothyroxine label does not name it. Broad induction may still speed thyroid hormone clearance, so read a TSH change after it starts with that in mind.`,
    treated: ["tsh-up"],
    untreated: [],
    standalone: false,
    source: "Catalog inducer roles; class reasoning",
  };
}

/* ── Tray reading ─────────────────────────────────────────────────────── */

export interface ThyroidHit {
  id: string;
  name: string;
  groupKey: string;
  groupLabel: string;
  mechanism: ThyroidMechanism;
  what: string;
  treated: ThyroidPattern[];
  untreated: ThyroidPattern[];
  standalone: boolean;
  source: string;
}

const nameOf = (id: string) => DRUG_BY_ID[id]?.name ?? id;
const names = (ids: string[]) => ids.map(nameOf).join(", ");

/** Every tray drug in the map, one row per drug per group. Order follows the mechanism order. */
export function thyroidHits(ids: string[]): ThyroidHit[] {
  const uniq = [...new Set(ids)].filter((id) => id in DRUG_BY_ID);
  const on = new Set(uniq);
  const rows: ThyroidHit[] = [];
  const toHit = (g: ThyroidGroup, id: string): ThyroidHit => ({
    id,
    name: nameOf(id),
    groupKey: g.key,
    groupLabel: g.label,
    mechanism: g.mechanism,
    what: g.what,
    treated: [...g.treated],
    untreated: [...g.untreated],
    standalone: g.standalone,
    source: g.source,
  });
  for (const g of THYROID_GROUPS) {
    for (const id of g.ids) if (on.has(id)) rows.push(toHit(g, id));
  }
  for (const id of uniq) {
    const g = otherInducerGroup(id);
    if (g) rows.push(toHit(g, id));
  }
  const order = THYROID_MECHANISMS.map((m) => m.key);
  return rows.sort((a, b) => order.indexOf(a.mechanism) - order.indexOf(b.mechanism));
}

export interface ThyroidDeskDetection {
  /** Thyroid hormone or antithyroid drug on the tray, or a mapped drug that can move a thyroid test on its own. */
  hasThyroidRelevant: boolean;
  /** Any tray drug anywhere in the map, even one that only matters alongside thyroid hormone. */
  hasAnyMapped: boolean;
  onThyroidHormone: boolean;
  onAntithyroid: boolean;
  hasAbsorption: boolean;
  hasClearance: boolean;
  hasBinding: boolean;
  hasGland: boolean;
  hasPituitary: boolean;
  hasAssay: boolean;
  hormoneIds: string[];
  antithyroidIds: string[];
  matchedIds: string[];
  byMechanism: Record<ThyroidMechanism, string[]>;
}

const emptyByMechanism = (): Record<ThyroidMechanism, string[]> => ({
  absorption: [],
  clearance: [],
  binding: [],
  gland: [],
  pituitary: [],
  assay: [],
  antithyroid: [],
});

export function thyroidOnDesk(ids: string[]): ThyroidDeskDetection {
  const uniq = [...new Set(ids)];
  const hormoneIds = THYROID_HORMONE_IDS.filter((id) => uniq.includes(id));
  const antithyroidIds = ANTITHYROID_IDS.filter((id) => uniq.includes(id));
  const hits = thyroidHits(uniq);
  const byMechanism = emptyByMechanism();
  for (const h of hits) if (!byMechanism[h.mechanism].includes(h.id)) byMechanism[h.mechanism].push(h.id);
  const matchedIds = [...new Set([...hormoneIds, ...hits.map((h) => h.id)])];
  const onThyroidHormone = hormoneIds.length > 0;
  const onAntithyroid = antithyroidIds.length > 0;
  const standalone = hits.some((h) => h.standalone);
  return {
    hasThyroidRelevant: onThyroidHormone || onAntithyroid || standalone,
    hasAnyMapped: matchedIds.length > 0,
    onThyroidHormone,
    onAntithyroid,
    hasAbsorption: byMechanism.absorption.length > 0,
    hasClearance: byMechanism.clearance.length > 0,
    hasBinding: byMechanism.binding.length > 0,
    hasGland: byMechanism.gland.length > 0,
    hasPituitary: byMechanism.pituitary.length > 0,
    hasAssay: byMechanism.assay.length > 0,
    hormoneIds,
    antithyroidIds,
    matchedIds,
    byMechanism,
  };
}

/** Treated when a thyroid hormone is on the tray, otherwise an intact gland. */
export function defaultThyroidContext(ids: string[]): ThyroidContext {
  return THYROID_HORMONE_IDS.some((id) => ids.includes(id)) ? "treated" : "untreated";
}

/* ── "Which tray drug could explain it?" ──────────────────────────────── */

export interface ThyroidPatternInfo {
  id: ThyroidPattern;
  /** Question as asked in a patient on levothyroxine. */
  treated: string;
  /** Question as asked with an intact gland. */
  untreated: string;
}

export const THYROID_PATTERNS: ThyroidPatternInfo[] = [
  { id: "tsh-up", treated: "TSH went up on a stable levothyroxine dose", untreated: "TSH went up (looks hypothyroid)" },
  { id: "tsh-down", treated: "TSH went low on a stable dose", untreated: "TSH went low (looks hyperthyroid)" },
  { id: "t4-odd", treated: "Free or total T4 does not fit the TSH", untreated: "Free or total T4 does not fit the TSH" },
];

export const THYROID_EMPTY_NOTE: Record<ThyroidContext, string> = {
  treated:
    "No tray drug explains this pattern in this map. That is not a green light. Check how and when the tablet is taken, missed doses, a product switch, weight change, pregnancy, other illness, and the thyroid disease itself.",
  untreated:
    "No tray drug explains this pattern in this map. That is not a green light. Thyroid disease, other illness and recovery from it, and pregnancy also move these tests.",
};

export interface ThyroidExplainGroup {
  mechanism: ThyroidMechanism;
  label: string;
  where: string;
  hits: ThyroidHit[];
}

export interface ThyroidExplainResult {
  context: ThyroidContext;
  pattern: ThyroidPattern | "all";
  question: string;
  groups: ThyroidExplainGroup[];
  matchedIds: string[];
  empty: boolean;
  emptyNote: string | null;
}

/** Tray drugs that can produce this lab pattern in this context, grouped by mechanism. */
export function thyroidExplain(ids: string[], context: ThyroidContext, pattern: ThyroidPattern | "all"): ThyroidExplainResult {
  const hits = thyroidHits(ids).filter((h) => {
    const patterns = context === "treated" ? h.treated : h.untreated;
    return pattern === "all" ? patterns.length > 0 : patterns.includes(pattern);
  });
  const groups: ThyroidExplainGroup[] = THYROID_MECHANISMS.map((m) => ({
    mechanism: m.key,
    label: m.label,
    where: m.where,
    hits: hits.filter((h) => h.mechanism === m.key),
  })).filter((g) => g.hits.length > 0);
  const info = THYROID_PATTERNS.find((p) => p.id === pattern);
  const question = info ? info[context] : "Every mechanism on the tray";
  const empty = hits.length === 0;
  return {
    context,
    pattern,
    question,
    groups,
    matchedIds: [...new Set(hits.map((h) => h.id))],
    empty,
    emptyNote: empty ? THYROID_EMPTY_NOTE[context] : null,
  };
}

/* ── Methimazole vs PTU ───────────────────────────────────────────────── */

export interface AntithyroidRow {
  topic: string;
  methimazole: string;
  ptu: string;
}

export const ANTITHYROID_COMPARE: AntithyroidRow[] = [
  {
    topic: "Action",
    methimazole: "Blocks hormone synthesis in the gland.",
    ptu: "Blocks synthesis and also slows T4-to-T3 conversion.",
  },
  {
    topic: "Role",
    methimazole: "ATA 2016 makes it the thionamide for most patients.",
    ptu: "Label reserves it for patients who cannot take methimazole when radioiodine or surgery is not suitable, and for early pregnancy.",
  },
  {
    topic: "Liver",
    methimazole: "Liver injury is reported, often cholestatic.",
    ptu: "Boxed warning: severe liver injury and acute liver failure, some fatal, some needing transplant.",
  },
  {
    topic: "Pregnancy",
    methimazole: "First-trimester exposure is linked to birth defects.",
    ptu: "ATA 2017 prefers PTU when an antithyroid drug is needed up to 16 weeks' gestation. After that, it makes no recommendation on switching to methimazole.",
  },
  {
    topic: "Blood",
    methimazole: "Agranulocytosis. Fever or sore throat calls for a white count with differential (ATA 2016).",
    ptu: "Same risk, same warning.",
  },
];

export const THYROID_WARFARIN_NOTE =
  "Thyroid state moves warfarin. More thyroid hormone speeds clotting-factor breakdown, so warfarin works harder; the levothyroxine label says raising thyroid hormone increases the warfarin response. As a hyperthyroid patient becomes euthyroid, the same dose can do less. The methimazole and PTU labels flag warfarin too. Check INR more often while thyroid status is changing.";

export const THYROID_DIGOXIN_NOTE =
  "Thyroid state moves digoxin. Levels fall as a hypothyroid patient becomes euthyroid (levothyroxine label) and rise as a hyperthyroid patient becomes euthyroid (methimazole label).";

export const THYROID_STOP_NOTE =
  "If one of these drugs stops, the effect reverses. A levothyroxine dose raised to cover it may then be too high.";

/* ── Report ───────────────────────────────────────────────────────────── */

export interface ThyroidMapRow {
  mechanism: ThyroidMechanism;
  label: string;
  where: string;
  summary: string;
  /** The line for the active context. */
  inContext: string;
  hits: ThyroidHit[];
  /** Group labels in this mechanism, for "also in this class" teaching. */
  groupLabels: string[];
  alsoInClass: string | null;
}

export interface ThyroidSeparation {
  victimName: string;
  apart: string;
  source: string;
  bindersOnTray: { id: string; name: string }[];
}

export interface ThyroidReport {
  detection: ThyroidDeskDetection;
  context: ThyroidContext;
  map: ThyroidMapRow[];
  /** Levothyroxine spacing, taken word for word from the Separate station. */
  separation: ThyroidSeparation | null;
  /** Methimazole vs PTU rows, when a thionamide is on the tray. */
  antithyroid: AntithyroidRow[] | null;
  notes: string[];
  citations: string[];
  disclaimer: string;
}

export function thyroidMap(ids: string[], context: ThyroidContext): ThyroidMapRow[] {
  const hits = thyroidHits(ids);
  return THYROID_MECHANISMS.map((m) => ({
    mechanism: m.key,
    label: m.label,
    where: m.where,
    summary: m.summary,
    inContext: context === "treated" ? m.treated : m.untreated,
    hits: hits.filter((h) => h.mechanism === m.key),
    groupLabels: THYROID_GROUPS.filter((g) => g.mechanism === m.key).map((g) => g.label),
    alsoInClass: m.alsoInClass ?? null,
  }));
}

export function thyroidSeparation(ids: string[]): ThyroidSeparation | null {
  const hit = separationHits(ids).find((h) => h.victimId === "levothyroxine");
  if (!hit) return null;
  return { victimName: hit.victimName, apart: hit.apart, source: hit.source, bindersOnTray: hit.bindersOnTray };
}

export function thyroidReportOnDesk(ids: string[], host?: HostContext, context?: ThyroidContext): ThyroidReport {
  const uniq = [...new Set(ids)];
  const detection = thyroidOnDesk(uniq);
  const ctx = context ?? defaultThyroidContext(uniq);
  const separation = thyroidSeparation(uniq);
  const by = detection.byMechanism;
  const has = (id: string) => uniq.includes(id);
  const hormone = detection.onThyroidHormone;
  const notes: string[] = [];

  // Absorption and most clearance effects only show in someone taking thyroid hormone.
  const hormoneOnly = [...new Set(thyroidHits(uniq).filter((h) => h.untreated.length === 0).map((h) => h.id))];
  if (!hormone && hormoneOnly.length > 0) {
    notes.push(
      `${names(hormoneOnly)}: these change how much thyroid hormone a treated patient absorbs or keeps. No thyroid hormone is on the tray, so they do not move thyroid tests here.`,
    );
  }
  if (hormone && by.absorption.length > 0) {
    const spacing = separation && separation.bindersOnTray.length > 0 ? ` Labeled spacing for ${names(separation.bindersOnTray.map((b) => b.id))} is on the Separate station.` : "";
    notes.push(`${names(by.absorption)} can lower thyroid hormone absorption.${spacing}`);
  }
  if (hormone && by.clearance.length > 0) {
    notes.push(
      `${names(by.clearance)} can speed thyroid hormone clearance. ATA 2014 advises a TSH check when phenobarbital, phenytoin, carbamazepine, rifampin, or sertraline starts.`,
    );
  }
  const tbgUp = THYROID_GROUPS.find((g) => g.key === "tbg-up")?.ids.filter(has) ?? [];
  if (hormone && tbgUp.length > 0) {
    notes.push(`${names(tbgUp)} raises TBG. On a fixed levothyroxine dose, free T4 can fall and TSH can rise (Arafah 2001).`);
  }
  if (hormone && (by.absorption.length > 0 || by.clearance.length > 0 || tbgUp.length > 0)) notes.push(THYROID_STOP_NOTE);
  if (has("liothyronine") || has("desiccated-thyroid") || has("thyroid-dessicated-np")) {
    notes.push("Liothyronine and desiccated thyroid supply T3. Free T4 can run low by design while the patient is replaced, so TSH follows the dose better than free T4.");
  }
  if (has("amiodarone") && hormone) {
    notes.push("Amiodarone with thyroid hormone: the iodine load can deepen hypothyroidism, and free T4 can read high while T3 reads low (ETA 2018). TSH is the steadier guide.");
  }
  if (has("biotin")) {
    notes.push("High-dose biotin on the tray. A low TSH with a high free T4 may be the assay, not the thyroid. Ask the lab whether its method is affected.");
  }
  if (by.assay.some((id) => id !== "biotin")) {
    notes.push(`${names(by.assay.filter((id) => id !== "biotin"))}: a high free T4 drawn during heparin or LMWH therapy may be an in-tube artifact. TSH is not affected.`);
  }
  if (detection.onAntithyroid && host?.preg === "pregnant") {
    notes.push("Pregnant, on a thionamide: ATA 2017 prefers PTU up to 16 weeks' gestation because of methimazole birth defects. After 16 weeks it makes no recommendation on switching.");
  }
  if (hormone && host?.preg === "pregnant") {
    notes.push("Pregnancy raises levothyroxine needs, starting early. ATA 2017 advises a dose increase once pregnancy is confirmed, then regular TSH checks.");
  }
  if (detection.hasThyroidRelevant && host?.preg === "pregnant") {
    notes.push("Pregnancy raises TBG, so total T4 rises. Read thyroid tests against pregnancy-specific ranges.");
  }
  if (detection.hasThyroidRelevant && host?.age === "geriatric") {
    notes.push("Older adult: TSH ranges run higher after about 65 (ATA 2014). Over-replacement adds atrial fibrillation and bone loss risk (levothyroxine label).");
  }
  if (hormone && host?.kidney === "ckd" && by.absorption.length > 0) {
    notes.push("Kidney flag set. CKD trays often carry phosphate binders, and they travel with levothyroxine.");
  }
  if ((hormone || detection.onAntithyroid) && has("warfarin")) notes.push(THYROID_WARFARIN_NOTE);
  if ((hormone || detection.onAntithyroid) && has("digoxin")) notes.push(THYROID_DIGOXIN_NOTE);

  return {
    detection,
    context: ctx,
    map: thyroidMap(uniq, ctx),
    separation,
    antithyroid: detection.onAntithyroid ? ANTITHYROID_COMPARE : null,
    notes,
    citations: THYROID_CITATIONS,
    disclaimer: THYROID_DISCLAIMER,
  };
}
