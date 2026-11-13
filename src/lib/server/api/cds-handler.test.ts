import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleCdsRequest,
  readBoundedCdsBody,
  CDS_MODULES_COUNT,
  CDS_SECURITY_HEADERS,
  MAX_CDS_BODY_BYTES,
  TOO_MANY_ITEMS,
  type CdsHealthResponse,
} from "./cds-handler.server";
import { resetApiMeters } from "./api-access.server";
import { ClinicalDecisionService, STATUTORY_CDS_DISCLAIMER } from "./cds-service";
import { API_LIMITS } from "../../billing/api-tiers";
import { SOFTWARE } from "../../regulatory";
import { setThrottleStore } from "../throttle-store";
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

test("handleCdsRequest: refuses oversized check and kinetics bodies before validating them", async () => {
  for (const path of ["/api/cds/check", "/api/cds/kinetics"]) {
    const started = Date.now();
    const res = await handleCdsRequest(
      jsonRequest(`http://localhost${path}`, "POST", `{"drugs":[${"1,".repeat(1_999_999)}1]}`),
    );
    assert.equal(res.status, 400);
    const problem = (await res.json()) as ProblemDetails;
    assert.equal(problem.detail, TOO_MANY_ITEMS);
    assert.ok(Date.now() - started < 3_000, `${path} answered without walking every element`);
  }
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

function assertSecurityHeaders(res: Response, context: string): void {
  for (const [name, expected] of Object.entries(CDS_SECURITY_HEADERS)) {
    assert.equal(
      res.headers.get(name),
      expected,
      `${context}: expected header ${name} = ${expected}`,
    );
  }
}

function syntheticPostRequest(
  url: string,
  headers: Record<string, string>,
  body: ReadableStream<Uint8Array> | null = null,
): Request {
  return {
    url,
    method: "POST",
    headers: new Headers(headers),
    body,
  } as unknown as Request;
}

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

test("CDS security headers: present on 200, 400, 404, 405, 413, 415, 422, and 500 responses", async () => {
  assert.equal(MAX_CDS_BODY_BYTES, 10 * 1024 * 1024);

  const okHealth = await handleCdsRequest(new Request("http://localhost/api/cds/health"));
  assert.equal(okHealth.status, 200);
  assertSecurityHeaders(okHealth, "200 /api/cds/health");

  const okSearch = await handleCdsRequest(
    new Request("http://localhost/api/cds/search?q=warfarin&limit=1"),
  );
  assert.equal(okSearch.status, 200);
  assertSecurityHeaders(okSearch, "200 /api/cds/search");

  const okCheck = await handleCdsRequest(
    jsonRequest("http://localhost/api/cds/check", "POST", { drugs: ["warfarin", "fluconazole"] }),
  );
  assert.equal(okCheck.status, 200);
  assertSecurityHeaders(okCheck, "200 /api/cds/check");

  const badJson = await handleCdsRequest(
    new Request("http://localhost/api/cds/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    }),
  );
  assert.equal(badJson.status, 400);
  assertSecurityHeaders(badJson, "400 malformed JSON");

  const unprocessable = await handleCdsRequest(
    jsonRequest("http://localhost/api/cds/check", "POST", {}),
  );
  assert.equal(unprocessable.status, 422);
  assertSecurityHeaders(unprocessable, "422 validation failure");

  const notFound = await handleCdsRequest(new Request("http://localhost/api/cds/missing-route"));
  assert.equal(notFound.status, 404);
  assertSecurityHeaders(notFound, "404 missing route");

  const methodNotAllowed = await handleCdsRequest(
    new Request("http://localhost/api/cds/health", { method: "DELETE" }),
  );
  assert.equal(methodNotAllowed.status, 405);
  assertSecurityHeaders(methodNotAllowed, "405 method not allowed");

  const tooLarge = await handleCdsRequest(
    syntheticPostRequest("http://localhost/api/cds/check", {
      "Content-Type": "application/json",
      "Content-Length": String(MAX_CDS_BODY_BYTES + 1),
    }),
  );
  assert.equal(tooLarge.status, 413);
  assertSecurityHeaders(tooLarge, "413 payload too large");

  const unsupportedType = await handleCdsRequest(
    new Request("http://localhost/api/cds/check", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ drugs: ["warfarin"] }),
    }),
  );
  assert.equal(unsupportedType.status, 415);
  assertSecurityHeaders(unsupportedType, "415 unsupported media type");

  const internalErr = await handleCdsRequest({
    get url(): string {
      throw new Error("Simulated unexpected failure");
    },
    method: "GET",
  } as unknown as Request);
  assert.equal(internalErr.status, 500);
  assertSecurityHeaders(internalErr, "500 internal error");
});

