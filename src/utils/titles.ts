import { MSFT_INDUSTRY_MAP, MSFT_KEYWORDS, TITLE_VARIATIONS, DEFAULT_TITLE_POOL, TITLE_BANK } from "../constants";
import { toTitleCase } from "./normalization";

export function mapIndustry(raw: any) {
  if (!raw) return "";
  const cleaned = String(raw).trim();
  const n = cleaned.toLowerCase().replace(/[^a-z0-9\s&]/g, " ").replace(/\s+/g, " ").trim();
  if (MSFT_INDUSTRY_MAP[n]) return MSFT_INDUSTRY_MAP[n];
  let best: string | null = null, bestLen = 0;
  for (const [k, v] of Object.entries(MSFT_INDUSTRY_MAP)) {
    if (n.includes(k) && k.length > bestLen) {
      best = v;
      bestLen = k.length;
    }
  }
  if (best) return best;
  for (const [kw, v] of MSFT_KEYWORDS) {
    if (n.includes(kw)) return v;
  }
  return toTitleCase(cleaned);
}

export function mapEmployeeSize(raw: any) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (/\d.*[-–].*\d|10,000\+/.test(s)) return s;
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  if (isNaN(n)) return s;
  if (n <= 4) return "2-4"; if (n <= 9) return "5-9"; if (n <= 24) return "10-24";
  if (n <= 49) return "25-49"; if (n <= 99) return "50-99"; if (n <= 249) return "100-249";
  if (n <= 999) return "250-999"; if (n <= 9999) return "1,000-9,999";
  return "10,000+";
}

export function mapFnToKey(fn: string) {
  const f = (fn || "").toLowerCase();
  if (/\bit\b|information tech|technology|software|cyber|digital|infrastructure/.test(f)) return "Information Technology";
  if (/sales|revenue|account|business dev/.test(f)) return "Sales";
  if (/finance|financial|accounting|treasury|fiscal/.test(f)) return "Finance";
  if (/marketing|brand|demand|growth|campaign|content/.test(f)) return "Marketing";
  if (/operat|supply chain|logistics|production|process/.test(f)) return "Operations";
  if (/security|cyber|risk|ciso/.test(f)) return "Security";
  if (/hr\b|human resource|people|talent|workforce/.test(f)) return "Human Resources";
  if (/engineer|develop|software|platform|r&d/.test(f)) return "Engineering";
  if (/general|management|executive|strategy/.test(f)) return "General Management";
  return null;
}

const _titleCursors: Record<string, number> = {};

export function generateTitle(fn: string, level: string) {
  const fnKey = mapFnToKey(fn) || "General Management";
  const lvl = level || "Director";
  const pool = (TITLE_VARIATIONS[fnKey]?.[lvl]) || DEFAULT_TITLE_POOL[lvl] || DEFAULT_TITLE_POOL["Director"];
  const key = `${fnKey}:${lvl}`;
  if (!_titleCursors[key]) _titleCursors[key] = Math.floor(Math.random() * pool.length);
  const title = pool[_titleCursors[key] % pool.length];
  _titleCursors[key]++;
  return title;
}

