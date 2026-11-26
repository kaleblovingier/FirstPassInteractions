/**
 * Zod validation schemas for FirstPass Clinical Decision Support (CDS) API.
 *
 * Implements strict runtime schema validation, sanitization, and typing
 * conforming to modern Pydantic v2 / Zod architectural principles.
 * Request objects are strict: an unknown key (a typo such as `pregant`) is a 422,
 * never silently dropped context.
 */

import { z } from "zod";
import { PHARMACOGENES } from "../../drugs/pharmacogenomics";
import { TRANSPORTERS, type TransporterInfo } from "../../drugs/transporter-network";
import { ENZYMES } from "../../drugs/types";
import { MED_LIST_MAX_CHARS } from "../../drugs/med-list";
import { type InvalidParamError } from "./problem";

export const KidneyCategorySchema = z.enum(["normal", "mild", "moderate", "severe", "esrd"]);

export type KidneyCategory = z.infer<typeof KidneyCategorySchema>;

/**
 * eGFR (mL/min/1.73 m²) range each kidney category implies, as [min, max).
 * Normal and mild share the usual-GFR band; the engine treats them the same.
 */
export const KIDNEY_EGFR_RANGE: Record<KidneyCategory, readonly [number, number]> = {
  normal: [60, Infinity],
  mild: [60, Infinity],
  moderate: [30, 60],
  severe: [15, 30],
  esrd: [0, 15],
};

const USUAL_GFR_CONFLICT =
  "eGFR disagrees with the kidney category: normal or mild impairment implies an eGFR of 60 mL/min/1.73 m² or more, and the eGFR sent is below 60. Send matching values, or send only one of them.";

const KIDNEY_EGFR_CONFLICT: Record<KidneyCategory, string> = {
  normal: USUAL_GFR_CONFLICT,
  mild: USUAL_GFR_CONFLICT,
  moderate:
    "eGFR disagrees with the kidney category: moderate impairment (KDIGO G3) implies an eGFR of 30–59 mL/min/1.73 m², and the eGFR sent is outside that range. Send matching values, or send only one of them.",
  severe:
    "eGFR disagrees with the kidney category: severe impairment (KDIGO G4) implies an eGFR of 15–29 mL/min/1.73 m², and the eGFR sent is outside that range. Send matching values, or send only one of them.",
  esrd: "eGFR disagrees with the kidney category: kidney failure (KDIGO G5) implies an eGFR below 15 mL/min/1.73 m², and the eGFR sent is 15 or higher. eGFR is not interpretable on dialysis; for a patient on dialysis send the kidney category alone.",
};

/** Clinically worded message when `kidney` and `egfr` describe different renal function. */
export function kidneyEgfrConflict(kidney?: KidneyCategory, egfr?: number): string | undefined {
  if (kidney === undefined || egfr === undefined) return undefined;
  const [min, max] = KIDNEY_EGFR_RANGE[kidney];
  return egfr >= min && egfr < max ? undefined : KIDNEY_EGFR_CONFLICT[kidney];
}

export const HostContextSchema = z
  .strictObject({
    age: z
      .number()
      .min(0, "Age cannot be negative")
      .max(
        89,
        "Under HIPAA Safe Harbor de-identification (45 CFR § 164.514(b)(2)), discrete age must not exceed 89 years (aggregate patients 90 or older into the 89-year geriatric cohort)",
      )
      .optional(),
    sex: z.enum(["male", "female"]).optional(),
    weightKg: z
      .number()
      .min(1, "Weight must be at least 1 kg")
      .max(350, "Weight exceeds supported limit")
      .optional(),
    scr: z
      .number()
      .min(0.1, "Serum creatinine must be > 0.1 mg/dL")
      .max(30.0, "Serum creatinine exceeds limit")
      .optional(),
    egfr: z
      .number()
      .min(0, "eGFR cannot be negative")
      .max(200, "eGFR exceeds physiologic limit")
      .optional(),
    kidney: KidneyCategorySchema.optional(),
    pregnant: z.boolean().optional(),
    lactating: z.boolean().optional(),
    smoker: z.boolean().optional(),
    ph: z
      .number()
      .min(6.5, "pH below survivable limit")
      .max(7.8, "pH above survivable limit")
      .optional(),
    serumAlbumin: z
      .number()
      .min(0.5, "Albumin must be at least 0.5 g/dL")
      .max(7.0, "Albumin exceeds limit")
      .optional(),
    urinePh: z.number().min(4.5).max(9.0).optional(),
  })
  .superRefine((host, ctx) => {
    const conflict = kidneyEgfrConflict(host.kidney, host.egfr);
    if (conflict) ctx.addIssue({ code: "custom", path: ["egfr"], message: conflict });
  });

