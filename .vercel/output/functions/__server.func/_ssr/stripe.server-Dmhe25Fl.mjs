import { i as getRequest } from "./ssr.mjs";
import { t as env } from "./env.server-wS9zOhV6.mjs";
import { a as OPERATOR, f as fulfillKey, y as priceFor } from "./plans-BgnLeOVu.mjs";
import { mintKeyFromPaid, verifyKey } from "./license.server-Deu4zNmD.mjs";
import { t as Stripe } from "../_libs/stripe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stripe.server-Dmhe25Fl.js
function secret() {
	return env("STRIPE_SECRET_KEY");
}
function stripeMode() {
	const key = secret();
	if (!key) return "off";
	if (key.startsWith("sk_test_")) return "test";
	return "live";
}
function client() {
	const key = secret();
	if (!key) return null;
	return new Stripe(key);
}
function publicOrigin() {
	const req = getRequest();
	if (!req) return null;
	const url = new URL(req.url);
	const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0]?.trim();
	const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0]?.trim();
	if (!proto || !host) return null;
	return `${proto}://${host}`;
}
function issuedFor(plan, interval) {
	if (interval === "life") return "life";
	if (plan === "lab") return "lab";
	return "pro";
}
function asPlan(plan) {
	return plan === "lab" ? "lab" : "pro";
}
function asInterval(interval) {
	if (interval === "year" || interval === "month" || interval === "life") return interval;
	return "life";
}
function productName(issued, interval) {
	if (issued === "life") return "FirstPass founding lifetime";
	const span = interval === "year" ? "year" : "month";
	return issued === "lab" ? `FirstPass lab (${span})` : `FirstPass pro (${span})`;
}
function sessionEmail(session) {
	return (session.customer_details?.email || session.customer_email || "").trim();
}
function sessionName(session) {
	return (session.customer_details?.name || "").trim();
}
function paymentIntentId(session) {
	const pi = session.payment_intent;
	if (!pi) return "";
	return typeof pi === "string" ? pi : pi.id;
}
async function sendLicenseMail(opts) {
	const apiKey = env("RESEND_API_KEY");
	if (!apiKey || !opts.to) return false;
	const from = env("LICENSE_FROM") ?? "FirstPass <onboarding@resend.dev>";
	try {
		return (await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				from,
				to: [opts.to],
				bcc: [OPERATOR.email],
				subject: "Your FirstPass founding license",
				text: fulfillKey({
					key: opts.key,
					soldTo: opts.soldTo || opts.to
				})
			})
		})).ok;
	} catch {
		return false;
	}
}
/** Mint, stamp Stripe, receipt-email. Safe to call twice — same key, no double mail. */
async function fulfillPaidSession(stripe, session) {
	const issued = issuedFor(session.metadata?.plan ?? "pro", session.metadata?.interval ?? "life");
	const tagged = session.metadata?.issued ?? issued;
	const key = session.metadata?.license_key || mintKeyFromPaid(tagged, session.id);
	const verified = verifyKey(key);
	if (!verified.ok) return {
		ok: false,
		reason: "Paid, but the desk could not sign a key."
	};
	const email = sessionEmail(session);
	const name = sessionName(session);
	const meta = {};
	for (const [k, v] of Object.entries(session.metadata ?? {})) if (typeof v === "string" && v.length) meta[k] = v;
	meta.product = meta.product || "firstpass";
	meta.license_key = key;
	let mailed = meta.license_mailed === "1";
	const piId = paymentIntentId(session);
	if (piId && meta.receipt_stamped !== "1") try {
		await stripe.paymentIntents.update(piId, {
			description: `${productName(tagged, asInterval(session.metadata?.interval ?? "life"))} — ${key}`,
			...email ? { receipt_email: email } : {}
		});
		meta.receipt_stamped = "1";
	} catch {}
	if (email && !mailed) {
		mailed = await sendLicenseMail({
			to: email,
			key,
			soldTo: name || email
		});
		if (mailed) meta.license_mailed = "1";
	}
	if (meta.license_key !== session.metadata?.license_key || meta.license_mailed !== session.metadata?.license_mailed || meta.receipt_stamped !== session.metadata?.receipt_stamped) try {
		await stripe.checkout.sessions.update(session.id, { metadata: meta });
	} catch {}
	return {
		ok: true,
		key,
		plan: verified.plan,
		lifetime: verified.lifetime,
		license: verified.license,
		email,
		name,
		mailed
	};
}
async function createCheckout(planRaw, intervalRaw) {
	const stripe = client();
	if (!stripe) return {
		ok: false,
		reason: "Card checkout is not live on this desk yet."
	};
	const plan = asPlan(planRaw);
	const interval = asInterval(intervalRaw);
	const issued = issuedFor(plan, interval);
	const dollars = priceFor(plan, interval);
	if (dollars <= 0) return {
		ok: false,
		reason: "That license is free."
	};
	const origin = publicOrigin();
	if (!origin) return {
		ok: false,
		reason: "Could not resolve the return address."
	};
	try {
		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			submit_type: "pay",
			allow_promotion_codes: true,
			billing_address_collection: "auto",
			customer_creation: "if_required",
			payment_intent_data: { description: productName(issued, interval) },
			line_items: [{
				quantity: 1,
				price_data: {
					currency: "usd",
					unit_amount: dollars * 100,
					product_data: {
						name: productName(issued, interval),
						description: "Educational CYP450 desk license. Not medical advice. Not a charting system. Key is issued automatically after payment."
					}
				}
			}],
			success_url: `${origin}/?fp_paid={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/?fp_cancel=1`,
			metadata: {
				product: "firstpass",
				plan,
				interval,
				issued
			}
		});
		if (!session.url) return {
			ok: false,
			reason: "Stripe did not return a checkout URL."
		};
		return {
			ok: true,
			url: session.url
		};
	} catch {
		return {
			ok: false,
			reason: "Stripe could not open checkout. Try again, or pay Venmo."
		};
	}
}
async function claimSession(sessionIdRaw) {
	const stripe = client();
	if (!stripe) return {
		ok: false,
		reason: "Card checkout is not live on this desk yet."
	};
	const sessionId = sessionIdRaw.trim();
	if (!sessionId.startsWith("cs_")) return {
		ok: false,
		reason: "Not a Stripe session."
	};
	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
		if (session.metadata?.product !== "firstpass") return {
			ok: false,
			reason: "That session is not a FirstPass license."
		};
		if (session.payment_status !== "paid") return {
			ok: false,
			reason: "Payment has not cleared yet. Refresh after the receipt, or write if it stalls."
		};
		return fulfillPaidSession(stripe, session);
	} catch {
		return {
			ok: false,
			reason: "Could not read that Stripe session."
		};
	}
}
async function listPaidSessions() {
	const stripe = client();
	if (!stripe) return {
		ok: false,
		reason: "Stripe is not live on this desk yet."
	};
	try {
		const rows = [];
		let startingAfter;
		for (let page = 0; page < 4; page += 1) {
			const list = await stripe.checkout.sessions.list({
				limit: 50,
				status: "complete",
				...startingAfter ? { starting_after: startingAfter } : {}
			});
			for (const session of list.data) {
				if (session.payment_status !== "paid") continue;
				if (session.metadata?.product !== "firstpass") continue;
				const issued = issuedFor(session.metadata.plan ?? "pro", session.metadata.interval ?? "life");
				const tagged = session.metadata.issued ?? issued;
				const key = session.metadata.license_key || mintKeyFromPaid(tagged, session.id);
				rows.push({
					sessionId: session.id,
					email: sessionEmail(session),
					name: sessionName(session),
					key,
					plan: tagged,
					amount: (session.amount_total ?? 0) / 100,
					paidAt: session.created ? (/* @__PURE__ */ new Date(session.created * 1e3)).toISOString() : "",
					mailed: session.metadata.license_mailed === "1"
				});
			}
			if (!list.has_more || !list.data.length) break;
			startingAfter = list.data[list.data.length - 1]?.id;
		}
		return {
			ok: true,
			rows
		};
	} catch {
		return {
			ok: false,
			reason: "Could not list paid sessions."
		};
	}
}
async function handleStripeWebhook(request) {
	const stripe = client();
	const hookSecret = env("STRIPE_WEBHOOK_SECRET");
	if (!stripe || !hookSecret) return Response.json({
		ok: false,
		reason: "webhook unconfigured"
	}, { status: 503 });
	const sig = request.headers.get("stripe-signature");
	if (!sig) return Response.json({
		ok: false,
		reason: "missing signature"
	}, { status: 400 });
	const raw = await request.text();
	let event;
	try {
		event = await stripe.webhooks.constructEventAsync(raw, sig, hookSecret);
	} catch {
		return Response.json({
			ok: false,
			reason: "bad signature"
		}, { status: 400 });
	}
	if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
		let session = event.data.object;
		if (session.payment_status === "paid" && session.metadata?.product === "firstpass") try {
			session = await stripe.checkout.sessions.retrieve(session.id, { expand: ["payment_intent"] });
			await fulfillPaidSession(stripe, session);
		} catch {
			return Response.json({
				ok: false,
				reason: "fulfill failed"
			}, { status: 500 });
		}
	}
	return Response.json({ received: true });
}
//#endregion
export { claimSession, createCheckout, handleStripeWebhook, listPaidSessions, stripeMode };
