import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEVELOPERS_ENDPOINTS } from "../../seo/developers";
import { handleCdsRequest } from "./cds-handler.server";
import { OPENAPI_PATH, OPENAPI_ROUTE_PATHS, openApiDocument, openApiPath } from "./openapi";

type Doc = {
  openapi: string;
  paths: Record<string, Record<string, { parameters?: { name: string }[]; requestBody?: { content: Record<string, { schema: { properties?: object } }> } }>>;
};
const doc = openApiDocument() as Doc;

describe("OpenAPI document - generated from the request schemas", () => {
  it("is OpenAPI 3.1 and lists every endpoint /developers documents, with the same method", () => {
    assert.equal(doc.openapi, "3.1.0");
    for (const e of DEVELOPERS_ENDPOINTS) {
      assert.ok(doc.paths[openApiPath(e.path)]?.[e.method.toLowerCase()], `${e.method} ${e.path}`);
    }
    assert.deepEqual(doc.paths["/api/cds/monograph/{id}"]!.get!.parameters!.map((p) => p.name), ["id"]);
  });

  it("describes each body and query from its schema", () => {
    const body = (path: string) => doc.paths[path]!.post!.requestBody!.content["application/json"]!.schema.properties;
    assert.ok(body("/api/cds/analyze") && "substances" in body("/api/cds/analyze")!);
    assert.ok(body("/api/cds/check") && "drugs" in body("/api/cds/check")!);
    assert.deepEqual(doc.paths["/api/cds/autocomplete"]!.get!.parameters!.map((p) => p.name), ["q", "limit"]);
  });

  it("is served open at its own path, and every listed route answers (no 404)", async () => {
    const res = await handleCdsRequest(new Request(`http://localhost${OPENAPI_PATH}`));
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as Doc).openapi, "3.1.0");
    for (const path of OPENAPI_ROUTE_PATHS) {
      const url = `http://localhost${path.replace("{id}", "warfarin")}`;
      const probe = await handleCdsRequest(new Request(url, { method: "DELETE" }));
      assert.notEqual(probe.status, 404, path);
    }
  });
});