test("handleCdsRequest: 405 Method Not Allowed emits exact route Allow headers", async () => {
  const getOnlyRoutes = ["/api/cds/health", "/api/cds/search"];
  for (const path of getOnlyRoutes) {
    for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
      const res = await handleCdsRequest(new Request(`http://localhost${path}`, { method }));
      assert.equal(res.status, 405, `${method} ${path}`);
      assert.equal(res.headers.get("allow"), "GET", `${method} ${path} Allow header`);
      assertSecurityHeaders(res, `405 ${method} ${path}`);
      const problem = (await res.json()) as ProblemDetails;
      assert.equal(problem.type, "https://firstpass.app/errors/method-not-allowed");
      assert.equal(problem.instance, path);
    }
  }

  const postOnlyRoutes = ["/api/cds/check", "/api/cds/kinetics"];
  for (const path of postOnlyRoutes) {
    for (const method of ["GET", "PUT", "DELETE", "OPTIONS"]) {
      const res = await handleCdsRequest(new Request(`http://localhost${path}`, { method }));
      assert.equal(res.status, 405, `${method} ${path}`);
      assert.equal(res.headers.get("allow"), "POST", `${method} ${path} Allow header`);
      assertSecurityHeaders(res, `405 ${method} ${path}`);
      const problem = (await res.json()) as ProblemDetails;
      assert.equal(problem.type, "https://firstpass.app/errors/method-not-allowed");
      assert.equal(problem.instance, path);
    }
  }
});

test("handleCdsRequest: enforces 415 Unsupported Media Type while permitting JSON subtypes and omitted headers", async () => {
  const rejectedTypes = [
    "text/plain",
    "application/x-www-form-urlencoded",
    "multipart/form-data; boundary=----firstpass",
    "application/xml",
  ];
  for (const contentType of rejectedTypes) {
    for (const path of ["/api/cds/check", "/api/cds/kinetics"]) {
      const res = await handleCdsRequest(
        new Request(`http://localhost${path}`, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: JSON.stringify({ drugs: ["warfarin"] }),
        }),
      );
      assert.equal(res.status, 415, `${contentType} -> ${path}`);
      assert.ok(res.headers.get("content-type")?.includes("application/problem+json"));
      assertSecurityHeaders(res, `415 ${contentType} ${path}`);
      const problem = (await res.json()) as ProblemDetails;
      assert.equal(problem.status, 415);
      assert.equal(problem.title, "Unsupported Media Type");
      assert.equal(problem.type, "https://firstpass.app/errors/unsupported-media-type");
      assert.equal(problem.instance, path);
    }
  }

  // application/json with charset and structured +json media types succeed
  for (const contentType of [
    "application/json; charset=utf-8",
    "application/ld+json; charset=utf-8",
  ]) {
    const res = await handleCdsRequest(
      new Request("http://localhost/api/cds/check", {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: JSON.stringify({ drugs: ["warfarin", "fluconazole"] }),
      }),
    );
    assert.equal(res.status, 200, `${contentType} should be accepted`);
    assertSecurityHeaders(res, `200 ${contentType}`);
  }

  // POST without a Content-Type header uses raw binary/stream without Fetch auto text/plain
  const rawJsonBytes = new TextEncoder().encode(JSON.stringify({ drugs: ["warfarin", "fluconazole"] }));
  const omittedCt = await handleCdsRequest(
    syntheticPostRequest("http://localhost/api/cds/check", {}, streamFromChunks([rawJsonBytes])),
  );
  assert.equal(omittedCt.status, 200);
  assertSecurityHeaders(omittedCt, "200 omitted Content-Type");
});

