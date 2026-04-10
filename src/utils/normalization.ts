import { US_STATES, CANADA_PROVINCES, INDIA_STATES, AUSTRALIA_STATES } from "../constants";

export function stripSpecialChars(s: any) {
  if (!s) return "";
  // Rule 3: address: Remove ".", "(", ")", "," and other special chars
  return String(s).replace(/[.(),]/g, "").replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function toTitleCase(s: any) {
  if (!s) return "";
  return String(s).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export function cleanText(s: any) {
  if (!s && s !== 0) return "";
  return String(s).replace(/\s+/g, " ").trim();
}

export function normalizeEmail(raw: any) {
  if (!raw) return "";
  // STRICT: ONLY trim + lowercase
  return String(raw).trim().toLowerCase();
}

export function isValidEmail(email: any) {
  if (!email) return false;
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(String(email).trim());
}

export function cleanPhone(phone: any, country: any) {
  if (!phone) return "";
  // Rule 3: telephone: MUST be E.164 format Example: +14155552671
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length < 7) return "";
  const cc: Record<string, string> = {
    "united states": "1", "us": "1", "usa": "1", "india": "91", "uk": "44",
    "united kingdom": "44", "australia": "61", "canada": "1", "germany": "49",
    "singapore": "65", "uae": "971", "france": "33", "china": "86"
  };
  const ctry = (country || "").toLowerCase();
  const code = cc[ctry];
  
  let result = digits;
  if (code && !digits.startsWith(code)) {
    result = `${code}${digits}`;
  }
  
  return `+${result}`;
}

export function normalizePostalCode(pc: any, country: any) {
  let cleaned = String(pc || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  
  const c = String(country || "").toLowerCase();
  const digits = cleaned.replace(/[^\d]/g, "");
  
  // If it's not purely numeric, we don't pad (e.g. UK, Canada)
  if (digits !== cleaned.replace(/\s/g, "")) {
    return cleaned;
  }

  // Length mapping for common countries
  const lengths: Record<string, number> = {
    "united states": 5, "us": 5, "usa": 5,
    "switzerland": 4, "ch": 4, "swiss": 4,
    "australia": 4, "au": 4,
    "india": 6, "in": 6,
    "germany": 5, "de": 5,
    "france": 5, "fr": 5,
    "spain": 5, "es": 5,
    "italy": 5, "it": 5,
    "austria": 4, "at": 4,
    "belgium": 4, "be": 4,
    "denmark": 4, "dk": 4,
    "norway": 4, "no": 4,
    "sweden": 5, "se": 5,
    "brazil": 8, "br": 8,
    "japan": 7, "jp": 7,
    "china": 6, "cn": 6,
    "singapore": 6, "sg": 6,
    "new zealand": 4, "nz": 4,
    "mexico": 5, "mx": 5,
    "south africa": 4, "za": 4,
    "netherlands": 4, "nl": 4,
    "finland": 5, "fi": 5,
    "greece": 5, "gr": 5,
    "israel": 7, "il": 7,
    "malaysia": 5, "my": 5,
    "philippines": 4, "ph": 4,
    "thailand": 5, "th": 5,
    "turkey": 5, "tr": 5,
    "vietnam": 6, "vn": 6,
    "indonesia": 5, "id": 5,
    "south korea": 5, "kr": 5,
    "taiwan": 5, "tw": 5,
    "russia": 6, "ru": 6,
    "poland": 5, "pl": 5,
    "czech republic": 5, "cz": 5,
    "hungary": 4, "hu": 4,
    "romania": 6, "ro": 6,
    "portugal": 4, "pt": 4,
    "argentina": 4, "ar": 4,
    "chile": 7, "cl": 7,
    "colombia": 6, "co": 6,
    "peru": 5, "pe": 5,
    "ireland": 7, "ie": 7,
    "united kingdom": 0, "uk": 0,
    "canada": 0, "ca": 0
  };

  const targetLen = lengths[c] || 0;
  if (targetLen > 0 && digits.length > 0 && digits.length < targetLen) {
    return digits.padStart(targetLen, "0");
  }
  
  return cleaned;
}

export function expandState(abbr: string, country: string) {
  if (!abbr || !country) return abbr || "";
  const a = String(abbr).trim().toUpperCase();
  const c = String(country).trim().toLowerCase();
  if (c.includes("united states") || c === "us" || c === "usa") return US_STATES[a] || toTitleCase(abbr);
  if (c.includes("canada")) return CANADA_PROVINCES[a] || toTitleCase(abbr);
  if (c.includes("india")) return INDIA_STATES[a] || toTitleCase(abbr);
  if (c.includes("australia")) return AUSTRALIA_STATES[a] || toTitleCase(abbr);
  return toTitleCase(abbr);
}

const LEGAL_SUFFIXES = /\b(pvt\.?|private|ltd\.?|limited|inc\.?|incorporated|llc\.?|corp\.?|corporation|co\.?|company|plc|lp|llp|gmbh|sarl|bv|nv|ag|pty|s\.a\.?|s\.l\.?|s\.r\.l\.?)\b\.?/gi;
const SPECIAL_CHAR_CO = /[^\w\s&]/g;

export function normalizeCompanyName(raw: any) {
  if (!raw) return "";
  // Rule 3: company_name: KEEP apostrophes exactly
  let s = String(raw).trim();
  s = s.replace(LEGAL_SUFFIXES, "").replace(/[^\w\s&']/g, " ").replace(/\s+/g, " ").trim();
  return s.split(" ").map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "").join(" ").trim();
}

export function applyCasingCycle(name: string, idx: number) {
  if (!name) return "";
  const mode = idx % 3;
  if (mode === 1) return name.toLowerCase();
  if (mode === 2) return name.toUpperCase();
  return name;
}

export function buildCompanyDedup(rows: any[], companyCol: string) {
  const map: Record<string, string> = {};
  for (const r of rows) {
    const raw = String(r[companyCol] || "").trim();
    const canonical = normalizeCompanyName(raw);
    const key = canonical.toLowerCase();
    if (!key) continue;
    if (!map[key]) map[key] = canonical;
  }
  return (raw: any, rowIdx: number) => {
    if (!raw) return "";
    const canonical = normalizeCompanyName(String(raw));
    const key = canonical.toLowerCase();
    const base = map[key] || canonical;
    return applyCasingCycle(base, rowIdx);
  };
}

export function resolveNames(email: string, rawFirst: string, rawLast: string) {
  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
  const strip = (s: string) => String(s || "").trim().replace(/[^a-zA-Z\s\-'.]/g, "").trim();
  const local = String(email || "").split("@")[0].toLowerCase();
  const emailTokens = local.replace(/[0-9]+/g, " ").replace(/[._\-]+/g, " ").split(/\s+/).filter(Boolean);

  function matchesEmail(t: string) {
    const x = t.toLowerCase(); if (!x) return false;
    for (const et of emailTokens) {
      if (et === x) return true;
      if (et.length === 1 && x.startsWith(et)) return true;
      if (x.length === 1 && et.startsWith(x)) return true;
    }
    return false;
  }

  function pickBest(parts: string[], fallbackIdx: number) {
    if (!parts.length) return "";
    if (parts.length === 1) return cap(parts[0]);
    const matched = parts.filter(p => matchesEmail(p));
    if (matched.length === 1) return cap(matched[0]);
    if (matched.length > 1) {
      const exact = matched.find(p => emailTokens.includes(p.toLowerCase()));
      return cap(exact || matched[0]);
    }
    return cap(parts[fallbackIdx] || parts[0]);
  }

  const fp = strip(rawFirst).split(/\s+/).filter(Boolean);
  const lp = strip(rawLast).split(/\s+/).filter(Boolean);
  const firstName = fp.length === 0 ? (emailTokens[0] ? cap(emailTokens[0]) : "") : pickBest(fp, 0);
  const lastIdx = emailTokens.length >= 2 ? emailTokens.length - 1 : -1;
  const lastName = lp.length === 0 ? (lastIdx >= 0 ? cap(emailTokens[lastIdx]) : "") : pickBest(lp, lp.length - 1);
  return { firstName, lastName };
}
