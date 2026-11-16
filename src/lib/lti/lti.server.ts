/**
 * /api/lti/* — LTI 1.3 core launch (OIDC login initiation, resource link launch, tool JWKS and
 * the Canvas developer-key JSON). Off unless LTI_ENABLED is "1": every path answers 404.
 *
 * Privacy: the id_token is verified and only the claims needed to accept the launch are read
 * (issuer, audience, azp, exp, nonce, message type, version, deployment id, target and the
 * optional firstpass_path custom field). Names, emails and user ids are never read, logged or
 * stored, and nothing goes to a database. A launch grants no license; program keys still apply.
 */

import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import { env } from "@/lib/env.server";
import { BoundedLRUCache } from "@/lib/server/cache";
import { logEvent } from "@/lib/server/log";
import { SHARED_CLIENT, SlidingWindow, clientKey } from "@/lib/server/rate-limit";
import {
  CLAIM,
  CUSTOM_PATH_FIELD,
  LTI_BASE_PATH,
  LTI_CONFIG_PATH,
  LTI_JWKS_PATH,
  LTI_LAUNCH_PATH,
  LTI_LOGIN_PATH,
  LTI_RESOURCE_LINK_REQUEST,
  LTI_VERSION,
  STATE_TTL_SECONDS,
  canvasConfig,
  clearStateCookie,
  decodeStateCookie,
  findPlatform,
  isValidState,
  ltiEnabled,
  parsePlatforms,
  readCookie,
  resolveTarget,
  setStateCookie,
  stateCookieName,
  targetAllowlist,
  toolJwks,
  type EnvReader,
  type LtiPlatform,
} from "./lti";

export const LTI_MAX_BODY_BYTES = 64 * 1024;
export const LTI_RATE = { max: 30, windowMs: 60_000 };
const CLOCK_TOLERANCE_S = 60;

export interface LtiDeps {
  env?: EnvReader;
  /** Key lookup for a platform's id_tokens. Tests pass a local key; production fetches jwks_uri. */
  keyResolver?: (platform: LtiPlatform) => JWTVerifyGetKey;
  /** Seconds since the epoch, for exp checks in tests. */
  now?: () => number;
  /** Rate-limit key for the caller. */
  clientKey?: (request: Request) => string;
}

const NO_STORE = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
} as const;

/* ---------------- shared state (per server instance) ---------------- */

const remoteSets = new Map<string, JWTVerifyGetKey>();
function defaultKeyResolver(platform: LtiPlatform): JWTVerifyGetKey {
  let set = remoteSets.get(platform.jwks_uri);
  if (!set) {
    set = createRemoteJWKSet(new URL(platform.jwks_uri), {
      timeoutDuration: 5_000,
      cooldownDuration: 30_000,
    });
    remoteSets.set(platform.jwks_uri, set);
  }
  return set;
}

/** Nonces already accepted, so one id_token cannot launch twice. */
const usedNonces = new BoundedLRUCache<true>(
  20_000,
  (STATE_TTL_SECONDS + CLOCK_TOLERANCE_S) * 1000,
);
const limiter = new SlidingWindow(LTI_RATE.max, LTI_RATE.windowMs);

export function resetLtiState() {
  usedNonces.clear();
  limiter.reset();
  remoteSets.clear();
}

/* ---------------- responses ---------------- */

function text(status: number, body: string, extra: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...NO_STORE, ...extra },
  });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...NO_STORE },
  });
}

const notFound = () => text(404, "Not found");
const misconfigured = () => text(500, "Course links are not configured correctly on this server.");

/** One log line per outcome: a reason code only, never ids, names, emails or tokens. */
function note(step: "login" | "launch", outcome: string, status: number) {
  logEvent(status >= 500 ? "error" : status >= 400 ? "warn" : "info", `lti.${step}`, {
    outcome,
    status,
  });
}

function reject(
  step: "login" | "launch",
  outcome: string,
  status: number,
  message: string,
  extra?: Record<string, string>,
) {
  note(step, outcome, status);
  return text(status, message, extra);
}

/* ---------------- helpers ---------------- */

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

async function readForm(request: Request): Promise<URLSearchParams | null> {
  const type = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (type !== "application/x-www-form-urlencoded") return null;
  const body = await readBounded(request, LTI_MAX_BODY_BYTES);
  return body === null ? null : new URLSearchParams(body);
}

/** The body as UTF-8, or null when it is over `max` bytes (by Content-Length or by count) or unreadable. */
async function readBounded(request: Request, max: number): Promise<string | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared.trim()) || Number(declared) > max)) {
    void request.body?.cancel().catch(() => {});
    return null;
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks).toString("utf8");
}

function platformsFrom(readEnv: EnvReader): LtiPlatform[] | null {
  const result = parsePlatforms(readEnv("LTI_PLATFORMS"));
  if (result.ok) return result.platforms;
  logEvent("error", "lti.config_invalid", { issues: result.issues });
  return null;
}

function stringParam(params: URLSearchParams, name: string, max = 2048): string | undefined {
  const v = params.get(name);
  if (v === null) return undefined;
  const t = v.trim();
  return t && t.length <= max ? t : undefined;
}

