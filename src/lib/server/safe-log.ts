/**
 * Safe error logging for server code. Emits only the error's class name and a
 * short alphanumeric code — never the message, stack, cause, request bodies,
 * emails, cookies, tokens or keys (see /privacy: logs are designed not to
 * record request contents, emails or keys).
 */

const CODE_RE = /^[A-Za-z0-9_.-]{1,40}$/;

export interface SafeErrorFields {
  errorName: string;
  errorCode?: string;
}

/** Reduce any thrown value / error object to its name and code only. */
export function safeErrorFields(err: unknown): SafeErrorFields {
  if (err === null || err === undefined) return { errorName: String(err) };
  if (typeof err !== "object") return { errorName: typeof err };
  const e = err as { name?: unknown; code?: unknown; status?: unknown; constructor?: { name?: unknown } };
  let name =
    typeof e.name === "string" && e.name ? e.name
    : typeof e.constructor?.name === "string" && e.constructor.name ? e.constructor.name
    : "Object";
  if (!CODE_RE.test(name)) name = "Error";
  const rawCode = e.code ?? e.status;
  const code = typeof rawCode === "string" || typeof rawCode === "number" ? String(rawCode) : undefined;
  return code && CODE_RE.test(code) && !code.includes("@") ? { errorName: name, errorCode: code } : { errorName: name };
}

/** Log a labelled failure with name/code only. `label` must be a static string. */
export function logSafeError(label: string, err?: unknown): void {
  if (arguments.length < 2) {
    console.error(label);
    return;
  }
  const f = safeErrorFields(err);
  console.error(label, f.errorCode ? `${f.errorName} (${f.errorCode})` : f.errorName);
}
