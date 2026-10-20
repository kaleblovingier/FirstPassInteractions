// Card text must carry no doses and no prices. Pairs that trip either are left out of the package.
export const DOSE_RE = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|mEq|mmol|units?|IU|mL|kg)\b(?:\s*\/\s*(?:kg|day|dL|L|h|min))?/i;
export const PRICE_RE = /[$€£]\s*\d|\b\d+(?:\.\d+)?\s*(?:USD|dollars?)\b/i;
export const hasDose = (s) => DOSE_RE.test(s);
export const hasPrice = (s) => PRICE_RE.test(s);
