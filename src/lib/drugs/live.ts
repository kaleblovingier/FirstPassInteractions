/** Shared shapes for OpenFDA / RxNorm / PubChem / DailyMed / shortages. */

export interface FdaLabel {
  boxed: string;
  pregnancy: string;
  /** Short on-screen excerpt of the interactions section. */
  interactions: string;
  /**
   * Plain interactions text the partner scan reads. Longer than `interactions`
   * so a partner named later in the section can still match. Not shown in full.
   */
  interactionsScan: string;
  contraindications: string;
  warnings: string;
  indications: string;
  brands: string[];
  rxcui: string[];
  unii: string[];
  classes: string[];
  /** DailyMed setid of the SPL that was shown. Empty when OpenFDA omitted it. */
  setId: string;
  /** OpenFDA document id of the SPL that was shown. Empty when omitted. */
  openFdaId: string;
  /** Normalized effective_time, or "" when OpenFDA did not send one. */
  effectiveTime: string;
  /** Setid, OpenFDA id, effective date, and a stored-date mismatch when one exists. */
  identity: string;
}

export interface FaersHit {
  term: string;
  count: number;
}

export interface RxnormCard {
  rxcui: string;
  name: string;
  brands: string[];
}

export interface PubchemCard {
  cid: string;
  formula: string;
  mw: string;
  inchikey: string;
  iupac: string;
}

export interface DailyMedHit {
  setId: string;
  title: string;
  published: string;
}

export interface ShortageHit {
  name: string;
  status: string;
  updated: string;
}

export interface NdcHit {
  ndc: string;
  brand: string;
  generic: string;
  form: string;
}

export interface RecallHit {
  reason: string;
  status: string;
  date: string;
  classification: string;
}

export interface LiveSources {
  ok: boolean;
  query: string;
  label: FdaLabel | null;
  faers: FaersHit[];
  rxnorm: RxnormCard | null;
  pubchem: PubchemCard | null;
  dailymed: DailyMedHit[];
  shortage: ShortageHit[];
  ndc: NdcHit[];
  recalls: RecallHit[];
  reason?: string;
}

export const EMPTY_LIVE = {
  label: null,
  faers: [] as FaersHit[],
  rxnorm: null,
  pubchem: null,
  dailymed: [] as DailyMedHit[],
  shortage: [] as ShortageHit[],
  ndc: [] as NdcHit[],
  recalls: [] as RecallHit[],
};

export interface TrialHit {
  nctId: string;
  title: string;
  status: string;
  phase: string;
}

export interface TrialResult {
  ok: boolean;
  query: string;
  hits: TrialHit[];
  reason?: string;
}

export interface RxnavPair {
  a: string;
  b: string;
  source: string;
  severity: string;
  description: string;
  /** Which SPL was scanned for this pair, including its effective date. */
  identity: string;
}

export interface RxclassHit {
  rxcui: string;
  drug: string;
  className: string;
  classType: string;
  source: string;
}

export interface RxnavReport {
  ok: boolean;
  rxcuis: string[];
  pairs: RxnavPair[];
  classes: RxclassHit[];
  reason?: string;
}
