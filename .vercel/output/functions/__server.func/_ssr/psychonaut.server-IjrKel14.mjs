import { o as DRUG_BY_ID } from "./catalog-CTuuS4jP.mjs";
import { c as pwTitleFor, i as TRIPSIT_NAME, l as sanitizeWiki, r as PW_TITLE, s as pwHref } from "./psychonaut-E5EOmg0d.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/psychonaut.server-IjrKel14.js
/** Live PsychonautWiki MediaWiki extracts + TripSit combo. Server-only. */
var cache = /* @__PURE__ */ new Map();
var TTL = 18e5;
var UA = "FirstPass/1.5 (educational CDS; kaleblovingier@gmail.com)";
function cached(key, fn) {
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.value);
	return fn().then((value) => {
		cache.set(key, {
			at: Date.now(),
			value
		});
		return value;
	});
}
async function getJson(url, ms = 8e3) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), ms);
	try {
		const res = await fetch(url, {
			signal: ctrl.signal,
			headers: {
				Accept: "application/json",
				"User-Agent": UA
			}
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} finally {
		clearTimeout(t);
	}
}
async function fetchWiki(id) {
	const name = DRUG_BY_ID[id]?.name ?? id;
	const wikiTitle = PW_TITLE[id] ?? pwTitleFor(id);
	if (!wikiTitle) return {
		id,
		name,
		wikiTitle: "",
		url: "",
		extract: "",
		stripped: false,
		reason: "No PsychonautWiki title mapped."
	};
	const url = `https://psychonautwiki.org/w/api.php?action=query&prop=extracts|info&exintro=1&explaintext=1&inprop=url&redirects=1&format=json&titles=${encodeURIComponent(wikiTitle)}`;
	try {
		const json = await cached(`pw:${wikiTitle}`, () => getJson(url));
		const page = Object.values(json.query?.pages ?? {})[0];
		if (!page || page.missing || !page.extract) return {
			id,
			name,
			wikiTitle,
			url: pwHref(wikiTitle),
			extract: "",
			stripped: false,
			reason: "Wiki page had no intro extract."
		};
		const clean = sanitizeWiki(page.extract);
		return {
			id,
			name,
			wikiTitle: page.title ?? wikiTitle,
			url: page.fullurl ?? pwHref(wikiTitle),
			extract: clean.text,
			stripped: clean.stripped,
			reason: clean.text ? void 0 : "Intro was only dosage / route — stripped. Open the wiki."
		};
	} catch {
		return {
			id,
			name,
			wikiTitle,
			url: pwHref(wikiTitle),
			extract: "",
			stripped: false,
			reason: "PsychonautWiki did not answer."
		};
	}
}
function tripsitName(id) {
	if (TRIPSIT_NAME[id]) return TRIPSIT_NAME[id];
	const d = DRUG_BY_ID[id];
	if (!d) return null;
	if (d.pd.includes("benzo-zdrug")) return "Benzodiazepines";
	if (d.pd.includes("opioid") || d.pd.includes("partial-opioid")) return "Opioids";
	if (d.pd.includes("maoi")) return "MAOIs";
	if (d.pd.includes("ssri-snri")) return "SSRIs";
	return null;
}
async function fetchCombo(a, b) {
	const na = tripsitName(a);
	const nb = tripsitName(b);
	if (!na || !nb || na === nb) return null;
	const url = `https://tripbot.tripsit.me/api/tripsit/getInteraction/${encodeURIComponent(na)}/${encodeURIComponent(nb)}`;
	try {
		const json = await cached(`ts:${na}|${nb}`, () => getJson(url, 6e3));
		if (json.err && json.err !== null) return {
			a: na,
			b: nb,
			status: "",
			note: "",
			source: "TripSit",
			ok: false,
			reason: json.error?.msg || "TripSit had no row for this pair."
		};
		const row = json.data?.[0] ?? json.success ?? {};
		const status = String(row.status ?? row.result ?? "").trim();
		const note = sanitizeWiki(String(row.note ?? row.definition ?? "")).text;
		if (!status && !note) return {
			a: na,
			b: nb,
			status: "",
			note: "",
			source: "TripSit",
			ok: false,
			reason: "Empty combo row."
		};
		return {
			a: na,
			b: nb,
			status,
			note,
			source: "TripSit combo API",
			ok: true
		};
	} catch {
		return {
			a: na,
			b: nb,
			status: "",
			note: "",
			source: "TripSit",
			ok: false,
			reason: "TripSit did not answer. Local chart still stands."
		};
	}
}
async function lookupPsychonaut(ids) {
	const unique = [...new Set(ids.filter((id) => DRUG_BY_ID[id]))].slice(0, 2);
	const pages = await Promise.all(unique.map(fetchWiki));
	const combo = unique.length === 2 ? await fetchCombo(unique[0], unique[1]) : null;
	return {
		ok: pages.some((p) => Boolean(p.extract)) || Boolean(combo?.ok),
		pages,
		combo
	};
}
//#endregion
export { lookupPsychonaut };