/* ---------------- login (OIDC third-party initiation) ---------------- */

export async function handleLogin(request: Request, deps: LtiDeps = {}): Promise<Response> {
  const readEnv = deps.env ?? env;
  const platforms = platformsFrom(readEnv);
  if (!platforms) return misconfigured();

  let params: URLSearchParams;
  if (request.method === "GET") params = new URL(request.url).searchParams;
  else {
    const form = await readForm(request);
    if (!form) return reject("login", "bad_body", 400, "Expected a form post.");
    params = form;
  }

  const iss = stringParam(params, "iss");
  const loginHint = stringParam(params, "login_hint", 4096);
  const targetLinkUri = stringParam(params, "target_link_uri");
  const clientId = stringParam(params, "client_id", 512);
  const messageHint = stringParam(params, "lti_message_hint", 4096);
  if (!iss || !loginHint || !targetLinkUri)
    return reject("login", "missing_param", 400, "Missing login parameters.");

  const platform = findPlatform(platforms, iss, clientId);
  if (!platform)
    return reject(
      "login",
      "unknown_platform",
      400,
      "This platform is not registered with FirstPass.",
    );

  const origin = new URL(request.url).origin;
  let target: URL;
  try {
    target = new URL(targetLinkUri);
  } catch {
    return reject("login", "bad_target", 400, "The launch link is not valid.");
  }
  if (target.origin !== origin)
    return reject("login", "bad_target", 400, "The launch link is not for this site.");

  const state = randomToken();
  const nonce = randomToken();
  const auth = new URL(platform.auth_endpoint);
  auth.searchParams.set("scope", "openid");
  auth.searchParams.set("response_type", "id_token");
  auth.searchParams.set("response_mode", "form_post");
  auth.searchParams.set("prompt", "none");
  auth.searchParams.set("client_id", platform.client_id);
  auth.searchParams.set("redirect_uri", `${origin}${LTI_LAUNCH_PATH}`);
  auth.searchParams.set("login_hint", loginHint);
  auth.searchParams.set("state", state);
  auth.searchParams.set("nonce", nonce);
  if (messageHint) auth.searchParams.set("lti_message_hint", messageHint);

  note("login", "redirect", 302);
  return new Response(null, {
    status: 302,
    headers: {
      Location: auth.toString(),
      "Set-Cookie": setStateCookie(state, {
        nonce,
        issuer: platform.issuer,
        clientId: platform.client_id,
      }),
      ...NO_STORE,
    },
  });
}

/* ---------------- launch (id_token form post) ---------------- */

function audList(aud: JWTPayload["aud"]): string[] {
  return Array.isArray(aud) ? aud : typeof aud === "string" ? [aud] : [];
}

