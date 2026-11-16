/**
 * LTI 1.3 core launch, pure parts: platform config, the redirect allowlist, the state cookie and
 * the Canvas developer-key JSON. The request handling is in ./lti.server.ts.
 *
 * Scope: OIDC third-party login plus LtiResourceLinkRequest only. No Assignment and Grade
 * Services, no Names and Role Provisioning, no Deep Linking. A launch only opens a FirstPass page;
 * it reads no name, email or user id, stores nothing and grants no license.
 * docs/ops/lti-canvas-setup.md has the setup steps.
 */

import { z } from "zod";
import { calculateJwkThumbprint, type JWK } from "jose";

export const LTI_BASE_PATH = "/api/lti";
export const LTI_LOGIN_PATH = `${LTI_BASE_PATH}/login`;
export const LTI_LAUNCH_PATH = `${LTI_BASE_PATH}/launch`;
export const LTI_JWKS_PATH = `${LTI_BASE_PATH}/jwks`;
export const LTI_CONFIG_PATH = `${LTI_BASE_PATH}/config`;

export const LTI_VERSION = "1.3.0";
export const LTI_RESOURCE_LINK_REQUEST = "LtiResourceLinkRequest";

/** IMS claim names this tool reads. Nothing else in the id_token is read. */
export const CLAIM = {
  messageType: "https://purl.imsglobal.org/spec/lti/claim/message_type",
  version: "https://purl.imsglobal.org/spec/lti/claim/version",
  deploymentId: "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
  targetLinkUri: "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
  resourceLink: "https://purl.imsglobal.org/spec/lti/claim/resource_link",
  custom: "https://purl.imsglobal.org/spec/lti/claim/custom",
} as const;

/** Custom field a course designer can set on the placement to pick the page, e.g. firstpass_path=/practice. */
export const CUSTOM_PATH_FIELD = "firstpass_path";

/** The state cookie lives this long: enough for the platform round trip, no more. */
export const STATE_TTL_SECONDS = 600;
const STATE_COOKIE_PREFIX = "__Secure-fplti_";
const STATE_RE = /^[A-Za-z0-9_-]{32,128}$/;

/* ---------------- enabled flag ---------------- */

export type EnvReader = (key: string) => string | undefined;

/** Off unless LTI_ENABLED is exactly "1". */
export function ltiEnabled(readEnv: EnvReader): boolean {
  return readEnv("LTI_ENABLED") === "1";
}

/* ---------------- platform config ---------------- */

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password && !u.hash;
    } catch {
      return false;
    }
  }, "must be an https URL");

const nonEmpty = z.string().trim().min(1).max(512);

export const platformSchema = z.object({
  issuer: httpsUrl,
  client_id: nonEmpty,
  auth_endpoint: httpsUrl,
  jwks_uri: httpsUrl,
  deployment_ids: z.array(nonEmpty).min(1).max(100),
});

export const platformsSchema = z.array(platformSchema).min(1).max(50);

export type LtiPlatform = z.infer<typeof platformSchema>;

export type PlatformsResult =
  { ok: true; platforms: LtiPlatform[] } | { ok: false; issues: number };

/** Parses LTI_PLATFORMS. A failure reports only how many problems there were, never the values. */
export function parsePlatforms(raw: string | undefined): PlatformsResult {
  if (!raw) return { ok: false, issues: 1 };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, issues: 1 };
  }
  const parsed = platformsSchema.safeParse(json);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.length };
  const seen = new Set<string>();
  for (const p of parsed.data) {
    const key = `${p.issuer}\n${p.client_id}`;
    if (seen.has(key)) return { ok: false, issues: 1 };
    seen.add(key);
  }
  return { ok: true, platforms: parsed.data };
}

/**
 * The platform a login is for. client_id is optional in the spec; without it the issuer must
 * match exactly one configured platform.
 */
export function findPlatform(
  platforms: LtiPlatform[],
  issuer: string,
  clientId?: string,
): LtiPlatform | null {
  const byIssuer = platforms.filter((p) => p.issuer === issuer);
  if (clientId !== undefined) return byIssuer.find((p) => p.client_id === clientId) ?? null;
  return byIssuer.length === 1 ? byIssuer[0]! : null;
}

/* ---------------- control char guard ---------------- */

/**
 * Returns true if `value` contains any ASCII C0/DEL (`\u0000-\u001f`, `\u007f`)
 * or Unicode C1 (`\u0080-\u009f`) control character.
 */
export function hasLtiControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/* ---------------- redirect allowlist ---------------- */

/** Pages a launch may open. "/" matches the desk only; other entries also match their sub-paths. */
export const DEFAULT_TARGET_PATHS = ["/", "/practice", "/pairs", "/for-programs"] as const;

const SAFE_PATH_RE = /^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*)?$/;

/** A path that is safe to put in the allowlist: plain segments, no dots-only segment, no API path. */
export function isSafeAllowPath(path: string): boolean {
  if (!SAFE_PATH_RE.test(path)) return false;
  const segments = path.split("/").slice(1);
  if (segments.some((s) => s === "." || s === "..")) return false;
  return !(path === "/api" || path.startsWith("/api/"));
}

/** LTI_TARGET_PATHS (comma-separated) when every entry is safe, else the default list. */
export function targetAllowlist(raw: string | undefined): string[] {
  if (!raw) return [...DEFAULT_TARGET_PATHS];
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.length > 1 ? s.replace(/\/+$/, "") : s));
  if (!list.length || !list.every(isSafeAllowPath)) return [...DEFAULT_TARGET_PATHS];
  return [...new Set(list)];
}

