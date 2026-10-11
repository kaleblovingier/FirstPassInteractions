/**
 * Upstream JSON calls for server modules. Every call has a hard deadline that covers the body
 * read, idempotent GETs get at most one jittered retry on 429/503, and failures surface as a
 * typed UpstreamError whose message never carries the URL (query strings can hold drug names
 * or keys). One `upstream.fetch` log line per call: source, host, status, attempts, duration.
 */

import { logEvent, type LogLevel } from "./log";

export type UpstreamFailure = "timeout" | "http" | "network" | "malformed";

export class UpstreamError extends Error {
  readonly source: string;
  readonly kind: UpstreamFailure;
  readonly status?: number;

  constructor(source: string, kind: UpstreamFailure, status?: number) {
    super(status ? `${source}: ${kind} ${status}` : `${source}: ${kind}`);
    this.name = "UpstreamError";
    this.source = source;
    this.kind = kind;
    this.status = status;
  }
}

export interface FetchJsonOptions {
  /** Short log label such as "openfda.label" — never a URL. */
  source: string;
  /** Budget for the whole call, retry included. */
  timeoutMs?: number;
  /** Caller deadline; when it aborts, the call ends as a timeout. */
  signal?: AbortSignal;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  /** Resolve a 404 as null, for APIs that answer "no match" with 404 (OpenFDA, PubChem). */
  notFoundAsEmpty?: boolean;
  /** One jittered retry on 429/503; GET only. Defaults to true. */
  retry?: boolean;
  maxBytes?: number;
}

export const UPSTREAM_TIMEOUT_MS = 6_000;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const RETRY_STATUS = new Set([429, 503]);
const RETRY_BASE_MS = 250;
const RETRY_JITTER_MS = 250;
const RETRY_MAX_WAIT_MS = 1_500;
const RETRY_MIN_WINDOW_MS = 1_000;

interface Reply {
  status: number;
  ok: boolean;
  text: string;
  retryAfter: string | null;
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

/** Settles with `work`, or rejects as soon as `signal` aborts — even if `work` ignores it. */
function untilAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function pause(ms: number, signal: AbortSignal | undefined, source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UpstreamError(source, "timeout"));
      return;
    }
    const stop = () => {
      clearTimeout(timer);
      reject(new UpstreamError(source, "timeout"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      resolve();
    }, ms);
    signal?.addEventListener("abort", stop, { once: true });
  });
}

function retryDelay(retryAfter: string | null) {
  const hinted = Number(retryAfter);
  const base =
    Number.isFinite(hinted) && hinted > 0 ? Math.min(hinted * 1000, RETRY_MAX_WAIT_MS) : RETRY_BASE_MS;
  return base + Math.random() * RETRY_JITTER_MS;
}

async function send(url: string, options: FetchJsonOptions, windowMs: number): Promise<Reply> {
  const { source, signal } = options;
  if (signal?.aborted || windowMs <= 0) throw new UpstreamError(source, "timeout");
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, windowMs);
  const relay = () => ctrl.abort();
  signal?.addEventListener("abort", relay, { once: true });
  try {
    const res = await untilAbort(
      fetch(url, {
        method: options.method ?? "GET",
        headers: options.headers,
        body: options.body,
        signal: ctrl.signal,
      }),
      ctrl.signal,
    );
    if (!res.ok) {
      void res.body?.cancel().catch(() => undefined);
      return { status: res.status, ok: false, text: "", retryAfter: res.headers.get("retry-after") };
    }
    const limit = options.maxBytes ?? MAX_BODY_BYTES;
    if (Number(res.headers.get("content-length") ?? 0) > limit) {
      void res.body?.cancel().catch(() => undefined);
      throw new UpstreamError(source, "malformed", res.status);
    }
    const text = await untilAbort(res.text(), ctrl.signal);
    if (text.length > limit) throw new UpstreamError(source, "malformed", res.status);
    return { status: res.status, ok: true, text, retryAfter: null };
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (timedOut || signal?.aborted) throw new UpstreamError(source, "timeout");
    throw new UpstreamError(source, "network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relay);
  }
}

function parseJson(text: string, source: string, status: number): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamError(source, "malformed", status);
  }
}

/**
 * GET (or POST) a JSON document. Resolves with the parsed body — or null for a 404 when
 * `notFoundAsEmpty` is set — and rejects only with UpstreamError.
 */
export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  const { source } = options;
  const method = options.method ?? "GET";
  const started = Date.now();
  const deadline = started + (options.timeoutMs ?? UPSTREAM_TIMEOUT_MS);
  let attempts = 1;
  let status: number | undefined;
  const finish = (level: LogLevel, outcome: string) =>
    logEvent(level, "upstream.fetch", {
      source,
      host: hostOf(url),
      method,
      status,
      attempts,
      durationMs: Date.now() - started,
      outcome,
    });

  try {
    let reply = await send(url, options, deadline - Date.now());
    if (method === "GET" && options.retry !== false && RETRY_STATUS.has(reply.status)) {
      const wait = retryDelay(reply.retryAfter);
      if (deadline - Date.now() - wait >= RETRY_MIN_WINDOW_MS) {
        await pause(wait, options.signal, source);
        attempts = 2;
        reply = await send(url, options, deadline - Date.now());
      }
    }
    status = reply.status;
    if (reply.ok) {
      const value = parseJson(reply.text, source, reply.status);
      finish("info", "ok");
      return value;
    }
    if (reply.status === 404 && options.notFoundAsEmpty) {
      finish("info", "empty");
      return null;
    }
    throw new UpstreamError(source, "http", reply.status);
  } catch (error) {
    const failure = error instanceof UpstreamError ? error : new UpstreamError(source, "network");
    status = failure.status ?? status;
    finish("warn", failure.kind);
    throw failure;
  }
}

/** Reader-facing verb phrase for a failed call; works after a singular or plural source name. */
export function failurePhrase(error: unknown): string {
  if (!(error instanceof UpstreamError)) return "didn't answer";
  if (error.kind === "timeout") return "didn't answer in time";
  if (error.kind === "malformed") return "sent an answer we couldn't read";
  if (error.kind === "network") return "couldn't be reached";
  return error.status === 429 ? "hit a rate limit" : "answered with an error";
}

/** One phrase for several failures: theirs if they agree, a neutral one if they differ. */
export function sharedFailurePhrase(errors: readonly unknown[]): string {
  const phrases = [...new Set(errors.map(failurePhrase))];
  return phrases.length === 1 ? phrases[0]! : "didn't answer";
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Promise.allSettled over `items`, with at most `limit` calls of `fn` running at once. */
export async function mapSettled<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]!, index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  const lanes = Math.min(Math.max(1, Math.floor(limit)), items.length);
  await Promise.all(Array.from({ length: lanes }, worker));
  return results;
}
