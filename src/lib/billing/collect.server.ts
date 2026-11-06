import { fulfillKey } from "@/lib/billing/commerce";
import {
  defaultPinSet,
  mintKeyFromNote,
  mintKeyFromPaid,
  parseNameList,
  pinRefusal,
  type IssuedPlan,
} from "@/lib/billing/license.server";
import {
  flattenMail,
  MAIL_QUERY,
  parsePaymentMail,
  planFromAmount,
  type DetectedPay,
  type PayRail,
} from "@/lib/billing/payments";
import { listPaidSessions } from "@/lib/billing/stripe.server";

export type CollectRow = {
  source: PayRail;
  soldTo: string;
  email: string;
  key: string;
  plan: IssuedPlan;
  amount: number;
  at: string;
  mailed: boolean;
  messageId?: string;
};

export type MailScan = "ok" | "pending" | "login" | "off";

function nameKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function scanMail(): Promise<{
  status: MailScan;
  loginUrl?: string;
  pays: DetectedPay[];
}> {
  try {
    const { callTool } = await import("@/lib/app-data/client.server");
    const { ConnectorType, GmailTools } = await import("@/lib/app-data/types");
    const res = await callTool(
      GmailTools.search,
      { query: MAIL_QUERY, max_results: 25 },
      { connectorType: ConnectorType.Gmail },
    );
    if (res.pending) return { status: "pending", pays: [] };
    if (res.loginRequired) return { status: "login", loginUrl: res.loginUrl, pays: [] };
    if (!res.ok) return { status: "off", pays: [] };
    const stubs = flattenMail(res.data);
    const pays = stubs.map(parsePaymentMail).filter((p): p is DetectedPay => Boolean(p));
    return { status: "ok", pays };
  } catch {
    return { status: "off", pays: [] };
  }
}

export async function collectLicenses(opts: {
  pin: string;
  plan: IssuedPlan;
  names: string;
  hunt: string;
}) {
  const refused = await pinRefusal(opts.pin);
  if (refused) return { ok: false as const, reason: refused };
  const fallback = opts.plan;
  const rows: CollectRow[] = [];
  const seenKey = new Set<string>();
  const seenName = new Set<string>();

  function add(row: CollectRow) {
    if (seenKey.has(row.key)) return;
    const nk = nameKey(row.soldTo);
    if (nk && seenName.has(nk)) return;
    seenKey.add(row.key);
    if (nk) seenName.add(nk);
    rows.push(row);
  }

  const paid = await listPaidSessions();
  if (paid.ok) {
    for (const s of paid.rows) {
      add({
        source: "stripe",
        soldTo: s.name || s.email || "Card sale",
        email: s.email,
        key: s.key,
        plan: s.plan,
        amount: s.amount,
        at: s.paidAt,
        mailed: s.mailed,
      });
    }
  }

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
      messageId: pay.id,
    });
  }

  const huntNames = new Set(parseNameList(opts.hunt).map(nameKey));
  const extras = parseNameList(`${opts.hunt}\n${opts.names}`);
  for (const soldTo of extras) {
    add({
      source: huntNames.has(nameKey(soldTo)) ? "hunt" : "manual",
      soldTo,
      email: "",
      key: mintKeyFromNote(fallback, soldTo),
      plan: fallback,
      amount: 0,
      at: new Date().toISOString(),
      mailed: false,
    });
  }

  return {
    ok: true as const,
    rows,
    mail: mail.status,
    loginUrl: mail.loginUrl,
    stripeLive: paid.ok,
    defaultPin: defaultPinSet(),
  };
}

export async function draftCollected(opts: { pin: string; rows: CollectRow[] }) {
  const refused = await pinRefusal(opts.pin);
  if (refused) return { ok: false as const, reason: refused };
  const withMail = opts.rows.filter((r) => r.email && !r.mailed && r.source !== "stripe");
  if (!withMail.length) {
    return { ok: false as const, reason: "No buyer emails to draft — copy the packet instead." };
  }
  try {
    const { callTool } = await import("@/lib/app-data/client.server");
    const { ConnectorType, GmailTools } = await import("@/lib/app-data/types");
    let drafted = 0;
    for (const row of withMail.slice(0, 20)) {
      const res = await callTool(
        GmailTools.createDraft,
        {
          to: [row.email],
          subject: "Your FirstPass founding license",
          body: fulfillKey({ key: row.key, soldTo: row.soldTo }),
        },
        { connectorType: ConnectorType.Gmail },
      );
      if (res.pending) return { ok: false as const, reason: "Mail is still connecting. Try again in a moment." };
      if (res.loginRequired) {
        return { ok: false as const, reason: "Continue with Grok to draft in Gmail.", loginUrl: res.loginUrl };
      }
      if (res.ok) drafted += 1;
    }
    if (!drafted) {
      return { ok: false as const, reason: "Could not reach Gmail drafts on this desk." };
    }
    return { ok: true as const, drafted };
  } catch {
    return { ok: false as const, reason: "Could not reach Gmail drafts on this desk." };
  }
}