export type HostContextInput = z.infer<typeof HostContextSchema>;

const PHI_PATIENT_ID_REGEX = /\b(?:\d{3}-\d{2}-\d{4}|\d{9,})\b/;

export const DrugIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Drug identifier cannot be empty")
  .max(100)
  .refine(
    (val) => !PHI_PATIENT_ID_REGEX.test(val),
    "Drug identifiers must be pharmacological names, not patient identifiers",
  );

export const SearchQueryTextSchema = z
  .string()
  .trim()
  .min(1, "Search query cannot be empty")
  .max(100, "Query exceeds max length 100")
  .refine(
    (val) => !PHI_PATIENT_ID_REGEX.test(val),
    "Search queries must be generic or brand drug names; patient health identifiers are prohibited",
  );

export const SearchEnzymeSchema = z.enum(ENZYMES);
export const SearchRoleSchema = z.enum(["substrate", "inhibitor", "inducer"]);

function normToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Resolves a transporter query string (id, gene symbol, or alias such as "P-gp", "OATP1B1", "BCRP", "OAT3", "OCT2") to its TransporterInfo entry. */
export function resolveTransporterFilter(raw: string): TransporterInfo | undefined {
  const token = normToken(raw);
  if (!token) return undefined;
  return TRANSPORTERS.find((tx) => {
    const candidates = [tx.id, tx.gene, ...tx.gene.split(/[&/]/), ...tx.aliases];
    return candidates.some((c) => normToken(c) === token);
  });
}

/** Resolves a CPIC pharmacogene query string (e.g. "SLCO1B1", "CYP2D6", "HLA-B*58:01", "HLA-B5801") to its canonical geneId. */
export function resolvePgxGeneFilter(raw: string): string | undefined {
  const token = normToken(raw);
  if (!token) return undefined;
  const hit = PHARMACOGENES.find(
    (g) => normToken(g.id) === token || normToken(g.symbol) === token,
  );
  return hit?.id;
}

export const SearchTransporterSchema = z
  .string()
  .trim()
  .min(1, "Transporter filter cannot be empty")
  .max(60, "Transporter filter exceeds max length 60")
  .refine(
    (val) => !PHI_PATIENT_ID_REGEX.test(val),
    "Transporter filters must name a membrane transporter; patient identifiers are prohibited",
  )
  .refine(
    (val) => resolveTransporterFilter(val) !== undefined,
    "Unrecognized transporter filter. Supported transporters include P-gp (ABCB1), BCRP (ABCG2), OATP1B1/OATP1B3 (SLCO1B1), OAT1/OAT3, and OCT2/MATE1.",
  );

export const SearchPgxSchema = z
  .string()
  .trim()
  .min(1, "Pharmacogene filter cannot be empty")
  .max(40, "Pharmacogene filter exceeds max length 40")
  .refine(
    (val) => !PHI_PATIENT_ID_REGEX.test(val),
    "Pharmacogene filters must name a CPIC gene symbol; patient identifiers are prohibited",
  )
  .refine(
    (val) => resolvePgxGeneFilter(val) !== undefined,
    "Unrecognized pharmacogene filter. Supported CPIC genes include CYP2D6, CYP2C19, CYP2C9, CYP3A5, SLCO1B1, VKORC1, UGT1A1, TPMT, NUDT15, DPYD, G6PD, HLA-B*57:01, HLA-B*58:01, HLA-B*15:02, and HLA-A*31:01.",
  );