test("readBoundedCdsBody & handleCdsRequest: enforce 10 MiB Content-Length and streaming caps and reject malformed Content-Length", async () => {
  // Declared Content-Length > MAX_CDS_BODY_BYTES -> 413 Payload Too Large before stream read
  let canceled = false;
  const mockBody = new ReadableStream<Uint8Array>({
    pull() {
      // Never read if declared Content-Length fails first
    },
    cancel() {
      canceled = true;
    },
  });
  const declaredTooLarge = await handleCdsRequest(
    syntheticPostRequest(
      "http://localhost/api/cds/check",
      {
        "Content-Type": "application/json",
        "Content-Length": String(MAX_CDS_BODY_BYTES + 1),
      },
      mockBody,
    ),
  );
  assert.equal(declaredTooLarge.status, 413);
  assert.equal(canceled, true, "oversized body stream should be canceled immediately");
  assertSecurityHeaders(declaredTooLarge, "413 declared Content-Length");
  const problem413 = (await declaredTooLarge.json()) as ProblemDetails;
  assert.equal(problem413.status, 413);
  assert.equal(problem413.type, "https://firstpass.app/errors/payload-too-large");

  // Streaming chunk cap (without Content-Length) cancels reader when cumulative bytes exceed maxBytes
  let streamCanceled = false;
  let pulls = 0;
  const oversizedStream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls++;
      controller.enqueue(new Uint8Array(64).fill(97));
    },
    cancel() {
      streamCanceled = true;
    },
  });
  const streamRes = await readBoundedCdsBody(
    syntheticPostRequest("http://localhost/api/cds/kinetics", {}, oversizedStream),
    100,
  );
  assert.deepEqual(streamRes, { ok: false, reason: "too-large" });
  assert.equal(streamCanceled, true);
  assert.ok(pulls <= 3);

  // Within custom cap decodes UTF-8 across chunks cleanly
  const encoder = new TextEncoder();
  const validStream = streamFromChunks([
    encoder.encode('{"drugs":['),
    encoder.encode('"warfarin","fluconazole"]}'),
  ]);
  const okRead = await readBoundedCdsBody(
    syntheticPostRequest("http://localhost/api/cds/check", {}, validStream),
    256,
  );
  assert.deepEqual(okRead, { ok: true, text: '{"drugs":["warfarin","fluconazole"]}' });

  // Malformed Content-Length values -> 400 Bad Request
  for (const badLen of ["-1", "12.5", "not-a-number", "12 bytes"]) {
    const direct = await readBoundedCdsBody(
      syntheticPostRequest("http://localhost/api/cds/check", { "Content-Length": badLen }),
    );
    assert.deepEqual(direct, { ok: false, reason: "invalid-content-length" }, badLen);

    const httpRes = await handleCdsRequest(
      syntheticPostRequest("http://localhost/api/cds/check", {
        "Content-Type": "application/json",
        "Content-Length": badLen,
      }),
    );
    assert.equal(httpRes.status, 400, badLen);
    assertSecurityHeaders(httpRes, `400 invalid Content-Length (${badLen})`);
    const problem = (await httpRes.json()) as ProblemDetails;
    assert.equal(problem.detail, "Invalid Content-Length header.");
  }
});

test("handleCdsRequest: attaches CDS_SECURITY_HEADERS on 401 Unauthorized and 429 Too Many Requests", async () => {
  const prevVercel = process.env.VERCEL;
  process.env.VERCEL = "1";
  setThrottleStore(null);
  resetApiMeters();

  try {
    // 401 Unauthorized on malformed API key
    const res401 = await handleCdsRequest(
      new Request("http://localhost/api/cds/search?q=warfarin", {
        headers: { "x-real-ip": "198.51.100.77", "x-api-key": "invalid-key" },
      }),
    );
    assert.equal(res401.status, 401);
    assertSecurityHeaders(res401, "401 unauthorized");

    // Exhaust anonymous per-minute limit from an isolated test IP -> 429 Too Many Requests
    const testIp = "198.51.100.88";
    for (let i = 0; i < API_LIMITS.anonymous.max; i++) {
      const ok = await handleCdsRequest(
        new Request("http://localhost/api/cds/search?q=warfarin&limit=1", {
          headers: { "x-real-ip": testIp },
        }),
      );
      assert.equal(ok.status, 200, `anonymous call #${i + 1}`);
      assertSecurityHeaders(ok, `200 metered #${i + 1}`);
    }

    const res429 = await handleCdsRequest(
      new Request("http://localhost/api/cds/search?q=warfarin&limit=1", {
        headers: { "x-real-ip": testIp },
      }),
    );
    assert.equal(res429.status, 429);
    assert.ok(res429.headers.get("retry-after"));
    assertSecurityHeaders(res429, "429 too many requests");
  } finally {
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    setThrottleStore(undefined);
    resetApiMeters();
  }
});

// ---- round 7: /api/cds/analyze and /api/cds/autocomplete

async function analyzeCall(body: unknown) {
  resetApiMeters();
  return handleCdsRequest(jsonRequest("http://localhost/api/cds/analyze", "POST", body));
}

type AnalyzeBody = {
  meta: { cached: boolean };
  warnings: Array<{ code: string; detail: string }>;
  data: {
    substances: Array<{ rawInput: string; canonicalName: string; ingestionTimeHoursAgo?: number }>;
    pairwiseInteractions: Array<{ pairIds: [string, string] }>;
    metadata: { cached: boolean };
  };
};

const distinctPairs = (body: AnalyzeBody) =>
  new Set(body.data.pairwiseInteractions.map((r) => r.pairIds.join("|"))).size;

test("POST /api/cds/analyze: street name, brand and name resolve, and the street name is warned", async () => {
  ClinicalDecisionService.clearCaches();
  const res = await analyzeCall({ substances: ["Molly", "Zoloft", "Alcohol"] });
  assert.equal(res.status, 200);
  const body = (await res.json()) as AnalyzeBody;
  assert.deepEqual(
    body.data.substances.map((s) => s.canonicalName),
    ["MDMA", "Sertraline", "Ethanol"],
  );
  assert.deepEqual(
    body.data.substances.map((s) => s.rawInput),
    ["Molly", "Zoloft", "Alcohol"],
  );
  const warning = body.warnings.find((w) => w.code === "street-name-resolved");
  assert.ok(warning && /Molly/.test(warning.detail));
});

