import { t as createServerFn } from "./ssr.mjs";
import { o as DRUG_BY_ID } from "./catalog-CTuuS4jP.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pubmed-rpc-BRnnWkZb.js
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
var searchPubmed_createServerFn_handler = createServerRpc({
	id: "9a94130689cbcdd872bc21b75ad6a07faed8f6939232c21d280adadc08ffd235",
	name: "searchPubmed",
	filename: "src/lib/drugs/pubmed-rpc.ts"
}, (opts) => searchPubmed.__executeServer(opts));
var searchPubmed = createServerFn({ method: "POST" }).validator((input) => ({
	query: readString(input, "query"),
	ids: readIds(input)
})).handler(searchPubmed_createServerFn_handler, async ({ data }) => {
	const { searchLive } = await import("./pubmed.server-BuOwX0bS.mjs");
	const names = data.ids.map((id) => DRUG_BY_ID[id]?.name).filter(Boolean);
	return searchLive(data.query.trim() || (names.length >= 2 ? `${names[0]} AND ${names[1]} AND (drug interaction OR CYP OR cytochrome)` : names.length === 1 ? `${names[0]} AND (drug interaction OR pharmacokinetics OR CYP)` : ""));
});
//#endregion
export { searchPubmed_createServerFn_handler };
