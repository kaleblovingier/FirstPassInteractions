import { t as createServerFn } from "./ssr.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { o as DRUG_BY_ID } from "./catalog-CTuuS4jP.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/live-rpc-C4VrlNsN.js
var EMPTY_LIVE = {
	label: null,
	faers: [],
	rxnorm: null,
	pubchem: null,
	dailymed: [],
	shortage: [],
	ndc: [],
	recalls: []
};
var live_rpc_exports = /* @__PURE__ */ __exportAll({
	lookupCpicGuideline_createServerFn_handler: () => lookupCpicGuideline_createServerFn_handler,
	lookupLiveSources_createServerFn_handler: () => lookupLiveSources_createServerFn_handler,
	lookupRxnavInteractions_createServerFn_handler: () => lookupRxnavInteractions_createServerFn_handler,
	searchTrials_createServerFn_handler: () => searchTrials_createServerFn_handler
});
function readString(input, key) {
	if (!input || typeof input !== "object") return "";
	const v = input[key];
	return typeof v === "string" ? v : "";
}
function readIds(input) {
	if (!input || typeof input !== "object") return [];
	const v = input.ids;
	if (!Array.isArray(v)) return [];
	return v.filter((x) => typeof x === "string").slice(0, 8);
}
function miss(query, reason, ok = false) {
	return {
		ok,
		query,
		...EMPTY_LIVE,
		reason
	};
}
var lookupLiveSources_createServerFn_handler = createServerRpc({
	id: "7b28598e8eb2bad644d0c312587b5f09ac1584adb3f466a08be60a89009342b3",
	name: "lookupLiveSources",
	filename: "src/lib/drugs/live-rpc.ts"
}, (opts) => lookupLiveSources.__executeServer(opts));
var lookupLiveSources = createServerFn({ method: "POST" }).validator((input) => ({ id: readString(input, "id") })).handler(lookupLiveSources_createServerFn_handler, async ({ data }) => {
	const drug = DRUG_BY_ID[data.id];
	if (!drug) return miss(data.id, "Not on this shelf.");
	const { lookupLive } = await import("./live.server-9IG4xw5L.mjs");
	return lookupLive(drug.id, drug.name);
});
var lookupRxnavInteractions_createServerFn_handler = createServerRpc({
	id: "59d4cf41bb5f887a079781ba2a8bb5e7d49fa10d68af065cdce9e19c33bd837a",
	name: "lookupRxnavInteractions",
	filename: "src/lib/drugs/live-rpc.ts"
}, (opts) => lookupRxnavInteractions.__executeServer(opts));
var lookupRxnavInteractions = createServerFn({ method: "POST" }).validator((input) => ({ ids: readIds(input) })).handler(lookupRxnavInteractions_createServerFn_handler, async ({ data }) => {
	const { lookupInteractions } = await import("./rxnav.server-D8lJe1D9.mjs");
	return lookupInteractions(data.ids);
});
var searchTrials_createServerFn_handler = createServerRpc({
	id: "136f69ff59e46a1efad3665eb04abb5f1b33d58dd597235d8186a63332ae8472",
	name: "searchTrials",
	filename: "src/lib/drugs/live-rpc.ts"
}, (opts) => searchTrials.__executeServer(opts));
var searchTrials = createServerFn({ method: "POST" }).validator((input) => ({
	query: readString(input, "query"),
	ids: readIds(input)
})).handler(searchTrials_createServerFn_handler, async ({ data }) => {
	const { searchLiveTrials } = await import("./trials.server-DrxNNRj4.mjs");
	const names = data.ids.map((id) => DRUG_BY_ID[id]?.name).filter(Boolean);
	return searchLiveTrials(data.query.trim() || names.slice(0, 2).join(" "));
});
var lookupCpicGuideline_createServerFn_handler = createServerRpc({
	id: "12c28728ffb922f158c1731585a27e29a86abec7b7afc80c10a97471cd162237",
	name: "lookupCpicGuideline",
	filename: "src/lib/drugs/live-rpc.ts"
}, (opts) => lookupCpicGuideline.__executeServer(opts));
var lookupCpicGuideline = createServerFn({ method: "POST" }).validator((input) => ({ name: readString(input, "name") })).handler(lookupCpicGuideline_createServerFn_handler, async ({ data }) => {
	const { lookupCpic } = await import("./cpic.server-DH_L2Zyb.mjs");
	return lookupCpic(data.name);
});
//#endregion
export { EMPTY_LIVE as n, live_rpc_exports as t };
