/**
 * /api/lti/* — LTI 1.3 core launch (OIDC login initiation, resource link launch, tool JWKS and
 * the Canvas developer-key JSON) and Deep Linking 2.0 (the content picker). Off unless
 * LTI_ENABLED is "1": every path answers 404.
 *
 * Privacy: the id_token is verified and only the claims needed to accept the launch are read
 * (issuer, audience, azp, exp, nonce, message type, version, deployment id, target and the
 * optional firstpass_path custom field; for the content picker also deep_link_return_url,
 * accept_types, accept_multiple, accept_presentation_document_targets and data). Names, emails
 * and user ids are never read, logged or stored, and nothing goes to a database. A launch grants
 * no license; program keys still apply.
 *
 * Content picker: a verified LtiDeepLinkingRequest renders the picker (./picker.ts). Its form
 * carries a picker token: a short-lived JWT signed with the tool key (LTI_TOOL_PRIVATE_JWK),
 * bound to that launch's platform, deployment, return URL and data, used once. The submit
 * answers with a page that posts an LtiDeepLinkingResponse JWT, signed with the same key, to the
 * platform's deep_link_return_url.
 */

import { createHash, randomBytes } from "node:crypto";
import {
  SignJWT,
  createRemoteJWKSet,
  importJWK,
  jwtVerify,
  type CryptoKey,
  type JWK,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import { env } from "@/lib/env.server";
import { BoundedLRUCache } from "@/lib/server/cache";
import { logEvent } from "@/lib/server/log";
import { SHARED_CLIENT, SlidingWindow, clientKey } from "@/lib/server/rate-limit";
import {
  CLAIM,
  CUSTOM_PATH_FIELD,
  LTI_BASE_PATH,
  LTI_CONFIG_PATH,
  LTI_DEEP_LINKING_REQUEST,
  LTI_DEEP_LINKING_RESPONSE,
  LTI_DEEP_LINK_PATH,
  LTI_JWKS_PATH,
  LTI_LAUNCH_PATH,
  LTI_LOGIN_PATH,
  LTI_RESOURCE_LINK_ITEM,
  LTI_RESOURCE_LINK_REQUEST,
  LTI_VERSION,
  STATE_TTL_SECONDS,
  canvasConfig,
  checkReturnUrl,
  clearStateCookie,
  decodeStateCookie,
  findPlatform,
  hasLtiControlChar,
  isValidState,
  ltiEnabled,
  parsePlatforms,
  readCookie,
  readDeepLinkSettings,
  resolveLaunchTarget,
  setStateCookie,
  stateCookieName,
  targetAllowlist,
  toolJwks,
  type DeepLinkSettings,
  type EnvReader,
  type LtiPlatform,
} from "./lti";

export const LTI_MAX_BODY_BYTES = 64 * 1024;
export const LTI_RATE = { max: 30, windowMs: 60_000 };
const CLOCK_TOLERANCE_S = 60;
/** How long the content picker stays usable after the launch. */
export const PICKER_TTL_SECONDS = 1200;
/** Lifetime of the LtiDeepLinkingResponse JWT: just the hop back to the platform. */
export const DL_RESPONSE_TTL_SECONDS = 300;
const PICKER_TYP = "fp-lti-picker+jwt";

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
/**
 * Picker tokens already used. Per server instance, like the nonce list: on a second instance a
 * token could be used again until it expires, which only re-sends the same answer to the same
 * course page.
 */
const usedPickers = new BoundedLRUCache<true>(
  20_000,
  (PICKER_TTL_SECONDS + CLOCK_TOLERANCE_S) * 1000,
);
const limiter = new SlidingWindow(LTI_RATE.max, LTI_RATE.windowMs);

export function resetLtiState() {
  usedNonces.clear();
  usedPickers.clear();
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

function html(
  status: number,
  body: string,
  csp: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": csp,
      ...NO_STORE,
      ...extra,
    },
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

type Step = "login" | "launch" | "deep_link";

/** One log line per outcome: a reason code only, never ids, names, emails or tokens. */
function note(step: Step, outcome: string, status: number) {
  logEvent(status >= 500 ? "error" : status >= 400 ? "warn" : "info", `lti.${step}`, {
    outcome,
    status,
  });
}

function reject(
  step: Step,
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
  if (type !== "application/x-www-form-urlencoded") {
    void request.body?.cancel().catch(() => {});
    return null;
  }
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
  const values = params.getAll(name);
  if (values.length === 0 || values.some(hasLtiControlChar)) return undefined;
  const t = values[0]!.trim();
  return t && t.length <= max ? t : undefined;
}

function hasInvalidOptionalParam(params: URLSearchParams, name: string, max: number): boolean {
  return params.getAll(name).some((v) => hasLtiControlChar(v) || v.trim().length > max);
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
  if (
    hasInvalidOptionalParam(params, "client_id", 512) ||
    hasInvalidOptionalParam(params, "lti_message_hint", 4096)
  )
    return reject("login", "bad_param", 400, "Invalid login parameters.");

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

  const messageType = payload[CLAIM.messageType];
  if (messageType !== LTI_RESOURCE_LINK_REQUEST && messageType !== LTI_DEEP_LINKING_REQUEST) {
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

  const origin = new URL(request.url).origin;
  if (messageType === LTI_DEEP_LINKING_REQUEST) {
    return startPicker({ payload, platform, deploymentId, nonce, origin, readEnv, deps, clear });
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

  const allow = targetAllowlist(readEnv("LTI_TARGET_PATHS"));
  const custom = payload[CLAIM.custom] as Record<string, unknown> | undefined;
  const customPath = custom && typeof custom === "object" ? custom[CUSTOM_PATH_FIELD] : undefined;
  let raw: unknown = customPath;
  if (raw === undefined || raw === "") {
    raw = payload[CLAIM.targetLinkUri];
    // Canvas sends the launch URL itself as the target by default: that means the desk.
    if (typeof raw === "string" && !hasLtiControlChar(raw)) {
      try {
        const u = new URL(raw);
        if (u.origin === origin && u.pathname.replace(/\/+$/, "") === LTI_LAUNCH_PATH) raw = "/";
      } catch {
        /* resolveTarget rejects it */
      }
    }
  }
  const target = resolveLaunchTarget(raw, origin, allow);
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

/* ---------------- deep linking: tool key ---------------- */

type ToolKey = { privateKey: CryptoKey; publicKey: CryptoKey; kid: string };
let toolKeyCache: { raw: string; pub: string | undefined; key: ToolKey } | null = null;

/**
 * The tool's signing key from LTI_TOOL_PRIVATE_JWK, with the kid /api/lti/jwks publishes for it.
 * Null when it is unset, broken, not RSA, or LTI_TOOL_PUBLIC_JWK is set to a different key.
 */
async function toolSigningKey(readEnv: EnvReader): Promise<ToolKey | null> {
  const raw = readEnv("LTI_TOOL_PRIVATE_JWK");
  const pubRaw = readEnv("LTI_TOOL_PUBLIC_JWK");
  if (!raw) return null;
  if (toolKeyCache && toolKeyCache.raw === raw && toolKeyCache.pub === pubRaw)
    return toolKeyCache.key;
  let priv: JWK;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    priv = parsed as JWK;
  } catch {
    return null;
  }
  if (priv.kty !== "RSA" || typeof priv.d !== "string" || typeof priv.n !== "string") return null;
  const published = await toolJwks(pubRaw, raw);
  if (!published.ok || published.keys.length !== 1) return null;
  const jwk = published.keys[0]!;
  if (jwk.n !== priv.n || jwk.e !== priv.e || !jwk.kid) return null;
  try {
    const { kid: _kid, alg: _alg, use: _use, key_ops: _ops, ext: _ext, ...material } = priv;
    const privateKey = await importJWK({ ...material, alg: "RS256" }, "RS256");
    const publicKey = await importJWK(jwk, "RS256");
    if (privateKey instanceof Uint8Array || publicKey instanceof Uint8Array) return null;
    const key = { privateKey, publicKey, kid: jwk.kid };
    toolKeyCache = { raw, pub: pubRaw, key };
    return key;
  } catch {
    return null;
  }
}

function toolKeyMissing(clear?: Record<string, string>) {
  logEvent("error", "lti.jwk_invalid", {});
  return reject(
    "deep_link",
    "no_tool_key",
    500,
    "The FirstPass content picker is not set up on this server yet.",
    clear,
  );
}

/* ---------------- deep linking: picker token ---------------- */

type PickerClaims = {
  jti: string;
  /** Platform issuer and client id. */
  pi: string;
  pc: string;
  dep: string;
  ret: string;
  data?: string;
  multi: boolean;
  win: boolean;
};

function nowSeconds(deps: LtiDeps): number {
  return deps.now?.() ?? Math.floor(Date.now() / 1000);
}

const pickerAudience = (origin: string) => `${origin}${LTI_DEEP_LINK_PATH}`;

async function signPickerToken(
  key: ToolKey,
  origin: string,
  now: number,
  c: Omit<PickerClaims, "jti">,
): Promise<string> {
  return new SignJWT({ ...c })
    .setProtectedHeader({ alg: "RS256", kid: key.kid, typ: PICKER_TYP })
    .setIssuer(origin)
    .setAudience(pickerAudience(origin))
    .setIssuedAt(now)
    .setExpirationTime(now + PICKER_TTL_SECONDS)
    .setJti(randomToken())
    .sign(key.privateKey);
}

function readPickerClaims(p: JWTPayload): PickerClaims | null {
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.length > 0 && v.length <= max && !hasLtiControlChar(v);
  if (!str(p.jti, 128) || !str(p.pi, 2048) || !str(p.pc, 512) || !str(p.dep, 512)) return null;
  if (!str(p.ret, 2048) || typeof p.multi !== "boolean" || typeof p.win !== "boolean") return null;
  if (p.data !== undefined && !str(p.data, 8192)) return null;
  return {
    jti: p.jti as string,
    pi: p.pi as string,
    pc: p.pc as string,
    dep: p.dep as string,
    ret: p.ret as string,
    ...(p.data !== undefined ? { data: p.data as string } : {}),
    multi: p.multi,
    win: p.win,
  };
}

/* ---------------- deep linking: pages ---------------- */

const PICKER_MESSAGES: Record<string, string> = {
  missing_settings:
    "The content picker launch is missing its settings. Open it again from your course.",
  bad_accept_types: "This part of your course cannot take a FirstPass link.",
  bad_return_url: "Your course site's return address is not registered with FirstPass.",
  bad_data: "The content picker launch is missing its settings. Open it again from your course.",
};

function pickerCsp(returnUrl: string): string {
  const back = new URL(returnUrl).origin;
  return `default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'self' ${back}; base-uri 'none'`;
}

let returnScriptHash: string | null = null;
function returnCsp(returnUrl: string, script: string): string {
  returnScriptHash ??= createHash("sha256").update(script, "utf8").digest("base64");
  const back = new URL(returnUrl).origin;
  return `default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${returnScriptHash}'; form-action ${back}; frame-ancestors 'self' ${back}; base-uri 'none'`;
}

type PickerLaunch = {
  payload: JWTPayload;
  platform: LtiPlatform;
  deploymentId: string;
  nonce: string;
  origin: string;
  readEnv: EnvReader;
  deps: LtiDeps;
  clear: Record<string, string>;
};

/** A verified LtiDeepLinkingRequest: check its settings, then render the picker. */
async function startPicker(a: PickerLaunch): Promise<Response> {
  const r = readDeepLinkSettings(a.payload[CLAIM.deepLinkingSettings], a.platform);
  if (!r.ok) return reject("launch", r.reason, 400, PICKER_MESSAGES[r.reason]!, a.clear);
  const settings: DeepLinkSettings = r.settings;
  const key = await toolSigningKey(a.readEnv);
  if (!key) return toolKeyMissing(a.clear);

  const allow = targetAllowlist(a.readEnv("LTI_TARGET_PATHS"));
  const { pickerGroups, renderPicker } = await import("./picker");
  const token = await signPickerToken(key, a.origin, nowSeconds(a.deps), {
    pi: a.platform.issuer,
    pc: a.platform.client_id,
    dep: a.deploymentId,
    ret: settings.returnUrl,
    ...(settings.data !== undefined ? { data: settings.data } : {}),
    multi: settings.multiple,
    win: settings.window,
  });

  usedNonces.set(a.nonce, true);
  note("launch", "picker", 200);
  return html(
    200,
    renderPicker({ token, groups: pickerGroups(a.origin, allow), multiple: settings.multiple }),
    pickerCsp(settings.returnUrl),
    a.clear,
  );
}

/** The picker form's post: search pair pages, cancel, or add the chosen items. */
export async function handleDeepLink(request: Request, deps: LtiDeps = {}): Promise<Response> {
  const readEnv = deps.env ?? env;
  const platforms = platformsFrom(readEnv);
  if (!platforms) return misconfigured();

  const form = await readForm(request);
  if (!form) return reject("deep_link", "bad_body", 400, "Expected a form post.");
  const token = stringParam(form, "token", 16_384);
  if (!token) return reject("deep_link", "missing_param", 400, "Missing picker parameters.");
  const key = await toolSigningKey(readEnv);
  if (!key) return toolKeyMissing();

  const origin = new URL(request.url).origin;
  const now = deps.now?.();
  let verified: PickerClaims | null;
  try {
    const { payload } = await jwtVerify(token, key.publicKey, {
      algorithms: ["RS256"],
      issuer: origin,
      audience: pickerAudience(origin),
      typ: PICKER_TYP,
      requiredClaims: ["exp", "iat", "jti"],
      clockTolerance: CLOCK_TOLERANCE_S,
      maxTokenAge: PICKER_TTL_SECONDS,
      ...(now !== undefined ? { currentDate: new Date(now * 1000) } : {}),
    });
    verified = readPickerClaims(payload);
  } catch {
    verified = null;
  }
  if (!verified)
    return reject(
      "deep_link",
      "bad_token",
      401,
      "This picker expired or could not be verified. Open it again from your course.",
    );
  const claims = verified;
  if (usedPickers.has(claims.jti))
    return reject(
      "deep_link",
      "replay",
      401,
      "This picker was already used. Open it again from your course.",
    );

  const platform = findPlatform(platforms, claims.pi, claims.pc);
  if (!platform || !platform.deployment_ids.includes(claims.dep))
    return reject(
      "deep_link",
      "unknown_deployment",
      403,
      "This course link is not enabled for FirstPass.",
    );
  const returnUrl = checkReturnUrl(claims.ret, platform);
  if (!returnUrl)
    return reject("deep_link", "bad_return_url", 400, PICKER_MESSAGES.bad_return_url!);

  const actions = form.getAll("action");
  const action = actions.length === 0 ? "add" : actions.length === 1 ? actions[0] : "";
  if (action !== "add" && action !== "find" && action !== "cancel")
    return reject("deep_link", "bad_action", 400, "Unknown picker action.");
  const values = form.getAll("item");
  if (values.length > 200 || values.some((v) => v.length > 2048 || hasLtiControlChar(v)))
    return reject("deep_link", "bad_item", 400, "That page cannot be added from a course.");
  const rawQuery = form.getAll("q");
  if (rawQuery.length > 1 || rawQuery.some((v) => hasLtiControlChar(v)))
    return reject("deep_link", "bad_param", 400, "Invalid picker parameters.");

  const allow = targetAllowlist(readEnv("LTI_TARGET_PATHS"));
  const picker = await import("./picker");
  const query = (rawQuery[0] ?? "").slice(0, picker.PAIR_QUERY_MAX);
  const chosen = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  const again = (status: number, outcome: string, error?: string) => {
    note("deep_link", outcome, status);
    return html(
      status,
      picker.renderPicker({
        token,
        groups: picker.pickerGroups(origin, allow),
        multiple: claims.multi,
        query,
        results: picker.searchPairs(query, origin, allow),
        selected: new Set(chosen),
        ...(error ? { error } : {}),
      }),
      pickerCsp(returnUrl),
    );
  };

  if (action === "find") return again(200, "find");

  const items: { path: string; title: string }[] = [];
  if (action === "add") {
    if (!chosen.length) return again(400, "no_item", "Pick an item first.");
    if (!claims.multi && chosen.length > 1)
      return again(400, "too_many", "This part of your course takes one item. Pick one.");
    if (chosen.length > picker.PICK_MAX)
      return again(400, "too_many", `Pick at most ${picker.PICK_MAX} items.`);
    for (const value of chosen) {
      const item = picker.pickerItem(value, origin, allow);
      if (!item)
        return reject("deep_link", "bad_item", 400, "That page cannot be added from a course.");
      items.push(item);
    }
  }

  const iat = now ?? Math.floor(Date.now() / 1000);
  const body: Record<string, unknown> = {
    nonce: randomToken(),
    [CLAIM.messageType]: LTI_DEEP_LINKING_RESPONSE,
    [CLAIM.version]: LTI_VERSION,
    [CLAIM.deploymentId]: claims.dep,
    [CLAIM.dlContentItems]: items.map((i) => ({
      type: LTI_RESOURCE_LINK_ITEM,
      title: i.title,
      url: `${origin}${LTI_LAUNCH_PATH}`,
      custom: { [CUSTOM_PATH_FIELD]: i.path },
      ...(claims.win ? { window: { targetName: "_blank" } } : {}),
    })),
  };
  if (claims.data !== undefined) body[CLAIM.dlData] = claims.data;
  const jwt = await new SignJWT(body)
    .setProtectedHeader({ alg: "RS256", kid: key.kid, typ: "JWT" })
    .setIssuer(platform.client_id)
    .setAudience(platform.issuer)
    .setIssuedAt(iat)
    .setExpirationTime(iat + DL_RESPONSE_TTL_SECONDS)
    .sign(key.privateKey);

  usedPickers.set(claims.jti, true);
  note("deep_link", action === "cancel" ? "cancel" : "ok", 200);
  return html(200, picker.renderReturn(returnUrl, jwt), returnCsp(returnUrl, picker.RETURN_SCRIPT));
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
  [LTI_DEEP_LINK_PATH]: ["POST"],
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

  if (
    pathname === LTI_LOGIN_PATH ||
    pathname === LTI_LAUNCH_PATH ||
    pathname === LTI_DEEP_LINK_PATH
  ) {
    const key = (deps.clientKey ?? clientKey)(request);
    if (key !== SHARED_CLIENT && !limiter.take(key)) {
      void request.body?.cancel().catch(() => {});
      return reject(
        pathname === LTI_LOGIN_PATH
          ? "login"
          : pathname === LTI_LAUNCH_PATH
            ? "launch"
            : "deep_link",
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
    case LTI_DEEP_LINK_PATH:
      return handleDeepLink(request, step);
    case LTI_JWKS_PATH:
      return handleJwks(step);
    default:
      return handleConfig(request);
  }
}