export function parseSpecJobTitles(rawText: string) {
  if (!rawText || typeof rawText !== "string") return [];
  const results: any[] = [];
  function inferLevel(text: string) {
    const t = text.toLowerCase();
    if (/c.level|cxo|c\s*suite/.test(t)) return "CXO";
    if (/\bvp\b|vice.?president/.test(t)) return "VP";
    if (/director\+|director and above/.test(t)) return "Director";
    if (/\bdirector\b/.test(t)) return "Director";
    if (/\bmanager\b/.test(t)) return "Manager";
    if (/\bowner\b/.test(t)) return "Owner";
    if (/\bpartner\b/.test(t)) return "Partner";
    if (/\bsenior\b/.test(t)) return "Senior";
    return "Director";
  }
  const lines = rawText.split(/\n|\r\n|\r|;/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^(primary|secondary|tertiary)\s*(audience)?[:\-]/i.test(line)) continue;
    if (/^note\b/i.test(line)) continue;
    if (line.length < 3) continue;
    const sepMatch = line.match(/^(.+?)[\s]*[-–—:]+[\s]*(director\+?|vp\+?|svp|manager|c.level|cxo|owner|partner|senior)$/i);
    if (sepMatch) {
      const fn = sepMatch[1].replace(/[-–—:]+$/, "").trim();
      const level = inferLevel(sepMatch[2].trim());
      const fnKey = mapFnToKey(fn) || fn;
      results.push({ title: generateTitle(fnKey, level), level, fn: fnKey });
      continue;
    }
    const level = inferLevel(line);
    const fn = line.replace(/\b(director\+?|vp\+?|svp|manager|c.level|cxo|owner|partner|executive|senior)\b/gi, "").trim() || line;
    const fnKey = mapFnToKey(fn) || fn;
    results.push({ title: generateTitle(fnKey, level), level, fn: fnKey });
  }
  return results.filter(r => r.title && r.title.length > 2);
}

const LEVEL_DIST_PCT: Record<string, number> = { "CXO": 5, "VP": 10, "Director": 15, "Manager": 30, "Owner": 5, "Partner": 5, "Senior": 20, "Individual Contributor": 10 };

function matchToAllowed(
  detected: string, 
  allowedFunctions: string[], 
  fallback: string
): string {
  if (!allowedFunctions || allowedFunctions.length === 0) return detected;
  
  const match = allowedFunctions.find(
    f => f.trim().toLowerCase() === detected.toLowerCase()
  );
  
  if (match) return match; // return exact casing from header sheet
  
  // Try partial match safely
  const detectedLower = detected.toLowerCase();
  const partial = allowedFunctions.find(f => {
    const fl = f.trim().toLowerCase();
    if (fl === "it" && detectedLower === "information technology") return true;
    if (detectedLower === "it" && fl === "information technology") return true;
    if (fl === "hr" && detectedLower === "human resources") return true;
    if (detectedLower === "hr" && fl === "human resources") return true;
    
    // Avoid false positives like "security".includes("it")
    // Only do includes if length > 3 to be safe
    if (fl.length > 3 && detectedLower.includes(fl)) return true;
    if (detectedLower.length > 3 && fl.includes(detectedLower)) return true;
    
    return false;
  });
  
  if (partial) return partial;
  
  // Not available in allowed list — use fallback
  if (fallback) {
    const fallbackMatch = allowedFunctions.find(
      f => f.trim().toLowerCase() === fallback.toLowerCase()
    );
    if (fallbackMatch) return fallbackMatch;
  }
  
  return allowedFunctions[0];
}

export function detectFunctionFromTitle(
  title: string, 
  allowedFunctions: string[], 
  fallback: string
): string {
  const t = title.toLowerCase();

  // Priority checks first — these override the general department
  if (/security|\brisk\b|cyber/.test(t))          return matchToAllowed("Security", allowedFunctions, fallback);
  if (/\bdata\b/.test(t))                                   return matchToAllowed("Data", allowedFunctions, fallback);
  if (/\bcompliance\b|\blegal\b|\bcounsel\b/.test(t))       return matchToAllowed("Legal", allowedFunctions, fallback);
  if (/\bprocurement\b|\bpurchas|\bsourc/.test(t))      return matchToAllowed("Procurement", allowedFunctions, fallback);

  // General department checks
  if (/\binformation tech|\bit\b|\bsystems\b|\binfrastructure\b|\bnetwork\b|\bcloud\b|\btech\b|\btechnology\b|\bsoftware\b|\bdevops\b/.test(t))
                                                             return matchToAllowed("Information Technology", allowedFunctions, fallback);
  if (/\bsales\b|\brevenue\b|\bbusiness develop/.test(t)) return matchToAllowed("Sales", allowedFunctions, fallback);
  if (/\bfinance\b|\bfinancial\b|\baccounting\b|\btreasury\b|\bcontroller\b/.test(t))
                                                             return matchToAllowed("Finance", allowedFunctions, fallback);
  if (/\bmarketing\b|\bbrand\b|\bdemand\b|\bgrowth\b|\bcampaign\b|\bcontent\b/.test(t))
                                                             return matchToAllowed("Marketing", allowedFunctions, fallback);
  if (/\bhr\b|\bhuman resource|\bpeople\b|\btalent\b|\bworkforce\b|\brecruit/.test(t))
                                                             return matchToAllowed("Human Resources", allowedFunctions, fallback);
  if (/\boperat|\bsupply chain\b|\blogistic|\bproduction\b/.test(t))
                                                             return matchToAllowed("Operations", allowedFunctions, fallback);
  if (/\bengineer/.test(t))
                                                             return matchToAllowed("Engineering", allowedFunctions, fallback);
  if (/\bproduct\b/.test(t))                                return matchToAllowed("Product", allowedFunctions, fallback);

  // Nothing matched — return fallback
  return matchToAllowed(fallback, allowedFunctions, fallback);
}

