import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  SignJWT,
  createLocalJWKSet,
  decodeProtectedHeader,
  exportJWK,
  generateKeyPair,
  jwtVerify,
  type CryptoKey,
  type JWK,
} from "jose";
import { setLogSink } from "@/lib/server/log";
import { pairPages } from "@/lib/seo/pair-pages";
import { COURSE_KIT_MODULES } from "@/lib/seo/course-kit";
import { Route as LtiRoute } from "@/routes/api/lti/$";
import {
  CLAIM,
  DEFAULT_TARGET_PATHS,
  canvasConfig,
  checkReturnUrl,
  decodeStateCookie,
  encodeStateCookie,
  escapeHtml,
  hasLtiControlChar,
  isSafeAllowPath,
  parsePlatforms,
  readDeepLinkSettings,
  resolveLaunchTarget,
  resolveTarget,
  stateCookieName,
  targetAllowlist,
  toolJwks,
  type LtiPlatform,
} from "./lti";
import {
  PICKER_TTL_SECONDS,
  handleLaunch,
  handleLogin,
  handleLtiRequest,
  resetLtiState,
  type LtiDeps,
} from "./lti.server";
import { RETURN_SCRIPT } from "./picker";

const ORIGIN = "https://firstpass.test";
const PLATFORM: LtiPlatform = {
  issuer: "https://canvas.instructure.com",
  client_id: "10000000000001",
  auth_endpoint: "https://sso.canvaslms.com/api/lti/authorize_redirect",
  jwks_uri: "https://sso.canvaslms.com/api/lti/security/jwks",
  deployment_ids: ["dep-1"],
};

const logs: string[] = [];
setLogSink((_level, line) => logs.push(line));

type Keys = { privateKey: CryptoKey; jwk: JWK };
let platformKey: Keys;
let otherKey: Keys;

async function makeKeys(kid: string): Promise<Keys> {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" };
  return { privateKey, jwk };
}

function baseEnv(extra: Record<string, string> = {}): Record<string, string> {
  return { LTI_ENABLED: "1", LTI_PLATFORMS: JSON.stringify([PLATFORM]), ...extra };
}

function deps(envVars: Record<string, string> = baseEnv()): LtiDeps {
  return {
    env: (k) => envVars[k],
    keyResolver: () => createLocalJWKSet({ keys: [platformKey.jwk] }),
    clientKey: () => "shared",
  };
}

async function login(params: Record<string, string>, d = deps(), method: "GET" | "POST" = "GET") {
  const qs = new URLSearchParams(params);
  const req =
    method === "GET"
      ? new Request(`${ORIGIN}/api/lti/login?${qs}`)
      : new Request(`${ORIGIN}/api/lti/login`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: qs.toString(),
        });
  return handleLtiRequest(req, d);
}

const LOGIN_PARAMS = {
  iss: PLATFORM.issuer,
  login_hint: "opaque-hint",
  target_link_uri: `${ORIGIN}/api/lti/launch`,
  client_id: PLATFORM.client_id,
  lti_message_hint: "opaque-message",
};

/** Runs a login and returns the state, nonce and the Cookie header the browser would send back. */
async function startLogin(d = deps()) {
  const res = await login(LOGIN_PARAMS, d);
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get("location")!);
  const state = loc.searchParams.get("state")!;
  const nonce = loc.searchParams.get("nonce")!;
  const setCookie = res.headers.get("set-cookie")!;
  const cookie = setCookie.split(";")[0]!;
  return { res, loc, state, nonce, setCookie, cookie };
}

function claims(nonce: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nonce,
    [CLAIM.messageType]: "LtiResourceLinkRequest",
    [CLAIM.version]: "1.3.0",
    [CLAIM.deploymentId]: "dep-1",
    [CLAIM.targetLinkUri]: `${ORIGIN}/api/lti/launch`,
    [CLAIM.resourceLink]: { id: "rl-1" },
    ...over,
  };
}

type SignOpts = {
  iss?: string;
  aud?: string | string[];
  key?: Keys;
  expSecondsFromNow?: number;
  iat?: number;
  alg?: string;
};

async function sign(payload: Record<string, unknown>, o: SignOpts = {}) {
  const key = o.key ?? platformKey;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: o.alg ?? "RS256", kid: key.jwk.kid })
    .setIssuer(o.iss ?? PLATFORM.issuer)
    .setAudience(o.aud ?? PLATFORM.client_id)
    .setSubject("anon-sub")
    .setIssuedAt(o.iat ?? now)
    .setExpirationTime(now + (o.expSecondsFromNow ?? 300))
    .sign(key.privateKey);
}

async function launch(form: Record<string, string>, cookie: string | null, d = deps()) {
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" };
  if (cookie) headers.cookie = cookie;
  return handleLtiRequest(
    new Request(`${ORIGIN}/api/lti/launch`, {
      method: "POST",
      headers,
      body: new URLSearchParams(form).toString(),
    }),
    d,
  );
}

beforeEach(async () => {
  resetLtiState();
  logs.length = 0;
  platformKey ??= await makeKeys("platform-key");
  otherKey ??= await makeKeys("other-key");
});

describe("LTI off by default", () => {
  for (const flag of [undefined, "", "0", "true", "yes", "on", " 1x"]) {
    it(`every endpoint is 404 with LTI_ENABLED=${JSON.stringify(flag)}`, async () => {
      const envVars = baseEnv();
      if (flag === undefined) delete (envVars as Record<string, string | undefined>).LTI_ENABLED;
      else envVars.LTI_ENABLED = flag;
      for (const [method, path] of [
        ["GET", "/api/lti/login"],
        ["POST", "/api/lti/login"],
        ["POST", "/api/lti/launch"],
        ["POST", "/api/lti/deep-link"],
        ["GET", "/api/lti/jwks"],
        ["GET", "/api/lti/config"],
        ["GET", "/api/lti/anything"],
      ] as const) {
        const res = await handleLtiRequest(
          new Request(`${ORIGIN}${path}`, { method }),
          deps(envVars),
        );
        assert.equal(res.status, 404, `${method} ${path}`);
      }
    });
  }

  it("unknown paths are 404 and wrong methods 405 when on", async () => {
    assert.equal(
      (await handleLtiRequest(new Request(`${ORIGIN}/api/lti/nope`), deps())).status,
      404,
    );
    const res = await handleLtiRequest(new Request(`${ORIGIN}/api/lti/launch`), deps());
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("allow"), "POST");
  });

  it("route handlers dispatch PUT/DELETE/PATCH/OPTIONS cleanly when off and on", async () => {
    const handlers = LtiRoute.options.server?.handlers as
      | Partial<
          Record<
            "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS",
            (ctx: { request: Request }) => Promise<Response>
          >
        >
      | undefined;
    assert.ok(handlers);
    for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"] as const) {
      assert.equal(typeof handlers[method], "function", `${method} handler registered`);
    }

    const prevEnabled = process.env.LTI_ENABLED;
    try {
      delete process.env.LTI_ENABLED;
      for (const flag of [undefined, "0"] as const) {
        if (flag === undefined) delete process.env.LTI_ENABLED;
        else process.env.LTI_ENABLED = flag;
        for (const method of ["PUT", "DELETE", "PATCH", "OPTIONS"] as const) {
          for (const path of [
            "/api/lti/login",
            "/api/lti/launch",
            "/api/lti/jwks",
            "/api/lti/config",
            "/api/lti/nope",
          ]) {
            const res = await handlers[method]!({
              request: new Request(`${ORIGIN}${path}`, { method }),
            });
            assert.equal(res.status, 404, `off(${flag}) ${method} ${path}`);
            assert.equal(res.headers.get("cache-control"), "no-store");
          }
        }
      }

      process.env.LTI_ENABLED = "1";
      const expectedAllow: Record<string, string> = {
        "/api/lti/login": "GET, POST",
        "/api/lti/launch": "POST",
        "/api/lti/jwks": "GET",
        "/api/lti/config": "GET",
      };
      for (const method of ["PUT", "DELETE", "PATCH", "OPTIONS"] as const) {
        for (const [path, allow] of Object.entries(expectedAllow)) {
          const res = await handlers[method]!({
            request: new Request(`${ORIGIN}${path}`, { method }),
          });
          assert.equal(res.status, 405, `on ${method} ${path}`);
          assert.equal(res.headers.get("allow"), allow, `allow ${method} ${path}`);
          assert.equal(res.headers.get("cache-control"), "no-store");
        }
        const unknown = await handlers[method]!({
          request: new Request(`${ORIGIN}/api/lti/unknown`, { method }),
        });
        assert.equal(unknown.status, 404, `on ${method} unknown`);
        assert.equal(unknown.headers.get("cache-control"), "no-store");
      }
    } finally {
      if (prevEnabled === undefined) delete process.env.LTI_ENABLED;
      else process.env.LTI_ENABLED = prevEnabled;
    }
  });
});

