/**
 * Clinical Decision Support (CDS) API Request Handler.
 *
 * Implements standard HTTP route dispatching for FirstPass CDS endpoints:
 * - POST /api/cds/check: multi-drug interaction checking with host context
 * - POST /api/cds/kinetics: specialty pharmacokinetic module evaluations
 * - GET /api/cds/search: drug catalog search with pagination
 * - GET /api/cds/autocomplete: typeahead with how each row matched
 * - POST /api/cds/analyze: one InteractionReport for a tray (optionally with live outside sources)
 * - GET /api/cds/health: service health check and regulatory metadata
 *
 * Conforms to 21 U.S.C. § 360j(o)(1)(E) and RFC 7807 problem details error format.
 */

import { API_OPEN_PATHS } from "../../billing/api-tiers";
import { SOFTWARE } from "../../regulatory";
import { withinNodeBudget } from "../rpc-input";
import {
  ClinicalDecisionService,
  STATUTORY_CDS_DISCLAIMER,
} from "./cds-service";
import { admitCdsRequest, withHeaders } from "./api-access.server";
import {
  createProblemDetails,
  problemBadRequest,
  problemInternal,
  problemNotFound,
  problemPayloadTooLarge,
  problemUnsupportedMediaType,
  toProblemResponse,
  type ProblemDetails,
} from "./problem";

export const CDS_MODULES_COUNT = 32;

export const TOO_MANY_ITEMS = "Request body has too many items.";

export const MAX_CDS_BODY_BYTES = 10 * 1024 * 1024; // 10 MiB

export const CDS_SECURITY_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

export interface CdsHealthResponse {
  status: "ok";
  version: string;
  disclaimer: string;
  modulesCount: number;
}

export type BoundedCdsBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "invalid-content-length" | "read-error" };

function problemMethodNotAllowed(detail: string, instance?: string): ProblemDetails {
  return createProblemDetails(405, "Method Not Allowed", detail, {
    type: "https://firstpass.app/errors/method-not-allowed",
    instance,
  });
}

function withSecurityHeaders(res: Response): Response {
  const out = new Headers(res.headers);
  for (const [name, value] of Object.entries(CDS_SECURITY_HEADERS)) {
    out.set(name, value);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: out,
  });
}

function methodNotAllowedResponse(
  method: string,
  pathname: string,
  allowed: "GET" | "POST",
): Response {
  return toProblemResponse(
    problemMethodNotAllowed(
      `Method ${method} is not allowed for ${pathname}. Only ${allowed} is supported.`,
      pathname,
    ),
    { Allow: allowed },
  );
}

function checkContentLength(request: Request, maxBytes: number): "ok" | "too-large" | "invalid" {
  const rawLength = request.headers.get("content-length");
  if (rawLength === null) return "ok";
  const trimmed = rawLength.trim();
  if (!/^\d+$/.test(trimmed)) return "invalid";
  const declared = Number(trimmed);
  if (!Number.isSafeInteger(declared) || declared > maxBytes) return "too-large";
  return "ok";
}

function isAllowedCdsContentType(header: string | null): boolean {
  if (header === null || header.trim() === "") return true;
  const mime = header.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "application/json") return true;
  return /^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(mime);
}

/**
 * Reads a CDS request body as UTF-8 up to `maxBytes`, enforcing `Content-Length` first
 * and canceling the stream immediately when cumulative bytes exceed the cap.
 */
export async function readBoundedCdsBody(
  request: Request,
  maxBytes = MAX_CDS_BODY_BYTES,
): Promise<BoundedCdsBodyResult> {
  const headerCheck = checkContentLength(request, maxBytes);
  if (headerCheck !== "ok") {
    void request.body?.cancel().catch(() => {});
    return {
      ok: false,
      reason: headerCheck === "too-large" ? "too-large" : "invalid-content-length",
    };
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }

    if (total === 0) return { ok: true, text: "" };
    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(buffer) };
  } catch {
    await reader?.cancel().catch(() => {});
    return { ok: false, reason: "read-error" };
  }
}

function boundedBodyErrorResponse(
  reason: "too-large" | "invalid-content-length" | "read-error",
  pathname: string,
  operationLabel: string,
): Response {
  if (reason === "too-large") {
    return toProblemResponse(
      problemPayloadTooLarge(
        `Request body exceeds maximum allowed size of ${MAX_CDS_BODY_BYTES} bytes.`,
        pathname,
      ),
    );
  }
  if (reason === "invalid-content-length") {
    return toProblemResponse(
      problemBadRequest("Invalid Content-Length header.", undefined, pathname),
    );
  }
  return toProblemResponse(
    problemBadRequest(
      `Malformed or unreadable JSON body in ${operationLabel} request`,
      undefined,
      pathname,
    ),
  );
}

type ParsedPostBody = { ok: true; body: unknown } | { ok: false; response: Response };