export function matchStrictHeader(dbValue: string, allowedValues: string[] | null, defaultFallback: string) {
  if (!allowedValues || allowedValues.length === 0) return dbValue || defaultFallback;
  const lowerVal = (dbValue || "").toLowerCase();
  
  // 1. Exact match
  let m = allowedValues.find(a => a.toLowerCase() === lowerVal);
  if (m) return m;
  
  // 2. Substring match
  m = allowedValues.find(a => lowerVal.includes(a.toLowerCase()) || a.toLowerCase().includes(lowerVal));
  if (m) return m;
  
  // 3. IT / Information Technology
  if (lowerVal === "it" && allowedValues.some(a => a.toLowerCase().includes("information technology"))) {
    return allowedValues.find(a => a.toLowerCase().includes("information technology"))!;
  }
  if (lowerVal.includes("information technology") && allowedValues.some(a => a.toLowerCase() === "it")) {
    return allowedValues.find(a => a.toLowerCase() === "it")!;
  }
  
  // 4. HR / Human Resources
  if (lowerVal === "hr" && allowedValues.some(a => a.toLowerCase().includes("human resources"))) {
    return allowedValues.find(a => a.toLowerCase().includes("human resources"))!;
  }
  if (lowerVal.includes("human resources") && allowedValues.some(a => a.toLowerCase() === "hr")) {
    return allowedValues.find(a => a.toLowerCase() === "hr")!;
  }
  
  // 5. CXO / C-Level / Chief
  const isCxoDb = lowerVal === "cxo" || lowerVal.includes("chief") || lowerVal.includes("c-level") || lowerVal.includes("c level");
  if (isCxoDb) {
    const cxoMatch = allowedValues.find(a => {
      const al = a.toLowerCase();
      return al === "cxo" || al.includes("c-level") || al.includes("c level") || al.includes("chief");
    });
    if (cxoMatch) return cxoMatch;
  }
  
  // Fallback to the first allowed value to guarantee it's strictly from the header
  return allowedValues[0];
}