describe("platform config", () => {
  it("parses a valid list", () => {
    const r = parsePlatforms(JSON.stringify([PLATFORM]));
    assert.ok(r.ok);
  });

  it("rejects bad config without echoing values", () => {
    for (const raw of [
      undefined,
      "not json",
      "[]",
      JSON.stringify([{ ...PLATFORM, auth_endpoint: "http://insecure.example/auth" }]),
      JSON.stringify([{ ...PLATFORM, deployment_ids: [] }]),
      JSON.stringify([{ ...PLATFORM, client_id: "" }]),
      JSON.stringify([PLATFORM, PLATFORM]),
    ]) {
      const r = parsePlatforms(raw);
      assert.equal(r.ok, false, String(raw));
      assert.deepEqual(Object.keys(r), ["ok", "issues"]);
    }
  });

  it("bad LTI_PLATFORMS answers 500 with no secrets in the body or logs", async () => {
    const secretish = "super-secret-client-id";
    const envVars = baseEnv({
      LTI_PLATFORMS: JSON.stringify([{ ...PLATFORM, client_id: secretish, jwks_uri: "ftp://x" }]),
    });
    const res = await login(LOGIN_PARAMS, deps(envVars));
    assert.equal(res.status, 500);
    const body = await res.text();
    assert.ok(!body.includes(secretish));
    assert.ok(logs.every((l) => !l.includes(secretish)));
    assert.ok(logs.some((l) => l.includes("lti.config_invalid")));
  });
});

describe("login initiation", () => {
  it("redirects to the platform with the OIDC parameters and sets the state cookie", async () => {
    const { loc, state, nonce, setCookie } = await startLogin();
    assert.equal(`${loc.origin}${loc.pathname}`, PLATFORM.auth_endpoint);
    const p = loc.searchParams;
    assert.equal(p.get("scope"), "openid");
    assert.equal(p.get("response_type"), "id_token");
    assert.equal(p.get("response_mode"), "form_post");
    assert.equal(p.get("prompt"), "none");
    assert.equal(p.get("client_id"), PLATFORM.client_id);
    assert.equal(p.get("redirect_uri"), `${ORIGIN}/api/lti/launch`);
    assert.equal(p.get("login_hint"), "opaque-hint");
    assert.equal(p.get("lti_message_hint"), "opaque-message");
    assert.match(state, /^[A-Za-z0-9_-]{43}$/);
    assert.match(nonce, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(state, nonce);

    assert.ok(setCookie.startsWith(`${stateCookieName(state)}=`));
    for (const attr of ["HttpOnly", "Secure", "SameSite=None", "Path=/api/lti", "Max-Age=600"]) {
      assert.ok(setCookie.includes(attr), attr);
    }
    const value = decodeStateCookie(setCookie.split(";")[0]!.split("=")[1]);
    assert.deepEqual(value, { nonce, issuer: PLATFORM.issuer, clientId: PLATFORM.client_id });
  });

  it("accepts a form POST too", async () => {
    const res = await login(LOGIN_PARAMS, deps(), "POST");
    assert.equal(res.status, 302);
  });

  it("omits lti_message_hint when absent and finds the platform by issuer without client_id", async () => {
    const { lti_message_hint: _h, client_id: _c, ...rest } = LOGIN_PARAMS;
    const res = await login(rest);
    assert.equal(res.status, 302);
    const loc = new URL(res.headers.get("location")!);
    assert.equal(loc.searchParams.get("lti_message_hint"), null);
    assert.equal(loc.searchParams.get("client_id"), PLATFORM.client_id);
  });

  it("rejects an unknown issuer, client id, missing params and an off-site target_link_uri", async () => {
    assert.equal((await login({ ...LOGIN_PARAMS, iss: "https://evil.example" })).status, 400);
    assert.equal((await login({ ...LOGIN_PARAMS, client_id: "nope" })).status, 400);
    const { login_hint: _l, ...noHint } = LOGIN_PARAMS;
    assert.equal((await login(noHint)).status, 400);
    assert.equal(
      (await login({ ...LOGIN_PARAMS, target_link_uri: "https://evil.example/api/lti/launch" }))
        .status,
      400,
    );
    assert.equal((await login({ ...LOGIN_PARAMS, target_link_uri: "not a url" })).status, 400);
  });

  it("rate limits one client and never refuses the shared key", async () => {
    const limited = { ...deps(), clientKey: () => "203.0.113.9" };
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await login(LOGIN_PARAMS, limited)).status;
    assert.equal(last, 429);
    for (let i = 0; i < 40; i++) assert.equal((await login(LOGIN_PARAMS)).status, 302);
  });

  it("rejects C0 and C1 control characters in login parameters", async () => {
    const fields = ["login_hint", "lti_message_hint", "iss", "client_id", "target_link_uri"] as const;
    for (const field of fields) {
      for (const ctrl of ["\r", "\n", "\u0085", "\u0000", "\x7f", "\u009f"]) {
        const variants = [`${LOGIN_PARAMS[field]}${ctrl}`, `a${ctrl}b`];
        for (const bad of variants) {
          const params = new URLSearchParams({ ...LOGIN_PARAMS, [field]: bad });
          const getRes = await handleLogin(
            new Request(`${ORIGIN}/api/lti/login?${params}`),
            deps(),
          );
          assert.equal(getRes.status, 400, `GET ${field} ctrl=${JSON.stringify(ctrl)}`);
          assert.equal(getRes.headers.get("location"), null);
          assert.equal(getRes.headers.get("cache-control"), "no-store");

          const postRes = await handleLogin(
            new Request(`${ORIGIN}/api/lti/login`, {
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              body: params.toString(),
            }),
            deps(),
          );
          assert.equal(postRes.status, 400, `POST ${field} ctrl=${JSON.stringify(ctrl)}`);
          assert.equal(postRes.headers.get("location"), null);
          assert.equal(postRes.headers.get("cache-control"), "no-store");
        }
      }
    }
  });
});

