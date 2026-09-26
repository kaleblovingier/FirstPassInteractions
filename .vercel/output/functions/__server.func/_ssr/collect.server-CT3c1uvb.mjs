import { f as fulfillKey } from "./plans-BgnLeOVu.mjs";
import { defaultPinSet, mintKeyFromNote, mintKeyFromPaid, parseIssuedPlan, parseNameList, pinOk } from "./license.server-Deu4zNmD.mjs";
import { listPaidSessions } from "./stripe.server-Dmhe25Fl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/collect.server-CT3c1uvb.js
var LICENSE_SET = /* @__PURE__ */ new Set([
	12,
	29,
	79,
	99,
	249
]);
var LICENSE_NOTE = /first\s*pass|cyp\s*450|founding\s+license|desk\s+license|enzyme\s+atlas/i;
var REJECT_SUBJECT = /you spent|you withdrew|you transferred|overdue borrow|account statement|debit card|was declined|auto reload|on its way to your bank|transfer was successful|monthly paypal|pick a monthly/i;
function isLicenseAmount(amount) {
	const rounded = Math.round(amount);
	return LICENSE_SET.has(rounded);
}
function looksLikeLicenseNote(text) {
	return LICENSE_NOTE.test(text);
}
function planFromAmount(amount, fallback) {
	const n = Math.round(amount);
	if (n === 79) return "life";
	if (n === 12 || n === 99) return "pro";
	if (n === 29 || n === 249) return "lab";
	return fallback;
}
function railFromFrom(from) {
	const f = from.toLowerCase();
	if (f.includes("venmo")) return "venmo";
	if (f.includes("square.com") || f.includes("cash.app") || f.includes("cash app")) return "cashapp";
	if (f.includes("paypal")) return "paypal";
	return null;
}
function cleanName(raw) {
	const name = raw.replace(/<[^>]+>/g, " ").replace(/&(?:amp|#39|nbsp);/g, " ").replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
	if (!name || /^you$/i.test(name)) return "";
	if (/paid you|has sent you|payment received/i.test(name)) return "";
	return name.slice(0, 80);
}
function parseMoney(raw) {
	const n = Number.parseFloat(raw.replace(/,/g, ""));
	return Number.isFinite(n) ? n : 0;
}
function extractInbound(blob) {
	const paidYou = blob.match(/([A-Za-z][\w .,'-]{1,80}?)\s+paid you\s+\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
	if (paidYou) {
		const soldTo = cleanName(paidYou[1]);
		const amount = parseMoney(paidYou[2]);
		if (soldTo && amount > 0) return {
			soldTo,
			amount
		};
	}
	const receivedFrom = blob.match(/you received\s+\$?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:usd\s+)?from\s+([A-Za-z][\w .,'-]{1,80})/i);
	if (receivedFrom) {
		const soldTo = cleanName(receivedFrom[2]);
		const amount = parseMoney(receivedFrom[1]);
		if (soldTo && amount > 0) return {
			soldTo,
			amount
		};
	}
	const sentYou = blob.match(/([A-Za-z][\w .,'-]{1,80}?)\s+has sent you\s+\$?\s*([\d,]+(?:\.\d{1,2})?)/i);
	if (sentYou) {
		const soldTo = cleanName(sentYou[1]);
		const amount = parseMoney(sentYou[2]);
		if (soldTo && amount > 0) return {
			soldTo,
			amount
		};
	}
	return null;
}
function parsePaymentMail(mail) {
	const rail = railFromFrom(mail.from);
	if (!rail) return null;
	if (REJECT_SUBJECT.test(mail.subject)) return null;
	const blob = `${mail.subject}\n${mail.body}`;
	const inbound = extractInbound(blob);
	if (!inbound) return null;
	if (!isLicenseAmount(inbound.amount) && !looksLikeLicenseNote(blob)) return null;
	if (!isLicenseAmount(inbound.amount) && inbound.amount < 12) return null;
	const noteMatch = blob.match(/(?:for|note)[:\s]+(.{2,80}?)(?:\n|\+|transaction|deposited|$)/i);
	return {
		id: mail.messageId,
		rail,
		soldTo: inbound.soldTo,
		email: "",
		amount: inbound.amount,
		note: noteMatch ? noteMatch[1].trim() : "",
		at: mail.date
	};
}
function asRecord(v) {
	return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}
function flattenMail(data) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node) return;
		if (Array.isArray(node)) {
			node.forEach(walk);
			return;
		}
		const r = asRecord(node);
		if (!r) return;
		const id = typeof r.message_id === "string" ? r.message_id : typeof r.id === "string" ? r.id : "";
		const subject = typeof r.subject === "string" ? r.subject : "";
		const from = typeof r.from === "string" ? r.from : "";
		const body = typeof r.body_preview === "string" && r.body_preview || typeof r.snippet === "string" && r.snippet || typeof r.body === "string" && r.body || typeof r.text === "string" && r.text || "";
		if (id && (subject || body) && !seen.has(id)) {
			seen.add(id);
			out.push({
				messageId: id,
				from,
				subject,
				date: typeof r.date === "string" ? r.date : "",
				body
			});
		}
		if (r.messages) walk(r.messages);
		if (r.threads) walk(r.threads);
		if (r.data) walk(r.data);
	};
	walk(data);
	return out;
}
var MAIL_QUERY = [
	"(from:venmo.com OR from:cash@square.com OR from:paypal.com)",
	"(\"paid you\" OR \"Payment received\" OR \"has sent you\" OR \"You received\")",
	"-subject:spent -subject:withdrew -subject:statement -subject:declined -subject:transfer",
	"newer_than:180d"
].join(" ");
function nameKey(name) {
	return name.trim().toLowerCase().replace(/\s+/g, " ");
}
async function scanMail() {
	try {
		const { callTool } = await import("./client.server-sQ7bLN_3.mjs");
		const { ConnectorType, GmailTools } = await import("./types-DXXiBr9d.mjs").then((n) => n.a);
		const res = await callTool(GmailTools.search, {
			query: MAIL_QUERY,
			max_results: 25
		}, { connectorType: ConnectorType.Gmail });
		if (res.pending) return {
			status: "pending",
			pays: []
		};
		if (res.loginRequired) return {
			status: "login",
			loginUrl: res.loginUrl,
			pays: []
		};
		if (!res.ok) return {
			status: "off",
			pays: []
		};
		return {
			status: "ok",
			pays: flattenMail(res.data).map(parsePaymentMail).filter((p) => Boolean(p))
		};
	} catch {
		return {
			status: "off",
			pays: []
		};
	}
}
async function collectLicenses(opts) {
	if (!pinOk(opts.pin)) return {
		ok: false,
		reason: "Operator PIN is wrong."
	};
	const fallback = parseIssuedPlan(opts.plan);
	const rows = [];
	const seenKey = /* @__PURE__ */ new Set();
	const seenName = /* @__PURE__ */ new Set();
	function add(row) {
		if (seenKey.has(row.key)) return;
		const nk = nameKey(row.soldTo);
		if (nk && seenName.has(nk)) return;
		seenKey.add(row.key);
		if (nk) seenName.add(nk);
		rows.push(row);
	}
	const paid = await listPaidSessions();
	if (paid.ok) for (const s of paid.rows) add({
		source: "stripe",
		soldTo: s.name || s.email || "Card sale",
		email: s.email,
		key: s.key,
		plan: s.plan,
		amount: s.amount,
		at: s.paidAt,
		mailed: s.mailed
	});
	const mail = await scanMail();
	for (const pay of mail.pays) {
		const issued = planFromAmount(pay.amount, fallback);
		add({
			source: pay.rail,
			soldTo: pay.soldTo,
			email: pay.email,
			key: mintKeyFromPaid(issued, `mail:${pay.id}`),
			plan: issued,
			amount: pay.amount,
			at: pay.at,
			mailed: false,
			messageId: pay.id
		});
	}
	const huntNames = new Set(parseNameList(opts.hunt).map(nameKey));
	const extras = parseNameList(`${opts.hunt}\n${opts.names}`);
	for (const soldTo of extras) add({
		source: huntNames.has(nameKey(soldTo)) ? "hunt" : "manual",
		soldTo,
		email: "",
		key: mintKeyFromNote(fallback, soldTo),
		plan: fallback,
		amount: 0,
		at: (/* @__PURE__ */ new Date()).toISOString(),
		mailed: false
	});
	return {
		ok: true,
		rows,
		mail: mail.status,
		loginUrl: mail.loginUrl,
		stripeLive: paid.ok,
		defaultPin: defaultPinSet()
	};
}
async function draftCollected(opts) {
	if (!pinOk(opts.pin)) return {
		ok: false,
		reason: "Operator PIN is wrong."
	};
	const withMail = opts.rows.filter((r) => r.email && !r.mailed && r.source !== "stripe");
	if (!withMail.length) return {
		ok: false,
		reason: "No buyer emails to draft — copy the packet instead."
	};
	try {
		const { callTool } = await import("./client.server-sQ7bLN_3.mjs");
		const { ConnectorType, GmailTools } = await import("./types-DXXiBr9d.mjs").then((n) => n.a);
		let drafted = 0;
		for (const row of withMail.slice(0, 20)) {
			const res = await callTool(GmailTools.createDraft, {
				to: [row.email],
				subject: "Your FirstPass founding license",
				body: fulfillKey({
					key: row.key,
					soldTo: row.soldTo
				})
			}, { connectorType: ConnectorType.Gmail });
			if (res.pending) return {
				ok: false,
				reason: "Mail is still connecting. Try again in a moment."
			};
			if (res.loginRequired) return {
				ok: false,
				reason: "Continue with Grok to draft in Gmail.",
				loginUrl: res.loginUrl
			};
			if (res.ok) drafted += 1;
		}
		if (!drafted) return {
			ok: false,
			reason: "Could not reach Gmail drafts on this desk."
		};
		return {
			ok: true,
			drafted
		};
	} catch {
		return {
			ok: false,
			reason: "Could not reach Gmail drafts on this desk."
		};
	}
}
//#endregion
export { collectLicenses, draftCollected };