async function parseCdsPostBody(
  request: Request,
  pathname: string,
  operationLabel: string,
): Promise<ParsedPostBody> {
  const lengthCheck = checkContentLength(request, MAX_CDS_BODY_BYTES);
  if (lengthCheck !== "ok") {
    void request.body?.cancel().catch(() => {});
    return {
      ok: false,
      response: boundedBodyErrorResponse(
        lengthCheck === "too-large" ? "too-large" : "invalid-content-length",
        pathname,
        operationLabel,
      ),
    };
  }

  if (!isAllowedCdsContentType(request.headers.get("content-type"))) {
    void request.body?.cancel().catch(() => {});
    return {
      ok: false,
      response: toProblemResponse(
        problemUnsupportedMediaType(
          "Unsupported Content-Type. Expected application/json or application/*+json.",
          pathname,
        ),
      ),
    };
  }

  const rawBody = await readBoundedCdsBody(request, MAX_CDS_BODY_BYTES);
  if (!rawBody.ok) {
    return {
      ok: false,
      response: boundedBodyErrorResponse(rawBody.reason, pathname, operationLabel),
    };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody.text);
  } catch {
    return {
      ok: false,
      response: toProblemResponse(
        problemBadRequest(
          `Malformed or missing JSON body in ${operationLabel} request`,
          undefined,
          pathname,
        ),
      ),
    };
  }

  if (!withinNodeBudget(body)) {
    return {
      ok: false,
      response: toProblemResponse(problemBadRequest(TOO_MANY_ITEMS, undefined, pathname)),
    };
  }

  return { ok: true, body };
}

async function handlePostJsonRoute<T>(
  request: Request,
  method: string,
  pathname: string,
  operationLabel: string,
  execute: (
    body: unknown,
  ) => Promise<{ success: true; data: T } | { success: false; problem: ProblemDetails }>,
): Promise<Response> {
  if (method !== "POST") {
    return methodNotAllowedResponse(method, pathname, "POST");
  }
  const parsed = await parseCdsPostBody(request, pathname, operationLabel);
  if (!parsed.ok) {
    return parsed.response;
  }
  const result = await execute(parsed.body);
  if (!result.success) {
    return toProblemResponse(result.problem);
  }
  return Response.json(result.data, { status: 200 });
}

/**
 * Dispatches incoming HTTP requests to corresponding CDS service handlers.
 * Every path but /api/cds/health first passes the key check and rate limit (api-access.server.ts),
 * and its answer carries the RateLimit headers plus CDS_SECURITY_HEADERS.
 */
export async function handleCdsRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url, "http://localhost");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    if (API_OPEN_PATHS.includes(pathname)) {
      return withSecurityHeaders(await route(request, url, pathname));
    }
    const access = await admitCdsRequest(request, pathname);
    if (!access.ok) {
      return withSecurityHeaders(access.response);
    }
    return withSecurityHeaders(withHeaders(await route(request, url, pathname), access.headers));
  } catch {
    return withSecurityHeaders(
      toProblemResponse(
        problemInternal("An unexpected error occurred while processing the CDS request"),
      ),
    );
  }
}

async function route(request: Request, url: URL, pathname: string): Promise<Response> {
  try {
    const method = request.method.toUpperCase();

    // GET /api/cds/health
    if (pathname === "/api/cds/health") {
      if (method !== "GET") {
        return methodNotAllowedResponse(method, pathname, "GET");
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
        return methodNotAllowedResponse(method, pathname, "GET");
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

    // GET /api/cds/autocomplete
    if (pathname === "/api/cds/autocomplete") {
      if (method !== "GET") {
        return methodNotAllowedResponse(method, pathname, "GET");
      }
      const q = url.searchParams.has("q") ? (url.searchParams.get("q") ?? undefined) : undefined;
      const limit = url.searchParams.get("limit") ?? undefined;
      const result = ClinicalDecisionService.autocomplete({ q, limit });
      if (!result.success) {
        return toProblemResponse(result.problem);
      }
      return Response.json(result.data, { status: 200 });
    }

    // POST /api/cds/analyze
    if (pathname === "/api/cds/analyze") {
      return await handlePostJsonRoute(request, method, pathname, "analyze", (body) =>
        ClinicalDecisionService.analyze(body),
      );
    }

    // POST /api/cds/check
    if (pathname === "/api/cds/check") {
      return await handlePostJsonRoute(request, method, pathname, "interaction check", (body) =>
        ClinicalDecisionService.checkInteractions(body),
      );
    }

    // POST /api/cds/kinetics
    if (pathname === "/api/cds/kinetics") {
      return await handlePostJsonRoute(request, method, pathname, "kinetics evaluation", (body) =>
        ClinicalDecisionService.evaluateKinetics(body),
      );
    }

    // Route not found
    return toProblemResponse(
      problemNotFound(`Endpoint '${url.pathname}' not found`, url.pathname),
    );
  } catch {
    return toProblemResponse(
      problemInternal("An unexpected error occurred while processing the CDS request"),
    );
  }
}
