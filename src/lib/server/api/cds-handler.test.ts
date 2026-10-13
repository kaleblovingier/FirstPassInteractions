import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleCdsRequest,
  CDS_MODULES_COUNT,
  type CdsHealthResponse,
} from "./cds-handler.server";
import { ClinicalDecisionService, STATUTORY_CDS_DISCLAIMER } from "./cds-service";
import { SOFTWARE } from "../../regulatory";
import type { ProblemDetails } from "./problem";

function jsonRequest(url: string, method: string, body?: unknown): Request {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(url, init);
}

test("handleCdsRequest: GET /api/cds/health returns 200 with statutory disclaimer and metadata", async () => {
  const req = new Request("http://localhost/api/cds/health");
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-type")?.includes("application/json"));

  const data = (await res.json()) as CdsHealthResponse;
  assert.equal(data.status, "ok");
  assert.equal(data.version, SOFTWARE.version);
  assert.equal(data.disclaimer, STATUTORY_CDS_DISCLAIMER);
  assert.equal(data.modulesCount, 32);
  assert.equal(data.modulesCount, CDS_MODULES_COUNT);
});

test("handleCdsRequest: GET /api/cds/health handles trailing slash", async () => {
  const req = new Request("http://localhost/api/cds/health/");
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 200);
  const data = (await res.json()) as CdsHealthResponse;
  assert.equal(data.status, "ok");
});

test("handleCdsRequest: non-GET to /api/cds/health returns 405 Method Not Allowed", async () => {
  const req = jsonRequest("http://localhost/api/cds/health", "POST", {});
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 405);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));

  const problem = (await res.json()) as ProblemDetails;
  assert.equal(problem.status, 405);
  assert.equal(problem.title, "Method Not Allowed");
  assert.ok(problem.detail.includes("POST"));
});

test("handleCdsRequest: GET /api/cds/search executes search query with results", async () => {
  const req = new Request("http://localhost/api/cds/search?q=warfarin&limit=5");
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-type")?.includes("application/json"));

  const results = (await res.json()) as Array<{ id: string; name: string }>;
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0 && results.length <= 5);
  assert.equal(results[0].id, "warfarin");
});

test("handleCdsRequest: GET /api/cds/search defaults limit when omitted", async () => {
  const req = new Request("http://localhost/api/cds/search?q=aspirin");
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 200);
  const results = (await res.json()) as Array<{ id: string; name: string }>;
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  assert.ok(results.some((r) => r.id === "aspirin"));
});

test("handleCdsRequest: GET /api/cds/search returns 422 problem when query is missing or empty", async () => {
  // Missing query parameter ?q
  const missingQReq = new Request("http://localhost/api/cds/search");
  const missingQRes = await handleCdsRequest(missingQReq);

  assert.equal(missingQRes.status, 422);
  assert.ok(missingQRes.headers.get("content-type")?.includes("application/problem+json"));
  const missingQProblem = (await missingQRes.json()) as ProblemDetails;
  assert.equal(missingQProblem.status, 422);
  assert.ok(missingQProblem.invalidParams?.some((p) => p.name === "q"));

  // Empty query parameter ?q=
  const emptyQReq = new Request("http://localhost/api/cds/search?q=");
  const emptyQRes = await handleCdsRequest(emptyQReq);

  assert.equal(emptyQRes.status, 422);
  assert.ok(emptyQRes.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: GET /api/cds/search returns 422 problem on invalid limit", async () => {
  const req = new Request("http://localhost/api/cds/search?q=warfarin&limit=invalid");
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 422);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: non-GET to /api/cds/search returns 405 Method Not Allowed", async () => {
  const req = jsonRequest("http://localhost/api/cds/search", "POST", {});
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 405);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: POST /api/cds/check performs multi-drug interaction check", async () => {
  ClinicalDecisionService.clearCaches();
  const req = jsonRequest("http://localhost/api/cds/check", "POST", {
    drugs: ["simvastatin", "clarithromycin"],
    host: { age: 65, scr: 1.2 },
  });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-type")?.includes("application/json"));

  const data = (await res.json()) as {
    meta: { cached: boolean; engine: string };
    summary: { totalFindings: number; highest: string };
    findings: Array<unknown>;
  };
  assert.ok(data.meta);
  assert.equal(data.meta.cached, false);
  assert.ok(data.summary.totalFindings > 0);
  assert.equal(data.summary.highest, "contraindicated");
});

test("handleCdsRequest: POST /api/cds/check caches identical queries", async () => {
  ClinicalDecisionService.clearCaches();
  const payload = {
    drugs: ["warfarin", "aspirin"],
  };

  const req1 = jsonRequest("http://localhost/api/cds/check", "POST", payload);
  const res1 = await handleCdsRequest(req1);
  assert.equal(res1.status, 200);
  const data1 = (await res1.json()) as { meta: { cached: boolean } };
  assert.equal(data1.meta.cached, false);

  const req2 = jsonRequest("http://localhost/api/cds/check", "POST", payload);
  const res2 = await handleCdsRequest(req2);
  assert.equal(res2.status, 200);
  const data2 = (await res2.json()) as { meta: { cached: boolean } };
  assert.equal(data2.meta.cached, true);
});

