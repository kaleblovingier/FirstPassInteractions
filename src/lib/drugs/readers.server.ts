import { READER_TITLES, sanitizeBrief, type ReaderBrief, type ReaderId, type ReaderNote } from "./readers";

const ORDER: ReaderId[] = ["pair", "gap", "trainee"];

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

async function askOne(id: ReaderId, brief: ReaderBrief, apiKey: string): Promise<ReaderNote> {
  const title = READER_TITLES[id];
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 160,
        messages: [
          { role: "system", content: SYSTEM[id] },
          { role: "user", content: JSON.stringify(brief) },
        ],
      }),
    });
    if (!res.ok) return { id, title, ok: false, text: "This reader did not answer." };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = scrub(body.choices?.[0]?.message?.content ?? "");
    if (!text) return { id, title, ok: false, text: "This reader came back empty." };
    return { id, title, ok: true, text };
  } catch {
    return { id, title, ok: false, text: "This reader did not answer." };
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
  const readers = await Promise.all(ORDER.map((id) => askOne(id, brief, apiKey)));
  return { ok: true, readers };
}
