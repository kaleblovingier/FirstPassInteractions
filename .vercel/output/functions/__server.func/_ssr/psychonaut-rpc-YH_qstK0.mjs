import { t as createServerFn } from "./ssr.mjs";
import { o as DRUG_BY_ID } from "./catalog-CTuuS4jP.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/psychonaut-rpc-YH_qstK0.js
function readIds(input) {
	if (!input || typeof input !== "object") return [];
	const v = input.ids;
	if (!Array.isArray(v)) return [];
	return v.filter((x) => typeof x === "string" && Boolean(DRUG_BY_ID[x])).slice(0, 2);
}
var lookupPsychonaut_createServerFn_handler = createServerRpc({
	id: "3594075144b1fa28aa679a08203465df5bbb3071dfa49c3b43599063b4aac4d3",
	name: "lookupPsychonaut",
	filename: "src/lib/drugs/psychonaut-rpc.ts"
}, (opts) => lookupPsychonaut.__executeServer(opts));
var lookupPsychonaut = createServerFn({ method: "POST" }).validator((input) => ({ ids: readIds(input) })).handler(lookupPsychonaut_createServerFn_handler, async ({ data }) => {
	const { lookupPsychonaut: pull } = await import("./psychonaut.server-IjrKel14.mjs");
	return pull(data.ids);
});
//#endregion
export { lookupPsychonaut_createServerFn_handler };
