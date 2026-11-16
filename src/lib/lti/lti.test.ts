import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JWK,
} from "jose";
import { setLogSink } from "@/lib/server/log";
import { Route as LtiRoute } from "@/routes/api/lti/$";
import {
  CLAIM,
  DEFAULT_TARGET_PATHS,
  canvasConfig,
  decodeStateCookie,
  encodeStateCookie,
  hasLtiControlChar,
  isSafeAllowPath,
  parsePlatforms,
  resolveTarget,
  stateCookieName,
  targetAllowlist,
  toolJwks,
  type LtiPlatform,
} from "./lti";
import {
  handleLaunch,
  handleLogin,
  handleLtiRequest,
  resetLtiState,
  type LtiDeps,
} from "./lti.server";

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
      [["course_navigation", "LtiResourceLinkRequest", "_blank"]],
    );
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
