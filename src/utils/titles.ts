import { MSFT_INDUSTRY_MAP, MSFT_KEYWORDS, TITLE_BANK } from "../constants";
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

export function mapJobLevel(level: string): string {
  const l = level.toLowerCase();
  if (/chief|cxo|ceo|cto|cfo|coo|cmo|cro|ciso/i.test(l)) return "CXO";
  if (/vp|svp|avp|evp|vice president/i.test(l)) return "VP";
  if (/director|head|lead|principal/i.test(l)) return "Director";
  if (/senior manager|sr\. manager|manager/i.test(l)) return "Manager";
  return "Manager"; // Default
}

export function parseSpecJobTitles(rows: any[]) {
  // rows are from MSFT_titles_expanded_v2.csv
  // Columns: Function, Level, Title
  return rows.map(r => ({
    fn: String(r["Function"] || "").trim(),
    level: String(r["Level"] || "").trim(),
    title: String(r["Title"] || "").trim()
  })).filter(t => t.title);
}

export function buildTitleAssigner(specTitles: any[], allowedLevels: string[] | null, allowedFunctions: string[] | null, totalCount: number) {
  // Rule 1: Level mapping with weighted distribution matching CSV levels exactly
  const getMatchingLevels = (indicator: string) => {
    const ind = indicator.toLowerCase();
    const rand = Math.random();

    // CSV Levels: "Director / Head", "Manager", "Senior Manager", "AVP / VP / SVP", "Chief"
    if (ind.includes("director")) { // Catch "Director" and "Director+"
      // Scale: Director (70%), VP (20%), CXO (10%)
      if (rand < 0.70) return ["Director / Head"];
      if (rand < 0.90) return ["AVP / VP / SVP"];
      return ["Chief"];
    }
    if (ind.includes("vp")) { // Catch "VP" and "VP+"
      if (rand < 0.80) return ["AVP / VP / SVP"];
      return ["Chief"];
    }
    if (ind.includes("c-level") || ind.includes("chief")) return ["Chief"];
    if (ind.includes("manager")) { // Catch "Manager" and "Manager+"
      // Target: Managers (~50%) > Directors (~35%) > VPs (~10%) > C-Level (~5%)
      if (rand < 0.35) return ["Manager"];
      if (rand < 0.50) return ["Senior Manager"];
      if (rand < 0.85) return ["Director / Head"];
      if (rand < 0.95) return ["AVP / VP / SVP"];
      return ["Chief"];
    }
    
    return [indicator];
  };

  const pool = specTitles.length > 0 ? specTitles : TITLE_BANK;
  
  const groupedPool: Record<string, any[]> = {};
  pool.forEach(t => {
    const key = `${t.fn.toLowerCase()}|${t.level.toLowerCase()}`;
    if (!groupedPool[key]) groupedPool[key] = [];
    groupedPool[key].push(t);
  });

  Object.values(groupedPool).forEach(list => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  });

  const usageIndices: Record<string, number> = {};

  return (inputFn: string, inputLevelInd: string) => {
    const targetLevels = getMatchingLevels(inputLevelInd);
    
    let candidates: any[] = [];
    targetLevels.forEach(tl => {
      const key = `${inputFn.toLowerCase()}|${tl.toLowerCase()}`;
      if (groupedPool[key]) candidates.push(...groupedPool[key]);
    });

    if (candidates.length === 0) {
      Object.keys(groupedPool).forEach(k => {
        if (k.startsWith(`${inputFn.toLowerCase()}|`)) candidates.push(...groupedPool[k]);
      });
    }

    if (candidates.length === 0) candidates = pool;

    // Truly randomize the selection from candidates to ensure different results across runs
    // while still trying to use all candidates before repeating
    const poolKey = candidates.map(c => c.title).sort().join("|");
    if (usageIndices[poolKey] === undefined) {
      // Shuffle the candidates for this specific pool on first use in this run
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      usageIndices[poolKey] = 0;
    }

    const idx = usageIndices[poolKey];
    const selected = candidates[idx % candidates.length];
    usageIndices[poolKey] = idx + 1;
    
    return {
      title: selected.title,
      level: mapJobLevel(selected.level),
      fn: selected.fn
    };
  };
}