export async function handleLaunch(request: Request, deps: LtiDeps = {}): Promise<Response> {
  const readEnv = deps.env ?? env;
  const platforms = platformsFrom(readEnv);
  if (!platforms) return misconfigured();

  const form = await readForm(request);
  if (!form) return reject("launch", "bad_body", 400, "Expected a form post.");
  if (form.get("error"))
    return reject(
      "launch",
      "platform_error",
      400,
      "The course site did not complete the launch. Try the link again.",
    );

  const state = form.get("state");
  const idToken = stringParam(form, "id_token", LTI_MAX_BODY_BYTES);
  if (!isValidState(state) || !idToken)
    return reject("launch", "missing_param", 400, "Missing launch parameters.");

  const clear = { "Set-Cookie": clearStateCookie(state) };
  const cookie = decodeStateCookie(
    readCookie(request.headers.get("cookie"), stateCookieName(state)),
  );
  if (!cookie) {
    return reject(
      "launch",
      "state_mismatch",
      401,
      "This launch expired or was not started here. Open the link from your course again.",
      clear,
    );
  }

  const platform = findPlatform(platforms, cookie.issuer, cookie.clientId);
  if (!platform)
    return reject(
      "launch",
      "unknown_platform",
      401,
      "This platform is not registered with FirstPass.",
      clear,
    );

  let payload: JWTPayload;
  try {
    const resolver = (deps.keyResolver ?? defaultKeyResolver)(platform);
    const now = deps.now?.();
    ({ payload } = await jwtVerify(idToken, resolver, {
      algorithms: ["RS256"],
      issuer: platform.issuer,
      audience: platform.client_id,
      requiredClaims: ["exp", "iat", "nonce"],
      clockTolerance: CLOCK_TOLERANCE_S,
      maxTokenAge: STATE_TTL_SECONDS,
      ...(now !== undefined ? { currentDate: new Date(now * 1000) } : {}),
    }));
  } catch {
    return reject(
      "launch",
      "bad_token",
      401,
      "The launch could not be verified. Open the link from your course again.",
      clear,
    );
  }

  const aud = audList(payload.aud);
  const azp = payload.azp;
  if ((aud.length > 1 || azp !== undefined) && azp !== platform.client_id) {
    return reject(
      "launch",
      "bad_azp",
      401,
      "The launch could not be verified. Open the link from your course again.",
      clear,
    );
  }

  const nonce = payload.nonce;
  if (typeof nonce !== "string" || nonce !== cookie.nonce) {
    return reject(
      "launch",
      "nonce_mismatch",
      401,
      "The launch could not be verified. Open the link from your course again.",
      clear,
    );
  }
  if (usedNonces.has(nonce))
    return reject(
      "launch",
      "replay",
      401,
      "This launch was already used. Open the link from your course again.",
      clear,
    );

  if (payload[CLAIM.messageType] !== LTI_RESOURCE_LINK_REQUEST) {
    return reject(
      "launch",
      "bad_message_type",
      400,
      "This kind of launch is not supported.",
      clear,
    );
  }
  if (payload[CLAIM.version] !== LTI_VERSION)
    return reject("launch", "bad_version", 400, "Only LTI 1.3 launches are supported.", clear);
  const deploymentId = payload[CLAIM.deploymentId];
  if (typeof deploymentId !== "string" || !platform.deployment_ids.includes(deploymentId)) {
    return reject(
      "launch",
      "unknown_deployment",
      403,
      "This course link is not enabled for FirstPass.",
      clear,
    );
  }
  const link = payload[CLAIM.resourceLink] as { id?: unknown } | undefined;
  if (!link || typeof link.id !== "string" || !link.id) {
    return reject(
      "launch",
      "missing_resource_link",
      400,
      "The launch is missing its course link.",
      clear,
    );
  }

  const origin = new URL(request.url).origin;
  const allow = targetAllowlist(readEnv("LTI_TARGET_PATHS"));
  const custom = payload[CLAIM.custom] as Record<string, unknown> | undefined;
  const customPath = custom && typeof custom === "object" ? custom[CUSTOM_PATH_FIELD] : undefined;
  let raw: unknown = customPath;
  if (raw === undefined || raw === "") {
    raw = payload[CLAIM.targetLinkUri];
    // Canvas sends the launch URL itself as the target by default: that means the desk.
    if (typeof raw === "string") {
      try {
        const u = new URL(raw);
        if (u.origin === origin && u.pathname.replace(/\/+$/, "") === LTI_LAUNCH_PATH) raw = "/";
      } catch {
        /* resolveTarget rejects it */
      }
    }
  }
  const target = resolveTarget(raw, origin, allow);
  if (!target)
    return reject(
      "launch",
      "bad_target",
      400,
      "This course link points to a page FirstPass does not open from a course.",
      clear,
    );

  usedNonces.set(nonce, true);
  note("launch", "ok", 303);
  return new Response(null, {
    status: 303,
    headers: { Location: `${origin}${target}`, ...clear, ...NO_STORE },
  });
}

/* ---------------- jwks + config ---------------- */

export async function handleJwks(deps: LtiDeps = {}): Promise<Response> {
  const readEnv = deps.env ?? env;
  const result = await toolJwks(readEnv("LTI_TOOL_PUBLIC_JWK"), readEnv("LTI_TOOL_PRIVATE_JWK"));
  if (!result.ok) {
    logEvent("error", "lti.jwk_invalid", {});
    return misconfigured();
  }
  return json(200, { keys: result.keys });
}

export function handleConfig(request: Request): Response {
  return json(200, canvasConfig(new URL(request.url).origin));
}

/* ---------------- dispatch ---------------- */

const ROUTES: Record<string, readonly string[]> = {
  [LTI_LOGIN_PATH]: ["GET", "POST"],
  [LTI_LAUNCH_PATH]: ["POST"],
  [LTI_JWKS_PATH]: ["GET"],
  [LTI_CONFIG_PATH]: ["GET"],
};

export async function handleLtiRequest(request: Request, deps: LtiDeps = {}): Promise<Response> {
  const readEnv = deps.env ?? env;
  if (!ltiEnabled(readEnv)) return notFound();

  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  if (!pathname.startsWith(`${LTI_BASE_PATH}/`)) return notFound();
  const methods = ROUTES[pathname];
  if (!methods) return notFound();
  if (!methods.includes(request.method))
    return text(405, "Method not allowed", { Allow: methods.join(", ") });

  if (pathname === LTI_LOGIN_PATH || pathname === LTI_LAUNCH_PATH) {
    const key = (deps.clientKey ?? clientKey)(request);
    if (key !== SHARED_CLIENT && !limiter.take(key)) {
      void request.body?.cancel().catch(() => {});
      return reject(
        pathname === LTI_LOGIN_PATH ? "login" : "launch",
        "rate_limited",
        429,
        "Too many launches from here. Wait a minute and try again.",
        {
          "Retry-After": "60",
        },
      );
    }
  }

  const step = { ...deps, env: readEnv };
  switch (pathname) {
    case LTI_LOGIN_PATH:
      return handleLogin(request, step);
    case LTI_LAUNCH_PATH:
      return handleLaunch(request, step);
    case LTI_JWKS_PATH:
      return handleJwks(step);
    default:
      return handleConfig(request);
  }
}
