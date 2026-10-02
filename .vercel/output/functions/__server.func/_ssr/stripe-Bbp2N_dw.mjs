import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stripe-Bbp2N_dw.js
function readString(input, key) {
	if (!input || typeof input !== "object") return "";
	const v = input[key];
	return typeof v === "string" ? v : "";
}
var stripeStatus_createServerFn_handler = createServerRpc({
	id: "c69551bf536aa5bf57002955495abde08bd40ca864317987f6edb29bb93a15f0",
	name: "stripeStatus",
	filename: "src/lib/billing/stripe.ts"
}, (opts) => stripeStatus.__executeServer(opts));
var stripeStatus = createServerFn({ method: "POST" }).handler(stripeStatus_createServerFn_handler, async () => {
	const { stripeMode } = await import("./stripe.server-Dmhe25Fl.mjs");
	return { mode: stripeMode() };
});
var startStripeCheckout_createServerFn_handler = createServerRpc({
	id: "e4e9c09259e5d2421625eea94a6c09d36185c63ef8ee9a12708b7dcf7c670a0f",
	name: "startStripeCheckout",
	filename: "src/lib/billing/stripe.ts"
}, (opts) => startStripeCheckout.__executeServer(opts));
var startStripeCheckout = createServerFn({ method: "POST" }).validator((input) => ({
	plan: readString(input, "plan"),
	interval: readString(input, "interval")
})).handler(startStripeCheckout_createServerFn_handler, async ({ data }) => {
	const { createCheckout } = await import("./stripe.server-Dmhe25Fl.mjs");
	return createCheckout(data.plan, data.interval);
});
var claimStripeCheckout_createServerFn_handler = createServerRpc({
	id: "c80fe63ac6022aed39946a4ec1310dbb12788f7679579baebe8d36ddfd07c509",
	name: "claimStripeCheckout",
	filename: "src/lib/billing/stripe.ts"
}, (opts) => claimStripeCheckout.__executeServer(opts));
var claimStripeCheckout = createServerFn({ method: "POST" }).validator((input) => ({ sessionId: readString(input, "sessionId") })).handler(claimStripeCheckout_createServerFn_handler, async ({ data }) => {
	const { claimSession } = await import("./stripe.server-Dmhe25Fl.mjs");
	if (!data.sessionId.trim()) return {
		ok: false,
		reason: "Missing session."
	};
	return claimSession(data.sessionId);
});
var listPaidLicenses_createServerFn_handler = createServerRpc({
	id: "1bff1f57d5534978f8ba9956f7d553bb0e80b27eca17219153b9da88ade84f36",
	name: "listPaidLicenses",
	filename: "src/lib/billing/stripe.ts"
}, (opts) => listPaidLicenses.__executeServer(opts));
var listPaidLicenses = createServerFn({ method: "POST" }).validator((input) => ({ pin: readString(input, "pin") })).handler(listPaidLicenses_createServerFn_handler, async ({ data }) => {
	const { pinOk } = await import("./license.server-Deu4zNmD.mjs");
	if (!pinOk(data.pin)) return {
		ok: false,
		reason: "Operator PIN is wrong."
	};
	const { listPaidSessions } = await import("./stripe.server-Dmhe25Fl.mjs");
	return listPaidSessions();
});
//#endregion
export { claimStripeCheckout_createServerFn_handler, listPaidLicenses_createServerFn_handler, startStripeCheckout_createServerFn_handler, stripeStatus_createServerFn_handler };
