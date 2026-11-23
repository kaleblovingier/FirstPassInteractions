/**
 * LTI 1.3 core launch, pure parts: platform config, the redirect allowlist, the state cookie and
 * the Canvas developer-key JSON. The request handling is in ./lti.server.ts.
 *
 * Scope: OIDC third-party login, LtiResourceLinkRequest and Deep Linking 2.0 (the content picker:
 * LtiDeepLinkingRequest in, LtiDeepLinkingResponse with ltiResourceLink items out). No Assignment
 * and Grade Services, no Names and Role Provisioning. A launch only opens a FirstPass page; it
 * reads no name, email or user id, stores nothing and grants no license.
 * docs/ops/lti-canvas-setup.md has the setup steps.
 */

import { z } from "zod";
import { calculateJwkThumbprint, type JWK } from "jose";
import { COURSE_KIT_MODULES, COURSE_KIT_PATH } from "@/lib/seo/course-kit";
import { GRADES, PRACTICE_ENZYMES } from "@/lib/learn/practice-meta";

export const LTI_BASE_PATH = "/api/lti";
export const LTI_LOGIN_PATH = `${LTI_BASE_PATH}/login`;
export const LTI_LAUNCH_PATH = `${LTI_BASE_PATH}/launch`;
export const LTI_JWKS_PATH = `${LTI_BASE_PATH}/jwks`;
export const LTI_CONFIG_PATH = `${LTI_BASE_PATH}/config`;
/** The content picker's form posts here (Deep Linking). */
export const LTI_DEEP_LINK_PATH = `${LTI_BASE_PATH}/deep-link`;

export const LTI_VERSION = "1.3.0";
export const LTI_RESOURCE_LINK_REQUEST = "LtiResourceLinkRequest";
export const LTI_DEEP_LINKING_REQUEST = "LtiDeepLinkingRequest";
export const LTI_DEEP_LINKING_RESPONSE = "LtiDeepLinkingResponse";
/** The only content item type the picker returns. */
export const LTI_RESOURCE_LINK_ITEM = "ltiResourceLink";

/** IMS claim names this tool reads. Nothing else in the id_token is read. */
export const CLAIM = {
  messageType: "https://purl.imsglobal.org/spec/lti/claim/message_type",
  version: "https://purl.imsglobal.org/spec/lti/claim/version",
  deploymentId: "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
  targetLinkUri: "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
  resourceLink: "https://purl.imsglobal.org/spec/lti/claim/resource_link",
  custom: "https://purl.imsglobal.org/spec/lti/claim/custom",
  deepLinkingSettings: "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings",
  /** Deep Linking response claims (written, not read). */
  dlData: "https://purl.imsglobal.org/spec/lti-dl/claim/data",
  dlContentItems: "https://purl.imsglobal.org/spec/lti-dl/claim/content_items",
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

/** A bare host name, optionally with a port: lower case, no scheme, path, user or wildcard. */
const HOST_RE =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::\d{1,5})?$/;
const hostName = z.string().trim().toLowerCase().max(260).regex(HOST_RE, "must be a host name");

