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
  /** Extension member: quote it when reporting a server-side failure. */
  correlationId?: string;
  timestamp: string;
}

/** Carries a finished problem out of nested service code; anything else thrown is a 500. */
export class ApiProblemError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = "ApiProblemError";
    this.problem = problem;
  }
}

export function createProblemDetails(
  status: number,
  title: string,
  detail: string,
  options?: {
    type?: string;
    instance?: string;
    invalidParams?: InvalidParamError[];
    correlationId?: string;
  },
): ProblemDetails {
  return {
    type: options?.type ?? `https://firstpass.app/errors/http-${status}`,
    title,
    status,
    detail,
    instance: options?.instance,
    invalidParams: options?.invalidParams,
    correlationId: options?.correlationId,
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

export function problemNotFound(
  detail: string,
  instance?: string,
  invalidParams?: InvalidParamError[],
): ProblemDetails {
  return createProblemDetails(404, "Not Found", detail, {
    type: "https://firstpass.app/errors/not-found",
    instance,
    invalidParams,
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

export function problemInternal(
  detail = "An internal server error occurred",
  correlationId?: string,
): ProblemDetails {
  return createProblemDetails(500, "Internal Server Error", detail, {
    type: "https://firstpass.app/errors/internal-server-error",
    instance: correlationId ? `urn:uuid:${correlationId}` : undefined,
    correlationId,
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
