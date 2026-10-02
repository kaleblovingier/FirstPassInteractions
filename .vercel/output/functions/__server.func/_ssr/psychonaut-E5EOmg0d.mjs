import { o as DRUG_BY_ID } from "./catalog-CTuuS4jP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/psychonaut-E5EOmg0d.js
/**
* PsychonautWiki / TripSit teaching — paraphrases, not a protocol, not a milligram.
* Live wiki intros are sanitized of dosage, volumetric, and route how-to before they land.
* A wiki is not a Prescribing Information.
*/
/** Catalog id → PsychonautWiki page title. */
var PW_TITLE = {
	mdma: "MDMA",
	mda: "MDA",
	methylone: "Methylone",
	mephedrone: "Mephedrone",
	"three-mmc": "3-MMC",
	ketamine: "Ketamine",
	esketamine: "Esketamine",
	dextromethorphan: "Dextromethorphan",
	pcp: "PCP",
	mxe: "Methoxetamine",
	"two-fdck": "2-Fluorodeschloroketamine",
	dck: "Deschloroketamine",
	"three-meo-pcp": "3-MeO-PCP",
	lsd: "LSD",
	psilocybin: "Psilocybin",
	dmt: "DMT",
	mescaline: "Mescaline",
	twocb: "2C-B",
	"four-aco-dmt": "4-AcO-DMT",
	"twentyfive-i": "25I-NBOMe",
	"sodium-oxybate": "GHB",
	gbl: "GBL",
	"bd-14": "1,4-Butanediol",
	ethanol: "Alcohol",
	fentanyl: "Fentanyl",
	heroin: "Heroin",
	"dirty-30": "Fentanyl",
	"pressed-30": "Fentanyl",
	carfentanil: "Carfentanil",
	isotonitazene: "Isotonitazene",
	xylazine: "Xylazine",
	medetomidine: "Medetomidine",
	bromazolam: "Bromazolam",
	etizolam: "Etizolam",
	clonazolam: "Clonazolam",
	flualprazolam: "Flualprazolam",
	cocaine: "Cocaine",
	amphetamine: "Amphetamine",
	methamphetamine: "Methamphetamine",
	dronabinol: "Cannabis",
	cannabidiol: "Cannabidiol",
	"nitrous-oxide": "Nitrous oxide",
	kratom: "Kratom",
	"seven-oh": "7-Hydroxymitragynine",
	tianeptine: "Tianeptine",
	tramadol: "Tramadol",
	phenibut: "Phenibut",
	lithium: "Lithium",
	gabapentin: "Gabapentin",
	pregabalin: "Pregabalin"
};
/** TripSit combo-API names. Classes when the molecule is not a named node. */
var TRIPSIT_NAME = {
	mdma: "MDMA",
	mda: "MDA",
	methylone: "Methylone",
	ketamine: "Ketamine",
	dextromethorphan: "DXM",
	lsd: "LSD",
	psilocybin: "Mushrooms",
	dmt: "DMT",
	mescaline: "Mescaline",
	twocb: "2C-B",
	"sodium-oxybate": "GHB",
	gbl: "GHB",
	"bd-14": "GHB",
	ethanol: "Alcohol",
	fentanyl: "Opioids",
	heroin: "Opioids",
	"dirty-30": "Opioids",
	"pressed-30": "Opioids",
	oxycodone: "Opioids",
	morphine: "Opioids",
	hydromorphone: "Opioids",
	methadone: "Opioids",
	buprenorphine: "Opioids",
	tramadol: "Tramadol",
	cocaine: "Cocaine",
	amphetamine: "Amphetamines",
	methamphetamine: "Methamphetamine",
	"twentyfive-i": "NBOMe",
	dronabinol: "Cannabis",
	cannabidiol: "Cannabis",
	"nitrous-oxide": "Nitrous",
	pcp: "PCP",
	lithium: "Lithium",
	mxe: "MXE",
	kratom: "Kratom"
};
function pwHref(title) {
	return `https://psychonautwiki.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}
function pwTitleFor(id) {
	if (PW_TITLE[id]) return PW_TITLE[id];
	const d = DRUG_BY_ID[id];
	if (!d) return null;
	if (d.pd.includes("benzo-zdrug")) return "Benzodiazepine";
	if (d.pd.includes("opioid") || d.pd.includes("partial-opioid")) return "Opioid";
	if (d.pd.includes("maoi")) return "Monoamine oxidase inhibitor";
	if (d.pd.includes("ssri-snri")) return "SSRI";
	return null;
}
function has(d, flag) {
	return Boolean(d?.pd.includes(flag));
}
function familiesOf(id) {
	const d = DRUG_BY_ID[id];
	const out = /* @__PURE__ */ new Set();
	if (id === "tramadol" || d?.name.toLowerCase() === "tramadol") {
		out.add("tramadol");
		out.add("opioid");
	}
	if (id === "dextromethorphan") out.add("dxm");
	if (id === "cocaine") out.add("cocaine");
	if (id === "twentyfive-i" || id.includes("nbome")) out.add("nbome");
	if (id === "nitrous-oxide") out.add("nitrous");
	if (id === "lithium") out.add("lithium");
	if (id === "gabapentin" || id === "pregabalin") out.add("gabapentinoid");
	if ([
		"mdma",
		"mda",
		"methylone",
		"mephedrone",
		"three-mmc"
	].includes(id)) out.add("empathogen");
	if ([
		"fentanyl",
		"dirty-30",
		"pressed-30",
		"heroin",
		"oxycodone",
		"hydrocodone",
		"morphine",
		"hydromorphone",
		"oxymorphone",
		"methadone",
		"codeine",
		"tapentadol",
		"meperidine",
		"loperamide",
		"seven-oh",
		"buprenorphine",
		"kratom",
		"carfentanil",
		"isotonitazene",
		"protonitazene",
		"metonitazene",
		"etonitazene",
		"tianeptine"
	].includes(id) || has(d, "opioid") || has(d, "partial-opioid")) out.add("opioid");
	if (has(d, "benzo-zdrug") || id === "bromazolam") out.add("benzo");
	if (has(d, "alcohol") || id === "ethanol") out.add("alcohol");
	if (has(d, "ghb") || id === "sodium-oxybate" || id === "gbl" || id === "bd-14") out.add("ghb");
	if (has(d, "dissociative") || id === "dextromethorphan") out.add("dissoc");
	if (has(d, "stimulant") && !out.has("empathogen")) out.add("stim");
	if (has(d, "psychedelic")) out.add("psychedelic");
	if (has(d, "cannabinoid")) out.add("cannabis");
	if (has(d, "maoi")) out.add("maoi");
	if (has(d, "ssri-snri")) out.add("ssri");
	if (has(d, "alpha2-agonist") || [
		"xylazine",
		"medetomidine",
		"clonidine",
		"lofexidine"
	].includes(id)) out.add("alpha2");
	return [...out];
}
var RANK = {
	deadly: 5,
	dangerous: 4,
	caution: 3,
	decrease: 2,
	low: 1
};
/** TripSit / PsychonautWiki Dangerous combinations — class pairs, worst rating wins. */
var PAIR = {
	"alcohol|ghb": "deadly",
	"alcohol|opioid": "deadly",
	"alcohol|benzo": "deadly",
	"benzo|ghb": "deadly",
	"ghb|opioid": "deadly",
	"benzo|opioid": "deadly",
	"empathogen|maoi": "deadly",
	"dxm|maoi": "deadly",
	"maoi|stim": "deadly",
	"cocaine|maoi": "deadly",
	"lithium|psychedelic": "dangerous",
	"lithium|nbome": "dangerous",
	"dxm|empathogen": "dangerous",
	"empathogen|tramadol": "dangerous",
	"dxm|tramadol": "dangerous",
	"maoi|psychedelic": "dangerous",
	"maoi|tramadol": "dangerous",
	"alcohol|dissoc": "dangerous",
	"benzo|dissoc": "dangerous",
	"dissoc|opioid": "dangerous",
	"dissoc|ghb": "dangerous",
	"alcohol|cocaine": "dangerous",
	"alpha2|opioid": "dangerous",
	"nbome|psychedelic": "dangerous",
	"cocaine|opioid": "caution",
	"opioid|stim": "caution",
	"alcohol|empathogen": "caution",
	"alcohol|stim": "caution",
	"cocaine|empathogen": "caution",
	"cannabis|psychedelic": "caution",
	"psychedelic|stim": "caution",
	"empathogen|ssri": "decrease",
	"dxm|ssri": "caution",
	"benzo|stim": "caution",
	"gabapentinoid|opioid": "caution",
	"benzo|gabapentinoid": "caution",
	"alcohol|gabapentinoid": "caution",
	"nitrous|dissoc": "caution",
	"cannabis|dissoc": "caution",
	"alpha2|benzo": "caution",
	"alpha2|alcohol": "caution",
	"alpha2|ghb": "caution"
};
function pairKey(a, b) {
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function ratingOf(a, b) {
	let worst = null;
	for (const fa of familiesOf(a)) for (const fb of familiesOf(b)) {
		if (fa === fb && fa !== "stim") continue;
		const r = PAIR[pairKey(fa, fb)];
		if (!r) continue;
		if (!worst || RANK[r] > RANK[worst]) worst = r;
	}
	return worst;
}
var PAIR_COPY = {
	"alcohol|ghb": {
		body: "Even a small extra volume of GHB next to alcohol is memory loss, ataxia, then unconsciousness. Vomit while on the back is how people die. There is no naloxone for GHB. Labeled contraindicated with sodium oxybate.",
		watch: "Recovery position. Stay. This desk does not pick a milliliter."
	},
	"benzo|ghb": {
		body: "Benzodiazepines and GHB potentiate each other hard and unpredictably. Unconsciousness comes fast. Aspiration is the death, not a hangover.",
		watch: "Recovery position. No reversal. Do not stack to sleep."
	},
	"ghb|opioid": {
		body: "Two ways to stop the same airway. Naloxone may lift the opioid; the GHB residual still apneic. Time and ventilation.",
		watch: "Stay. Re-narcotization and GHB nadir both happen after the first 'they're fine.'"
	},
	"alcohol|opioid": {
		body: "Multiplicative respiratory depression — not two separate prescriptions. Deaths cluster on the mix.",
		watch: "Naloxone for the opioid. Extra Narcan does not reverse the alcohol. Recovery position."
	},
	"alcohol|benzo": {
		body: "Alcohol plus a benzodiazepine is one respiratory tree and one amnesia. Boxed on opioid labels for a reason; it is not safer without the opioid.",
		watch: "Flumazenil is not a street antidote. Airway first."
	},
	"benzo|opioid": {
		body: "FDA boxed warning: opioid plus benzodiazepine — profound sedation, respiratory depression, coma, death. Designer bars (bromazolam) are not a lighter version.",
		watch: "Naloxone for the μ. It will not reverse the benzo. Stay."
	},
	"empathogen|maoi": {
		body: "MDMA, MDA, and the cathinone cousins plus an MAOI are serotonin toxicity — clonus, rigidity, deadly fever — not a blunted roll. TripSit rates this deadly.",
		watch: "Hunter tab. This desk does not treat the syndrome and does not pick a milligram."
	},
	"dxm|maoi": {
		body: "DXM is serotonergic at the doses people chase. An MAOI on top is serotonin toxicity, not a cough.",
		watch: "Hunter tab. 2D6 poor metabolizers already sit hot."
	},
	"maoi|stim": {
		body: "Amphetamines or methamphetamine plus an MAOI are a pressor crisis. Hypertensive emergency, not a 'boost.'",
		watch: "Labeled contraindication on the stimulant. Independently review."
	},
	"cocaine|maoi": {
		body: "Cocaine plus an MAOI is a pressor and arrhythmia row. Not a come-down plan.",
		watch: "This desk does not pick a milligram."
	},
	"lithium|psychedelic": {
		body: "Lithium next to a classic psychedelic is a seizure signal in case series PsychonautWiki cites. Not a mood-stabilizer footnote.",
		watch: "Do not 'microdose through' a lithium script."
	},
	"lithium|nbome": {
		body: "NBOMe already seizes. Lithium on top is not a milder blotter.",
		watch: "Ehrlich the unknown blotter. This desk does not pick a microgram."
	},
	"dxm|empathogen": {
		body: "DXM plus MDMA is stacked serotonin. TripSit flags it dangerous. Heat and clonus, not a 'more roll.'",
		watch: "Hunter tab. Do not redose because the first felt light."
	},
	"empathogen|tramadol": {
		body: "Tramadol is an opioid plus SNRI. Next to MDMA: serotonin plus a dropped seizure threshold.",
		watch: "Naloxone for the μ. It will not fix serotonin toxicity."
	},
	"dxm|tramadol": {
		body: "Two serotonergic seizure-lowering drugs. Not two 'weak' OTC stories.",
		watch: "Hunter tab. Airway if a depressant is also in the mix."
	},
	"maoi|psychedelic": {
		body: "Pharmaceutical MAOIs plus a classic psychedelic are not a supervised ayahuasca ceremony. Pressor and serotonin risk is high.",
		watch: "This desk is not a ceremony."
	},
	"maoi|tramadol": {
		body: "Tramadol's SNRI plus an MAOI is labeled serotonin and seizure territory.",
		watch: "Not a 'weak opioid' free pass."
	},
	"alcohol|dissoc": {
		body: "Alcohol plus ketamine (or PCP, DXM) is vomiting plus a lost airway. PsychonautWiki: do not swim. Drownings are the unromantic deaths.",
		watch: "Recovery position. A sitter, not a lake."
	},
	"benzo|dissoc": {
		body: "A benzo on a dissociative is stacked sedation and a lost gag. The 'to kill the k-hole' move is how the airway goes.",
		watch: "This desk does not abort a hole with a milligram."
	},
	"dissoc|opioid": {
		body: "NMDA plus μ — two ways to stop breathing, plus vomit. Naloxone only covers the opioid.",
		watch: "Stay. Do not swim."
	},
	"dissoc|ghb": {
		body: "Two unconsciousness drugs. No naloxone for GHB. Aspiration on the back.",
		watch: "Recovery position. Stay."
	},
	"alcohol|cocaine": {
		body: "Ethanol plus cocaine makes cocaethylene — longer cardiotoxin, not a come-down. Liver and heart, not a CYP footnote.",
		watch: "The stimulant wears off first if an opioid is also there. Naloxone still."
	},
	"alpha2|opioid": {
		body: "Naloxone restores some breaths. They stay down and bradycardic. That residual is xylazine or medetomidine. Extra Narcan will not reverse the α2.",
		watch: "Airway and time. Wounds are necrotic and slow. Do not use alone."
	},
	"nbome|psychedelic": {
		body: "25I-NBOMe sold as LSD. Ehrlich often stays quiet on NBOMe and lights on LSD. NBOMe has killed people at blotter exposures LSD usually does not.",
		watch: "Vasoconstriction, seizure, agitation. This desk does not pick a microgram."
	},
	"cocaine|opioid": {
		body: "Speedball. The stimulant masks apnea until it wears off. Then they stop breathing.",
		watch: "Naloxone still. Stay for the crash."
	},
	"opioid|stim": {
		body: "Same speedball geometry: stimulant on an opioid hides the apnea. The opioid still gets naloxone.",
		watch: "Do not use alone."
	},
	"alcohol|empathogen": {
		body: "TripSit caution: MDMA plus alcohol strains the heart, hides drunkenness, and worsens dehydration and heat. People drink more than they mean to.",
		watch: "Sip to thirst. Cool the room. A sitter."
	},
	"alcohol|stim": {
		body: "Alcohol plus a stimulant is overamping plus a delayed crash. Dehydration, heat, bad decisions, then the depressant lands alone.",
		watch: "Cool, quiet, sip. Not a restraint."
	},
	"cocaine|empathogen": {
		body: "Cocaine can block the roll and still raise heart-attack risk. Overbearing stimulation, not synergy you can count on.",
		watch: "MAOIs are a different, deadlier row."
	},
	"cannabis|psychedelic": {
		body: "Cannabis on a psychedelic can turn a manageable room into a bad one. Unpredictable potentiation, not a 'gentle landing.'",
		watch: "Set, setting, sitter. This desk does not abort a trip."
	},
	"psychedelic|stim": {
		body: "Stimulants on a psychedelic raise anxiety and heart rate. Phenethylamines already stimulate; adding more is body load, not insight.",
		watch: "A quiet room. Not more drug."
	},
	"empathogen|ssri": {
		body: "SSRIs / SNRIs often blunt MDMA while leaving heat, blood pressure, and serotonin-toxicity risk on the table. People redose because 'nothing is happening.' That is the trap.",
		watch: "Do not chase a blunted roll. Hunter tab if they look serotonergic."
	},
	"dxm|ssri": {
		body: "DXM plus an SSRI is stacked serotonin. 2D6 inhibition from the SSRI also raises DXM itself.",
		watch: "Hunter tab. Not a cough-syrup conversation."
	},
	"benzo|stim": {
		body: "A benzo to 'come down' off a stimulant hides how much depressant is on board. When the stimulant leaves, the airway can go with it.",
		watch: "A quiet room is safer than a street bar."
	},
	"gabapentinoid|opioid": {
		body: "Gabapentin or pregabalin on an opioid is still one airway. Not a free 'nerve pain' extra.",
		watch: "OTP window treats this as an extra, not a non-event."
	},
	"benzo|gabapentinoid": {
		body: "Two GABA-adjacent sedatives. Ataxia, falls, stacked apnea with anything else on the table.",
		watch: "Especially in older adults. This desk does not pick a milligram."
	},
	"alcohol|gabapentinoid": {
		body: "Alcohol plus gabapentinoids: sedation and a lost gait, then a lost airway if an opioid is also there.",
		watch: "Recovery position if they go down."
	},
	"nitrous|dissoc": {
		body: "Nitrous on another dissociative is stacked hypoxia and a longer hole. Sit down. Room air between bags.",
		watch: "This desk is not a balloon tutorial."
	},
	"cannabis|dissoc": {
		body: "Cannabis can deepen a k-hole and the anxiety on the way in. Unpredictable, not a landing pad.",
		watch: "A sitter. Do not swim."
	},
	"alpha2|benzo": {
		body: "α2 sedation plus a benzo is two non-opioid ways to lose the airway. Naloxone covers neither.",
		watch: "Still give naloxone if the fold is unknown — the opioid is usually there."
	},
	"alpha2|alcohol": {
		body: "Xylazine or a clinical α2 plus alcohol: stacked sedation, no μ reversal.",
		watch: "Airway. Stay."
	},
	"alpha2|ghb": {
		body: "Two non-opioid unconsciousness drugs. No naloxone for either.",
		watch: "Recovery position. Stay."
	}
};
function pairCopy(a, b, rating) {
	for (const fa of familiesOf(a)) for (const fb of familiesOf(b)) {
		const hit = PAIR_COPY[pairKey(fa, fb)];
		if (hit) return hit;
	}
	return COMBO_COPY[rating];
}
var COMBO_COPY = {
	deadly: {
		title: "TripSit — deadly combination",
		body: "PsychonautWiki / TripSit rate this pair as a combination that kills on the mix: multiplicative respiratory depression, serotonin toxicity, or a pressor crisis — not two separate prescriptions. Effects are not additive.",
		watch: "Do not stack to 'take the edge off.' Recovery position if they are breathing and unresponsive. This desk does not pick a milligram and does not abort the mix."
	},
	dangerous: {
		title: "TripSit — dangerous combination",
		body: "The wiki flags this pair as dangerous: airway loss, seizure, unpredictable vasoconstriction, or a cardiotoxin the stimulant was hiding. Independently review before anyone treats it as a vibe.",
		watch: "A stimulant on a depressant only masks apnea until it wears off. Naloxone for the opioid; it will not reverse the rest."
	},
	caution: {
		title: "TripSit — caution",
		body: "Unpredictable potentiation, anxiety, dehydration, or a delayed crash. Not 'low risk.' The room, the heat, and the second substance all count.",
		watch: "A sitter who can call 911 is the intervention. This desk is not that sitter."
	},
	decrease: {
		title: "TripSit — decreased effect, not a free pass",
		body: "SSRIs / SNRIs often blunt the subjective effect of MDMA while leaving heat, blood pressure, and serotonin-toxicity risk on the table. People redose because 'nothing is happening.' That is the trap.",
		watch: "Do not chase a blunted roll. Hunter tab if they look serotonergic. This desk does not pick a milligram."
	},
	low: {
		title: "TripSit — low risk is not no risk",
		body: "The chart does not list this pair as deadly. Absence of a red cell is not proof of safety. Set, setting, and the rest of the fold still apply.",
		watch: "Wiki, not a label. Independently review."
	}
};
function comboOnDesk(ids) {
	if (ids.length < 2) return [];
	const out = [];
	for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
		const a = ids[i];
		const b = ids[j];
		const rating = ratingOf(a, b);
		if (!rating) continue;
		const na = DRUG_BY_ID[a]?.name ?? a;
		const nb = DRUG_BY_ID[b]?.name ?? b;
		const copy = pairCopy(a, b, rating);
		out.push({
			id: `combo-${a}-${b}`,
			a: na,
			b: nb,
			rating,
			title: `${na} × ${nb}`,
			body: copy.body,
			watch: copy.watch,
			source: `${COMBO_COPY[rating].title}. PsychonautWiki Dangerous combinations (TripSit chart). Wiki, not a label.`
		});
	}
	return out.sort((x, y) => RANK[y.rating] - RANK[x.rating]);
}
var TEACH = {
	mdma: {
		teach: "Entactogen of the amphetamine class. Heat and hyponatremia kill more people on this molecule than a 'usual' night. Sip to thirst; do not chug. Pressed pills have carried PMA/PMMA — delayed onset, then a deadly redose. Test the solid. Crystal is not a guarantee. Tolerance builds fast; frequent redose is the toxicity pattern PsychonautWiki warns about.",
		watch: "MAOIs are a serotonin-toxicity row. SSRIs blunt the roll and invite a redose. This desk does not pick a milligram and does not time a 'month off.'"
	},
	mda: {
		teach: "MDMA's demethylenated cousin — more stimulant, same heat and serotonin map. Same PMA-in-the-pill problem when the stamp says ecstasy.",
		watch: "MAOIs still apply. Marquis is a class clue, not a milligram."
	},
	methylone: {
		teach: "Cathinone entactogen (bk-MDMA). Same heat / water / MAOI story as MDMA with a shorter, moreish curve that invites compulsive redose.",
		watch: "Test. Do not stack with MAOIs or other serotonin releasers."
	},
	ketamine: {
		teach: "NMDA dissociative. Drownings and trauma are the unromantic deaths — PsychonautWiki: do not swim. Alcohol or a benzo on the same night is stacked vomiting plus a lost airway. Chronic exposure has a bladder story (cystitis) that is not a CYP row.",
		watch: "A k-hole is not a milligram from this desk. Oral first-pass is a 3A4 trap on the CYP tab. Set, setting, a sitter."
	},
	dextromethorphan: {
		teach: "OTC NMDA / sigma ligand. Serotonergic at the doses people chase. TripSit flags DXM × MDMA, DXM × MAOI, DXM × tramadol as dangerous. Dissociation plus a lost airway if a depressant is in the mix.",
		watch: "2D6 poor metabolizers and strong 2D6 inhibitors raise exposure. Not a cough syrup conversation. Hunter tab if they look serotonergic."
	},
	lsd: {
		teach: "Ergoline psychedelic. Set and setting get louder — a bad room becomes a worse one. Lithium next to a classic psychedelic is a seizure signal. Blotter sold as LSD has been NBOMe; Ehrlich often lights on LSD and stays quiet on NBOMe.",
		watch: "This desk does not abort a trip and does not pick a benzo milligram. Test the blotter."
	},
	psilocybin: {
		teach: "Tryptamine psychedelic (psilocin after dephosphorylation). Same set/setting/sitter rules as LSD. Lithium still applies. MAOIs change the map — not a casual stack.",
		watch: "A walk in the woods is still a setting. Do not drive. Do not be responsible for someone else's body."
	},
	dmt: {
		teach: "Tryptamine. Gut MAO-A destroys oral DMT — which is why pharmaceutical MAOIs plus DMT are not a supervised ayahuasca ceremony. Pressor and serotonin risk is high.",
		watch: "This desk is not a ceremony and does not pick a milligram."
	},
	"twentyfive-i": {
		teach: "NBOMe phenethylamine sold as LSD. PsychonautWiki and Erowid document hospitalizations and deaths at blotter exposures LSD usually does not produce. Vasoconstriction, seizure, agitation. Highly sensitive curve. Extremely little human toxicology.",
		watch: "Ehrlich is the class clue, not a certificate. Do not treat an unknown blotter as LSD. This desk does not pick a microgram."
	},
	twocb: {
		teach: "Phenethylamine psychedelic. Stimulating. TripSit often rates 2C-B × MDMA as a caution — overbearing body load, not a 'candyflip' from this desk.",
		watch: "Reagents name a class. NBOMe is a different, deadlier blotter story."
	},
	"sodium-oxybate": {
		teach: "GHB. Steep curve: a small extra volume is the difference between sleep and apnea. Short duration invites compulsive redose. Alcohol and benzos are labeled contraindicated with sodium oxybate — coma, not a hangover. There is no naloxone for GHB.",
		watch: "Recovery position. Do not leave them on their back. GBL and 1,4-BD convert to GHB. This desk does not pick a milliliter."
	},
	gbl: {
		teach: "GHB prodrug. Same apnea map as sodium oxybate once it converts. Same alcohol / benzo contraindication.",
		watch: "Not a recipe. Not a milliliter. Recovery position, stay."
	},
	"bd-14": {
		teach: "1,4-Butanediol converts to GHB via ADH. Alcohol occupies ADH and can delay the dump — then they go down later. Same recovery-position story.",
		watch: "Delayed coma is the trap. This desk does not pick a milliliter."
	},
	ethanol: {
		teach: "The depressant everything else is measured against. Multiplicative with opioids, benzos, GHB. Cocaethylene with cocaine. Aspiration on the back.",
		watch: "Recovery position. Good Samaritan laws in most US states cover the caller. Stay."
	},
	fentanyl: {
		teach: "μ-agonist. Street folds are not pharmacy tablets. Naloxone displaces the opioid; it does not reverse xylazine, medetomidine, a benzo, or GHB. Re-narcotization as naloxone wears off is expected. Do not use alone.",
		watch: "Fentanyl immunoassay strips miss nitazenes. Never Use Alone 800-484-3731. This desk is not a kit protocol."
	},
	"dirty-30": {
		teach: "Pressed 'Perc 30' is usually illicit fentanyl ± xylazine, not oxycodone. The stamp is not an assay.",
		watch: "Naloxone for the μ. Extra Narcan will not reverse the α2. Test strips are a tool, not a certificate."
	},
	heroin: {
		teach: "Diacetylmorphine → morphine. Same μ apnea. Speedball with cocaine: the stimulant masks until it wears off. Do not use alone.",
		watch: "Naloxone, recovery position, stay. HCV from shared equipment is the chronic story."
	},
	xylazine: {
		teach: "Veterinary α2 agonist cut into the opioid supply. Naloxone restores some breaths; they stay down and bradycardic. That residual is the α2. Wounds are necrotic and slow — not 'just an abscess.'",
		watch: "Medetomidine is showing up the same way. Extra naloxone is not extra xylazine reversal. Airway and time."
	},
	medetomidine: {
		teach: "Same α2 family as xylazine, showing up in the same folds. Naloxone will not reverse it.",
		watch: "Still give naloxone — the opioid is usually there. Then airway."
	},
	bromazolam: {
		teach: "Designer benzodiazepine. A pressed bar is not pharmaceutical alprazolam. Dose and duration wander. Flumazenil is not a street-overdose antidote — seizures in dependent people.",
		watch: "Benzo withdrawal is a medical emergency. Airway first. This desk is not a detox plan."
	},
	cocaine: {
		teach: "Stimulant plus local anesthetic. Ethanol makes cocaethylene — longer cardiotoxin, not a come-down. Speedball with an opioid: the stimulant masks apnea. Overamping is agitation, rigidity, hyperthermia — cool the room, do not restrain a rhabdomyolysis into being.",
		watch: "MAOIs are a pressor crisis. This desk does not pick a milligram."
	},
	methamphetamine: {
		teach: "Long stimulant. Overamping, hyperthermia, paranoia. Do not mix with MAOIs. A depressant on top to 'come down' is how the airway is lost later.",
		watch: "Cool, quiet, sip. Not a restraint. Not a street benzo protocol from this desk."
	},
	amphetamine: {
		teach: "Same stimulant / MAOI / overamp map as the rest of the class, with a labeled product that is not the street fold.",
		watch: "MAOIs contraindicated. Heat and water still apply if they are dancing."
	},
	"nitrous-oxide": {
		teach: "Dissociative inhalant. Hypoxia if the bag never meets room air. Chronic use has a B12 / neuropathy story. PsychonautWiki flags stacking nitrous on other dissociatives as a caution.",
		watch: "This desk is not a balloon tutorial. Sit down. Someone sober in the room."
	},
	dronabinol: {
		teach: "THC. Edibles are delayed onset — the redose trap PsychonautWiki names as 'you can always take more.' Alcohol plus cannabis is spinning, not synergy you can count on. On a psychedelic, cannabis can turn a manageable room into a bad one.",
		watch: "This desk does not pick a milligram. CYP2C9/3A4 sit on the CYP tab for the labeled product."
	},
	kratom: {
		teach: "Mitragynine / 7-OH. Atypical opioid — naloxone still belongs on the tray at high exposure. Street 7-OH extracts are not a tea.",
		watch: "Stacked with a benzo or alcohol is still one airway. This desk does not pick a gram of leaf."
	},
	"seven-oh": {
		teach: "7-Hydroxymitragynine — the μ-agonist in the kratom story, sold as extracts. Treat as an opioid for naloxone and stacking.",
		watch: "Do not use alone. Strips may miss it."
	},
	tramadol: {
		teach: "Opioid plus SNRI. Seizure threshold drops. TripSit flags tramadol × MDMA, tramadol × DXM, tramadol × MAOI as dangerous — serotonin plus seizure, not a 'weak opioid' free pass.",
		watch: "Naloxone for the μ component. It will not fix serotonin toxicity. Hunter tab."
	},
	phenibut: {
		teach: "GABA-B analogue. Dependence and withdrawal seizures after stacked nightly use. Alcohol / benzo / GHB potentiation.",
		watch: "This desk is not a taper. Do not mix depressants."
	},
	lithium: {
		teach: "PsychonautWiki / case series: lithium next to a classic psychedelic is a seizure signal, not a mood-stabilizer footnote.",
		watch: "Do not 'microdose through' a lithium script. Independently review."
	},
	pcp: {
		teach: "Long NMDA dissociative. Mania, trauma, airway. Alcohol on the same night is the vomiting-plus-unconsciousness pair PsychonautWiki flags.",
		watch: "Do not swim. Do not restrain into rhabdomyolysis. A sitter, not a fight."
	}
};
function wikiOnDesk(ids) {
	const out = [];
	for (const id of ids) {
		const d = DRUG_BY_ID[id];
		const title = pwTitleFor(id);
		if (!d || !title) continue;
		const teach = TEACH[id] ?? TEACH[titleAlias(id)];
		out.push({
			id,
			name: d.name,
			wikiTitle: title,
			href: pwHref(title),
			cls: d.cls,
			teach: teach?.teach ?? `${d.cls}. Open PsychonautWiki for the community monograph. Wiki, not a label. This desk does not pick a milligram, a route, or a cooking method.`,
			watch: teach?.watch ?? "Independently review. Harm reduction is not a protocol from this desk."
		});
	}
	return out;
}
function titleAlias(id) {
	if (id === "pressed-30") return "dirty-30";
	if (id === "esketamine") return "ketamine";
	if (id === "cannabidiol") return "dronabinol";
	if (id === "etizolam" || id === "clonazolam" || id === "flualprazolam" || id === "flubromazolam") return "bromazolam";
	return id;
}
function wikiResourcesFor(ids) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const card of wikiOnDesk(ids)) {
		if (seen.has(card.href)) continue;
		seen.add(card.href);
		out.push({
			name: `PsychonautWiki · ${card.wikiTitle}`,
			href: card.href,
			why: `${card.cls}. Wiki monograph — independently review. Not a milligram.`
		});
	}
	return out;
}
/** Drop dosage, volumetric, and route-how-to sentences from a live wiki extract. */
function sanitizeWiki(text) {
	const raw = text.replace(/\s+/g, " ").trim();
	if (!raw) return {
		text: "",
		stripped: false
	};
	const parts = raw.split(/(?<=[.!?])\s+/);
	const dose = /\b\d+([.,]\d+)?(\s*-\s*\d+([.,]\d+)?)?\s*(mg|µg|ug|mcg|μg|ng|g|kg|ml|mL|l|L|µg\/kg|mg\/kg)\b/i;
	const grams = /\b\d+([.,]\d+)?(\s*-\s*\d+([.,]\d+)?)?\s*grams?\b/i;
	const howTo = /\b(volumetric|eyeball|allergy test|titrated|titrate|inject(?:ion|ed|ing)?|syringe|cook(?:ing|ed)?|spoon|cotton|tie off|sublingual(?:ly)?|insufflat|snort(?:ing|ed)?|plugg(?:ing|ed)?|boof|hot rail|parachute|start with a low dose|work (?:your|their) way up|common recreational dose|threshold dose|light dose|common dose|strong dose|heavy dose|dosage(?:s)? range)\b/i;
	const kept = [];
	let stripped = false;
	for (const s of parts) {
		if (dose.test(s) || grams.test(s) || howTo.test(s)) {
			stripped = true;
			continue;
		}
		kept.push(s);
	}
	let out = kept.join(" ").replace(/\s+/g, " ").trim();
	if (out.length > 640) out = `${out.slice(0, 640).replace(/\s+\S*$/, "")}…`;
	return {
		text: out,
		stripped
	};
}
var PW_PRINCIPLES = [
	{
		title: "There is no safe use — only safer use",
		body: "PsychonautWiki: research the molecule, test the solid, do not eyeball, do not drive, do not swim, do not be responsible for someone else's body while you are intoxicated. Abstinence is valid. So is reducing the next harm."
	},
	{
		title: "You can always take more; you cannot take less",
		body: "Unknown supply, delayed onset (PMA, oral ketamine, edible cannabis), and steep curves (GHB, nitazenes) punish a redose. This desk still does not pick the milligram."
	},
	{
		title: "Chemically test; do not eyeball",
		body: "The fold may not be what it was sold as. Reagents name a class, not a milligram and not a hidden fentanyl. A negative is not proof of safety. DanceSafe and the wiki both say this."
	},
	{
		title: "Do not mix depressants",
		body: "TripSit / PsychonautWiki dangerous-combinations chart: opioids + benzos + alcohol + GHB is how people stop breathing. Effects are multiplicative. A stimulant on top hides it until the stimulant leaves."
	},
	{
		title: "Do not drive. Do not swim.",
		body: "PsychonautWiki names both. Impaired machinery and drownings are unromantic deaths. Do not be the person responsible for children, patients, or a car while intoxicated."
	},
	{
		title: "Set, setting, sitter",
		body: "Hallucinogens amplify the room you already walked into. A positive mindset gets louder; a bad one does too. Familiar indoor room, no one to be responsible for, a sober sitter, an exit that is not more drug."
	},
	{
		title: "A sitter for the unfamiliar",
		body: "Someone sober enough to call 911, put them on their side, and stay. Never Use Alone is a phone that stays on the line. This desk is not a sitter."
	},
	{
		title: "Use should not eat the rest of a life",
		body: "The wiki's least glamorous rule: if the molecule is crowding out work, people, or sleep, that is harm. Treatment referral is SAMHSA 1-800-662-HELP. Independently review."
	}
];
var PW_STATIC_RESOURCES = [
	{
		name: "PsychonautWiki · Responsible drug use",
		href: "https://psychonautwiki.org/wiki/Responsible_drug_use",
		why: "Principles this board paraphrases. Wiki, not a label."
	},
	{
		name: "PsychonautWiki · Dangerous combinations",
		href: "https://psychonautwiki.org/wiki/Dangerous_combinations",
		why: "TripSit combo chart. Depressant stacks and serotonergic traps."
	},
	{
		name: "PsychonautWiki · Recovery position",
		href: "https://psychonautwiki.org/wiki/Recovery_position",
		why: "Unconscious and breathing → on their side so vomit does not kill them."
	},
	{
		name: "PsychonautWiki · Reagent testing kits",
		href: "https://psychonautwiki.org/wiki/Reagent_testing_kits",
		why: "Marquis, Ehrlich, Mandelin, Liebermann — class clues, not purity."
	},
	{
		name: "TripSit combination chart",
		href: "https://wiki.tripsit.me/wiki/Drug_combinations",
		why: "The chart the wiki embeds. Independently review."
	},
	{
		name: "DanceSafe · reagent instructions",
		href: "https://dancesafe.org/testing-kit-instructions/",
		why: "How to read a drop. We do not copy the color chart here."
	}
];
function comboTone(rating) {
	if (rating === "deadly" || rating === "dangerous") return "danger";
	if (rating === "low") return "ok";
	return "warn";
}
//#endregion
export { comboOnDesk as a, pwTitleFor as c, wikiResourcesFor as d, TRIPSIT_NAME as i, sanitizeWiki as l, PW_STATIC_RESOURCES as n, comboTone as o, PW_TITLE as r, pwHref as s, PW_PRINCIPLES as t, wikiOnDesk as u };
