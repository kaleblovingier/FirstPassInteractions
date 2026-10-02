import { n as EMPTY_LIVE } from "./live-rpc-C4VrlNsN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/live.server-9IG4xw5L.js
var cache = /* @__PURE__ */ new Map();
var TTL = 18e5;
var UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";
function plain(s) {
	return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&/g, "&").replace(/\s+/g, " ").trim();
}
function clip(s, n = 720) {
	const t = plain(s);
	if (t.length <= n) return t;
	return `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
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
function firstString(v) {
	if (typeof v === "string") return v;
	if (Array.isArray(v) && typeof v[0] === "string") return v[0];
	return "";
}
function stringList(v, cap = 6) {
	if (!Array.isArray(v)) return [];
	return v.filter((x) => typeof x === "string" && x.trim().length > 0).slice(0, cap);
}
async function fetchLabel(name) {
	const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(`openfda.generic_name:"${name}"`)}&limit=1`;
	try {
		const row = (await getJson(url)).results?.[0];
		if (!row) return null;
		const open = row.openfda ?? {};
		return {
			boxed: clip(firstString(row.boxed_warning), 900),
			pregnancy: clip(firstString(row.pregnancy) || firstString(row.pregnancy_or_breast_feeding), 420),
			interactions: clip(firstString(row.drug_interactions), 520),
			contraindications: clip(firstString(row.contraindications), 420),
			warnings: clip(firstString(row.warnings_and_cautions) || firstString(row.warnings), 520),
			indications: clip(firstString(row.indications_and_usage), 360),
			brands: stringList(open.brand_name, 5),
			rxcui: stringList(open.rxcui, 4),
			unii: stringList(open.unii, 2),
			classes: stringList(open.pharm_class_epc, 4),
			setId: typeof row.set_id === "string" ? row.set_id : ""
		};
	} catch {
		return null;
	}
}
async function fetchFaers(name) {
	const url = `https://api.fda.gov/drug/event.json?search=${encodeURIComponent(`patient.drug.openfda.generic_name:"${name}"`)}&count=patient.reaction.reactionmeddrapt.exact`;
	try {
		return ((await getJson(url)).results ?? []).filter((r) => typeof r.term === "string" && typeof r.count === "number").slice(0, 8).map((r) => ({
			term: String(r.term),
			count: Number(r.count)
		}));
	} catch {
		return [];
	}
}
async function fetchRxnorm(name) {
	try {
		const rxcui = (await getJson(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`)).idGroup?.rxnormId?.[0];
		if (!rxcui) return null;
		let brands = [];
		try {
			brands = ((await getJson(`https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=BN`)).relatedGroup?.conceptGroup ?? []).flatMap((g) => g.conceptProperties ?? []).map((c) => c.name).filter((n) => Boolean(n)).filter((n, i, all) => all.indexOf(n) === i).slice(0, 8);
		} catch {
			brands = [];
		}
		return {
			rxcui,
			name,
			brands
		};
	} catch {
		return null;
	}
}
async function fetchPubchem(name) {
	try {
		const row = (await getJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`)).PropertyTable?.Properties?.[0];
		if (!row?.CID) return null;
		return {
			cid: String(row.CID),
			formula: row.MolecularFormula ?? "",
			mw: row.MolecularWeight != null ? String(row.MolecularWeight) : "",
			inchikey: row.InChIKey ?? "",
			iupac: row.IUPACName ?? ""
		};
	} catch {
		return null;
	}
}
async function fetchDailyMed(name) {
	try {
		return ((await getJson(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(name)}&pagesize=3`)).data ?? []).filter((r) => typeof r.setid === "string").slice(0, 3).map((r) => ({
			setId: String(r.setid),
			title: clip(String(r.title ?? name), 120),
			published: String(r.published_date ?? "").slice(0, 10)
		}));
	} catch {
		return [];
	}
}
async function fetchShortage(name) {
	const q = encodeURIComponent(`generic_name:"${name}"`);
	try {
		return ((await getJson(`https://api.fda.gov/drug/shortages.json?search=${q}&limit=5`)).results ?? []).slice(0, 4).map((r) => ({
			name: firstString(r.generic_name) || name,
			status: String(r.status ?? "unknown"),
			updated: String(r.update_date ?? "").slice(0, 10)
		}));
	} catch {
		return [];
	}
}
async function fetchNdc(name) {
	const q = encodeURIComponent(`generic_name:"${name}"`);
	try {
		return ((await getJson(`https://api.fda.gov/drug/ndc.json?search=${q}&limit=5`)).results ?? []).slice(0, 4).map((r) => ({
			ndc: String(r.product_ndc ?? ""),
			brand: String(r.brand_name ?? ""),
			generic: String(r.generic_name ?? name),
			form: String(r.dosage_form ?? "")
		}));
	} catch {
		return [];
	}
}
async function fetchRecalls(name) {
	const q = encodeURIComponent(`product_description:"${name}"`);
	try {
		return ((await getJson(`https://api.fda.gov/drug/enforcement.json?search=${q}&limit=4`)).results ?? []).slice(0, 3).map((r) => ({
			reason: clip(String(r.reason_for_recall ?? "Recall"), 180),
			status: String(r.status ?? ""),
			date: String(r.recall_initiation_date ?? "").slice(0, 10),
			classification: String(r.classification ?? "")
		}));
	} catch {
		return [];
	}
}
var ALIAS = {
	"tmp-smx": "sulfamethoxazole",
	paxlovid: "nirmatrelvir",
	epclusa: "sofosbuvir",
	"insulin-glargine": "insulin glargine",
	valproate: "valproic acid",
	"st-johns-wort": "",
	"dirty-30": "",
	"seven-oh": "",
	"twentyfive-i": "",
	xylazine: "xylazine",
	"pressed-30": "",
	nac: "acetylcysteine"
};
function liveQueryName(id, name) {
	if (id in ALIAS) return ALIAS[id];
	if (id.startsWith("__")) return "";
	return name.replace(/\(.*?\)/g, "").trim();
}
async function lookupLive(id, name) {
	const query = liveQueryName(id, name);
	const chem = (query || name).replace(/\(.*?\)/g, "").trim();
	if (!chem) return {
		ok: true,
		query: name,
		...EMPTY_LIVE,
		reason: "No live label for this item."
	};
	const hit = cache.get(chem);
	if (hit && Date.now() - hit.at < TTL) return hit.value;
	try {
		const labeled = Boolean(query);
		const [label, faers, rxnorm, pubchem, dailymed, shortage, ndc, recalls] = await Promise.all([
			labeled ? fetchLabel(query) : Promise.resolve(null),
			labeled ? fetchFaers(query) : Promise.resolve([]),
			labeled ? fetchRxnorm(query) : fetchRxnorm(chem),
			fetchPubchem(chem),
			labeled ? fetchDailyMed(query) : Promise.resolve([]),
			labeled ? fetchShortage(query) : Promise.resolve([]),
			labeled ? fetchNdc(query) : Promise.resolve([]),
			labeled ? fetchRecalls(query) : Promise.resolve([])
		]);
		const value = {
			ok: true,
			query: query || chem,
			label,
			faers,
			rxnorm,
			pubchem,
			dailymed,
			shortage,
			ndc,
			recalls,
			reason: labeled ? void 0 : "No FDA label for this item — PubChem still ran."
		};
		cache.set(chem, {
			at: Date.now(),
			value
		});
		return value;
	} catch (err) {
		const reason = err instanceof Error ? err.name === "AbortError" ? "Timed out." : err.message : "Unreachable.";
		return {
			ok: false,
			query: query || chem,
			...EMPTY_LIVE,
			reason
		};
	}
}
//#endregion
export { lookupLive };
