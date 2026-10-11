/** OpenFDA / FAERS / RxNorm / PubChem / DailyMed / shortages. Server-only. */

import type {
  DailyMedHit,
  FaersHit,
  FdaLabel,
  LiveSources,
  NdcHit,
  PubchemCard,
  RecallHit,
  RxnormCard,
  ShortageHit,
} from "./live";
import { EMPTY_LIVE } from "./live";
import { BoundedLRUCache } from "../server/cache";

export type { DailyMedHit, FaersHit, FdaLabel, LiveSources, NdcHit, PubchemCard, RecallHit, RxnormCard, ShortageHit };

export const liveCache = new BoundedLRUCache<LiveSources>(500, 30 * 60 * 1000);
const UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";

function plain(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string, n = 720) {
  const t = plain(s);
  if (t.length <= n) return t;
  return `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
}

async function getJson(url: string, ms = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function firstString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function stringList(v: unknown, cap = 6): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, cap);
}

async function fetchLabel(name: string): Promise<FdaLabel | null> {
  const q = encodeURIComponent(`openfda.generic_name:"${name}"`);
  const url = `https://api.fda.gov/drug/label.json?search=${q}&limit=1`;
  try {
    const json = (await getJson(url)) as {
      results?: Array<Record<string, unknown>>;
    };
    const row = json.results?.[0];
    if (!row) return null;
    const open = (row.openfda ?? {}) as Record<string, unknown>;
    return {
      boxed: clip(firstString(row.boxed_warning), 900),
      pregnancy: clip(firstString(row.pregnancy) || firstString(row.pregnancy_or_breast_feeding), 420),
      interactions: clip(firstString(row.drug_interactions), 520),
      contraindications: clip(firstString(row.contraindications), 420),
      warnings: clip(firstString(row.warnings_and_cautions) || firstString(row.warnings), 520),
      indications: clip(firstString(row.indications_and_usage), 360),
      brands: stringList(open.brand_name, 5),
      rxcui: stringList(open.rxcui, 4),
      unii: stringList(open.unii, 2),
      classes: stringList(open.pharm_class_epc, 4),
      setId: typeof row.set_id === "string" ? row.set_id : "",
    };
  } catch {
    return null;
  }
}

async function fetchFaers(name: string): Promise<FaersHit[]> {
  const q = encodeURIComponent(`patient.drug.openfda.generic_name:"${name}"`);
  const url = `https://api.fda.gov/drug/event.json?search=${q}&count=patient.reaction.reactionmeddrapt.exact`;
  try {
    const json = (await getJson(url)) as { results?: Array<{ term?: string; count?: number }> };
    return (json.results ?? [])
      .filter((r) => typeof r.term === "string" && typeof r.count === "number")
      .slice(0, 8)
      .map((r) => ({ term: String(r.term), count: Number(r.count) }));
  } catch {
    return [];
  }
}