describe("launch", () => {
  it("happy path: verifies and redirects (303) to the desk, clearing the state cookie", async () => {
    const { state, nonce, cookie } = await startLogin();
    const res = await launch({ state, id_token: await sign(claims(nonce)) }, cookie);
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), `${ORIGIN}/`);
    assert.match(res.headers.get("set-cookie")!, /Max-Age=0/);
    assert.equal(res.headers.get("cache-control"), "no-store");
  });

  it("opens an allowlisted page from the firstpass_path custom field or the target_link_uri", async () => {
    let s = await startLogin();
    let res = await launch(
      {
        state: s.state,
        id_token: await sign(claims(s.nonce, { [CLAIM.custom]: { firstpass_path: "/practice" } })),
      },
      s.cookie,
    );
    assert.equal(res.headers.get("location"), `${ORIGIN}/practice`);

    s = await startLogin();
    res = await launch(
      {
        state: s.state,
        id_token: await sign(claims(s.nonce, { [CLAIM.targetLinkUri]: `${ORIGIN}/pairs?x=1#y` })),
      },
      s.cookie,
    );
    assert.equal(res.headers.get("location"), `${ORIGIN}/pairs`);

    s = await startLogin();
    res = await launch(
      {
        state: s.state,
        id_token: await sign(
          claims(s.nonce, { [CLAIM.custom]: { firstpass_path: "/for-programs/course-kit" } }),
        ),
      },
      s.cookie,
    );
    assert.equal(res.headers.get("location"), `${ORIGIN}/for-programs/course-kit`);
  });

  it("rejects open redirects and pages off the allowlist", async () => {
    for (const target of [
      "https://evil.example/",
      "//evil.example/x",
      "/\\evil.example",
      "/api/stats",
      "/drug/warfarin",
      "/practice/../api/stats",
    ]) {
      const s = await startLogin();
      const res = await launch(
        {
          state: s.state,
          id_token: await sign(claims(s.nonce, { [CLAIM.custom]: { firstpass_path: target } })),
        },
        s.cookie,
      );
      assert.equal(res.status, 400, target);
      assert.equal(res.headers.get("location"), null, target);
    }
  });

  it("rejects a missing or mismatched state cookie", async () => {
    const s = await startLogin();
    const token = await sign(claims(s.nonce));
    assert.equal((await launch({ state: s.state, id_token: token }, null)).status, 401);
    const other = await startLogin();
    assert.equal((await launch({ state: s.state, id_token: token }, other.cookie)).status, 401);
    assert.equal((await launch({ state: "short", id_token: token }, s.cookie)).status, 400);
  });

  it("rejects a nonce mismatch and a replayed token", async () => {
    let s = await startLogin();
    assert.equal(
      (await launch({ state: s.state, id_token: await sign(claims("x".repeat(43))) }, s.cookie))
        .status,
      401,
    );

    s = await startLogin();
    const token = await sign(claims(s.nonce));
    assert.equal((await launch({ state: s.state, id_token: token }, s.cookie)).status, 303);
    const again = await launch({ state: s.state, id_token: token }, s.cookie);
    assert.equal(again.status, 401);
    assert.match(await again.text(), /already used/);
  });

  it("rejects bad aud, iss, azp, signature, alg and an expired token", async () => {
    const cases: [string, (n: string) => Promise<string>][] = [
      ["aud", (n) => sign(claims(n), { aud: "someone-else" })],
      ["iss", (n) => sign(claims(n), { iss: "https://evil.example" })],
      [
        "azp",
        (n) =>
          sign(claims(n, { azp: "someone-else" }), { aud: [PLATFORM.client_id, "someone-else"] }),
      ],
      [
        "multi-aud without azp",
        (n) => sign(claims(n), { aud: [PLATFORM.client_id, "someone-else"] }),
      ],
      ["signature", (n) => sign(claims(n), { key: otherKey })],
      [
        "expired",
        (n) =>
          sign(claims(n), { expSecondsFromNow: -600, iat: Math.floor(Date.now() / 1000) - 900 }),
      ],
      ["too old", (n) => sign(claims(n), { iat: Math.floor(Date.now() / 1000) - 3600 })],
    ];
    for (const [name, make] of cases) {
      const s = await startLogin();
      const res = await launch({ state: s.state, id_token: await make(s.nonce) }, s.cookie);
      assert.equal(res.status, 401, name);
    }
    // alg none / HS256 tokens are refused as well.
    const s = await startLogin();
    const unsigned = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ ...claims(s.nonce), iss: PLATFORM.issuer, aud: PLATFORM.client_id, exp: 9e9, iat: Math.floor(Date.now() / 1000) })).toString("base64url")}.`;
    assert.equal((await launch({ state: s.state, id_token: unsigned }, s.cookie)).status, 401);
  });

  it("accepts a matching azp", async () => {
    const s = await startLogin();
    const token = await sign(claims(s.nonce, { azp: PLATFORM.client_id }), {
      aud: [PLATFORM.client_id, "other"],
    });
    assert.equal((await launch({ state: s.state, id_token: token }, s.cookie)).status, 303);
  });

  it("rejects an unknown deployment, wrong message type, wrong version and a missing resource link", async () => {
    const cases: [string, Record<string, unknown>, number][] = [
      ["deployment", { [CLAIM.deploymentId]: "dep-unknown" }, 403],
      ["message type", { [CLAIM.messageType]: "LtiDeepLinkingRequest" }, 400],
      ["version", { [CLAIM.version]: "1.1" }, 400],
      ["resource link", { [CLAIM.resourceLink]: undefined }, 400],
    ];
    for (const [name, over, status] of cases) {
      const s = await startLogin();
      const res = await launch(
        { state: s.state, id_token: await sign(claims(s.nonce, over)) },
        s.cookie,
      );
      assert.equal(res.status, status, name);
    }
  });

  it("rejects a platform error post and a non-form body", async () => {
    const s = await startLogin();
    assert.equal((await launch({ error: "login_required", state: s.state }, s.cookie)).status, 400);
    const res = await handleLtiRequest(
      new Request(`${ORIGIN}/api/lti/launch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      deps(),
    );
    assert.equal(res.status, 400);
  });

  it("logs reason codes only: no ids, hints, names or tokens", async () => {
    const s = await startLogin();
    const token = await sign(claims(s.nonce, { name: "Pat Student", email: "pat@school.edu" }));
    assert.equal((await launch({ state: s.state, id_token: token }, s.cookie)).status, 303);
    const all = logs.join("\n");
    for (const leak of [
      "Pat Student",
      "pat@school.edu",
      "anon-sub",
      "opaque-hint",
      "rl-1",
      "dep-1",
      s.nonce,
      s.state,
      token,
    ]) {
      assert.ok(!all.includes(leak), leak);
    }
  });
});

