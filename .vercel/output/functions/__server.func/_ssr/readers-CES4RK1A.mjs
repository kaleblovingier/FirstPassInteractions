//#region node_modules/.nitro/vite/services/ssr/assets/readers-CES4RK1A.js
var READER_TITLES = {
	pair: "Pair reader",
	gap: "Gap reader",
	trainee: "Trainee reader"
};
function clip(value, max) {
	if (typeof value !== "string") return "";
	return value.replace(/\s+/g, " ").trim().slice(0, max);
}
function sanitizeBrief(input) {
	const src = input && typeof input === "object" ? input : {};
	const names = Array.isArray(src.names) ? src.names.map((n) => clip(n, 80)).filter(Boolean).slice(0, 5) : [];
	const rows = (Array.isArray(src.rows) ? src.rows : []).slice(0, 6).map((row) => {
		const r = row && typeof row === "object" ? row : {};
		return {
			severity: clip(r.severity, 24),
			line: clip(r.line, 180),
			why: clip(r.why, 240)
		};
	});
	const quiet = Array.isArray(src.quiet) ? src.quiet.map((n) => clip(n, 120)).filter(Boolean).slice(0, 12) : [];
	const food = Array.isArray(src.food) ? src.food.map((n) => clip(n, 180)).filter(Boolean).slice(0, 4) : [];
	return {
		names,
		lead: clip(src.lead, 320),
		rows,
		quiet,
		food
	};
}
//#endregion
export { sanitizeBrief as n, READER_TITLES as t };
