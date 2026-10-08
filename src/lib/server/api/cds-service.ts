/**
 * Clinical Decision Support (CDS) API Service.
 *
 * Senior Backend Service orchestrating multi-agent pharmacology calculations,
 * schema validation, BoundedLRU caching, singleflight coalescing, and
 * standardized RFC 7807 problem responses.
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support.
 */

import { DRUG_BY_ID, DRUGS, searchDrugs } from "../../drugs/catalog";
import { analyze } from "../../drugs/engine";
import {
  DEFAULT_HOST,
  type AgeBand,
  type Drug,
  type HostContext,
  type KidneyBand,
  type PregBand,
} from "../../drugs/types";
import { BoundedLRUCache } from "../cache";
import {
  type DrugLookupRequest,
  type HostContextInput,
  type InteractionCheckRequest,
  type KineticsEvaluationRequest,
  DrugLookupRequestSchema,
  InteractionCheckRequestSchema,
  KineticsEvaluationRequestSchema,
  validateSchema,
} from "./schemas";
import {
  problemBadRequest,
  problemNotFound,
  problemUnprocessable,
  type ProblemDetails,
} from "./problem";

// Regional specialized kinetics engines
import { oncologyOnDesk, oncologyReportOnDesk } from "../../drugs/oncology-kinetics";
import { antimicrobialOnDesk, antimicrobialReportOnDesk } from "../../drugs/antimicrobial-stewardship";
import { phenytoinOnDesk, phenytoinReportOnDesk } from "../../drugs/phenytoin-kinetics";
import { pregnancyOnDesk, pregnancyReportOnDesk } from "../../drugs/pregnancy-lactation";
import { vasoactiveOnDesk, vasoactiveReportOnDesk } from "../../drugs/vasoactive-kinetics";
import { transplantOnDesk, transplantReportOnDesk } from "../../drugs/transplant-immunosuppression";
import { anticoagulationOnDesk, anticoagulationReportOnDesk } from "../../drugs/anticoagulation-reversal";
import { toxicologyOnDesk, toxicologyReportOnDesk } from "../../drugs/toxicology-kinetics";
import { neuropsychOnDesk, neuropsychReportOnDesk } from "../../drugs/neuropsych-kinetics";
import { antiarrhythmicOnDesk, antiarrhythmicReportOnDesk } from "../../drugs/antiarrhythmic-kinetics";
import { acidBaseOnDesk, acidBaseReportOnDesk } from "../../drugs/acid-base-kinetics";
import { anesthesiaOnDesk, anesthesiaReportOnDesk } from "../../drugs/anesthesia-reversal";

export const STATUTORY_CDS_DISCLAIMER =
  "FirstPass Clinical Decision Support API conforms to 21 U.S.C. § 360j(o)(1)(E) (FD&C Act § 520(o)(1)(E)) as non-device clinical decision support. This service displays mathematical equations, biochemical pathways, published clinical guidelines, and peer-reviewed literature citations so licensed healthcare practitioners can independently review the basis of every calculation. It does not provide automated diagnoses, prescriptive directives, or order sets. The FDA-approved Prescribing Information governs all clinical practice.";

export interface ApiDrugSummary {
  id: string;
  name: string;
  brand?: string;
  family?: string;
  classes?: string[];
  routes?: string[];
  cypRoles?: { enzyme: string; role: string; strength?: string }[];
}

export interface InteractionCheckResult {
  meta: {
    engine: string;
    version: string;
    timestamp: string;
    durationMs: number;
    disclaimer: string;
  };
  query: {
    requestedDrugs: string[];
    resolvedDrugs: ApiDrugSummary[];
    unresolvedDrugs: string[];
    host: HostContext;
  };
  summary: {
    totalFindings: number;
    contraindicatedCount: number;
    majorCount: number;
    moderateCount: number;
    minorCount: number;
    highestSeverity: string;
  };
  findings: Array<{
    perpetratorId: string;
    perpetratorName: string;
    victimId: string;
    victimName: string;
    severity: string;
    mechanism: string;
    evidence: string;
    actionableAdvice: string;
    sourceReferences: string[];
  }>;
}

export interface KineticsEvaluationResult {
  meta: {
    engine: string;
    timestamp: string;
    durationMs: number;
    disclaimer: string;
  };
  query: {
    drugIds: string[];
    host: HostContext;
  };
  modules: {
    oncology?: unknown;
    antimicrobial?: unknown;
    phenytoin?: unknown;
    pregnancy?: unknown;
    vasoactive?: unknown;
    transplant?: unknown;
    anticoagulation?: unknown;
    toxicology?: unknown;
    neuropsych?: unknown;
    antiarrhythmic?: unknown;
    acidbase?: unknown;
    anesthesia?: unknown;
  };
}