export const platformSchema = z.object({
  issuer: httpsUrl,
  client_id: nonEmpty,
  auth_endpoint: httpsUrl,
  jwks_uri: httpsUrl,
  deployment_ids: z.array(nonEmpty).min(1).max(100),
  /**
   * Hosts the content picker may send its answer back to (deep_link_return_url). Optional;
   * without it only the issuer's own host is allowed. Canvas cloud needs it: the issuer is
   * canvas.instructure.com but the return URL is on the school's host (school.instructure.com).
   */
  deep_link_return_hosts: z.array(hostName).min(1).max(20).optional(),
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

/**
 * Pages a launch may open. "/" matches the desk only; other entries also match their sub-paths.
 * "/class" and "/pair" are on the list so the content picker can offer class and pair pages.
 */
export const DEFAULT_TARGET_PATHS = [
  "/",
  "/practice",
  "/pairs",
  "/for-programs",
  "/class",
  "/pair",
] as const;

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

/** Course kit week anchors a launch may keep (#cyp-basics and so on). */
const KIT_WEEK_IDS: ReadonlySet<string> = new Set(COURSE_KIT_MODULES.map((m) => m.id));
const PRACTICE_CLASS_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * resolveTarget plus the few extras a course link may carry, each checked against a fixed list:
 * on /practice the enzyme, grade and class deck filters, and on the course kit a week anchor.
 * Every other query parameter and fragment is dropped, as resolveTarget does.
 */
export function resolveLaunchTarget(
  raw: unknown,
  origin: string,
  allow: readonly string[],
): string | null {
  const path = resolveTarget(raw, origin, allow);
  if (!path || typeof raw !== "string") return path;
  const url = new URL(raw.trim(), origin);
  if (path === "/practice") {
    const q = new URLSearchParams();
    const one = (name: string) => {
      const all = url.searchParams.getAll(name);
      return all.length === 1 ? all[0]! : undefined;
    };
    const enzyme = one("enzyme");
    if (enzyme && (PRACTICE_ENZYMES as readonly string[]).includes(enzyme)) q.set("enzyme", enzyme);
    const grade = one("grade");
    if (grade && (GRADES as readonly string[]).includes(grade)) q.set("grade", grade);
    const cls = one("class");
    if (cls && cls.length <= 80 && PRACTICE_CLASS_RE.test(cls)) q.set("class", cls);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  }
  if (path === COURSE_KIT_PATH) {
    const id = url.hash.slice(1);
    return id && KIT_WEEK_IDS.has(id) ? `${path}#${id}` : path;
  }
  return path;
}

/* ---------------- deep linking ---------------- */

/** Hosts a platform's deep_link_return_url may use: its deep_link_return_hosts, else the issuer's host. */
export function returnHosts(platform: LtiPlatform): string[] {
  return platform.deep_link_return_hosts ?? [new URL(platform.issuer).host];
}

/**
 * The deep_link_return_url when it is https, has no credentials or fragment, and is on one of
 * the platform's return hosts. Anything else: null.
 */
export function checkReturnUrl(raw: unknown, platform: LtiPlatform): string | null {
  if (typeof raw !== "string" || !raw || raw.length > 2048 || hasLtiControlChar(raw)) return null;
  if (raw !== raw.trim() || raw.includes("\\")) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
  return returnHosts(platform).includes(url.host) ? url.toString() : null;
}

/** Longest deep_linking_settings.data value echoed back. */
export const DL_DATA_MAX = 8192;

export type DeepLinkSettings = {
  returnUrl: string;
  multiple: boolean;
  /** The platform accepts the "window" presentation target, so items can open in a new tab. */
  window: boolean;
  data?: string;
};

export type DeepLinkSettingsResult =
  | { ok: true; settings: DeepLinkSettings }
  | {
      ok: false;
      reason: "missing_settings" | "bad_accept_types" | "bad_return_url" | "bad_data";
    };

/**
 * Reads deep_linking_settings: deep_link_return_url, accept_types, accept_multiple,
 * accept_presentation_document_targets and data. Nothing else in it (title, text) is read.
 */
export function readDeepLinkSettings(
  claim: unknown,
  platform: LtiPlatform,
): DeepLinkSettingsResult {
  if (!claim || typeof claim !== "object" || Array.isArray(claim))
    return { ok: false, reason: "missing_settings" };
  const c = claim as Record<string, unknown>;
  const types = c.accept_types;
  if (!Array.isArray(types) || !types.includes(LTI_RESOURCE_LINK_ITEM))
    return { ok: false, reason: "bad_accept_types" };
  const returnUrl = checkReturnUrl(c.deep_link_return_url, platform);
  if (!returnUrl) return { ok: false, reason: "bad_return_url" };
  const data = c.data;
  if (
    data !== undefined &&
    (typeof data !== "string" || data.length > DL_DATA_MAX || hasLtiControlChar(data))
  )
    return { ok: false, reason: "bad_data" };
  const targets = c.accept_presentation_document_targets;
  return {
    ok: true,
    settings: {
      returnUrl,
      multiple: c.accept_multiple === true,
      window: Array.isArray(targets) && targets.includes("window"),
      ...(typeof data === "string" && data ? { data } : {}),
    },
  };
}

/** Escapes text for HTML element content and quoted attributes. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

export type CanvasPlacement = {
  placement: string;
  message_type: string;
  target_link_uri: string;
  text: string;
  windowTarget?: "_blank";
};

/**
 * Canvas "Paste JSON" configuration for an LTI 1.3 developer key. No scopes (no grades, no
 * rosters), anonymous privacy, one course navigation link that opens in a new tab, and the
 * content picker (Deep Linking) in two places: adding a module item or link (link_selection)
 * and a new assignment with an external tool submission (assignment_selection).
 */
export function canvasConfig(origin: string) {
  const host = new URL(origin).host;
  const launch = `${origin}${LTI_LAUNCH_PATH}`;
  const placements: CanvasPlacement[] = [
    {
      placement: "course_navigation",
      message_type: LTI_RESOURCE_LINK_REQUEST,
      target_link_uri: launch,
      text: TOOL_TITLE,
      windowTarget: "_blank",
    },
    {
      placement: "link_selection",
      message_type: LTI_DEEP_LINKING_REQUEST,
      target_link_uri: launch,
      text: TOOL_TITLE,
    },
    {
      placement: "assignment_selection",
      message_type: LTI_DEEP_LINKING_REQUEST,
      target_link_uri: launch,
      text: TOOL_TITLE,
    },
  ];
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
          placements,
        },
      },
    ],
    custom_fields: {},
  };
}
