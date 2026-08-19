/**
 * Utility functions for parsing, normalization, and calculations
 */

/**
 * Normalizes an email address: trimmed, lowercase, stripped of invalid spaces
 */
export function normalizeEmail(email: any): string {
  if (!email) return '';
  return String(email)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Normalizes a username string
 */
export function normalizeUsername(user: any): string {
  if (user === null || user === undefined) return '';
  let str = String(user).trim().toLowerCase();
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  return str;
}

export function cleanSearchString(str: any): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ') // replace non-alphanumeric with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two usernames match directly, via substring, or by numeric ending / digits.
 * e.g. "epapro0561" matches "0561", "561", "epapro0561", "epapro0561.0"
 */
export function matchUserOrNumericSuffix(strA?: any, strB?: any): boolean {
  if (!strA || !strB) return false;

  const normA = normalizeUsername(strA);
  const normB = normalizeUsername(strB);

  if (!normA || !normB) return false;

  // 1. Direct match
  if (normA === normB) return true;

  // 2. Substring match
  if (normA.length >= 2 && normB.length >= 2) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }

  // 3. Numeric ending match (e.g. '0561' at the end of 'epapro0561')
  const digitsA = normA.match(/\d+$/)?.[0] || normA.replace(/\D/g, '');
  const digitsB = normB.match(/\d+$/)?.[0] || normB.replace(/\D/g, '');

  if (digitsA && digitsB && digitsA.length >= 2 && digitsB.length >= 2) {
    if (digitsA === digitsB) return true;
    if (normA.endsWith(digitsB) || normB.endsWith(digitsA)) return true;
  }

  return false;
}

/**
 * Normalizes column names for flexible matching
 * e.g. "Email do atendente" -> "emaildoatendente"
 * e.g. "Atendente entrou na chamada (Formatado)" -> "atendenteentrounachamadaformatado"
 */
export function normalizeColumnHeader(header: string): string {
  if (!header) return '';
  return String(header)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // remove non-alphanumeric
}

/**
 * Parses time strings into seconds.
 * Supports:
 * - "00:05:30" -> 330
 * - "05:30" -> 330
 * - "5:30" -> 330
 * - "330" / 330 -> 330
 */
export function parseTimeToSeconds(timeInput: any): number {
  if (timeInput === null || timeInput === undefined || timeInput === '') return 0;

  if (typeof timeInput === 'number') {
    // If it's a fractional day from Excel (e.g., 0.00381944 = 5.5 mins)
    if (timeInput > 0 && timeInput < 1) {
      return Math.round(timeInput * 86400);
    }
    // If input is in milliseconds (> 86400 seconds = 24 hours)
    if (timeInput > 86400) {
      let inSec = Math.round(timeInput / 1000);
      if (inSec > 86400) {
        inSec = Math.round(inSec / 1000);
      }
      return Math.min(inSec, 86400);
    }
    return Math.round(timeInput);
  }

  const str = String(timeInput).trim();
  if (!str) return 0;

  // Pure number as string
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 0 && num < 1) {
      return Math.round(num * 86400);
    }
    if (num > 86400) {
      let inSec = Math.round(num / 1000);
      if (inSec > 86400) {
        inSec = Math.round(inSec / 1000);
      }
      return Math.min(inSec, 86400);
    }
    return Math.round(num);
  }

  // HH:MM:SS or MM:SS or H:M:S
  const parts = str.split(':').map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    let total = Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    if (total > 86400) {
      total = Math.round(total / 1000);
    }
    return Math.min(total, 86400);
  } else if (parts.length === 2) {
    return Math.round(parts[0] * 60 + parts[1]);
  } else if (parts.length === 1) {
    return Math.round(parts[0]);
  }

  return 0;
}

/**
 * Helper to parse time string like "10:15:00" or "10:15" or "11/08/2026 10:15:00" into seconds from midnight
 */
export function parseTimeToSecondsFromFormattedStr(strInput: any): number {
  if (!strInput) return 0;
  let str = String(strInput).trim();
  if (!str) return 0;

  if (str.includes(' ')) {
    const spaceParts = str.split(/\s+/);
    str = spaceParts[spaceParts.length - 1];
  }

  const parts = str.split(':').map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  } else if (parts.length === 2) {
    return Math.round(parts[0] * 3600 + parts[1] * 60);
  }
  return 0;
}