// Bounded LRU Cache for query responses with 10-minute TTL
const interactionCache = new BoundedLRUCache<InteractionCheckResult>(500, 10 * 60 * 1000);
const kineticsCache = new BoundedLRUCache<KineticsEvaluationResult>(500, 10 * 60 * 1000);

export function buildHostContext(input?: HostContextInput): HostContext {
  if (!input) return { ...DEFAULT_HOST };

  const ageBand: AgeBand | undefined =
    typeof input.age === "number" ? (input.age >= 65 ? "geriatric" : "adult") : undefined;

  const kidneyBand: KidneyBand | undefined =
    input.kidney === "moderate" || input.kidney === "severe" || input.kidney === "esrd"
      ? "ckd"
      : input.kidney === "normal" || input.kidney === "mild"
        ? "ok"
        : undefined;

  const pregBand: PregBand | undefined = input.pregnant
    ? "pregnant"
    : input.lactating
      ? "lactating"
      : "off";

  return {
    ...DEFAULT_HOST,
    age: ageBand ?? DEFAULT_HOST.age,
    kidney: kidneyBand ?? DEFAULT_HOST.kidney,
    preg: pregBand ?? DEFAULT_HOST.preg,
    smoking: input.smoker ?? DEFAULT_HOST.smoking,
  };
}

export function resolveDrug(query: string): Drug | undefined {
  const normalized = query.trim().toLowerCase();
  if (DRUG_BY_ID[normalized]) {
    return DRUG_BY_ID[normalized];
  }
  // Search aliases and brand names
  const matches = searchDrugs(normalized);
  if (matches.length > 0) {
    return matches[0];
  }
  return undefined;
}

export function toApiDrugSummary(drug: Drug): ApiDrugSummary {
  return {
    id: drug.id,
    name: drug.name,
    brand: drug.brands?.[0],
    family: drug.cls,
    classes: [drug.cls],
    cypRoles: drug.enzymes?.map((r) => ({
      enzyme: r.enzyme,
      role: r.kind,
      strength: "strength" in r ? r.strength : r.sensitivity,
    })),
  };
}

export class ClinicalDecisionService {
  /**
   * Search drug catalog with auto-suggestions.
   */
  static search(rawRequest: unknown): { success: true; data: ApiDrugSummary[] } | { success: false; problem: ProblemDetails } {
    const val = validateSchema(DrugLookupRequestSchema, rawRequest);
    if (!val.success) {
      return { success: false, problem: problemUnprocessable("Invalid search parameters", val.errors) };
    }
    const { q, limit } = val.data;
    const matches = searchDrugs(q).slice(0, limit);
    return {
      success: true,
      data: matches.map(toApiDrugSummary),
    };
  }

