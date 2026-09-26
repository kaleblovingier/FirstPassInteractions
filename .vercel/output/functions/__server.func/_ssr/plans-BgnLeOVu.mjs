//#region node_modules/.nitro/vite/services/ssr/assets/plans-BgnLeOVu.js
/** Public pay / write lines — the operator asked these onto the desk. */
var OPERATOR = {
	name: "Kaleb Lovingier",
	venmo: "kaleblovingier",
	email: "kaleblovingier@gmail.com",
	phone: "360-707-8923",
	phoneHref: "tel:+13607078923",
	social: ["@badbird", "@kaleblovingier"],
	venmoUrl: "https://venmo.com/u/kaleblovingier",
	cashApp: "kaleblovingier7",
	cashAppUrl: "https://cash.app/$kaleblovingier7",
	paypal: "kaleblovingier@gmail.com",
	paypalUrl: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=kaleblovingier%40gmail.com&item_name=FirstPass%20founding&amount=79&currency_code=USD",
	payLine: "Venmo @kaleblovingier · Cash App $kaleblovingier7 · PayPal kaleblovingier@gmail.com"
};
var PAY_RAILS = [
	{
		id: "venmo",
		label: "Venmo",
		handle: `@${OPERATOR.venmo}`,
		href: OPERATOR.venmoUrl
	},
	{
		id: "cashapp",
		label: "Cash App",
		handle: `$${OPERATOR.cashApp}`,
		href: OPERATOR.cashAppUrl
	},
	{
		id: "paypal",
		label: "PayPal",
		handle: OPERATOR.paypal,
		href: OPERATOR.paypalUrl
	}
];
/** Buyer-facing three-step path when Stripe is deferred (Venmo / Cash App / PayPal). */
var MANUAL_UNLOCK_STEPS = [
	{
		n: "1",
		title: "Pay $79 once",
		detail: "Venmo, Cash App, or PayPal — open a rail below and send founding."
	},
	{
		n: "2",
		title: "Get your key",
		detail: "After payment clears, you get a signed key by email or text (FP-LIFE-…). Nothing unlocks by itself."
	},
	{
		n: "3",
		title: "Redeem on this desk",
		detail: "Paste the key below and hit Redeem. Host factors, enzyme atlas, and export open on this browser."
	}
];
/** Soft unlock note — no clinical claims; PI / Safety page still govern. */
var FOUNDING_UNLOCKS = "Founding unlocks host factors, enzyme atlas, metabolite maps, full report, and JSON/CSV export — $79 once. Educational model; not FDA-cleared.";
var SITE = {
	repo: "https://github.com/kaleblovingier/FirstPassInteractions",
	pages: "https://kaleblovingier.github.io/FirstPassInteractions/",
	gamma: "https://gamma.app/docs/c1sxd9i8iyv80eq",
	gammaCard: "https://gamma.app/docs/h9grlpif6t8ogmt",
	/** Live desk. Prefer VITE_PUBLIC_URL; else the Vercel desk — never the bare repo. */
	url: "https://firstpass-desk.vercel.app"
};
var TRY_THREE = [
	{
		id: "oral-k-gf",
		title: "Oral ketamine × grapefruit",
		punch: "More of the dose may reach the bloodstream by mouth. How long it lasts does not change the same way. Compare with IV — that path skips the gut step."
	},
	{
		id: "dxm-pm",
		title: "DXM in a 2D6 poor metabolizer, every 8 hours",
		punch: "In a slow metabolizer, cough medicine can build up with repeat doses. Once versus every 8 hours is the teaching point."
	},
	{
		id: "tac-gf",
		title: "Tacrolimus × grapefruit",
		punch: "A kitchen interaction: more of the transplant medicine may get absorbed. The gut enzyme matters here more than the liver story alone."
	}
];
var COMMERCE = {
	founding: 79,
	payUrl: OPERATOR.venmoUrl,
	operatorContact: OPERATOR.email,
	pitch: "A medicine-interaction learning desk for ketamine clinics, MAT and harm-reduction teams, and pharmacy students. Free forever: check up to five medicines. Founding lifetime ($79 once) unlocks host factors, the enzyme atlas, metabolite maps, and export — yours on this desk."
};
var BUYERS = [
	{
		who: "Ketamine / esketamine clinics",
		why: "Oral vs IV first-pass, benzo airway stack, 2B6 phenotype — the map they keep asking pharmacy for.",
		hook: "oral vs IV ketamine, benzo airway stacks, and 2B6 phenotype"
	},
	{
		who: "MAT and street-supply desks",
		why: "Xylazine, nitazenes, designer benzos, loperamide, naltrexone. Naloxone will not reverse an α2.",
		hook: "xylazine, nitazenes, designer benzos, and the naltrexone / loperamide traps"
	},
	{
		who: "Pharmacy students and residents",
		why: "A teaching desk they will actually open. Lab export goes in the notebook.",
		hook: "a teaching desk they will actually open, with JSON/CSV for the lab book"
	},
	{
		who: "Harm-reduction and psych NPs",
		why: "MDMA × SSRI, DXM × 2D6 PM, grapefruit × oral ketamine, lithium × mushrooms.",
		hook: "MDMA × SSRI, DXM in 2D6 PMs, grapefruit × oral ketamine"
	}
];
function payClose(price = COMMERCE.founding) {
	return `Pay $${price} once via Venmo @${OPERATOR.venmo}, Cash App $${OPERATOR.cashApp}, or PayPal ${OPERATOR.email} (card on the desk when Stripe is live). After it clears you get a signed key by email or text — paste it under Plans → Redeem. Three steps: pay → get key → redeem.`;
}
function salesDm(price = COMMERCE.founding) {
	return [
		"I built FirstPass — a learning desk that maps how medicines interact for ketamine clinics, MAT, street adulterants (xylazine, nitazenes), and common psych stacks — including grapefruit, smoking, and metabolizer status.",
		"",
		"Free: check up to five medicines for mapped interactions.",
		`Founding license: $${price} once. Patient factors, metabolite maps, enzyme atlas, and export — yours on this desk.`,
		"",
		SITE.url,
		"",
		payClose(price),
		`${OPERATOR.email} · ${OPERATOR.phone}`,
		"",
		"Educational model — not a clinical system of record."
	].join("\n");
}
function buyerDm(who, price = COMMERCE.founding) {
	return [
		`I built FirstPass — a medicine-interaction learning desk for ${BUYERS.find((b) => b.who === who)?.hook ?? "the maps you keep asking pharmacy for"}.`,
		"",
		"Checking up to five medicines stays free so you can kick the tires.",
		`Founding license is $${price} once: patient factors, metabolite maps, enzyme atlas, and JSON/CSV export.`,
		"",
		SITE.url,
		"",
		payClose(price),
		`${OPERATOR.email} · ${OPERATOR.phone}`,
		"",
		"Educational model — not a clinical system of record."
	].join("\n");
}
function launchTweet(price = COMMERCE.founding) {
	return [
		"FirstPass is a CYP450 desk for ketamine clinics, MAT, and pharmacy students.",
		"",
		"Free up to five drugs on the desk.",
		`Founding license $${price} once — host factors, enzyme atlas, export.`,
		SITE.url,
		"Pay with card on the desk, or Venmo / Cash App / PayPal.",
		"",
		"Educational model. Not FDA-cleared. Empty tray is not proof a combination is safe."
	].join("\n");
}
function launchPosts(price = COMMERCE.founding, url = SITE.pages) {
	const tryLines = TRY_THREE.map((t) => `• ${t.title} — ${t.punch}`).join("\n");
	return [
		{
			id: "x",
			channel: "X",
			title: "Launch thread",
			where: "Post from @badbird or @kaleblovingier",
			compose: "https://x.com/compose/post",
			text: [
				"1/",
				"FirstPass is a CYP450 desk for ketamine clinics, MAT, and pharmacy students.",
				"",
				"Free up to five drugs on the desk. Founding license $" + price + " once.",
				"",
				"2/",
				"Three cases the desk actually draws:",
				tryLines,
				"",
				"3/",
				url,
				`Venmo @${OPERATOR.venmo} · Cash App $${OPERATOR.cashApp} · PayPal ${OPERATOR.email}`,
				"",
				"Educational model. Not a charting system."
			].join("\n")
		},
		{
			id: "reddit-pharmacy",
			channel: "Reddit",
			title: "r/pharmacy",
			where: "Teaching post, not a cold pitch",
			compose: "https://www.reddit.com/r/pharmacy/submit",
			text: [
				"Title: FirstPass — a CYP450 teaching desk (oral vs IV ketamine, 2D6 PM accumulation, grapefruit first-pass)",
				"",
				"I built an educational CYP450 / PD collision desk for the stacks I kept looking up by hand: ketamine (oral vs IV), MAT / street adulterants, psych, and kitchen inhibitors.",
				"",
				"Free: up to five drugs on the desk, collision cards, a one-compartment concentration sketch (AUCR, q8h accumulation, oral vs IV overlay).",
				"",
				"Three cases worth opening:",
				tryLines,
				"",
				"Not a clinical system of record. Not medical advice. Founding license is $" + price + " once if you want host phenotype, the enzyme atlas, and export.",
				"",
				url,
				SITE.repo
			].join("\n")
		},
		{
			id: "reddit-ketamine",
			channel: "Reddit",
			title: "r/ketamine",
			where: "Oral vs IV first-pass, not dosing advice",
			compose: "https://www.reddit.com/r/ketamine/submit",
			text: [
				"Title: Oral vs IV ketamine first-pass — a CYP3A4 / 2B6 map (educational)",
				"",
				"Oral ketamine is a first-pass problem. IV is not. Grapefruit knocks out gut 3A4 so oral F rises while t½ stays put; an IV overlay on the same milligram scale stays flat. Strong hepatic 3A4 inhibitors are a different shape.",
				"",
				"I put that on a desk with 2B6 phenotype, benzo airway stacks, and the usual psych list. Up to five-drug collision checks are free.",
				"",
				"Educational model — not medical advice, not a clinic chart.",
				"",
				url
			].join("\n")
		},
		{
			id: "hn",
			channel: "Hacker News",
			title: "Show HN",
			where: "news.ycombinator.com/submit",
			compose: "https://news.ycombinator.com/submit",
			text: [
				"Title: Show HN: FirstPass – educational CYP450 collision desk",
				"URL: " + url,
				"",
				"FirstPass maps CYP450 / PD collisions for ketamine (oral vs IV), MAT and street adulterants, and the usual psych stack. Up to five-drug collision checks are free. A one-compartment sketch shows AUCR, q8h accumulation, and an oral/IV overlay. Host phenotype, the enzyme atlas, and export are a $" + price + " founding license.",
				"",
				"Educational model, not clinical decision support. Source: " + SITE.repo
			].join("\n")
		},
		{
			id: "linkedin",
			channel: "LinkedIn",
			title: "Pharmacy / clinic note",
			where: "Your LinkedIn composer",
			compose: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url),
			text: [
				"I built FirstPass, an educational CYP450 desk for ketamine clinics, MAT programs, and pharmacy students.",
				"",
				"Up to five-drug collision checks stay free so a preceptor can open it in rounds. Founding license is $" + price + " once: host metabolizer status, smoke and alcohol, metabolites, enzyme atlas, JSON/CSV export.",
				"",
				"Three teaching cases:",
				tryLines,
				"",
				url,
				"",
				payClose(price),
				"",
				"Educational CYP map — not a charting system."
			].join("\n")
		}
	];
}
function requestLicense(price = COMMERCE.founding) {
	return `I'd like a FirstPass founding license ($${price} once). I'll pay Venmo @${OPERATOR.venmo}, Cash App $${OPERATOR.cashApp}, or PayPal ${OPERATOR.email}. Send the key when it clears.`;
}
function fulfillKey(opts) {
	const to = opts.soldTo?.trim();
	return [
		to ? `${to} —` : "",
		"Your FirstPass founding license is ready.",
		"",
		opts.key,
		"",
		"Open the desk. If you paid by card you are already licensed on the browser that returned from Stripe — keep this key for another machine. Otherwise: Plans → paste the key → Redeem (pay → key → redeem).",
		"",
		SITE.url,
		"",
		"Educational CYP map — not a clinical system of record."
	].filter((l) => l !== "").join("\n");
}
function fulfillKeys(rows) {
	return rows.map((row) => fulfillKey(row)).join("\n\n———\n\n");
}
function invoiceText(opts) {
	return [
		"FIRSTPASS DESK LICENSE",
		"Educational CYP450 / PD map. Not clinical decision support.",
		"",
		`From: ${OPERATOR.name}`,
		`Item: ${opts.plan}`,
		`Amount: $${opts.price}`,
		`Pay: ${opts.pay || OPERATOR.payLine}`,
		`Write: ${OPERATOR.email} · ${OPERATOR.phone}`,
		"",
		"After payment you receive a key like FP-LIFE-A1B2C3D4-9F3C2A1B.",
		"Paste it under Plans → Redeem on the desk (pay → key → redeem).",
		opts.keyHint ? `Key: ${opts.keyHint}` : ""
	].filter((l) => l !== "").join("\n");
}
function tweetFor(regimen, highest, headline) {
	return `${`${regimen} — ${highest}`}${headline && headline !== regimen ? `\n${headline}` : ""}\nMapped on FirstPass. Educational CYP desk.\n${SITE.url}`.trim();
}
var PLANS = [
	{
		id: "free",
		name: "Free desk",
		tagline: "Check up to five medicines — no card required.",
		monthly: 0,
		yearly: 0,
		features: [
			"Search 1,700+ medicines and supplements",
			"Up to five drugs on the desk",
			"Interaction cards: how levels change and how effects can stack",
			"DrugBank, genetics teaching cards, and receptor teaching cards",
			"PubMed citation shelf (curated papers + live search)",
			"Simple concentration sketch (relative exposure and repeat-dose build-up)",
			"Enzyme occupancy heatmap",
			"Share a one-line map"
		]
	},
	{
		id: "pro",
		name: "Pro",
		tagline: "Host factors, metabolites, and the enzyme atlas.",
		monthly: 12,
		yearly: 99,
		lifetime: 79,
		highlighted: true,
		features: [
			"Everything on the free desk",
			"Up to eight medicines on the list",
			"Metabolizer status for common CYP enzymes",
			"Smoking, alcohol pattern, and ketamine / cannabis route",
			"Age (Beers), kidney, pregnancy / lactation teaching cards",
			"Metabolite maps and stack-load meters",
			"Enzyme atlas",
			"Full copyable interaction report"
		]
	},
	{
		id: "lab",
		name: "Founding",
		tagline: "$79 once — Pro tools plus export, for life.",
		monthly: 29,
		yearly: 249,
		lifetime: 79,
		features: [
			"Everything in Pro",
			"JSON + CSV export for the lab book",
			"Founding lifetime at $79 once (no subscription)",
			"License receipt you can keep",
			"Priority formulary additions"
		]
	}
];
var PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));
function priceFor(plan, interval) {
	const p = PLAN_BY_ID[plan];
	if (!p || plan === "free") return 0;
	if (interval === "life") return p.lifetime ?? 79;
	return interval === "year" ? p.yearly : p.monthly;
}
function maxDrugs(plan) {
	return plan === "free" ? 5 : 8;
}
//#endregion
export { tweetFor as S, maxDrugs as _, OPERATOR as a, requestLicense as b, PLAN_BY_ID as c, buyerDm as d, fulfillKey as f, launchTweet as g, launchPosts as h, MANUAL_UNLOCK_STEPS as i, SITE as l, invoiceText as m, COMMERCE as n, PAY_RAILS as o, fulfillKeys as p, FOUNDING_UNLOCKS as r, PLANS as s, BUYERS as t, TRY_THREE as u, payClose as v, salesDm as x, priceFor as y };