test("handleCdsRequest: POST /api/cds/check returns 422 on validation failure", async () => {
  // Empty drugs array
  const emptyDrugsReq = jsonRequest("http://localhost/api/cds/check", "POST", {
    drugs: [],
  });
  const emptyDrugsRes = await handleCdsRequest(emptyDrugsReq);
  assert.equal(emptyDrugsRes.status, 422);
  assert.ok(emptyDrugsRes.headers.get("content-type")?.includes("application/problem+json"));

  // Unknown request key
  const typoReq = jsonRequest("http://localhost/api/cds/check", "POST", {
    drugs: ["warfarin"],
    invalidKey: true,
  });
  const typoRes = await handleCdsRequest(typoReq);
  assert.equal(typoRes.status, 422);
  assert.ok(typoRes.headers.get("content-type")?.includes("application/problem+json"));

  // Contradicting kidney and egfr values
  const conflictReq = jsonRequest("http://localhost/api/cds/check", "POST", {
    drugs: ["warfarin"],
    host: { kidney: "moderate", egfr: 90 },
  });
  const conflictRes = await handleCdsRequest(conflictReq);
  assert.equal(conflictRes.status, 422);
  assert.ok(conflictRes.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: POST /api/cds/check returns 404 when no drugs resolve", async () => {
  ClinicalDecisionService.clearCaches();
  const req = jsonRequest("http://localhost/api/cds/check", "POST", {
    drugs: ["completely-fictional-drug-xyz-999"],
  });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 404);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));

  const problem = (await res.json()) as ProblemDetails;
  assert.equal(problem.status, 404);
  assert.equal(problem.title, "Not Found");
});

test("handleCdsRequest: POST /api/cds/check returns 400 on malformed JSON body", async () => {
  const req = new Request("http://localhost/api/cds/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json",
  });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 400);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));

  const problem = (await res.json()) as ProblemDetails;
  assert.equal(problem.status, 400);
  assert.equal(problem.title, "Bad Request");
});

test("handleCdsRequest: non-POST to /api/cds/check returns 405 Method Not Allowed", async () => {
  const req = new Request("http://localhost/api/cds/check", { method: "GET" });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 405);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: POST /api/cds/kinetics evaluates specialty kinetics stations", async () => {
  ClinicalDecisionService.clearCaches();
  const req = jsonRequest("http://localhost/api/cds/kinetics", "POST", {
    drugs: ["warfarin"],
    modules: ["anticoagulation"],
    host: { age: 60 },
  });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-type")?.includes("application/json"));

  const data = (await res.json()) as {
    meta: { engine: string };
    modules: { anticoagulation?: unknown };
  };
  assert.ok(data.meta);
  assert.ok(data.modules.anticoagulation !== undefined);
});

test("handleCdsRequest: POST /api/cds/kinetics returns 422 on validation failure", async () => {
  const req = jsonRequest("http://localhost/api/cds/kinetics", "POST", {
    drugs: ["warfarin"],
    modules: ["invalid-module-name-xyz"],
  });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 422);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));

  const problem = (await res.json()) as ProblemDetails;
  assert.equal(problem.status, 422);
});

test("handleCdsRequest: POST /api/cds/kinetics returns 404 when no drugs resolve", async () => {
  ClinicalDecisionService.clearCaches();
  const req = jsonRequest("http://localhost/api/cds/kinetics", "POST", {
    drugs: ["fictional-drug-xyz-123"],
    modules: ["anticoagulation"],
  });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 404);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: POST /api/cds/kinetics returns 400 on malformed JSON body", async () => {
  const req = new Request("http://localhost/api/cds/kinetics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not a json string at all",
  });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 400);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: non-POST to /api/cds/kinetics returns 405 Method Not Allowed", async () => {
  const req = new Request("http://localhost/api/cds/kinetics", { method: "GET" });
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 405);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
});

test("handleCdsRequest: returns 404 problem details for unmapped routes", async () => {
  const req = new Request("http://localhost/api/cds/nonexistent-route");
  const res = await handleCdsRequest(req);

  assert.equal(res.status, 404);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));

  const problem = (await res.json()) as ProblemDetails;
  assert.equal(problem.status, 404);
  assert.equal(problem.title, "Not Found");
});

test("handleCdsRequest: handles internal exceptions gracefully with 500 problem details", async () => {
  // Passing a request whose url throws upon processing
  const badReq = {
    get url(): string {
      throw new Error("Simulated unexpected request failure");
    },
    method: "GET",
  } as unknown as Request;

  const res = await handleCdsRequest(badReq);
  assert.equal(res.status, 500);
  assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));

  const problem = (await res.json()) as ProblemDetails;
  assert.equal(problem.status, 500);
  assert.equal(problem.title, "Internal Server Error");
});
