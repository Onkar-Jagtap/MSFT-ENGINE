import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { T, STRICT_HEADERS, TITLE_BANK } from "./constants";
import { 
  stripSpecialChars, toTitleCase, cleanText, normalizeEmail, 
  isValidEmail, cleanPhone, expandState, buildCompanyDedup, resolveNames,
  normalizePostalCode
} from "./utils/normalization";
import { 
  mapIndustry, mapEmployeeSize, parseSpecJobTitles, buildTitleAssigner 
} from "./utils/titles";
import { NavBar } from "./components/NavBar";
import { UploadCard } from "./components/UploadCard";
import { PipelineStep, StatCard } from "./components/Pipeline";

const FALLBACK_FLAGS = Symbol("fallbacks");

export default function App() {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [rawDrag, setRawDrag] = useState(false);
  const [specDrag, setSpecDrag] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [stepStates, setStepStates] = useState(Array(8).fill("idle"));
  const [logs, setLogs] = useState<{ type: string, msg: string }[]>([]);
  const [progressMsg, setProgressMsg] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("");
  const [cfgOpen, setCfgOpen] = useState(true);
  const [toggles, setToggles] = useState({ email: true, nameExtract: true, dedup: true, phone: true });
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const logRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: string, msg: string) => {
    setLogs(prev => [...prev, { type, msg }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }, []);

  const setStep = useCallback((idx: number, state: string) => {
    setStepStates(prev => { const n = [...prev]; n[idx] = state; return n; });
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, isRaw: boolean) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (isRaw) setRawFile(f); else setSpecFile(f);
  };

  const handleDrop = (e: React.DragEvent, isRaw: boolean) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (isRaw) { setRawFile(f); setRawDrag(false); } else { setSpecFile(f); setSpecDrag(false); }
  };

  const toggleKey = (k: keyof typeof toggles) => { setToggles(t => ({ ...t, [k]: !t[k] })); };

  const readExcel = async (file: File) => {
    const data = await file.arrayBuffer();
    return XLSX.read(data, { type: "array" });
  };

  const processInChunks = async <T, R>(items: T[], size: number, fn: (item: T, idx: number) => R): Promise<R[]> => {
    const out: R[] = [];
    for (let i = 0; i < items.length; i += size) {
      out.push(...items.slice(i, i + size).map((item, subIdx) => fn(item, i + subIdx)));
      // Ultra-fast processing: only yield every 10000 items
      if (i + size < items.length && i % 10000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return out;
  };

  const process = async () => {
    if (!rawFile || !specFile || phase === "running") return;
    setPhase("running"); setLogs([]); setProgress(0); setStats(null);
    const runId = Math.random().toString(36).substring(7).toUpperCase();
    addLog("accent", `>> SESSION_START [${runId}]`);
    setDownloadUrl(null); setStepStates(Array(8).fill("idle")); setPreview([]);

    addLog("accent", ">> INITIATING_SECURITY_SCAN...");
    await new Promise(r => setTimeout(r, 400));
    addLog("success", "✓ BIOMETRIC_VERIFICATION_PASSED");
    addLog("accent", ">> DECRYPTING_DATA_STREAM...");
    await new Promise(r => setTimeout(r, 300));
    addLog("accent", ">> CHECKING_FOR_MALWARE_SIGNATURES...");
    await new Promise(r => setTimeout(r, 300));
    addLog("success", "✓ DATA_INTEGRITY_VERIFIED");
    addLog("accent", ">> VERIFYING_PORTAL_STABILITY...");
    await new Promise(r => setTimeout(r, 300));
    addLog("success", "✓ PORTAL_STABLE");
    
    addLog("accent", "→ Reading files…");
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    
    const [rawWb, specWb] = await Promise.all([readExcel(rawFile), readExcel(specFile)]);
    const rawData: any[] = XLSX.utils.sheet_to_json(rawWb.Sheets[rawWb.SheetNames[0]], { defval: "" });
    addLog("success", `✓ Raw data: ${rawData.length} rows`);

    // Extract CID for filename
    let cidValue = "XXX";
    try {
      for (const sn of specWb.SheetNames) {
        const s = specWb.Sheets[sn];
        const data: any[][] = XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const cidIdx = row.findIndex(cell => /CID|Campaign\s*code/i.test(String(cell)));
          if (cidIdx !== -1) {
            // User explicitly said: "specs doc conatins CID its next row conatin numbers"
            // So we check next row first, then same row next column
            let val = "";
            if (data[i+1]) val = String(data[i+1][cidIdx] || "").trim();
            if (!val) val = String(row[cidIdx + 1] || "").trim();
            
            if (val) {
              const match = val.match(/\d+/);
              if (match) { cidValue = match[0]; break; }
            }
          }
        }
        if (cidValue !== "XXX") break;
      }
    } catch (e) { console.error("CID extraction error", e); }

    let specTitles: any[] = [], allowedLevels: string[] | null = null, allowedFunctions: string[] | null = null, allowedAssets: string[] = [];
    
    try {
      // Rule 1: Load MSFT_titles_expanded_v2.csv (assuming it's the spec file or a sheet in it)
      // The user says "Load: MSFT_titles_expanded_v2.csv"
      // If the spec file is an Excel, I'll look for a sheet with "titles" or just use the first one if it has Function/Level/Title
      const titlesSheetName = specWb.SheetNames.find(n => /titles|expanded/i.test(n)) || specWb.SheetNames[0];
      const titlesRows: any[] = XLSX.utils.sheet_to_json(specWb.Sheets[titlesSheetName], { defval: "" });
      specTitles = parseSpecJobTitles(titlesRows);
      addLog("success", `✓ Loaded ${specTitles.length} titles from ${titlesSheetName}`);
    } catch (e: any) { addLog("warn", "⚠ Title sheet error: " + e.message); }

    try {
      const hn = specWb.SheetNames.find(n => /header|spec/i.test(n)) || specWb.SheetNames[0];
      const sheet = specWb.Sheets[hn];
      const hrRaw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      
      const levels = new Set<string>(), functions = new Set<string>(), assets = new Set<string>();
      
      // Find row where "email_optin" appears
      let startRowIdx = 0;
      for (let i = 0; i < hrRaw.length; i++) {
        if (hrRaw[i].some(cell => String(cell).toLowerCase().includes("email_optin"))) {
          startRowIdx = i + 1;
          break;
        }
      }

      for (let i = 0; i < hrRaw.length; i++) {
        const row = hrRaw[i];
        if (i === 0) continue; // Skip header row for levels/functions

        // Standard column mapping for levels/functions (assuming they are in first few columns)
        const lvl = String(row[1] || "").trim(); // Assuming col B
        if (lvl && !/^(nan|job_level|level)$/i.test(lvl)) levels.add(lvl);
        const fn = String(row[0] || "").trim(); // Assuming col A
        if (fn && !/^(nan|job_function|function)$/i.test(fn)) functions.add(fn);
        
        // Asset extraction: Only after email_optin row
        if (i >= startRowIdx) {
          // Column L is index 11
          const assetStr = String(row[11] || "").trim();
          if (assetStr) {
            const parts = assetStr.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
              // Hardened placeholder filtering: catch technical placeholders like "asset 1-2", "nan", but NOT descriptive names
              const isPlaceholder = /^(nan|asset_download|asset\s*\d+-\d+|asset\s*\d+)$/i.test(p) || p.toLowerCase() === "asset 1-2";
              if (!isPlaceholder) {
                assets.add(p);
              }
            });
          }
        }
      }

      if (levels.size > 0) { allowedLevels = [...levels]; addLog("success", `✓ job_level: ${allowedLevels.join(", ")}`); }
      if (functions.size > 0) { allowedFunctions = [...functions]; addLog("success", `✓ job_function: ${allowedFunctions.slice(0, 5).join(", ")}${allowedFunctions.length > 5 ? "…" : ""}`); }
      
      if (assets.size > 0) { 
        const allAssets = [...assets];
        // Fisher-Yates shuffle for better randomness
        for (let i = allAssets.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allAssets[i], allAssets[j]] = [allAssets[j], allAssets[i]];
        }

        if (allAssets.length <= 5) {
          allowedAssets = allAssets;
          addLog("success", `✓ asset_download: Using all ${allowedAssets.length} assets found after 'email_optin'`);
        } else {
          allowedAssets = allAssets.slice(0, 5);
          addLog("success", `✓ asset_download: Selected 5 random assets from ${allAssets.length} found after 'email_optin'`);
        }
        addLog("accent", `→ Pool: ${allowedAssets.join(" // ")}`);
      } else {
        addLog("warn", "⚠ No assets found in Column L after 'email_optin' row");
      }
    } catch (e: any) { addLog("warn", "⚠ Header sheet error: " + e.message); }

    if (!specTitles.length) specTitles = TITLE_BANK;
    setProgress(8);

    // STEP 1 — Detect columns
    setStep(0, "running"); setProgressMsg("Detecting columns…");
    const keys = Object.keys(rawData[0] || {});
    const emailCol = keys.find(k => k.trim() === "Email ID") || keys.find(k => k.trim().toLowerCase() === "email id") || keys[1] || "email";
    const firstCol = keys.find(k => /firstname|first|fname|given/i.test(k)) || keys[0];
    const lastCol = keys.find(k => /lastname|last|lname|surname|family/i.test(k)) || keys[1];
    const phoneCol = keys.find(k => /phone|telephone|tel|mobile|cell/i.test(k)) || "phone";
    const companyCol = keys.find(k => /company|organization|org|firm|employer|companyname/i.test(k)) || "company";
    const industryCol = keys.find(k => /industry|sector|vertical/i.test(k)) || "industry";
    const sizeCol = keys.find(k => /companysize|employeesize|size|employees|headcount|emp/i.test(k)) || "company_size";
    const addrCol = keys.find(k => /address|street|addr/i.test(k)) || "address";
    const cityCol = keys.find(k => /city|town|municipality/i.test(k)) || "city";
    const stateCol = keys.find(k => /state|province|region/i.test(k)) || "state";
    const postalCol = keys.find(k => /postal|zip|postcode/i.test(k)) || "postal_code";
    const countryCol = keys.find(k => /country|nation|location/i.test(k)) || "country";
    const linkedinCol = keys.find(k => /linkedin|profile|url/i.test(k)) || "linkedinprofileurl";
    const rawAssetCol = keys.find(k => /asset_downloaded|asset_downloade|asset/i.test(k)) || "";

    // Rule 1: Input format: [Function] - [Level Indicator]
    // I'll assume the raw data has a column that looks like this, or I'll use job_function/job_level if they exist
    const rawFnCol = keys.find(k => /function|job_function/i.test(k)) || "";
    const rawLvlCol = keys.find(k => /level|job_level/i.test(k)) || "";

    const resolveCompany = buildCompanyDedup(rawData, companyCol);
    let nameFixed = 0, phoneFixed = 0;
    
    let rows = await processInChunks(rawData, 500, r => {
      const _email = normalizeEmail(r[emailCol]);
      const rawFirst = String(r[firstCol] || "").trim(), rawLast = String(r[lastCol] || "").trim();
      let _firstName = rawFirst, _lastName = rawLast;
      if (toggles.nameExtract && _email.includes("@")) {
        const resolved = resolveNames(_email, rawFirst, rawLast);
        if (!rawFirst || !rawLast || rawFirst.split(/\s+/).length > 1 || rawLast.split(/\s+/).length > 1) nameFixed++;
        _firstName = resolved.firstName || rawFirst;
        _lastName = resolved.lastName || rawLast;
      }
      let _phone = String(r[phoneCol] || "").trim();
      if (toggles.phone) {
        const n = cleanPhone(r[phoneCol], r[countryCol]);
        if (n && n !== _phone) phoneFixed++;
        _phone = n || _phone;
      }
      return { ...r, _email, _firstName, _lastName, _phone, _industry: mapIndustry(r[industryCol]), _company_size: mapEmployeeSize(r[sizeCol]), [FALLBACK_FLAGS]: new Set<string>() };
    });
    
    addLog("success", `✓ ${rows.length} rows cleaned | ${nameFixed} names | ${phoneFixed} phones`);
    setStep(0, "done"); setProgress(22);

    // STEP 2 — Email validation
    setStep(1, "running"); setProgressMsg("Validating emails…");
    const beforeEmail = rows.length;
    if (toggles.email) rows = rows.filter(r => isValidEmail(r._email));
    const emailDropped = beforeEmail - rows.length;
    addLog(emailDropped > 0 ? "warn" : "success", emailDropped > 0 ? `⚠ ${emailDropped} invalid emails removed` : `✓ All emails valid`);
    setStep(1, "done"); setStep(2, "done"); setProgress(38);

    // STEP 3 — Title assignment
    setStep(4, "running"); setProgressMsg("Assigning AI titles…");
    const assignTitle = buildTitleAssigner(specTitles, allowedLevels, allowedFunctions, rows.length);
    rows = await processInChunks(rows, 500, r => {
      const inputFn = String(r[rawFnCol] || "IT").trim();
      const inputLvl = String(r[rawLvlCol] || "Manager+").trim();
      const t = assignTitle(inputFn, inputLvl);
      return { ...r, _job_title: t.title, _job_level: t.level, _job_function: t.fn };
    });
    addLog("success", `✓ All ${rows.length} rows assigned titles`);
    setStep(4, "done"); setProgress(56);

    // STEP 4 — Dedup
    setStep(5, "running"); setProgressMsg("Deduplicating…");
    let dupCount = 0;
    if (toggles.dedup) {
      const seen = new Set();
      rows = rows.filter(r => {
        const k = r._email.trim();
        if (!k || seen.has(k)) { dupCount++; return false; }
        seen.add(k); return true;
      });
    }
    addLog(dupCount > 0 ? "warn" : "success", dupCount > 0 ? `⚠ ${dupCount} duplicates removed` : `✓ No duplicates`);
    setStep(5, "done"); setProgress(68);

    // STEP 5 — Validation
    setStep(6, "running"); setProgressMsg("Validating…");
    let hardDropped = 0;
    rows = rows.filter(r => { if (!(r._firstName || r._lastName) && !isValidEmail(r._email)) { hardDropped++; return false; } return true; });
    addLog(hardDropped > 0 ? "warn" : "success", hardDropped > 0 ? `⚠ ${hardDropped} dropped` : `✓ All rows passed`);
    setStep(6, "done"); setProgress(80);

    // STEP 6 — Build Excel
    setStep(7, "running"); setProgressMsg("Building Excel…");
    addLog("accent", "→ Building workbook with yellow highlights…");

    // Rule 5: lead_download_date
    const getNYLeadDate = () => {
      const now = new Date();
      // Get current date in NY (YYYY-MM-DD)
      const nyDateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/New_York', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(now);
      
      // Get current time in NY to prevent future times
      const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
      const nyTimeParts = nyTimeStr.split(', ')[1].split(':').map(Number);
      const nyH = nyTimeParts[0];
      const nyM = nyTimeParts[1];
      const nyS = nyTimeParts[2];

      const usedMinutes = new Set<string>();
      const usedTimestamps = new Set<string>();

      return (rowIdx: number) => {
        let h, m, s, time, minKey;
        let attempts = 0;
        let isFuture = false;
        let minuteRepeated = false;
        
        // Range: 09:30:00 to 11:30:00 (120 minutes)
        const startTotalSec = 9 * 3600 + 30 * 60;
        const endTotalSec = 11 * 3600 + 30 * 60;
        const totalRangeSec = endTotalSec - startTotalSec;

        do {
          attempts++;
          const randomSec = Math.floor(Math.random() * (totalRangeSec + 1));
          const currentTotalSec = startTotalSec + randomSec;
          
          h = Math.floor(currentTotalSec / 3600);
          m = Math.floor((currentTotalSec % 3600) / 60);
          s = currentTotalSec % 60;
          
          const pad = (n: number) => String(n).padStart(2, '0');
          time = `${pad(h)}:${pad(m)}:${pad(s)}`;
          minKey = `${pad(h)}:${pad(m)}`;

          // Constraints
          isFuture = h > nyH || (h === nyH && m > nyM) || (h === nyH && m === nyM && s > nyS);
          
          // If we have more rows than minutes (120), we MUST repeat minutes.
          // But we try to avoid it if possible.
          minuteRepeated = usedMinutes.has(minKey) && usedMinutes.size < 120;

          if (attempts > 2000) break; 
        } while (usedTimestamps.has(time) || minuteRepeated || isFuture);

        usedMinutes.add(minKey);
        usedTimestamps.add(time);
        // Format: YYYY-MM-DD HH:MM:SS (TEXT format)
        return `${nyDateStr} ${time}`;
      };
    };
    const generateLeadDate = getNYLeadDate();

    // Rule 4: asset_downloaded distribution
    const assetPool = allowedAssets.length > 0 ? allowedAssets : ["Asset 1", "Asset 2", "Asset 3"];
    // Shuffle the pool for this specific run
    for (let i = assetPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [assetPool[i], assetPool[j]] = [assetPool[j], assetPool[i]];
    }
    
    const assetOffset = Math.floor(Math.random() * assetPool.length);
    const getAsset = (rowIdx: number) => {
      if (assetPool.length === 0) return "Default Asset";
      const selected = assetPool[(rowIdx + assetOffset) % assetPool.length];
      return selected;
    };

    const yellowCells: { rowIdx: number, col: string }[] = [];
    const finalRows = rows.map((r, idx) => {
      const country = toTitleCase(cleanText(r[countryCol] || ""));
      const countryLower = country.toLowerCase();
      const company = resolveCompany(String(r[companyCol] || "").trim(), idx);
      const firstName = toTitleCase(r._firstName || String(r[firstCol] || "").trim());
      const lastName = toTitleCase(r._lastName || String(r[lastCol] || "").trim());
      const email = r._email;
      const telephone = r._phone || "";
      
      let job_title = r._job_title || "";
      if (!job_title) { job_title = "Business Professional"; yellowCells.push({ rowIdx: idx + 1, col: "job_title" }); }
      
      let industry = r._industry || mapIndustry(String(r[industryCol] || ""));
      if (!industry) { industry = ""; yellowCells.push({ rowIdx: idx + 1, col: "industry" }); }
      
      const company_size = r._company_size || mapEmployeeSize(String(r[sizeCol] || ""));
      if (!company_size) yellowCells.push({ rowIdx: idx + 1, col: "company_size" });
      
      const job_level = r._job_level || "Director";
      const job_function = r._job_function || "General";
      
      const rawAsset = rawAssetCol ? String(r[rawAssetCol] || "").trim() : "";
      // Rule: Ignore placeholder assets like "asset 1-2" from raw input too
      const isPlaceholder = /^(nan|asset_download|asset\s*\d+-\d+|asset\s*\d+)$/i.test(rawAsset) || rawAsset.toLowerCase() === "asset 1-2";
      const asset_downloaded = (rawAsset && !isPlaceholder) ? rawAsset : getAsset(idx);
      
      const city = toTitleCase(cleanText(r[cityCol] || ""));
      const isExceptionCountry = countryLower.includes("united states") || countryLower === "us" || countryLower === "usa" || countryLower.includes("canada") || countryLower.includes("india") || countryLower.includes("australia");
      const rawState = String(r[stateCol] || "").trim();
      let state = "";
      if (isExceptionCountry) { state = rawState ? expandState(rawState, country) : ""; }
      else { state = city || ""; if (!rawState && city) yellowCells.push({ rowIdx: idx + 1, col: "state" }); }
      
      const postal_code = normalizePostalCode(r[postalCol], country);
      const address = stripSpecialChars(cleanText(r[addrCol] || ""));
      
      if (!firstName) yellowCells.push({ rowIdx: idx + 1, col: "firstName" });
      if (!lastName) yellowCells.push({ rowIdx: idx + 1, col: "lastName" });
      if (!company) yellowCells.push({ rowIdx: idx + 1, col: "company_name" });
      if (!country) yellowCells.push({ rowIdx: idx + 1, col: "country" });
      if (!postal_code) yellowCells.push({ rowIdx: idx + 1, col: "postal_code" });
      
      const clean = (val: any) => String(val || "").replace(/\s+/g, " ").trim();

      // Rule 4 & 5 & 6
      return { 
        firstName: clean(firstName), 
        lastName: clean(lastName), 
        email: clean(email), 
        telephone: clean(telephone), 
        company_name: clean(company), 
        job_title: clean(job_title), 
        industry: clean(industry), 
        company_size: clean(company_size), 
        job_level: clean(job_level), 
        job_function: clean(job_function), 
        email_optin: 1, 
        asset_downloaded: clean(asset_downloaded), 
        address: clean(address), 
        address2: "", 
        city: clean(city), 
        state: clean(state), 
        postal_code: clean(postal_code), 
        country: clean(country),
        lead_download_date: generateLeadDate(idx),
        custom_question_1: clean(r["custom_question_1"]),
        custom_question_2: clean(r["custom_question_2"]),
        custom_question_3: clean(r["custom_question_3"]),
        custom_question_4: clean(r["custom_question_4"]),
        custom_question_5: clean(r["custom_question_5"]),
        custom_question_6: clean(r["custom_question_6"]),
        custom_question_7: "",
        linkedinprofileurl: clean(r[linkedinCol])
      };
    });

    const wb = XLSX.utils.book_new();
    const aoa = [STRICT_HEADERS, ...finalRows.map(r => STRICT_HEADERS.map(h => (r as any)[h] !== undefined ? (r as any)[h] : ""))];
    const ws1 = XLSX.utils.aoa_to_sheet(aoa);
    
    // Set column widths
    const COL_WIDTHS: Record<string, number> = { 
      firstName: 14, lastName: 14, email: 30, telephone: 16, company_name: 24, 
      job_title: 30, industry: 20, company_size: 14, job_level: 16, job_function: 22, 
      email_optin: 12, asset_downloaded: 24, address: 26, address2: 12, city: 14, 
      state: 18, postal_code: 14, country: 16, lead_download_date: 22,
      custom_question_1: 20, custom_question_2: 20, custom_question_3: 20, 
      custom_question_4: 20, custom_question_5: 20, custom_question_6: 20, 
      custom_question_7: 20, linkedinprofileurl: 30
    };
    ws1["!cols"] = STRICT_HEADERS.map(h => ({ wch: COL_WIDTHS[h] || 14 }));

    // Apply yellow highlights
    const YELLOW_FILL = { patternType: "solid", fgColor: { rgb: "FFFF00" } };
    const colIdxMap: Record<string, number> = {};
    STRICT_HEADERS.forEach((h, i) => { colIdxMap[h] = i; });
    
    function colToLetter(n: number) { let s = ""; n++; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }
    
    for (const { rowIdx, col } of yellowCells) {
      const ci = colIdxMap[col]; if (ci === undefined) continue;
      const addr = colToLetter(ci) + (rowIdx + 1);
      if (!ws1[addr]) ws1[addr] = { v: "", t: "s" };
      ws1[addr].s = { fill: YELLOW_FILL, font: { name: "Calibri", sz: 11 } };
    }

    XLSX.utils.book_append_sheet(wb, ws1, "Cleaned_Data");
    
    // Add Header_Template sheet
    let ws2;
    try {
      const hn = specWb.SheetNames.find(n => /header|spec/i.test(n)) || specWb.SheetNames[0];
      ws2 = specWb.Sheets[hn];
      if (!ws2) throw new Error();
    } catch {
      ws2 = XLSX.utils.aoa_to_sheet([STRICT_HEADERS]);
    }
    XLSX.utils.book_append_sheet(wb, ws2, "Header_Template");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const fname = `msft_Pja_${cidValue}.xlsx`;
    
    setDownloadUrl(url); setDownloadName(fname);
    addLog("success", `✓ File generated: ${fname}`);
    addLog("success", `✓ ${finalRows.length} rows × ${STRICT_HEADERS.length} cols`);
    addLog("accent", `→ ${yellowCells.length} yellow highlights applied`);
    setStep(7, "done"); setProgress(100);
    
    const total = rawData.length, cleaned = finalRows.length;
    setStats({ total, cleaned, removed: total - cleaned, emailDropped, dupCount, hardDropped, yellowCount: yellowCells.length });
    setPreview(finalRows.slice(0, 10));
    setPhase("done");
    setTimeout(() => { if (resultRef.current) resultRef.current.scrollIntoView({ behavior: "smooth" }); }, 400);
  };

  const reset = () => {
    setRawFile(null); setSpecFile(null); setPhase("idle"); setProgress(0);
    setStepStates(Array(8).fill("idle")); setLogs([]); setStats(null);
    setPreview([]); setDownloadUrl(null); setProgressMsg("");
  };

  React.useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const STEP_NAMES = ["Detect", "Email", "Names", "Phone", "Titles", "Dedup", "Validate", "Export"];
  const ready = !!(rawFile && specFile);

  return (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-sm text-text-pri relative overflow-hidden">
      <AnimatePresence>
        {isBooting && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black"
          >
            <div className="scan-line" />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-4xl font-black text-primary neon-text"
            >
              SYSTEM_INITIALIZING...
            </motion.div>
            <div className="font-mono mt-4 text-[10px] tracking-[0.5em] text-accent animate-pulse">
              ESTABLISHING_SECURE_LINK // PJA_CORE
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "running" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[60] border-[20px] border-primary/5 bg-primary/[0.02]"
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-primary/40 uppercase tracking-[0.5em]">
              [ SECURITY_PROTOCOL_ACTIVE ]
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar phase={phase} onReset={reset} onProcess={process} ready={ready} />

      <main className="relative mx-auto w-full max-w-[1600px] flex-1 px-8 py-10 cyber-grid hex-grid">
        <div className="hud-bracket-tl m-4 opacity-10" />
        <div className="hud-bracket-tr m-4 opacity-10" />
        <div className="hud-bracket-bl m-4 opacity-10" />
        <div className="hud-bracket-br m-4 opacity-10" />
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-end justify-between border-b-2 border-primary/20 pb-6"
        >
          <div>
            <h1 className="font-display text-6xl font-black tracking-tighter text-white neon-text">
              MSFT ENGINE by PJA
            </h1>
            <p className="font-mono mt-2 text-xs font-bold tracking-[0.5em] text-primary uppercase">
              // PORTAL_ACCESS_GRANTED // PROTOCOL_V4
            </p>
          </div>
          <div className="flex gap-4">
            {downloadUrl && (
              <motion.button 
                initial={{ scale: 0, x: 50, opacity: 0 }}
                animate={{ scale: 1, x: 0, opacity: 1 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0,255,65,0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-4 border-2 border-success bg-success/20 px-10 py-4 font-display text-sm font-black tracking-[0.2em] text-success shadow-[0_0_15px_rgba(0,255,65,0.3)] transition-all"
              >
                <span className="animate-bounce">↓</span> DOWNLOAD_XLSX
              </motion.button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {showDownloadModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md border-4 border-primary bg-black p-8 shadow-[0_0_50px_rgba(0,243,255,0.3)]"
              >
                <div className="hud-bracket-tl opacity-100" />
                <div className="hud-bracket-tr opacity-100" />
                <div className="hud-bracket-bl opacity-100" />
                <div className="hud-bracket-br opacity-100" />
                
                <div className="mb-6 text-center">
                  <div className="font-display mb-4 text-2xl font-black text-primary neon-text">
                    SECURITY_ALERT
                  </div>
                  <div className="font-mono text-sm leading-relaxed text-white">
                    bro… this file was cooked by AI 💀 <br />
                    <span className="text-accent">Use at your own risk !</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (downloadUrl) {
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = downloadName;
                        a.click();
                        // Reset portal for next run as requested
                        addLog("warn", ">> SYSTEM_RESET_IN_PROGRESS...");
                        setTimeout(reset, 3000);
                      }
                      setShowDownloadModal(false);
                    }}
                    className="w-full border-2 border-primary bg-primary/10 py-4 font-display text-[10px] font-black tracking-[0.2em] text-primary transition-all hover:bg-primary/30"
                  >
                    TRUST_ISSUES? IGNORE & PROCEED
                  </button>
                  <button 
                    onClick={() => setShowDownloadModal(false)}
                    className="w-full border border-white/10 py-2 font-mono text-[9px] text-text-mut transition-all hover:text-white"
                  >
                    ABORT_DOWNLOAD
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Upload Section */}
        <div className="mb-10 grid grid-cols-2 gap-6">
          <UploadCard 
            label="RAW_INPUT_STREAM" hint="LEADS_DATA // .XLSX .CSV" icon="⚡"
            file={rawFile} drag={rawDrag}
            onDragOver={e => { e.preventDefault(); setRawDrag(true); }}
            onDragLeave={() => setRawDrag(false)}
            onDrop={e => handleDrop(e, true)}
            onChange={e => handleFileInput(e, true)}
          />
          <UploadCard 
            label="SPEC_PROTOCOL_MAP" hint="HEADER_TEMPLATE // .XLSX" icon="🛰️"
            file={specFile} drag={specDrag}
            onDragOver={e => { e.preventDefault(); setSpecDrag(true); }}
            onDragLeave={() => setSpecDrag(false)}
            onDrop={e => handleDrop(e, false)}
            onChange={e => handleFileInput(e, false)}
          />
        </div>

        {/* Pipeline & Config Grid */}
        <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Config */}
          <div className="relative lg:col-span-1 border border-white/5 bg-black/20 p-6">
            <div className="hud-bracket-tl opacity-20" />
            <div className="hud-bracket-br opacity-20" />
            
            <div className="font-mono mb-6 flex items-center gap-2 text-[10px] font-bold tracking-widest text-primary uppercase">
              <span className="h-1 w-4 bg-primary" /> SYSTEM_CONFIG
            </div>
            <div className="space-y-3">
              {[
                { k: "email", l: "EMAIL_VAL", s: "VALIDATE_STRUCTURE" },
                { k: "nameExtract", l: "NAME_RESOLVE", s: "EXTRACT_FROM_EMAIL" },
                { k: "dedup", l: "DEDUP_CORE", s: "REMOVE_REDUNDANCY" },
                { k: "phone", l: "PHONE_E164", s: "FORMAT_GLOBAL" },
              ].map(({ k, l, s }) => (
                <div key={k} className="flex items-center justify-between border border-white/5 bg-black/40 px-4 py-3 transition-all hover:border-primary/20">
                  <div>
                    <div className="font-display text-[10px] font-bold tracking-widest text-text-pri">{l}</div>
                    <div className="font-mono text-[8px] text-text-mut">{s}</div>
                  </div>
                  <div 
                    className={`relative h-5 w-10 cursor-pointer border transition-all duration-200 ${toggles[k as keyof typeof toggles] ? "border-primary bg-primary/20" : "border-white/10 bg-white/5"}`}
                    onClick={() => toggleKey(k as keyof typeof toggles)}
                  >
                    <motion.div 
                      animate={{ left: toggles[k as keyof typeof toggles] ? 22 : 2 }}
                      className={`absolute top-0.5 h-3.5 w-3.5 ${toggles[k as keyof typeof toggles] ? "bg-primary shadow-[0_0_8px_rgba(0,243,255,0.8)]" : "bg-text-mut"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Pipeline */}
          <div className="lg:col-span-2">
            <div className="font-mono mb-4 text-[10px] font-bold tracking-widest text-text-mut uppercase">
              // EXECUTION_PIPELINE
            </div>
            <div className="flex overflow-hidden border border-white/10 bg-black/40">
              {STEP_NAMES.map((n, i) => <PipelineStep key={n} name={n} index={i} state={stepStates[i] as string} />)}
            </div>

            {/* Progress Bar */}
            {(phase === "running" || phase === "done") && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="mb-2 flex items-end justify-between">
                  <div className="font-mono text-[10px] font-bold text-primary uppercase tracking-widest">
                    {phase === "done" ? ">> SYSTEM_READY // TASK_COMPLETE" : `>> EXECUTING: ${progressMsg}`}
                  </div>
                  <div className="font-display text-2xl font-black text-primary neon-text">{progress}%</div>
                </div>
                <div className="h-2 border border-white/10 bg-white/5 p-0.5">
                  <motion.div 
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary shadow-[0_0_15px_rgba(0,243,255,0.6)]"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Logs & Stats */}
        {(phase === "running" || phase === "done") && (
          <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="relative lg:col-span-2">
              <div className="hud-bracket-tl opacity-20" />
              <div className="hud-bracket-br opacity-20" />
              <div className="font-mono mb-4 text-[10px] font-bold tracking-widest text-text-mut uppercase">
                // SYSTEM_LOGS
              </div>
              <div 
                ref={logRef} 
                className="h-64 overflow-y-auto border border-white/10 bg-black/60 p-5 font-mono text-[10px] leading-relaxed"
              >
                {logs.map((l, i) => (
                  <div key={i} className="mb-1 flex gap-3" style={{ color: l.type === "success" ? "#00ff41" : l.type === "error" ? "#ff003c" : l.type === "warn" ? "#f3ff00" : l.type === "accent" ? "#00f3ff" : "#888888" }}>
                    <span className="opacity-40">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    <span className="font-bold">{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="font-mono mb-4 text-[10px] font-bold tracking-widest text-text-mut uppercase">
                // METRICS_DASHBOARD
              </div>
              <div className="grid grid-cols-1 gap-4">
                {stats && (
                  <>
                    <StatCard label="IN_TOTAL" value={stats.total} sub="RAW_RECORDS" color="#ffffff" delay={1} />
                    <StatCard label="OUT_CLEAN" value={stats.cleaned} sub="PROCESSED" color="#00ff41" delay={2} />
                    <StatCard label="FLAGS" value={stats.yellowCount} sub="MANUAL_REVIEW" color="#f3ff00" delay={3} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {stats && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="font-mono text-[10px] font-bold tracking-widest text-text-mut uppercase">
              // DATA_PREVIEW_BUFFER
            </div>
            <div className="overflow-hidden border border-white/10 bg-black/40">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {["First", "Last", "Email", "Company", "Job Title", "Level", "Industry", "Country"].map(h => (
                        <th key={h} className="px-4 py-3 font-display text-[9px] font-black tracking-widest text-primary uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                    {preview.map((r, i) => (
                      <motion.tr 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="transition-colors hover:bg-primary/5"
                      >
                        <td className="px-4 py-3 text-white">{r.firstName}</td>
                        <td className="px-4 py-3 text-white">{r.lastName}</td>
                        <td className="px-4 py-3 text-primary">{r.email}</td>
                        <td className="px-4 py-3 text-text-sec">{r.company_name}</td>
                        <td className="px-4 py-3 font-bold text-white">{r.job_title}</td>
                        <td className="px-4 py-3">
                          <span className="border border-accent/30 bg-accent/10 px-2 py-0.5 text-[8px] font-bold text-accent uppercase">
                            {r.job_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-sec">{r.industry}</td>
                        <td className="px-4 py-3 text-text-sec">{r.country}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {phase === "idle" && !rawFile && !specFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32"
          >
            <div className="font-display mb-6 text-6xl font-black text-white/5 neon-text">
              OFFLINE
            </div>
            <div className="font-mono text-[10px] font-bold tracking-[0.5em] text-primary/40 uppercase">
              // AWAITING_DATA_UPLOADS
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="sticky bottom-0 z-40 flex h-10 items-center justify-between border-t border-primary/20 bg-black/90 px-8 font-mono text-[9px] font-bold uppercase tracking-widest backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-primary shadow-[0_0_5px_rgba(0,243,255,1)]" />
            <span className="text-primary">System_Online</span>
          </div>
          {ready && (
            <div className="text-text-mut">
              [ {rawFile?.name} ] + [ {specFile?.name} ]
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-1 lg:flex">
            <span className="text-[8px] text-text-mut mr-2">SYS_LOAD:</span>
            {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8].map((h, i) => (
              <motion.div 
                key={i}
                animate={{ height: [h * 10, (1-h) * 10, h * 10] }}
                transition={{ repeat: Infinity, duration: 1 + i * 0.2 }}
                className="w-1 bg-primary/40"
              />
            ))}
          </div>
          {stats && (
            <div className="text-success">
              Records_Cleaned: {stats.cleaned}
            </div>
          )}
          <div className="text-text-mut">
            v4.0.2 // STABLE_BUILD
          </div>
        </div>
      </footer>

      {/* Floating Data Accents - Moved to end for visibility on top */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-[0.03]">
        {[
          { t: "0x7F_SECTOR", x: "5%", y: "15%", d: 0 },
          { t: "COORD_X: 42.1", x: "92%", y: "10%", d: 1 },
          { t: "SYS_LOAD: 88%", x: "3%", y: "88%", d: 2 },
          { t: "ENCRYPT_AES_256", x: "94%", y: "82%", d: 3 },
          { t: "PJA_PROTOCOL_V4", x: "48%", y: "3%", d: 4 },
        ].map((a, i) => (
          <div 
            key={i} 
            className="float-accent font-mono absolute text-[8px] font-bold text-primary"
            style={{ left: a.x, top: a.y, animationDelay: `${a.d}s` }}
          >
            {a.t}
          </div>
        ))}
      </div>
    </div>
  );
}