function buildSlots(
  pool: {title:string, level:string, fn:string}[],
  levelSuffix: string,
  totalCount: number
): {title:string, level:string, fn:string}[] {

  // Define what percentage goes to each level group
  type Dist = { levelGroup: string, pct: number }[];
  let dist: Dist;

  const s = levelSuffix.toLowerCase().trim();
  if (s === "manager+") {
    dist = [
      { levelGroup: "Manager",  pct: 50 },
      { levelGroup: "Director", pct: 30 },
      { levelGroup: "VP",       pct: 15 },
      { levelGroup: "CXO",      pct:  5 },
    ];
  } else if (s === "director+") {
    dist = [
      { levelGroup: "Director", pct: 55 },
      { levelGroup: "VP",       pct: 30 },
      { levelGroup: "CXO",      pct: 15 },
    ];
  } else if (s === "vp+") {
    dist = [
      { levelGroup: "VP",  pct: 70 },
      { levelGroup: "CXO", pct: 30 },
    ];
  } else if (s === "cxo" || s === "c-level") {
    dist = [{ levelGroup: "CXO", pct: 100 }];
  } else if (s === "director") {
    dist = [{ levelGroup: "Director", pct: 100 }];
  } else if (s === "manager") {
    dist = [{ levelGroup: "Manager", pct: 100 }];
  } else if (s === "vp") {
    dist = [{ levelGroup: "VP", pct: 100 }];
  } else {
    // Default fallback — treat as Manager+
    dist = [
      { levelGroup: "Manager",  pct: 50 },
      { levelGroup: "Director", pct: 30 },
      { levelGroup: "VP",       pct: 15 },
      { levelGroup: "CXO",      pct:  5 },
    ];
  }

  // For each level group, filter the pool to matching titles
  // A title belongs to a level group if its title string contains
  // the keywords for that group (case-insensitive)
  function getTitlesForGroup(
    group: string, 
    pool: {title:string, level:string, fn:string}[]
  ) {
    const patterns: Record<string, RegExp> = {
      "Manager":  /\bmanager\b|\bsenior manager\b|\bteam lead\b|\blead\b|\bsupervisor\b/i,
      "Director": /\bdirector\b|\bsenior director\b|\bhead\b|\bassociate director\b/i,
      "VP":       /\bvp\b|\bvice president\b|\bsvp\b|\bavp\b|\bevp\b|\bsenior vice president\b|\bassociate vice president\b/i,
      "CXO":      /\bchief\b|\bcto\b|\bcfo\b|\bcoo\b|\bcio\b|\bciso\b|\bceo\b|\bpresident\b/i,
    };
    const regex = patterns[group];
    if (!regex) return pool;
    const filtered = pool.filter(t => regex.test(t.title));
    // If no titles match this group in the pool, fall back to full pool
    return filtered.length > 0 ? filtered : pool;
  }

  // Build slots array with exact counts per level group
  const slots: {title:string, level:string, fn:string}[] = [];
  let assigned = 0;

  dist.forEach((d, i) => {
    const isLast = i === dist.length - 1;
    // Use Math.round for all except last; last gets remainder to hit totalCount exactly
    const count = isLast 
      ? totalCount - assigned 
      : Math.round((d.pct / 100) * totalCount);
    
    assigned += count;

    const groupTitles = getTitlesForGroup(d.levelGroup, pool);
    
    // Shuffle groupTitles to ensure a diverse selection of keywords
    for (let i = groupTitles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groupTitles[i], groupTitles[j]] = [groupTitles[j], groupTitles[i]];
    }
    
    // Fill this group's count by cycling through its titles
    for (let j = 0; j < count; j++) {
      slots.push(groupTitles[j % groupTitles.length]);
    }
  });

  // Fisher-Yates shuffle the final slots array
  // This mixes the levels randomly so output does not show
  // all managers first, then all directors, etc.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return slots;
}

export function buildTitleAssigner(specTitles: any[], allowedLevels: string[] | null, allowedFunctions: string[] | null, totalCount: number, levelSuffix: string, criteriaPool?: any[]) {
  Object.keys(_titleCursors).forEach(k => delete _titleCursors[k]);
  
  let pool = specTitles.length > 0 ? specTitles : TITLE_BANK;
  
  if (criteriaPool && criteriaPool.length > 0) {
    pool = criteriaPool;
  } else if (allowedFunctions?.length) {
    const s = new Set(allowedFunctions.map(f => f.toLowerCase()));
    const f = pool.filter(t => s.has((t.fn || "").toLowerCase()));
    if (f.length) pool = f;
  }

  const slots = buildSlots(pool, levelSuffix, totalCount);
  let idx = 0;
  return () => {
    const t = slots[idx % slots.length];
    idx++;
    return t || { title: "Manager", level: "Manager", fn: "General" };
  };
}