  /**
   * Check interactions across a multi-drug regimen with host context.
   */
  static async checkInteractions(
    rawRequest: unknown,
  ): Promise<{ success: true; data: InteractionCheckResult } | { success: false; problem: ProblemDetails }> {
    const val = validateSchema(InteractionCheckRequestSchema, rawRequest);
    if (!val.success) {
      return { success: false, problem: problemUnprocessable("Validation failed for interaction check request", val.errors) };
    }

    const { drugs: drugQueries, host: rawHost } = val.data;
    const host = buildHostContext(rawHost);

    // Build cache key
    const sortedQueries = [...drugQueries].sort().join(",");
    const cacheKey = `ix:${sortedQueries}:${host.age}:${host.kidney}:${host.preg}:${host.smoking}`;

    const cached = interactionCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const startTime = performance.now();
    const resolved: Drug[] = [];
    const unresolved: string[] = [];

    for (const q of drugQueries) {
      const drug = resolveDrug(q);
      if (drug) {
        resolved.push(drug);
      } else {
        unresolved.push(q);
      }
    }

    if (resolved.length === 0) {
      return {
        success: false,
        problem: problemNotFound(`None of the requested drugs could be resolved: [${unresolved.join(", ")}]`),
      };
    }

    // Run core interaction analysis with resolved drug IDs
    const resolvedIds = resolved.map((d) => d.id);
    const report = analyze(resolvedIds, host);

    // Tally severities
    let contraindicatedCount = 0;
    let majorCount = 0;
    let moderateCount = 0;
    let minorCount = 0;

    const formattedFindings = report.findings.map((f) => {
      const sev = f.severity.toLowerCase();
      if (sev.includes("contraindicated")) contraindicatedCount++;
      else if (sev.includes("major")) majorCount++;
      else if (sev.includes("moderate")) moderateCount++;
      else minorCount++;

      const pId = f.drugIds[0] ?? "unknown";
      const vId = f.drugIds[1] ?? f.drugIds[0] ?? "unknown";
      const pDrug = DRUG_BY_ID[pId];
      const vDrug = DRUG_BY_ID[vId];

      return {
        perpetratorId: pId,
        perpetratorName: pDrug?.name ?? pId,
        victimId: vId,
        victimName: vDrug?.name ?? vId,
        severity: f.severity,
        mechanism: f.mechanism || f.effect,
        evidence: f.headline,
        actionableAdvice: f.clinical,
        sourceReferences: f.tags ?? [],
      };
    });

    const highestSeverity =
      report.highest === "contraindicated"
        ? "Contraindicated"
        : report.highest === "major"
          ? "Major"
          : report.highest === "moderate"
            ? "Moderate"
            : report.highest === "minor"
              ? "Minor"
              : "None";

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const result: InteractionCheckResult = {
      meta: {
        engine: "FirstPass Interactions Engine",
        version: "1.38.0",
        timestamp: new Date().toISOString(),
        durationMs,
        disclaimer: STATUTORY_CDS_DISCLAIMER,
      },
      query: {
        requestedDrugs: drugQueries,
        resolvedDrugs: resolved.map(toApiDrugSummary),
        unresolvedDrugs: unresolved,
        host,
      },
      summary: {
        totalFindings: formattedFindings.length,
        contraindicatedCount,
        majorCount,
        moderateCount,
        minorCount,
        highestSeverity,
      },
      findings: formattedFindings,
    };

    interactionCache.set(cacheKey, result);
    return { success: true, data: result };
  }

  /**
   * Evaluate pharmacokinetic stations across specialty domains.
   */
  static async evaluateKinetics(
    rawRequest: unknown,
  ): Promise<{ success: true; data: KineticsEvaluationResult } | { success: false; problem: ProblemDetails }> {
    const val = validateSchema(KineticsEvaluationRequestSchema, rawRequest);
    if (!val.success) {
      return { success: false, problem: problemUnprocessable("Validation failed for kinetics evaluation request", val.errors) };
    }

    const { drugs: drugQueries, host: rawHost, modules: requestedModules } = val.data;
    const host = buildHostContext(rawHost);

    // Resolve drug IDs
    const resolvedIds: string[] = [];
    for (const q of drugQueries) {
      const drug = resolveDrug(q);
      if (drug) resolvedIds.push(drug.id);
    }

    const cacheKey = `kin:${resolvedIds.sort().join(",")}:${requestedModules?.join("|") ?? "all"}:${host.age}:${host.kidney}`;
    const cached = kineticsCache.get(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const startTime = performance.now();
    const runAll = !requestedModules || requestedModules.includes("all");
    const modObj: KineticsEvaluationResult["modules"] = {};

    if (runAll || requestedModules.includes("oncology")) {
      modObj.oncology = oncologyReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("antimicrobial")) {
      modObj.antimicrobial = antimicrobialReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("phenytoin")) {
      modObj.phenytoin = phenytoinReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("pregnancy")) {
      modObj.pregnancy = pregnancyReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("vasoactive")) {
      modObj.vasoactive = vasoactiveReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("transplant")) {
      modObj.transplant = transplantReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("anticoagulation")) {
      modObj.anticoagulation = anticoagulationReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("toxicology")) {
      modObj.toxicology = toxicologyReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("neuropsych")) {
      modObj.neuropsych = neuropsychReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("antiarrhythmic")) {
      modObj.antiarrhythmic = antiarrhythmicReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("acidbase")) {
      modObj.acidbase = acidBaseReportOnDesk(resolvedIds, host);
    }
    if (runAll || requestedModules.includes("anesthesia")) {
      modObj.anesthesia = anesthesiaReportOnDesk(resolvedIds, host);
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const result: KineticsEvaluationResult = {
      meta: {
        engine: "FirstPass Multi-Domain Pharmacokinetics Engine",
        timestamp: new Date().toISOString(),
        durationMs,
        disclaimer: STATUTORY_CDS_DISCLAIMER,
      },
      query: {
        drugIds: resolvedIds,
        host,
      },
      modules: modObj,
    };

    kineticsCache.set(cacheKey, result);
    return { success: true, data: result };
  }

  /**
   * Clears internal caches.
   */
  static clearCaches(): void {
    interactionCache.clear();
    kineticsCache.clear();
  }
}
