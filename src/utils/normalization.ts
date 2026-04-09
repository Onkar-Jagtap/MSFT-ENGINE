import { US_STATES, CANADA_PROVINCES, INDIA_STATES, AUSTRALIA_STATES } from "../constants";

export function stripSpecialChars(s: any) {
  if (!s) return "";
  return String(s).replace(/[",:']/g, "").replace(/\s+/g, " ").trim();
}

export function toTitleCase(s: any) {
  if (!s) return "";
  return String(s).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export function cleanText(s: any) {
  if (!s && s !== 0) return "";
  return String(s).trim().replace(/[^\w\s@.+\-,()\/&]/g, " ").replace(/\s+/g, " ").trim();
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
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length < 7) return "";
  const cc: Record<string, string> = {
    "united states": "1", "us": "1", "usa": "1", "india": "91", "uk": "44",
    "united kingdom": "44", "australia": "61", "canada": "1", "germany": "49",
    "singapore": "65", "uae": "971", "france": "33", "china": "86"
  };
  const ctry = (country || "").toLowerCase();
  const code = cc[ctry];
  if (code && !digits.startsWith(code)) return `+${code}${digits}`;
  if (digits.startsWith("0")) return `+${digits.slice(1)}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
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
  let s = String(raw).trim();
  s = s.replace(LEGAL_SUFFIXES, "").replace(SPECIAL_CHAR_CO, " ").replace(/\s+/g, " ").trim();
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
