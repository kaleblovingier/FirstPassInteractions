import { READER_TITLES, sanitizeBrief, type ReaderBrief, type ReaderId, type ReaderNote } from "./readers";
import { BoundedLRUCache } from "../server/cache";
import { UpstreamError, fetchJson } from "../server/http";
import { logEvent } from "../server/log";

const ORDER: ReaderId[] = ["pair", "gap", "trainee"];

/** Each ask is three model calls on the app owner's xAI key. */
const READER_TIMEOUT_MS = 15_000;
const READ_TTL_MS = 10 * 60 * 1000;
const ASK_WINDOW_MS = 60 * 1000;
const ASKS_PER_WINDOW = 30;

/** Same brief, same reading: a repeat ask within ten minutes costs nothing. */
export const readCache = new BoundedLRUCache<ReaderNote[]>(200, READ_TTL_MS);
const askTimes: number[] = [];

const SYSTEM: Record<ReaderId, string> = {
  pair: "You are the pair reader on a teaching desk. Restate only the sharpest mapped row in the JSON, in two short sentences, everyday words. If clock is present, restate that start and stop in the JSON's own words. If source is present, name that source and no other. If fold is present, restate that fold in the JSON's own words and no other number. If hands is present, do not name a facility, a ZIP, or a treatment. Hands is not a finding. Do not name a milligram, a stop order, a hold, a switch, or a substitute. Do not say a combination is safe.",
  gap: "You are the gap reader. Restate each quiet pair and the reason already written in quiet. Do not add a pair that is not in quiet. End with this exact sentence: A blank pair is not a clearance. Do not invent an interaction, a milligram, or a next step. If quiet is empty, say every pair on this list has a mapped row, and that is still not a clearance.",
  trainee: "You are the trainee reader. Ask one question a student can answer from the JSON, then answer it in one sentence using only a fact already in the JSON. Prefer the clock, the victim type, or the source if those fields are present. Do not add a drug, a milligram, a source, or a protocol.",
};

function scrub(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (/\b(discontinue|stop taking|hold the|switch to|take \d|start \d)\b/i.test(clean)) {
    return "This reader stepped outside the map. The note was dropped. It is not a finding.";
  }
  return clean.replace(/\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|mL|units|iu)\b/gi, "[not a dose]").slice(0, 520);
}

/** Rolling per-instance cap on asks; a shared limit across instances needs a store. */
function takeAskSlot(now = Date.now()) {
  while (askTimes.length && now - askTimes[0]! >= ASK_WINDOW_MS) askTimes.shift();
  if (askTimes.length >= ASKS_PER_WINDOW) return false;
  askTimes.push(now);
  return true;
}

/** Test hook: forget past asks. */
export function resetReaderBudget() {
  askTimes.length = 0;
}

async function askOne(id: ReaderId, brief: ReaderBrief, apiKey: string): Promise<ReaderNote> {
  const title = READER_TITLES[id];
  try {
    const body = (await fetchJson("https://api.x.ai/v1/chat/completions", {
      source: "xai.chat",
      method: "POST",
      timeoutMs: READER_TIMEOUT_MS,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 160,
        messages: [
          { role: "system", content: SYSTEM[id] },
          { role: "user", content: JSON.stringify(brief) },
        ],
      }),
    })) as { choices?: { message?: { content?: unknown } }[] } | null;
    const content = body?.choices?.[0]?.message?.content;
    const text = scrub(typeof content === "string" ? content : "");
    if (!text) return { id, title, ok: false, text: "This reader came back empty." };
    return { id, title, ok: true, text };
  } catch (error) {
    const late = error instanceof UpstreamError && error.kind === "timeout";
    return { id, title, ok: false, text: late ? "This reader did not answer in time." : "This reader did not answer." };
  }
}

export async function readWithBots(input: unknown): Promise<{ ok: true; readers: ReaderNote[] } | { ok: false; error: string }> {
  const brief = sanitizeBrief(input);
  if (brief.names.length === 0) return { ok: false, error: "Add a name before asking the readers." };
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      ok: true,
      readers: ORDER.map((id) => ({
        id,
        title: READER_TITLES[id],
        ok: false,
        text: "Readers are unavailable on this desk right now.",
      })),
    };
  }

  const key = JSON.stringify(brief);
  const started = Date.now();
  const cached = readCache.get(key);
  if (cached) {
    logEvent("info", "readers.ask", { cache: "hit", durationMs: 0, answered: cached.length });
    return { ok: true, readers: cached };
  }
  if (!takeAskSlot()) {
    logEvent("warn", "readers.ask", { cache: "miss", limited: true });
    return { ok: false, error: "The readers are busy right now. Try again in a minute." };
  }

  const readers = await readCache.getOrFetch(
    key,
    () => Promise.all(ORDER.map((id) => askOne(id, brief, apiKey))),
    (notes) => (notes.every((n) => n.ok) ? READ_TTL_MS : 0),
  );
  const answered = readers.filter((n) => n.ok).length;
  logEvent(answered === readers.length ? "info" : "warn", "readers.ask", {
    cache: "miss",
    durationMs: Date.now() - started,
    answered,
  });
  return { ok: true, readers };
}
