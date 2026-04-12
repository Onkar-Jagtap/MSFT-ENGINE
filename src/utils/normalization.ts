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
const SPECIAL_CHAR_CO = /[^\w\s&']/g;

export function normalizeCompanyName(raw: any) {
  if (!raw) return "";
  let s = String(raw).trim();
  s = s.replace(LEGAL_SUFFIXES, "").replace(SPECIAL_CHAR_CO, " ").replace(/\s+/g, " ").trim();
  return s.split(" ").map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "").join(" ").trim();
}

export function cleanAddress(raw: any) {
  if (!raw) return "";
  return String(raw).replace(/[.,/()]/g, "").replace(/\s+/g, " ").trim();
}

export function generateLeadDownloadDate(index: number, totalCount: number): string {
  const now = new Date();

  // Step 1: Find what hour it is in IST right now
  const istHour = parseInt(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false
    }),
    10
  );

  // Step 2: Get current New York date as a real Date object
  const nyDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  // Step 3: If IST hour is between 0 and 6 (midnight to 6:59 AM),
  // the user is still in the shift that started at 6 PM yesterday IST.
  // New York is still on the previous day, so subtract 1 from NY date
  // to lock it to the shift-start date.
  if (istHour >= 0 && istHour < 7) {
    nyDate.setDate(nyDate.getDate() - 1);
  }
  // If IST hour is 18-23 (6 PM to midnight), use NY date as-is.
  // No change needed because NY is naturally behind IST.

  // Step 4: Format the date
  const yyyy = nyDate.getFullYear();
  const mm = String(nyDate.getMonth() + 1).padStart(2, "0");
  const dd = String(nyDate.getDate()).padStart(2, "0");

  // Step 5: Distribute timestamps between 09:30:00 and 11:30:00
  // Each row gets a unique second using prime number spacing
  const startSec = 9 * 3600 + 30 * 60; // = 34200 seconds
  const range = 7200;                    // 2 hours = 7200 seconds
  const offset = (index * 137) % range;  // 137 is prime, spreads evenly
  const totalSec = startSec + offset;

  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${h}:${m}:${s}`;
}

const POSTAL_LENGTHS: Record<string, number> = {
  // North America — numeric only (Canada is alpha, handled separately)
  "united states": 5, "us": 5, "usa": 5,
  "mexico": 5,

  // Europe — numeric postal codes
  "germany": 5, "france": 5, "italy": 5, "spain": 5,
  "sweden": 5, "finland": 5, "poland": 5,
  "czech republic": 5, "greece": 5, "turkey": 5,
  "netherlands": 4, "belgium": 4, "switzerland": 4, "austria": 4,
  "norway": 4, "denmark": 4, "portugal": 4, "hungary": 4,
  "bulgaria": 4,

  // Asia Pacific
  "india": 6, "china": 6, "singapore": 6,
  "japan": 7, "south korea": 5,
  "australia": 4, "new zealand": 4,
  "thailand": 5, "malaysia": 5, "indonesia": 5,
  "pakistan": 5, "bangladesh": 4, "vietnam": 6,
  "philippines": 4,

  // Middle East and Africa
  "saudi arabia": 5, "uae": 5, "united arab emirates": 5,
  "egypt": 5, "south africa": 4, "nigeria": 6, "israel": 7,

  // South America and others
  "brazil": 8, "argentina": 4,
  "russia": 6, "ukraine": 5, "romania": 6,
};

// Countries that use alphanumeric postal codes — never pad these
const ALPHA_POSTAL_COUNTRIES = new Set([
  "united kingdom", "uk", "gb", "great britain",
  "canada", "ca",
  "ireland", "ie",
  "malta", "mt",
  "netherlands", // dutch codes can be "1234 AB" format
]);

export function fixPostalCode(raw: string, countryRaw: string): string {
  if (!raw || !raw.trim()) return "";

  const trimmed = raw.trim();

  // Use lowercase ONLY for the dictionary lookup
  // Never modify countryRaw — the output file keeps original casing
  const key = String(countryRaw || "").trim().toLowerCase();

  // If this country uses alphanumeric codes, return as-is immediately
  if (ALPHA_POSTAL_COUNTRIES.has(key)) return trimmed;

  // Look up required length for this country
  const requiredLength = POSTAL_LENGTHS[key];

  // Country not in our list — return as-is
  if (!requiredLength) return trimmed;

  // If postal code has ANY letter — return as-is, never pad
  const isNumericOnly = /^\d+$/.test(trimmed);
  if (!isNumericOnly) return trimmed;

  // Numeric and shorter than required — pad zeros at the front
  if (trimmed.length < requiredLength) {
    return trimmed.padStart(requiredLength, "0");
  }

  // Already correct length or longer — return as-is
  return trimmed;
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
