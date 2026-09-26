import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/collect-Cx__fCAb.js
function readString(input, key) {
	if (!input || typeof input !== "object") return "";
	const v = input[key];
	return typeof v === "string" ? v : "";
}
function readRows(input) {
	if (!input || typeof input !== "object") return [];
	const raw = input.rows;
	if (!Array.isArray(raw)) return [];
	return raw.filter((row) => {
		if (!row || typeof row !== "object") return false;
		const r = row;
		return typeof r.key === "string" && typeof r.soldTo === "string";
	});
}
var collectLicenses_createServerFn_handler = createServerRpc({
	id: "c4c1c686268d315fefc8fab7300663dc1b46f1dfa709dd0bb5dee178f845e24e",
	name: "collectLicenses",
	filename: "src/lib/billing/collect.ts"
}, (opts) => collectLicenses.__executeServer(opts));
var collectLicenses = createServerFn({ method: "POST" }).validator((input) => ({
	pin: readString(input, "pin"),
	plan: readString(input, "plan"),
	names: readString(input, "names"),
	hunt: readString(input, "hunt")
})).handler(collectLicenses_createServerFn_handler, async ({ data }) => {
	const { collectLicenses: run } = await import("./collect.server-Bpq3CLY5.mjs");
	return run(data);
});
var draftCollected_createServerFn_handler = createServerRpc({
	id: "81831aa2d98bcaec1ff38c1a504d63093d8f0f5535a3090a7610523dd640ff4e",
	name: "draftCollected",
	filename: "src/lib/billing/collect.ts"
}, (opts) => draftCollected.__executeServer(opts));
var draftCollected = createServerFn({ method: "POST" }).validator((input) => ({
	pin: readString(input, "pin"),
	rows: readRows(input)
})).handler(draftCollected_createServerFn_handler, async ({ data }) => {
	const { draftCollected: run } = await import("./collect.server-Bpq3CLY5.mjs");
	return run(data);
});
//#endregion
export { collectLicenses_createServerFn_handler, draftCollected_createServerFn_handler };