describe("redirect allowlist", () => {
  it("resolves only same-origin allowlisted paths", () => {
    const allow = [...DEFAULT_TARGET_PATHS];
    assert.equal(resolveTarget("/", ORIGIN, allow), "/");
    assert.equal(resolveTarget("/practice/", ORIGIN, allow), "/practice");
    assert.equal(resolveTarget(`${ORIGIN}/pairs/abc`, ORIGIN, allow), "/pairs/abc");
    for (const bad of [
      "https://evil.example/practice",
      "//evil.example/practice",
      "/\\evil.example",
      "\\\\evil.example",
      "/%2f%2fevil.example",
      "/practicex",
      "/practice%2e%2e/api",
      "javascript:alert(1)",
      "/api/lti/config",
      `https://user:pw@${new URL(ORIGIN).host}/practice`,
      "/prac\ntice",
      "/practice\u0000",
      42,
      undefined,
    ]) {
      assert.equal(resolveTarget(bad, ORIGIN, allow), null, String(bad));
    }
  });

  it("LTI_TARGET_PATHS overrides only when every entry is safe", () => {
    assert.deepEqual(targetAllowlist("/practice, /pairs/"), ["/practice", "/pairs"]);
    assert.deepEqual(targetAllowlist("/practice,https://evil.example"), [...DEFAULT_TARGET_PATHS]);
    assert.deepEqual(targetAllowlist("/api"), [...DEFAULT_TARGET_PATHS]);
    assert.deepEqual(targetAllowlist(undefined), [...DEFAULT_TARGET_PATHS]);
    assert.equal(isSafeAllowPath("/a/../b"), false);
    assert.equal(isSafeAllowPath("//x"), false);
  });

  it("the env allowlist applies at launch", async () => {
    const d = deps(baseEnv({ LTI_TARGET_PATHS: "/practice" }));
    let s = await startLogin(d);
    let res = await launch({ state: s.state, id_token: await sign(claims(s.nonce)) }, s.cookie, d);
    assert.equal(res.status, 400, "desk not on the custom list");
    s = await startLogin(d);
    res = await launch(
      {
        state: s.state,
        id_token: await sign(claims(s.nonce, { [CLAIM.custom]: { firstpass_path: "/practice" } })),
      },
      s.cookie,
      d,
    );
    assert.equal(res.headers.get("location"), `${ORIGIN}/practice`);
  });
});

describe("jwks and config", () => {
  it("jwks is empty when no tool key is set", async () => {
    const res = await handleLtiRequest(new Request(`${ORIGIN}/api/lti/jwks`), deps());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { keys: [] });
  });

  it("derives the public key from LTI_TOOL_PRIVATE_JWK without private members", async () => {
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    const priv = await exportJWK(privateKey);
    const res = await handleLtiRequest(
      new Request(`${ORIGIN}/api/lti/jwks`),
      deps(baseEnv({ LTI_TOOL_PRIVATE_JWK: JSON.stringify(priv) })),
    );
    const body = (await res.json()) as { keys: JWK[] };
    assert.equal(body.keys.length, 1);
    const k = body.keys[0]!;
    assert.equal(k.kty, "RSA");
    assert.equal(k.n, priv.n);
    assert.equal(k.alg, "RS256");
    assert.equal(k.use, "sig");
    assert.ok(k.kid);
    for (const m of ["d", "p", "q", "dp", "dq", "qi"])
      assert.equal((k as Record<string, unknown>)[m], undefined, m);
  });

  it("prefers LTI_TOOL_PUBLIC_JWK and refuses a non-RSA or broken key", async () => {
    const pub = { ...platformKey.jwk, kid: "tool-1" };
    const r = await toolJwks(JSON.stringify(pub), undefined);
    assert.ok(r.ok && r.keys[0]!.kid === "tool-1");
    assert.equal((await toolJwks("{", undefined)).ok, false);
    assert.equal(
      (await toolJwks(JSON.stringify({ kty: "oct", k: "secret" }), undefined)).ok,
      false,
    );
    const res = await handleLtiRequest(
      new Request(`${ORIGIN}/api/lti/jwks`),
      deps(baseEnv({ LTI_TOOL_PRIVATE_JWK: "{bad" })),
    );
    assert.equal(res.status, 500);
  });

  it("config is the Canvas developer-key JSON built from the request origin", async () => {
    const res = await handleLtiRequest(new Request(`${ORIGIN}/api/lti/config`), deps());
    assert.equal(res.status, 200);
    const cfg = (await res.json()) as ReturnType<typeof canvasConfig>;
    assert.deepEqual(cfg, canvasConfig(ORIGIN));
    assert.equal(cfg.title, "FirstPass");
    assert.equal(cfg.oidc_initiation_url, `${ORIGIN}/api/lti/login`);
    assert.equal(cfg.target_link_uri, `${ORIGIN}/api/lti/launch`);
    assert.equal(cfg.public_jwk_url, `${ORIGIN}/api/lti/jwks`);
    assert.deepEqual(cfg.scopes, []);
    const ext = cfg.extensions[0]!;
    assert.equal(ext.privacy_level, "anonymous");
    assert.equal(ext.domain, "firstpass.test");
    assert.deepEqual(
      ext.settings.placements.map((p) => [p.placement, p.message_type, p.windowTarget]),
      [
        ["course_navigation", "LtiResourceLinkRequest", "_blank"],
        ["link_selection", "LtiDeepLinkingRequest", undefined],
        ["assignment_selection", "LtiDeepLinkingRequest", undefined],
      ],
    );
    for (const p of ext.settings.placements) {
      assert.equal(p.target_link_uri, `${ORIGIN}/api/lti/launch`, p.placement);
    }
    assert.ok(!/FDA[- ](cleared|approved)/.test(cfg.description.replace("Not FDA-cleared", "")));
  });

  it("config works without platforms configured (to register the key first)", async () => {
    const res = await handleLtiRequest(
      new Request(`${ORIGIN}/api/lti/config`),
      deps({ LTI_ENABLED: "1" }),
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(res.headers.get("pragma"), "no-cache");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  });
});