export const SearchTdmSchema = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const norm = val.trim().toLowerCase();
    if (norm === "true" || norm === "1") return true;
    if (norm === "false" || norm === "0") return false;
  }
  return val;
}, z.boolean().optional());

export const DrugLookupRequestSchema = z
  .strictObject({
    q: SearchQueryTextSchema.optional(),
    enzyme: SearchEnzymeSchema.optional(),
    role: SearchRoleSchema.optional(),
    transporter: SearchTransporterSchema.optional(),
    pgx: SearchPgxSchema.optional(),
    tdm: SearchTdmSchema,
    cls: z
      .string()
      .trim()
      .min(1, "Class filter cannot be empty")
      .max(100, "Class filter exceeds max length 100")
      .refine(
        (val) => !PHI_PATIENT_ID_REGEX.test(val),
        "Class filters must be pharmacological classes; patient health identifiers are prohibited",
      )
      .optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((data, ctx) => {
    if (!data.q && !data.enzyme && !data.cls && !data.transporter && !data.pgx && data.tdm === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["q"],
        message: "Search query (q) or a catalog filter (enzyme, transporter, pgx, tdm, or cls) is required",
      });
    }
  });

export const SearchQuerySchema = DrugLookupRequestSchema;

export type DrugLookupRequest = z.infer<typeof DrugLookupRequestSchema>;

