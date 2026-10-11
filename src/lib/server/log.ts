/**
 * One-line JSON logs for server code. Fields carry operational facts only (event, source,
 * status, durationMs, counts, cache hit/miss, error class) — never request payloads, search
 * text, regimens, host context, license keys, API keys or URLs that embed them.
 */

export type LogLevel = "info" | "warn" | "error";
export type LogValue = string | number | boolean | null | undefined;
export type LogSink = (level: LogLevel, line: string) => void;

let sink: LogSink | null = null;

/** Route log lines elsewhere (tests capture or drop them); `null` restores the console. */
export function setLogSink(next: LogSink | null) {
  sink = next;
}

export function logEvent(level: LogLevel, event: string, fields: Record<string, LogValue> = {}) {
  const line = JSON.stringify({ level, event, ...fields, at: new Date().toISOString() });
  if (sink) sink(level, line);
  else if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Error class name only — messages can carry URLs or upstream text. */
export function errorKind(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  return typeof error;
}