describe("control characters and state cookie hardening", () => {
  it("hasLtiControlChar detects C0, DEL, and C1 control characters", () => {
    for (const ctrl of ["\u0000", "\t", "\n", "\r", "\u001f", "\x7f", "\u0080", "\u0085", "\u009f"]) {
      assert.equal(hasLtiControlChar(ctrl), true, JSON.stringify(ctrl));
      assert.equal(hasLtiControlChar(`ok${ctrl}ok`), true, JSON.stringify(ctrl));
    }
    for (const safe of ["", " ", "~", "opaque-hint", "/practice?x=1", "\u00a0", "café"]) {
      assert.equal(hasLtiControlChar(safe), false, JSON.stringify(safe));
    }
  });

  it("resolveTarget rejects C0 and C1 control characters", () => {
    const allow = [...DEFAULT_TARGET_PATHS];
    for (const bad of [
      "/practice\u0000",
      "/prac\ntice",
      "/practice\r",
      "\n/practice",
      "/practice\x7f",
      "/practice\u0080",
      "/practice\u0085",
      "/practice\u009f",
      `${ORIGIN}/practice\u0085`,
      `${ORIGIN}/practice\r`,
    ]) {
      assert.equal(resolveTarget(bad, ORIGIN, allow), null, JSON.stringify(bad));
    }
    assert.equal(resolveTarget(" /practice ", ORIGIN, allow), "/practice");
  });

  it("decodeStateCookie rejects arrays, primitives, oversized/empty fields, and control chars", () => {
    const validNonce = "a".repeat(43);
    const b64Json = (v: unknown) => Buffer.from(JSON.stringify(v), "utf8").toString("base64url");

    for (const badPayload of [
      [],
      [validNonce, PLATFORM.issuer, PLATFORM.client_id],
      "str",
      123,
      null,
      true,
      { n: validNonce, i: "", c: PLATFORM.client_id },
      { n: validNonce, i: PLATFORM.issuer, c: "" },
      { n: validNonce, i: `https://x.test/${"a".repeat(2040)}`, c: PLATFORM.client_id },
      { n: validNonce, i: PLATFORM.issuer, c: "c".repeat(513) },
      { n: validNonce, i: `${PLATFORM.issuer}\r`, c: PLATFORM.client_id },
      { n: validNonce, i: `${PLATFORM.issuer}\u0085`, c: PLATFORM.client_id },
      { n: validNonce, i: `${PLATFORM.issuer}\u0000`, c: PLATFORM.client_id },
      { n: validNonce, i: PLATFORM.issuer, c: "client\nid" },
      { n: validNonce, i: PLATFORM.issuer, c: "client\x7fid" },
      { n: validNonce, i: PLATFORM.issuer, c: "client\u0080id" },
      { n: validNonce, i: PLATFORM.issuer, c: "client\u009fid" },
      { n: "too-short", i: PLATFORM.issuer, c: PLATFORM.client_id },
    ]) {
      assert.equal(decodeStateCookie(b64Json(badPayload)), null, JSON.stringify(badPayload));
    }

    const maxIssuer = `https://x.test/${"a".repeat(2048 - "https://x.test/".length)}`;
    const maxClient = "c".repeat(512);
    const encoded = encodeStateCookie({
      nonce: validNonce,
      issuer: maxIssuer,
      clientId: maxClient,
    });
    assert.deepEqual(decodeStateCookie(encoded), {
      nonce: validNonce,
      issuer: maxIssuer,
      clientId: maxClient,
    });
  });

  it("handleLaunch rejects id_token and target_link_uri claims containing control characters", async () => {
    const s = await startLogin();
    const tokenWithCtrl = `${await sign(claims(s.nonce))}\r`;
    const body = new URLSearchParams({ state: s.state, id_token: tokenWithCtrl }).toString();
    const badIdRes = await handleLaunch(
      new Request(`${ORIGIN}/api/lti/launch`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: s.cookie,
        },
        body,
      }),
      deps(),
    );
    assert.equal(badIdRes.status, 400);
    assert.equal(badIdRes.headers.get("cache-control"), "no-store");

    const badTargetRes = await launch(
      {
        state: s.state,
        id_token: await sign(claims(s.nonce, { [CLAIM.targetLinkUri]: `${ORIGIN}/api/lti/launch\n` })),
      },
      s.cookie,
    );
    assert.equal(badTargetRes.status, 400);
    assert.equal(badTargetRes.headers.get("location"), null);
  });
});

/* ---------------- Deep Linking (content picker) ---------------- */

const SCHOOL_HOST = "school.instructure.com";
const RETURN_URL = `https://${SCHOOL_HOST}/courses/7/deep_linking_response?modal=true`;
const DL_PLATFORM: LtiPlatform = { ...PLATFORM, deep_link_return_hosts: [SCHOOL_HOST] };

let toolPrivateJwk: JWK | undefined;
async function toolPrivate(): Promise<JWK> {
  if (!toolPrivateJwk) {
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    toolPrivateJwk = { ...(await exportJWK(privateKey)), kid: "tool-key-1" };
  }
  return toolPrivateJwk;
}

async function dlEnv(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  return baseEnv({
    LTI_PLATFORMS: JSON.stringify([DL_PLATFORM]),
    LTI_TOOL_PRIVATE_JWK: JSON.stringify(await toolPrivate()),
    ...extra,
  });
}

function dlSettings(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    deep_link_return_url: RETURN_URL,
    accept_types: ["ltiResourceLink"],
    accept_presentation_document_targets: ["iframe", "window"],
    accept_multiple: true,
    data: "opaque-dl-data",
    title: "Ignored title",
    ...over,
  };
}

function dlClaims(nonce: string, settings: Record<string, unknown> | null = dlSettings()) {
  return claims(nonce, {
    [CLAIM.messageType]: "LtiDeepLinkingRequest",
    [CLAIM.resourceLink]: undefined,
    [CLAIM.deepLinkingSettings]: settings,
  });
}

const unescape = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function inputValue(page: string, name: string): string | null {
  const m = new RegExp(`name="${name}" value="([^"]*)"`).exec(page);
  return m ? unescape(m[1]!) : null;
}

/** Login + deep linking launch; returns the response, its page and the picker token. */
async function openPicker(d: LtiDeps, settings?: Record<string, unknown> | null) {
  const s = await startLogin(d);
  const idToken = await sign(dlClaims(s.nonce, settings));
  const res = await launch({ state: s.state, id_token: idToken }, s.cookie, d);
  const page = await res.text();
  return { res, page, token: inputValue(page, "token"), s, idToken };
}

async function submit(fields: [string, string][], d: LtiDeps) {
  return handleLtiRequest(
    new Request(`${ORIGIN}/api/lti/deep-link`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    }),
    d,
  );
}

function returnForm(page: string): { action: string; jwt: string } {
  const action = /<form id="fp-return" method="post" action="([^"]*)"/.exec(page);
  const jwt = inputValue(page, "JWT");
  assert.ok(action && jwt, "return form");
  return { action: unescape(action[1]!), jwt };
}

async function toolKeySet(d: LtiDeps) {
  const res = await handleLtiRequest(new Request(`${ORIGIN}/api/lti/jwks`), d);
  const body = (await res.json()) as { keys: JWK[] };
  return { keys: body.keys, set: createLocalJWKSet(body) };
}

const WEEK1 = `/for-programs/course-kit#${COURSE_KIT_MODULES[0]!.id}`;
const SOME_PAIR = pairPages().find((p) => p.slug.includes("warfarin")) ?? pairPages()[0]!;