/**
 * Calculates accurate pause duration in seconds.
 * Prefers (fim - inicio) when available and valid.
 * Otherwise handles milliseconds and caps single pause at 24h.
 */
export function calculatePauseDurationSeconds(inicioStr: string, fimStr: string, tempoRaw?: any): number {
  if (inicioStr && fimStr) {
    const secInicio = parseTimeToSecondsFromFormattedStr(inicioStr);
    const secFim = parseTimeToSecondsFromFormattedStr(fimStr);
    if (secFim > secInicio) {
      const diff = secFim - secInicio;
      if (diff > 0 && diff <= 86400) {
        return diff;
      }
    }
  }

  return parseTimeToSeconds(tempoRaw);
}

/**
 * Formats seconds into HH:MM:SS string.
 * Preserves negative sign if seconds < 0 (e.g. -00:15:30)
 */
export function formatSecondsToHHMMSS(seconds: number): string {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return '00:00:00';
  
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(Math.round(seconds));

  const hrs = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  const formatted = `${hh}:${mm}:${ss}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parses date string or Excel date value into ISO YYYY-MM-DD format
 * Handles DD/MM/YYYY, YYYY-MM-DD, DD/MM/YYYY HH:mm, etc.
 */
export function parseDateToISO(dateInput: any): string {
  if (dateInput === null || dateInput === undefined) return '';

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle number or numeric string (Excel serial date e.g. 46237 or "46237.39058")
  const numCandidate = typeof dateInput === 'number'
    ? dateInput
    : (typeof dateInput === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(dateInput) ? parseFloat(dateInput.trim()) : NaN);

  if (!isNaN(numCandidate) && numCandidate > 10000 && numCandidate < 100000) {
    // Excel serial date (days since Dec 30, 1899)
    const dateObj = new Date(Math.round((numCandidate - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getUTCFullYear();
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(dateInput).trim();
  if (!str) return '';

  // Ignore pure time strings like "09:22:27" or "09:22"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    return '';
  }

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (e.g. "2026-08-03" or "2026-08-03T17:46:26")
  const isoMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const day = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Slash/dash/dot date: p1 / p2 / p3 (e.g. "8/3/26", "03/08/2026", "3/8/2026 09:22:27")
  const brMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (brMatch) {
    const rawP1 = brMatch[1];
    const rawP2 = brMatch[2];
    const p1 = parseInt(rawP1, 10);
    const p2 = parseInt(rawP2, 10);
    let year = brMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }

    let day = p1;
    let month = p2;

    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      day = p2;
      month = p1;
    } else {
      // Both <= 12 (e.g. "8/3/26" vs "03/08/2026")
      if (p1 === 8) {
        // e.g. 8/3/26 -> month 8, day 3
        month = p1;
        day = p2;
      } else if (p2 === 8) {
        // e.g. 03/08/2026 -> day 3, month 8
        month = p2;
        day = p1;
      } else if (rawP1.length === 1 && rawP2.length >= 1) {
        // Single digit first number, e.g. 8/3/26, 9/3/26 -> M/D/Y format
        month = p1;
        day = p2;
      } else {
        day = p1;
        month = p2;
      }
    }

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  }

  // 3. Substring match for any DD/MM/YYYY or M/D/YY anywhere in the string
  const subBrMatch = str.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (subBrMatch) {
    const rawP1 = subBrMatch[1];
    const rawP2 = subBrMatch[2];
    const p1 = parseInt(rawP1, 10);
    const p2 = parseInt(rawP2, 10);
    let year = subBrMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    let day = p1;
    let month = p2;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      day = p2;
      month = p1;
    } else {
      if (p1 === 8) {
        month = p1;
        day = p2;
      } else if (p2 === 8) {
        month = p2;
        day = p1;
      } else if (rawP1.length === 1 && rawP2.length >= 1) {
        month = p1;
        day = p2;
      } else {
        day = p1;
        month = p2;
      }
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // 4. JS Date fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    if (y >= 2000 && y <= 2100) {
      return `${y}-${m}-${d}`;
    }
  }

  return '';
}

/**
 * Parses timestamp string (e.g. "11/08/2026 19:56", "11/08/26 19:56:30", "2026-08-11 19:56") into milliseconds epoch
 */
export function parseFormattedTimestampToMs(dateTimeStr: any): number {
  if (!dateTimeStr && dateTimeStr !== 0) return 0;

  if (typeof dateTimeStr === 'number') {
    // If it's an Excel serial datetime (e.g. 45515.83055)
    if (dateTimeStr > 10000 && dateTimeStr < 100000) {
      return Math.round((dateTimeStr - 25569) * 86400 * 1000);
    }
    // If it's unix epoch ms (> 1000000000000)
    if (dateTimeStr > 1000000000000) {
      return Math.round(dateTimeStr);
    }
    // If unix epoch sec (> 1000000000)
    if (dateTimeStr > 1000000000) {
      return Math.round(dateTimeStr * 1000);
    }
  }

  let str = String(dateTimeStr).trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  if (!str) return 0;

  // Handle AM/PM
  let isPM = false;
  let isAM = false;
  if (/pm$/i.test(str)) {
    isPM = true;
    str = str.replace(/pm$/i, '').trim();
  } else if (/am$/i.test(str)) {
    isAM = true;
    str = str.replace(/am$/i, '').trim();
  }

  // 1. Pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (2 or 4 digit year) + optional time
  const brPattern = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match = str.match(brPattern);

  if (match) {
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10) - 1; // 0-indexed month
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }
    let hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  // 2. Pattern: "YYYY-MM-DD" or "YYYY/MM/DD" + optional time
  const isoPattern = /^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const matchIso = str.match(isoPattern);
  if (matchIso) {
    const year = parseInt(matchIso[1], 10);
    const month = parseInt(matchIso[2], 10) - 1;
    const day = parseInt(matchIso[3], 10);
    let hours = matchIso[4] ? parseInt(matchIso[4], 10) : 0;
    const minutes = matchIso[5] ? parseInt(matchIso[5], 10) : 0;
    const seconds = matchIso[6] ? parseInt(matchIso[6], 10) : 0;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  // 3. Time-only pattern (e.g. "19:56:00" or "19:56")
  const timeOnlyPattern = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const matchTime = str.match(timeOnlyPattern);
  if (matchTime) {
    let hours = parseInt(matchTime[1], 10);
    const minutes = parseInt(matchTime[2], 10);
    const seconds = matchTime[3] ? parseInt(matchTime[3], 10) : 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    // Return relative milliseconds since start of day
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return 0;
}

/**
 * Calculates duration in seconds between Nuvidio exit and entry timestamps or direct tempo
 */
export function calculateNuvidioDurationSeconds(
  entradaStr: string | number,
  saidaStr: string | number,
  directTempo?: string | number
): number {
  // If direct duration is provided
  if (directTempo !== undefined && directTempo !== null && directTempo !== '') {
    const sec = parseTimeToSeconds(directTempo);
    if (sec > 0) return sec;
  }

  const entradaMs = parseFormattedTimestampToMs(entradaStr);
  const saidaMs = parseFormattedTimestampToMs(saidaStr);

  if (entradaMs && saidaMs) {
    let diffMs = saidaMs - entradaMs;
    // Handle overnight crossing if time-only was used
    if (diffMs < 0 && entradaMs < 86400000 && saidaMs < 86400000) {
      diffMs += 86400000;
    }
    if (diffMs > 0) {
      return Math.round(diffMs / 1000);
    }
  }

  // Fallback: try parsing entrada/saida directly if they are simple time strings (HH:mm:ss)
  const entSec = parseTimeToSeconds(entradaStr);
  const saiSec = parseTimeToSeconds(saidaStr);
  if (entSec > 0 && saiSec > 0 && saiSec >= entSec) {
    return saiSec - entSec;
  }

  return 0;
}

/**
 * Creates a unique hash/fingerprint for deduplication
 */
export function createFingerprint(...parts: string[]): string {
  return parts.map((p) => String(p || '').trim().toLowerCase()).join('||');
}