async function fetchRxnorm(name: string): Promise<RxnormCard | null> {
  try {
    const found = (await getJson(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`,
    )) as { idGroup?: { rxnormId?: string[] } };
    const rxcui = found.idGroup?.rxnormId?.[0];
    if (!rxcui) return null;
    let brands: string[] = [];
    try {
      const rel = (await getJson(
        `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=BN`,
      )) as {
        relatedGroup?: {
          conceptGroup?: Array<{ tty?: string; conceptProperties?: Array<{ name?: string }> }>;
        };
      };
      brands = (rel.relatedGroup?.conceptGroup ?? [])
        .flatMap((g) => g.conceptProperties ?? [])
        .map((c) => c.name)
        .filter((n): n is string => Boolean(n))
        .filter((n, i, all) => all.indexOf(n) === i)
        .slice(0, 8);
    } catch {
      brands = [];
    }
    return { rxcui, name, brands };
  } catch {
    return null;
  }
}

async function fetchPubchem(name: string): Promise<PubchemCard | null> {
  try {
    const json = (await getJson(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`,
    )) as {
      PropertyTable?: {
        Properties?: Array<{
          CID?: number;
          MolecularFormula?: string;
          MolecularWeight?: number | string;
          IUPACName?: string;
          InChIKey?: string;
        }>;
      };
    };
    const row = json.PropertyTable?.Properties?.[0];
    if (!row?.CID) return null;
    return {
      cid: String(row.CID),
      formula: row.MolecularFormula ?? "",
      mw: row.MolecularWeight != null ? String(row.MolecularWeight) : "",
      inchikey: row.InChIKey ?? "",
      iupac: row.IUPACName ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchDailyMed(name: string): Promise<DailyMedHit[]> {
  try {
    const json = (await getJson(
      `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(name)}&pagesize=3`,
    )) as {
      data?: Array<{ setid?: string; title?: string; published_date?: string }>;
    };
    return (json.data ?? [])
      .filter((r) => typeof r.setid === "string")
      .slice(0, 3)
      .map((r) => ({
        setId: String(r.setid),
        title: clip(String(r.title ?? name), 120),
        published: String(r.published_date ?? "").slice(0, 10),
      }));
  } catch {
    return [];
  }
}

async function fetchShortage(name: string): Promise<ShortageHit[]> {
  const q = encodeURIComponent(`generic_name:"${name}"`);
  try {
    const json = (await getJson(`https://api.fda.gov/drug/shortages.json?search=${q}&limit=5`)) as {
      results?: Array<{
        generic_name?: string | string[];
        status?: string;
        update_date?: string;
      }>;
    };
    return (json.results ?? []).slice(0, 4).map((r) => ({
      name: firstString(r.generic_name) || name,
      status: String(r.status ?? "unknown"),
      updated: String(r.update_date ?? "").slice(0, 10),
    }));
  } catch {
    return [];
  }
}

async function fetchNdc(name: string): Promise<NdcHit[]> {
  const q = encodeURIComponent(`generic_name:"${name}"`);
  try {
    const json = (await getJson(`https://api.fda.gov/drug/ndc.json?search=${q}&limit=5`)) as {
      results?: Array<{
        product_ndc?: string;
        brand_name?: string;
        generic_name?: string;
        dosage_form?: string;
      }>;
    };
    return (json.results ?? []).slice(0, 4).map((r) => ({
      ndc: String(r.product_ndc ?? ""),
      brand: String(r.brand_name ?? ""),
      generic: String(r.generic_name ?? name),
      form: String(r.dosage_form ?? ""),
    }));
  } catch {
    return [];
  }
}

async function fetchRecalls(name: string): Promise<RecallHit[]> {
  const q = encodeURIComponent(`product_description:"${name}"`);
  try {
    const json = (await getJson(`https://api.fda.gov/drug/enforcement.json?search=${q}&limit=4`)) as {
      results?: Array<{
        reason_for_recall?: string;
        status?: string;
        recall_initiation_date?: string;
        classification?: string;
      }>;
    };
    return (json.results ?? []).slice(0, 3).map((r) => ({
      reason: clip(String(r.reason_for_recall ?? "Recall"), 180),
      status: String(r.status ?? ""),
      date: String(r.recall_initiation_date ?? "").slice(0, 10),
      classification: String(r.classification ?? ""),
    }));
  } catch {
    return [];
  }
}

const ALIAS: Record<string, string> = {
  "tmp-smx": "sulfamethoxazole",
  paxlovid: "nirmatrelvir",
  epclusa: "sofosbuvir",
  "insulin-glargine": "insulin glargine",
  valproate: "valproic acid",
  "st-johns-wort": "",
  "dirty-30": "",
  "seven-oh": "",
  "twentyfive-i": "",
  xylazine: "xylazine",
  "pressed-30": "",
  nac: "acetylcysteine",
};

export function liveQueryName(id: string, name: string) {
  if (id in ALIAS) return ALIAS[id];
  if (id.startsWith("__")) return "";
  return name.replace(/\(.*?\)/g, "").trim();
}

export async function lookupLive(id: string, name: string): Promise<LiveSources> {
  const query = liveQueryName(id, name);
  const chem = (query || name).replace(/\(.*?\)/g, "").trim();
  if (!chem) {
    return { ok: true, query: name, ...EMPTY_LIVE, reason: "No live label for this item." };
  }

  try {
    return await liveCache.getOrFetch(chem, async () => {
      const labeled = Boolean(query);
      const [
        labelRes,
        faersRes,
        rxnormRes,
        pubchemRes,
        dailymedRes,
        shortageRes,
        ndcRes,
        recallsRes,
      ] = await Promise.allSettled([
        labeled ? fetchLabel(query) : Promise.resolve(null),
        labeled ? fetchFaers(query) : Promise.resolve([]),
        labeled ? fetchRxnorm(query) : fetchRxnorm(chem),
        fetchPubchem(chem),
        labeled ? fetchDailyMed(query) : Promise.resolve([]),
        labeled ? fetchShortage(query) : Promise.resolve([]),
        labeled ? fetchNdc(query) : Promise.resolve([]),
        labeled ? fetchRecalls(query) : Promise.resolve([]),
      ]);

      const label = labelRes.status === "fulfilled" ? labelRes.value : null;
      const faers = faersRes.status === "fulfilled" ? faersRes.value : [];
      const rxnorm = rxnormRes.status === "fulfilled" ? rxnormRes.value : null;
      const pubchem = pubchemRes.status === "fulfilled" ? pubchemRes.value : null;
      const dailymed = dailymedRes.status === "fulfilled" ? dailymedRes.value : [];
      const shortage = shortageRes.status === "fulfilled" ? shortageRes.value : [];
      const ndc = ndcRes.status === "fulfilled" ? ndcRes.value : [];
      const recalls = recallsRes.status === "fulfilled" ? recallsRes.value : [];

      const value: LiveSources = {
        ok: true,
        query: query || chem,
        label,
        faers,
        rxnorm,
        pubchem,
        dailymed,
        shortage,
        ndc,
        recalls,
        reason: labeled ? undefined : "No FDA label for this item — PubChem still ran.",
      };
      return value;
    });
  } catch (err) {
    const reason = err instanceof Error ? (err.name === "AbortError" ? "Timed out." : err.message) : "Unreachable.";
    return { ok: false, query: query || chem, ...EMPTY_LIVE, reason };
  }
}