export function pathAllowed(pathname: string, allow: readonly string[]): boolean {
  return allow.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Turns a launch target into a same-origin path on the allowlist, or null.
 * Rejects other origins, protocol-relative and backslash tricks, encoded slashes, control
 * characters, credentials and anything off the list. Query and fragment are dropped.
 */
export function resolveTarget(
  raw: unknown,
  origin: string,
  allow: readonly string[],
): string | null {
  if (typeof raw !== "string") return null;
  if (hasLtiControlChar(raw)) return null;
  const value = raw.trim();
  if (!value || value.length > 2048) return null;
  if (value.includes("\\")) return null;
  if (/%2f|%5c|%2e/i.test(value)) return null;
  if (value.startsWith("//")) return null;
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin || url.username || url.password) return null;
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  if (pathname.includes("//") || !SAFE_PATH_RE.test(pathname)) return null;
  return pathAllowed(pathname, allow) ? pathname : null;
}

/* ---------------- state cookie ---------------- */

export type StateCookie = { nonce: string; issuer: string; clientId: string };

export function isValidState(state: unknown): state is string {
  return typeof state === "string" && STATE_RE.test(state);
}

export function stateCookieName(state: string): string {
  return `${STATE_COOKIE_PREFIX}${state}`;
}

export function encodeStateCookie(v: StateCookie): string {
  return Buffer.from(JSON.stringify({ n: v.nonce, i: v.issuer, c: v.clientId }), "utf8").toString(
    "base64url",
  );
}

export function decodeStateCookie(raw: string | undefined): StateCookie | null {
  if (!raw || raw.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const v = parsed as Record<string, unknown>;
    if (typeof v.n !== "string" || typeof v.i !== "string" || typeof v.c !== "string") return null;
    if (!STATE_RE.test(v.n)) return null;
    if (v.i.length < 1 || v.i.length > 2048 || hasLtiControlChar(v.i)) return null;
    if (v.c.length < 1 || v.c.length > 512 || hasLtiControlChar(v.c)) return null;
    return { nonce: v.n, issuer: v.i, clientId: v.c };
  } catch {
    return null;
  }
}

/** HttpOnly, Secure, SameSite=None (the launch is a cross-site form post), scoped to /api/lti. */
export function setStateCookie(
  state: string,
  value: StateCookie,
  maxAge = STATE_TTL_SECONDS,
): string {
  return `${stateCookieName(state)}=${encodeStateCookie(value)}; Max-Age=${maxAge}; Path=${LTI_BASE_PATH}; HttpOnly; Secure; SameSite=None`;
}

export function clearStateCookie(state: string): string {
  return `${stateCookieName(state)}=; Max-Age=0; Path=${LTI_BASE_PATH}; HttpOnly; Secure; SameSite=None`;
}

/** One cookie's value from a Cookie header, or undefined. */
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

/* ---------------- tool keys ---------------- */

const PRIVATE_MEMBERS = ["d", "p", "q", "dp", "dq", "qi", "oth", "k"] as const;

export type ToolJwksResult = { ok: true; keys: JWK[] } | { ok: false };

/**
 * The tool's public JWKS: LTI_TOOL_PUBLIC_JWK, else the public half of LTI_TOOL_PRIVATE_JWK.
 * Neither set: an empty key list. Private members never leave this function.
 */
export async function toolJwks(
  publicRaw: string | undefined,
  privateRaw: string | undefined,
): Promise<ToolJwksResult> {
  const raw = publicRaw ?? privateRaw;
  if (!raw) return { ok: true, keys: [] };
  let jwk: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false };
    jwk = { ...(parsed as Record<string, unknown>) };
  } catch {
    return { ok: false };
  }
  if (jwk.kty !== "RSA" || typeof jwk.n !== "string" || typeof jwk.e !== "string")
    return { ok: false };
  for (const m of PRIVATE_MEMBERS) delete jwk[m];
  const out: JWK = { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" };
  try {
    out.kid = typeof jwk.kid === "string" && jwk.kid ? jwk.kid : await calculateJwkThumbprint(out);
  } catch {
    return { ok: false };
  }
  return { ok: true, keys: [out] };
}

/* ---------------- Canvas developer key JSON ---------------- */

export const TOOL_TITLE = "FirstPass";
export const TOOL_DESCRIPTION =
  "FirstPass study desk for drug interactions. Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

/**
 * Canvas "Paste JSON" configuration for an LTI 1.3 developer key. No scopes (no grades, no
 * rosters), anonymous privacy, one course navigation link that opens in a new tab.
 */
export function canvasConfig(origin: string) {
  const host = new URL(origin).host;
  const launch = `${origin}${LTI_LAUNCH_PATH}`;
  return {
    title: TOOL_TITLE,
    description: TOOL_DESCRIPTION,
    oidc_initiation_url: `${origin}${LTI_LOGIN_PATH}`,
    target_link_uri: launch,
    public_jwk_url: `${origin}${LTI_JWKS_PATH}`,
    scopes: [] as string[],
    extensions: [
      {
        domain: host,
        tool_id: "firstpass",
        platform: "canvas.instructure.com",
        privacy_level: "anonymous",
        settings: {
          text: TOOL_TITLE,
          placements: [
            {
              placement: "course_navigation",
              message_type: LTI_RESOURCE_LINK_REQUEST,
              target_link_uri: launch,
              text: TOOL_TITLE,
              windowTarget: "_blank",
            },
          ],
        },
      },
    ],
    custom_fields: {},
  };
}
