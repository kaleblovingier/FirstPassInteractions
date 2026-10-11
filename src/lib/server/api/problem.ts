/**
 * RFC 7807 Problem Details for HTTP APIs (IETF RFC 7807 / RFC 9457).
 *
 * Provides standardized, machine-readable error responses across
 * all FirstPass backend services and API endpoints.
 */

export interface InvalidParamError {
  name: string;
  reason: string;
  value?: unknown;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: InvalidParamError[];
  timestamp: string;
}

export function createProblemDetails(
  status: number,
  title: string,
  detail: string,
  options?: {
    type?: string;
    instance?: string;
    invalidParams?: InvalidParamError[];
  },
): ProblemDetails {
  return {
    type: options?.type ?? `https://firstpass.app/errors/http-${status}`,
    title,
    status,
    detail,
    instance: options?.instance,
    invalidParams: options?.invalidParams,
    timestamp: new Date().toISOString(),
  };
}

export function problemBadRequest(
  detail: string,
  invalidParams?: InvalidParamError[],
  instance?: string,
): ProblemDetails {
  return createProblemDetails(400, "Bad Request", detail, {
    type: "https://firstpass.app/errors/bad-request",
    invalidParams,
    instance,
  });
}

export function problemNotFound(detail: string, instance?: string): ProblemDetails {
  return createProblemDetails(404, "Not Found", detail, {
    type: "https://firstpass.app/errors/not-found",
    instance,
  });
}

export function problemUnprocessable(
  detail: string,
  invalidParams?: InvalidParamError[],
  instance?: string,
): ProblemDetails {
  return createProblemDetails(422, "Unprocessable Entity", detail, {
    type: "https://firstpass.app/errors/validation-error",
    invalidParams,
    instance,
  });
}

export function problemInternal(detail = "An internal server error occurred"): ProblemDetails {
  return createProblemDetails(500, "Internal Server Error", detail, {
    type: "https://firstpass.app/errors/internal-server-error",
  });
}

export function toProblemResponse(problem: ProblemDetails): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      "Content-Type": "application/problem+json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

