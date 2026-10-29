/**
 * Study cards for the five label-named supplements (cited only, no grade).
 * Each answer restates the catalog note, which names the FDA label section.
 * These cards do not add a pair, a severity, an enzyme role, or a strength.
 * Educational recall of the citation. Not a milligram. Not a clearance.
 */
import { DRUG_BY_ID } from "../catalog";
import type { ClinicalTopic, StudyCard } from "../study";

/** Same five ids as the cited-only supplement hubs. Order is the card order. */
export const SUPPLEMENT_LABEL_IDS = [
  "danshen",
  "siberian-ginseng",
  "glucomannan",
  "kelp",
  "beta-carotene",
] as const;

export type SupplementLabelId = (typeof SUPPLEMENT_LABEL_IDS)[number];

interface SupplementLabelSpec {
  id: SupplementLabelId;
  cardId: string;
  topic: ClinicalTopic;
  title: string;
  prompt: string;
  correct: string;
  correctLabel: string;
  distractors: { id: string; label: string }[];
}

const SPECS: SupplementLabelSpec[] = [
  {
    id: "danshen",
    cardId: "clin-label-danshen-assay",
    topic: "cardio",
    title: "Danshen and the digoxin assay",
    prompt: "Danshen is on a medication list. The Lanoxin label, section 7.4, is the line this desk cites.",
    correct: "assay",
    correctLabel: "A lab-test effect on digoxin assays. Not a graded interaction.",
    distractors: [
      { id: "cyp-role", label: "A stored CYP perpetrator role for Danshen" },
      { id: "pgp-role", label: "A stored P-gp perpetrator role for Danshen" },
      { id: "clearance", label: "A clearance this desk computed for the pair" },
    ],
  },
  {
    id: "siberian-ginseng",
    cardId: "clin-label-siberian-ginseng-assay",
    topic: "cardio",
    title: "Siberian ginseng and the digoxin assay",
    prompt: "Siberian ginseng (eleuthero) is on a medication list. The Lanoxin label, section 7.4, is the line this desk cites.",
    correct: "assay",
    correctLabel: "Eleuthero, not Panax. A lab-test effect on digoxin assays. Not a graded interaction.",
    distractors: [
      { id: "panax", label: "The same shelf row as Panax ginseng" },
      { id: "cyp-role", label: "A stored CYP perpetrator role for eleuthero" },
      { id: "clearance", label: "A clearance this desk computed for the pair" },
    ],
  },
  {
    id: "glucomannan",
    cardId: "clin-label-glucomannan-nateglinide",
    topic: "endocrine",
    title: "Glucomannan on the nateglinide label",
    prompt: "Glucomannan is on a medication list. The nateglinide label, section 7 (Table 2), is the line this desk cites.",
    correct: "listed",
    correctLabel: "The label lists glucomannan among agents that may add to nateglinide's glucose-lowering effect. No CYP grade is stored.",
    distractors: [
      { id: "cyp-role", label: "A stored CYP perpetrator role for glucomannan" },
      { id: "absent", label: "The nateglinide label does not name glucomannan" },
      { id: "flag", label: "A stored hypoglycemic flag on glucomannan" },
    ],
  },
  {
    id: "kelp",
    cardId: "clin-label-kelp-radioiodine",
    topic: "endocrine",
    title: "Kelp on the radioiodine label",
    prompt: "Kelp is on a medication list. The HICON (sodium iodide I-131) label, section 7 Table 4, is the line this desk cites.",
    correct: "uptake",
    correctLabel: "Listed among agents that can block radioiodine uptake. Timing is not shown here. No CYP grade is stored.",
    distractors: [
      { id: "cyp-role", label: "A stored CYP perpetrator role for kelp" },
      { id: "clock", label: "A stored hold interval this desk can apply" },
      { id: "clearance", label: "A clearance this desk computed for the pair" },
    ],
  },
  {
    id: "beta-carotene",
    cardId: "clin-label-beta-carotene-orlistat",
    topic: "bedside",
    title: "Beta-carotene on the orlistat label",
    prompt: "Beta-carotene supplement is on a medication list. The Xenical (orlistat) label, section 7.2, is the line this desk cites.",
    correct: "absorption",
    correctLabel: "Reduced absorption of beta-carotene supplement when given with orlistat. An absorption effect, not a graded interaction.",
    distractors: [
      { id: "cyp-role", label: "A stored CYP perpetrator role for beta-carotene" },
      { id: "unchanged", label: "The label reports no change in beta-carotene absorption" },
      { id: "clearance", label: "A clearance this desk computed for the pair" },
    ],
  },
];

/** Label-named partner cited by each supplement note. Not a graded pair. */
export const SUPPLEMENT_LABEL_PARTNERS: Record<SupplementLabelId, string> = {
  danshen: "digoxin",
  "siberian-ginseng": "digoxin",
  glucomannan: "nateglinide",
  kelp: "iodine-131",
  "beta-carotene": "orlistat",
};

export const SUPPLEMENT_LABEL_TOPICS: Record<string, ClinicalTopic> = Object.fromEntries(
  SPECS.map((spec) => [spec.cardId, spec.topic]),
);

function storedNote(id: SupplementLabelId): string {
  const note = DRUG_BY_ID[id]?.note;
  if (!note) throw new Error(`supplement label card missing catalog note for ${id}`);
  return note;
}

/** Clinical-lane cards. One per cited-only supplement. Answers are the stored notes. */
export function supplementLabelCards(): StudyCard[] {
  return SPECS.map((spec) => {
    const note = storedNote(spec.id);
    const partner = SUPPLEMENT_LABEL_PARTNERS[spec.id];
    return {
      id: spec.cardId,
      lane: "clinical" as const,
      kicker: "Label citation",
      title: spec.title,
      prompt: spec.prompt,
      ask: "What does the stored citation say?",
      choices: [
        { id: spec.correct, label: spec.correctLabel },
        ...spec.distractors,
      ],
      correct: spec.correct,
      answer: `${note} This card cites that label line. It does not assign a severity, a CYP strength, or a milligram.`,
      drugIds: [spec.id, partner],
      topic: spec.topic,
    };
  });
}
