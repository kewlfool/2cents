const leadingNoisePatterns = [
  /^POS\s+/,
  /^POS DEBIT\s+/,
  /^DEBIT\s+/,
  /^DEBIT CARD PURCHASE\s+/,
  /^CHECKCARD\s+/,
  /^VISA\s+/,
  /^MC\s+/,
  /^PURCHASE\s+/,
  /^CARD PURCHASE\s+/,
  /^DBT PURCHASE\s+/,
  /^ACH DEBIT\s+/,
  /^ACH CREDIT\s+/,
] as const;

const transferLikePatterns = [
  /\bACH\b/,
  /\bAUTOPAY\b/,
  /\bCARD PAYMENT\b/,
  /\bONLINE PAYMENT\b/,
  /\bPAYMENT\b/,
  /\bTHANK YOU\b/,
  /\bTRANSFER\b/,
  /\bVENMO\b/,
  /\bZELLE\b/,
  /\bCASH APP\b/,
] as const;

export function normalizeMerchantName(value: string) {
  let normalized = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[_*#]/g, " ")
    .replace(/&/g, " AND ")
    .replace(/\b(?:REF|REFERENCE|AUTH|TRACE|ID|TRANS)\b[:#-]?\s*[A-Z0-9-]+/gi, " ")
    .replace(/\b\d{5,}\b/g, " ")
    .replace(/[^\w\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  for (const pattern of leadingNoisePatterns) {
    normalized = normalized.replace(pattern, "").trim();
  }

  normalized = normalized
    .replace(/\b(?:US|USA)\b$/g, "")
    .replace(/\b(?:INC|LLC|LTD|CORP|CO|COMPANY)\b$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "UNKNOWN MERCHANT";
}

export function looksLikeTransferMerchant(merchantNormalized: string) {
  return transferLikePatterns.some((pattern) => pattern.test(merchantNormalized));
}
