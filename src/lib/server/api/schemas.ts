/**
 * Zod validation schemas for FirstPass Clinical Decision Support (CDS) API.
 *
 * Implements strict runtime schema validation, sanitization, and typing
 * conforming to modern Pydantic v2 / Zod architectural principles.
 */

import { z } from "zod";
import { type InvalidParamError } from "./problem";

export const HostContextSchema = z.object({
  age: z.number().min(0, "Age cannot be negative").max(125, "Age exceeds physiologic range").optional(),
  sex: z.enum(["male", "female"]).optional(),
  weightKg: z.number().min(1, "Weight must be at least 1 kg").max(350, "Weight exceeds supported limit").optional(),
  scr: z.number().min(0.1, "Serum creatinine must be > 0.1 mg/dL").max(30.0, "Serum creatinine exceeds limit").optional(),
  egfr: z.number().min(0, "eGFR cannot be negative").max(200, "eGFR exceeds physiologic limit").optional(),
  kidney: z.enum(["normal", "mild", "moderate", "severe", "esrd"]).optional(),
  pregnant: z.boolean().optional(),
  lactating: z.boolean().optional(),
  smoker: z.boolean().optional(),
  ph: z.number().min(6.5, "pH below survivable limit").max(7.8, "pH above survivable limit").optional(),
  serumAlbumin: z.number().min(0.5, "Albumin must be at least 0.5 g/dL").max(7.0, "Albumin exceeds limit").optional(),
  urinePh: z.number().min(4.5).max(9.0).optional(),
});

export type HostContextInput = z.infer<typeof HostContextSchema>;

export const DrugLookupRequestSchema = z.object({
  q: z.string().trim().min(1, "Search query cannot be empty").max(100, "Query exceeds max length 100"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type DrugLookupRequest = z.infer<typeof DrugLookupRequestSchema>;

export const InteractionCheckRequestSchema = z.object({
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
  "vasoactive",
  "transplant",
  "anticoagulation",
  "toxicology",
  "neuropsych",
  "all",
]);

export const KineticsEvaluationRequestSchema = z.object({
  drugs: z
    .array(z.string().trim().min(1, "Drug identifier cannot be empty").max(100))
    .min(1, "At least 1 drug must be provided")
    .max(20, "Maximum 20 drugs can be evaluated simultaneously"),
  host: HostContextSchema.optional(),
  modules: z.array(KineticsModuleEnum).optional(),
});

export type KineticsEvaluationRequest = z.infer<typeof KineticsEvaluationRequestSchema>;

/**
 * Validates data against a Zod schema, returning either typed result or RFC 7807 InvalidParamError array.
 */
export function validateSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: InvalidParamError[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: InvalidParamError[] = result.error.issues.map((issue) => ({
    name: issue.path.join(".") || "body",
    reason: issue.message,
    value: undefined,
  }));

  return { success: false, errors };
}

