/**
 * Zod validation schemas for FirstPass Clinical Decision Support (CDS) API.
 *
 * Implements strict runtime schema validation, sanitization, and typing
 * conforming to modern Pydantic v2 / Zod architectural principles.
 * Request objects are strict: an unknown key (a typo such as `pregant`) is a 422,
 * never silently dropped context.
 */

import { z } from "zod";
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
      .max(125, "Age exceeds physiologic range")
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

export const DrugLookupRequestSchema = z.strictObject({
  q: z
    .string()
    .trim()
    .min(1, "Search query cannot be empty")
    .max(100, "Query exceeds max length 100"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type DrugLookupRequest = z.infer<typeof DrugLookupRequestSchema>;

export const InteractionCheckRequestSchema = z.strictObject({
  drugs: z
    .array(z.string().trim().min(1, "Drug identifier cannot be empty").max(100))
    .min(1, "At least 1 drug must be provided")
    .max(20, "Maximum 20 drugs can be checked simultaneously"),
  host: HostContextSchema.optional(),
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
  "all",
]);

export type KineticsModuleName = Exclude<z.infer<typeof KineticsModuleEnum>, "all">;

export const KineticsEvaluationRequestSchema = z.strictObject({
  drugs: z
    .array(z.string().trim().min(1, "Drug identifier cannot be empty").max(100))
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