describe("deep linking: picker launch", () => {
  it("a verified LtiDeepLinkingRequest renders the picker", async () => {
    const d = deps(await dlEnv());
    const { res, page, token } = await openPicker(d);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type")!, /^text\/html/);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(res.headers.get("set-cookie")!, /Max-Age=0/);
    const csp = res.headers.get("content-security-policy")!;
    assert.match(csp, /frame-ancestors 'self' https:\/\/school\.instructure\.com/);
    assert.match(csp, /form-action 'self'/);
    assert.ok(token && token.split(".").length === 3, "picker token");
    assert.match(page, /<form method="post" action="\/api\/lti\/deep-link">/);
    for (const path of [
      "/for-programs/course-kit",
      WEEK1,
      "/practice",
      "/practice?enzyme=CYP3A4",
      "/class/",
    ]) {
      assert.ok(page.includes(`value="${escapeHtml(path)}`), path);
    }
    assert.match(page, /type="checkbox" name="item"/);
    assert.match(page, /name="q"/);
    assert.ok(!page.includes("<script"), "picker has no script");
    assert.ok(!page.includes("Ignored title"));
    assert.ok(!/FDA[- ]?(cleared|approved)/i.test(page));
  });

  it("uses radio buttons when the platform takes one item", async () => {
    const d = deps(await dlEnv());
    const { page } = await openPicker(d, dlSettings({ accept_multiple: false }));
    assert.match(page, /type="radio" name="item"/);
    assert.ok(!page.includes('type="checkbox"'));
  });

  it("consumes the launch nonce: the same id_token cannot open the picker twice", async () => {
    const d = deps(await dlEnv());
    const { res, s, idToken } = await openPicker(d);
    assert.equal(res.status, 200);
    const again = await launch({ state: s.state, id_token: idToken }, s.cookie, d);
    assert.equal(again.status, 401);
  });

  it("is verified like a resource link launch (iss, aud, azp, exp, nonce, state, deployment, version)", async () => {
    const d = deps(await dlEnv());
    const cases: [string, (n: string) => Promise<string>, number][] = [
      ["aud", (n) => sign(dlClaims(n), { aud: "someone-else" }), 401],
      ["iss", (n) => sign(dlClaims(n), { iss: "https://evil.example" }), 401],
      [
        "azp",
        (n) =>
          sign({ ...dlClaims(n), azp: "x" }, { aud: [PLATFORM.client_id, "x"] }),
        401,
      ],
      ["signature", (n) => sign(dlClaims(n), { key: otherKey }), 401],
      [
        "expired",
        (n) =>
          sign(dlClaims(n), { expSecondsFromNow: -600, iat: Math.floor(Date.now() / 1000) - 900 }),
        401,
      ],
      ["nonce", () => sign(dlClaims("y".repeat(43))), 401],
      ["deployment", (n) => sign({ ...dlClaims(n), [CLAIM.deploymentId]: "nope" }), 403],
      ["version", (n) => sign({ ...dlClaims(n), [CLAIM.version]: "1.1" }), 400],
    ];
    for (const [name, make, status] of cases) {
      const s = await startLogin(d);
      const res = await launch({ state: s.state, id_token: await make(s.nonce) }, s.cookie, d);
      assert.equal(res.status, status, name);
      assert.ok(!(await res.text()).includes("<form"), name);
    }
    const s = await startLogin(d);
    const token = await sign(dlClaims(s.nonce));
    assert.equal((await launch({ state: s.state, id_token: token }, null, d)).status, 401);
  });

  it("rejects accept_types without ltiResourceLink and missing settings", async () => {
    const d = deps(await dlEnv());
    for (const settings of [
      dlSettings({ accept_types: ["link", "file", "html"] }),
      dlSettings({ accept_types: "ltiResourceLink" }),
      dlSettings({ accept_types: undefined }),
      null,
    ]) {
      const { res, token } = await openPicker(d, settings);
      assert.equal(res.status, 400, JSON.stringify(settings));
      assert.equal(token, null);
    }
  });

  it("checks the return URL: https, on the platform's return hosts, no credentials or fragment", async () => {
    const d = deps(await dlEnv());
    for (const url of [
      `http://${SCHOOL_HOST}/courses/7/deep_linking_response`,
      "https://evil.example/courses/7/deep_linking_response",
      `https://${SCHOOL_HOST}.evil.example/x`,
      `https://user:pw@${SCHOOL_HOST}/x`,
      `https://${SCHOOL_HOST}/x#frag`,
      `https://${SCHOOL_HOST}/x\n`,
      "javascript:alert(1)",
      "/courses/7/deep_linking_response",
      undefined,
    ]) {
      const { res, token } = await openPicker(d, dlSettings({ deep_link_return_url: url }));
      assert.equal(res.status, 400, String(url));
      assert.equal(token, null, String(url));
    }
  });

  it("without deep_link_return_hosts only the issuer's host is a return host", () => {
    assert.equal(
      checkReturnUrl("https://canvas.instructure.com/courses/1/deep_linking_response", PLATFORM),
      "https://canvas.instructure.com/courses/1/deep_linking_response",
    );
    assert.equal(checkReturnUrl(RETURN_URL, PLATFORM), null);
    assert.equal(checkReturnUrl(RETURN_URL, DL_PLATFORM), RETURN_URL);
    assert.equal(
      checkReturnUrl("https://canvas.instructure.com/x", DL_PLATFORM),
      null,
      "an explicit list replaces the issuer host",
    );
  });

  it("deep_link_return_hosts must be plain host names", () => {
    for (const hosts of [["https://school.instructure.com"], ["*.instructure.com"], ["a/b"], []]) {
      const r = parsePlatforms(JSON.stringify([{ ...PLATFORM, deep_link_return_hosts: hosts }]));
      assert.equal(r.ok, false, JSON.stringify(hosts));
    }
    const ok = parsePlatforms(
      JSON.stringify([{ ...PLATFORM, deep_link_return_hosts: ["School.Instructure.com", "lms.example.edu:8443"] }]),
    );
    assert.ok(ok.ok);
    assert.deepEqual(ok.platforms[0]!.deep_link_return_hosts, [
      "school.instructure.com",
      "lms.example.edu:8443",
    ]);
  });

  it("rejects bad data and reads only the settings it needs", () => {
    assert.equal(readDeepLinkSettings(dlSettings({ data: 42 }), DL_PLATFORM).ok, false);
    assert.equal(readDeepLinkSettings(dlSettings({ data: "a\nb" }), DL_PLATFORM).ok, false);
    assert.equal(readDeepLinkSettings(dlSettings({ data: "x".repeat(9000) }), DL_PLATFORM).ok, false);
    const r = readDeepLinkSettings(
      dlSettings({ accept_multiple: "yes", accept_presentation_document_targets: ["iframe"] }),
      DL_PLATFORM,
    );
    assert.deepEqual(r, {
      ok: true,
      settings: { returnUrl: RETURN_URL, multiple: false, window: false, data: "opaque-dl-data" },
    });
  });

  it("answers 500 without a tool private key", async () => {
    const d = deps(baseEnv({ LTI_PLATFORMS: JSON.stringify([DL_PLATFORM]) }));
    const { res, token } = await openPicker(d);
    assert.equal(res.status, 500);
    assert.equal(token, null);
  });

  it("refuses a public JWK that does not match the private key", async () => {
    const d = deps(await dlEnv({ LTI_TOOL_PUBLIC_JWK: JSON.stringify(platformKey.jwk) }));
    const { res } = await openPicker(d);
    assert.equal(res.status, 500);
  });

  it("offers only pages on the launch allowlist", async () => {
    const d = deps(await dlEnv({ LTI_TARGET_PATHS: "/practice" }));
    const { page, token } = await openPicker(d);
    assert.ok(page.includes('value="/practice"'));
    assert.ok(!page.includes('value="/class/'));
    assert.ok(!page.includes("/for-programs/course-kit"));
    const res = await submit(
      [
        ["token", token!],
        ["action", "add"],
        ["item", `/class/${"statin"}`],
      ],
      d,
    );
    assert.equal(res.status, 400);
    const found = await submit(
      [
        ["token", token!],
        ["action", "find"],
        ["q", SOME_PAIR.nameA],
      ],
      d,
    );
    assert.ok(!(await found.text()).includes('value="/pair/'), "no pair results off the list");
  });
});