export const ExportRequestSchema = z.strictObject({
  drugs: z
    .array(DrugIdentifierSchema)
    .min(1, "At least 1 drug must be provided")
    .max(30, "Maximum 30 drugs can be exported simultaneously"),
  format: z.enum(["json", "markdown"]).default("json"),
  host: HostContextSchema.optional(),
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

export const InteractionCheckRequestSchema = z.strictObject({
  drugs: z
    .array(DrugIdentifierSchema)
    .min(1, "At least 1 drug must be provided")
    .max(20, "Maximum 20 drugs can be checked simultaneously"),
  host: HostContextSchema.optional(),
});

export const AutocompleteRequestSchema = z.strictObject({
  q: SearchQueryTextSchema,
  limit: z.coerce.number().int().min(1).max(24).default(8),
});

/** A substance as a bare name, or a name with the hours since its last dose. */
export const AnalyzeSubstanceSchema = z.union([
  DrugIdentifierSchema,
  z.strictObject({
    name: DrugIdentifierSchema,
    ingestionTimeHoursAgo: z.number().finite().min(0).max(720).optional(),
  }),
]);

export const AnalyzeRequestSchema = z
  .strictObject({
    substances: z
      .array(AnalyzeSubstanceSchema)
      .min(1, "At least 1 substance must be provided")
      .max(20, "Maximum 20 substances can be analyzed simultaneously")
      .optional(),
    /** A pasted medication list, read like the desk's "Paste a medication list". Send it instead of substances. */
    text: z
      .string()
      .trim()
      .min(1, "text is empty")
      .max(MED_LIST_MAX_CHARS, `text is longer than ${MED_LIST_MAX_CHARS} characters`)
      .optional(),
    host: HostContextSchema.optional(),
    live: z.boolean().default(false),
  })
  .refine((body) => (body.substances === undefined) !== (body.text === undefined), {
    message: "Send substances or text: one of them, not both.",
    path: ["substances"],
  });

export type InteractionCheckRequest = z.infer<typeof InteractionCheckRequestSchema>;

export const KineticsModuleEnum = z.enum([
  "oncology",
  "antimicrobial",
  "phenytoin",
  "pregnancy",
  "obstetric",
  "vasoactive",
  "transplant",
  "anticoagulation",
  "toxicology",
  "neuropsych",
  "antiarrhythmic",
  "acidbase",
  "anesthesia",
  "epilepsy",
  "moud",
  "glycemic",
  "pediatric",
  "rotation",
  "hepatic",
  "allergy",
  "af",
  "dili",
  "resources",
  "thyroid",
  "dialysis",
  "lithium",
  "digoxin",
  "valproate",
  "vancomycin",
  "aminoglycosides",
  "toxidromes",
  "arrhythmia",
  "all",
]);

export type KineticsModuleName = Exclude<z.infer<typeof KineticsModuleEnum>, "all">;

export const KineticsEvaluationRequestSchema = z.strictObject({
  drugs: z
    .array(DrugIdentifierSchema)
    .min(1, "At least 1 drug must be provided")
    .max(20, "Maximum 20 drugs can be evaluated simultaneously"),
  host: HostContextSchema.optional(),
  modules: z
    .array(KineticsModuleEnum)
    .min(1, "List at least one module, or omit the field to run all modules")
    .optional(),
});

export type KineticsEvaluationRequest = z.infer<typeof KineticsEvaluationRequestSchema>;

const MAX_INVALID_PARAMS = 20;
const MAX_FIELD_SEGMENT = 64;

function fieldName(path: readonly PropertyKey[]): string {
  if (!path.length) return "body";
  return path
    .map((segment) => {
      const text = String(segment);
      return text.length > MAX_FIELD_SEGMENT ? `${text.slice(0, MAX_FIELD_SEGMENT)}…` : text;
    })
    .join(".");
}

function unwrapSchema(node: unknown): unknown {
  let current = node;
  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable ||
    current instanceof z.ZodDefault
  ) {
    current = current.unwrap();
  }
  return current;
}

/** Keys the object schema at `path` accepts; empty when the path does not lead to an object. */
function knownKeysAt(schema: z.ZodType, path: readonly PropertyKey[]): string[] {
  let node = unwrapSchema(schema);
  for (const segment of path) {
    if (node instanceof z.ZodObject) node = unwrapSchema(node.shape[String(segment)]);
    else if (node instanceof z.ZodArray) node = unwrapSchema(node.element);
    else return [];
  }
  return node instanceof z.ZodObject ? Object.keys(node.shape) : [];
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

/** Closest accepted key for a likely typo (`pregant`, `smoking`, `albumin`), if any is close enough. */
function closestKey(key: string, known: string[]): string | undefined {
  const typed = key.toLowerCase();
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of known) {
    const target = candidate.toLowerCase();
    const distance = editDistance(typed, target);
    const contains =
      Math.min(typed.length, target.length) >= 3 &&
      (typed.includes(target) || target.includes(typed));
    const sharedStem = distance <= 3 && typed.slice(0, 4) === target.slice(0, 4);
    if ((distance <= 2 || contains || sharedStem) && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function toInvalidParams(schema: z.ZodType, issue: z.core.$ZodIssue): InvalidParamError[] {
  if (issue.code !== "unrecognized_keys") {
    return [{ name: fieldName(issue.path), reason: issue.message, value: undefined }];
  }
  const known = knownKeysAt(schema, issue.path);
  return issue.keys.map((key) => {
    const suggestion = closestKey(key, known);
    const reason = suggestion
      ? `Unrecognized field. Did you mean "${suggestion}"?`
      : known.length
        ? `Unrecognized field. Accepted fields: ${known.join(", ")}.`
        : "Unrecognized field.";
    return { name: fieldName([...issue.path, key]), reason, value: undefined };
  });
}

/**
 * Validates data against a Zod schema, returning either typed result or RFC 7807 InvalidParamError array.
 * Submitted values are never echoed back; unknown keys are named so a typo cannot silently drop context.
 */
export function validateSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: InvalidParamError[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.flatMap((issue) => toInvalidParams(schema, issue));
  if (errors.length > MAX_INVALID_PARAMS) {
    const hidden = errors.length - MAX_INVALID_PARAMS;
    errors.splice(MAX_INVALID_PARAMS, hidden, {
      name: "body",
      reason: `${hidden} more problem${hidden === 1 ? "" : "s"} not shown.`,
      value: undefined,
    });
  }

  return { success: false, errors };
}
