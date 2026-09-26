import { o as DRUG_BY_ID } from "./catalog-CTuuS4jP.mjs";
import { lookupLive } from "./live.server-9IG4xw5L.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rxnav.server-D8lJe1D9.js
/**
* Live DDI from OpenFDA labels + NIH RxClass.
* NLM retired the RxNav Interaction API in 2024 — this desk does not call it.
*/
var cache = /* @__PURE__ */ new Map();
var TTL = 18e5;
var UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";
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
function needles(id) {
	const d = DRUG_BY_ID[id];
	if (!d) return [];
	return [
		d.name,
		...d.brands,
		...d.aliases,
		d.id.replace(/-/g, " ")
	].map((s) => s.toLowerCase()).filter((s) => s.length >= 4);
}
function clipAround(hay, needle, n = 280) {
	const i = hay.toLowerCase().indexOf(needle.toLowerCase());
	if (i < 0) return hay.slice(0, n);
	const start = Math.max(0, i - 80);
	const end = Math.min(hay.length, i + needle.length + 200);
	const slice = hay.slice(start, end).replace(/\s+/g, " ").trim();
	return `${start > 0 ? "…" : ""}${slice}${end < hay.length ? "…" : ""}`;
}
async function fetchClasses(rxcui, drug) {
	const out = [];
	for (const source of ["ATC", "FDASPL"]) try {
		const rows = (await getJson(`https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(rxcui)}&relaSource=${source}`)).rxclassDrugInfoList?.rxclassDrugInfo ?? [];
		for (const row of rows.slice(0, 6)) {
			const name = row.rxclassMinConceptItem?.className;
			if (!name) continue;
			out.push({
				rxcui,
				drug,
				className: name,
				classType: row.rxclassMinConceptItem?.classType ?? source,
				source
			});
		}
	} catch {}
	const seen = /* @__PURE__ */ new Set();
	return out.filter((c) => {
		const k = `${c.drug}|${c.className}`;
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}
async function lookupInteractions(ids) {
	const unique = [...new Set(ids)].filter((id) => DRUG_BY_ID[id]?.kind === "drug").slice(0, 8);
	if (unique.length < 2) return {
		ok: true,
		rxcuis: [],
		pairs: [],
		classes: [],
		reason: "Put two labeled drugs on the desk."
	};
	const key = [...unique].sort().join("|");
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < TTL) return hit.value;
	try {
		const packs = await Promise.all(unique.map(async (id) => {
			const drug = DRUG_BY_ID[id];
			return {
				id,
				drug,
				live: await lookupLive(drug.id, drug.name)
			};
		}));
		const pairs = [];
		for (let i = 0; i < packs.length; i++) for (let j = i + 1; j < packs.length; j++) {
			const a = packs[i];
			const b = packs[j];
			const textA = a.live.label?.interactions ?? "";
			const textB = b.live.label?.interactions ?? "";
			const foundA = needles(b.id).find((n) => textA.toLowerCase().includes(n));
			const foundB = needles(a.id).find((n) => textB.toLowerCase().includes(n));
			if (foundA && textA) pairs.push({
				a: a.drug.name,
				b: b.drug.name,
				source: "OpenFDA label",
				severity: "named",
				description: clipAround(textA, foundA)
			});
			if (foundB && textB) pairs.push({
				a: b.drug.name,
				b: a.drug.name,
				source: "OpenFDA label",
				severity: "named",
				description: clipAround(textB, foundB)
			});
		}
		const rxcuis = [];
		const classes = [];
		for (const p of packs) {
			const rxcui = p.live.rxnorm?.rxcui || p.live.label?.rxcui[0];
			if (!rxcui) continue;
			rxcuis.push(rxcui);
			classes.push(...await fetchClasses(rxcui, p.drug.name));
		}
		const value = {
			ok: true,
			rxcuis,
			pairs: pairs.slice(0, 16),
			classes: classes.slice(0, 24),
			reason: pairs.length ? void 0 : "NLM retired the RxNav Interaction API in 2024. No partner name in the OpenFDA excerpt — FirstPass still owns the CYP/PD score. RxClass (ATC / FDA SPL) is below."
		};
		cache.set(key, {
			at: Date.now(),
			value
		});
		return value;
	} catch (err) {
		return {
			ok: false,
			rxcuis: [],
			pairs: [],
			classes: [],
			reason: err instanceof Error ? err.name === "AbortError" ? "Timed out." : err.message : "Unreachable."
		};
	}
}
//#endregion
export { lookupInteractions };