describe("deep linking: submit", () => {
  it("answers with a form that posts a signed LtiDeepLinkingResponse to the return URL", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    const picks = [WEEK1, "/practice?enzyme=CYP3A4", `/pair/${SOME_PAIR.slug}`];
    const res = await submit(
      [["token", token!], ["action", "add"], ...picks.map((p): [string, string] => ["item", p])],
      d,
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const page = await res.text();
    const { action, jwt } = returnForm(page);
    assert.equal(action, RETURN_URL);
    assert.ok(page.includes(`<script>${RETURN_SCRIPT}</script>`));

    const csp = res.headers.get("content-security-policy")!;
    const hash = createHash("sha256").update(RETURN_SCRIPT).digest("base64");
    assert.ok(csp.includes(`script-src 'sha256-${hash}'`), csp);
    assert.match(csp, /form-action https:\/\/school\.instructure\.com(;|$)/);

    const { keys, set } = await toolKeySet(d);
    const header = decodeProtectedHeader(jwt);
    assert.equal(header.alg, "RS256");
    assert.equal(header.kid, "tool-key-1");
    assert.equal(header.kid, keys[0]!.kid);
    const { payload } = await jwtVerify(jwt, set, {
      algorithms: ["RS256"],
      issuer: PLATFORM.client_id,
      audience: PLATFORM.issuer,
    });
    assert.equal(payload[CLAIM.messageType], "LtiDeepLinkingResponse");
    assert.equal(payload[CLAIM.version], "1.3.0");
    assert.equal(payload[CLAIM.deploymentId], "dep-1");
    assert.equal(payload[CLAIM.dlData], "opaque-dl-data");
    assert.equal(typeof payload.nonce, "string");
    assert.ok((payload.nonce as string).length >= 32);
    assert.ok(payload.exp! - payload.iat! <= 300 && payload.exp! > payload.iat!);
    assert.equal(payload.sub, undefined);
    const items = payload[CLAIM.dlContentItems] as Record<string, unknown>[];
    assert.equal(items.length, 3);
    assert.deepEqual(
      items.map((i) => (i.custom as Record<string, string>).firstpass_path),
      picks,
    );
    for (const item of items) {
      assert.equal(item.type, "ltiResourceLink");
      assert.equal(item.url, `${ORIGIN}/api/lti/launch`);
      assert.equal(typeof item.title, "string");
      assert.match(item.title as string, /^FirstPass /);
      assert.deepEqual(item.window, { targetName: "_blank" });
    }
    assert.match(items[0]!.title as string, /week 1/);
    assert.ok((items[2]!.title as string).includes(SOME_PAIR.nameA));
  });

  it("a returned item launches to its page (week anchor and deck filter kept)", async () => {
    const d = deps(await dlEnv());
    for (const [path, expected] of [
      [WEEK1, `${ORIGIN}${WEEK1}`],
      ["/practice?enzyme=CYP3A4", `${ORIGIN}/practice?enzyme=CYP3A4`],
      [`/pair/${SOME_PAIR.slug}`, `${ORIGIN}/pair/${SOME_PAIR.slug}`],
      ["/class/statin", `${ORIGIN}/class/statin`],
    ] as const) {
      const s = await startLogin(d);
      const res = await launch(
        {
          state: s.state,
          id_token: await sign(claims(s.nonce, { [CLAIM.custom]: { firstpass_path: path } })),
        },
        s.cookie,
        d,
      );
      assert.equal(res.status, 303, path);
      assert.equal(res.headers.get("location"), expected);
    }
  });

  it("omits window and data when the platform did not offer them", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(
      d,
      dlSettings({ data: undefined, accept_presentation_document_targets: ["iframe"] }),
    );
    const res = await submit([["token", token!], ["item", "/practice"]], d);
    assert.equal(res.status, 200);
    const { set } = await toolKeySet(d);
    const { payload } = await jwtVerify(returnForm(await res.text()).jwt, set);
    assert.equal(payload[CLAIM.dlData], undefined);
    const items = payload[CLAIM.dlContentItems] as Record<string, unknown>[];
    assert.equal(items[0]!.window, undefined);
  });

  it("cancel returns an empty content item list", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    const res = await submit([["token", token!], ["action", "cancel"]], d);
    assert.equal(res.status, 200);
    const { set } = await toolKeySet(d);
    const { payload } = await jwtVerify(returnForm(await res.text()).jwt, set);
    assert.deepEqual(payload[CLAIM.dlContentItems], []);
  });

  it("find lists pair pages and keeps the token usable", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    const found = await submit(
      [["token", token!], ["action", "find"], ["q", SOME_PAIR.slug], ["item", WEEK1]],
      d,
    );
    assert.equal(found.status, 200);
    const page = await found.text();
    assert.ok(page.includes(`value="/pair/${SOME_PAIR.slug}"`));
    assert.ok(page.includes(`value="${escapeHtml(WEEK1)}" checked`), "selection kept");
    assert.equal(inputValue(page, "token"), token);

    const none = await submit([["token", token!], ["action", "find"], ["q", "zzqx-not-a-drug"]], d);
    assert.match(await none.text(), /No pair page matches/);

    const added = await submit([["token", token!], ["action", "add"], ["item", WEEK1]], d);
    assert.equal(added.status, 200);
  });

  it("rejects a replayed, tampered, foreign or expired picker token", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    const ok = await submit([["token", token!], ["item", "/practice"]], d);
    assert.equal(ok.status, 200);
    const replay = await submit([["token", token!], ["item", "/practice"]], d);
    assert.equal(replay.status, 401);
    assert.match(await replay.text(), /already used/);

    const fresh = (await openPicker(d)).token!;
    const [h, p, sig] = fresh.split(".") as [string, string, string];
    const claimsObj = JSON.parse(Buffer.from(p, "base64url").toString()) as Record<string, unknown>;
    const forged = Buffer.from(
      JSON.stringify({ ...claimsObj, ret: "https://evil.example/x" }),
    ).toString("base64url");
    const flipped = `${sig.slice(0, -2)}${sig.endsWith("AA") ? "BB" : "AA"}`;
    const foreign = await new SignJWT(claimsObj)
      .setProtectedHeader({ alg: "RS256", kid: "tool-key-1", typ: "fp-lti-picker+jwt" })
      .sign(otherKey.privateKey);
    for (const [name, bad] of [
      ["payload", `${h}.${forged}.${sig}`],
      ["signature", `${h}.${p}.${flipped}`],
      ["other key", foreign],
      ["garbage", "not-a-token"],
      ["platform id_token", await sign(claims("z".repeat(43)))],
    ] as const) {
      const res = await submit([["token", bad], ["item", "/practice"]], d);
      assert.equal(res.status, 401, name);
      assert.ok(!(await res.text()).includes("fp-return"), name);
    }

    const later = Math.floor(Date.now() / 1000) + PICKER_TTL_SECONDS + 300;
    const expired = await submit([["token", fresh], ["item", "/practice"]], { ...d, now: () => later });
    assert.equal(expired.status, 401);
    // Still unused, so it works before expiry.
    assert.equal((await submit([["token", fresh], ["item", "/practice"]], d)).status, 200);
  });

  it("rejects a token after its deployment is removed from LTI_PLATFORMS", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    const removed = deps(
      await dlEnv({
        LTI_PLATFORMS: JSON.stringify([{ ...DL_PLATFORM, deployment_ids: ["dep-2"] }]),
      }),
    );
    assert.equal((await submit([["token", token!], ["item", "/practice"]], removed)).status, 403);
    const moved = deps(
      await dlEnv({
        LTI_PLATFORMS: JSON.stringify([{ ...DL_PLATFORM, deep_link_return_hosts: ["other.edu"] }]),
      }),
    );
    assert.equal((await submit([["token", token!], ["item", "/practice"]], moved)).status, 400);
  });

  it("rejects pages the picker does not offer", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    for (const bad of [
      "/drug/warfarin",
      "/api/lti/config",
      "https://evil.example/practice",
      "//evil.example/practice",
      "/pair/not-a-real-pair-slug",
      "/class/not-a-real-class",
      "/practice?enzyme=CYP9Z9",
      "/practice?x=1",
      "/for-programs/course-kit#nope",
      "/pairs/../api/stats",
      "/practice\r\n",
    ]) {
      const res = await submit([["token", token!], ["action", "add"], ["item", bad]], d);
      assert.equal(res.status, 400, bad);
      assert.ok(!(await res.text()).includes("fp-return"), bad);
    }
    // Nothing was consumed by the refusals.
    assert.equal((await submit([["token", token!], ["item", "/practice"]], d)).status, 200);
  });

  it("enforces accept_multiple and needs at least one item", async () => {
    const d = deps(await dlEnv());
    const single = (await openPicker(d, dlSettings({ accept_multiple: false }))).token!;
    const two = await submit(
      [["token", single], ["item", "/practice"], ["item", WEEK1]],
      d,
    );
    assert.equal(two.status, 400);
    assert.match(await two.text(), /takes one item/);
    const none = await submit([["token", single], ["action", "add"]], d);
    assert.equal(none.status, 400);
    assert.match(await none.text(), /Pick an item first/);
    const dup = await submit([["token", single], ["item", "/practice"], ["item", "/practice"]], d);
    assert.equal(dup.status, 200, "the same item twice counts once");
  });

  it("rejects an unknown action, a non-form body and a missing token", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    assert.equal((await submit([["token", token!], ["action", "delete"]], d)).status, 400);
    assert.equal((await submit([["item", "/practice"]], d)).status, 400);
    const res = await handleLtiRequest(
      new Request(`${ORIGIN}/api/lti/deep-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      d,
    );
    assert.equal(res.status, 400);
    const get = await handleLtiRequest(new Request(`${ORIGIN}/api/lti/deep-link`), d);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get("allow"), "POST");
  });

  it("is 404 when LTI is off, even with a valid token", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    const off = deps({ ...(await dlEnv()), LTI_ENABLED: "0" });
    const res = await submit([["token", token!], ["item", "/practice"]], off);
    assert.equal(res.status, 404);
  });

  it("logs reason codes only: no token, data, return URL or item", async () => {
    const d = deps(await dlEnv());
    const { token } = await openPicker(d);
    const res = await submit([["token", token!], ["item", WEEK1]], d);
    const { jwt } = returnForm(await res.text());
    const all = logs.join("\n");
    for (const leak of [token!, jwt, "opaque-dl-data", SCHOOL_HOST, "cyp-basics", "dep-1"]) {
      assert.ok(!all.includes(leak), leak);
    }
    assert.ok(all.includes('"event":"lti.deep_link"'));
  });
});

describe("launch target extras", () => {
  const allow = [...DEFAULT_TARGET_PATHS];
  it("keeps only known practice filters and course kit week anchors", () => {
    assert.equal(
      resolveLaunchTarget("/practice?enzyme=CYP3A4&grade=major&x=1", ORIGIN, allow),
      "/practice?enzyme=CYP3A4&grade=major",
    );
    assert.equal(resolveLaunchTarget("/practice?class=azole-antifungal", ORIGIN, allow), "/practice?class=azole-antifungal");
    assert.equal(resolveLaunchTarget("/practice?enzyme=CYP9Z9", ORIGIN, allow), "/practice");
    assert.equal(resolveLaunchTarget("/practice?enzyme=CYP3A4&enzyme=CYP2D6", ORIGIN, allow), "/practice");
    assert.equal(resolveLaunchTarget("/practice?class=Not%20Slug", ORIGIN, allow), "/practice");
    assert.equal(resolveLaunchTarget(WEEK1, ORIGIN, allow), WEEK1);
    assert.equal(
      resolveLaunchTarget("/for-programs/course-kit#unknown", ORIGIN, allow),
      "/for-programs/course-kit",
    );
    assert.equal(resolveLaunchTarget(`${ORIGIN}/pairs?x=1#y`, ORIGIN, allow), "/pairs");
    assert.equal(resolveLaunchTarget("/pair/abc#cyp-basics", ORIGIN, allow), "/pair/abc");
    assert.equal(resolveLaunchTarget("https://evil.example/practice?enzyme=CYP3A4", ORIGIN, allow), null);
  });

  it("the default list now covers class and pair pages, still not drug pages or the API", () => {
    assert.equal(resolveTarget("/class/statin", ORIGIN, allow), "/class/statin");
    assert.equal(resolveTarget("/pair/a-b", ORIGIN, allow), "/pair/a-b");
    assert.equal(resolveTarget("/classes", ORIGIN, allow), null);
    assert.equal(resolveTarget("/drug/warfarin", ORIGIN, allow), null);
    assert.equal(resolveTarget("/api/lti/config", ORIGIN, allow), null);
  });
});
