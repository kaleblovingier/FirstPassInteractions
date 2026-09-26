import { t as createServerFn } from "./ssr.mjs";
import { n as sanitizeBrief } from "./readers-CES4RK1A.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/readers-rpc-DNNtOTte.js
var readRegimen_createServerFn_handler = createServerRpc({
	id: "aba7aab077fdc448ee880715fc2e71987ed329f672eb6beaa99f892f0eccd4e0",
	name: "readRegimen",
	filename: "src/lib/drugs/readers-rpc.ts"
}, (opts) => readRegimen.__executeServer(opts));
var readRegimen = createServerFn({ method: "POST" }).validator((input) => sanitizeBrief(input)).handler(readRegimen_createServerFn_handler, async ({ data }) => {
	const { readWithBots } = await import("./readers.server-B2Xrb8BB.mjs");
	return readWithBots(data);
});
//#endregion
export { readRegimen_createServerFn_handler };