test("POST /api/cds/analyze: 3, 4 and 5 substances give 3, 6 and 10 distinct pairs", async () => {
  const trays = [
    ["warfarin", "aspirin", "sertraline"],
    ["warfarin", "aspirin", "sertraline", "fluoxetine"],
    ["warfarin", "aspirin", "sertraline", "fluoxetine", "tramadol"],
  ];
  const counts: number[] = [];
  for (const substances of trays) {
    const res = await analyzeCall({ substances });
    assert.equal(res.status, 200);
    counts.push(distinctPairs((await res.json()) as AnalyzeBody));
  }
  assert.deepEqual(counts, [3, 6, 10]);
});

test("POST /api/cds/analyze: hours are carried, and bad input is refused", async () => {
  const ok = await analyzeCall({
    substances: [{ name: "mdma", ingestionTimeHoursAgo: 8 }, "alprazolam"],
  });
  assert.equal(ok.status, 200);
  assert.equal(((await ok.json()) as AnalyzeBody).data.substances[0]!.ingestionTimeHoursAgo, 8);

  for (const hours of [-1, 721]) {
    const res = await analyzeCall({ substances: [{ name: "mdma", ingestionTimeHoursAgo: hours }, "ethanol"] });
    assert.equal(res.status, 422, String(hours));
  }
  const many = await analyzeCall({ substances: Array.from({ length: 21 }, () => "ethanol") });
  assert.equal(many.status, 422);
  const none = await analyzeCall({ substances: ["not-a-real-drug-xyz"] });
  assert.equal(none.status, 404);
  const wrong = await handleCdsRequest(new Request("http://localhost/api/cds/analyze"));
  assert.equal(wrong.status, 405);
  assert.equal(wrong.headers.get("allow"), "POST");
});

test("POST /api/cds/analyze: reports cached truthfully and names unresolved items", async () => {
  ClinicalDecisionService.clearCaches();
  const first = (await (await analyzeCall({ substances: ["mdma", "ethanol", "zzz-unknown"] })).json()) as AnalyzeBody;
  assert.equal(first.meta.cached, false);
  assert.equal(first.data.metadata.cached, false);
  assert.ok(first.warnings.some((w) => w.code === "drugs-unresolved"));
  const second = (await (await analyzeCall({ substances: ["mdma", "ethanol", "zzz-unknown"] })).json()) as AnalyzeBody;
  assert.equal(second.meta.cached, true);
  assert.equal(second.data.metadata.cached, true);
});

test("GET /api/cds/autocomplete: answers, caps the limit, and serves repeats from cache", async () => {
  ClinicalDecisionService.clearCaches();
  const get = (qs: string) => {
    resetApiMeters();
    return handleCdsRequest(new Request(`http://localhost/api/cds/autocomplete${qs}`));
  };
  type Auto = {
    meta: { cached: boolean };
    data: Array<{ id: string; canonicalName: string; matchedBy: string; resolvedFrom?: string }>;
  };
  const first = (await (await get("?q=zoloft")).json()) as Auto;
  assert.equal(first.meta.cached, false);
  const zoloft = first.data.find((s) => s.id === "sertraline");
  assert.ok(zoloft);
  assert.equal(zoloft.matchedBy, "brand-or-alias");
  assert.match(zoloft.resolvedFrom ?? "", /zoloft/i);
  const again = (await (await get("?q=zoloft")).json()) as Auto;
  assert.equal(again.meta.cached, true);

  const capped = (await (await get("?q=a&limit=24")).json()) as Auto;
  assert.ok(capped.data.length <= 24);
  assert.equal((await get("?q=a&limit=25")).status, 422);
  assert.equal((await get("")).status, 422);
  const post = await handleCdsRequest(jsonRequest("http://localhost/api/cds/autocomplete", "POST", {}));
  assert.equal(post.status, 405);
});

test("GET /api/cds/autocomplete: a street name carries resolvedFrom", async () => {
  resetApiMeters();
  const res = await handleCdsRequest(new Request("http://localhost/api/cds/autocomplete?q=molly"));
  const body = (await res.json()) as { data: Array<{ id: string; matchedBy: string; resolvedFrom?: string }> };
  const mdma = body.data.find((s) => s.id === "mdma");
  assert.ok(mdma, "Molly should suggest MDMA (needs STREET_NAMES)");
  assert.equal(mdma.matchedBy, "street-name");
  assert.equal(mdma.resolvedFrom?.toLowerCase(), "molly");
});
