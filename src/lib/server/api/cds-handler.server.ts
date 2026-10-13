/**
 * Clinical Decision Support (CDS) API Request Handler.
 *
 * Implements standard HTTP route dispatching for FirstPass CDS endpoints:
 * - POST /api/cds/check: multi-drug interaction checking with host context
 * - POST /api/cds/kinetics: specialty pharmacokinetic module evaluations
 * - GET /api/cds/search: drug catalog search with pagination
 * - GET /api/cds/health: service health check and regulatory metadata
 *
 * Conforms to 21 U.S.C. § 360j(o)(1)(E) and RFC 7807 problem details error format.
 */

import { SOFTWARE } from "../../regulatory";
import {
  ClinicalDecisionService,
  STATUTORY_CDS_DISCLAIMER,
} from "./cds-service";
import {
  createProblemDetails,
  problemBadRequest,
  problemNotFound,
  problemInternal,
  toProblemResponse,
  type ProblemDetails,
} from "./problem";

export const CDS_MODULES_COUNT = 32;

export interface CdsHealthResponse {
  status: "ok";
  version: string;
  disclaimer: string;
  modulesCount: number;
}

function problemMethodNotAllowed(detail: string, instance?: string): ProblemDetails {
  return createProblemDetails(405, "Method Not Allowed", detail, {
    type: "https://firstpass.app/errors/method-not-allowed",
    instance,
  });
}

/**
 * Dispatches incoming HTTP requests to corresponding CDS service handlers.
 */
export async function handleCdsRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url, "http://localhost");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method.toUpperCase();

    // GET /api/cds/health
    if (pathname === "/api/cds/health") {
      if (method !== "GET") {
        return toProblemResponse(
          problemMethodNotAllowed(
            `Method ${method} is not allowed for ${pathname}. Only GET is supported.`,
            pathname,
          ),
        );
      }
      const healthData: CdsHealthResponse = {
        status: "ok",
        version: SOFTWARE.version,
        disclaimer: STATUTORY_CDS_DISCLAIMER,
        modulesCount: CDS_MODULES_COUNT,
      };
      return Response.json(healthData, { status: 200 });
    }

    // GET /api/cds/search
    if (pathname === "/api/cds/search") {
      if (method !== "GET") {
        return toProblemResponse(
          problemMethodNotAllowed(
            `Method ${method} is not allowed for ${pathname}. Only GET is supported.`,
            pathname,
          ),
        );
      }
      const q = url.searchParams.has("q") ? (url.searchParams.get("q") ?? undefined) : undefined;
      const limitParam = url.searchParams.get("limit");
      const limit = limitParam !== null ? limitParam : undefined;

      const result = ClinicalDecisionService.search({ q, limit });
      if (!result.success) {
        return toProblemResponse(result.problem);
      }
      return Response.json(result.data, { status: 200 });
    }

    // POST /api/cds/check
    if (pathname === "/api/cds/check") {
      if (method !== "POST") {
        return toProblemResponse(
          problemMethodNotAllowed(
            `Method ${method} is not allowed for ${pathname}. Only POST is supported.`,
            pathname,
          ),
        );
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return toProblemResponse(
          problemBadRequest(
            "Malformed or missing JSON body in interaction check request",
            undefined,
            pathname,
          ),
        );
      }
      const result = await ClinicalDecisionService.checkInteractions(body);
      if (!result.success) {
        return toProblemResponse(result.problem);
      }
      return Response.json(result.data, { status: 200 });
    }

    // POST /api/cds/kinetics
    if (pathname === "/api/cds/kinetics") {
      if (method !== "POST") {
        return toProblemResponse(
          problemMethodNotAllowed(
            `Method ${method} is not allowed for ${pathname}. Only POST is supported.`,
            pathname,
          ),
        );
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return toProblemResponse(
          problemBadRequest(
            "Malformed or missing JSON body in kinetics evaluation request",
            undefined,
            pathname,
          ),
        );
      }
      const result = await ClinicalDecisionService.evaluateKinetics(body);
      if (!result.success) {
        return toProblemResponse(result.problem);
      }
      return Response.json(result.data, { status: 200 });
    }

    // Route not found
    return toProblemResponse(
      problemNotFound(`Endpoint '${url.pathname}' not found`, url.pathname),
    );
  } catch (error) {
    return toProblemResponse(
      problemInternal(
        "An unexpected error occurred while processing the CDS request",
      ),
    );
  }
}
