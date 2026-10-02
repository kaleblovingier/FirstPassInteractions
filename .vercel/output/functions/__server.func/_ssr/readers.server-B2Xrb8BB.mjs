import { n as sanitizeBrief, t as READER_TITLES } from "./readers-CES4RK1A.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/readers.server-B2Xrb8BB.js
var ORDER = [
	"pair",
	"gap",
	"trainee"
];
var SYSTEM = {
	pair: "You are the pair reader on a teaching desk. Restate only the sharpest mapped row in the JSON, in two short sentences, everyday words. Do not name a milligram, a stop, a hold, a switch, or a substitute. Do not say a combination is safe. If the JSON has no rows, say the map has no collision to restate.",
	gap: "You are the gap reader. If quiet pairs are listed, name them. End with this exact sentence: A blank pair is not a clearance. Do not invent an interaction, a milligram, or a next step. If quiet is empty, say every pair on this list has a mapped row, and that is still not a clearance.",
	trainee: "You are the trainee reader. Ask one question a student can answer from the JSON, then answer it in one sentence using only a fact already in the JSON. Do not add a drug, a milligram, or a protocol."
};
function scrub(text) {
	const clean = text.replace(/\s+/g, " ").trim();
	if (/\b(discontinue|stop taking|hold the|switch to|take \d|start \d)\b/i.test(clean)) return "This reader stepped outside the map. The note was dropped. It is not a finding.";
	return clean.replace(/\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|mL|units|iu)\b/gi, "[not a dose]").slice(0, 520);
}
async function askOne(id, brief, apiKey) {
	const title = READER_TITLES[id];
	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			signal: AbortSignal.timeout(2e4),
			body: JSON.stringify({
				model: "grok-4.5",
				temperature: .2,
				max_tokens: 160,
				messages: [{
					role: "system",
					content: SYSTEM[id]
				}, {
					role: "user",
					content: JSON.stringify(brief)
				}]
			})
		});
		if (!res.ok) return {
			id,
			title,
			ok: false,
			text: "This reader did not answer."
		};
		const text = scrub((await res.json()).choices?.[0]?.message?.content ?? "");
		if (!text) return {
			id,
			title,
			ok: false,
			text: "This reader came back empty."
		};
		return {
			id,
			title,
			ok: true,
			text
		};
	} catch {
		return {
			id,
			title,
			ok: false,
			text: "This reader did not answer."
		};
	}
}
async function readWithBots(input) {
	const brief = sanitizeBrief(input);
	if (brief.names.length === 0) return {
		ok: false,
		error: "Add a name before asking the readers."
	};
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: true,
		readers: ORDER.map((id) => ({
			id,
			title: READER_TITLES[id],
			ok: false,
			text: "Readers are unavailable on this desk right now."
		}))
	};
	return {
		ok: true,
		readers: await Promise.all(ORDER.map((id) => askOne(id, brief, apiKey)))
	};
}
//#endregion
export { readWithBots };
