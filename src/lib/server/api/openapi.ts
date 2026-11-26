/**
 * OpenAPI 3.1 description of /api/cds/*, built from the zod schemas that validate each request and the
 * summaries on /developers, so the published contract cannot drift from what the server accepts.
 */
import { z } from "zod";
import { SOFTWARE } from "../../regulatory";
import { DEVELOPERS_ENDPOINTS, DEVELOPERS_URL } from "../../seo/developers";
import { SITE_URL } from "../../seo/pair-copy";
import {
  AnalyzeRequestSchema,
  AutocompleteRequestSchema,
  DrugLookupRequestSchema,
  ExportRequestSchema,
  InteractionCheckRequestSchema,
  KineticsEvaluationRequestSchema,
} from "./schemas";
import { STATUTORY_CDS_DISCLAIMER } from "./cds-service";

export const OPENAPI_PATH = "/api/cds/openapi.json";

type JsonSchema = Record<string, unknown>;

/** Every route the handler serves, with the schema that validates its query or body. */
const ROUTES: ReadonlyArray<{ path: string; method: "get" | "post"; operationId: string; query?: z.ZodType; body?: z.ZodType }> = [
  { path: "/api/cds/health", method: "get", operationId: "health" },
  { path: "/api/cds/search", method: "get", operationId: "search", query: DrugLookupRequestSchema },
  { path: "/api/cds/monograph/{id}", method: "get", operationId: "monograph" },
  { path: "/api/cds/autocomplete", method: "get", operationId: "autocomplete", query: AutocompleteRequestSchema },
  { path: "/api/cds/analyze", method: "post", operationId: "analyze", body: AnalyzeRequestSchema },
  { path: "/api/cds/check", method: "post", operationId: "check", body: InteractionCheckRequestSchema },
  { path: "/api/cds/kinetics", method: "post", operationId: "kinetics", body: KineticsEvaluationRequestSchema },
  { path: "/api/cds/export", method: "post", operationId: "export", body: ExportRequestSchema },
  { path: OPENAPI_PATH, method: "get", operationId: "openapi" },
];

/** The request shape a caller sends (defaults optional), without the dialect marker OpenAPI 3.1 already implies. */
function inputSchema(schema: z.ZodType): JsonSchema {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonSchema;
  delete json.$schema;
  return json;
}

function queryParameters(schema: z.ZodType) {
  const json = inputSchema(schema) as { properties?: Record<string, JsonSchema>; required?: string[] };
  return Object.entries(json.properties ?? {}).map(([name, prop]) => ({
    name,
    in: "query",
    required: json.required?.includes(name) ?? false,
    schema: prop,
  }));
}

const PROBLEM: JsonSchema = {
  type: "object",
  description: "RFC 9457 problem details.",
  required: ["type", "title", "status", "detail", "timestamp"],
  properties: {
    type: { type: "string" },
    title: { type: "string" },
    status: { type: "integer" },
    detail: { type: "string" },
    instance: { type: "string" },
    invalidParams: {
      type: "array",
      items: { type: "object", required: ["name", "reason"], properties: { name: { type: "string" }, reason: { type: "string" } } },
    },
    correlationId: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
  },
};

const problem = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } },
});

/** /developers writes a path parameter as ":id"; OpenAPI writes it as "{id}". */
export const openApiPath = (path: string) => path.replace(/:(\w+)/g, "{$1}");

function operation(route: (typeof ROUTES)[number]) {
  const documented = DEVELOPERS_ENDPOINTS.find((e) => openApiPath(e.path) === route.path);
  const pathParams = [...route.path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
    description: "A catalog id, generic name or brand.",
  }));
  const open = route.operationId === "health" || route.operationId === "openapi";
  return {
    operationId: route.operationId,
    summary: documented?.summary.split(/(?<=\.)\s/)[0] ?? "This OpenAPI document.",
    ...(documented ? { description: documented.summary } : {}),
    ...(route.query || pathParams.length ? { parameters: [...pathParams, ...(route.query ? queryParameters(route.query) : [])] } : {}),
    ...(route.body ? { requestBody: { required: true, content: { "application/json": { schema: inputSchema(route.body) } } } } : {}),
    // A key raises the limit; without one a caller gets the anonymous limit.
    security: open ? [] : [{}, { bearerKey: [] }, { headerKey: [] }],
    responses: {
      "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      ...(route.query || route.body ? { "400": problem("The request could not be read."), "422": problem("The request failed validation.") } : {}),
      ...(pathParams.length ? { "400": problem("The id in the path could not be read."), "404": problem("No catalog entry matches that id.") } : {}),
      ...(open ? {} : { "401": problem("The key is invalid, tampered or past its end month."), "429": problem("Over the rate limit; see Retry-After.") }),
      "405": problem("Method not allowed."),
    },
  };
}

let cached: JsonSchema | undefined;

/** The OpenAPI document, built once per server instance. */
export function openApiDocument(): JsonSchema {
  cached ??= {
    openapi: "3.1.0",
    info: {
      title: "FirstPass CDS API",
      version: SOFTWARE.version,
      description: `${STATUTORY_CDS_DISCLAIMER} Guide: ${DEVELOPERS_URL}`,
    },
    servers: [{ url: SITE_URL }],
    externalDocs: { url: DEVELOPERS_URL },
    paths: Object.fromEntries(
      [...new Set(ROUTES.map((r) => r.path))].map((path) => [
        path,
        Object.fromEntries(ROUTES.filter((r) => r.path === path).map((r) => [r.method, operation(r)])),
      ]),
    ),
    components: {
      schemas: { Problem: PROBLEM },
      securitySchemes: {
        bearerKey: { type: "http", scheme: "bearer", description: "Authorization: Bearer <key>" },
        headerKey: { type: "apiKey", in: "header", name: "x-api-key" },
      },
    },
  };
  return cached;
}

/** Route paths in the document, for the drift test. */
export const OPENAPI_ROUTE_PATHS: readonly string[] = ROUTES.map((r) => r.path);
